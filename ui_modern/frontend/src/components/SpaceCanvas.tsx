import React, { useEffect, useRef } from 'react';

interface Star {
  x: number;
  y: number;
  size: number;
  baseAlpha: number;
  alpha: number;
  twinkleSpeed: number;
  twinkleOffset: number;
  color: string;
}

interface Meteor {
  x: number;
  y: number;
  length: number;
  speed: number;
  angle: number;
  thickness: number;
  alpha: number;
  color: string;
  headColor: string;
  tailColor: string;
}

export const SpaceCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = 0;
    let height = 0;

    const stars: Star[] = [];
    const meteors: Meteor[] = [];

    const STAR_COUNT = 180;
    const STAR_COLORS = ['#ffffff', '#e0f2fe', '#ddd6fe', '#c7d2fe', '#bae6fd'];
    const METEOR_COLORS = [
      { head: '#ffffff', tail: 'rgba(56, 189, 248, 0)' },
      { head: '#f0f9ff', tail: 'rgba(139, 92, 246, 0)' },
      { head: '#ffffff', tail: 'rgba(16, 185, 129, 0)' },
    ];

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.scale(dpr, dpr);
      initStars();
    };

    const initStars = () => {
      stars.length = 0;
      for (let i = 0; i < STAR_COUNT; i++) {
        const size = Math.random() < 0.8 ? Math.random() * 1.2 + 0.4 : Math.random() * 1.8 + 1.2;
        const baseAlpha = Math.random() * 0.6 + 0.2;
        stars.push({
          x: Math.random() * width,
          y: Math.random() * height,
          size,
          baseAlpha,
          alpha: baseAlpha,
          twinkleSpeed: Math.random() * 0.02 + 0.005,
          twinkleOffset: Math.random() * Math.PI * 2,
          color: STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)],
        });
      }
    };

    const spawnMeteor = () => {
      // Spawn meteors from top or top-left
      const angle = (Math.PI / 180) * (35 + Math.random() * 15); // ~35-50 degrees
      const startX = Math.random() * (width * 1.2) - width * 0.2;
      const startY = Math.random() * (height * 0.4) - 100;
      const palette = METEOR_COLORS[Math.floor(Math.random() * METEOR_COLORS.length)];

      meteors.push({
        x: startX,
        y: startY,
        length: Math.random() * 140 + 80,
        speed: Math.random() * 9 + 11,
        angle,
        thickness: Math.random() * 1.5 + 1.2,
        alpha: 1,
        color: palette.head,
        headColor: palette.head,
        tailColor: palette.tail,
      });
    };

    let nextMeteorTime = Date.now() + 2000;

    const render = () => {

      // Deep space base clear
      ctx.clearRect(0, 0, width, height);

      // Pure cosmic pitch black base
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, width, height);

      // Ambient celestial nebulae
      // Nebula 1: Top-left cyan/sky glow
      const neb1 = ctx.createRadialGradient(width * 0.15, height * 0.1, 0, width * 0.15, height * 0.1, width * 0.45);
      neb1.addColorStop(0, 'rgba(6, 182, 212, 0.08)');
      neb1.addColorStop(0.6, 'rgba(14, 116, 144, 0.02)');
      neb1.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = neb1;
      ctx.fillRect(0, 0, width, height);

      // Nebula 2: Center-right violet/purple glow
      const neb2 = ctx.createRadialGradient(width * 0.85, height * 0.35, 0, width * 0.85, height * 0.35, width * 0.5);
      neb2.addColorStop(0, 'rgba(139, 92, 246, 0.08)');
      neb2.addColorStop(0.6, 'rgba(109, 40, 217, 0.02)');
      neb2.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = neb2;
      ctx.fillRect(0, 0, width, height);

      // Nebula 3: Subtle emerald dust
      const neb3 = ctx.createRadialGradient(width * 0.5, height * 0.8, 0, width * 0.5, height * 0.8, width * 0.4);
      neb3.addColorStop(0, 'rgba(16, 185, 129, 0.04)');
      neb3.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = neb3;
      ctx.fillRect(0, 0, width, height);

      // Render & twinkle stars
      for (const star of stars) {
        star.twinkleOffset += star.twinkleSpeed;
        const currentAlpha = Math.max(0.1, Math.min(1, star.baseAlpha + Math.sin(star.twinkleOffset) * 0.35));

        ctx.fillStyle = star.color;
        ctx.globalAlpha = currentAlpha;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();

        // Subtle cross flare for larger stars
        if (star.size > 1.8 && currentAlpha > 0.7) {
          ctx.strokeStyle = star.color;
          ctx.lineWidth = 0.5;
          ctx.globalAlpha = (currentAlpha - 0.7) * 0.8;
          ctx.beginPath();
          ctx.moveTo(star.x - star.size * 2.5, star.y);
          ctx.lineTo(star.x + star.size * 2.5, star.y);
          ctx.moveTo(star.x, star.y - star.size * 2.5);
          ctx.lineTo(star.x, star.y + star.size * 2.5);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;

      // Spawn meteors periodically (every 2.5 - 6.5 seconds)
      const now = Date.now();
      if (now > nextMeteorTime) {
        spawnMeteor();
        nextMeteorTime = now + (Math.random() * 4000 + 2500);
      }

      // Update & render meteors
      for (let i = meteors.length - 1; i >= 0; i--) {
        const m = meteors[i];
        m.x += Math.cos(m.angle) * m.speed;
        m.y += Math.sin(m.angle) * m.speed;

        // Tail endpoint
        const tailX = m.x - Math.cos(m.angle) * m.length;
        const tailY = m.y - Math.sin(m.angle) * m.length;

        // Meteor gradient trail
        const grad = ctx.createLinearGradient(tailX, tailY, m.x, m.y);
        grad.addColorStop(0, 'rgba(255, 255, 255, 0)');
        grad.addColorStop(0.7, 'rgba(224, 242, 254, 0.4)');
        grad.addColorStop(1, m.headColor);

        ctx.strokeStyle = grad;
        ctx.lineWidth = m.thickness;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(m.x, m.y);
        ctx.stroke();

        // Meteor glowing head
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.thickness * 1.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0; // reset shadow

        // Remove meteor once off-screen
        if (m.x > width + 200 || m.y > height + 200) {
          meteors.splice(i, 1);
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    window.addEventListener('resize', resize);
    resize();

    // Pause animation when tab is not visible to preserve GPU/CPU cycles
    const handleVisibilityChange = () => {
      if (document.hidden) {
        cancelAnimationFrame(animationFrameId);
      } else {
        animationFrameId = requestAnimationFrame(render);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    animationFrameId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      aria-hidden="true"
    />
  );
};
