import { TIERS } from './brand.js';
import { ukDate } from './dates.js';

// Non-members see that today's paid bets exist, with tier, sport, price and
// fingerprint, but not the selections. The free ENTER bet is always shown in
// full. Earlier days are public in full: that's the track record.
export function isLocked(tier, date, member) {
  return !member && !TIERS[tier]?.free && date >= ukDate();
}

export function teaser(bet) {
  return {
    id: bet.id,
    tier: bet.tier,
    sport: bet.sport,
    bet_type: bet.bet_type,
    odds: bet.odds,
    stake_pts: bet.stake_pts,
    legs_count: (bet.legs ?? []).length,
    first_start: (bet.legs ?? []).map((l) => l.start_uk).sort()[0] ?? null,
    posted_at: bet.posted_at ?? null,
    fingerprint: bet.fingerprint ?? null,
    result: bet.result,
    locked: true,
  };
}
