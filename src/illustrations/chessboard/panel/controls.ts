// Small Manifold-styled control builders for the studio panel (vanilla TS).
import { el } from "../../../shared/dom";
import { type IconName, icon } from "../../../shared/icons";

type Variant = "primary" | "secondary" | "ghost" | "danger";

/** A labelled field: uppercase mono micro-label above a control. */
export function field(label: string, control: HTMLElement): HTMLElement {
  return el("div", { className: "cb-field" }, [
    el("span", { className: "cb-field-label ds-label" }, [label]),
    control,
  ]);
}

export function mButton(
  label: string,
  opts: { icon?: IconName; variant?: Variant; onClick?: () => void } = {},
): HTMLButtonElement {
  const btn = el("button", {
    className: `cb-btn cb-btn--${opts.variant ?? "secondary"}`,
    type: "button",
  }) as HTMLButtonElement;
  if (opts.icon) btn.append(icon(opts.icon, 14));
  btn.append(el("span", {}, [label]));
  if (opts.onClick) btn.addEventListener("click", opts.onClick);
  return btn;
}

export function mIconButton(
  name: IconName,
  opts: { title?: string; variant?: Variant; onClick?: () => void } = {},
): HTMLButtonElement {
  const btn = el("button", {
    className: `cb-icon-btn cb-icon-btn--${opts.variant ?? "secondary"}`,
    type: "button",
    title: opts.title ?? name,
    "aria-label": opts.title ?? name,
  }) as HTMLButtonElement;
  btn.append(icon(name, 15));
  if (opts.onClick) btn.addEventListener("click", opts.onClick);
  return btn;
}

export function mSlider(opts: {
  min: number;
  max: number;
  value: number;
  step?: number;
  onInput: (value: number) => void;
}): HTMLInputElement {
  const input = el("input", {
    type: "range",
    className: "cb-slider",
    min: String(opts.min),
    max: String(opts.max),
    step: String(opts.step ?? 1),
    value: String(opts.value),
  }) as HTMLInputElement;
  input.addEventListener("input", () => opts.onInput(Number(input.value)));
  return input;
}

export function mSegmented<T extends string>(
  options: { value: T; label: string }[],
  value: T,
  onChange: (value: T) => void,
): HTMLElement {
  const root = el("div", { className: "cb-segmented" });
  for (const opt of options) {
    const seg = el(
      "button",
      { type: "button", className: `cb-segment${opt.value === value ? " is-active" : ""}` },
      [opt.label],
    );
    seg.addEventListener("click", () => {
      // Self-select so live (non-structural) toggles reflect immediately even
      // when the panel doesn't re-render; structural ones rebuild regardless.
      for (const child of root.children) child.classList.remove("is-active");
      seg.classList.add("is-active");
      onChange(opt.value);
    });
    root.append(seg);
  }
  return root;
}

export function mNumber(opts: {
  value: number;
  min?: number;
  max?: number;
  /** Increment per +/- click. A function receives the current value (adaptive steps). */
  step?: number | ((value: number) => number);
  onChange: (value: number) => void;
}): HTMLElement {
  const stepFor = (v: number): number =>
    typeof opts.step === "function" ? opts.step(v) : (opts.step ?? 1);
  const input = el("input", {
    type: "number",
    className: "cb-number-input",
    value: String(opts.value),
  }) as HTMLInputElement;
  if (opts.min !== undefined) input.min = String(opts.min);
  if (opts.max !== undefined) input.max = String(opts.max);

  const clamp = (v: number): number => {
    let n = Number.isFinite(v) ? v : (opts.min ?? 0);
    if (opts.min !== undefined) n = Math.max(opts.min, n);
    if (opts.max !== undefined) n = Math.min(opts.max, n);
    return n;
  };
  const commit = (v: number): void => {
    const n = clamp(v);
    input.value = String(n);
    opts.onChange(n);
  };
  input.addEventListener("change", () => commit(Number(input.value)));

  return el("div", { className: "cb-number" }, [
    mIconButton("minus", {
      title: "Decrease",
      onClick: () => commit(Number(input.value) - stepFor(Number(input.value))),
    }),
    input,
    mIconButton("plus", {
      title: "Increase",
      onClick: () => commit(Number(input.value) + stepFor(Number(input.value))),
    }),
  ]);
}
