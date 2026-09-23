import { useState, useCallback, useRef } from 'react';
import ClockCanvas from './components/ClockCanvas.jsx';
import Banner from './components/Banner.jsx';
import Controls from './components/Controls.jsx';
import Drawer from './components/Drawer.jsx';
import { usePomodoro } from './hooks/usePomodoro.js';
import { useAudio } from './hooks/useAudio.js';
import { useAlarms } from './hooks/useAlarms.js';

export default function App() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [banner, setBanner] = useState({ text: '', type: '', visible: false });
  const bannerTimeoutRef = useRef(null);

  const audio = useAudio();

  const showBanner = useCallback((text, type) => {
    setBanner({ text, type, visible: true });
    clearTimeout(bannerTimeoutRef.current);
    bannerTimeoutRef.current = setTimeout(() => {
      setBanner((b) => ({ ...b, visible: false }));
    }, 1800);
  }, []);

  const handlePomodoroEvent = useCallback((event) => {
    if (event.type === 'segment') {
      const label = event.segmentType === 'work' ? 'Work' : 'Rest';
      showBanner(event.isTransition ? `Time's up — ${label}` : `${label} started`, event.segmentType);
      if (event.isTransition) audio.playChime();
    }
  }, [showBanner, audio]);

  const pomodoro = usePomodoro(handlePomodoroEvent);

  const handleAlarmFire = useCallback((alarm) => {
    pomodoro.triggerRingFlash('alarm');
    showBanner(`⏰ ${alarm.label || 'Alarm'}`, 'alarm');
    audio.playAlarmSound();
  }, [pomodoro, showBanner, audio]);

  const alarms = useAlarms(handleAlarmFire);

  return (
    <div className="app">
      <button className="hamburger" aria-label="Open menu" onClick={() => setDrawerOpen(true)}>☰</button>

      <div className="clock-col">
        <h1>Pomofucas Clock</h1>
        <div className="clock-wrap">
          <ClockCanvas pomodoro={pomodoro} audio={audio} alarms={alarms} />
          <Banner {...banner} />
        </div>
        <div className="legend">
          <span><i className="swatch" style={{ background: 'var(--work)' }} />Work (20m)</span>
          <span><i className="swatch" style={{ background: 'var(--rest)' }} />Rest (5m)</span>
        </div>
        <Controls
          status={pomodoro.uiState.status}
          onStart={pomodoro.start}
          onPause={pomodoro.pause}
          onResume={pomodoro.resume}
          onReset={pomodoro.reset}
          soundOn={audio.soundOn}
          onToggleSound={audio.toggleSound}
        />
      </div>

      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        uiState={pomodoro.uiState}
        hourLog={pomodoro.hourLog}
        alarms={alarms.alarms}
        onAddAlarm={alarms.addAlarm}
        onRemoveAlarm={alarms.removeAlarm}
        onToggleAlarm={alarms.toggleAlarm}
      />
    </div>
  );
}
