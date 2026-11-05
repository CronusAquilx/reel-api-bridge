import { describe, expect, it } from "vitest";
import { canReadGuestProxy } from "./proxy-access";

const target = new URL("https://example.com/movie");
const request = (origin = "https://birch.example") => new Request("https://birch.example/api/proxy", { headers: { authorization: "Bearer guest", origin } });
describe("guest public website relay", () => {
  it("allows same-origin guest GET and HEAD reads", () => {
    expect(canReadGuestProxy(request(), target, "GET")).toBe(true);
    expect(canReadGuestProxy(request(), target, "HEAD")).toBe(true);
  });
  it("does not authorize guest mutations or cross-origin callers", () => {
    expect(canReadGuestProxy(request(), target, "POST")).toBe(false);
    expect(canReadGuestProxy(request("https://other.example"), target, "GET")).toBe(false);
    expect(canReadGuestProxy(request(), new URL("https://birch.example/api/private"), "GET")).toBe(false);
  });
});