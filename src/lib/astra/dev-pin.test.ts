import { describe, expect, it } from "vitest";
import { isDevPin } from "./account-rules";
describe("developer PIN", () => {
  it("accepts 0307", () => expect(isDevPin("0307")).toBe(true));
  it("rejects other codes", () => expect(isDevPin("1234")).toBe(false));
});
