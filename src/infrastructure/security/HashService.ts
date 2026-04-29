import bcrypt from "bcryptjs";

export class HashService {
  async hashPassword(password: string) {
    return bcrypt.hash(password, 12);
  }

  async verifyPassword(password: string, hash: string) {
    return bcrypt.compare(password, hash);
  }
}

