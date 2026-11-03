import { useEffect, useRef } from 'react';

interface NetworkCanvasProps {
  intensity?: number; // 0-1: how active/bright the network is
  className?: string;
}

interface Node {
  x: number; y: number;
  vx: number; vy: number;
  radius: number;
  pulse: number; pulseSpeed: number;
}

interface Signal {
  from: number; to: number;
  progress: number; speed: number;
  trail: { x: number; y: number }[];
}

export function NetworkCanvas({ intensity = 0.3, className = '' }: NetworkCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const intensityRef = useRef(intensity);
  const stateRef = useRef({
    nodes: [] as Node[],
    edges: [] as [number, number][],
    signals: [] as Signal[],
    mouse: { x: -1000, y: -1000 },
    animId: 0,
    frameCount: 0,
    lastSignalTime: 0,
  });

  useEffect(() => { intensityRef.current = intensity; }, [intensity]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
    if (!ctx) return;
    const cvs = canvas as HTMLCanvasElement;
    const s = stateRef.current;

    const NODE_COUNT = 60;
    const MAX_DIST = 170;

    function getSize() {
      const el = cvs.parentElement || cvs;
      return { w: el.offsetWidth || window.innerWidth, h: el.offsetHeight || window.innerHeight };
    }

    function initNodes(w: number, h: number) {
      s.nodes = Array.from({ length: NODE_COUNT }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.22,
        vy: (Math.random() - 0.5) * 0.22,
        radius: Math.random() * 1.6 + 0.6,
        pulse: Math.random() * Math.PI * 2,
        pulseSpeed: Math.random() * 0.018 + 0.007,
      }));
      buildEdges();
    }

    function buildEdges() {
      s.edges = [];
      for (let i = 0; i < s.nodes.length; i++) {
        for (let j = i + 1; j < s.nodes.length; j++) {
          const dx = s.nodes[i].x - s.nodes[j].x;
          const dy = s.nodes[i].y - s.nodes[j].y;
          if (dx * dx + dy * dy < MAX_DIST * MAX_DIST) s.edges.push([i, j]);
        }
      }
    }

    function spawnSignal() {
      if (!s.edges.length) return;
      const edge = s.edges[Math.floor(Math.random() * s.edges.length)];
      const rev = Math.random() > 0.5;
      s.signals.push({
        from: rev ? edge[1] : edge[0],
        to: rev ? edge[0] : edge[1],
        progress: 0,
        speed: 0.003 + Math.random() * 0.005,
        trail: [],
      });
    }

    function resize() {
      const { w, h } = getSize();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      cvs.width = w * dpr;
      cvs.height = h * dpr;
      cvs.style.width = w + 'px';
      cvs.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      initNodes(w, h);
    }

    function draw(ts: number) {
      const iv = intensityRef.current;
      const { w, h } = getSize();

      ctx.clearRect(0, 0, w, h);
      s.frameCount++;

      // Update nodes
      s.nodes.forEach(n => {
        n.x += n.vx; n.y += n.vy;
        n.pulse += n.pulseSpeed;
        if (n.x < 0 || n.x > w) { n.vx *= -1; n.x = Math.max(0, Math.min(w, n.x)); }
        if (n.y < 0 || n.y > h) { n.vy *= -1; n.y = Math.max(0, Math.min(h, n.y)); }
        // Mouse repulsion (subtle)
        const mx = s.mouse.x, my = s.mouse.y;
        const dx = n.x - mx, dy = n.y - my;
        const d2 = dx * dx + dy * dy;
        if (d2 < 8000 && d2 > 1) {
          const d = Math.sqrt(d2);
          const force = (90 - d) / 90 * 0.4;
          n.vx += (dx / d) * force * 0.05;
          n.vy += (dy / d) * force * 0.05;
          n.vx *= 0.98; n.vy *= 0.98;
        }
      });

      if (s.frameCount % 80 === 0) buildEdges();

      // Spawn signals
      const spawnInterval = 500 / (iv + 0.05);
      if (ts - s.lastSignalTime > spawnInterval) {
        spawnSignal();
        if (iv > 0.5) spawnSignal();
        if (iv > 0.8) spawnSignal();
        s.lastSignalTime = ts;
      }

      // Draw edges
      s.edges.forEach(([i, j]) => {
        const a = s.nodes[i], b = s.nodes[j];
        const dx = a.x - b.x, dy = a.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > MAX_DIST) return;
        const alpha = (1 - dist / MAX_DIST) * 0.14 * iv;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
        ctx.strokeStyle = `rgba(201,168,76,${alpha})`;
        ctx.lineWidth = 0.6;
        ctx.stroke();
      });

      // Draw nodes
      s.nodes.forEach(n => {
        const p = 0.5 + 0.5 * Math.sin(n.pulse);
        const alpha = (0.2 + 0.18 * p) * iv;
        const r = n.radius * (1 + 0.35 * p);
        // Outer glow
        if (p > 0.7 && iv > 0.3) {
          const g = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, r * 4);
          g.addColorStop(0, `rgba(201,168,76,${alpha * 0.4})`);
          g.addColorStop(1, 'rgba(201,168,76,0)');
          ctx.beginPath(); ctx.arc(n.x, n.y, r * 4, 0, Math.PI * 2);
          ctx.fillStyle = g; ctx.fill();
        }
        ctx.beginPath(); ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(201,168,76,${alpha})`;
        ctx.fill();
      });

      // Draw signals
      s.signals = s.signals.filter(sig => {
        sig.progress += sig.speed * (0.5 + iv * 1.8);
        if (sig.progress >= 1) return false;
        const fn = s.nodes[sig.from], tn = s.nodes[sig.to];
        if (!fn || !tn) return false;
        const x = fn.x + (tn.x - fn.x) * sig.progress;
        const y = fn.y + (tn.y - fn.y) * sig.progress;

        sig.trail.push({ x, y });
        if (sig.trail.length > 8) sig.trail.shift();

        // Trail
        if (sig.trail.length > 1) {
          for (let i = 1; i < sig.trail.length; i++) {
            const ta = (i / sig.trail.length) * 0.35 * iv;
            ctx.beginPath();
            ctx.moveTo(sig.trail[i - 1].x, sig.trail[i - 1].y);
            ctx.lineTo(sig.trail[i].x, sig.trail[i].y);
            ctx.strokeStyle = `rgba(201,168,76,${ta})`;
            ctx.lineWidth = 1.5;
            ctx.stroke();
          }
        }

        // Glow
        const grad = ctx.createRadialGradient(x, y, 0, x, y, 10);
        grad.addColorStop(0, `rgba(255,225,140,${0.7 * iv})`);
        grad.addColorStop(0.4, `rgba(201,168,76,${0.3 * iv})`);
        grad.addColorStop(1, 'rgba(201,168,76,0)');
        ctx.beginPath(); ctx.arc(x, y, 10, 0, Math.PI * 2);
        ctx.fillStyle = grad; ctx.fill();

        ctx.beginPath(); ctx.arc(x, y, 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,240,180,${iv})`; ctx.fill();
        return true;
      });

      s.animId = requestAnimationFrame(draw);
    }

    const onMouse = (e: MouseEvent) => {
      const r = cvs.getBoundingClientRect();
      s.mouse = { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    const onLeave = () => { s.mouse = { x: -1000, y: -1000 }; };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(cvs.parentElement || document.body);
    window.addEventListener('mousemove', onMouse);
    window.addEventListener('mouseleave', onLeave);
    s.animId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(s.animId);
      ro.disconnect();
      window.removeEventListener('mousemove', onMouse);
      window.removeEventListener('mouseleave', onLeave);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ display: 'block', width: '100%', height: '100%' }}
    />
  );
}
