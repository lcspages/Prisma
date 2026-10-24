import { clearSessionCookie } from "@/lib/auth/cookie";

export async function POST() {
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", "Set-Cookie": clearSessionCookie() },
  });
}
