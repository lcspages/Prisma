import { NextResponse, type NextRequest } from "next/server";
import { authConfig, SESSION_COOKIE, verifySessionToken } from "@/lib/auth/session";

/** Telas de quem ainda não entrou (logado, vai direto para o app). */
const GUEST_ONLY = ["/login", "/primeiro-acesso", "/esqueci-senha"];
/** Abertas para todos. */
const PUBLIC = ["/definir-senha", "/termos", "/privacidade", "/reembolso"];
/** Rotas com proteção própria: login, aviso da Kiwify (token) e lembretes agendados (CRON_SECRET). */
const PUBLIC_API = ["/api/auth/", "/api/kiwify", "/api/cron/"];

/**
 * Protege o app inteiro: sem sessão válida, vai para /login.
 * A assinatura é conferida a cada carregamento de dados (/api/dados).
 * (No Next.js 16 o antigo middleware.ts passou a se chamar proxy.ts.)
 */
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const { secret } = authConfig();
  const session = await verifySessionToken(secret, request.cookies.get(SESSION_COOKIE)?.value);

  // Página inicial: landing page para visitantes; quem já entrou vai direto para o app.
  if (pathname === "/") {
    return session ? NextResponse.redirect(new URL("/hoje", request.url)) : NextResponse.next();
  }
  if (GUEST_ONLY.includes(pathname)) {
    if (session) return NextResponse.redirect(new URL("/hoje", request.url));
    return NextResponse.next();
  }
  if (PUBLIC.includes(pathname) || PUBLIC_API.some((p) => pathname.startsWith(p))) return NextResponse.next();

  if (!session) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Faça login para continuar." }, { status: 401 });
    }
    const url = new URL("/login", request.url);
    url.searchParams.set("voltar", pathname + search);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon-64.png|icon-192.png|icon-512.png|icon-maskable-512.png|apple-touch-icon.png|manifest.webmanifest|sw.js|logo-prisma.png|landing/|tutoriais/).*)",
  ],
};
