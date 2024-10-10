import { type UUID } from "node:crypto";

export function arrayify<T>(arr: T | T[]): T[] {
  return Array.isArray(arr) ? arr : [arr];
}

export function stringify(obj: any): string {
  return typeof obj === "string" ? obj : JSON.stringify(obj, null, 2);
}

export function friendly(id: UUID): string {
  return id.slice(0, 8);
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
