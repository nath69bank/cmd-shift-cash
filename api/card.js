import { json, query } from '../lib/http.js';
import { getCard, getIndex } from '../lib/store.js';
import { currentMember } from '../lib/members.js';
import { record } from '../lib/odds.js';
import { TIER_ORDER } from '../lib/brand.js';
import { isLocked, teaser } from '../lib/visibility.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return json(res, 405, { error: 'method_not_allowed' });
  try {
    const [index, member] = await Promise.all([getIndex(), currentMember(req).catch(() => null)]);
    const headers = member?.setCookie ? { 'Set-Cookie': member.setCookie } : {};
    const dates = index.cards.map((c) => c.date);
    const wanted = query(req).date;
    const date = dates.includes(wanted) ? wanted : dates[0];

    const all = index.cards.flatMap((c) => c.bets);
    const track = {
      overall: record(all),
      tiers: Object.fromEntries(TIER_ORDER.map((t) => [t, record(all.filter((b) => b.tier === t))])),
    };
    const base = {
      dates,
      member: Boolean(member),
      record: track,
      price_label: process.env.PRICE_LABEL || null,
      free_telegram_url: process.env.TELEGRAM_FREE_URL || null,
    };
    if (!date) return json(res, 200, { ...base, date: null, card: null }, headers);

    const card = await getCard(date);
    if (!card) return json(res, 200, { ...base, date: null, card: null }, headers);
    const bets = card.bets.map((b) => (isLocked(b.tier, date, member) ? teaser(b) : b));
    const locked = bets.some((b) => b.locked);
    const body = locked
      ? { date, generated_at: card.generated_at, bets }
      : {
          date,
          generated_at: card.generated_at,
          summary: card.summary,
          passed_on: card.passed_on,
          sources: card.sources,
          bets,
        };
    return json(res, 200, { ...base, date, locked, card: body }, headers);
  } catch (e) {
    console.error('card', e);
    return json(res, 500, { error: 'unavailable' });
  }
}
