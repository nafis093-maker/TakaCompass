// Tiny self-contained confetti — no dependency. Respects reduced-motion.
export function burst({ count = 130, duration = 1500, originY = 0.3,
  colors = ["#0ea372", "#10b981", "#f59f0a", "#0891b2", "#fa5a7d", "#8b5cf6"] } = {}) {
  if (typeof document === "undefined") return;
  try { if (matchMedia("(prefers-reduced-motion: reduce)").matches) return; } catch {}

  const cv = document.createElement("canvas");
  cv.style.cssText = "position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:9999";
  document.body.appendChild(cv);
  const ctx = cv.getContext("2d");
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const resize = () => { cv.width = innerWidth * dpr; cv.height = innerHeight * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
  resize();

  const cx = innerWidth / 2, cy = innerHeight * originY;
  const parts = Array.from({ length: count }, () => {
    const ang = Math.random() * Math.PI * 2, sp = 4 + Math.random() * 8;
    return {
      x: cx, y: cy, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - 5,
      g: 0.16 + Math.random() * 0.12, s: 5 + Math.random() * 6, rot: Math.random() * 6.28,
      vr: (Math.random() - 0.5) * 0.5, c: colors[(Math.random() * colors.length) | 0], box: Math.random() < 0.5,
    };
  });

  const t0 = performance.now();
  const frame = (now) => {
    const e = now - t0;
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    parts.forEach((p) => {
      p.vy += p.g; p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.vx *= 0.99;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      ctx.globalAlpha = Math.max(0, 1 - e / duration); ctx.fillStyle = p.c;
      if (p.box) ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 0.6);
      else { ctx.beginPath(); ctx.arc(0, 0, p.s / 2, 0, 6.28); ctx.fill(); }
      ctx.restore();
    });
    if (e < duration) requestAnimationFrame(frame); else cv.remove();
  };
  requestAnimationFrame(frame);
}
