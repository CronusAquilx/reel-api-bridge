import { afterEach, describe, expect, it, vi } from "vitest";
import { firstReachableWisp } from "./proxy";

class ProbeSocket {
  static instances: ProbeSocket[] = [];
  onopen: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onclose: (() => void) | null = null;
  close = vi.fn();
  constructor(public url: string) { ProbeSocket.instances.push(this); }
}

afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); ProbeSocket.instances = []; });

describe("proxy connection selection", () => {
  it("does not wait for slow servers after a connection is available", async () => {
    vi.stubGlobal("WebSocket", ProbeSocket);
    const result = firstReachableWisp(["wss://slow.test", "wss://fast.test"]);
    ProbeSocket.instances[1]?.onopen?.();
    await expect(result).resolves.toBe("wss://fast.test");
    for (const socket of ProbeSocket.instances) expect(socket.close).toHaveBeenCalledOnce();
  });
  it("closes all probe sockets on timeout", async () => {
    vi.useFakeTimers(); vi.stubGlobal("WebSocket", ProbeSocket);
    const result = firstReachableWisp(["wss://offline.test"], 5000);
    const rejected = expect(result).rejects.toThrow("No Wisp server reachable");
    await vi.advanceTimersByTimeAsync(5000);
    await rejected;
    expect(ProbeSocket.instances[0]?.close).toHaveBeenCalledOnce();
  });
});