/**
 * Duration strings (`15m`, `30d`) are what `jsonwebtoken` speaks, but a cookie
 * `maxAge` needs milliseconds. One parser keeps the two in lockstep so a token
 * can never outlive the cookie that carries it, or the other way round.
 */
const UNITS: Record<string, number> = {
  s: 1_000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
};

export function parseDuration(value: string): number {
  const match = /^(\d+)\s*(s|m|h|d)$/.exec(value.trim());
  if (!match) throw new Error(`Unsupported duration "${value}" — use e.g. 30s, 15m, 12h, 30d.`);
  const amount = Number(match[1]);
  const unit = UNITS[match[2] as string];
  if (!unit) throw new Error(`Unsupported duration unit in "${value}".`);
  return amount * unit;
}
