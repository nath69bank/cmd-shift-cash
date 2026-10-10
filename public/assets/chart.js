// Running-profit line chart (inline SVG) with a crosshair tooltip.
import { prettyDate, signed } from './views.js';

const SVG = 'http://www.w3.org/2000/svg';
const svg = (tag, attrs = {}) => {
  const n = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  return n;
};
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

function series(rows) {
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

export function renderChart(box, rows) {
  const pts = series(rows);
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
