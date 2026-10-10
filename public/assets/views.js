// Page fragments as auto-escaped HTML strings. The server uses these to send
// complete pages (so search engines see the content); the browser uses the
// same functions for live updates, so the two never look different.
import { html, safeUrl } from './html.js';
import { TIERS, TIER_ORDER, SPORTS, BET_TYPES, RESULTS, LEAGUES } from './meta.js';

export const ukTime = (iso) =>
  new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London' });
export const ukDate = (d = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London' }).format(d);
export const prettyDate = (iso, opts = { weekday: 'short', day: 'numeric', month: 'short' }) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-GB', { ...opts, timeZone: 'Europe/London' });
export const longDate = (iso) => prettyDate(iso, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
export const signed = (n) => `${n > 0 ? '+' : ''}${Math.round(n * 100) / 100}`;

export const empty = (text) => html`<div class="empty">${text}</div>`;

export const tierKey = (tier, cls = '') => html`<kbd class="${tier === 'cash' ? 'cash' : ''} ${cls}">${TIERS[tier].key}</kbd>`;

/* ---------- Bets ---------- */

const profitText = (bet) =>
  bet.result === 'won'
    ? `+${Math.round(bet.stake_pts * (bet.decimal_odds - 1) * 100) / 100}pts`
    : bet.result === 'lost'
      ? `-${bet.stake_pts}pts`
      : bet.profit_pts != null
        ? `${signed(bet.profit_pts)}pts`
        : '';

// "Bet at …" buttons from config/bookmakers.json. Affiliate links must carry
// rel="sponsored" and the 18+ / T&Cs line.
export function bookmakerButtons(bookmakers = []) {
  const live = bookmakers.filter((b) => safeUrl(b.url));
  if (!live.length) return '';
  return html`<div class="bookies">
    <span class="bookies-label">Place it at</span>
    ${live.map((b) => html`<a class="bookie" href="${safeUrl(b.url)}" rel="sponsored nofollow noopener" target="_blank">${b.name}${b.offer ? html`<small>${b.offer}</small>` : ''}</a>`)}
    <p class="bookies-terms">18+ · New customers only where an offer is shown · T&amp;Cs apply · BeGambleAware.org · We may earn a commission.</p>
  </div>`;
}

export function betCard(bet, { bookmakers = [] } = {}) {
  const t = TIERS[bet.tier];
  const head = html`<header class="bet-head">
      ${tierKey(bet.tier, 'bet-key')}
      <div class="bet-title">
        <p class="bet-tier">${t.name} · ${t.label} · ${SPORTS[bet.sport]} ${BET_TYPES[bet.bet_type].toLowerCase()}</p>
        <h3>${bet.locked ? `${bet.legs_count}-leg ${BET_TYPES[bet.bet_type].toLowerCase()}` : bet.title}</h3>
      </div>
      <div class="bet-price"><strong class="bet-odds">${bet.odds}</strong><span class="bet-stake">${bet.stake_pts}pt stake</span></div>
    </header>`;

  if (bet.locked) {
    const shown = Math.min(bet.legs_count, 3);
    const ghost = Array.from({ length: shown }, () => html`<li class="leg"><span class="leg-event">Members only · Event and time</span><span class="leg-sel">Selection hidden until you join</span><span class="leg-odds">?/?</span></li>`);
    if (bet.legs_count > shown) ghost.push(html`<li class="leg more-legs">+${bet.legs_count - shown} more legs</li>`);
    return html`<article class="bet ${bet.tier} locked" data-id="${bet.id}">
      ${head}
      <ol class="legs" aria-hidden="true">${ghost}</ol>
      <div class="lock"><div>
        <p>🔒 Members only</p>
        <p class="meta">First start ${bet.first_start ?? 'today'} UK${bet.fingerprint ? ` · fingerprint ${bet.fingerprint.slice(0, 12)}` : ''}</p>
        <a class="primary" href="/join">Unlock today's bets</a>
      </div></div>
    </article>`;
  }

  const legs = bet.legs.map(
    (l) => html`<li class="leg">
      <span class="leg-event">${l.event} · ${l.start_uk}</span>
      <span class="leg-sel">${l.selection}</span>
      <span class="leg-odds">${l.odds}</span>
      ${l.reasoning ? html`<p class="leg-why">${l.reasoning}</p>` : ''}
    </li>`,
  );
  const settled = bet.result && bet.result !== 'pending';
  return html`<article class="bet ${bet.tier}" data-id="${bet.id}">
    ${head}
    <ol class="legs">${legs}</ol>
    <div class="bet-foot">
      ${settled ? html`<span class="result ${bet.result}">${RESULTS[bet.result]} ${profitText(bet)}</span>` : ''}
      ${bet.value_case ? html`<p class="value"><b>Why it's value: </b>${bet.value_case}</p>` : ''}
      ${bet.check ? html`<p class="check"><b>Check before placing: </b>${bet.check}</p>` : ''}
      ${bet.fingerprint ? html`<p class="check">Posted ${bet.posted_at ? new Date(bet.posted_at).toLocaleString('en-GB', { timeZone: 'Europe/London', dateStyle: 'medium', timeStyle: 'short' }) : ''} · fingerprint ${bet.fingerprint.slice(0, 12)}</p>` : ''}
      ${settled && bet.settled_note ? html`<p class="check">${bet.settled_note}</p>` : ''}
      ${!settled ? bookmakerButtons(bookmakers) : ''}
    </div>
  </article>`;
}

/* ---------- Record ---------- */

function stat(label, r, tier) {
  return html`<div class="stat">
    <div class="k">${tier ? tierKey(tier) : ''}${label}</div>
    <div class="v ${r.profit_pts > 0 ? 'up' : r.profit_pts < 0 ? 'down' : ''}">${signed(r.profit_pts)}pts</div>
    <div class="s">${r.bets ? `${r.won}/${r.bets} won · ROI ${r.roi}%` : 'No settled bets yet'}</div>
  </div>`;
}

const ZERO = { bets: 0, won: 0, profit_pts: 0, roi: 0 };

export function statTiles(record) {
  return html`<div class="stats">
    ${stat('All tiers', record?.overall ?? ZERO)}
    ${TIER_ORDER.map((t) => stat(TIERS[t].name, record?.tiers?.[t] ?? ZERO, t))}
  </div>`;
}

// One line for the join box: only shown once there's a record to show.
export function recordLine(record) {
  const r = record?.overall;
  if (!r?.bets) return '';
  return html`<p class="record-line"><b class="${r.profit_pts >= 0 ? 'up' : 'down'}">${signed(r.profit_pts)}pts</b> · ROI ${r.roi}% · ${r.bets} settled bets, all public on the <a href="/results">results page</a></p>`;
}

/* ---------- Results ---------- */

export function resultsTable(rows, tier = 'all') {
  const shown = tier === 'all' ? rows : rows.filter((r) => r.tier === tier);
  if (!shown.length) {
    return html`<tr><td colspan="8" class="muted">${rows.length ? 'No bets in this tier yet.' : 'The first bets appear here once the daily run starts. Every one stays on the record.'}</td></tr>`;
  }
  return shown.map((r) => {
    const t = TIERS[r.tier];
    const what = r.locked
      ? html`<td>🔒 ${r.legs_count}-leg ${BET_TYPES[r.bet_type].toLowerCase()}<span class="sel">Revealed after the event</span></td>`
      : html`<td>${r.title}<span class="sel">${r.legs.map((l) => l.selection).join(' · ')}</span></td>`;
    const pl = r.profit_pts;
    return html`<tr>
      <td>${prettyDate(r.date)}</td>
      <td><span class="tier-pill ${r.tier}">${t.key} ${t.name}</span></td>
      ${what}
      <td class="num">${r.odds}</td>
      <td class="num">${r.stake_pts}pt</td>
      <td><span class="result ${r.result}">${RESULTS[r.result]}</span></td>
      <td class="num ${pl > 0 ? 'pos' : pl < 0 ? 'neg' : ''}">${pl == null ? '–' : signed(pl)}</td>
      <td class="fp">${r.fingerprint ? r.fingerprint.slice(0, 10) : '–'}${r.fingerprint && !r.locked && r.legs ? html`<button type="button" data-check="${r.id}">Check</button>` : ''}</td>
    </tr>`;
  });
}

export function tierFilter(active = 'all') {
  const opts = [['all', 'All tiers'], ...TIER_ORDER.map((t) => [t, `${TIERS[t].key} ${TIERS[t].name}`])];
  return html`<div class="chips" role="group" aria-label="Filter by tier">
    ${opts.map(([v, label]) => html`<button type="button" data-tier="${v}" aria-pressed="${String(v === active)}">${label}</button>`)}
  </div>`;
}

// Month-by-month: settled bets, wins, points and ROI.
export function monthlyTable(rows, tier = 'all') {
  const months = new Map();
  for (const r of rows) {
    if (r.profit_pts == null || (tier !== 'all' && r.tier !== tier)) continue;
    const m = r.date.slice(0, 7);
    const agg = months.get(m) ?? { bets: 0, won: 0, staked: 0, profit: 0 };
    agg.bets += 1;
    agg.won += r.result === 'won' ? 1 : 0;
    agg.staked += r.stake_pts;
    agg.profit += r.profit_pts;
    months.set(m, agg);
  }
  if (!months.size) return html`<tr><td colspan="5" class="muted">Monthly totals appear once bets are settled.</td></tr>`;
  return [...months.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([m, a]) => {
      const label = new Date(`${m}-15T12:00:00Z`).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
      const roi = a.staked ? Math.round((a.profit / a.staked) * 1000) / 10 : 0;
      return html`<tr><td>${label}</td><td class="num">${a.bets}</td><td class="num">${a.won}</td><td class="num ${a.profit > 0 ? 'pos' : a.profit < 0 ? 'neg' : ''}">${signed(a.profit)}</td><td class="num">${roi}%</td></tr>`;
    });
}

/* ---------- Fixtures ---------- */

export function dayChips(range, date, path) {
  const out = [];
  const today = ukDate();
  for (let d = new Date(`${range.min}T12:00:00Z`); d.toISOString().slice(0, 10) <= range.max; d.setUTCDate(d.getUTCDate() + 1)) {
    const iso = d.toISOString().slice(0, 10);
    const diff = Math.round((new Date(`${iso}T12:00:00Z`) - new Date(`${today}T12:00:00Z`)) / 86400000);
    const label = diff === 0 ? 'Today' : diff === -1 ? 'Yesterday' : diff === 1 ? 'Tomorrow' : prettyDate(iso);
    const href = iso === today ? path : `${path}?date=${iso}`;
    out.push(html`<a href="${href}" data-date="${iso}" aria-current="${iso === date ? 'date' : 'false'}">${label}</a>`);
  }
  return html`<nav class="days" aria-label="Day">${out}</nav>`;
}

export function sportTabs(active) {
  const tabs = [['football', '/fixtures', 'Football'], ['racing', '/racing', 'Racing'], ['fights', '/fights', 'UFC & Boxing']];
  return html`<nav class="tabs" aria-label="Sport">${tabs.map(([k, href, label]) => html`<a href="${href}" aria-current="${k === active ? 'page' : 'false'}">${label}</a>`)}</nav>`;
}

export function leagueLinks(activeSlug) {
  return html`<nav class="chips league-links" aria-label="League">
    <a href="/fixtures" aria-current="${!activeSlug ? 'page' : 'false'}">All leagues</a>
    ${LEAGUES.map((l) => html`<a href="/fixtures/${l.slug}" aria-current="${l.slug === activeSlug ? 'page' : 'false'}">${l.name}</a>`)}
  </nav>`;
}

function matchRow(m) {
  const live = m.state === 'in';
  const time = live ? m.detail : m.state === 'post' ? 'FT' : ukTime(m.kickoff);
  const logo = (src) => (safeUrl(src) ? html`<img src="${safeUrl(src)}" alt="" loading="lazy" width="20" height="20">` : '');
  const score = m.state === 'pre' ? html`<span class="m-score pre">v</span>` : html`<span class="m-score">${m.home_score ?? 0} – ${m.away_score ?? 0}</span>`;
  return html`<div class="match${m.tipped ? ' tipped' : ''}" title="${m.venue || ''}">
    <span class="m-time ${live ? 'live' : ''}">${time}</span>
    <span class="m-team home"><span>${m.home}</span>${logo(m.home_logo)}</span>
    ${score}
    <span class="m-team away">${logo(m.away_logo)}<span>${m.away}</span></span>
    ${m.tipped ? html`<a class="tip-badge" href="/join" title="A premium bet includes this game">🔒 Tip</a>` : html`<span></span>`}
  </div>`;
}

export function footballBoard(leagues, { linkLeagues = true } = {}) {
  if (!leagues.length) return empty('No top-league football on this day.');
  return leagues.map(
    (lg) => html`<section class="league">
      <h3>${linkLeagues && lg.slug ? html`<a href="/fixtures/${lg.slug}">${lg.league}</a>` : lg.league}<span>${lg.matches.length} match${lg.matches.length === 1 ? '' : 'es'}</span></h3>
      ${lg.matches.map(matchRow)}
    </section>`,
  );
}

export function racingBoard(racing, date) {
  if (!racing.length) {
    return empty(date === ukDate() ? 'Today\'s racecards are added with the morning run at about 09:15.' : 'Race times are listed on the day.');
  }
  return html`<p class="next-race" id="next-race" hidden></p>
    ${racing.map(
      (m) => html`<section class="league meeting">
        <h3>${m.course}${m.country && m.country !== 'GB' ? ` (${m.country})` : ''}<span>${m.going ? `Going: ${m.going}` : ''}</span></h3>
        ${[...m.races]
          .sort((a, b) => a.time_uk.localeCompare(b.time_uk))
          .map((r) => html`<div class="race" data-time="${r.time_uk}" data-course="${m.course}"><span class="m-time">${r.time_uk}</span><span>${r.name}</span><span class="muted">${r.runners ? `${r.runners} runners` : ''}</span></div>`)}
      </section>`,
    )}`;
}

export function fightsBoard(fights) {
  if (!fights.length) return empty('No fight cards found for the next 7 days.');
  return html`<section class="league"><h3>Upcoming fight cards<span>next 7 days</span></h3>
    ${fights.map(
      (f) => html`<div class="fight">
        <div><span class="tag-sport">${f.sport === 'boxing' ? 'Boxing' : 'UFC / MMA'}</span><b>${prettyDate(f.date)}</b><span class="muted">${f.start ? `${ukTime(f.start)} UK` : f.time_uk ? `${f.time_uk} UK` : ''}</span></div>
        <div><b>${f.event}</b><span class="muted">${[f.main_event, f.venue].filter(Boolean).join(' · ')}</span></div>
      </div>`,
    )}
  </section>`;
}

/* ---------- Conversion ---------- */

export function emailCapture({ id = 'subscribe', heading = 'Get the banker in your inbox', telegramUrl = null } = {}) {
  return html`<section class="capture" aria-labelledby="${id}-h">
    <div>
      <h2 id="${id}-h">${heading}</h2>
      <p class="muted">The free ENTER bet every morning, plus the weekend preview on Fridays. No spam, one-click unsubscribe.</p>
    </div>
    <form class="capture-form" data-subscribe>
      <div class="row">
        <input type="email" name="email" placeholder="you@example.com" required aria-label="Email address">
        <button type="submit" class="primary">Send it to me</button>
      </div>
      <label class="consent"><input type="checkbox" name="consent" required> I'm 18 or over and happy to get these emails.</label>
      <p class="muted small" role="status" data-msg></p>
      ${safeUrl(telegramUrl) ? html`<p class="small">Prefer Telegram? <a href="${safeUrl(telegramUrl)}" target="_blank" rel="noopener">Join the free channel</a>.</p>` : ''}
    </form>
  </section>`;
}

export function joinBox({ priceLabel, trialDays, record } = {}) {
  return html`<div class="join" id="join-box">
    <div>
      <p class="eyebrow">Premium</p>
      <h2>Get every bet the moment it's posted.</h2>
      ${recordLine(record)}
      <ul class="ticks">
        <li>CMD, SHIFT and CASH bets every day, in full</li>
        <li>The private Telegram group, with bets posted as they're found</li>
        <li>Every leg's reasoning, the value case, and what to check before you place</li>
        <li>The banker, fixtures, tools and full results stay free for everyone</li>
      </ul>
    </div>
    <div class="join-cta">
      ${priceLabel ? html`<p class="price">${priceLabel.split('/')[0]}${priceLabel.includes('/') ? html`<small> /${priceLabel.split('/').slice(1).join('/')}</small>` : ''}</p>` : ''}
      <button type="button" class="primary" data-checkout>${trialDays ? `Start ${trialDays}-day free trial` : 'Join now'}</button>
      <p class="muted small">${trialDays ? `Free for ${trialDays} days, then ${priceLabel || 'the monthly price'}. ` : ''}Cancel any time. 18+ only.</p>
      <form class="login" data-login autocomplete="on">
        <label for="email-login">Already a member? Get a sign-in link</label>
        <div class="row">
          <input id="email-login" name="email" type="email" placeholder="you@example.com" required>
          <button type="submit" class="ghost">Send link</button>
        </div>
        <p class="muted small" role="status" data-msg></p>
      </form>
    </div>
  </div>
  <div class="join member" id="member-box" hidden>
    <div>
      <p class="eyebrow">Premium</p>
      <h2>You're in.</h2>
      <p class="muted">Every bet is on the site as soon as it's posted. Join the Telegram group to get them on your phone.</p>
    </div>
    <div class="join-cta">
      <button type="button" class="primary" data-telegram>Join the Telegram group</button>
      <button type="button" class="ghost" data-portal>Manage subscription</button>
      <button type="button" class="link" data-logout>Sign out</button>
    </div>
  </div>`;
}

export function tierRow() {
  return html`<ul class="keyrow" aria-label="Tiers">
    ${TIER_ORDER.map((t) => html`<li class="t-${t}" title="${TIERS[t].label}">${tierKey(t)}<b>${TIERS[t].name}</b><span>${TIERS[t].free ? 'Free · ' : ''}${TIERS[t].target}</span></li>`)}
  </ul>`;
}
