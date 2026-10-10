// Progressive enhancement for the server-rendered pages: age check, member
// unlock, live scores, the racing countdown, results filters and chart,
// fingerprint checks, sign-up forms and the free tools. Anything inserted as
// HTML comes from views.js, which escapes every value.
import { parseOdds, toFractional, impliedPct, accaReturns } from './odds.js';
import { canonical } from './proof.js';
import { betCard, footballBoard, monthlyTable, resultsTable, tierFilter, ukDate } from './views.js';
import { renderChart } from './chart.js';
import { TIERS } from './meta.js';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const boot = JSON.parse($('#boot')?.textContent || '{}');
const page = document.body.dataset.page;
const htmlOf = (frag) => [frag].flat().join('');

async function api(path, opts = {}) {
  const res = await fetch(path, {
    credentials: 'same-origin',
    headers: opts.body ? { 'Content-Type': 'application/json' } : {},
    ...opts,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(body.error || `HTTP ${res.status}`), { status: res.status });
  return body;
}

function toast(text, actionLabel, onAction) {
  const t = $('#toast');
  const p = document.createElement('p');
  p.textContent = text;
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = actionLabel ? 'primary' : 'link';
  btn.textContent = actionLabel || 'Close';
  btn.addEventListener('click', () => {
    t.hidden = true;
    onAction?.();
  });
  t.replaceChildren(p, btn);
  t.hidden = false;
}

const store = {
  get: (k) => {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  set: (k, v) => {
    try {
      localStorage.setItem(k, v);
    } catch {}
  },
};

/* ---------- 18+ check ---------- */

if (!store.get('csc_18')) {
  const gate = $('#agegate');
  gate.hidden = false;
  document.body.classList.add('gated');
  $('[data-age-yes]', gate).focus();
  $('[data-age-yes]', gate).addEventListener('click', () => {
    store.set('csc_18', '1');
    gate.hidden = true;
    document.body.classList.remove('gated');
  });
}

/* ---------- Membership ---------- */

async function busy(button, fn) {
  button.disabled = true;
  try {
    await fn();
  } catch (e) {
    toast(e.status === 401 ? 'Your membership has lapsed. Join again to continue.' : 'That didn\'t work. Please try again in a minute.');
  } finally {
    button.disabled = false;
  }
}

function setMember(member) {
  $$('#join-box').forEach((n) => (n.hidden = member));
  $$('#member-box').forEach((n) => (n.hidden = !member));
  $$('[data-join-link]').forEach((n) => (n.hidden = member));
  $$('[data-account]').forEach((n) => (n.hidden = !member));
  $$('[data-sticky]').forEach((n) => (n.hidden = member));
}

async function unlockForMember() {
  if (!$('[data-paid]')) return;
  const data = await api('/api/card');
  if (!data.card || data.date !== ukDate()) return;
  const paid = data.card.bets.filter((b) => !TIERS[b.tier].free);
  if (paid.length) $$('[data-paid]').forEach((n) => (n.innerHTML = paid.map((b) => htmlOf(betCard(b, { bookmakers: data.bookmakers }))).join('')));
  const summary = $('[data-summary]');
  if (summary && data.card.summary) summary.textContent = data.card.summary;
  const passed = $('[data-passed]');
  if (passed && data.card.passed_on) {
    $('p', passed).textContent = data.card.passed_on;
    passed.hidden = false;
  }
}

api('/api/auth?action=me')
  .then(({ member }) => {
    setMember(member);
    if (member) return unlockForMember();
  })
  .catch(() => {});

document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-checkout],[data-telegram],[data-portal],[data-logout],[data-account]');
  if (!t) return;
  if (t.matches('[data-checkout]')) busy(t, async () => (location.href = (await api('/api/checkout', { method: 'POST' })).url));
  else if (t.matches('[data-telegram]')) busy(t, async () => window.open((await api('/api/telegram', { method: 'POST' })).url, '_blank', 'noopener'));
  else if (t.matches('[data-portal]')) busy(t, async () => (location.href = (await api('/api/auth?action=portal', { method: 'POST' })).url));
  else if (t.matches('[data-account]')) location.href = '/join';
  else if (t.matches('[data-logout]')) api('/api/auth?action=logout', { method: 'POST' }).finally(() => location.reload());
});

document.addEventListener('submit', async (e) => {
  const form = e.target;
  if (!form.matches('[data-login],[data-subscribe]')) return;
  e.preventDefault();
  const button = $('button[type=submit]', form);
  const msg = $('[data-msg]', form);
  const email = form.elements.email.value;
  button.disabled = true;
  try {
    if (form.matches('[data-login]')) {
      await api('/api/auth?action=login', { method: 'POST', body: { email } });
      msg.textContent = 'If that email has an active membership, a sign-in link is on its way.';
    } else {
      await api('/api/subscribe', { method: 'POST', body: { email, consent: form.elements.consent.checked } });
      msg.textContent = 'You\'re on the list. The next banker lands in your inbox at about 09:15.';
      form.reset();
    }
  } catch (err) {
    msg.textContent = err.message === 'consent_required' ? 'Please tick the box to confirm.' : 'Check the email address and try again.';
  } finally {
    button.disabled = false;
  }
});

const params = new URLSearchParams(location.search);
const notices = {
  failed: 'We couldn\'t confirm that payment. If you were charged, use the sign-in link on the Join page.',
  expired: 'That sign-in link has expired. Request a new one on the Join page.',
  lapsed: 'Your membership isn\'t active. Join again to unlock the bets.',
};
if (params.get('welcome')) toast('Welcome in. Today\'s bets are unlocked.', 'Join Telegram', () => $('[data-telegram]')?.click());
else if (notices[params.get('signin')]) toast(notices[params.get('signin')]);
else if (params.has('unsubscribed')) toast(params.get('unsubscribed') === '1' ? 'You\'re unsubscribed. No more emails.' : 'That unsubscribe link didn\'t work. Reply to any email and we\'ll remove you.');

/* ---------- Live football ---------- */

const board = $('[data-live-football]');
if (board && boot.fixtures && boot.date === ukDate()) {
  const league = board.dataset.league;
  setInterval(async () => {
    if (document.visibilityState !== 'visible') return;
    try {
      const fx = await api(`/api/fixtures?date=${boot.date}`);
      const leagues = league ? fx.football.filter((l) => l.id === league) : fx.football;
      if (leagues.length) board.innerHTML = htmlOf(footballBoard(leagues, { linkLeagues: !league }));
    } catch {}
  }, 120_000);
}

/* ---------- Racing countdown ---------- */

const next = $('#next-race');
if (next && boot.date === ukDate()) {
  const tick = () => {
    const now = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London' });
    const races = $$('.race[data-time]');
    races.forEach((r) => r.classList.toggle('done', r.dataset.time < now));
    $$('.race.next').forEach((r) => r.classList.remove('next'));
    const upcoming = races.filter((r) => r.dataset.time >= now).sort((a, b) => a.dataset.time.localeCompare(b.dataset.time))[0];
    if (!upcoming) {
      next.hidden = true;
      return;
    }
    upcoming.classList.add('next');
    const toMin = (t) => t.split(':').map(Number).reduce((h, m) => h * 60 + m);
    const mins = toMin(upcoming.dataset.time) - toMin(now);
    next.textContent = `Next race: ${upcoming.dataset.time} ${upcoming.dataset.course}, ${mins <= 0 ? 'off now' : `in ${mins} min`}`;
    next.hidden = false;
  };
  tick();
  setInterval(tick, 30_000);
}

/* ---------- Results ---------- */

const rows = boot.rows ?? [];
let tier = 'all';
const filtered = () => (tier === 'all' ? rows : rows.filter((r) => r.tier === tier));

function renderResults() {
  const body = $('[data-rows]');
  if (body) body.innerHTML = htmlOf(resultsTable(rows, tier));
  const months = $('[data-months]');
  if (months) months.innerHTML = htmlOf(monthlyTable(rows, tier));
  const chart = $('#chart');
  if (chart) renderChart(chart, filtered());
}

if (page === 'results') {
  renderResults();
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-tier]');
    if (!b) return;
    tier = b.dataset.tier;
    $('.chips[aria-label="Filter by tier"]').outerHTML = htmlOf(tierFilter(tier));
    renderResults();
  });
  let resizeTimer;
  addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => renderChart($('#chart'), filtered()), 150);
  });
  $('#csv')?.addEventListener('click', () => {
    const head = ['date', 'tier', 'sport', 'bet_type', 'title', 'selections', 'odds', 'stake_pts', 'result', 'profit_pts', 'posted_at', 'fingerprint'];
    const cell = (v) => `"${String(v ?? '').replaceAll('"', '""')}"`;
    const lines = rows.map((r) =>
      [r.date, r.tier, r.sport, r.bet_type, r.locked ? '(locked until after the event)' : r.title, r.locked ? '' : r.legs.map((l) => `${l.event}: ${l.selection} @ ${l.odds}`).join(' | '), r.odds, r.stake_pts, r.result, r.profit_pts, r.posted_at, r.fingerprint].map(cell).join(','),
    );
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([[head.join(','), ...lines].join('\n')], { type: 'text/csv' }));
    a.download = `cmd-shift-cash-results-${ukDate()}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  });
}

async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

document.addEventListener('click', async (e) => {
  const btn = e.target.closest('[data-check]');
  if (!btn) return;
  const r = rows.find((x) => x.id === btn.dataset.check);
  if (!r) return;
  const ok = (await sha256(canonical(r))) === r.fingerprint;
  const span = document.createElement('span');
  span.className = ok ? 'ok' : 'bad';
  span.textContent = ok ? ' ✓ matches' : ' ✗ mismatch';
  btn.replaceWith(span);
});

/* ---------- Tools ---------- */

function outGrid(target, items) {
  target.replaceChildren(
    ...items.map(([k, v]) => {
      const d = document.createElement('div');
      const dt = document.createElement('dt');
      const dd = document.createElement('dd');
      dt.textContent = k;
      dd.textContent = v;
      d.append(dt, dd);
      return d;
    }),
  );
}

if (page === 'tools') {
  const legsEl = $('#calc-legs');
  const runCalc = () => {
    const decs = $$('input', legsEl)
      .map((i) => {
        const d = parseOdds(i.value);
        i.setAttribute('aria-invalid', String(Boolean(i.value.trim()) && !d));
        return d;
      })
      .filter(Boolean);
    const stake = Number($('#calc-stake').value) || 0;
    if (!decs.length) return outGrid($('#calc-out'), [['Total odds', '–'], ['Returns', '–'], ['Profit', '–']]);
    const { decimal, returns, profit } = accaReturns(decs, stake);
    outGrid($('#calc-out'), [
      ['Total odds', `${toFractional(decimal)} (${decimal.toFixed(2)})`],
      ['Returns', `£${returns.toFixed(2)}`],
      ['Profit', `£${profit.toFixed(2)}`],
      ['Implied chance', impliedPct(decimal)],
    ]);
  };
  const addLeg = (value = '') => {
    const li = document.createElement('li');
    const input = Object.assign(document.createElement('input'), { value, placeholder: 'e.g. 5/2' });
    input.setAttribute('aria-label', 'Leg odds');
    const x = Object.assign(document.createElement('button'), { type: 'button', className: 'x', textContent: '×' });
    x.setAttribute('aria-label', 'Remove leg');
    input.addEventListener('input', runCalc);
    x.addEventListener('click', () => {
      if (legsEl.children.length > 1) li.remove();
      runCalc();
    });
    li.append(input, x);
    legsEl.append(li);
  };
  ['2/1', '6/4', '11/10'].forEach((o) => addLeg(o));
  $('#calc-add').addEventListener('click', () => {
    addLeg();
    runCalc();
  });
  $('#calc-stake').addEventListener('input', runCalc);
  const runConv = () => {
    const d = parseOdds($('#conv-in').value);
    $('#conv-in').setAttribute('aria-invalid', String(!d));
    if (!d) return outGrid($('#conv-out'), [['Fractional', '–'], ['Decimal', '–'], ['US', '–'], ['Implied chance', '–']]);
    const us = d >= 2 ? `+${Math.round((d - 1) * 100)}` : `-${Math.round(100 / (d - 1))}`;
    outGrid($('#conv-out'), [['Fractional', toFractional(d)], ['Decimal', d.toFixed(2)], ['US', us], ['Implied chance', impliedPct(d)]]);
  };
  $('#conv-in').addEventListener('input', runConv);
  $$('#calc, #conv').forEach((f) => f.addEventListener('submit', (e) => e.preventDefault()));
  runCalc();
  runConv();
}
