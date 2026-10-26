// Optional playtest logger (brief section 8). Opt-in: only with ?log (or
// ?dev) in the URL; it shows nothing on screen and never sends data
// anywhere. It records, in this browser's localStorage only, when each key
// event first happens, in seconds from the player's first touch of the mouse
// on the stage. Kiwi copies the log from the dev panel into PLAYTESTS.md.

const KEY = 'aop-playtest-log';
const MAX_SESSIONS = 20;

export function isLogging(search = window.location.search) {
  const params = new URLSearchParams(search);
  return params.has('log') || params.has('dev');
}

export function loadPlaytestLogs() {
  try {
    return JSON.parse(window.localStorage.getItem(KEY)) ?? [];
  } catch {
    return [];
  }
}

function save(sessions) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(sessions.slice(-MAX_SESSIONS)));
  } catch {
    /* storage unavailable (a private window): the log is simply not kept */
  }
}

export function createPlaytestLog({ game, canvas }) {
  const session = { started: new Date().toISOString(), events: [] };
  const sessions = [...loadPlaytestLogs(), session];
  const seen = new Set();
  let t0 = null;
  let lastPlan = null;
  let locks = 0;
  let resetting = false;
  let resets = 0;

  // Records an event the first time it happens (a detail makes it distinct).
  function mark(event, detail = null) {
    const key = `${event}|${detail}`;
    if (t0 === null || seen.has(key)) return;
    seen.add(key);
    session.events.push({ event, detail, seconds: +((performance.now() - t0) / 1000).toFixed(1) });
    save(sessions);
  }

  const touch = () => {
    if (t0 !== null) return;
    t0 = performance.now();
    mark('first touch');
  };
  canvas.addEventListener('pointermove', touch);
  canvas.addEventListener('pointerdown', touch);

  return {
    session,
    // Once per frame: looks for first occurrences in the game state.
    update() {
      if (t0 === null) return;
      if (game.held) mark(game.held.decoy ? 'first decoy held' : 'first hold');
      if (game.lastPlan && game.lastPlan !== lastPlan) {
        lastPlan = game.lastPlan;
        mark(lastPlan.kind === 'throw' ? 'first throw' : 'first drop');
      }
      if (game.letters.some((l) => l.status === 'stuck')) mark('first stick');
      if (game.lastContact?.knocked) mark('first knock-out');
      const info = Object.values(game.resolution.letters);
      if (info.some((l) => l.warmth > 0)) mark('first warm pair');
      if (info.some((l) => l.pulled)) mark('first pull');
      if (game.lockedWords.length > locks) mark('word locked', game.lockedWords[game.lockedWords.length - 1].word);
      locks = game.lockedWords.length; // drops back to 0 in a new round
      if (game.finaleProgress > 0) mark('finale');
      if (game.resetting && !resetting) mark('reset', `${++resets} (${game.resetting.reason})`);
      resetting = !!game.resetting;
    },
  };
}
