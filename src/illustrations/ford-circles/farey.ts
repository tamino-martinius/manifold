// Ford circles & Farey sequences — pure math (no DOM / canvas).
//
// A reduced fraction p/q maps to a circle resting on the number line at x = p/q
// with center (p/q, 1/(2q²)) and radius 1/(2q²). Two circles kiss iff their
// fractions are Farey neighbors, i.e. |a·d − b·c| = 1.

export type FordCircle = {
  p: number; // numerator
  q: number; // denominator (1 ≤ q ≤ n, gcd(p,q) = 1)
  x: number; // p / q          — tangent point on the line
  r: number; // 1 / (2 q²)     — radius == center.y
  depth: number; // Stern–Brocot generation (0 for integers: 0/1, 1/1, …)
};

/** Greatest common divisor via Euclid's algorithm; always non-negative. */
export function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) {
    const t = x % y;
    x = y;
    y = t;
  }
  return x;
}

/**
 * Stern–Brocot generation of p/q. Integers (0/1, 1/1, 2/1, …) are depth 0; the
 * depth of a non-integer is taken within its unit interval, so the [0,1] pattern
 * repeats unshifted across [k, k+1]. Equals (Σ continued-fraction quotients) − 1
 * of the fractional part — the number of mediant steps to reach it.
 */
function sternBrocotDepth(p: number, q: number): number {
  // Numerator of the fractional part, in [0, q).
  let a = ((p % q) + q) % q;
  if (a === 0) return 0; // an integer sits on the boundary of the tree
  let b = q;
  let sum = 0;
  while (a > 0) {
    sum += Math.floor(b / a);
    const t = b % a;
    b = a;
    a = t;
  }
  return sum - 1;
}

function makeCircle(p: number, q: number): FordCircle {
  return { p, q, x: p / q, r: 1 / (2 * q * q), depth: sternBrocotDepth(p, q) };
}

/**
 * The Farey sequence F_n: every reduced p/q in [0,1] with q ≤ n, in increasing
 * order from 0/1 to 1/1. Built with the neighbor recurrence so consecutive terms
 * are exactly the tangent (kissing) pairs. |F_n| is OEIS A005728.
 */
export function fareySequence(n: number): FordCircle[] {
  const out: FordCircle[] = [makeCircle(0, 1)];
  // (a/b, c/d) start at (0/1, 1/n); each step emits c/d and advances.
  let a = 0;
  let b = 1;
  let c = 1;
  let d = n;
  while (c <= n) {
    out.push(makeCircle(c, d));
    const k = Math.floor((n + b) / d);
    const nc = k * c - a;
    const nd = k * d - b;
    a = c;
    b = d;
    c = nc;
    d = nd;
  }
  return out;
}

/**
 * All Ford circles of order ≤ n whose disc overlaps the interval [a, b], emitted
 * in non-decreasing denominator order. Enumerating by denominator (not just the
 * tangent point) lets a big low-q circle that merely reaches into the window be
 * drawn, and lets the renderer reveal a cheap q-ascending prefix. Numerators may
 * fall outside [0, q] when a > 0 (e.g. panning to [3, 4]).
 */
export function fordCircles(n: number, a: number, b: number): FordCircle[] {
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
  const out: FordCircle[] = [];
  for (let q = 1; q <= n; q++) {
    const r = 1 / (2 * q * q);
    // disc [x − r, x + r] overlaps [lo, hi]  ⇔  x ∈ [lo − r, hi + r]
    const pLo = Math.ceil((lo - r) * q);
    const pHi = Math.floor((hi + r) * q);
    for (let p = pLo; p <= pHi; p++) {
      if (gcd(p, q) === 1) out.push(makeCircle(p, q));
    }
  }
  return out;
}

/** Two Ford circles kiss (are externally tangent) iff |a·d − b·c| = 1. */
export function tangent(a: FordCircle, c: FordCircle): boolean {
  return Math.abs(a.p * c.q - a.q * c.p) === 1;
}

/** The mediant (a+c)/(b+d) — the first fraction inserted between two neighbors. */
export function mediant(a: FordCircle, c: FordCircle): { p: number; q: number } {
  return { p: a.p + c.p, q: a.q + c.q };
}
