export default function Controls({ status, onStart, onPause, onResume, onReset, soundOn, onToggleSound }) {
  return (
    <div className="controls">
      {status === 'idle' && (
        <button className="primary" onClick={onStart}>Start</button>
      )}
      {status === 'running' && (
        <button onClick={onPause}>Pause</button>
      )}
      {status === 'paused' && (
        <button className="primary" onClick={onResume}>Resume</button>
      )}
      <button onClick={onReset} disabled={status === 'idle'}>Reset</button>
      <button onClick={onToggleSound}>
        {soundOn ? '🔊 Sound: On' : '🔇 Sound: Off'}
      </button>
    </div>
  );
}
