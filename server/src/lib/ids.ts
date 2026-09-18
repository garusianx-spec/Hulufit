import { randomBytes, randomUUID } from "node:crypto";

/** Prefixed, sortable-enough identifiers that are readable in logs. */
export function id(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${randomBytes(4).toString("hex")}`;
}

export const uuid = randomUUID;
