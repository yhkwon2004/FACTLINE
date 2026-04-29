import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AuthNavigationPolicy } from "./AuthNavigationPolicy";

describe("AuthNavigationPolicy", () => {
  const policy = new AuthNavigationPolicy();

  it("requires login for creating a case", () => {
    const decision = policy.decide({ pathname: "/cases/new", isAuthenticated: false });

    assert.equal(decision.kind, "redirect");
    assert.equal(decision.location, "/login?next=%2Fcases%2Fnew&reason=auth-required");
  });

  it("requires login for daily life records", () => {
    const decision = policy.decide({ pathname: "/life", isAuthenticated: false });

    assert.equal(decision.kind, "redirect");
    assert.equal(decision.location, "/login?next=%2Flife&reason=auth-required");
  });

  it("allows public entry and auth pages without a session", () => {
    assert.equal(policy.decide({ pathname: "/", isAuthenticated: false }).kind, "allow");
    assert.equal(policy.decide({ pathname: "/login", isAuthenticated: false }).kind, "allow");
    assert.equal(policy.decide({ pathname: "/register", isAuthenticated: false }).kind, "allow");
  });

  it("redirects authenticated users away from login to the dashboard", () => {
    const decision = policy.decide({ pathname: "/login", isAuthenticated: true });

    assert.equal(decision.kind, "redirect");
    assert.equal(decision.location, "/dashboard");
  });

  it("normalizes unsafe return paths to dashboard", () => {
    assert.equal(policy.normalizeReturnPath("https://example.com/phish"), "/dashboard");
    assert.equal(policy.normalizeReturnPath("//example.com/phish"), "/dashboard");
    assert.equal(policy.normalizeReturnPath("/cases/new"), "/cases/new");
  });
});
