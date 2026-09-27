import { describe, expect, it } from "vitest";

import { organizationSchema, signupSchema } from "@/domain/auth";

describe("authentication input", () => {
  it("rejects weak passwords", () => {
    expect(
      signupSchema.safeParse({ email: "owner@example.com", password: "short" })
        .success,
    ).toBe(false);
  });

  it("accepts a strong email and password", () => {
    expect(
      signupSchema.safeParse({
        email: "owner@example.com",
        password: "cocktail42",
      }).success,
    ).toBe(true);
  });
});

describe("organization input", () => {
  it("requires a bar, location, and timezone", () => {
    expect(
      organizationSchema.safeParse({
        organizationName: "Northstar Hospitality",
        locationName: "Downtown Bar",
        timezone: "America/Chicago",
      }).success,
    ).toBe(true);
  });
});
