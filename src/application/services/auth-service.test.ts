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

  async findByGoogleSubject(subject:string) { return Array.from(this.users.values()).find(x=>x.googleSubject===subject) ?? null; }

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

    assert.match(result.user.email, /@accounts\.local$/);
    assert.equal(result.user.name,"사용자");
    assert.equal((await createService().register({name:"테스터",email:"new@example.test",password:"Factline123"})).user.name,"사용자");
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

it("never links an existing private account by email without password reauthentication",async()=>{
 const service=createService();const owner=await service.register({name:"테스터",email:"owner@example.test",password:"Factline123"});
 const identity={subject:"google-subject-1",email:"owner@example.test",name:"소유자"};
 await assert.rejects(service.googleLogin(identity),/기존 계정/);
 await assert.rejects(service.googleLogin(identity,{userId:owner.user.id,password:"wrong"}),/기존 계정/);
 const linked=await service.googleLogin(identity,{userId:owner.user.id,password:"Factline123"});
 assert.equal(linked.user.id,owner.user.id);assert(linked.user.googleConnected);
 assert.equal((await service.googleLogin({...identity,email:"changed@example.test"})).user.id,owner.user.id);
});
it("creates Google-only accounts using the stable subject",async()=>{
 const service=createService();const a=await service.googleLogin({subject:"google-new",email:"new@example.test",name:"신규"});
 assert.equal((await service.googleLogin({subject:"google-new",email:"new@example.test",name:"신규"})).user.id,a.user.id);
 await assert.rejects(service.login({email:"new@example.test",password:"Factline123"}));
});

it("private registration remains signable without storing the original email or name",async()=>{const service=createService(),email="private@example.test";const created=await service.register({name:"합성 이름",email,password:"Factline123"});const first=await service.login({email,password:"Factline123"}),second=await service.login({email,password:"Factline123"});assert.equal(first.user.id,created.user.id);assert.equal(second.user.id,created.user.id);assert(!first.user.email.includes("private@"));assert.equal(first.user.name,"사용자");});

it("migrates an existing session profile and preserves password and Google sign-in", async () => {
  const repo = new InMemoryUserRepository(), hash = new HashService();
  const service = new AuthService(repo, hash, new JwtSessionService());
  const email = "legacy@accounts.local", subject = "123456789", password = "Fixture1234";
  const old = await repo.save(new User({
    id: crypto.randomUUID(), email, name: "가상 이전 계정", googleSubject: subject,
    passwordHash: await hash.hashPassword(password),
  }));
  const migrated = await service.activeUser(old.id);
  assert.match(migrated!.email, /^[a-f0-9]{64}@accounts\.local$/);
  assert.equal(await repo.findByEmail(email), null);
  assert.equal(await repo.findByGoogleSubject(subject), null);
  assert.equal((await service.login({email,password})).user.id, old.id);
  assert.equal((await service.googleLogin({email,subject,name:"합성 이름"})).user.id, old.id);
});
