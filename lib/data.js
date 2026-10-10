// Data shared by the API endpoints and the server-rendered pages.
import BOOKMAKERS from '../config/bookmakers.js';
import { getCard, getIndex } from './store.js';
import { football, ufc } from './fixtures.js';
import { record, profitPts } from './odds.js';
import { isLocked, teaser } from './visibility.js';
import { TIER_ORDER, PAID_TIERS } from './brand.js';
import { ukDate } from './dates.js';

const DAY = 86400_000;

export const bookmakers = () => BOOKMAKERS.filter((b) => /^https?:\/\//.test(b.url || ''));

export function trackRecord(index) {
  const all = index.cards.flatMap((c) => c.bets);
  return {
    overall: record(all),
    tiers: Object.fromEntries(TIER_ORDER.map((t) => [t, record(all.filter((b) => b.tier === t))])),
  };
}

// Every bet ever posted, newest first. Today's paid bets stay locked for non-members.
export function publicRows(index, member) {
  return index.cards.flatMap((card) =>
    card.bets.map((bet) => ({
      ...(isLocked(bet.tier, card.date, member) ? teaser(bet) : { ...bet, locked: false }),
      date: card.date,
      profit_pts: ['won', 'lost', 'placed'].includes(bet.result) ? profitPts(bet) : null,
    })),
  );
}

// A card as a given visitor may see it.
export function visibleCard(card, member) {
  if (!card) return null;
  const bets = card.bets.map((b) => (isLocked(b.tier, card.date, member) ? teaser(b) : b));
  const locked = bets.some((b) => b.locked);
  return locked
    ? { date: card.date, generated_at: card.generated_at, bets, locked }
    : { date: card.date, generated_at: card.generated_at, summary: card.summary, passed_on: card.passed_on, sources: card.sources, bets, locked };
}

const words = (name) =>
  name
    .toLowerCase()
    .replace(/\b(fc|afc|cf|sc|the)\b|[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2);

// Common nicknames in bet write-ups, mapped to words in the feed's team names.
const ALIASES = {
  spurs: 'tottenham',
  utd: 'united',
  wolves: 'wolverhampton',
  villa: 'villa aston',
  forest: 'forest nottingham',
  palace: 'palace crystal',
  boro: 'middlesbrough',
  barca: 'barcelona',
  inter: 'inter internazionale',
  psg: 'paris',
  bayern: 'bayern munich',
};
const expand = (event) => event.toLowerCase().replace(/\b[a-z]+\b/g, (w) => ALIASES[w] ?? w);

// Marks matches that appear in one of the day's premium football bets.
export function markTipped(leagues, card) {
  if (process.env.TIP_BADGES === '0' || !card) return leagues;
  const events = card.bets
    .filter((b) => PAID_TIERS.includes(b.tier))
    .flatMap((b) => b.legs ?? [])
    .filter((l) => l.sport === 'football')
    .map((l) => expand(l.event));
  if (!events.length) return leagues;
  const hit = (team, ev) => words(team).some((w) => ev.includes(w));
  return leagues.map((lg) => ({
    ...lg,
    matches: lg.matches.map((m) => ({ ...m, tipped: events.some((ev) => hit(m.home, ev) && hit(m.away, ev)) })),
  }));
}

export function fixtureRange() {
  return { min: ukDate(new Date(Date.now() - DAY)), max: ukDate(new Date(Date.now() + 6 * DAY)) };
}

export function clampDate(wanted) {
  const range = fixtureRange();
  return /^\d{4}-\d{2}-\d{2}$/.test(wanted ?? '') && wanted >= range.min && wanted <= range.max ? wanted : ukDate();
}

// Football and UFC from the live feed; racing and boxing from the research run's guide.
export async function fixturesFor(date) {
  const range = fixtureRange();
  const guide = async () => {
    try {
      const card = await getCard(date);
      if (card?.guide) return { guide: card.guide, card };
      // No guide for this day: still use the card for tip badges, and the
      // newest guide for upcoming fight cards.
      const latest = (await getIndex()).cards[0];
      const fallback = latest ? await getCard(latest.date) : null;
      return { guide: { racing: [], fights: fallback?.guide?.fights ?? [] }, card };
    } catch {
      return { guide: { racing: [], fights: [] }, card: null };
    }
  };
  const [leagues, ufcEvents, g] = await Promise.all([football(date), ufc(date), guide()]);
  const fights = [
    ...ufcEvents,
    ...(g.guide.fights ?? [])
      .filter((f) => f.date >= date)
      // ESPN already lists UFC; keep the research run's boxing and non-UFC MMA.
      .filter((f) => f.sport === 'boxing' || !/\bUFC\b/i.test(f.event))
      .map((f) => ({ ...f, state: 'pre', detail: f.time_uk })),
  ].sort((a, b) => a.date.localeCompare(b.date));
  return { date, range, football: markTipped(leagues, g.card), racing: g.guide.racing ?? [], fights };
}
