import { json, query } from '../lib/http.js';
import { getCard, getIndex } from '../lib/store.js';
import { currentMember } from '../lib/members.js';
import { bookmakers, trackRecord, visibleCard } from '../lib/data.js';

// A day's card as this visitor may see it, plus the track record. The pages
// call this to unlock the premium bets for signed-in members.
export default async function handler(req, res) {
  if (req.method !== 'GET') return json(res, 405, { error: 'method_not_allowed' });
  try {
    const [index, member] = await Promise.all([getIndex(), currentMember(req).catch(() => null)]);
    const headers = member?.setCookie ? { 'Set-Cookie': member.setCookie } : {};
    const dates = index.cards.map((c) => c.date);
    const wanted = query(req).date;
    const date = dates.includes(wanted) ? wanted : dates[0];
    const base = {
      dates,
      member: Boolean(member),
      record: trackRecord(index),
      price_label: process.env.PRICE_LABEL || null,
      free_telegram_url: process.env.TELEGRAM_FREE_URL || null,
      bookmakers: bookmakers(),
    };
    const card = date ? visibleCard(await getCard(date), member) : null;
    return json(res, 200, { ...base, date: card ? date : null, locked: card?.locked ?? false, card }, headers);
  } catch (e) {
    console.error('card', e);
    return json(res, 500, { error: 'unavailable' });
  }
}
