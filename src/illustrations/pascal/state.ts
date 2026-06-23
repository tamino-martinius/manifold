import { type Store, createStore } from "../../shared/store";

// binary  → lit cells use --accent (the gasket look)
// hue     → residue r maps onto --pal-spectral
// prime   → primes vs non-primes, each a color family shaded by value
// perfect → perfect numbers vs the rest, each a color family shaded by value
export type ColorMode = "binary" | "hue" | "prime" | "perfect";

export type PascalState = {
  /** Modulus m (>= 2). The marquee control — dragging it morphs the lattice. */
  m: number;
  /** Triangle depth (number of rows in the figure). */
  rows: number;
  /** Rows revealed so far (reveal animation, top→bottom). 0..rows. */
  frame: number;
  playing: boolean;
  /** Rows revealed per second while playing. */
  speed: number;
  /** How nonzero residues are colored. Residue numbers auto-fade in at high zoom. */
  colorMode: ColorMode;
};

// The cached PascalResidues for composite m lives in main.ts, rebuilt lazily on
// (m, rows) change; prime m uses lucasMod per visible cell and needs no cache.
export function createPascalStore(): Store<PascalState> {
  return createStore<PascalState>({
    m: 4,
    rows: 512,
    frame: 0,
    playing: true,
    speed: 120, // rows/sec — keeps the deeper 512-row reveal to ~4s
    colorMode: "hue",
  });
}
