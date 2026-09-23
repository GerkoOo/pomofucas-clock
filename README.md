# Pomofucas Clock

A Pomodoro-style timer (20 min work / 5 min rest, repeating) that maps its
cycle onto a literal analog clock face instead of an abstract progress bar.
The work/rest wedge is anchored to real wall-clock minute positions — start
work at :07 and the wedge spans the 7→27 marks on the dial — and grows live
as the segment runs. Includes an independent hourly scoreboard (persisted
across restarts), alarms/reminders, and tick/chime sounds.

Built with Electron + React + Vite.

## Development

```
npm install
npm run dev
```

## Building an installable app (Linux)

```
npm install
npm run dist
```

Produces an AppImage and a `.deb` in `release/`.
