// Pure Pascal's-triangle-mod-m math. No DOM / no canvas — unit-tested in pascal.test.ts.
//
// Coordinate convention (axial / triangular), shared verbatim by camera.ts and
// renderer.ts: cell (i, j) with 0 <= j <= i sits at world
//     x = j - i / 2     (each row of i+1 cells is centered on x = 0)
//     y = i             (row index increases DOWNWARD; screen-y is flipped at draw time)
// So the apex (0,0) is at x = 0, row i spans x in [-i/2, +i/2], and a `rows`-deep
// triangle occupies x in [-rows/2, +rows/2], y in [0, rows].

/** Trial-division primality test (modulus is always small here, m <= 128). */
export function isPrime(n: number): boolean {
  if (!Number.isInteger(n) || n < 2) return false;
  if (n % 2 === 0) return n === 2;
  if (n % 3 === 0) return n === 3;
  for (let d = 5; d * d <= n; d += 6) {
    if (n % d === 0 || n % (d + 2) === 0) return false;
  }
  return true;
}

/** Perfect number: equals the sum of its proper divisors (6, 28, 496, …). Used by
 *  the perfect/non-perfect color mode to classify a cell's residue value. */
export function isPerfect(n: number): boolean {
  if (!Number.isInteger(n) || n < 2) return false;
  let sum = 1; // 1 is a proper divisor of every n > 1
  for (let d = 2; d * d <= n; d++) {
    if (n % d !== 0) continue;
    sum += d;
    const co = n / d;
    if (co !== d) sum += co;
  }
  return sum === n;
}

/** Greatest common divisor (Euclid). Used to classify the modulus alongside isPrime. */
export function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x;
}

/**
 * Strategy 1 (any m): residues of the whole triangle, packed row-major.
 * `rows` R produces R*(R+1)/2 entries; `rowStart[i] = i*(i+1)/2` indexes the
 * first cell of row i, and `rowStart[R]` is the total. The residue of (i, j) is
 * `values[rowStart[i] + j]`.
 */
export type PascalResidues = {
  rows: number;
  m: number;
  values: Uint8Array; // length R*(R+1)/2, residue of each (i,j) in row-major order
  rowStart: Int32Array; // length R+1, rowStart[i] = i*(i+1)/2, rowStart[R] = total
};

/**
 * Build the packed residue triangle by rolling the recurrence
 *   C(i, j) = C(i-1, j-1) + C(i-1, j)   (mod m)
 * forward row by row. O(R^2) time and storage; correct for any modulus and the
 * fallback path for composite m. (Residues 0..m-1 are stored in a byte, so this
 * is intended for the small moduli used here, m <= 128; the m = 1e6 unit test
 * only reaches values <= 6, which still fit.)
 */
export function buildResidues(rows: number, m: number): PascalResidues {
  const R = Math.max(0, Math.floor(rows));
  const rowStart = new Int32Array(R + 1);
  for (let i = 0; i <= R; i++) rowStart[i] = (i * (i + 1)) / 2;
  const values = new Uint8Array(rowStart[R]);
  const one = 1 % m; // 1 for m >= 2; degrades gracefully for m = 1
  for (let i = 0; i < R; i++) {
    const start = rowStart[i];
    const prev = i > 0 ? rowStart[i - 1] : 0;
    values[start] = one; // C(i, 0)
    values[start + i] = one; // C(i, i)  (same cell as above for i = 0)
    for (let j = 1; j < i; j++) {
      values[start + j] = (values[prev + j - 1] + values[prev + j]) % m;
    }
  }
  return { rows: R, m, values, rowStart };
}

// (base ** exp) mod p by fast exponentiation. Every intermediate product stays
// below p^2 (p <= 128 here → < 16384), so it's exact in a JS number. Used to
// invert a denominator mod the prime p via Fermat's little theorem (a^(p-2) ≡ a⁻¹).
function modPow(base: number, exp: number, p: number): number {
  let result = 1 % p;
  let b = base % p;
  let e = exp;
  while (e > 0) {
    if (e & 1) result = (result * b) % p;
    b = (b * b) % p;
    e = Math.floor(e / 2);
  }
  return result;
}

// C(n, k) mod p for a prime p with 0 <= k <= n < p — Lucas' per-digit binomial.
// Numerator and denominator are reduced mod p at every step and the denominator
// is then inverted via Fermat, so the result is exact even when the true binomial
// vastly overflows Number (e.g. C(126, 63) ≈ 6.6e36 at p = 127). Each factor lies
// in [1, p-1], hence is coprime to the prime p and invertible.
function binomMod(n: number, k: number, p: number): number {
  if (k < 0 || k > n) return 0;
  const kk = k > n - k ? n - k : k; // symmetry C(n,k) = C(n,n-k) → fewer iterations
  let num = 1;
  let den = 1;
  for (let t = 0; t < kk; t++) {
    num = (num * ((n - t) % p)) % p;
    den = (den * ((t + 1) % p)) % p;
  }
  return (num * modPow(den, p - 2, p)) % p;
}

/**
 * Strategy 2 (prime p only): C(i, j) mod p via Lucas' theorem, O(log_p i) per
 * cell — writing i and j in base p, the coefficient is the product of the
 * per-digit binomials (each computed mod p, so it never overflows for the
 * supported primes p <= 128), and is 0 the moment any digit j_k > i_k. Lets the
 * renderer evaluate only the cells visible under the camera, with no materialised
 * triangle, so prime m zooms arbitrarily deep for free. Throws if p is not prime.
 */
export function lucasMod(i: number, j: number, p: number): number {
  if (!isPrime(p)) throw new Error(`lucasMod requires a prime modulus, got ${p}`);
  if (j < 0 || j > i) return 0;
  let result = 1;
  let a = i;
  let b = j;
  while (a > 0 || b > 0) {
    const ai = a % p;
    const bi = b % p;
    if (bi > ai) return 0;
    result = (result * binomMod(ai, bi, p)) % p;
    a = Math.floor(a / p);
    b = Math.floor(b / p);
  }
  return result;
}
