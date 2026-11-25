import { User } from "../../domain/entities";
import type { IUserRepository } from "../../domain/repositories";
import { HashService } from "../../infrastructure/security/HashService";
import { JwtSessionService } from "../../infrastructure/security/JwtSessionService";
import type { LoginInput, RegisterInput } from "../dtos";

import {
  localPrivacy,
  accountKey,
  privateEmail,
} from "../../infrastructure/security/AccountPrivacy";
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class AuthService {
  constructor(
    private readonly users: IUserRepository,
    private readonly hashService: HashService,
    private readonly sessionService: JwtSessionService,
  ) {}

  async register(input: RegisterInput) {
    const email = input.email.trim().toLowerCase();
    const name = input.name.trim();
    const password = input.password;

    if (name.length < 2) throw new Error("이름은 2자 이상 입력해 주세요.");
    if (!emailPattern.test(email))
      throw new Error("이메일 형식을 확인해 주세요.");
    if (password.length < 8)
      throw new Error("비밀번호는 8자 이상이어야 합니다.");
    if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      throw new Error("비밀번호에는 영문과 숫자를 함께 포함해 주세요.");
    }

    const existing =
      (await this.users.findByEmail(
        localPrivacy() ? privateEmail(email) : email,
      )) ?? (localPrivacy() ? await this.users.findByEmail(email) : null);
    if (existing) throw new Error("이미 가입된 이메일입니다.");

    const user = new User({
      id: crypto.randomUUID(),
      email: localPrivacy() ? privateEmail(email) : email,
      name: localPrivacy() ? "사용자" : name,
      passwordHash: await this.hashService.hashPassword(password),
    });

    const saved = await this.users.save(user);
    const token = await this.sessionService.sign({
      userId: saved.id,
      email: saved.email,
    });
    return { user: this.publicUser(saved), token };
  }

  async login(input: LoginInput) {
    const email = input.email.trim().toLowerCase();
    if (!emailPattern.test(email))
      throw new Error("이메일 또는 비밀번호를 확인해 주세요.");

    const user =
      (await this.users.findByEmail(
        localPrivacy() ? privateEmail(email) : email,
      )) ?? (localPrivacy() ? await this.users.findByEmail(email) : null);
    if (!user?.passwordHash)
      throw new Error("이메일 또는 비밀번호를 확인해 주세요.");

    const ok = await this.hashService.verifyPassword(
      input.password,
      user.passwordHash,
    );
    if (!ok) throw new Error("이메일 또는 비밀번호를 확인해 주세요.");

    await this.migrateProfile(user);
    const token = await this.sessionService.sign({
      userId: user.id,
      email: user.email,
    });
    return { user: this.publicUser(user), token };
  }

  async googleLogin(
    identity: { subject: string; email: string; name: string },
    link?: { userId: string; password: string },
  ) {
    const subject = localPrivacy()
      ? accountKey("google", identity.subject)
      : identity.subject;
    const linked =
      (await this.users.findByGoogleSubject(subject)) ??
      (localPrivacy()
        ? await this.users.findByGoogleSubject(identity.subject)
        : null);
    if (linked && link && linked.id !== link.userId)
      throw new Error("다른 계정에 연결된 Google 계정입니다.");
    let user = linked;
    if (!user) {
      const existing =
        (await this.users.findByEmail(
          localPrivacy()
            ? privateEmail(identity.email)
            : identity.email.toLowerCase(),
        )) ??
        (localPrivacy()
          ? await this.users.findByEmail(identity.email.toLowerCase())
          : null);
      if (existing) {
        if (
          !link ||
          link.userId !== existing.id ||
          !existing.passwordHash ||
          !(await this.hashService.verifyPassword(
            link.password,
            existing.passwordHash,
          ))
        )
          throw new Error(
            "기존 계정으로 로그인한 뒤 내 정보에서 비밀번호를 확인하고 Google을 연결해 주세요.",
          );
        if (existing.googleSubject)
          throw new Error("이미 다른 Google 계정이 연결되어 있습니다.");
        existing.googleSubject = subject;
        user = await this.users.save(existing);
      } else {
        if (link)
          throw new Error(
            "기존 계정과 같은 이메일의 Google 계정으로 연결해 주세요.",
          );
        user = await this.users.save(
          new User({
            id: crypto.randomUUID(),
            email: localPrivacy()
              ? privateEmail(identity.email)
              : identity.email.toLowerCase(),
            name: localPrivacy() ? "사용자" : identity.name.slice(0, 120),
            googleSubject: subject,
          }),
        );
      }
    }
    await this.migrateProfile(user);
    return {
      user: this.publicUser(user),
      token: await this.sessionService.sign({
        userId: user.id,
        email: user.email,
      }),
    };
  }

  async activeUser(id: string) {
    const user = await this.users.findById(id);
    if (user) await this.migrateProfile(user);
    return user ? this.publicUser(user) : null;
  }

  private async migrateProfile(user: User) {
    if (!localPrivacy()) return;
    const email = /^[a-f0-9]{64}@accounts\.local$/.test(user.email)
      ? user.email : privateEmail(user.email);
    const subject = user.googleSubject && !/^h1:[a-f0-9]{64}$/.test(user.googleSubject)
      ? accountKey("google", user.googleSubject) : user.googleSubject;
    if (user.email === email && user.name === "사용자" && user.googleSubject === subject) return;
    user.email = email;
    user.name = "사용자";
    user.googleSubject = subject;
    await this.users.save(user);
  }

  private publicUser(user: User) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      googleConnected: Boolean(user.googleSubject),
    };
  }
}
