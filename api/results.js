import { json } from '../lib/http.js';
import { getIndex } from '../lib/store.js';
import { currentMember } from '../lib/members.js';
import { publicRows } from '../lib/data.js';

// Every bet ever posted, for the public results table. Today's paid bets stay
// locked for non-members; everything else is shown in full.
export default async function handler(req, res) {
  if (req.method !== 'GET') return json(res, 405, { error: 'method_not_allowed' });
  try {
    const [index, member] = await Promise.all([getIndex(), currentMember(req).catch(() => null)]);
    return json(res, 200, { rows: publicRows(index, member), updated_at: index.updated_at ?? null });
  } catch (e) {
    console.error('results', e);
    return json(res, 500, { error: 'unavailable' });
  }
}
