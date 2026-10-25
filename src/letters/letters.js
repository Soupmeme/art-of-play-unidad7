// The nine letters as plain data. Runtime and tests both build letters only
// through these factories, so tests always see the real data shape.

export const PHRASE = 'ARTOFPLAY';

// Each word: its letters and the phrase index where it starts.
export const WORDS = Object.freeze([
  { text: 'ART', start: 0 },
  { text: 'OF', start: 3 },
  { text: 'PLAY', start: 5 },
]);

export const STATUS = Object.freeze({
  inFan: 'inFan',
  held: 'held',
  flying: 'flying',
  onTable: 'onTable',
  stuck: 'stuck',
  locked: 'locked',
});

export const HOLDABLE = new Set([STATUS.inFan, STATUS.onTable]);

export function createLetterState(index) {
  return {
    id: index,
    char: PHRASE[index],
    status: STATUS.inFan,
    restTime: 0, // seconds spent below the rest thresholds
  };
}

export function createLetters() {
  return [...PHRASE].map((_, i) => createLetterState(i));
}

export function wordStarts() {
  return WORDS.slice(1).map((w) => w.start);
}
