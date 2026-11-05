import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_PREFS } from "./prefs";
import { attachProxiedPopups, resolvePopupTarget, signInWindowFeatures } from "./proxy-popups";

const mocks = vi.hoisted(() => ({ open: vi.fn().mockResolvedValue({}), url: vi.fn().mockReturnValue(null), prepare: vi.fn().mockResolvedValue(undefined), init: new Map<HTMLIFrameElement, (win: Window) => void>() }));
vi.mock("./proxy", () => ({
  openProxied: mocks.open,
  preparePopupRouting: mocks.prepare,
  gamePopupUrl: mocks.url,
  onProxyFrameInit: (frame: HTMLIFrameElement, callback: (win: Window) => void) => {
    mocks.init.set(frame, callback);
    return () => mocks.init.delete(frame);
  },
}));
afterEach(() => { document.body.replaceChildren(); mocks.open.mockClear(); mocks.url.mockReset().mockReturnValue(null); mocks.init.clear(); mocks.prepare.mockClear(); vi.restoreAllMocks(); });

describe("game sign-in routing", () => {
  it("reuses Firebase's named blank window instead of closing it on the next handoff", () => {
    const game = document.createElement("iframe"); document.body.append(game);
    const win = game.contentWindow; if (!win) throw new Error("Missing game");
    const popup = { location: { href: "about:blank" }, closed: false, opener: null, close: vi.fn(), focus: vi.fn() };
    const open = vi.spyOn(window, "open").mockReturnValue(popup as unknown as Window);
    mocks.url.mockImplementation((_f, url) => `/scramjet/p/shared/${encodeURIComponent(url)}`);
    const detach = attachProxiedPopups(game, "https://1v1.lol/", DEFAULT_PREFS);
    mocks.init.get(game)?.(win);
    const first = win.open("about:blank", "firebaseAuth");
    const second = win.open(login, "firebaseAuth");
    expect(second).toBe(first);
    expect(open).toHaveBeenCalledTimes(1);
    expect(popup.close).not.toHaveBeenCalled();
    expect(popup.location.href).toBe(`/scramjet/p/shared/${encodeURIComponent(login)}`);
    detach();
  });
  it("accepts arcade's delayed blank-window navigation and keeps the actual game opener", () => {
    const game = document.createElement("iframe"); document.body.append(game);
    const popup = { location: { href: "about:blank" }, closed: false, opener: null, close: vi.fn(), focus: vi.fn() };
    vi.spyOn(window, "open").mockReturnValue(popup as unknown as Window);
    mocks.url.mockImplementation((_f, url) => `/scramjet/p/shared/${encodeURIComponent(url)}`);
    const detach = attachProxiedPopups(game, "https://1v1.lol/", DEFAULT_PREFS);
    window.dispatchEvent(new MessageEvent("message", { source: game.contentWindow, data: { bbPopup: 1, id: "firebase", action: "open", url: "about:blank", name: "firebaseAuth" } }));
    window.dispatchEvent(new MessageEvent("message", { source: game.contentWindow, data: { bbPopup: 1, id: "firebase", action: "navigate", url: login } }));
    expect(popup.opener).toBe(game.contentWindow);
    expect(popup.location.href).toBe(`/scramjet/p/shared/${encodeURIComponent(login)}`);
    expect(popup.close).not.toHaveBeenCalled();
    detach();
  });

  const login = "https://accounts.google.com/o/oauth2/auth?client_id=game&redirect_uri=https%3A%2F%2F1v1.lol%2Fcallback&state=a%2Bb#login";
  it("decodes controller frame prefixes without stripping OAuth parameters", () => {
    expect(resolvePopupTarget(`/scramjet/p/frame123/${encodeURIComponent(login)}`, "https://1v1.lol/")).toBe(login);
  });
  it("rejects non-web popup destinations", () => {
    expect(resolvePopupTarget("javascript:alert(1)", "https://1v1.lol/")).toBeNull();
  });
  it("decodes both controller and frame IDs in a real proxy address", () => {
    expect(resolvePopupTarget(`/scramjet/p/controller123/frame456/${encodeURIComponent(login)}`, "https://1v1.lol/")).toBe(login);
  });
  it("opens sign-in separately through the proxy before the game load event", () => {
    const game = document.createElement("iframe"); document.body.append(game);
    const separate = document.createElement("iframe"); document.body.append(separate);
    const gameWindow = game.contentWindow; const separateWindow = separate.contentWindow;
    if (!gameWindow || !separateWindow) throw new Error("Missing test windows");
    const close = vi.spyOn(separateWindow, "close").mockImplementation(() => {});
    const nativeOpen = vi.spyOn(window, "open").mockReturnValue(separateWindow);
    const detach = attachProxiedPopups(game, "https://1v1.lol/", DEFAULT_PREFS);
    mocks.init.get(game)?.(gameWindow);
    const original = gameWindow.location.href;
    const result = gameWindow.open(login, "_blank");
    expect(nativeOpen).toHaveBeenCalledWith("about:blank", "astra-game-signin", "popup=yes,resizable=yes,scrollbars=yes,width=520,height=720");
    expect(mocks.prepare).toHaveBeenCalledWith(game, DEFAULT_PREFS);
    expect(separateWindow.document.querySelector("iframe")).toBeNull();
    expect(gameWindow.location.href).toBe(original);
    expect(result?.opener).toBe(gameWindow);
    detach(); expect(close).toHaveBeenCalled();
  });
  it("routes sandboxed arcade messages without replacing the game", () => {
    vi.spyOn(window, "open").mockReturnValue(null);
    const game = document.createElement("iframe"); document.body.append(game);
    const detach = attachProxiedPopups(game, "https://1v1.lol/", DEFAULT_PREFS);
    window.dispatchEvent(new MessageEvent("message", { source: game.contentWindow, data: { bbPopup: 1, url: login } }));
    expect(mocks.open).toHaveBeenCalledWith(expect.any(HTMLIFrameElement), login, DEFAULT_PREFS);
    expect(game.src).toBe("");
    detach();
  });
  it("ignores popup messages from unrelated frames", () => {
    const game = document.createElement("iframe"); document.body.append(game);
    const detach = attachProxiedPopups(game, "https://1v1.lol/", DEFAULT_PREFS);
    window.dispatchEvent(new MessageEvent("message", { source: window, data: { bbPopup: 1, url: login } }));
    expect(mocks.open).not.toHaveBeenCalled(); detach();
  });
  it("keeps a real OAuth window alive and proxies delayed blank-window navigation", () => {
    const game = document.createElement("iframe"); document.body.append(game);
    const gameWindow = game.contentWindow;
    if (!gameWindow) throw new Error("Missing game window");
    const loginWindow = { location: { href: "about:blank" }, closed: false, opener: null, close: vi.fn(), focus: vi.fn() };
    vi.spyOn(window, "open").mockReturnValue(loginWindow as unknown as Window);
    mocks.url.mockImplementation((_frame, target) => `https://app.test/scramjet/p/controller/game/${encodeURIComponent(target)}`);
    const detach = attachProxiedPopups(game, "https://1v1.lol/", DEFAULT_PREFS);
    mocks.init.get(game)?.(gameWindow);
    const result = gameWindow.open("about:blank", "firebaseAuth");
    if (!result) throw new Error("Missing login window");
    result.location.href = login;
    expect(loginWindow.location.href).toBe(`https://app.test/scramjet/p/controller/game/${encodeURIComponent(login)}`);
    expect(result.closed).toBe(false);
    expect(loginWindow.opener).toBe(gameWindow);
    expect(loginWindow.close).not.toHaveBeenCalled();
    expect(mocks.open).not.toHaveBeenCalled();
    detach();
  });
  it("requests a separate Google window while keeping opener callbacks enabled", () => {
    expect(signInWindowFeatures("width=500,height=600,noopener,noreferrer")).toBe("popup=yes,resizable=yes,scrollbars=yes,width=500,height=600");
  });
  it("loads delayed Google navigation even without a shared game proxy context", () => {
    const game = document.createElement("iframe"); document.body.append(game);
    const separate = document.createElement("iframe"); document.body.append(separate);
    const gameWindow = game.contentWindow; const separateWindow = separate.contentWindow;
    if (!gameWindow || !separateWindow) throw new Error("Missing test windows");
    Object.defineProperty(separateWindow, "closed", { value: false, configurable: true });
    vi.spyOn(separateWindow, "close").mockImplementation(() => {});
    const nativeOpen = vi.spyOn(window, "open").mockReturnValue(separateWindow);
    const detach = attachProxiedPopups(game, "https://1v1.lol/", DEFAULT_PREFS);
    mocks.init.get(game)?.(gameWindow);
    const result = gameWindow.open("about:blank", "firebaseAuth", "width=500,height=600");
    if (!result) throw new Error("Missing login window");
    result.location.assign(login);
    expect(mocks.prepare).toHaveBeenCalledWith(game, DEFAULT_PREFS);
    expect(separateWindow.document.querySelector("iframe")).toBeNull();
    expect(nativeOpen).toHaveBeenCalledWith("about:blank", "firebaseAuth", "popup=yes,resizable=yes,scrollbars=yes,width=500,height=600");
    expect(result.closed).toBe(false);
    detach();
  });
  it("routes OAuth callbacks to the nested game frame that opened the window", () => {
    const game = document.createElement("iframe"); document.body.append(game);
    const nested = document.createElement("iframe"); game.contentDocument?.body.append(nested);
    const nestedWindow = nested.contentWindow;
    if (!nestedWindow) throw new Error("Missing nested window");
    const loginWindow = { location: { href: "about:blank" }, closed: false, opener: null, close: vi.fn() };
    vi.spyOn(window, "open").mockReturnValue(loginWindow as unknown as Window);
    mocks.url.mockImplementation((_frame, target) => `https://app.test/scramjet/p/controller/game/${encodeURIComponent(target)}`);
    const detach = attachProxiedPopups(game, "https://1v1.lol/", DEFAULT_PREFS);
    mocks.init.get(game)?.(nestedWindow);
    nestedWindow.open(login, "firebaseAuth");
    expect(loginWindow.opener).toBe(nestedWindow);
    detach();
  });
});