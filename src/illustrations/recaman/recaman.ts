// Recamán's sequence (OEIS A005132) packed into render-ready arc geometry.
//
//   a(0) = 0
//   a(n) = a(n-1) − n   if that is > 0 and not already seen, else a(n-1) + n
//
// Each step n is drawn as a semicircle whose diameter is the segment between
// a(n-1) and a(n) on the line y = 0. Because every gap equals exactly n, the
// radius is n/2; the side alternates by parity (odd n above, even n below).

export type RecamanArcs = {
  values: Int32Array; // a(0..N): values[k] = a(k)                (length N+1)
  starts: Int32Array; // a(n-1) for step n=1..N                   (length N)
  ends: Int32Array; // a(n)   for step n=1..N                     (length N)
  above: Uint8Array; // 1 if step n drawn above the line, else 0  (length N)
  minValue: number; // min over values (always 0)
  maxValue: number; // max over values — right edge of the line
  maxRadius: number; // max(n/2) over steps = N/2 — tallest arc
};

/**
 * Generate the first `terms` steps of Recamán's sequence. `terms` is the number
 * of steps, so `values` has `terms + 1` entries (a(0) through a(terms)).
 */
export function generateRecaman(terms: number): RecamanArcs {
  const n = Math.max(0, Math.floor(terms));
  const values = new Int32Array(n + 1);
  const starts = new Int32Array(n);
  const ends = new Int32Array(n);
  const above = new Uint8Array(n);
  const seen = new Set<number>([0]);

  let maxValue = 0;
  let current = 0;
  values[0] = 0;

  for (let step = 1; step <= n; step++) {
    const back = current - step;
    const next = back > 0 && !seen.has(back) ? back : current + step;
    seen.add(next);

    values[step] = next;
    starts[step - 1] = current;
    ends[step - 1] = next;
    above[step - 1] = step % 2 === 1 ? 1 : 0; // odd n above, even n below
    if (next > maxValue) maxValue = next;
    current = next;
  }

  return {
    values,
    starts,
    ends,
    above,
    minValue: 0,
    maxValue,
    maxRadius: n / 2,
  };
}
