// The exact text a bet's fingerprint is computed from. Shared by the server
// (lib/proof.js, at posting time) and the browser (the results page's Check
// button), so the two can never drift apart.
export const canonical = (bet) =>
  JSON.stringify({
    id: bet.id,
    odds: bet.odds,
    legs: bet.legs.map((l) => [l.event, l.selection, l.odds]),
  });
