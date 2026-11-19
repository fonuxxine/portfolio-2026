/* Messages flow animation engine.
   Used by index.html (final) and tuner.html (live tuning). */
(function () {
  const DEFAULTS = {
    // timing (ms)
    startDelay: 400,
    step: 1400,
    moveDuration: 750,
    fadeDuration: 600,
    scrollLead: 0,       // stack scrolls up this long before the new bubble enters
    hold: 3000,
    restartGap: 900,
    // motion
    enterOffset: 60,     // px below final slot
    enterScale: 1,
    exitDrift: 0,        // extra px the leaving bubble travels upward
    outroDrift: 20,
    easing: [0.22, 1, 0.36, 1],
    // word-by-word reveal
    wordReveal: true,
    wordTarget: "a",     // "all" | "q" | "a" (questions come in whole)
    wordDelay: 150,      // after the bubble starts entering
    wordStagger: 60,     // between words
    wordFade: 400,       // each word's fade
    wordRise: 4,         // px each word rises
    wordBlur: 0,         // px blur each word starts with
    // layout
    top: 53,
    gap: 20,
    maxVisible: 3,
    // playback
    speed: 1,
    loop: true,
    messages: [
      { type: "q", text: "What happened?" },
      { type: "a", text: "People gets attention on social media" },
      { type: "q", text: "What is that important?" },
      { type: "a", text: "These media platforms orchestrate the flow of attention" },
      { type: "q", text: "How do you feel about that reality?", wrap: true },
      { type: "a", text: "Now I realized that my attention is being regulated by these platforms." },
    ],
  };

  function create(card, initial) {
    let cfg = { ...DEFAULTS, ...(initial || {}) };
    let tasks = [], vt = 0, last = null, paused = false, cycleStart = 0;
    const listeners = new Set();

    const d = (ms) => ms / cfg.speed;
    const at = (ms, fn) => tasks.push({ t: vt + d(ms), fn });
    const bezier = () => `cubic-bezier(${cfg.easing.join(",")})`;

    function tick() {
      const now = performance.now();
      if (last == null) last = now;
      // cap the step so a backgrounded tab doesn't fire a burst of messages on return
      if (!paused) vt += Math.min(now - last, 250);
      last = now;
      tasks.sort((a, b) => a.t - b.t);
      while (tasks.length && tasks[0].t <= vt) tasks.shift().fn();
      listeners.forEach((fn) => fn(vt - cycleStart));
    }
    // timer-driven clock (rAF can stall in embedded/preview views)
    setInterval(tick, 16);

    function place(el, y, o, s = 1) {
      el.style.transform = `translateY(${y}px) scale(${s})`;
      el.style.opacity = o;
    }
    function setTransition(el) {
      el.style.transition =
        `transform ${d(cfg.moveDuration)}ms ${bezier()}, ` +
        `opacity ${d(cfg.fadeDuration)}ms ${bezier()}`;
    }
    function layout(list) {
      let y = cfg.top;
      for (const el of list) {
        place(el, y, 1);
        el._y = y;
        y += el.offsetHeight + cfg.gap;
      }
      return y;
    }
    function slotAfter(list) {
      let y = cfg.top;
      for (const el of list) y += el.offsetHeight + cfg.gap;
      return y;
    }

    const usesWords = (m) =>
      cfg.wordReveal && (cfg.wordTarget === "all" || cfg.wordTarget === m.type);

    // Wrap each word in a span (spaces stay as text so lines still wrap)
    function splitWords(p, text) {
      const spans = [];
      text.split(/(\s+)/).forEach((part) => {
        if (!part) return;
        if (/^\s+$/.test(part)) { p.appendChild(document.createTextNode(part)); return; }
        const s = document.createElement("span");
        s.className = "word";
        s.textContent = part;
        // Stay inline (inline-block breaks text-box trim on relayout in Chrome);
        // the rise uses relative `top`, which never affects line layout.
        s.style.position = "relative";
        s.style.top = `${cfg.wordRise}px`;
        s.style.opacity = 0;
        if (cfg.wordBlur) s.style.filter = `blur(${cfg.wordBlur}px)`;
        p.appendChild(s);
        spans.push(s);
      });
      return spans;
    }

    function revealWords(spans) {
      const fade = `${d(cfg.wordFade)}ms ${bezier()}`;
      spans.forEach((s, i) => {
        const delay = `${d(cfg.wordDelay + i * cfg.wordStagger)}ms`;
        s.style.transition = `opacity ${fade} ${delay}, top ${fade} ${delay}, filter ${fade} ${delay}`;
        s.style.opacity = 1;
        s.style.top = "0px";
        s.style.filter = "none";
      });
    }

    function cycleLength() {
      const n = cfg.messages.length;
      return d(cfg.startDelay + Math.max(0, n - 1) * cfg.step + cfg.scrollLead + cfg.hold + cfg.restartGap);
    }

    function restart() {
      tasks = [];
      card.querySelectorAll(".msg").forEach((n) => n.remove()); // keep static content (caption)
      cycleStart = vt;
      if (paused) resume();
      const visible = [];

      cfg.messages.forEach((m, i) => {
        at(cfg.startDelay + i * cfg.step, () => {
          const el = document.createElement("div");
          el.className = `msg ${m.type}${m.wrap ? " wrap" : ""}`;
          const p = document.createElement("p");
          const words = usesWords(m) ? splitWords(p, m.text) : (p.textContent = m.text, []);
          el.appendChild(p);
          el.style.transition = "none";
          place(el, 0, 0);
          card.appendChild(el);

          if (visible.length >= cfg.maxVisible) {
            const out = visible.shift();
            const shift = visible.length ? visible[0]._y - cfg.top : 0;
            setTransition(out);
            place(out, out._y - shift - cfg.exitDrift, 0);
            at(cfg.moveDuration + 200, () => out.remove());
            layout(visible);
          }

          const start = slotAfter(visible);
          place(el, start + cfg.enterOffset, 0, cfg.enterScale);
          el.offsetHeight; // commit start state
          at(cfg.scrollLead, () => {
            setTransition(el);
            visible.push(el);
            layout(visible);
            revealWords(words);
          });
        });
      });

      const n = cfg.messages.length;
      const end = cfg.startDelay + Math.max(0, n - 1) * cfg.step + cfg.scrollLead + cfg.hold;
      at(end, () => visible.forEach((el) => place(el, el._y - cfg.outroDrift, 0)));
      at(end + cfg.restartGap, () => (cfg.loop ? restart() : null));
    }

    function pause() {
      paused = true;
      card.getAnimations({ subtree: true }).forEach((a) => a.pause());
    }
    function resume() {
      paused = false;
      card.getAnimations({ subtree: true }).forEach((a) => a.play());
    }

    return {
      restart,
      pause,
      resume,
      get paused() { return paused; },
      get config() { return cfg; },
      set(patch, { replay = true } = {}) {
        cfg = { ...cfg, ...patch };
        if (replay) restart();
      },
      cycleLength,
      onTick(fn) { listeners.add(fn); },
    };
  }

  window.MessagesFlow = { create, DEFAULTS };
})();
