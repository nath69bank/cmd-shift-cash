import { json, query } from '../lib/http.js';
import { football, ufc } from '../lib/fixtures.js';
import { getCard, getIndex } from '../lib/store.js';
import { ukDate } from '../lib/dates.js';

const DAY = 86400_000;

// Public fixtures board: football from the live feed, racing and boxing from
// the daily research run's guide. Contains no tips.
export default async function handler(req, res) {
  if (req.method !== 'GET') return json(res, 405, { error: 'method_not_allowed' });
  const today = ukDate();
  const min = ukDate(new Date(Date.now() - DAY));
  const max = ukDate(new Date(Date.now() + 6 * DAY));
  const wanted = query(req).date;
  const date = /^\d{4}-\d{2}-\d{2}$/.test(wanted ?? '') && wanted >= min && wanted <= max ? wanted : today;

  // The guide for the requested day, or the newest one for upcoming fight cards.
  async function guide() {
    try {
      const card = await getCard(date);
      if (card?.guide) return card.guide;
      const latest = (await getIndex()).cards[0];
      const fallback = latest ? await getCard(latest.date) : null;
      return { racing: [], fights: fallback?.guide?.fights ?? [] };
    } catch {
      return { racing: [], fights: [] };
    }
  }

  const [leagues, ufcEvents, g] = await Promise.all([football(date), ufc(date), guide()]);
  const fights = [
    ...ufcEvents,
    ...g.fights
      .filter((f) => f.date >= date)
      // ESPN already lists UFC; keep the research run's boxing and non-UFC MMA.
      .filter((f) => f.sport === 'boxing' || !/\bUFC\b/i.test(f.event))
      .map((f) => ({ ...f, state: 'pre', detail: f.time_uk })),
  ].sort((a, b) => a.date.localeCompare(b.date));

  return json(
    res,
    200,
    { date, range: { min, max }, football: leagues, racing: g.racing ?? [], fights },
    // Shared CDN cache: live scores refresh every couple of minutes.
    { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=600' },
  );
}
