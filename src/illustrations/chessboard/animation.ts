export type AnimatorOptions = {
  isPlaying(): boolean;
  getSpeed(): number;
  getFrame(): number;
  getMax(): number;
  setFrame(f: number): void;
  render(): void;
};

export function createAnimator(opts: AnimatorOptions): { start(): void; stop(): void } {
  let rafId = 0;
  let last = 0;
  let running = false;

  const tick = (now: number) => {
    if (!running) return;
    const dt = last === 0 ? 0 : (now - last) / 1000;
    last = now;
    if (opts.isPlaying()) {
      const next = opts.getFrame() + opts.getSpeed() * dt;
      opts.setFrame(Math.min(next, opts.getMax()));
    }
    opts.render();
    rafId = requestAnimationFrame(tick);
  };

  return {
    start() {
      if (running) return;
      running = true;
      last = 0;
      rafId = requestAnimationFrame(tick);
    },
    stop() {
      running = false;
      cancelAnimationFrame(rafId);
    },
  };
}
