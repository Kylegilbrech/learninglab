/* Lightweight canvas confetti — no dependencies. window.burstConfetti(x, y). */
(function () {
  let canvas, ctx, raf, pieces = [];
  function ensure() {
    if (canvas) return;
    canvas = document.createElement("canvas");
    canvas.className = "confetti-canvas";
    document.body.appendChild(canvas);
    ctx = canvas.getContext("2d");
    resize();
    window.addEventListener("resize", resize);
  }
  function resize() {
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = innerWidth * dpr;
    canvas.height = innerHeight * dpr;
    canvas.style.width = innerWidth + "px";
    canvas.style.height = innerHeight + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  const COLORS = ["#c6f24e", "#48d6ff", "#ffb02e", "#ff5d6c", "#c89bff", "#ffffff"];
  window.burstConfetti = function (x, y, count) {
    ensure();
    x = x == null ? innerWidth / 2 : x;
    y = y == null ? innerHeight / 3 : y;
    count = count || 90;
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 3 + Math.random() * 8;
      pieces.push({
        x, y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 5,
        g: 0.18 + Math.random() * 0.12,
        s: 5 + Math.random() * 6,
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.3,
        c: COLORS[(Math.random() * COLORS.length) | 0],
        life: 90 + Math.random() * 40,
      });
    }
    if (!raf) raf = requestAnimationFrame(tick);
  };
  function tick() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    pieces = pieces.filter((p) => p.life > 0);
    for (const p of pieces) {
      p.vy += p.g; p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.life--;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.globalAlpha = Math.max(0, Math.min(1, p.life / 40));
      ctx.fillStyle = p.c;
      ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 0.6);
      ctx.restore();
    }
    if (pieces.length) { raf = requestAnimationFrame(tick); }
    else { cancelAnimationFrame(raf); raf = null; ctx.clearRect(0, 0, canvas.width, canvas.height); }
  }
})();
