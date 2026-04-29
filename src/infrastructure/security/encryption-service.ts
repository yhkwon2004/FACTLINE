import CryptoJS from "crypto-js";

const SECRET_KEY = process.env.ENCRYPTION_KEY || "factline-development-encryption-key-change-me";

/**
 * AES Encryption service for sensitive data
 */
export class EncryptionService {
  static encrypt(plaintext: string): string {
    return CryptoJS.AES.encrypt(plaintext, SECRET_KEY).toString();
  }

  static decrypt(ciphertext: string): string {
    const bytes = CryptoJS.AES.decrypt(ciphertext, SECRET_KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
  }

  /**
   * Generates a hash for file integrity (using SHA-256)
   */
  static hashFile(content: string): string {
    return CryptoJS.SHA256(content).toString();
  }
}
