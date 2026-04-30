import type { IntegrationProvider } from "../../../domain/types";

export const integrationProviders: IntegrationProvider[] = ["KAKAOTALK", "GMAIL", "OUTLOOK", "SMS", "INSTAGRAM", "MANUAL"];

export function parseIntegrationProvider(value: unknown): IntegrationProvider {
  const provider = String(value ?? "MANUAL").toUpperCase() as IntegrationProvider;
  return integrationProviders.includes(provider) ? provider : "MANUAL";
}

export function parseStringArray(value: unknown) {
  if (Array.isArray(value)) return value.map(String).map((item) => item.trim()).filter(Boolean);
  if (typeof value === "string") return value.split(",").map((item) => item.trim()).filter(Boolean);
  return [];
}
