/**
 * CyberCanvas — GPU-friendly canvas rendering for:
 * - Network nodes (dots) with connecting lines
 * - Binary data streams
 * - Circuit-board pathways
 * All rendering is purely canvas-based, no DOM mutation,
 * respects prefers-reduced-motion.
 */
import React, { useEffect, useRef } from 'react';

interface CyberCanvasProps {
  className?: string;
  style?: React.CSSProperties;
  nodeCount?: number;
  variant?: 'nodes' | 'circuit' | 'binary';
}

interface Node {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  color: string;
}

const COLORS = [
  'rgba(59,130,246,',   // electric blue
  'rgba(14,165,233,',   // cyan
  'rgba(124,58,237,',   // violet
  'rgba(99,102,241,',   // indigo
];

export const CyberCanvas: React.FC<CyberCanvasProps> = ({
  className,
  style,
  nodeCount = 28,
  variant = 'nodes',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Respect reduced-motion
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let animId: number;
    let nodes: Node[] = [];
    let binaryChars: { x: number; y: number; char: string; alpha: number; speed: number; color: string }[] = [];
    let circuitPaths: { points: { x: number; y: number }[]; progress: number; color: string; alpha: number }[] = [];

    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      init();
    };

    const w = () => canvas.offsetWidth;
    const h = () => canvas.offsetHeight;

    const rnd = (min: number, max: number) => Math.random() * (max - min) + min;
    const pickColor = () => COLORS[Math.floor(Math.random() * COLORS.length)];

    const init = () => {
      nodes = Array.from({ length: nodeCount }, () => ({
        x: rnd(0, w()),
        y: rnd(0, h()),
        vx: rnd(-0.18, 0.18),
        vy: rnd(-0.18, 0.18),
        size: rnd(1.5, 3.5),
        opacity: rnd(0.3, 0.7),
        color: pickColor(),
      }));

      // Binary streams — column positions
      const cols = Math.floor(w() / 22);
      binaryChars = Array.from({ length: cols }, (_, i) => ({
        x: i * 22 + 11,
        y: rnd(0, h()),
        char: Math.random() > 0.5 ? '1' : '0',
        alpha: rnd(0.04, 0.12),
        speed: rnd(0.3, 1.2),
        color: pickColor(),
      }));

      // Circuit paths
      circuitPaths = Array.from({ length: 5 }, () => {
        const pts: { x: number; y: number }[] = [{ x: rnd(0, w()), y: rnd(0, h()) }];
        for (let i = 0; i < 4; i++) {
          const last = pts[pts.length - 1];
          pts.push({
            x: last.x + rnd(-120, 120),
            y: last.y + rnd(-80, 80),
          });
        }
        return { points: pts, progress: rnd(0, 1), color: pickColor(), alpha: rnd(0.06, 0.14) };
      });
    };

    const drawNodes = (t: number) => {
      const cw = w(), ch = h();
      ctx.clearRect(0, 0, cw, ch);

      // Connection lines
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 140) {
            const alpha = ((1 - dist / 140) * 0.12).toFixed(3);
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.strokeStyle = `rgba(59,130,246,${alpha})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      }

      // Nodes
      nodes.forEach((n) => {
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < 0 || n.x > cw) n.vx *= -1;
        if (n.y < 0 || n.y > ch) n.vy *= -1;

        const pulse = 0.5 + 0.5 * Math.sin(t * 0.002 + n.x);
        const r = n.size + pulse * 0.8;

        // glow
        const grad = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, r * 4);
        grad.addColorStop(0, n.color + (n.opacity * 0.7).toFixed(2) + ')');
        grad.addColorStop(1, n.color + '0)');
        ctx.beginPath();
        ctx.arc(n.x, n.y, r * 4, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        // core dot
        ctx.beginPath();
        ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
        ctx.fillStyle = n.color + n.opacity.toFixed(2) + ')';
        ctx.fill();
      });
    };

    const drawBinary = (t: number) => {
      const cw = w(), ch = h();
      ctx.clearRect(0, 0, cw, ch);
      ctx.font = '11px "Courier New", monospace';

      binaryChars.forEach((c) => {
        if (Math.random() < 0.015) c.char = Math.random() > 0.5 ? '1' : '0';
        c.y += c.speed;
        if (c.y > ch + 20) c.y = -20;

        ctx.fillStyle = c.color + c.alpha + ')';
        ctx.fillText(c.char, c.x, c.y);
      });

      // Also render some nodes for depth
      nodes.forEach((n) => {
        n.x += n.vx * 0.4;
        n.y += n.vy * 0.4;
        if (n.x < 0 || n.x > cw) n.vx *= -1;
        if (n.y < 0 || n.y > ch) n.vy *= -1;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.size * 0.7, 0, Math.PI * 2);
        ctx.fillStyle = n.color + (n.opacity * 0.25).toFixed(2) + ')';
        ctx.fill();
      });
    };

    const drawCircuit = (t: number) => {
      const cw = w(), ch = h();
      ctx.clearRect(0, 0, cw, ch);

      circuitPaths.forEach((path) => {
        path.progress += 0.0008;
        if (path.progress > 1) {
          path.progress = 0;
          // Regenerate path
          path.points = [{ x: rnd(0, cw), y: rnd(0, ch) }];
          for (let i = 0; i < 4; i++) {
            const last = path.points[path.points.length - 1];
            path.points.push({
              x: Math.max(0, Math.min(cw, last.x + rnd(-120, 120))),
              y: Math.max(0, Math.min(ch, last.y + rnd(-80, 80))),
            });
          }
        }

        const pts = path.points;
        ctx.save();
        ctx.globalAlpha = path.alpha;
        ctx.strokeStyle = path.color + '0.7)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 8]);
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) {
          // Right-angle circuit paths
          ctx.lineTo(pts[i].x, pts[i - 1].y);
          ctx.lineTo(pts[i].x, pts[i].y);
        }
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();

        // Traveling dot along path
        const totalLen = pts.length - 1;
        const pos = path.progress * totalLen;
        const seg = Math.floor(pos);
        const segFrac = pos - seg;
        if (seg < pts.length - 1) {
          const from = pts[seg];
          const to = pts[seg + 1];
          // right-angle: first go horizontally then vertically
          const midX = to.x;
          const midY = from.y;
          let dotX: number, dotY: number;
          if (segFrac < 0.5) {
            dotX = from.x + (midX - from.x) * (segFrac * 2);
            dotY = from.y;
          } else {
            dotX = midX;
            dotY = midY + (to.y - midY) * ((segFrac - 0.5) * 2);
          }

          const grad = ctx.createRadialGradient(dotX, dotY, 0, dotX, dotY, 10);
          grad.addColorStop(0, path.color + '0.9)');
          grad.addColorStop(1, path.color + '0)');
          ctx.beginPath();
          ctx.arc(dotX, dotY, 10, 0, Math.PI * 2);
          ctx.fillStyle = grad;
          ctx.fill();

          ctx.beginPath();
          ctx.arc(dotX, dotY, 2.5, 0, Math.PI * 2);
          ctx.fillStyle = path.color + '1)';
          ctx.fill();
        }
      });

      // Node overlay
      nodes.forEach((n) => {
        n.x += n.vx * 0.3;
        n.y += n.vy * 0.3;
        if (n.x < 0 || n.x > cw) n.vx *= -1;
        if (n.y < 0 || n.y > ch) n.vy *= -1;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.size * 0.8, 0, Math.PI * 2);
        ctx.fillStyle = n.color + (n.opacity * 0.3).toFixed(2) + ')';
        ctx.fill();
      });
    };

    const tick = (t: number) => {
      if (variant === 'nodes') drawNodes(t);
      else if (variant === 'binary') drawBinary(t);
      else drawCircuit(t);
      animId = requestAnimationFrame(tick);
    };

    if (prefersReduced) {
      // Static one-frame render
      resize();
      if (variant === 'nodes') drawNodes(0);
      else if (variant === 'binary') drawBinary(0);
      else drawCircuit(0);
      return;
    }

    resize();
    window.addEventListener('resize', resize);
    animId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, [nodeCount, variant]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
        ...style,
      }}
      aria-hidden="true"
    />
  );
};
