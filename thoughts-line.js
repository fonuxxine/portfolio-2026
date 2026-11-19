/* "Thoughts into words": one unbroken pen line. A tangled ball of thought unspools into a short
   sentence, which slides away left as the line leads on into the next tangle and the next sentence. */
(() => {
  const root = document.querySelector('.clip.tw, .stage.tw');
  if (!root) return;
  const PHRASES = ['I think', 'I feel', 'I realize'];

  const f = n => n.toFixed(2);
  const P = pts => pts.map(p => f(p[0]) + ' ' + f(p[1])).join(' ');
  const smooth = k => k * k * (3 - 2 * k);

  // ---------- The ball: a dense scribble, a little different each time ----------
  const C = [100, 90], STEPS = 36;
  function ball(seed) {
    const rnd = () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    const ph = Array.from({ length: 8 }, () => rnd() * Math.PI * 2);
    // same loop count, size and spread every time; the random path and a little squash make each ball its own
    const turns = 20;                                   // 20 loops
    const r0 = 40;                                      // the original loop size
    const spread = 1;                                   // the original drift from the middle
    const wob = 1;                                      // the original variation in loop size
    const sxb = 0.8 + rnd() * 0.55, syb = 0.68 + rnd() * 0.5;   // wide and flat to tall and narrow
    const pts = [], total = turns * STEPS;
    for (let i = 0; i <= total; i++) {
      const th = (i / STEPS) * Math.PI * 2;
      // centre and radius wander, so each loop lands somewhere new inside the ball
      let cx = C[0] + spread * (34 * Math.sin(th * 0.131 + ph[0]) + 14 * Math.sin(th * 0.417 + ph[1]));
      let cy = C[1] + spread * (30 * Math.sin(th * 0.167 + ph[2]) + 12 * Math.sin(th * 0.449 + ph[3]));
      let r  = r0 + wob * (14 * Math.sin(th * 0.233 + ph[4]) + 7 * Math.sin(th * 0.571 + ph[5]));
      let sx = sxb + 0.12 * Math.sin(th * 0.07 + ph[6]), sy = syb - 0.1 * Math.sin(th * 0.09 + ph[7]);
      // the last loop opens out to the right edge at mid-height, where the tail leaves
      const w = smooth(Math.max(0, (i - (total - STEPS * 1.2)) / (STEPS * 1.2)));
      cx += (C[0] - cx) * w; cy += (C[1] - cy) * w; r += (82 - r) * w; sx += (1 - sx) * w; sy += (1 - sy) * w;
      // the first loop starts small, where the line comes in
      const lead = 0.35 + 0.65 * smooth(Math.min(1, i / (STEPS * 0.8)));
      pts.push([cx + Math.cos(th) * r * sx * lead, cy + Math.sin(th) * r * sy * lead]);
    }
    let d = '';
    for (let i = 1; i < pts.length - 1; i++) {
      const m = [(pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2];
      d += `Q${P([pts[i], m])}`;
    }
    const E = pts[pts.length - 1];           // heading down at the right edge
    const T = [E[0] + 16, E[1] + 9];         // the tail starts just past a small hook
    d += `L${P([E])}C${P([[E[0], E[1] + 7], [T[0] - 9, T[1]], T])}`;
    return { start: pts[0], d, T };
  }

  // Tail: the line from the Figma frame, stretched 10%
  const FIG = [[1,30.7336],[2.35698,29.4469],[11.6529,25.3563],[46.3973,21.1754],[66.9444,18.703],[102.875,18.8597],[121.995,18.3231],[142.449,17.7491],[149.741,18.1148],[162.831,18.2531],[189.652,18.5366],[198.068,16.0708],[204.375,14.1606],[210.714,12.2407],[217.856,8.96154],[224.309,6.7008],[230.818,4.42055],[236.826,4.14501],[261.433,1.6977],[287.303,-0.875283],[301.465,4.32127],[308.31,6.70169],[314.017,8.68627],[320.154,11.5862],[326.669,14.3444],[334.841,17.7554],[339.928,20.2965],[345.299,22.9918],[346.543,23.5874],[347.63,24.1283],[351.208,26.3248]];
  function tailFrom(T) {
    const tp = FIG.map(([x, y]) => [T[0] + (x - 1) * 1.1, T[1] + (y - 30.7336)]);
    let d = '';
    for (let i = 1; i < tp.length; i += 3) d += `C${P(tp.slice(i, i + 3))}`;
    return { d, tip: tp[tp.length - 1] };
  }

  // ---------- Joined-up letters ----------
  // Each letter is drawn from where the last one left off, on a baseline at y=0
  // (x-height ~20, ascenders ~48), and ends where the next one picks up.
  const L = {
    I: [[4,0, 8,1, 13,0], [14,-16, 14,-32, 14,-47], [10,-48, 6,-48, 3,-47], [10,-49, 19,-49, 25,-47],
        [21,-48, 16,-48, 14,-46], [14,-32, 14,-16, 14,-1], [18,0, 22,1, 26,0]],
    ' ': [[10,-4, 22,-6, 30,-6]],
    a: [[4,-12, 10,-18, 14,-17], [8,-22, -2,-18, -2,-8], [-2,0, 10,0, 14,-12], [14,-18, 14,-6, 16,-1], [17,2, 21,0, 24,-4]],
    e: [[8,-6, 14,-14, 10,-20], [6,-24, -2,-16, 0,-6], [1,1, 8,2, 16,-5]],
    f: [[8,-16, 16,-40, 12,-48], [9,-53, 2,-48, 3,-34], [4,-20, 5,0, 5,16], [5,27, 13,25, 12,13], [11,3, 9,-5, 18,-8]],
    h: [[6,-34, 10,-46, 6,-50], [2,-52, -2,-44, -1,-30], [0,-18, 0,-8, 0,0], [2,-12, 8,-20, 14,-18], [19,-16, 18,-6, 20,0], [21,2, 24,0, 28,-5]],
    // i: the pen can't lift for the dot, so it runs up a short neck, ties a tiny loop
    // (which fills in solid at this stroke weight) and comes back down the same way
    i: [[4,-6, 8,-14, 10,-22], [10,-25, 11,-29, 11,-31], [9,-31, 8,-35, 11,-35], [14,-35, 14,-31, 11,-31],
        [11,-29, 10,-25, 10,-22], [9,-14, 9,-5, 10,0], [11,2, 14,0, 17,-4]],
    k: [[6,-18, 12,-40, 8,-48], [4,-53, -2,-46, 0,-30], [1,-16, 1,-6, 1,0], [3,-10, 10,-21, 15,-18],
        [19,-15, 12,-9, 4,-9], [10,-8, 14,-2, 18,0], [20,1, 23,-1, 26,-4]],
    l: [[8,-18, 16,-40, 11,-50], [6,-55, -2,-46, 1,-30], [2,-16, 3,-2, 7,0], [11,2, 15,-2, 19,-4]],
    n: [[3,-10, 6,-18, 8,-20], [9,-14, 8,-6, 8,0], [10,-12, 15,-20, 20,-18], [24,-16, 23,-6, 25,0], [26,2, 29,0, 32,-4]],
    r: [[3,-10, 5,-16, 6,-20], [8,-22, 11,-17, 14,-19], [15,-14, 14,-6, 15,0], [16,2, 19,0, 22,-4]],
    // t: up, back down, then the crossbar goes right through the stem and doubles back
    t: [[4,-14, 6,-26, 8,-36], [7,-26, 5,-10, 6,-2], [7,2, 12,2, 16,-4], [20,-8, 24,-18, 22,-22],
        [14,-23, 4,-23, -4,-22], [-8,-22, -8,-25, -4,-25], [6,-25, 16,-24, 24,-22]],
    z: [[2,-12, 3,-18, 5,-20], [10,-21, 14,-21, 19,-20], [13,-14, 7,-6, 3,0], [9,1, 15,-1, 21,0], [24,0, 26,-2, 28,-4]],
  };
  const K = 1.45;                            // hand size on the card
  function write(text, at) {
    let ox = 0, d = '', end = [0, 0];
    const hp = (x, y) => [at[0] + (ox + x) * K, at[1] + y * K];
    for (const ch of text) {
      const segs = L[ch] || L[' '];
      for (const s of segs) d += `C${P([hp(s[0], s[1]), hp(s[2], s[3]), hp(s[4], s[5])])}`;
      const last = segs[segs.length - 1];
      end = hp(last[4], last[5]);
      ox += last[4];
    }
    return { d, end };
  }

  // ---------- Cycles: each has a fresh ball, the next phrase, and leads into the following ball ----------
  const WORDS_AT = [372, 300];               // where the first letter sits on the card
  const START = [423 - C[0], 277 - C[1]];    // ball centred on the card
  const phraseOf = n => PHRASES[((n % PHRASES.length) + PHRASES.length) % PHRASES.length];
  const balls = new Map(), cycles = new Map();
  const ballOf = n => { if (!balls.has(n)) balls.set(n, ball(11 + n * 7919)); return balls.get(n); };
  // ---------- Drawing ----------
  const NS = 'http://www.w3.org/2000/svg';
  const g0 = root.querySelector('.thread');
  const proto = g0.querySelector('path');
  const g1 = g0.cloneNode(true);
  g0.parentNode.insertBefore(g1, g0);
  const p0 = g0.querySelector('path'), p1 = g1.querySelector('path');

  const bez = (x1, y1, x2, y2) => t => {
    let u = t;
    for (let i = 0; i < 8; i++) {
      const cx = 3*x1*u*(1-u)**2 + 3*x2*u*u*(1-u) + u**3 - t;
      const dx = 3*x1*(1-u)**2 + 6*(x2-x1)*u*(1-u) + 3*(1-x2)*u*u;
      if (Math.abs(dx) < 1e-6) break;
      u = Math.min(1, Math.max(0, u - cx / dx));
    }
    return 3*y1*u*(1-u)**2 + 3*y2*u*u*(1-u) + u**3;
  };
  const scribbleIn = bez(.3, .2, .8, .8);    // picks up from the lead-in, then into the tail
  const pull = bez(.3, .55, .6, .85);
  const leadOn = bez(.3, .3, .6, .9);        // leaves the last letter at writing pace, slows into the ball
  const inOut = bez(.65, 0, .35, 1);
  const seg = (t, a, b) => Math.min(1, Math.max(0, (t - a) / (b - a)));
  const lerp = (a, b, k) => a + (b - a) * k;

  function cycleOf(n) {
    if (cycles.has(n)) return cycles.get(n);
    const b = ballOf(n), tail = tailFrom(b.T), words = write(phraseOf(n), tail.tip);
    const X = words.end, D = X[0] + 295;     // the next ball sits this far along
    const nb = ballOf(n + 1).start, NX = nb[0] + D, NY = nb[1], LY = X[1] + 3;
    const lead =
      `C${P([[X[0] + 40, X[1] + 3], [X[0] + 80, X[1] + 12], [X[0] + 130, LY + 6]])}` +
      `S${P([[X[0] + 230, LY - 10], [X[0] + 290, LY - 2]])}` +
      `S${P([[NX - 150, NY + 14], [NX - 90, NY + 8]])}` +
      `S${P([[NX - 26, NY + 16], [NX, NY]])}`;
    const parts = [`M${P([b.start])}` + b.d, tail.d, words.d, lead];
    const c = { D };
    let acc = '', prev = 0;
    c.len = parts.map(part => { acc += part; proto.setAttribute('d', acc); const l = proto.getTotalLength(); const r = l - prev; prev = l; return r; });
    c.d = acc; c.total = prev;
    c.DRAW_END = 2.8; c.ARRIVE = 6.0;
    c.WRITE_END = c.ARRIVE + c.len[2] / 320;
    c.LOOP = c.WRITE_END + 3.0;
    c.PAN_FROM = c.WRITE_END + 0.6;          // a beat to read, then the words slide away left
    c.END = [WORDS_AT[0] - tail.tip[0], WORDS_AT[1] - tail.tip[1]];
    cycles.set(n, c);
    for (const k of [...cycles.keys()]) if (k < n - 2) cycles.delete(k);
    for (const k of [...balls.keys()]) if (k < n - 2) balls.delete(k);
    return c;
  }

  const cam = (c, t) => {
    const out = inOut(seg(t, c.DRAW_END, c.ARRIVE)), on = inOut(seg(t, c.PAN_FROM, c.LOOP));
    const a = [lerp(START[0], c.END[0], out), lerp(START[1], c.END[1], out)];
    return [lerp(a[0], START[0] - c.D, on), lerp(a[1], START[1], on)];
  };
  const drawn = (c, t) =>
      c.len[0] * scribbleIn(seg(t, 0, c.DRAW_END))
    + c.len[1] * pull(seg(t, c.DRAW_END, c.ARRIVE))
    + c.len[2] * seg(t, c.ARRIVE, c.WRITE_END)
    + c.len[3] * leadOn(seg(t, c.WRITE_END, c.LOOP));

  // time is kept as (which cycle, seconds into it), so the loop never has to repeat itself
  let n = 0, t = 0, shown = null;
  const advance = dt => { t += dt; while (t >= cycleOf(n).LOOP) { t -= cycleOf(n).LOOP; n++; } };
  function render() {
    const c = cycleOf(n), prev = cycleOf(n - 1);
    if (shown !== n) {                       // swap in this cycle's path, and the last one behind it
      p0.setAttribute('d', c.d); p0.style.strokeDasharray = `${c.total} ${c.total}`;
      p1.setAttribute('d', prev.d); p1.style.strokeDasharray = 'none';
      shown = n;
    }
    // the pen never lifts: ball, tail, words, and on into the next ball
    p0.style.strokeDashoffset = c.total - drawn(c, t);
    const [x, y] = cam(c, t);
    g0.setAttribute('transform', `translate(${x} ${y})`);
    g1.setAttribute('transform', `translate(${x - prev.D} ${y})`);
  }

  const qs = new URLSearchParams(location.search);
  if (qs.has('tw')) {                        // preview a moment: ?tw=seconds, or ?tw=hold1 (a sentence) or ?tw=ball1 (a finished ball)
    const v = qs.get('tw'), m = /^(hold|ball)(\d+)$/.exec(v);
    if (m) { n = +m[2] - 1; t = m[1] === 'ball' ? cycleOf(n).DRAW_END + 0.1 : cycleOf(n).WRITE_END + 0.3; } else advance(parseFloat(v));
    render();
    return;
  }
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) { t = cycleOf(0).WRITE_END + 0.3; render(); return; }

  let visible = true, last = null, raf = 0;
  const tick = now => {
    if (last !== null) advance(Math.min(now - last, 100) / 1000);
    last = now; render();
    raf = visible ? requestAnimationFrame(tick) : 0;
  };
  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible && !raf) { last = null; raf = requestAnimationFrame(tick); }
  }).observe(root);
  render();
  raf = raf || requestAnimationFrame(tick);
})();
