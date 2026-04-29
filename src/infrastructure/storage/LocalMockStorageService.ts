import type { IStorageService } from "../../application/ports";
import { EncryptionService } from "../security/encryption-service";

export class LocalMockStorageService implements IStorageService {
  async save(input: { name: string; type: string; content: string }) {
    const fileHash = this.hash(input.content);
    return {
      fileUrl: `mock://evidence/${encodeURIComponent(input.name)}`,
      fileHash,
    };
  }

  hash(content: string) {
    return EncryptionService.hashFile(content);
  }
}

