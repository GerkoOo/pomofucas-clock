import { useState, useEffect } from 'react';

function fmt(ms) {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function Drawer({ open, onClose, uiState, hourLog, alarms, onAddAlarm, onRemoveAlarm, onToggleAlarm }) {
  const [now, setNow] = useState(Date.now());
  const [alarmTime, setAlarmTime] = useState('');
  const [alarmLabel, setAlarmLabel] = useState('');

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const segLabel = uiState.status === 'idle' ? 'Idle' : uiState.segmentType === 'work' ? 'Work' : 'Rest';
  const segRemain = uiState.status === 'idle'
    ? '--:--'
    : fmt(uiState.remainMs) + (uiState.status === 'paused' ? ' (paused)' : '');

  return (
    <>
      <div className={`drawer-backdrop ${open ? 'open' : ''}`} onClick={onClose} />
      <div className={`panel ${open ? 'open' : ''}`}>
        <button className="drawer-close" aria-label="Close menu" onClick={onClose}>×</button>

        <div className="stat"><span className="label">Wall clock</span><span className="value">{new Date(now).toLocaleTimeString()}</span></div>
        <div className="stat"><span className="label">Segment</span><span className={`value ${uiState.status !== 'idle' ? uiState.segmentType : ''}`}>{segLabel}</span></div>
        <div className="stat"><span className="label">Time left in segment</span><span className="value">{segRemain}</span></div>
        <div className="stat"><span className="label">Total running time</span><span className="value">{fmt(uiState.totalRunningMs)}</span></div>
        <div className="stat"><span className="label">Next hour mark in</span><span className="value">{fmt(uiState.nextHourThreshold - uiState.totalRunningMs)}</span></div>
        <div className="stat"><span className="label">Hours logged</span><span className="value">{hourLog.length}</span></div>

        <div className="log-title">Alarms &amp; reminders</div>
        <div className="alarm-add">
          <input type="time" value={alarmTime} onChange={(e) => setAlarmTime(e.target.value)} />
          <input
            type="text"
            placeholder="Reminder text (optional)"
            value={alarmLabel}
            onChange={(e) => setAlarmLabel(e.target.value)}
          />
          <button onClick={() => { onAddAlarm(alarmTime, alarmLabel); setAlarmLabel(''); }}>Add</button>
        </div>
        <ul className="alarm-list">
          {alarms.slice().sort((a, b) => a.time.localeCompare(b.time)).map((a) => (
            <li key={a.id} className={a.enabled ? '' : 'disabled'}>
              <label>
                <input
                  type="checkbox"
                  checked={a.enabled}
                  onChange={(e) => onToggleAlarm(a.id, e.target.checked)}
                />
                <span>{a.time} — {a.label || 'Alarm'}</span>
              </label>
              <button className="alarm-del" title="Remove" onClick={() => onRemoveAlarm(a.id)}>×</button>
            </li>
          ))}
        </ul>

        <div className="log-title">Hour scoreboard</div>
        <ul id="hourlog">
          {hourLog.slice().reverse().map((ts) => (
            <li key={ts}>{new Date(ts).toLocaleString()}</li>
          ))}
        </ul>
      </div>
    </>
  );
}
