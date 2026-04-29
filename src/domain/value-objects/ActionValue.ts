export class ActionValue {
  constructor(public readonly value: string | null) {}

  isMissing() {
    return !this.value || this.value.trim().length === 0;
  }
}

