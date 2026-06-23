export type AnimatorOptions = {
  isPlaying(): boolean;
  /** Advance the animation by `dt` seconds (consumer decides the rate curve). */
  onTick(dt: number): void;
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
    if (opts.isPlaying()) opts.onTick(dt);
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
