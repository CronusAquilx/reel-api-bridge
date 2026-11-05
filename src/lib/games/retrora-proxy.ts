/** Retrora's default-parameter locations escape Scramjet's JS location rewriting. */
export function repairRetroraScript(url: URL, source: string): string {
  if (!/^(?:www\.)?retrora\.(?:lol|org)$/.test(url.hostname) || url.pathname !== "/play/frontend.js") return source;
  return 'const __retroraLocation = globalThis[Symbol.for("scramjet client global")].locationProxy;\n' + source
    .replace(/\bpageLocation\s*=\s*location\b/g, "pageLocation = __retroraLocation")
    .replace(/\bglobalThis\.location\b/g, "__retroraLocation");
}

/** Transform only the small frontend module; leave WASM and range responses streaming. */
export function withRetroraCompatibility<T extends { request: (...args: any[]) => Promise<any> }>(transport: T): T {
  const request = transport.request.bind(transport);
  transport.request = async (...args: any[]) => {
    const response = await request(...args);
    const url = args[0] as URL;
    if (!/^(?:www\.)?retrora\.(?:lol|org)$/.test(url.hostname) || url.pathname !== "/play/frontend.js" || response.status !== 200 || !response.body) return response;
    const source = await new Response(response.body).text();
    return { ...response, body: new Response(repairRetroraScript(url, source)).body,
      headers: response.headers.filter(([key]: [string, string]) => !["content-length", "content-encoding"].includes(key.toLowerCase())) };
  };
  return transport;
}