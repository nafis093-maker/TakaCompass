import React, { useEffect, useRef, useState } from "react";

export function prefersReducedMotion() {
  try { return matchMedia("(prefers-reduced-motion: reduce)").matches; } catch { return false; }
}

export function useReducedMotion() {
  const [r, setR] = useState(prefersReducedMotion);
  useEffect(() => {
    let m;
    try { m = matchMedia("(prefers-reduced-motion: reduce)"); } catch { return; }
    const fn = () => setR(m.matches);
    m.addEventListener ? m.addEventListener("change", fn) : m.addListener(fn);
    return () => { m.removeEventListener ? m.removeEventListener("change", fn) : m.removeListener(fn); };
  }, []);
  return r;
}

// Smoothly animates a number from its previous value to the new one.
export function CountUp({ value, format = (n) => Math.round(n).toLocaleString("en-US"), duration = 650, className }) {
  const reduce = useReducedMotion();
  const [disp, setDisp] = useState(value);
  const fromRef = useRef(value);
  const rafRef = useRef(0);

  useEffect(() => {
    if (reduce || fromRef.current === value) { setDisp(value); fromRef.current = value; return; }
    const from = fromRef.current;
    const t0 = performance.now();
    const ease = (t) => 1 - Math.pow(1 - t, 3);
    const tick = (now) => {
      const p = Math.min(1, (now - t0) / duration);
      setDisp(from + (value - from) * ease(p));
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
      else fromRef.current = value;
    };
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value, duration, reduce]);

  return <span className={className}>{format(disp)}</span>;
}
