// WCAG contrast of every Atlas text token against the worst composite behind it (docs/design.md, D43).
// Run: docker run --rm -v "$PWD/frontend:/web" -w /web node:24.22.1-trixie-slim node scripts/contrast.mjs
// The values below mirror src/ui/styles.css; change both together. Exit code 1 when any text pair is below 4.5:1.
//
// Worst case behind a surface = for light text, the brightest backdrop pixel; for dark text, the darkest. We try every
// gradient stop on its own and with each blob at full strength on top (the blob centre is the extreme), then stack the
// layers the way the DOM does: backdrop -> main material -> card -> row (nav and top bar: backdrop -> glass -> control).

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const over = (top, [r, g, b]) => {
  const a = top[3] ?? 1;
  return [0, 1, 2].map((i) => top[i] * a + [r, g, b][i] * (1 - a));
};
const lin = (c) => ((c /= 255) <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

const themes = {
  dark: {
    stops: ['#0b1020', '#121029', '#160f1c'].map(hex),
    blobs: [[38, 120, 150, 0.55], [96, 64, 170, 0.55], [150, 70, 90, 0.45], [30, 110, 90, 0.45]],
    glass: [20, 24, 40, 0.62], main: [18, 22, 38, 0.55], card: [255, 255, 255, 0.07], row: [255, 255, 255, 0.07],
    navActive: [255, 255, 255, 0.12], field: [255, 255, 255, 0.07],
    text: {
      label: '#eef1f7', 'label-strong': '#ffffff', 'label-secondary': '#c4cbd9', 'label-tertiary': '#b2bacb',
      accent: '#8cb8ff', positive: '#6fdba8', negative: '#ff9d8f', warning: '#f0b04a',
    },
    solid: { bg: '#f2f4f8', fg: '#0b0f1c' }, onAccent: { bg: '#8cb8ff', fg: '#0b1830' },
  },
  light: {
    stops: ['#eef2f8', '#f1eef8', '#f7eff2'].map(hex),
    blobs: [[80, 170, 200, 0.35], [150, 120, 230, 0.32], [235, 140, 160, 0.28], [90, 190, 150, 0.28]],
    glass: [255, 255, 255, 0.62], main: [255, 255, 255, 0.55], card: [255, 255, 255, 0.55], row: [255, 255, 255, 0.6],
    navActive: [255, 255, 255, 0.7], field: [255, 255, 255, 0.55],
    text: {
      label: '#141826', 'label-strong': '#0b0f1c', 'label-secondary': '#3f4656', 'label-tertiary': '#545b6b',
      accent: '#1f5fc4', positive: '#0f7036', negative: '#ad2a20', warning: '#7f4a00',
    },
    solid: { bg: '#141826', fg: '#ffffff' }, onAccent: { bg: '#1f5fc4', fg: '#ffffff' },
  },
};

const backdrops = (t) => {
  const out = [];
  for (const s of t.stops) {
    out.push(s);
    for (const b of t.blobs) out.push(over(b, s));
  }
  return out;
};

// surface name -> function(backdrop) => composite colour the text sits on
const surfaces = (t) => ({
  'nav / top bar (glass)': (bg) => over(t.glass, bg),
  'nav active item': (bg) => over(t.navActive, over(t.glass, bg)),
  'search field': (bg) => over(t.field, over(t.glass, bg)),
  'main panel': (bg) => over(t.main, bg),
  card: (bg) => over(t.card, over(t.main, bg)),
  'row in card': (bg) => over(t.row, over(t.card, over(t.main, bg))),
});

let failed = 0;
const rows = [];
for (const [name, t] of Object.entries(themes)) {
  const bgs = backdrops(t);
  const S = surfaces(t);
  for (const [tok, h] of Object.entries(t.text)) {
    const fg = hex(h);
    let worst = { r: Infinity, s: '' };
    for (const [sn, f] of Object.entries(S)) {
      // signals and accent are not used on the nav, only label tokens are
      if (sn.startsWith('nav') && ['positive', 'negative', 'warning'].includes(tok)) continue;
      if (sn === 'search field' && tok !== 'label' && !tok.startsWith('label-')) continue;
      for (const bg of bgs) {
        const r = ratio(fg, f(bg));
        if (r < worst.r) worst = { r, s: sn };
      }
    }
    if (worst.r < 4.5) failed++;
    rows.push([name, `--${tok}`, h, worst.r.toFixed(2), worst.s, worst.r < 4.5 ? 'FAIL' : 'ok']);
  }
  for (const [label, p] of [['today / selected segment', t.solid], ['on-accent', t.onAccent]]) {
    const r = ratio(hex(p.fg), hex(p.bg));
    if (r < 4.5) failed++;
    rows.push([name, label, `${p.fg} on ${p.bg}`, r.toFixed(2), 'solid fill', r < 4.5 ? 'FAIL' : 'ok']);
  }
}
// reduced-transparency / increased-contrast fallback: opaque fills (design.md)
const opaque = { dark: { panel: '#151a2b', card: '#1d2336' }, light: { panel: '#f4f6fa', card: '#ffffff' } };
for (const [name, t] of Object.entries(themes)) {
  for (const [tok, h] of Object.entries(t.text)) {
    let worst = { r: Infinity, s: '' };
    for (const [sn, bg] of Object.entries(opaque[name])) {
      const r = ratio(hex(h), hex(bg));
      if (r < worst.r) worst = { r, s: 'opaque ' + sn };
    }
    if (worst.r < 4.5) failed++;
    rows.push([name, '--' + tok, h, worst.r.toFixed(2), worst.s, worst.r < 4.5 ? 'FAIL' : 'ok']);
  }
}
const w = [6, 26, 24, 6, 24, 4];
const line = (r) => r.map((c, i) => String(c).padEnd(w[i])).join(' ');
console.log(line(['theme', 'token', 'value', 'ratio', 'worst surface', '']));
for (const r of rows) console.log(line(r));
console.log(failed ? `\n${failed} pair(s) below 4.5:1` : '\nAll text pairs >= 4.5:1');
process.exit(failed ? 1 : 0);
