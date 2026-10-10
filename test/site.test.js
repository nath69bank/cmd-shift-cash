import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { sampleCard } from './fixtures/card.js';

process.env.CASH_DATA_DIR = await mkdtemp(path.join(tmpdir(), 'csc-site-'));
process.env.SESSION_SECRET = 'test-secret-test-secret-test-secret-123';
delete process.env.BLOB_READ_WRITE_TOKEN;
// No network in tests: every ESPN call fails fast, so pages render without live football.
globalThis.fetch = async () => {
  throw new Error('offline');
};

const { saveCard, savePreview } = await import('../lib/store.js');
const { renderPage, sitemap } = await import('../lib/pages.js');
const { markTipped } = await import('../lib/data.js');
const { addSubscriber, listSubscribers, unsubscribeToken, removeByToken } = await import('../lib/subscribers.js');
const { html } = await import('../public/assets/html.js');
const { ukDate } = await import('../lib/dates.js');

const today = ukDate();
const ctx = (extra = {}) => ({ base: 'https://example.com', env: {}, query: {}, params: {}, trialDays: 0, ...extra });

before(async () => {
  const card = sampleCard(today);
  card.bets[1].legs[0].event = 'Man Utd v Spurs';
  await saveCard(card);
  await savePreview({ date: '2026-10-09', title: 'Weekend <preview>', description: 'Desc', sections: [{ heading: 'H', body: 'P1\n\nP2' }], sources: [] });
});

test('pages render full HTML with title, canonical, share tags and no locked selections', async () => {
  for (const name of ['home', 'free', 'tips', 'fixtures', 'racing', 'fights', 'results', 'tools', 'faq', 'join', 'previews', 'terms', 'privacy', 'responsible']) {
    const { status, html: page } = await renderPage(name, ctx());
    assert.equal(status, 200, name);
    assert.match(page, /^<!doctype html>/, name);
    assert.match(page, /<title>[^<]+<\/title>/, name);
    assert.match(page, /<link rel="canonical" href="https:\/\/example\.com\//, name);
    assert.match(page, /og:image" content="https:\/\/example\.com\/og\.png"/, name);
    assert.doesNotMatch(page, /SECRET/, `${name} leaks a locked selection`);
  }
});

test('the free banker is in the page HTML for search engines', async () => {
  const { html: page } = await renderPage('free', ctx());
  assert.match(page, /FREEPICK Chelsea to win/);
  const home = (await renderPage('home', ctx())).html;
  assert.match(home, /FREEPICK Chelsea to win/);
  assert.match(home, /"@type":"FAQPage"/);
  assert.match(home, /data-sticky>🔒 2 premium bets today/);
});

test('league pages, previews and 404s', async () => {
  const pl = await renderPage('fixtures', ctx({ params: { league: 'premier-league' } }));
  assert.match(pl.html, /<h1>Premier League fixtures today<\/h1>/);
  assert.match(pl.html, /href="https:\/\/example\.com\/fixtures\/premier-league"/);
  assert.equal((await renderPage('fixtures', ctx({ params: { league: 'nope' } }))).status, 404);
  const pv = await renderPage('preview', ctx({ params: { date: '2026-10-09' } }));
  assert.match(pv.html, /<h1>Weekend &lt;preview&gt;<\/h1>/);
  assert.match(pv.html, /<p>P1<\/p><p>P2<\/p>/);
  assert.equal((await renderPage('preview', ctx({ params: { date: '../x' } }))).status, 404);
});

test('sitemap lists every league page and preview', async () => {
  const xml = await sitemap('https://example.com');
  assert.match(xml, /<loc>https:\/\/example\.com\/fixtures\/premier-league<\/loc>/);
  assert.match(xml, /<loc>https:\/\/example\.com\/previews\/2026-10-09<\/loc>/);
});

test('tip badges match nicknames to feed team names, only for paid bets', () => {
  const card = { bets: [
    { tier: 'shift', legs: [{ sport: 'football', event: 'Man Utd v Spurs' }] },
    { tier: 'enter', legs: [{ sport: 'football', event: 'Chelsea v Bournemouth' }] },
  ] };
  const leagues = [{ league: 'PL', matches: [
    { home: 'Man United', away: 'Tottenham' },
    { home: 'Chelsea', away: 'Bournemouth' },
    { home: 'Man City', away: 'Arsenal' },
  ] }];
  assert.deepEqual(markTipped(leagues, card)[0].matches.map((m) => m.tipped), [true, false, false]);
});

test('subscribers: idempotent sign-up and one-click unsubscribe', async () => {
  await addSubscriber('Fan@Example.com');
  await addSubscriber('fan@example.com ');
  const subs = await listSubscribers();
  assert.equal(subs.length, 1);
  assert.equal(await removeByToken('forged.token'), false);
  assert.equal(await removeByToken(unsubscribeToken(subs[0].id)), true);
  assert.equal((await listSubscribers()).length, 0);
});

test('templates escape everything interpolated', () => {
  const evil = '"><script>alert(1)</script>';
  assert.equal(String(html`<a title="${evil}">${evil}</a>`), '<a title="&quot;&gt;&lt;script&gt;alert(1)&lt;/script&gt;">&quot;&gt;&lt;script&gt;alert(1)&lt;/script&gt;</a>');
});
