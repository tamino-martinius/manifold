// Pure prime math for the Ulam / prime spiral: a Sieve of Eratosthenes and the
// highlight-set membership built on top of it. The sieve is the single source of
// truth — every highlight set requires the value to be prime first.

export type Sieve = Uint8Array; // sieve[n] === 1 ⇔ n is prime

export type HighlightMode = "primes" | "twin" | "euler" | "custom" | "squares" | "triangular";
export type Quad = { a: number; b: number; c: number };

/** Sieve of Eratosthenes. `sieve(n).length === n + 1`; index n is its primality. */
export function sieve(n: number): Sieve {
  const s = new Uint8Array(n + 1);
  if (n < 2) return s;
  s.fill(1, 2); // 2..n provisionally prime; 0 and 1 stay 0
  const lim = Math.floor(Math.sqrt(n));
  for (let p = 2; p <= lim; p++) {
    if (s[p] === 1) {
      for (let m = p * p; m <= n; m += p) s[m] = 0;
    }
  }
  return s;
}

/** True when `p` is a prime with a prime neighbour at p−2 or p+2 (bounds-guarded). */
export function isTwin(s: Sieve, p: number, n: number): boolean {
  if (s[p] !== 1) return false;
  const lower = p - 2 >= 2 && s[p - 2] === 1;
  const upper = p + 2 <= n && s[p + 2] === 1;
  return lower || upper;
}

/**
 * Values of Q(k) = a·k² + b·k + c for k = 0,1,2,… that land in [1, n], in
 * ascending k order. Stops once Q has passed n on the rising side of the
 * parabola; a hard k ≤ n cap guards against constant / non-increasing quadratics.
 */
export function quadValues(quad: Quad, n: number): number[] {
  const { a, b, c } = quad;
  const out: number[] = [];
  for (let k = 0; k <= n; k++) {
    const q = a * k * k + b * k + c;
    if (q >= 1 && q <= n) out.push(q);
    // Past n and rising (derivative ≥ 0): no later k can fall back into range.
    if (q > n && 2 * a * k + b >= 0) break;
  }
  return out;
}

/** Perfect squares 1,4,9,… in [1, n], ascending. They trace the spiral's diagonal. */
export function squareValues(n: number): number[] {
  const out: number[] = [];
  for (let k = 1; k * k <= n; k++) out.push(k * k);
  return out;
}

/** Triangular numbers k(k+1)/2 = 1,3,6,10,… in [1, n], ascending. */
export function triangularValues(n: number): number[] {
  const out: number[] = [];
  for (let k = 1; ; k++) {
    const t = (k * (k + 1)) / 2;
    if (t > n) break;
    out.push(t);
  }
  return out;
}

/**
 * O(1)-per-value flag array: `highlightFlags(...)[v] === 1` ⇔ `v` is in the
 * active highlight set. Every set requires `v` to be prime.
 */
export function highlightFlags(s: Sieve, n: number, mode: HighlightMode, quad: Quad): Uint8Array {
  const flag = new Uint8Array(n + 1);
  if (mode === "primes") {
    for (let v = 2; v <= n; v++) if (s[v] === 1) flag[v] = 1;
    return flag;
  }
  if (mode === "twin") {
    for (let v = 2; v <= n; v++) if (isTwin(s, v, n)) flag[v] = 1;
    return flag;
  }
  if (mode === "squares") {
    for (const v of squareValues(n)) flag[v] = 1;
    return flag;
  }
  if (mode === "triangular") {
    for (const v of triangularValues(n)) flag[v] = 1;
    return flag;
  }
  const q = mode === "euler" ? { a: 1, b: 1, c: 41 } : quad;
  for (const v of quadValues(q, n)) {
    if (v >= 0 && v <= n && s[v] === 1) flag[v] = 1;
  }
  return flag;
}
