/** Guest relay access reads public websites only; it never represents an Auth user. */
export function canReadGuestProxy(request: Request, target: URL, method: string): boolean {
  if (request.headers.get("authorization") !== "Bearer guest" || !["GET", "HEAD"].includes(method)) return false;
  const app = new URL(request.url);
  if (target.origin === app.origin) return false;
  const origin = request.headers.get("origin");
  if (origin) return origin === app.origin;
  return ["same-origin", "same-site"].includes(request.headers.get("sec-fetch-site") ?? "");
}