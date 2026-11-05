import { describe, expect, it } from "vitest";
import { accountEmail, signupSchema, loginSchema, isDeveloperHandle } from "./account-rules";

describe("Username accounts", () => {
  it("creates accounts without a required email", () => {
    expect(signupSchema.parse({ username: "Player_1", password: "example-password" }).username).toBe("player_1");
    expect(accountEmail("Player_1")).toBe("player_1@username.beanblock.local");
  });
  it("accepts optional contact email", () => {
    expect(signupSchema.parse({ username: "player", password: "example-password", email: "person@example.com" }).email).toBe("person@example.com");
    expect(signupSchema.safeParse({ username: "player", password: "example-password", email: "invalid" }).success).toBe(false);
  });
  it("retains legacy email sign-in", () => {
    expect(loginSchema.parse({ username: "Person@Example.com", password: "example-password" }).username).toBe("person@example.com");
  });
  it("requires a valid unique-normalized handle and password", () => {
    expect(signupSchema.safeParse({ username: "a b", password: "example-password" }).success).toBe(false);
    expect(signupSchema.safeParse({ username: "player", password: "123" }).success).toBe(false);
  });
  it("reserves developer aliases rather than granting privileges from a chosen name", () => {
    expect(isDeveloperHandle("QaisDev")).toBe(true);
    expect(isDeveloperHandle("player")).toBe(false);
  });
});