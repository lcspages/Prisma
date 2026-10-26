/**
 * Envio de notificações (Web Push) sem biblioteca externa.
 *  - Criptografia da mensagem: RFC 8291 (aes128gcm, RFC 8188).
 *  - Identificação do servidor: VAPID (RFC 8292), JWT assinado com ES256.
 * Chaves (na Vercel): VAPID_PUBLIC_KEY (base64url, 65 bytes) e VAPID_PRIVATE_KEY (base64url, 32 bytes).
 */
import { createCipheriv, createECDH, createPrivateKey, hkdfSync, randomBytes, sign, type KeyObject } from "node:crypto";

export interface PushTarget {
  endpoint: string;
  /** Chave pública do aparelho (base64url) */
  p256dh: string;
  /** Segredo do aparelho (base64url) */
  auth: string;
}

export interface PushMessage {
  title: string;
  body: string;
  /** Página aberta ao tocar */
  url?: string;
  /** Mensagens com a mesma tag se substituem no aparelho */
  tag?: string;
}

const b64url = (buf: Buffer | Uint8Array) => Buffer.from(buf).toString("base64url");
const fromB64url = (s: string) => Buffer.from(s, "base64url");

export function vapidConfig() {
  const publicKey = process.env.VAPID_PUBLIC_KEY ?? "";
  const privateKey = process.env.VAPID_PRIVATE_KEY ?? "";
  const subject = process.env.VAPID_SUBJECT || "mailto:rotinaprisma@gmail.com";
  return { publicKey, privateKey, subject, ready: fromB64url(publicKey).length === 65 && fromB64url(privateKey).length === 32 };
}

/* ---------------------------------------------------------------- criptografia */

/**
 * Criptografa o conteúdo para um aparelho (RFC 8291). `salt` e `serverKeys` só são
 * passados nos testes, para conferir com o exemplo do RFC.
 */
export function encryptPayload(
  plaintext: Buffer,
  target: Pick<PushTarget, "p256dh" | "auth">,
  test?: { salt: Buffer; serverPrivateKey: Buffer },
): Buffer {
  const uaPublic = fromB64url(target.p256dh);
  const authSecret = fromB64url(target.auth);
  if (uaPublic.length !== 65 || authSecret.length < 16) throw new Error("Chaves do aparelho inválidas.");

  const ecdh = createECDH("prime256v1");
  if (test) ecdh.setPrivateKey(test.serverPrivateKey);
  else ecdh.generateKeys();
  const asPublic = ecdh.getPublicKey();
  const sharedSecret = ecdh.computeSecret(uaPublic);

  const keyInfo = Buffer.concat([Buffer.from("WebPush: info\0"), uaPublic, asPublic]);
  const ikm = Buffer.from(hkdfSync("sha256", sharedSecret, authSecret, keyInfo, 32));
  const salt = test?.salt ?? randomBytes(16);
  const cek = Buffer.from(hkdfSync("sha256", ikm, salt, Buffer.from("Content-Encoding: aes128gcm\0"), 16));
  const nonce = Buffer.from(hkdfSync("sha256", ikm, salt, Buffer.from("Content-Encoding: nonce\0"), 12));

  // Um único registro: conteúdo + delimitador 0x02 (último registro), sem preenchimento.
  const cipher = createCipheriv("aes-128-gcm", cek, nonce);
  const body = Buffer.concat([cipher.update(Buffer.concat([plaintext, Buffer.from([2])])), cipher.final(), cipher.getAuthTag()]);

  const rs = Buffer.alloc(4);
  rs.writeUInt32BE(4096);
  return Buffer.concat([salt, rs, Buffer.from([asPublic.length]), asPublic, body]);
}

/* ---------------------------------------------------------------- VAPID */

let cachedKey: { raw: string; key: KeyObject } | null = null;

function vapidKey(publicKey: string, privateKey: string): KeyObject {
  if (cachedKey?.raw === privateKey) return cachedKey.key;
  const pub = fromB64url(publicKey);
  const key = createPrivateKey({
    format: "jwk",
    key: { kty: "EC", crv: "P-256", d: privateKey, x: b64url(pub.subarray(1, 33)), y: b64url(pub.subarray(33, 65)) },
  });
  cachedKey = { raw: privateKey, key };
  return key;
}

export function vapidAuthorization(endpoint: string, now = Date.now()): string {
  const { publicKey, privateKey, subject } = vapidConfig();
  const header = b64url(Buffer.from(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const claims = b64url(
    Buffer.from(JSON.stringify({ aud: new URL(endpoint).origin, exp: Math.floor(now / 1000) + 12 * 3600, sub: subject })),
  );
  const unsigned = `${header}.${claims}`;
  const signature = sign("sha256", Buffer.from(unsigned), { key: vapidKey(publicKey, privateKey), dsaEncoding: "ieee-p1363" });
  return `vapid t=${unsigned}.${b64url(signature)}, k=${publicKey}`;
}

/* ---------------------------------------------------------------- envio */

/** Só envia para serviços de push conhecidos (evita usar o servidor para chamar outros endereços). */
const PUSH_HOSTS = [
  /(^|\.)fcm\.googleapis\.com$/,
  /(^|\.)android\.googleapis\.com$/,
  /(^|\.)push\.apple\.com$/,
  /(^|\.)push\.services\.mozilla\.com$/,
  /(^|\.)notify\.windows\.com$/,
  /(^|\.)push\.api\.chromium\.org$/,
];

export function isPushEndpoint(endpoint: string): boolean {
  try {
    const url = new URL(endpoint);
    return url.protocol === "https:" && PUSH_HOSTS.some((re) => re.test(url.hostname));
  } catch {
    return false;
  }
}

export type SendResult = "ok" | "gone" | "error";

export async function sendPush(target: PushTarget, message: PushMessage): Promise<SendResult> {
  if (!vapidConfig().ready || !isPushEndpoint(target.endpoint)) return "error";
  let body: Buffer;
  try {
    body = encryptPayload(Buffer.from(JSON.stringify(message)), target);
  } catch {
    return "gone";
  }
  try {
    const res = await fetch(target.endpoint, {
      method: "POST",
      headers: {
        Authorization: vapidAuthorization(target.endpoint),
        "Content-Encoding": "aes128gcm",
        "Content-Type": "application/octet-stream",
        TTL: String(6 * 3600),
        Urgency: "normal",
      },
      body: new Uint8Array(body),
      signal: AbortSignal.timeout(10_000),
    });
    if (res.status === 404 || res.status === 410) return "gone";
    return res.ok ? "ok" : "error";
  } catch {
    return "error";
  }
}
