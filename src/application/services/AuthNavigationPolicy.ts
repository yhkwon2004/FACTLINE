export type NavigationDecision =
  | { kind: "allow" }
  | { kind: "redirect"; location: string };

export interface NavigationInput {
  pathname: string;
  isAuthenticated: boolean;
  search?: string;
}

const PUBLIC_PATHS = new Set(["/", "/login", "/register"]);
const PROTECTED_PREFIXES = ["/dashboard", "/cases", "/settings", "/mypage", "/life"];

export class AuthNavigationPolicy {
  decide(input: NavigationInput): NavigationDecision {
    if (input.isAuthenticated && this.isAuthPage(input.pathname)) {
      return { kind: "redirect", location: "/dashboard" };
    }

    if (!input.isAuthenticated && this.isProtected(input.pathname)) {
      const next = encodeURIComponent(`${input.pathname}${input.search ?? ""}`);
      return { kind: "redirect", location: `/login?next=${next}&reason=auth-required` };
    }

    return { kind: "allow" };
  }

  normalizeReturnPath(value: unknown) {
    if (typeof value !== "string" || value.length === 0) return "/dashboard";
    if (!value.startsWith("/") || value.startsWith("//")) return "/dashboard";
    if (value.startsWith("/api/") || value === "/login" || value === "/register") return "/dashboard";
    return value;
  }

  private isAuthPage(pathname: string) {
    return pathname === "/login" || pathname === "/register";
  }

  private isProtected(pathname: string) {
    if (PUBLIC_PATHS.has(pathname)) return false;
    return PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  }
}
