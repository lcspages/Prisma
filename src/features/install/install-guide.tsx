"use client";

/**
 * Guia para colocar o Prisma na tela inicial do celular (Android e iPhone).
 * Aparece sozinho uma vez no celular (até a pessoa instalar ou dispensar)
 * e pode ser aberto a qualquer momento pelo Menu ou pelo Perfil.
 */
import { useEffect, useState, useSyncExternalStore } from "react";
import { LuCopy, LuEllipsis, LuEllipsisVertical, LuShare, LuSmartphone, LuSquarePlus } from "react-icons/lu";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { getState, pushToast } from "@/lib/store/app-store";

type Platform = "android" | "ios";

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const STORAGE_KEY = "prisma:install-prompt";
/** "Agora não" esconde o aviso automático por 7 dias. */
const SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;

/* ---------------------------------------------------------------- estado */

let state: { open: boolean; deferred: InstallPromptEvent | null } = { open: false, deferred: null };
const listeners = new Set<() => void>();
const set = (patch: Partial<typeof state>) => {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
};
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const useInstall = () => useSyncExternalStore(subscribe, () => state, () => state);

// O Chrome do Android avisa quando dá para instalar com um toque; guardamos o aviso.
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    set({ deferred: e as InstallPromptEvent });
  });
  window.addEventListener("appinstalled", () => {
    remember({ never: true });
    set({ deferred: null, open: false });
  });
}

export function openInstallGuide() {
  set({ open: true });
}

/* ---------------------------------------------------------------- ambiente */

function remember(value: { never?: boolean; until?: number }) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    /* sem armazenamento: o aviso pode voltar na próxima visita */
  }
}

function dismissed(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const v = JSON.parse(raw) as { never?: boolean; until?: number };
    return Boolean(v.never || (v.until && v.until > Date.now()));
  } catch {
    return false;
  }
}

export function isStandalone() {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

export function detectDevice() {
  const ua = navigator.userAgent;
  const ios = /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const android = /Android/i.test(ua);
  // Navegadores dentro de outros apps (TikTok, Instagram, Facebook) não deixam instalar.
  const inApp = /musical_ly|BytedanceWebview|TikTok|Instagram|FBAN|FBAV|FB_IAB|Twitter|Line\//i.test(ua);
  return { ios, android, mobile: ios || android, inApp };
}

/* ---------------------------------------------------------------- componente */

/** Fica montado no app: abre sozinho uma vez no celular e atende ao Menu e ao Perfil. */
export function InstallGuide() {
  const { open, deferred } = useInstall();
  const [platform, setPlatform] = useState<Platform>("android");
  const [inApp, setInApp] = useState(false);
  const [auto, setAuto] = useState(false);

  useEffect(() => {
    const device = detectDevice();
    setPlatform(device.ios ? "ios" : "android");
    setInApp(device.inApp);
    if (!device.mobile || isStandalone() || dismissed()) return;

    // Espera o app carregar e nenhuma outra janela estar aberta.
    let tries = 0;
    let timer = window.setTimeout(function tryOpen() {
      const busy = getState().status !== "ready" || document.querySelector('[role="dialog"]');
      if (busy && tries++ < 12) {
        timer = window.setTimeout(tryOpen, 5000);
        return;
      }
      if (!busy) {
        setAuto(true);
        set({ open: true });
      }
    }, 4000);
    return () => window.clearTimeout(timer);
  }, []);

  const close = (opts: { installed?: boolean } = {}) => {
    if (opts.installed) remember({ never: true });
    else if (auto && !dismissed()) remember({ until: Date.now() + SNOOZE_MS });
    setAuto(false);
    set({ open: false });
  };

  const installNow = async () => {
    if (!deferred) return;
    await deferred.prompt();
    const choice = await deferred.userChoice.catch(() => ({ outcome: "dismissed" as const }));
    set({ deferred: null });
    if (choice.outcome === "accepted") {
      close({ installed: true });
      pushToast({ tone: "success", title: "Prisma instalado", message: "Procure o ícone do Prisma na tela inicial." });
    }
  };

  const copyLink = async () => {
    const link = `${window.location.origin}/hoje`;
    try {
      await navigator.clipboard.writeText(link);
      pushToast({ message: "Link copiado. Cole no navegador." });
    } catch {
      pushToast({ message: link });
    }
  };

  const browser = platform === "ios" ? "Safari" : "Chrome";

  return (
    <Modal
      open={open}
      onClose={() => close()}
      title="Instale o Prisma no celular"
      description="Ele fica na tela inicial com o ícone do Prisma e abre em tela cheia, como um aplicativo."
      size="sm"
      footer={
        auto ? (
          <>
            <Button variant="ghost" onClick={() => close()}>
              Agora não
            </Button>
            <Button variant="primary" className="ml-auto" onClick={() => close({ installed: true })}>
              Já instalei
            </Button>
          </>
        ) : (
          <Button variant="primary" className="ml-auto" onClick={() => close()}>
            Entendi
          </Button>
        )
      }
    >
      <div role="radiogroup" aria-label="Seu celular" className="grid grid-cols-2 gap-1 rounded-2xl bg-surface-2 p-1">
        {(["android", "ios"] as const).map((p) => (
          <button
            key={p}
            type="button"
            role="radio"
            aria-checked={platform === p}
            onClick={() => setPlatform(p)}
            className={cn(
              "h-10 rounded-xl font-semibold transition-colors",
              platform === p ? "bg-surface text-ink shadow-sm" : "text-ink-2 hover:text-ink",
            )}
          >
            {p === "android" ? "Android" : "iPhone"}
          </button>
        ))}
      </div>

      {inApp && (
        <div className="mt-4 rounded-2xl border border-accent/60 bg-accent-soft p-4">
          <p className="font-semibold text-ink">Abra no {browser} primeiro</p>
          <p className="mt-1 text-meta text-ink-2">
            Você está no navegador de outro app (como TikTok ou Instagram), que não deixa instalar. Toque nos três pontinhos e escolha
            “Abrir no navegador”, ou copie o link e cole no {browser}.
          </p>
          <Button size="sm" className="mt-3" onClick={copyLink}>
            <LuCopy className="size-3.5" aria-hidden />
            Copiar link
          </Button>
        </div>
      )}

      {platform === "android" && deferred && !inApp && (
        <div className="mt-4 rounded-2xl bg-primary-soft p-4">
          <p className="font-semibold text-ink">Dá para instalar com um toque</p>
          <Button variant="primary" className="mt-3 w-full" onClick={installNow}>
            <LuSmartphone className="size-4" aria-hidden />
            Instalar agora
          </Button>
        </div>
      )}

      <ol className="mt-5 space-y-3">
        {(platform === "ios" ? IOS_STEPS : ANDROID_STEPS).map((step, i) => (
          <li key={i} className="flex items-start gap-3">
            <span className="tabular grid size-7 shrink-0 place-items-center rounded-full bg-primary text-meta font-semibold text-on-primary">
              {i + 1}
            </span>
            <p className="pt-0.5 leading-6 text-ink">{step}</p>
          </li>
        ))}
      </ol>

      <p className="mt-5 text-meta text-ink-3">Depois, é só abrir pelo ícone do Prisma. Na primeira vez, entre com seu e-mail e senha. Seus dados continuam os mesmos, salvos na nuvem.</p>
    </Modal>
  );
}

function Chip({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <span className="mx-0.5 inline-grid size-7 translate-y-1.5 place-items-center rounded-lg border border-line bg-surface-2 text-ink" aria-label={label} role="img">
      {children}
    </span>
  );
}

const ANDROID_STEPS: React.ReactNode[] = [
  <>Abra o Prisma no <b>Chrome</b>.</>,
  <>
    Toque no menu
    <Chip label="três pontinhos">
      <LuEllipsisVertical className="size-4" aria-hidden />
    </Chip>
    no canto de cima.
  </>,
  <>
    Toque em <b>Instalar app</b> (ou em <b>Adicionar à tela inicial</b>).
  </>,
  <>
    Escolha <b>Instalar</b>, e não “Criar atalho”: o atalho abre no navegador. O ícone aparece na tela inicial.
  </>,
];

const IOS_STEPS: React.ReactNode[] = [
  <>Abra o Prisma no <b>Safari</b>.</>,
  <>
    Toque em Compartilhar
    <Chip label="botão compartilhar">
      <LuShare className="size-4" aria-hidden />
    </Chip>
    na barra do Safari. Se ele não aparecer, toque primeiro em
    <Chip label="três pontinhos">
      <LuEllipsis className="size-4" aria-hidden />
    </Chip>
  </>,
  <>
    Role a lista e toque em
    <Chip label="adicionar">
      <LuSquarePlus className="size-4" aria-hidden />
    </Chip>
    <b>Adicionar à Tela de Início</b>.
  </>,
  <>
    Se aparecer a opção <b>Abrir como app Web</b>, deixe ligada. Toque em <b>Adicionar</b>, no canto de cima. O ícone aparece na tela
    inicial.
  </>,
];
