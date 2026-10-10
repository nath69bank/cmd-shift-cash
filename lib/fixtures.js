// Free fixtures for the public board, from ESPN's public scoreboard feed (no
// key). Racing and boxing have no free feed, so those come from the daily
// research run (card.guide). Every source is optional: a league that fails to
// load is simply left out.
import { ukDate } from './dates.js';
import { LEAGUES } from '../public/assets/meta.js';

const ESPN = 'https://site.api.espn.com/apis/site/v2/sports';

export { LEAGUES };

const compact = (date) => date.replaceAll('-', '');

async function getJSON(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return res.json();
}

const status = (ev, comp) => {
  const t = ev.status?.type ?? comp?.status?.type ?? {};
  return { state: t.state ?? 'pre', detail: t.shortDetail ?? t.detail ?? '' };
};

export function normaliseMatch(ev) {
  const comp = ev.competitions?.[0] ?? {};
  const side = (where) => comp.competitors?.find((c) => c.homeAway === where) ?? {};
  const home = side('home');
  const away = side('away');
  const { state, detail } = status(ev, comp);
  return {
    id: String(ev.id),
    kickoff: ev.date,
    home: home.team?.shortDisplayName || home.team?.displayName || '',
    away: away.team?.shortDisplayName || away.team?.displayName || '',
    home_logo: home.team?.logo ?? null,
    away_logo: away.team?.logo ?? null,
    home_score: state === 'pre' ? null : (home.score ?? null),
    away_score: state === 'pre' ? null : (away.score ?? null),
    state,
    detail,
    venue: comp.venue?.fullName ?? '',
  };
}

export function normaliseFightEvent(ev) {
  const { state, detail } = status(ev, ev.competitions?.[0]);
  return {
    sport: 'mma',
    event: ev.name ?? ev.shortName ?? 'UFC',
    date: ukDate(new Date(ev.date)),
    start: ev.date,
    bouts: ev.competitions?.length ?? 0,
    venue: ev.competitions?.[0]?.venue?.fullName ?? '',
    state,
    detail,
  };
}

export async function football(date) {
  const results = await Promise.allSettled(
    LEAGUES.map(async (league) => {
      const data = await getJSON(`${ESPN}/soccer/${league.id}/scoreboard?dates=${compact(date)}`);
      const matches = (data.events ?? [])
        .map(normaliseMatch)
        .filter((m) => m.home && m.away && ukDate(new Date(m.kickoff)) === date)
        .sort((a, b) => a.kickoff.localeCompare(b.kickoff));
      return { league: league.name, id: league.id, slug: league.slug, matches };
    }),
  );
  return results.filter((r) => r.status === 'fulfilled' && r.value.matches.length).map((r) => r.value);
}

export async function ufc(date) {
  const end = new Date(`${date}T12:00:00Z`);
  end.setUTCDate(end.getUTCDate() + 7);
  try {
    const data = await getJSON(`${ESPN}/mma/ufc/scoreboard?dates=${compact(date)}-${compact(end.toISOString().slice(0, 10))}`);
    return (data.events ?? []).map(normaliseFightEvent).filter((f) => f.date >= date);
  } catch {
    return [];
  }
}
