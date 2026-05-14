const HEX6 = /^#[0-9A-Fa-f]{6}$/;

export type ParsedAccent =
  | { kind: "solid"; hex: string }
  | { kind: "gradient"; from: string; to: string; angle: number };

/** Rozpoznaje `#RRGGBB` lub JSON gradientu `{v:1,g:true,a,f,t}`. */
export function tryParseAccentStored(raw: string): ParsedAccent | null {
  const t = raw.trim();
  if (HEX6.test(t)) return { kind: "solid", hex: t };
  try {
    const o = JSON.parse(t) as Record<string, unknown>;
    if (o.v !== 1 || o.g !== true) return null;
    const angle = Number(o.a);
    const from = String(o.f ?? "");
    const to = String(o.t ?? "");
    if (!Number.isFinite(angle) || angle < 0 || angle > 360) return null;
    if (!HEX6.test(from) || !HEX6.test(to)) return null;
    return { kind: "gradient", from, to, angle: Math.round(angle) };
  } catch {
    return null;
  }
}

export function parseAccentStored(raw: string): ParsedAccent {
  return tryParseAccentStored(raw) ?? { kind: "solid", hex: "#18181b" };
}

export function serializeAccent(p: ParsedAccent): string {
  if (p.kind === "solid") return p.hex;
  return JSON.stringify({ v: 1, g: true, a: p.angle, f: p.from, t: p.to });
}

/** Pierwszy kolor — obramowania / ikony / kontrast tekstu na primary. */
export function accentFirstStopHex(raw: string): string {
  const p = parseAccentStored(raw);
  return p.kind === "solid" ? p.hex : p.from;
}

export function accentGradientCss(raw: string): string | null {
  const p = parseAccentStored(raw);
  if (p.kind !== "gradient") return null;
  return `linear-gradient(${p.angle}deg, ${p.from}, ${p.to})`;
}
