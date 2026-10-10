// Server-rendered pages. Each page arrives with its content already in the
// HTML (what search engines index); public/assets/app.js then adds live
// scores, member unlocks, the chart and the tools.
import { html, raw, safeUrl } from '../public/assets/html.js';
import {
  betCard,
  dayChips,
  emailCapture,
  empty,
  fightsBoard,
  footballBoard,
  joinBox,
  leagueLinks,
  longDate,
  monthlyTable,
  prettyDate,
  racingBoard,
  resultsTable,
  sportTabs,
  statTiles,
  tierFilter,
  tierRow,
} from '../public/assets/views.js';
import { BRAND, LEAGUES, TIERS, PAID_TIERS } from '../public/assets/meta.js';
import { getCard, getIndex, getPreview, getPreviewIndex } from './store.js';
import { bookmakers, clampDate, fixturesFor, publicRows, trackRecord, visibleCard } from './data.js';
import { FAQ, privacy, responsibleGambling, terms } from './content.js';
import { ukDate } from './dates.js';

const NAV = [
  ['/free-bet-today', 'Banker'],
  ['/tips', 'Tips'],
  ['/fixtures', 'Fixtures'],
  ['/racing', 'Racing'],
  ['/fights', 'UFC & Boxing'],
  ['/results', 'Results'],
  ['/tools', 'Tools'],
  ['/previews', 'Previews'],
];

const ld = (obj) => raw(`<script type="application/ld+json">${JSON.stringify(obj).replace(/</g, '\\u003c')}</script>`);
const boot = (obj) => raw(`<script id="boot" type="application/json">${JSON.stringify(obj).replace(/</g, '\\u003c')}</script>`);

function layout(ctx, { path, title, description, page, body, schema = [], data = {}, paidToday = 0, noindex = false }) {
  const url = `${ctx.base}${path}`;
  const og = `${ctx.base}/og.png`;
  const active = (href) => (path === href || (href !== '/' && path.startsWith(`${href}/`)) ? 'page' : 'false');
  return `<!doctype html>${html`<html lang="en-GB">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  <meta name="description" content="${description}">
  <link rel="canonical" href="${url}">
  ${noindex ? raw('<meta name="robots" content="noindex">') : ''}
  <meta name="theme-color" content="#0a0c0b">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="${BRAND}">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:url" content="${url}">
  <meta property="og:image" content="${og}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${description}">
  <meta name="twitter:image" content="${og}">
  <link rel="icon" href="/assets/logo.svg" type="image/svg+xml">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/assets/styles.css">
  ${schema.map(ld)}
</head>
<body data-page="${page}">
  <a class="skip" href="#main">Skip to content</a>
  <header class="top">
    <div class="wrap top-row">
      <a class="brand" href="/" aria-label="${BRAND} home">
        <span class="keys" aria-hidden="true"><kbd>⌘</kbd><kbd>⇧</kbd><kbd class="cash">$</kbd></span>
        <span class="wordmark">CMD + SHIFT + <b>CASH</b></span>
      </a>
      <div class="top-actions">
        <a href="/join" class="join-link" data-join-link>Join</a>
        <button type="button" class="ghost" data-account hidden>Account</button>
      </div>
    </div>
    <nav class="wrap subnav" aria-label="Main">
      ${NAV.map(([href, label]) => html`<a href="${href}" aria-current="${active(href)}">${label}</a>`)}
    </nav>
  </header>
  <div class="toast" id="toast" role="status" hidden></div>
  <main id="main">${body}</main>
  <footer class="foot">
    <div class="wrap">
      <nav class="foot-links" aria-label="Footer">
        <a href="/free-bet-today">Free bet today</a><a href="/fixtures/premier-league">Premier League fixtures</a><a href="/racing">Racing today</a><a href="/fights">UFC &amp; boxing</a><a href="/tools">Acca calculator</a><a href="/results">Results</a><a href="/faq">FAQ</a><a href="/responsible-gambling">Responsible gambling</a><a href="/terms">Terms</a><a href="/privacy">Privacy</a>
      </nav>
      <p><strong>18+ only. Please gamble responsibly.</strong> Tips are research-based opinions, not guarantees, and prices move. Most bets lose, longer prices more often. Only stake what you can afford to lose.</p>
      <p>Free, confidential help: <a href="https://www.begambleaware.org/" rel="noopener">BeGambleAware.org</a> · National Gambling Helpline 0808 8020 133 · <a href="https://www.gamstop.co.uk/" rel="noopener">GAMSTOP</a></p>
      <p class="muted small">We only use essential cookies. Some bookmaker links are affiliate links. Fixtures data: ESPN. Times are UK. © ${BRAND}</p>
    </div>
  </footer>
  ${paidToday ? html`<a class="sticky-cta" href="/join" data-sticky>🔒 ${paidToday} premium bet${paidToday === 1 ? '' : 's'} today · <b>Unlock</b></a>` : ''}
  <div class="agegate" id="agegate" role="dialog" aria-modal="true" aria-labelledby="agegate-h" hidden>
    <div class="agegate-box">
      <span class="keys" aria-hidden="true"><kbd>⌘</kbd><kbd>⇧</kbd><kbd class="cash">$</kbd></span>
      <h2 id="agegate-h">Are you 18 or over?</h2>
      <p class="muted">This site is about betting and is for adults only.</p>
      <div class="row">
        <button type="button" class="primary" data-age-yes>Yes, I'm 18+</button>
        <a class="ghost" href="https://www.begambleaware.org/" rel="noopener">No</a>
      </div>
    </div>
  </div>
  ${boot({ page, ...data })}
  <script src="/assets/app.js" type="module"></script>
</body>
</html>`}`;
}

const head = (h1, sub, extra = '') => html`<section class="page-head wrap"><h1>${h1}</h1>${sub ? html`<p class="lede">${sub}</p>` : ''}${extra}</section>`;
const section = (id, title, inner, aside = '') =>
  html`<section class="wrap section" id="${id}"><div class="section-head"><h2>${title}</h2>${aside}</div>${inner}</section>`;

async function today() {
  const index = await getIndex();
  const date = ukDate();
  const card = index.cards.find((c) => c.date === date) ? await getCard(date) : null;
  return { index, date, card };
}

const paidCount = (card) => (card?.date === ukDate() ? card.bets.filter((b) => PAID_TIERS.includes(b.tier)).length : 0);

function bankerBlock(card, opts) {
  const bet = card?.bets.find((b) => b.tier === 'enter');
  if (bet) return betCard(bet, opts);
  return empty(card ? 'No banker cleared the value bar today, so none was posted. Better no bet than a bad one.' : 'Today\'s banker is posted at about 09:15 UK time. Get it by email or on Telegram so you don\'t miss it.');
}

function paidBlock(card) {
  const paid = (card?.bets ?? []).filter((b) => PAID_TIERS.includes(b.tier));
  if (!paid.length) {
    return empty(card ? 'No premium bet cleared the value bar today, so none was posted. That\'s the system working.' : 'Premium bets are posted every morning at about 09:15 UK time.');
  }
  return paid.map((b) => betCard(b));
}

function eventsSchema(leagues) {
  const items = leagues.flatMap((lg) =>
    lg.matches.map((m) => ({
      '@type': 'SportsEvent',
      name: `${m.home} v ${m.away}`,
      startDate: m.kickoff,
      sport: 'Football',
      eventStatus: 'https://schema.org/EventScheduled',
      homeTeam: { '@type': 'SportsTeam', name: m.home },
      awayTeam: { '@type': 'SportsTeam', name: m.away },
      location: { '@type': 'Place', name: m.venue || lg.league },
      superEvent: { '@type': 'SportsEvent', name: lg.league },
    })),
  );
  return items.length ? [{ '@context': 'https://schema.org', '@type': 'ItemList', itemListElement: items.slice(0, 60).map((item, i) => ({ '@type': 'ListItem', position: i + 1, item })) }] : [];
}

const faqSchema = (items) => ({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: items.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
});

const faqList = (items) => html`<div class="faq">${items.map(([q, a]) => html`<details class="panel"><summary>${q}</summary><p>${a}</p></details>`)}</div>`;

/* ---------- Pages ---------- */

const PAGES = {
  async home(ctx) {
    const { index, date, card } = await today();
    const fx = await fixturesFor(date);
    const record = trackRecord(index);
    const pub = visibleCard(card, null);
    const body = html`
      <section class="hero wrap">
        <div class="hero-copy">
          <p class="eyebrow">Football · Racing · UFC · Boxing</p>
          <h1>The shortcut to <span class="hl">value</span>.</h1>
          <p class="lede">A free banker every day, AI-researched value bets for members, and every fixture and race time in one place. Every bet is fingerprinted and tracked in public.</p>
        </div>
        ${tierRow()}
      </section>
      ${section('banker', html`<kbd class="h-key">⏎</kbd> Banker of the day <span class="free-tag">Free</span>`, bankerBlock(pub, { bookmakers: bookmakers() }), html`<a class="more" href="/free-bet-today">All bankers →</a>`)}
      ${section('tips', 'Premium tips today', html`<div class="bets" data-paid>${paidBlock(pub)}</div>`, html`<a class="more" href="/tips">Tips page →</a>`)}
      ${section('today', 'On today', html`<div class="fx-body" data-live-football>${footballBoard(fx.football)}</div><p class="more-row"><a href="/fixtures">All fixtures</a> · <a href="/racing">Racing today</a> · <a href="/fights">UFC &amp; boxing</a></p>`)}
      ${section('record', 'Results, in public', statTiles(record), html`<a class="more" href="/results">Every bet →</a>`)}
      <div class="wrap section">${emailCapture({ telegramUrl: ctx.env.TELEGRAM_FREE_URL })}</div>
      ${section('faq', 'Questions', faqList(FAQ.slice(0, 4)), html`<a class="more" href="/faq">All questions →</a>`)}
      <section class="wrap section" id="join">${joinBox({ priceLabel: ctx.env.PRICE_LABEL, trialDays: ctx.trialDays, record })}</section>`;
    return {
      title: `${BRAND} | Free Bet Today, Betting Tips, Fixtures & Racing`,
      description: 'A free banker bet every day, AI-researched football, racing, UFC and boxing tips, today\'s fixtures and race times, and every result tracked in public.',
      page: 'home',
      body,
      paidToday: paidCount(card),
      data: { date, fixtures: fx, dates: index.cards.map((c) => c.date) },
      schema: [
        { '@context': 'https://schema.org', '@type': 'WebSite', name: BRAND, url: ctx.base },
        { '@context': 'https://schema.org', '@type': 'Organization', name: BRAND, url: ctx.base, logo: `${ctx.base}/og.png` },
        faqSchema(FAQ.slice(0, 4)),
      ],
    };
  },

  async free(ctx) {
    const { index, date, card } = await today();
    const rows = publicRows(index, null).filter((r) => r.tier === 'enter');
    const body = html`
      ${head(html`<kbd class="h-key">⏎</kbd> Free bet today: banker of the day`, `${longDate(date)}. One lower-risk pick a day at evens to 2/1, chosen only when the price beats the real chance. Free for everyone.`)}
      <div class="wrap section">${bankerBlock(visibleCard(card, null), { bookmakers: bookmakers() })}</div>
      <div class="wrap section">${emailCapture({ heading: 'Get tomorrow\'s banker first', telegramUrl: ctx.env.TELEGRAM_FREE_URL })}</div>
      ${section('banker-results', 'Banker results', html`<div class="table-wrap"><table class="results"><thead><tr><th>Date</th><th>Tier</th><th>Bet</th><th class="num">Odds</th><th class="num">Stake</th><th>Result</th><th class="num">P/L</th><th>Fingerprint</th></tr></thead><tbody>${resultsTable(rows)}</tbody></table></div>`)}
      <section class="wrap section" id="join">${joinBox({ priceLabel: ctx.env.PRICE_LABEL, trialDays: ctx.trialDays, record: trackRecord(index) })}</section>`;
    return {
      title: `Free Bet Today: Banker of the Day (${prettyDate(date, { day: 'numeric', month: 'long' })}) | ${BRAND}`,
      description: 'Today\'s free banker bet: one lower-risk value pick at evens to 2/1 across football, racing, UFC and boxing, with the reasoning and a public record.',
      page: 'free',
      body,
      paidToday: paidCount(card),
      data: { rows },
    };
  },

  async tips(ctx) {
    const { index, date, card } = await today();
    const pub = visibleCard(card, null);
    const body = html`
      ${head('Premium betting tips today', `${longDate(date)}. CMD (~4/1), SHIFT (20/1+) and CASH (100/1+): accas, bet builders and singles across football, racing, UFC and boxing.`)}
      <div class="wrap section">
        <p class="card-summary" data-summary>${pub?.summary ?? ''}</p>
        <div class="bets" data-paid>${paidBlock(pub)}</div>
        <details class="panel" data-passed ${pub?.passed_on ? '' : raw('hidden')}><summary>What we passed on</summary><p>${pub?.passed_on ?? ''}</p></details>
      </div>
      <section class="wrap section" id="join">${joinBox({ priceLabel: ctx.env.PRICE_LABEL, trialDays: ctx.trialDays, record: trackRecord(index) })}</section>`;
    return {
      title: `Betting Tips Today: Accas & Bet Builders | ${BRAND}`,
      description: 'Today\'s premium value bets: a ~4/1 CMD, a 20/1+ SHIFT and a 100/1+ CASH across football, horse racing, UFC and boxing, with every result public.',
      page: 'tips',
      body,
      paidToday: paidCount(card),
      data: { date },
    };
  },

  async fixtures(ctx) {
    const league = LEAGUES.find((l) => l.slug === ctx.params.league);
    if (ctx.params.league && !league) return null;
    const date = clampDate(ctx.query.date);
    const fx = await fixturesFor(date);
    const leagues = league ? fx.football.filter((l) => l.id === league.id) : fx.football;
    const name = league?.name ?? 'Football';
    const when = date === ukDate() ? 'today' : `on ${prettyDate(date, { weekday: 'long', day: 'numeric', month: 'long' })}`;
    const path = league ? `/fixtures/${league.slug}` : '/fixtures';
    const body = html`
      ${head(`${name} fixtures ${when}`, 'Kick-off times in UK time, with live scores and full-time results.')}
      <section class="wrap section">
        <div class="controls">${sportTabs('football')}${dayChips(fx.range, date, path)}</div>
        ${leagueLinks(league?.slug)}
        <div class="fx-body" data-fixtures="football" data-live-football data-league="${league?.id ?? ''}">${league && !leagues.length ? empty(`No ${league.name} games ${when}.`) : footballBoard(leagues, { linkLeagues: !league })}</div>
      </section>
      <div class="wrap section">${emailCapture({ telegramUrl: ctx.env.TELEGRAM_FREE_URL })}</div>`;
    return {
      title: `${name} Fixtures ${date === ukDate() ? 'Today' : prettyDate(date, { day: 'numeric', month: 'short' })}: Kick-off Times & Live Scores | ${BRAND}`,
      description: `${name} fixtures ${when}: every kick-off time in UK time, live scores and results${league ? '' : ' for the Premier League, Champions League, Championship, LaLiga, Serie A, Bundesliga and more'}.`,
      page: 'fixtures',
      path: date === ukDate() ? path : `${path}?date=${date}`,
      body,
      paidToday: paidCount(await getCard(ukDate()).catch(() => null)),
      schema: eventsSchema(leagues),
      data: { date, fixtures: { ...fx, football: leagues }, league: league?.id ?? null },
    };
  },

  async racing(ctx) {
    const date = clampDate(ctx.query.date);
    const fx = await fixturesFor(date);
    const when = date === ukDate() ? 'today' : `on ${prettyDate(date, { weekday: 'long', day: 'numeric', month: 'long' })}`;
    const body = html`
      ${head(`Horse racing ${when}`, 'UK and Irish meetings, the going, and every race time in UK time.')}
      <section class="wrap section">
        <div class="controls">${sportTabs('racing')}${dayChips(fx.range, date, '/racing')}</div>
        <div class="fx-body" data-fixtures="racing">${racingBoard(fx.racing, date)}</div>
      </section>
      <div class="wrap section">${emailCapture({ telegramUrl: ctx.env.TELEGRAM_FREE_URL })}</div>`;
    return {
      title: `Horse Racing ${date === ukDate() ? 'Today' : prettyDate(date, { day: 'numeric', month: 'short' })}: Meetings & Race Times | ${BRAND}`,
      description: `Horse racing ${when}: every UK and Irish meeting with the going and race times, plus a free banker of the day.`,
      page: 'racing',
      path: date === ukDate() ? '/racing' : `/racing?date=${date}`,
      body,
      paidToday: paidCount(await getCard(ukDate()).catch(() => null)),
      data: { date, fixtures: fx },
    };
  },

  async fights(ctx) {
    const date = ukDate();
    const fx = await fixturesFor(date);
    const body = html`
      ${head('UFC & boxing this week', 'Upcoming fight cards with UK start times, venues and main events.')}
      <section class="wrap section">
        <div class="controls">${sportTabs('fights')}</div>
        <div class="fx-body" data-fixtures="fights">${fightsBoard(fx.fights)}</div>
      </section>
      <div class="wrap section">${emailCapture({ telegramUrl: ctx.env.TELEGRAM_FREE_URL })}</div>`;
    return {
      title: `UFC & Boxing This Week: Fight Cards & UK Start Times | ${BRAND}`,
      description: 'This week\'s UFC and boxing cards: dates, UK start times, venues and main events, plus value tips for members.',
      page: 'fights',
      body,
      paidToday: paidCount(await getCard(date).catch(() => null)),
      data: { date, fixtures: fx },
    };
  },

  async results(ctx) {
    const index = await getIndex();
    const rows = publicRows(index, null);
    const body = html`
      ${head('Tipster results, in public', 'Every bet we have ever posted, wins and losses, at the posted price. Every bet is fingerprinted when it is posted, so you can check nothing was changed.')}
      <section class="wrap section">
        ${statTiles(trackRecord(index))}
        <figure class="chart-card"><figcaption><span class="chart-title">Running profit</span><span class="muted small">Points, level stakes · settled bets only</span></figcaption><div class="chart" id="chart"></div></figure>
        <div class="controls">${tierFilter()}<button type="button" class="ghost small-btn" id="csv">Download CSV</button></div>
        <h2 class="sub-h">By month</h2>
        <div class="table-wrap"><table class="results months"><thead><tr><th>Month</th><th class="num">Bets</th><th class="num">Won</th><th class="num">P/L</th><th class="num">ROI</th></tr></thead><tbody data-months>${monthlyTable(rows)}</tbody></table></div>
        <h2 class="sub-h">Every bet</h2>
        <div class="table-wrap"><table class="results" id="results-table"><thead><tr><th>Date</th><th>Tier</th><th>Bet</th><th class="num">Odds</th><th class="num">Stake</th><th>Result</th><th class="num">P/L</th><th>Fingerprint</th></tr></thead><tbody data-rows>${resultsTable(rows)}</tbody></table></div>
        <details class="panel"><summary>How we keep score</summary><ul>
          <li>Every bet is saved and posted with a time stamp before the first event starts. Bets are never edited afterwards; only the result is added.</li>
          <li>Each bet gets a <b>fingerprint</b> (SHA-256 of its selections and prices), shown publicly while the selections are still locked. After the event, press <b>Check</b> to recompute it in your browser. A match proves nothing was changed.</li>
          <li>Profit is in points at the posted price: ENTER and CMD 1pt, SHIFT 0.5pt, CASH 0.25pt. Voids return the stake.</li>
        </ul></details>
      </section>
      <section class="wrap section" id="join">${joinBox({ priceLabel: ctx.env.PRICE_LABEL, trialDays: ctx.trialDays, record: trackRecord(index) })}</section>`;
    return {
      title: `Tipster Results: Every Bet, Verified | ${BRAND}`,
      description: 'Our full betting record: every tip with its price, result and profit in points, a running-profit chart, monthly breakdown and CSV download.',
      page: 'results',
      body,
      paidToday: paidCount(await getCard(ukDate()).catch(() => null)),
      data: { rows },
    };
  },

  async tools() {
    const body = html`
      ${head('Acca calculator & odds converter', 'Work out acca returns in fractional, decimal or US odds, and see the chance any price implies.')}
      <section class="wrap section"><div class="tools">
        <form class="tool" id="calc" autocomplete="off">
          <h2>Acca calculator</h2>
          <p class="muted small">Enter fractional (5/2), decimal (3.5) or US (+250) odds.</p>
          <ol class="calc-legs" id="calc-legs"></ol>
          <div class="row"><button type="button" class="ghost" id="calc-add">+ Add leg</button><label class="stake">Stake £<input id="calc-stake" type="number" min="0" step="0.5" value="5" inputmode="decimal"></label></div>
          <dl class="calc-out" id="calc-out"></dl>
        </form>
        <form class="tool" id="conv" autocomplete="off">
          <h2>Odds converter</h2>
          <p class="muted small">Type any format to see the others, plus the chance the price implies.</p>
          <input id="conv-in" class="big-input" value="5/2" aria-label="Odds">
          <dl class="calc-out" id="conv-out"></dl>
          <p class="muted small">If you rate a bet's chance above its implied probability, that's value. It's how every tip here is chosen.</p>
        </form>
      </div></section>
      ${section('how', 'How to use them', html`<div class="prose"><p>An accumulator pays the product of every leg's decimal odds: three legs at 2/1, 6/4 and 11/10 are 3.0 × 2.5 × 2.1 = 15.75, so £5 returns £78.75. Every leg has to win.</p><p>Implied probability is 1 ÷ decimal odds. At 5/2 (3.5) the bookmaker is saying 28.6%. If you think it's more likely than that, it's a value bet.</p></div>`)}`;
    return {
      title: `Acca Calculator & Odds Converter (Free) | ${BRAND}`,
      description: 'Free acca calculator for fractional, decimal and US odds, plus an odds converter with implied probability.',
      page: 'tools',
      body,
    };
  },

  async faq() {
    return {
      title: `FAQ: How Our Betting Tips Work | ${BRAND}`,
      description: 'What a value bet is, how the CMD, SHIFT, CASH and ENTER tiers work, how tips are chosen, and how every result is verified.',
      page: 'faq',
      body: html`${head('Questions', '')}<section class="wrap section">${faqList(FAQ)}</section>`,
      schema: [faqSchema(FAQ)],
    };
  },

  async join(ctx) {
    const index = await getIndex();
    return {
      title: `Join Premium | ${BRAND}`,
      description: 'Get every CMD, SHIFT and CASH value bet the moment it is posted, on the site and in the private Telegram group.',
      page: 'join',
      body: html`${head('Join Premium', '')}<section class="wrap section" id="join">${joinBox({ priceLabel: ctx.env.PRICE_LABEL, trialDays: ctx.trialDays, record: trackRecord(index) })}</section>${section('faq', 'Questions', faqList(FAQ.slice(3)))}`,
    };
  },

  async previews() {
    const { previews } = await getPreviewIndex();
    const body = html`
      ${head('Weekend previews', 'Every Friday: the weekend\'s biggest football, racing and fights, with the numbers that matter.')}
      <section class="wrap section"><div class="cards">
        ${previews.length ? previews.map((p) => html`<a class="card-link" href="/previews/${p.date}"><span class="muted small">${longDate(p.date)}</span><b>${p.title}</b><span class="muted">${p.description}</span></a>`) : empty('The first weekend preview is published on Friday morning.')}
      </div></section>`;
    return { title: `Weekend Betting Previews | ${BRAND}`, description: 'Weekend previews for football, horse racing, UFC and boxing, published every Friday.', page: 'previews', body };
  },

  async preview(ctx) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(ctx.params.date ?? '')) return null;
    const p = await getPreview(ctx.params.date);
    if (!p) return null;
    const body = html`
      <article class="wrap article">
        <p class="eyebrow">Weekend preview · ${longDate(p.date)}</p>
        <h1>${p.title}</h1>
        <p class="lede">${p.description}</p>
        ${p.sections.map((s) => html`<h2>${s.heading}</h2>${s.body.split(/\n{2,}/).map((para) => html`<p>${para}</p>`)}`)}
        <p class="muted small">AI-assisted analysis, checked against the sources below. Prices and team news change; check before you bet.</p>
        ${p.sources?.length ? html`<details class="panel"><summary>Sources</summary><ul>${p.sources.map((s) => (safeUrl(s.url) ? html`<li><a href="${safeUrl(s.url)}" rel="noopener nofollow" target="_blank">${s.title || s.url}</a></li>` : ''))}</ul></details>` : ''}
      </article>
      <div class="wrap section">${emailCapture({ heading: 'Get next week\'s preview by email' })}</div>`;
    return {
      title: `${p.title} | ${BRAND}`,
      description: p.description,
      page: 'preview',
      body,
      schema: [{ '@context': 'https://schema.org', '@type': 'Article', headline: p.title, description: p.description, datePublished: p.published_at ?? p.date, author: { '@type': 'Organization', name: BRAND } }],
    };
  },

  async terms() {
    return legal('Terms of use', 'terms', terms());
  },
  async privacy() {
    return legal('Privacy policy', 'privacy', privacy());
  },
  async responsible() {
    return legal('Responsible gambling', 'responsible', responsibleGambling(), 'Help and tools to keep betting safe and fun.');
  },
};

function legal(title, page, sections, description = `${title} for ${BRAND}.`) {
  return {
    title: `${title} | ${BRAND}`,
    description,
    page,
    body: html`${head(title, '')}<section class="wrap section prose">${sections.map(([h, p]) => html`<h2>${h}</h2><p>${p}</p>`)}</section>`,
  };
}

const ROUTE_PATHS = {
  home: '/',
  free: '/free-bet-today',
  tips: '/tips',
  fixtures: '/fixtures',
  racing: '/racing',
  fights: '/fights',
  results: '/results',
  tools: '/tools',
  faq: '/faq',
  join: '/join',
  previews: '/previews',
  terms: '/terms',
  privacy: '/privacy',
  responsible: '/responsible-gambling',
};

// Returns { status, html } for a route name and its params.
export async function renderPage(name, ctx) {
  const builder = PAGES[name];
  const out = builder ? await builder(ctx) : null;
  if (!out) {
    return {
      status: 404,
      html: layout(ctx, { path: '/404', title: `Page not found | ${BRAND}`, description: 'Page not found.', page: '404', noindex: true, body: html`${head('Page not found', 'That page doesn\'t exist. Try today\'s banker or the fixtures.')}<div class="wrap section"><a class="primary" href="/">Go to the homepage</a></div>` }),
    };
  }
  const path =
    out.path ??
    (name === 'fixtures' && ctx.params.league ? `/fixtures/${ctx.params.league}` : name === 'preview' ? `/previews/${ctx.params.date}` : ROUTE_PATHS[name]);
  return { status: 200, html: layout(ctx, { ...out, path }) };
}

export async function sitemap(base) {
  const [index, { previews }] = await Promise.all([getIndex(), getPreviewIndex()]);
  const lastmod = index.updated_at?.slice(0, 10) ?? ukDate();
  const urls = [
    ['/', 'daily', '1.0'],
    ['/free-bet-today', 'daily', '0.9'],
    ['/tips', 'daily', '0.8'],
    ['/fixtures', 'hourly', '0.9'],
    ...LEAGUES.map((l) => [`/fixtures/${l.slug}`, 'hourly', '0.8']),
    ['/racing', 'daily', '0.8'],
    ['/fights', 'daily', '0.7'],
    ['/results', 'daily', '0.7'],
    ['/tools', 'monthly', '0.7'],
    ['/previews', 'weekly', '0.6'],
    ...previews.map((p) => [`/previews/${p.date}`, 'monthly', '0.5']),
    ['/faq', 'monthly', '0.5'],
    ['/join', 'monthly', '0.5'],
    ['/responsible-gambling', 'yearly', '0.3'],
    ['/terms', 'yearly', '0.2'],
    ['/privacy', 'yearly', '0.2'],
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map(([p, freq, pri]) => `  <url><loc>${base}${p}</loc><lastmod>${lastmod}</lastmod><changefreq>${freq}</changefreq><priority>${pri}</priority></url>`)
    .join('\n')}\n</urlset>\n`;
}

export const robots = (base) => `User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${base}/sitemap.xml\n`;

