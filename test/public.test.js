import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { sampleCard } from './fixtures/card.js';

process.env.CASH_DATA_DIR = await mkdtemp(path.join(tmpdir(), 'csc-pub-'));
process.env.SESSION_SECRET = 'test-secret-test-secret-test-secret-123';
delete process.env.BLOB_READ_WRITE_TOKEN;

const { saveCard } = await import('../lib/store.js');
const { fingerprint, canonical } = await import('../lib/proof.js');
const { finaliseBets } = await import('../lib/tips.js');
const { normaliseMatch, normaliseFightEvent } = await import('../lib/fixtures.js');
const { parseOdds, toFractional, accaReturns, impliedPct } = await import('../public/assets/odds.js');
const { ukDate } = await import('../lib/dates.js');
const { default: card } = await import('../api/card.js');
const { default: results } = await import('../api/results.js');

const today = ukDate();
const yesterday = ukDate(new Date(Date.now() - 86400_000));

function call(handler, url = '/') {
  return new Promise((resolve) => {
    const headers = {};
    const res = {
      statusCode: 200,
      setHeader: (k, v) => (headers[k.toLowerCase()] = v),
      end: (body) => resolve({ status: res.statusCode, headers, body: JSON.parse(body) }),
    };
    handler({ url, method: 'GET', headers: {} }, res);
  });
}

before(async () => {
  const old = sampleCard(yesterday);
  old.bets[0].result = 'won';
  old.bets[1].result = 'lost';
  for (const b of old.bets) b.fingerprint = fingerprint(b);
  await saveCard(old);
  const now = sampleCard(today);
  for (const b of now.bets) b.fingerprint = fingerprint(b);
  await saveCard(now);
});

test('the free ENTER bet is public today; paid tiers stay locked', async () => {
  const r = await call(card, `/api/card?date=${today}`);
  const [enter, cmd] = r.body.card.bets;
  assert.equal(enter.tier, 'enter');
  assert.equal(enter.locked, undefined);
  assert.match(enter.legs[0].selection, /FREEPICK/);
  assert.equal(cmd.locked, true);
  assert.equal(cmd.fingerprint.length, 64);
  assert.doesNotMatch(JSON.stringify(r.body), /SECRET/);
});

test('results: every bet listed with P/L; locked rows carry no selections', async () => {
  const r = await call(results, '/api/results');
  const rows = r.body.rows;
  assert.equal(rows.length, 6);
  const todays = rows.filter((x) => x.date === today);
  assert.deepEqual(todays.map((x) => [x.tier, Boolean(x.locked)]), [['enter', false], ['cmd', true], ['cash', true]]);
  assert.doesNotMatch(JSON.stringify(todays), /SECRET/);
  const old = rows.filter((x) => x.date === yesterday);
  assert.deepEqual(old.map((x) => x.profit_pts), [0.67, -1, null]);
  // Anyone can recompute a published fingerprint from the public row.
  const pub = old[1];
  assert.equal(fingerprint(pub), pub.fingerprint);
});

test('fingerprints change if a selection or price is edited', () => {
  const [, cmd] = sampleCard(today).bets;
  const fp = fingerprint(cmd);
  assert.notEqual(fingerprint({ ...cmd, odds: '9/2' }), fp);
  const edited = structuredClone(cmd);
  edited.legs[1].selection = 'Someone else';
  assert.notEqual(fingerprint(edited), fp);
  assert.equal(canonical(cmd), canonical(structuredClone(cmd)));
});

test('finaliseBets: ENTER must be short-priced and gets a fingerprint and post time', () => {
  const bet = (tier, odds, decimal) => ({ tier, odds, decimal_odds: decimal, legs: [{ event: 'A v B', selection: 's', odds }] });
  const { bets, dropped } = finaliseBets('2026-10-11', [bet('enter', '4/6', 1.67), bet('cmd', '4/1', 5)]);
  assert.deepEqual(bets.map((b) => b.tier), ['enter', 'cmd']);
  assert.ok(bets.every((b) => b.fingerprint.length === 64 && b.posted_at));
  assert.equal(finaliseBets('2026-10-11', [bet('enter', '5/1', 6)]).bets.length, 0);
  assert.equal(dropped.length, 0);
});

test('ESPN match and fight events normalise', () => {
  const m = normaliseMatch({
    id: 1,
    date: '2026-10-10T14:00Z',
    status: { type: { state: 'in', shortDetail: "63'" } },
    competitions: [{
      venue: { fullName: 'Villa Park' },
      competitors: [
        { homeAway: 'home', score: '1', team: { displayName: 'Aston Villa', shortDisplayName: 'Aston Villa', logo: 'https://x/v.png' } },
        { homeAway: 'away', score: '2', team: { displayName: 'Brentford', shortDisplayName: 'Brentford' } },
      ],
    }],
  });
  assert.deepEqual([m.home, m.away, m.home_score, m.away_score, m.state, m.detail, m.venue], ['Aston Villa', 'Brentford', '1', '2', 'in', "63'", 'Villa Park']);
  const pre = normaliseMatch({ id: 2, date: '2026-10-10T16:30Z', status: { type: { state: 'pre' } }, competitions: [{ competitors: [{ homeAway: 'home', score: '0', team: { displayName: 'Man Utd' } }, { homeAway: 'away', team: { displayName: 'Spurs' } }] }] });
  assert.equal(pre.home_score, null);
  const f = normaliseFightEvent({ name: 'UFC Fight Night: A vs. B', date: '2026-10-11T00:00Z', competitions: [{}, {}, {}] });
  assert.deepEqual([f.event, f.date, f.bouts], ['UFC Fight Night: A vs. B', '2026-10-11', 3]);
});

test('odds tools parse every format and price accas', () => {
  assert.equal(parseOdds('5/2'), 3.5);
  assert.equal(parseOdds('evens'), 2);
  assert.equal(parseOdds('3.5'), 3.5);
  assert.equal(parseOdds('+250'), 3.5);
  assert.equal(parseOdds('-200'), 1.5);
  assert.equal(parseOdds('abc'), null);
  assert.equal(parseOdds('0.5'), null);
  assert.equal(toFractional(3.5), '5/2');
  assert.equal(toFractional(2), 'Evens');
  assert.equal(toFractional(1.5), '1/2');
  assert.equal(toFractional(101), '100/1');
  const r = accaReturns([3, 2.5, 2.1], 5);
  assert.equal(r.decimal.toFixed(2), '15.75');
  assert.equal(r.returns.toFixed(2), '78.75');
  assert.equal(impliedPct(4), '25.0%');
});
