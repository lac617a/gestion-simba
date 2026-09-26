import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/session";

/** Borra la cookie de sesión y lleva al login (sesión vencida o invalidada). */
export function GET(req: NextRequest) {
  const res = NextResponse.redirect(new URL("/gestion/login", req.nextUrl));
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
