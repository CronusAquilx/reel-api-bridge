import { describe, expect, it } from "vitest";
import { repairRetroraScript, withRetroraCompatibility } from "./retrora-proxy";

describe("Retrora virtual location", () => {
  it("resolves terrain and online sockets against Retrora rather than the proxy", () => {
    const source = `function terrainDataUrls(pageLocation = location) { return new URL('./heights-1.8.1.bin', pageLocation.href).href; }
      function onlineMatchUrl(pageLocation = location) { return 'wss://' + pageLocation.host + '/match/'; }
      return [terrainDataUrls(), onlineMatchUrl()];`;
    const script = repairRetroraScript(new URL("https://retrora.lol/play/frontend.js?v=1"), source);
    const scope = { [Symbol.for("scramjet client global")]: { locationProxy: new URL("https://retrora.lol/play/?release=1.8.1") } };
    expect(new Function("globalThis", script)(scope)).toEqual(["https://retrora.lol/play/heights-1.8.1.bin", "wss://retrora.lol/match/"]);
  });
  it("does not modify other providers or Retrora engine modules", () => {
    for (const url of ["https://other.game/play/frontend.js", "https://retrora.lol/play/pkg/retrora_web.js"]) {
      expect(repairRetroraScript(new URL(url), "pageLocation = location")).toBe("pageLocation = location");
    }
  });
  it("keeps range responses and their streams unchanged", async () => {
    const response = { status: 206, body: new Response("pak bytes").body, headers: [["content-range", "bytes 0-8/5000000000"]] };
    const transport = withRetroraCompatibility({ request: async (_url: URL) => response });
    expect(await transport.request(new URL("https://retrora.org/gamefiles/1.8.1/data.pak"))).toBe(response);
  });
});