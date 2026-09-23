import { useEffect, useRef } from 'react';
import { HOUR_MS, segmentElapsedOf } from '../hooks/usePomodoro.js';

const HOUR_FLASH_DURATION = 900;
const SEG_FLASH_DURATION = 700;

function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function fmtClock(ms) {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function angleForTime(t) {
  const d = new Date(t);
  const minutes = d.getMinutes() + d.getSeconds() / 60 + d.getMilliseconds() / 60000;
  return -Math.PI / 2 + (minutes / 60) * Math.PI * 2;
}

export default function ClockCanvas({ pomodoro, audio, alarms }) {
  const canvasRef = useRef(null);
  const dimsRef = useRef({ CANVAS_SIZE: 500, CENTER: 250, R: 230 });

  // Keep the latest callbacks/refs available to the rAF loop without restarting it.
  const liveRef = useRef({});
  liveRef.current = { pomodoro, audio, alarms };

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    function setupCanvas() {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      const size = Math.max(200, Math.round(rect.width || 500));
      const CENTER = size / 2;
      const R = CENTER - size * 0.04;
      dimsRef.current = { CANVAS_SIZE: size, CENTER, R };
      canvas.width = size * dpr;
      canvas.height = size * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    setupCanvas();
    window.addEventListener('resize', setupCanvas);

    function drawHand(angle, len, width, color) {
      const { CENTER } = dimsRef.current;
      ctx.beginPath();
      ctx.moveTo(CENTER, CENTER);
      ctx.lineTo(CENTER + Math.cos(angle) * len, CENTER + Math.sin(angle) * len);
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.lineCap = 'round';
      ctx.stroke();
    }

    function drawSegmentReadout(now, e) {
      const { CENTER, R } = dimsRef.current;
      const s = R / 230;
      const cx = CENTER;
      const cy = CENTER + R * 0.42;

      let label, timeStr, color;
      if (e.status === 'idle') {
        label = 'READY';
        timeStr = fmtClock(20 * 60 * 1000);
        color = cssVar('--muted');
      } else {
        const remainMs = e.segmentDurationMs - segmentElapsedOf(e, now);
        timeStr = fmtClock(remainMs);
        label = (e.segmentType === 'work' ? 'WORK' : 'REST') + (e.status === 'paused' ? ' · PAUSED' : '');
        color = e.segmentType === 'work' ? cssVar('--work') : cssVar('--rest');
      }

      const smallFont = Math.max(8, Math.round(11 * s));
      const bigFont = Math.max(13, Math.round(22 * s));
      const padX = 24 * s;
      const boxHeight = 46 * s;
      const labelOffset = 12 * s;
      const timeOffset = 9 * s;

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `700 ${smallFont}px system-ui, sans-serif`;
      const labelWidth = ctx.measureText(label).width;
      ctx.font = `700 ${bigFont}px system-ui, sans-serif`;
      const timeWidth = ctx.measureText(timeStr).width;
      const boxWidth = Math.max(labelWidth, timeWidth) + padX;

      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(cx - boxWidth / 2, cy - boxHeight / 2, boxWidth, boxHeight, 10 * s);
      else ctx.rect(cx - boxWidth / 2, cy - boxHeight / 2, boxWidth, boxHeight);
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fill();

      ctx.font = `700 ${smallFont}px system-ui, sans-serif`;
      ctx.fillStyle = color;
      ctx.fillText(label, cx, cy - labelOffset);

      ctx.font = `700 ${bigFont}px system-ui, sans-serif`;
      ctx.fillStyle = cssVar('--text');
      ctx.fillText(timeStr, cx, cy + timeOffset);
    }

    function draw(now) {
      const { CANVAS_SIZE, CENTER, R } = dimsRef.current;
      const e = liveRef.current.pomodoro.engineRef.current;
      const s = R / 230;

      ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

      ctx.beginPath();
      ctx.arc(CENTER, CENTER, R, 0, Math.PI * 2);
      ctx.fillStyle = cssVar('--face');
      ctx.fill();
      ctx.lineWidth = Math.max(1, 3 * s);
      ctx.strokeStyle = cssVar('--border');
      ctx.stroke();

      if (e.status !== 'idle' && e.segmentStartWall != null) {
        const startAngle = angleForTime(e.segmentStartWall);
        const elapsed = segmentElapsedOf(e, now);
        const frac = e.segmentDurationMs > 0 ? elapsed / e.segmentDurationMs : 0;
        const fullSweep = (e.segmentDurationMs / HOUR_MS) * Math.PI * 2;
        const currentAngle = startAngle + fullSweep * frac;
        ctx.beginPath();
        ctx.moveTo(CENTER, CENTER);
        ctx.arc(CENTER, CENTER, R * 0.85, startAngle, currentAngle, false);
        ctx.closePath();
        ctx.fillStyle = e.segmentType === 'work' ? cssVar('--work-fill') : cssVar('--rest-fill');
        ctx.fill();
      }

      for (let i = 0; i < 60; i++) {
        const a = (i / 60) * Math.PI * 2 - Math.PI / 2;
        const major = i % 5 === 0;
        const inner = major ? R * 0.87 : R * 0.90;
        const outer = R * 0.97;
        ctx.beginPath();
        ctx.moveTo(CENTER + Math.cos(a) * inner, CENTER + Math.sin(a) * inner);
        ctx.lineTo(CENTER + Math.cos(a) * outer, CENTER + Math.sin(a) * outer);
        ctx.strokeStyle = major ? cssVar('--tick-major') : cssVar('--tick-minor');
        ctx.lineWidth = Math.max(0.5, (major ? 2 : 1) * s);
        ctx.stroke();
      }

      ctx.fillStyle = cssVar('--tick-major');
      ctx.font = `bold ${Math.max(9, Math.round(18 * s))}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (let h = 1; h <= 12; h++) {
        const a = (h / 12) * Math.PI * 2 - Math.PI / 2;
        const r = R * 0.72;
        ctx.fillText(h.toString(), CENTER + Math.cos(a) * r, CENTER + Math.sin(a) * r);
      }

      drawSegmentReadout(now, e);

      const d = new Date(now);
      const hourFrac = (d.getHours() % 12) + d.getMinutes() / 60;
      const minFrac = d.getMinutes() + d.getSeconds() / 60;
      const secFrac = d.getSeconds() + d.getMilliseconds() / 1000;

      const handColor = cssVar('--text');
      drawHand((hourFrac / 12) * Math.PI * 2 - Math.PI / 2, R * 0.42, Math.max(1.5, 6 * s), handColor);
      drawHand((minFrac / 60) * Math.PI * 2 - Math.PI / 2, R * 0.62, Math.max(1.2, 4 * s), handColor);
      drawHand((secFrac / 60) * Math.PI * 2 - Math.PI / 2, R * 0.75, Math.max(0.8, 2 * s), cssVar('--work'));

      ctx.beginPath();
      ctx.arc(CENTER, CENTER, Math.max(2.5, 6 * s), 0, Math.PI * 2);
      ctx.fillStyle = handColor;
      ctx.fill();

      if (e.segFlashStart != null) {
        const t = now - e.segFlashStart;
        if (t < SEG_FLASH_DURATION) {
          const alpha = 1 - t / SEG_FLASH_DURATION;
          const color = e.segFlashType === 'work' ? cssVar('--work')
            : e.segFlashType === 'rest' ? cssVar('--rest')
            : cssVar('--alarm');
          ctx.beginPath();
          ctx.arc(CENTER, CENTER, R + 6 * s, 0, Math.PI * 2);
          ctx.lineWidth = Math.max(2, 8 * s);
          ctx.strokeStyle = color;
          ctx.globalAlpha = alpha;
          ctx.stroke();
          ctx.globalAlpha = 1;
        } else {
          e.segFlashStart = null;
        }
      }

      if (e.hourFlashStart != null) {
        const t = now - e.hourFlashStart;
        if (t < HOUR_FLASH_DURATION) {
          const alpha = 1 - t / HOUR_FLASH_DURATION;
          ctx.beginPath();
          ctx.arc(CENTER, CENTER, R, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255,255,255,${alpha * 0.6})`;
          ctx.fill();
        } else {
          e.hourFlashStart = null;
        }
      }
    }

    let rafId;
    function loop() {
      const now = Date.now();
      const { pomodoro, audio, alarms } = liveRef.current;
      pomodoro.tick(now);
      alarms.checkAlarms(now);
      audio.tickIfSecondChanged(now);
      draw(now);
      rafId = requestAnimationFrame(loop);
    }
    rafId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', setupCanvas);
    };
  }, []);

  return <canvas ref={canvasRef} className="clock-canvas" />;
}
