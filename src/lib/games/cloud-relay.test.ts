import { describe, expect, it } from "vitest";
import { cloudRelayUrl, needsIsolation, rewriteRelayText, rewriteSetCookie, upstreamFromRelay } from "./cloud-relay";

describe("cloud game relay", () => {
  it("relays catalog game ports through Astra's own domain", () => {
    expect(cloudRelayUrl("https://csjs.live/?map=dust2")).toBe("/api/public/cg/https/csjs.live/?map=dust2");
    expect(upstreamFromRelay("/api/public/cg/https/csjs.live/data/a.bin", "")?.href).toBe("https://csjs.live/data/a.bin");
  });
  it("never relays sites outside the game catalog", () => {
    expect(cloudRelayUrl("https://evil.example/")).toBeNull();
    expect(upstreamFromRelay("/api/public/cg/https/evil.example/", "")).toBeNull();
    expect(upstreamFromRelay("/api/public/cg/https/csjs.live/../x", "")).toBeNull();
    expect(cloudRelayUrl("https://unknown.game-files.crazygames.com/")).toBeNull();
  });
  it("relays every regular cloud game, isolating only the big ports", () => {
    expect(cloudRelayUrl("https://krunker.io/")).toBe("/api/public/cg/https/krunker.io/");
    expect(cloudRelayUrl("https://www.crazygames.com/game/buildnow-gg")).not.toBeNull();
    expect(needsIsolation("csjs.live")).toBe(true);
    expect(needsIsolation("krunker.io")).toBe(false);
  });
  it("leaves account-based streaming services on the full proxy", () => {
    expect(cloudRelayUrl("https://play.geforcenow.com/")).toBeNull();
  });
  it("keeps Retrora's original hostname and online sockets on the complete-site proxy", () => {
    expect(cloudRelayUrl("https://retrora.lol/")).toBeNull();
    expect(cloudRelayUrl("https://retrora.lol/play/?release=1.8.1")).toBeNull();
    expect(upstreamFromRelay("/api/public/cg/https/api.retrora.org/api/v1/me", "")).toBeNull();
  });
  it("scopes game login cookies to the game's relay path", () => {
    expect(rewriteSetCookie("sid=1; Domain=.krunker.io; Path=/; Secure; SameSite=None", "/api/public/cg/https/krunker.io")).toBe("sid=1; Secure; Path=/api/public/cg/https/krunker.io/; SameSite=Lax");
  });
  it("keeps GTA V on its tuned relay", () => {
    expect(cloudRelayUrl("https://fiveplay.lol/")).toBeNull();
  });
  it("points root-relative game files at the relay", () => {
    const html = rewriteRelayText('<script src="/b/main.js"></script><img src="https://csjs.live/x.png">', "/api/public/cg/https/csjs.live", "html", "csjs.live");
    expect(html).toBe('<script src="/api/public/cg/https/csjs.live/b/main.js"></script><img src="/api/public/cg/https/csjs.live/x.png">');
  });
  it("keeps BuildNow GG's separate game frame and Unity files inside the relay", () => {
    expect(cloudRelayUrl("https://www.crazygames.com/game/buildnow-gg")).toBe("/api/public/cg/https/games.crazygames.com/en_US/buildnow-gg/index.html");
    expect(cloudRelayUrl("https://files.crazygames.com/buildnow-gg/225/Build/Build/game.wasm.br")).toBe("/api/public/cg/https/files.crazygames.com/buildnow-gg/225/Build/Build/game.wasm.br");
    expect(cloudRelayUrl("https://buildnow-gg.game-files.crazygames.com/unity/unity2020/Build/game.wasm")).toBe("/api/public/cg/https/buildnow-gg.game-files.crazygames.com/unity/unity2020/Build/game.wasm");
    const html = rewriteRelayText('<iframe src="https://games.crazygames.com/en_US/buildnow-gg/index.html"></iframe><script integrity="sha256-old" src="https://builds.crazygames.com/main.js"></script>', "/api/public/cg/https/www.crazygames.com", "html", "www.crazygames.com");
    expect(html).toBe('<iframe src="/api/public/cg/https/games.crazygames.com/en_US/buildnow-gg/index.html"></iframe><script src="/api/public/cg/https/builds.crazygames.com/main.js"></script>');
  });
  it("preserves absolute URL literals required by provider scripts", () => {
    const js = rewriteRelayText('new URL("https://games.crazygames.com/en_US/buildnow-gg/index.html")', "https://app.example/api/public/cg/https/www.crazygames.com", "js", "www.crazygames.com");
    expect(js).toBe('new URL("https://app.example/api/public/cg/https/games.crazygames.com/en_US/buildnow-gg/index.html")');
  });
  it("never lowercases URL constructors in inline engine callbacks", () => {
    const html = rewriteRelayText('<script>locateFile: name => new URL("/runtime/" + name, document.baseURI).href</script><style>a{background:url(/logo.png)}</style>', "https://app.example/api/public/cg/https/cyberpunk2077.lol", "html", "cyberpunk2077.lol");
    expect(html).toBe('<script>locateFile: name => new URL("/runtime/" + name, document.baseURI).href</script><style>a{background:url(https://app.example/api/public/cg/https/cyberpunk2077.lol/logo.png)}</style>');
  });
  it("relays both verified Cyberpunk launch and engine asset origins with isolation", () => {
    for (const host of ["cdn.cyberpunk2077.lol", "cp2077-port.fn-web-worker.workers.dev"]) {
      expect(cloudRelayUrl(`https://${host}/k/play/runtime/game-files.json`)).toBe(`/api/public/cg/https/${host}/k/play/runtime/game-files.json`);
      expect(needsIsolation(host)).toBe(true);
    }
    const js = rewriteRelayText('boot({cfOrigin:"https://cdn.cyberpunk2077.lol",cfFallback:"https://cp2077-port.fn-web-worker.workers.dev"})', "https://app.example/api/public/cg/https/cyberpunk2077.lol", "js", "cyberpunk2077.lol");
    expect(js).toBe('boot({cfOrigin:"https://app.example/api/public/cg/https/cdn.cyberpunk2077.lol",cfFallback:"https://app.example/api/public/cg/https/cp2077-port.fn-web-worker.workers.dev"})');
  });
});
