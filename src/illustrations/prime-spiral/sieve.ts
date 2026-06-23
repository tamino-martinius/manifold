// Pure number-theory for the prime polar spiral. Unit-tested in sieve.test.ts.

/**
 * Sieve of Eratosthenes mask. `mask[i] === 1` iff `i` is prime (so `0` and `1`
 * are 0, `2` is 1). Length `N+1`, indexable directly by the integer.
 */
export function primeMask(n: number): Uint8Array {
  const N = Math.max(0, Math.floor(n));
  const mask = new Uint8Array(N + 1);
  if (N < 2) return mask;
  mask.fill(1, 2, N + 1);
  for (let p = 2; p * p <= N; p++) {
    if (mask[p] === 0) continue;
    for (let q = p * p; q <= N; q += p) mask[q] = 0;
  }
  return mask;
}

/** The list of primes `<= n`, ascending. */
export function sieve(n: number): number[] {
  const mask = primeMask(n);
  const primes: number[] = [];
  for (let i = 2; i < mask.length; i++) {
    if (mask[i] === 1) primes.push(i);
  }
  return primes;
}

/**
 * The arm (residue class) of integer `n` under modulus `m` — exactly `n mod m`,
 * normalised to `[0, m)` so negative `n` behave too. Each visible spiral arm is
 * one residue class; this is the value the color-by-residue mode keys on.
 */
export function armOf(n: number, m: number): number {
  return ((n % m) + m) % m;
}

/** World coordinate of integer `n`: polar `(r = n, θ = n rad)` in Cartesian. */
export function coordsFor(n: number): { x: number; y: number } {
  return { x: n * Math.cos(n), y: n * Math.sin(n) };
}
