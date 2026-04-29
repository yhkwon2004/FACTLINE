import { User } from "../../domain/entities";
import type { IUserRepository } from "../../domain/repositories";
import { HashService } from "../../infrastructure/security/HashService";
import { JwtSessionService } from "../../infrastructure/security/JwtSessionService";
import type { LoginInput, RegisterInput } from "../dtos";

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
    if (!emailPattern.test(email)) throw new Error("이메일 형식을 확인해 주세요.");
    if (password.length < 8) throw new Error("비밀번호는 8자 이상이어야 합니다.");
    if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      throw new Error("비밀번호에는 영문과 숫자를 함께 포함해 주세요.");
    }

    const existing = await this.users.findByEmail(email);
    if (existing) throw new Error("이미 가입된 이메일입니다.");

    const user = new User({
      id: crypto.randomUUID(),
      email,
      name,
      passwordHash: await this.hashService.hashPassword(password),
    });

    const saved = await this.users.save(user);
    const token = await this.sessionService.sign({ userId: saved.id, email: saved.email });
    return { user: this.publicUser(saved), token };
  }

  async login(input: LoginInput) {
    const email = input.email.trim().toLowerCase();
    if (!emailPattern.test(email)) throw new Error("이메일 또는 비밀번호를 확인해 주세요.");

    const user = await this.users.findByEmail(email);
    if (!user?.passwordHash) throw new Error("이메일 또는 비밀번호를 확인해 주세요.");

    const ok = await this.hashService.verifyPassword(input.password, user.passwordHash);
    if (!ok) throw new Error("이메일 또는 비밀번호를 확인해 주세요.");

    const token = await this.sessionService.sign({ userId: user.id, email: user.email });
    return { user: this.publicUser(user), token };
  }

  private publicUser(user: User) {
    return { id: user.id, email: user.email, name: user.name };
  }
}
