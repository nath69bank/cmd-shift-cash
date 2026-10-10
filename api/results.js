import { json } from '../lib/http.js';
import { getIndex } from '../lib/store.js';
import { currentMember } from '../lib/members.js';
import { profitPts } from '../lib/odds.js';
import { isLocked, teaser } from '../lib/visibility.js';

// Every bet ever posted, newest first, for the public results table. Today's
// paid bets stay locked for non-members; everything else is shown in full.
export default async function handler(req, res) {
  if (req.method !== 'GET') return json(res, 405, { error: 'method_not_allowed' });
  try {
    const [index, member] = await Promise.all([getIndex(), currentMember(req).catch(() => null)]);
    const rows = index.cards.flatMap((card) =>
      card.bets.map((bet) => {
        const row = isLocked(bet.tier, card.date, member) ? teaser(bet) : { ...bet, locked: false };
        return {
          ...row,
          date: card.date,
          profit_pts: ['won', 'lost', 'placed'].includes(bet.result) ? profitPts(bet) : null,
        };
      }),
    );
    return json(res, 200, { rows, updated_at: index.updated_at ?? null });
  } catch (e) {
    console.error('results', e);
    return json(res, 500, { error: 'unavailable' });
  }
}
