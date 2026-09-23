import { useRef, useState, useCallback } from 'react';

export function useAudio() {
  const audioCtxRef = useRef(null);
  const [soundOn, setSoundOn] = useState(false);
  const soundOnRef = useRef(soundOn);
  soundOnRef.current = soundOn;
  const lastTickSecondRef = useRef(null);

  const toggleSound = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtxRef.current.state === 'suspended') audioCtxRef.current.resume();
    setSoundOn((v) => !v);
  }, []);

  const playTick = useCallback((isTock) => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = isTock ? 780 : 1000;
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(0.2, t0 + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.04);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + 0.05);
  }, []);

  const playChime = useCallback(() => {
    const ctx = audioCtxRef.current;
    if (!ctx || !soundOnRef.current) return;
    [880, 1108, 1318].forEach((f, i) => {
      const t0 = ctx.currentTime + i * 0.12;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = f;
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(0.25, t0 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + 0.4);
    });
  }, []);

  const playAlarmSound = useCallback(() => {
    const ctx = audioCtxRef.current;
    if (!ctx || !soundOnRef.current) return;
    for (let i = 0; i < 4; i++) {
      const t0 = ctx.currentTime + i * 0.3;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.value = 1046;
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(0.25, t0 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + 0.2);
    }
  }, []);

  // Called every animation frame; plays a real clock tick-tock once per wall-clock second.
  const tickIfSecondChanged = useCallback((now) => {
    if (!soundOnRef.current) return;
    const currentSecond = Math.floor(now / 1000);
    if (currentSecond !== lastTickSecondRef.current) {
      playTick(currentSecond % 2 === 0);
      lastTickSecondRef.current = currentSecond;
    }
  }, [playTick]);

  return { soundOn, toggleSound, playChime, playAlarmSound, tickIfSecondChanged };
}
