export const KIOSK_EMAIL = "kiosk@skinlytix.com";

export const isKioskEmail = (email?: string | null): boolean =>
  (email || "").trim().toLowerCase() === KIOSK_EMAIL;

export const getKioskRedirectPath = (pathname: string, search: string): string | null => {
  if (pathname === "/kiosk") return null;
  if (pathname === "/kiosk/claim") return null;

  const searchParams = new URLSearchParams(search);

  if (pathname === "/upload") {
    if (searchParams.get("kiosk") === "1") return null;
    searchParams.set("kiosk", "1");
    return `/upload?${searchParams.toString()}`;
  }

  if (pathname.startsWith("/analysis/")) {
    if (searchParams.get("kiosk") === "1") return null;
    searchParams.set("kiosk", "1");
    return `${pathname}?${searchParams.toString()}`;
  }

  return "/kiosk";
};
