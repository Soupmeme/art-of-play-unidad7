// Picking help for letters seen at a grazing angle. A letter lying flat far
// down the table is a sliver on screen, so a ray rarely hits it. When the ray
// misses, the nearest holdable letter on screen is picked instead, if any part
// of it (its collider box centres, projected) is within reach of the pointer.

// candidates: [{ letter, points: [{ x, y }] }] in pixels. Returns a letter or null.
export function nearestOnScreen(candidates, pointer, maxDistance) {
  let best = null;
  let bestDistance = maxDistance;
  for (const { letter, points } of candidates) {
    for (const p of points) {
      const d = Math.hypot(p.x - pointer.x, p.y - pointer.y);
      if (d <= bestDistance) {
        bestDistance = d;
        best = letter;
      }
    }
  }
  return best;
}
