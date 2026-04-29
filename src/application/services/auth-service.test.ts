import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { User } from "../../domain/entities";
import type { IUserRepository } from "../../domain/repositories";
import { HashService } from "../../infrastructure/security/HashService";
import { JwtSessionService } from "../../infrastructure/security/JwtSessionService";
import { AuthService } from "./AuthService";

class InMemoryUserRepository implements IUserRepository {
  private readonly users = new Map<string, User>();

  async findById(id: string) {
    return this.users.get(id) ?? null;
  }

  async findByEmail(email: string) {
    return Array.from(this.users.values()).find((user) => user.email === email) ?? null;
  }

  async save(user: User) {
    this.users.set(user.id, user);
    return user;
  }

  async delete(id: string) {
    this.users.delete(id);
  }
}

function createService() {
  return new AuthService(new InMemoryUserRepository(), new HashService(), new JwtSessionService());
}

describe("AuthService", () => {
  it("normalizes email and creates a login token", async () => {
    const result = await createService().register({
      name: "테스터",
      email: "User@Example.com",
      password: "Factline123",
    });

    assert.equal(result.user.email, "user@example.com");
    assert.ok(result.token.length > 20);
  });

  it("rejects weak signup data", async () => {
    await assert.rejects(
      () =>
        createService().register({
          name: "김",
          email: "not-an-email",
          password: "short",
        }),
      /이름은 2자 이상/,
    );
  });
});
