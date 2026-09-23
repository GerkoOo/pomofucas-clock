import { useState, useCallback, useRef } from 'react';

const ALARM_KEY = 'pomofucas-alarms';

function loadAlarms() {
  try { return JSON.parse(localStorage.getItem(ALARM_KEY)) || []; }
  catch { return []; }
}
function saveAlarms(alarms) {
  localStorage.setItem(ALARM_KEY, JSON.stringify(alarms));
}

// onFire(alarm) fires the moment an enabled alarm's time matches the wall clock (once per day).
export function useAlarms(onFire) {
  const [alarms, setAlarms] = useState(loadAlarms);
  const onFireRef = useRef(onFire);
  onFireRef.current = onFire;

  const addAlarm = useCallback((time, label) => {
    if (!time) return;
    setAlarms((prev) => {
      const next = [...prev, {
        id: Date.now() + '-' + Math.random().toString(36).slice(2),
        time,
        label: (label || '').trim(),
        enabled: true,
        lastFired: null,
      }];
      saveAlarms(next);
      return next;
    });
  }, []);

  const removeAlarm = useCallback((id) => {
    setAlarms((prev) => {
      const next = prev.filter((a) => a.id !== id);
      saveAlarms(next);
      return next;
    });
  }, []);

  const toggleAlarm = useCallback((id, enabled) => {
    setAlarms((prev) => {
      const next = prev.map((a) => (a.id === id ? { ...a, enabled } : a));
      saveAlarms(next);
      return next;
    });
  }, []);

  // Called every animation frame from ClockCanvas's own loop.
  const checkAlarms = useCallback((now) => {
    const d = new Date(now);
    const hhmm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    setAlarms((prev) => {
      let changed = false;
      const next = prev.map((a) => {
        if (a.enabled && a.time === hhmm && a.lastFired !== today) {
          changed = true;
          onFireRef.current?.(a);
          return { ...a, lastFired: today };
        }
        return a;
      });
      if (!changed) return prev;
      saveAlarms(next);
      return next;
    });
  }, []);

  return { alarms, addAlarm, removeAlarm, toggleAlarm, checkAlarms };
}
