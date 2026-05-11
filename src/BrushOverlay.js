import { useEffect, useRef } from "react";

// Vibrant hue zones that avoid the orange-red band (~15–55°) where browns
// emerge at lower sat/lightness. Within these zones, anything goes.
const HUE_ZONES = [
  [0, 15],    // red
  [55, 90],   // yellow
  [90, 170],  // green
  [170, 240], // cyan-blue
  [240, 300], // purple-violet
  [300, 360], // pink-magenta
];

function pickHue() {
  const zone = HUE_ZONES[Math.floor(Math.random() * HUE_ZONES.length)];
  return zone[0] + Math.random() * (zone[1] - zone[0]);
}

function randomGradientColors() {
  // Two independent hue picks → effectively infinite pair combinations,
  // all guaranteed to be bright neon-style at full saturation + mid-high
  // lightness so neither endpoints nor RGB midpoints read as muddy.
  const h1 = pickHue();
  const h2 = pickHue();
  const s1 = 96 + Math.random() * 4;
  const s2 = 96 + Math.random() * 4;
  const l1 = 58 + Math.random() * 10;
  const l2 = 58 + Math.random() * 10;
  return [`hsl(${h1}, ${s1}%, ${l1}%)`, `hsl(${h2}, ${s2}%, ${l2}%)`];
}

export default function BrushOverlay() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      const snap = document.createElement("canvas");
      snap.width = canvas.width;
      snap.height = canvas.height;
      if (canvas.width > 0 && canvas.height > 0) {
        snap.getContext("2d").drawImage(canvas, 0, 0);
      }
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = window.innerWidth + "px";
      canvas.style.height = window.innerHeight + "px";
      if (snap.width > 0 && snap.height > 0) {
        ctx.drawImage(snap, 0, 0);
      }
    };
    resize();

    let drawing = false;
    let lastX = 0, lastY = 0;
    let lastCssX = 0, lastCssY = 0;
    let lastT = 0;
    let lastWidth = 44 * dpr;
    let strokeColors = ["#ffffff", "#ffffff"];

    const start = (cx, cy) => {
      drawing = true;
      strokeColors = randomGradientColors();
      lastCssX = cx;
      lastCssY = cy;
      lastX = cx * dpr;
      lastY = cy * dpr;
      lastT = performance.now();
      lastWidth = 18 * dpr;
    };

    const drawBristleSegment = (x0, y0, x1, y1, w0, w1) => {
      const dx = x1 - x0;
      const dy = y1 - y0;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len < 0.5) return;
      const nx = -dy / len;
      const ny = dx / len;
      const wAvg = (w0 + w1) * 0.5;

      // One canvas-spanning gradient reused for spine + bristles + spatter
      const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      grad.addColorStop(0, strokeColors[0]);
      grad.addColorStop(1, strokeColors[1]);

      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      // Solid central spine — full opacity for clean difference-blend over
      // mid-tone elements like the rabbit sprite
      ctx.globalAlpha = 1.0;
      ctx.lineWidth = wAvg * 0.62;
      ctx.strokeStyle = grad;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();

      // Bristles
      for (let i = 0; i < 6; i++) {
        const offset = (Math.random() - 0.5) * wAvg * 0.95;
        const ox = nx * offset;
        const oy = ny * offset;
        ctx.globalAlpha = 0.18 + Math.random() * 0.5;
        ctx.lineWidth = 0.7 + Math.random() * 1.6;
        ctx.beginPath();
        ctx.moveTo(x0 + ox, y0 + oy);
        ctx.lineTo(x1 + ox, y1 + oy);
        ctx.stroke();
      }

      // Spatter dots
      ctx.fillStyle = grad;
      const numDots = Math.max(2, Math.floor(len * 0.32));
      for (let i = 0; i < numDots; i++) {
        const t = Math.random();
        const radial = (Math.random() - 0.5) * wAvg * 1.05;
        const px = x0 + dx * t + nx * radial;
        const py = y0 + dy * t + ny * radial;
        const r = 0.4 + Math.random() * 1.3;
        ctx.globalAlpha = 0.1 + Math.random() * 0.35;
        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = 1;
    };

    const move = (cx, cy) => {
      if (!drawing) return;
      const t = performance.now();
      const dt = Math.max(t - lastT, 1);
      const dxCss = cx - lastCssX;
      const dyCss = cy - lastCssY;
      const distCss = Math.sqrt(dxCss * dxCss + dyCss * dyCss);
      const speed = distCss / dt;

      const targetW = Math.max(22, 70 - speed * 90) * dpr;
      const width = lastWidth * 0.6 + targetW * 0.4;

      const x = cx * dpr;
      const y = cy * dpr;
      drawBristleSegment(lastX, lastY, x, y, lastWidth, width);

      lastCssX = cx;
      lastCssY = cy;
      lastX = x;
      lastY = y;
      lastT = t;
      lastWidth = width;
    };

    const end = () => {
      drawing = false;
    };

    let rafId;
    const tick = () => {
      ctx.save();
      ctx.globalCompositeOperation = "destination-out";
      ctx.fillStyle = "rgba(0, 0, 0, 0.015)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.restore();
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);

    const onMouseDown = (e) => start(e.clientX, e.clientY);
    const onMouseMove = (e) => move(e.clientX, e.clientY);
    const onMouseUp = () => end();

    // Single-finger touches do both: native scroll AND draw at the finger
    // position. The brush canvas has pointer-events:none so taps still reach
    // links/buttons underneath.
    const onTouchStart = (e) => {
      const t = e.touches[0];
      if (!t) return;
      start(t.clientX, t.clientY);
    };
    const onTouchMove = (e) => {
      const t = e.touches[0];
      if (!t) return;
      move(t.clientX, t.clientY);
      // No preventDefault — let the browser scroll the page normally.
    };
    const onTouchEnd = () => end();

    window.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd);
    window.addEventListener("resize", resize);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        pointerEvents: "none",
        mixBlendMode: "difference",
      }}
    />
  );
}
