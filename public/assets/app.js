// All server text goes in via textContent, never innerHTML.
import { parseOdds, toFractional, impliedPct, accaReturns } from './odds.js';
import { canonical } from './proof.js';

const $ = (id) => document.getElementById(id);

const TIERS = {
  enter: { key: '⏎', name: 'ENTER', label: 'Free' },
  cmd: { key: '⌘', name: 'CMD', label: 'Small' },
  shift: { key: '⇧', name: 'SHIFT', label: 'Medium' },
  cash: { key: '$', name: 'CASH', label: 'Gamble' },
};
const SPORTS = { football: 'Football', horse_racing: 'Horse racing', mma: 'UFC / MMA', boxing: 'Boxing', mixed: 'Multi-sport' };
const TYPES = { acca: 'Acca', bet_builder: 'Bet builder', single: 'Single', each_way: 'Each way', multiple: 'Multiple' };
const RESULTS = { won: 'Won', lost: 'Lost', void: 'Void', placed: 'Placed', pending: 'Pending' };
const SVG = 'http://www.w3.org/2000/svg';

const el = (tag, props = {}, ...kids) => {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class') n.className = v;
    else if (k === 'text') n.textContent = v;
    else n.setAttribute(k, v);
  }
  n.append(...kids.filter((k) => k != null && k !== false));
  return n;
};
const svg = (tag, attrs = {}) => {
  const n = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  return n;
};

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

const ukTime = (iso) => new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London' });
const ukDate = (d = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London' }).format(d);
const prettyDate = (iso, opts = { weekday: 'short', day: 'numeric', month: 'short' }) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-GB', { ...opts, timeZone: 'Europe/London' });
const signed = (n) => `${n > 0 ? '+' : ''}${Math.round(n * 100) / 100}`;

function toast(text, action) {
  const t = $('toast');
  const close = action ?? el('button', { class: 'link', type: 'button', text: 'Close' });
  t.replaceChildren(el('p', { text }), close);
  t.hidden = false;
  if (!action) close.addEventListener('click', () => (t.hidden = true), { once: true });
}

function safeUrl(u) {
  try {
    const url = new URL(u);
    return ['https:', 'http:'].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

/* ---------- Bets ---------- */

function betCard(bet) {
  const t = TIERS[bet.tier];
  const node = $('bet-tpl').content.firstElementChild.cloneNode(true);
  node.classList.add(bet.tier);
  const key = node.querySelector('.bet-key');
  key.textContent = t.key;
  if (bet.tier === 'cash') key.classList.add('cash');
  node.querySelector('.bet-tier').textContent = `${t.name} · ${t.label} · ${SPORTS[bet.sport]} ${TYPES[bet.bet_type].toLowerCase()}`;
  node.querySelector('.bet-odds').textContent = bet.odds;
  node.querySelector('.bet-stake').textContent = `${bet.stake_pts}pt stake`;
  const legs = node.querySelector('.legs');
  const foot = node.querySelector('.bet-foot');

  if (bet.locked) {
    node.classList.add('locked');
    node.querySelector('h3').textContent = `${bet.legs_count}-leg ${TYPES[bet.bet_type].toLowerCase()}`;
    // Placeholder rows under the blur; the real selections never reach the browser.
    for (let i = 0; i < bet.legs_count; i++) {
      legs.append(el('li', { class: 'leg' }, el('span', { class: 'leg-event', text: 'Members only · Event and time' }), el('span', { class: 'leg-sel', text: 'Selection hidden until you join' }), el('span', { class: 'leg-odds', text: '?/?' })));
    }
    foot.remove();
    node.append(
      el('div', { class: 'lock' },
        el('div', {},
          el('p', { text: '🔒 Members only' }),
          el('p', { class: 'meta', text: `First start ${bet.first_start ?? 'today'} UK${bet.fingerprint ? ` · fingerprint ${bet.fingerprint.slice(0, 12)}` : ''}` }),
          el('a', { class: 'primary', href: '#join', text: 'Unlock today\'s bets', style: 'text-decoration:none;display:inline-block' }),
        ),
      ),
    );
    return node;
  }

  node.querySelector('h3').textContent = bet.title;
  for (const l of bet.legs) {
    legs.append(
      el('li', { class: 'leg' },
        el('span', { class: 'leg-event', text: `${l.event} · ${l.start_uk}` }),
        el('span', { class: 'leg-sel', text: l.selection }),
        el('span', { class: 'leg-odds', text: l.odds }),
        el('p', { class: 'leg-why', text: l.reasoning }),
      ),
    );
  }
  foot.append(
    el('p', { class: 'value' }, el('b', { text: 'Why it\'s value: ' }), bet.value_case),
    el('p', { class: 'check' }, el('b', { text: 'Check before placing: ' }), bet.check),
  );
  if (bet.fingerprint) foot.append(el('p', { class: 'check', text: `Posted ${bet.posted_at ? new Date(bet.posted_at).toLocaleString('en-GB', { timeZone: 'Europe/London' }) : ''} · fingerprint ${bet.fingerprint.slice(0, 12)}` }));
  if (bet.result && bet.result !== 'pending') {
    const p = bet.result === 'won' ? `+${Math.round(bet.stake_pts * (bet.decimal_odds - 1) * 100) / 100}pts` : bet.result === 'lost' ? `-${bet.stake_pts}pts` : bet.profit_pts != null ? `${bet.profit_pts}pts` : '';
    foot.prepend(el('span', { class: `result ${bet.result}`, text: `${RESULTS[bet.result]} ${p}`.trim() }));
    if (bet.settled_note) foot.append(el('p', { class: 'check', text: bet.settled_note }));
  }
  return node;
}

const empty = (text) => el('div', { class: 'empty', text });

function renderCard(data) {
  const card = data.card;
  const bets = card?.bets ?? [];
  const free = bets.filter((b) => b.tier === 'enter');
  const paid = bets.filter((b) => b.tier !== 'enter');
  const isToday = !data.date || data.date === ukDate();

  $('free-bet').replaceChildren(
    ...(free.length ? free.map(betCard) : [empty(card ? 'No free bet cleared the bar on this day.' : 'Today\'s free bet is posted at about 09:15 UK time. Check back then, or join the free Telegram to get it on your phone.')]),
  );
  $('bets').replaceChildren(
    ...(paid.length
      ? paid.map(betCard)
      : [empty(card ? 'No premium bet cleared the value bar on this day, so none was posted. That\'s the system working.' : 'Premium bets are posted every morning at about 09:15 UK time.')]),
  );
  $('card-summary').textContent = card?.summary || (data.locked && isToday ? 'Today\'s premium bets are live. Join to see the selections.' : '');
  $('passed-panel').hidden = !card?.passed_on;
  $('passed').textContent = card?.passed_on || '';
  const sources = (card?.sources || []).map((s) => {
    const href = safeUrl(s.url);
    return el('li', {}, href ? el('a', { href, rel: 'noopener nofollow', target: '_blank', text: s.title || href }) : s.title);
  });
  $('sources-panel').hidden = !sources.length;
  $('sources').replaceChildren(...sources);
}

function stat(label, r, key, tier) {
  return el('div', { class: 'stat' },
    el('div', { class: 'k' }, key ? el('kbd', { class: tier === 'cash' ? 'cash' : '', text: key }) : null, label),
    el('div', { class: `v ${r.profit_pts > 0 ? 'up' : r.profit_pts < 0 ? 'down' : ''}`, text: `${signed(r.profit_pts)}pts` }),
    el('div', { class: 's', text: r.bets ? `${r.won}/${r.bets} won · ROI ${r.roi}%` : 'No settled bets yet' }),
  );
}

function renderRecord(rec) {
  $('stats').replaceChildren(
    stat('All tiers', rec.overall),
    ...Object.entries(TIERS).map(([k, t]) => stat(t.name, rec.tiers[k] ?? { bets: 0, won: 0, profit_pts: 0, roi: 0 }, t.key, k)),
  );
}

let current;

async function loadCard(date) {
  try {
    const data = await api(`/api/card${date ? `?date=${encodeURIComponent(date)}` : ''}`);
    current = data;
    renderCard(data);
    renderRecord(data.record);
    if (data.price_label) $('price').replaceChildren(...priceParts(data.price_label));
    if (data.free_telegram_url && safeUrl(data.free_telegram_url)) {
      $('free-tg').href = data.free_telegram_url;
      $('free-tg').hidden = false;
    }
    $('join-box').hidden = data.member;
    $('member-box').hidden = !data.member;
    $('nav-join').hidden = data.member;
    $('nav-account').hidden = !data.member;

    const select = $('date');
    if (select.options.length !== data.dates.length) {
      select.replaceChildren(...data.dates.map((d) => el('option', { value: d, text: prettyDate(d) })));
    }
    select.value = data.date ?? '';
    select.parentElement.hidden = data.dates.length < 2;
  } catch (e) {
    $('free-bet').replaceChildren(empty(`Couldn't load today's bets (${e.message}). Refresh to try again.`));
  }
}

function priceParts(label) {
  const [amount, ...rest] = label.split('/');
  return rest.length ? [amount, el('small', { text: ` /${rest.join('/')}` })] : [label];
}

/* ---------- Fixtures ---------- */

const fx = { sport: 'football', date: null, data: null };

function dayButtons(range) {
  const out = [];
  const today = ukDate();
  for (let d = new Date(`${range.min}T12:00:00Z`); ukDate(d) <= range.max; d.setUTCDate(d.getUTCDate() + 1)) {
    const iso = d.toISOString().slice(0, 10);
    const diff = Math.round((new Date(`${iso}T12:00:00Z`) - new Date(`${today}T12:00:00Z`)) / 86400000);
    const label = diff === 0 ? 'Today' : diff === -1 ? 'Yesterday' : diff === 1 ? 'Tomorrow' : prettyDate(iso);
    const b = el('button', { type: 'button', 'aria-pressed': String(iso === fx.date), text: label });
    b.addEventListener('click', () => loadFixtures(iso));
    out.push(b);
  }
  return out;
}

function matchRow(m) {
  const live = m.state === 'in';
  const time = live ? m.detail : m.state === 'post' ? 'FT' : ukTime(m.kickoff);
  const team = (name, logo, cls) => el('span', { class: `m-team ${cls}` },
    cls === 'away' && logo ? el('img', { src: logo, alt: '', loading: 'lazy', width: '20', height: '20' }) : null,
    el('span', { text: name }),
    cls === 'home' && logo ? el('img', { src: logo, alt: '', loading: 'lazy', width: '20', height: '20' }) : null,
  );
  const score = m.state === 'pre'
    ? el('span', { class: 'm-score pre', text: 'v' })
    : el('span', { class: 'm-score', text: `${m.home_score ?? 0} – ${m.away_score ?? 0}` });
  return el('div', { class: 'match', title: m.venue || '' },
    el('span', { class: `m-time ${live ? 'live' : ''}`, text: time }),
    team(m.home, m.home_logo, 'home'), score, team(m.away, m.away_logo, 'away'));
}

function renderFixtures() {
  const body = $('fx-body');
  body.classList.remove('loading');
  const d = fx.data;
  if (!d) return;
  $('fx-days').replaceChildren(...dayButtons(d.range));
  document.querySelectorAll('.tabs button').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.sport === fx.sport)));

  if (fx.sport === 'football') {
    body.replaceChildren(
      ...(d.football.length
        ? d.football.map((lg) => el('div', { class: 'league' }, el('h3', { text: lg.league }, el('span', { text: `${lg.matches.length} match${lg.matches.length === 1 ? '' : 'es'}` })), ...lg.matches.map(matchRow)))
        : [empty('No top-league football on this day.')]),
    );
  } else if (fx.sport === 'racing') {
    body.replaceChildren(
      ...(d.racing.length
        ? d.racing.map((m) => el('div', { class: 'league meeting' },
            el('h3', { text: `${m.course}${m.country && m.country !== 'GB' ? ` (${m.country})` : ''}` }, el('span', { text: m.going ? `Going: ${m.going}` : '' })),
            ...m.races.map((r) => el('div', { class: 'race' },
              el('span', { class: 'm-time', text: r.time_uk }),
              el('span', { text: r.name }),
              el('span', { class: 'muted', text: r.runners ? `${r.runners} runners` : '' }),
            ))))
        : [empty(fx.date === ukDate() ? 'Today\'s racecards are added with the morning run at about 09:15.' : 'Race times are listed on the day.')]),
    );
  } else {
    body.replaceChildren(
      ...(d.fights.length
        ? [el('div', { class: 'league' }, el('h3', { text: 'Upcoming fight cards' }, el('span', { text: 'next 7 days' })),
            ...d.fights.map((f) => el('div', { class: 'fight' },
              el('div', {}, el('span', { class: 'tag-sport', text: f.sport === 'boxing' ? 'Boxing' : 'UFC / MMA' }), el('b', { text: prettyDate(f.date) }), el('span', { class: 'muted', text: f.start ? `${ukTime(f.start)} UK` : f.time_uk ? `${f.time_uk} UK` : '' })),
              el('div', {}, el('b', { text: f.event }), el('span', { class: 'muted', text: [f.main_event, f.venue].filter(Boolean).join(' · ') })),
            )))]
        : [empty('No fight cards found for the next 7 days.')]),
    );
  }
}

async function loadFixtures(date) {
  fx.date = date ?? fx.date ?? ukDate();
  $('fx-body').classList.add('loading');
  try {
    fx.data = await api(`/api/fixtures?date=${fx.date}`);
    fx.date = fx.data.date;
    $('fx-updated').textContent = `Updated ${new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
    renderFixtures();
  } catch {
    $('fx-body').classList.remove('loading');
    $('fx-body').replaceChildren(empty('Fixtures are unavailable right now. Try again in a minute.'));
  }
}

document.querySelectorAll('.tabs button').forEach((b) =>
  b.addEventListener('click', () => {
    fx.sport = b.dataset.sport;
    renderFixtures();
  }),
);

/* ---------- Results ---------- */

let rows = [];

async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function fingerprintCell(r) {
  const td = el('td', { class: 'fp' }, r.fingerprint ? r.fingerprint.slice(0, 10) : '–');
  if (r.fingerprint && !r.locked && r.legs) {
    const btn = el('button', { type: 'button', text: 'Check' });
    btn.addEventListener('click', async () => {
      const ok = (await sha256(canonical(r))) === r.fingerprint;
      btn.replaceWith(el('span', { class: ok ? 'ok' : 'bad', text: ok ? ' ✓ matches' : ' ✗ mismatch' }));
    });
    td.append(btn);
  }
  return td;
}

function renderTable() {
  const tbody = $('results-table').querySelector('tbody');
  if (!rows.length) {
    tbody.replaceChildren(el('tr', {}, el('td', { colspan: '8', class: 'muted', text: 'The first bets appear here once the daily run starts. Every one stays on the record.' })));
    return;
  }
  tbody.replaceChildren(
    ...rows.map((r) => {
      const t = TIERS[r.tier];
      const what = r.locked
        ? el('td', {}, `🔒 ${r.legs_count}-leg ${TYPES[r.bet_type].toLowerCase()}`, el('span', { class: 'sel', text: 'Revealed after the event' }))
        : el('td', {}, r.title, el('span', { class: 'sel', text: r.legs.map((l) => l.selection).join(' · ') }));
      return el('tr', {},
        el('td', { text: prettyDate(r.date) }),
        el('td', {}, el('span', { class: `tier-pill ${r.tier}`, text: `${t.key} ${t.name}` })),
        what,
        el('td', { class: 'num', text: r.odds }),
        el('td', { class: 'num', text: `${r.stake_pts}pt` }),
        el('td', {}, el('span', { class: `result ${r.result}`, text: RESULTS[r.result] })),
        el('td', { class: `num ${r.profit_pts > 0 ? 'pos' : r.profit_pts < 0 ? 'neg' : ''}`, text: r.profit_pts == null ? '–' : signed(r.profit_pts) }),
        fingerprintCell(r),
      );
    }),
  );
}

function series() {
  const byDate = new Map();
  for (const r of rows) {
    if (r.profit_pts == null) continue;
    byDate.set(r.date, (byDate.get(r.date) ?? 0) + r.profit_pts);
  }
  let run = 0;
  return [...byDate.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, p]) => ({ date, value: (run = Math.round((run + p) * 100) / 100) }));
}

function niceTicks(min, max, count = 4) {
  const span = max - min || 1;
  const step0 = span / count;
  const mag = 10 ** Math.floor(Math.log10(step0));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= step0);
  // Round both ends outwards so every value sits inside the axis.
  const top = Math.ceil(max / step - 1e-9) * step;
  const ticks = [];
  for (let v = Math.floor(min / step + 1e-9) * step; v <= top + 1e-9; v += step) ticks.push(Math.round(v * 100) / 100);
  return ticks;
}

function renderChart() {
  const box = $('chart');
  const pts = series();
  if (pts.length < 2) {
    box.replaceChildren(el('div', { class: 'chart-empty', text: pts.length ? `${signed(pts[0].value)}pts so far. The chart fills in as results come in.` : 'The running-profit chart starts with the first settled results.' }));
    return;
  }
  const W = box.clientWidth || 600;
  const H = box.clientHeight || 240;
  const m = { t: 10, r: 56, b: 24, l: 40 };
  const vals = pts.map((p) => p.value);
  const ticks = niceTicks(Math.min(0, ...vals), Math.max(0, ...vals));
  const lo = ticks[0];
  const hi = ticks.at(-1);
  const x = (i) => m.l + (i / (pts.length - 1)) * (W - m.l - m.r);
  const y = (v) => m.t + (1 - (v - lo) / (hi - lo || 1)) * (H - m.t - m.b);

  const root = svg('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': `Running profit ${signed(vals.at(-1))} points after ${pts.length} days` });
  const grid = svg('g', { class: 'grid' });
  const axis = svg('g', { class: 'axis' });
  for (const t of ticks) {
    if (t !== 0) grid.append(svg('line', { x1: m.l, x2: W - m.r, y1: y(t), y2: y(t) }));
    const lbl = svg('text', { x: m.l - 8, y: y(t) + 4, 'text-anchor': 'end' });
    lbl.textContent = signed(t);
    axis.append(lbl);
  }
  for (const i of [0, Math.floor((pts.length - 1) / 2), pts.length - 1].filter((v, k, a) => a.indexOf(v) === k)) {
    const lbl = svg('text', { x: x(i), y: H - 4, 'text-anchor': i === 0 ? 'start' : i === pts.length - 1 ? 'end' : 'middle' });
    lbl.textContent = prettyDate(pts[i].date, { day: 'numeric', month: 'short' });
    axis.append(lbl);
  }
  const zero = svg('line', { class: 'zero', x1: m.l, x2: W - m.r, y1: y(0), y2: y(0) });
  const path = svg('path', { class: 'series', d: pts.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join('') });
  const last = pts.length - 1;
  const endDot = svg('circle', { class: 'end-dot', cx: x(last), cy: y(pts[last].value), r: 4 });
  const endLabel = svg('text', { class: 'end-label', x: x(last) + 8, y: y(pts[last].value) + 4 });
  endLabel.textContent = `${signed(pts[last].value)}pts`;
  const cross = svg('line', { class: 'cross', y1: m.t, y2: H - m.b, visibility: 'hidden' });
  const hoverDot = svg('circle', { class: 'hover-dot', r: 4, visibility: 'hidden' });
  const hit = svg('rect', { x: m.l, y: 0, width: W - m.l - m.r, height: H, fill: 'transparent' });
  root.append(grid, zero, axis, path, endDot, endLabel, cross, hoverDot, hit);

  const tip = el('div', { class: 'chart-tip', hidden: '' });
  const show = (i) => {
    const px = x(i);
    const py = y(pts[i].value);
    cross.setAttribute('x1', px); cross.setAttribute('x2', px); cross.setAttribute('visibility', 'visible');
    hoverDot.setAttribute('cx', px); hoverDot.setAttribute('cy', py); hoverDot.setAttribute('visibility', 'visible');
    tip.replaceChildren(el('strong', { text: `${signed(pts[i].value)}pts` }), prettyDate(pts[i].date));
    tip.style.left = `${(px / W) * 100}%`;
    tip.style.top = `${(py / H) * 100}%`;
    tip.hidden = false;
  };
  const hide = () => { cross.setAttribute('visibility', 'hidden'); hoverDot.setAttribute('visibility', 'hidden'); tip.hidden = true; };
  hit.addEventListener('pointermove', (e) => {
    const r = root.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    show(Math.max(0, Math.min(last, Math.round(((px - m.l) / (W - m.l - m.r)) * last))));
  });
  hit.addEventListener('pointerleave', hide);
  box.replaceChildren(root, tip);
}

async function loadResults() {
  try {
    rows = (await api('/api/results')).rows;
  } catch {
    rows = [];
  }
  renderTable();
  renderChart();
}

let resizeTimer;
addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(renderChart, 150);
});

$('csv').addEventListener('click', () => {
  const head = ['date', 'tier', 'sport', 'bet_type', 'title', 'selections', 'odds', 'stake_pts', 'result', 'profit_pts', 'posted_at', 'fingerprint'];
  const cell = (v) => `"${String(v ?? '').replaceAll('"', '""')}"`;
  const lines = rows.map((r) => [r.date, r.tier, r.sport, r.bet_type, r.locked ? '(locked until after the event)' : r.title, r.locked ? '' : r.legs.map((l) => `${l.event}: ${l.selection} @ ${l.odds}`).join(' | '), r.odds, r.stake_pts, r.result, r.profit_pts, r.posted_at, r.fingerprint].map(cell).join(','));
  const blob = new Blob([[head.join(','), ...lines].join('\n')], { type: 'text/csv' });
  const a = el('a', { href: URL.createObjectURL(blob), download: `cmd-shift-cash-results-${ukDate()}.csv` });
  a.click();
  URL.revokeObjectURL(a.href);
});

/* ---------- Tools ---------- */

function outGrid(target, items) {
  target.replaceChildren(...items.map(([k, v]) => el('div', {}, el('dt', { text: k }), el('dd', { text: v }))));
}

function calcLeg(value = '') {
  const input = el('input', { value, placeholder: 'e.g. 5/2', 'aria-label': 'Leg odds' });
  const x = el('button', { type: 'button', class: 'x', 'aria-label': 'Remove leg', text: '×' });
  const li = el('li', {}, input, x);
  input.addEventListener('input', runCalc);
  x.addEventListener('click', () => {
    if ($('calc-legs').children.length > 1) li.remove();
    runCalc();
  });
  return li;
}

function runCalc() {
  const inputs = [...$('calc-legs').querySelectorAll('input')];
  const decs = inputs.map((i) => {
    const d = parseOdds(i.value);
    i.setAttribute('aria-invalid', String(Boolean(i.value.trim()) && !d));
    return d;
  }).filter(Boolean);
  const stake = Number($('calc-stake').value) || 0;
  if (!decs.length) return outGrid($('calc-out'), [['Total odds', '–'], ['Returns', '–'], ['Profit', '–']]);
  const { decimal, returns, profit } = accaReturns(decs, stake);
  outGrid($('calc-out'), [
    ['Total odds', `${toFractional(decimal)} (${decimal.toFixed(2)})`],
    ['Returns', `£${returns.toFixed(2)}`],
    ['Profit', `£${profit.toFixed(2)}`],
    ['Implied chance', `${impliedPct(decimal)}`],
  ]);
}

function runConv() {
  const d = parseOdds($('conv-in').value);
  $('conv-in').setAttribute('aria-invalid', String(!d));
  if (!d) return outGrid($('conv-out'), [['Fractional', '–'], ['Decimal', '–'], ['US', '–'], ['Implied chance', '–']]);
  const us = d >= 2 ? `+${Math.round((d - 1) * 100)}` : `-${Math.round(100 / (d - 1))}`;
  outGrid($('conv-out'), [['Fractional', toFractional(d)], ['Decimal', d.toFixed(2)], ['US', us], ['Implied chance', impliedPct(d)]]);
}

['2/1', '6/4', '11/10'].forEach((o) => $('calc-legs').append(calcLeg(o)));
$('calc-add').addEventListener('click', () => {
  $('calc-legs').append(calcLeg());
  runCalc();
});
$('calc-stake').addEventListener('input', runCalc);
$('conv-in').addEventListener('input', runConv);
$('calc').addEventListener('submit', (e) => e.preventDefault());
$('conv').addEventListener('submit', (e) => e.preventDefault());
runCalc();
runConv();

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

$('date').addEventListener('change', (e) => {
  const url = new URL(location.href);
  url.searchParams.set('date', e.target.value);
  history.replaceState(null, '', url);
  loadCard(e.target.value);
});

$('checkout').addEventListener('click', (e) => busy(e.currentTarget, async () => {
  location.href = (await api('/api/checkout', { method: 'POST' })).url;
}));

$('tg').addEventListener('click', (e) => busy(e.currentTarget, async () => {
  const { url } = await api('/api/telegram', { method: 'POST' });
  window.open(url, '_blank', 'noopener');
}));

$('portal').addEventListener('click', (e) => busy(e.currentTarget, async () => {
  location.href = (await api('/api/auth?action=portal', { method: 'POST' })).url;
}));

$('nav-account').addEventListener('click', () => $('member-box').scrollIntoView());

$('logout').addEventListener('click', async () => {
  await api('/api/auth?action=logout', { method: 'POST' }).catch(() => {});
  loadCard(current?.date);
  loadResults();
});

$('login').addEventListener('submit', async (e) => {
  e.preventDefault();
  const button = e.currentTarget.querySelector('button');
  button.disabled = true;
  try {
    await api('/api/auth?action=login', { method: 'POST', body: { email: $('email').value } });
    $('login-msg').textContent = 'If that email has an active membership, a sign-in link is on its way.';
  } catch {
    $('login-msg').textContent = 'Check the email address and try again.';
  } finally {
    button.disabled = false;
  }
});

const params = new URLSearchParams(location.search);
const notices = {
  failed: 'We couldn\'t confirm that payment. If you were charged, use the sign-in link below.',
  expired: 'That sign-in link has expired. Request a new one below.',
  lapsed: 'Your membership isn\'t active. Join again to unlock the bets.',
};
if (params.get('welcome')) {
  const join = el('button', { class: 'primary', type: 'button', text: 'Join Telegram' });
  toast('Welcome in. Today\'s bets are unlocked.', join);
  join.addEventListener('click', () => $('tg').click());
} else if (notices[params.get('signin')]) {
  toast(notices[params.get('signin')]);
}

loadCard(params.get('date'));
loadFixtures();
loadResults();
// Keep live scores fresh while the page is open.
setInterval(() => document.visibilityState === 'visible' && fx.date === ukDate() && loadFixtures(), 120_000);
