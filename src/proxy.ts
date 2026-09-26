import { NextResponse, type NextRequest } from "next/server";
import { decrypt, SESSION_COOKIE } from "@/lib/session";

// Comprobación optimista (solo cookie) de la administración (/gestion). La
// verificación real está en verifySession(). La página pública no pasa por aquí.
export async function proxy(req: NextRequest) {
  const session = await decrypt(req.cookies.get(SESSION_COOKIE)?.value);
  const isLogin = req.nextUrl.pathname === "/gestion/login";

  if (!session && !isLogin) {
    return NextResponse.redirect(new URL("/gestion/login", req.nextUrl));
  }
  if (session && isLogin) {
    return NextResponse.redirect(new URL("/gestion", req.nextUrl));
  }
  return NextResponse.next();
}

export const config = {
  // Solo /gestion, menos el manifiesto (el navegador lo pide sin sesión para instalar la app).
  matcher: ["/gestion", "/gestion/((?!manifest.webmanifest).*)"],
};
