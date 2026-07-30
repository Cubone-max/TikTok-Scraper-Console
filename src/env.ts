import "dotenv/config";

export function envString(name: string, fallback = ""): string {
  const value = process.env[name];
  return value === undefined || value === "" ? fallback : value;
}

export function envBool(name: string, fallback: boolean): boolean {
  const value = envString(name);
  if (!value) return fallback;
  return ["1", "true", "yes", "y", "on"].includes(value.toLowerCase());
}

export function envInt(name: string, fallback: number): number {
  const value = Number.parseInt(envString(name), 10);
  return Number.isFinite(value) ? value : fallback;
}
