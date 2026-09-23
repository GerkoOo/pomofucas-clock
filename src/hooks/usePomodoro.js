import { useRef, useState, useCallback, useEffect } from 'react';

export const WORK_MS = 20 * 60 * 1000;
export const REST_MS = 5 * 60 * 1000;
export const HOUR_MS = 60 * 60 * 1000;

const HOURLOG_KEY = 'pomofucas-hourlog';

function loadHourLog() {
  try { return JSON.parse(localStorage.getItem(HOURLOG_KEY)) || []; }
  catch { return []; }
}
function saveHourLog(log) {
  localStorage.setItem(HOURLOG_KEY, JSON.stringify(log));
}

function makeEngine() {
  return {
    status: 'idle', // idle | running | paused
    segmentType: null,
    segmentStartWall: null,
    segmentDurationMs: 0,
    pauseDuringSegment: 0,
    pauseStartedAt: null,
    totalRunningMs: 0,
    nextHourThreshold: HOUR_MS,
    lastTick: null,
    segFlashStart: null,
    segFlashType: null,
    hourFlashStart: null,
  };
}

export function segmentElapsedOf(e, now) {
  if (e.segmentStartWall == null) return 0;
  let elapsed = now - e.segmentStartWall - e.pauseDuringSegment;
  if (e.pauseStartedAt) elapsed -= now - e.pauseStartedAt;
  return Math.max(0, Math.min(elapsed, e.segmentDurationMs));
}

function snapshot(e, now) {
  return {
    status: e.status,
    segmentType: e.segmentType,
    segmentDurationMs: e.segmentDurationMs,
    remainMs: e.segmentDurationMs - segmentElapsedOf(e, now),
    totalRunningMs: e.totalRunningMs,
    nextHourThreshold: e.nextHourThreshold,
  };
}

// onEvent({ type: 'segment', segmentType, isTransition }) fires on segment start/transition
// onEvent({ type: 'hour' }) fires whenever an hour of running time is logged
export function usePomodoro(onEvent) {
  const engineRef = useRef(makeEngine());
  const [hourLog, setHourLog] = useState(loadHourLog);
  const [uiState, setUiState] = useState(() => snapshot(engineRef.current, Date.now()));

  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  const startSegment = useCallback((type, wall) => {
    const e = engineRef.current;
    e.segmentType = type;
    e.segmentStartWall = wall;
    e.segmentDurationMs = type === 'work' ? WORK_MS : REST_MS;
    e.pauseDuringSegment = 0;
    e.pauseStartedAt = null;
  }, []);

  const start = useCallback(() => {
    const e = engineRef.current;
    if (e.status !== 'idle') return;
    const now = Date.now();
    e.status = 'running';
    e.totalRunningMs = 0;
    e.nextHourThreshold = HOUR_MS;
    e.lastTick = now;
    startSegment('work', now);
    e.segFlashStart = now;
    e.segFlashType = 'work';
    onEventRef.current?.({ type: 'segment', segmentType: 'work', isTransition: false });
    setUiState(snapshot(e, now));
  }, [startSegment]);

  const pause = useCallback(() => {
    const e = engineRef.current;
    if (e.status !== 'running') return;
    e.status = 'paused';
    e.pauseStartedAt = Date.now();
    setUiState(snapshot(e, Date.now()));
  }, []);

  const resume = useCallback(() => {
    const e = engineRef.current;
    if (e.status !== 'paused') return;
    const now = Date.now();
    e.pauseDuringSegment += now - e.pauseStartedAt;
    e.pauseStartedAt = null;
    e.status = 'running';
    e.lastTick = now;
    setUiState(snapshot(e, now));
  }, []);

  const reset = useCallback(() => {
    const e = engineRef.current;
    e.status = 'idle';
    e.segmentType = null;
    e.segmentStartWall = null;
    e.segmentDurationMs = 0;
    e.pauseDuringSegment = 0;
    e.pauseStartedAt = null;
    e.totalRunningMs = 0;
    e.nextHourThreshold = HOUR_MS;
    setUiState(snapshot(e, Date.now()));
  }, []);

  // Called every animation frame from ClockCanvas's own loop.
  const tick = useCallback((now) => {
    const e = engineRef.current;
    if (e.status === 'running') {
      const delta = now - (e.lastTick || now);
      e.totalRunningMs += delta;
      while (e.totalRunningMs >= e.nextHourThreshold) {
        e.hourFlashStart = now;
        setHourLog((prev) => {
          const next = [...prev, now];
          saveHourLog(next);
          return next;
        });
        onEventRef.current?.({ type: 'hour' });
        e.nextHourThreshold += HOUR_MS;
      }
      const elapsed = segmentElapsedOf(e, now);
      if (elapsed >= e.segmentDurationMs) {
        const nextType = e.segmentType === 'work' ? 'rest' : 'work';
        startSegment(nextType, now);
        e.segFlashStart = now;
        e.segFlashType = nextType;
        onEventRef.current?.({ type: 'segment', segmentType: nextType, isTransition: true });
      }
    }
    e.lastTick = now;
  }, [startSegment]);

  const triggerRingFlash = useCallback((type) => {
    const e = engineRef.current;
    e.segFlashStart = Date.now();
    e.segFlashType = type;
  }, []);

  // Refresh the low-frequency UI snapshot (drawer text) once a second.
  useEffect(() => {
    const id = setInterval(() => {
      setUiState(snapshot(engineRef.current, Date.now()));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  return {
    engineRef,
    hourLog,
    uiState,
    start,
    pause,
    resume,
    reset,
    tick,
    triggerRingFlash,
    segmentElapsed: (now) => segmentElapsedOf(engineRef.current, now),
  };
}
