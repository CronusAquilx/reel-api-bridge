import { expect, it } from "vitest";
import { guestCanSave, guestCanUse } from "./guest-rules";
it("guests cannot persist account data or use private social and developer features", () => {
  expect(guestCanSave()).toBe(false);
  expect(guestCanUse("games")).toBe(true);
  expect(guestCanUse("music")).toBe(true);
  expect(guestCanUse("movies")).toBe(true);
  expect(guestCanUse("developer")).toBe(false);
  expect(guestCanUse("social")).toBe(false);
});