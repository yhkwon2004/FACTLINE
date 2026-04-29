export class DateTimeValue {
  private constructor(
    public readonly value: Date | null,
    public readonly approximate: boolean,
    public readonly originalText: string | null,
  ) {}

  static exact(value: Date | string) {
    return new DateTimeValue(new Date(value), false, null);
  }

  static approximate(originalText: string, fallback?: Date | string | null) {
    return new DateTimeValue(fallback ? new Date(fallback) : null, true, originalText);
  }

  static unknown() {
    return new DateTimeValue(null, true, null);
  }

  toDisplayText() {
    if (this.originalText) return this.originalText;
    if (!this.value) return "시점 확인 필요";
    return this.value.toLocaleString("ko-KR", { dateStyle: "medium", timeStyle: "short" });
  }
}

