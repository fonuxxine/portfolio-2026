/* All-encompassing cards: the Information Anatomy carousel, one card at a time.
   The front card is tossed aside and goes to the back of the pile every 3.6s while the deck is on screen.
   Hovering or focusing the deck pauses it. Click or swipe the front card (either way) for the next one;
   arrow keys go forward and back. Reduced motion: no autoplay. */
(function () {
  var root = document.getElementById("anat"); if (!root) return;
  var cards = [].slice.call(root.querySelectorAll(".anat-card"));
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var order = cards.slice(), busy = false, timer = 0, hovering = false, visible = false;
  // The type name under each anatomy, as in Figma (the book frame has none).
  var names = ["", "film", "music", "substack", "news", "tweet", "instagram post"];

  /* The type name stays in place and changes letter by letter: the old word lifts and fades out,
     the new one rises in, each letter 22ms after the one before. */
  var typeBox = root.querySelector(".anat-type"), shown = null;
  function setType(i) {
    if (!typeBox || i === shown) return; shown = i;
    var old = typeBox.querySelector(".w:not(.leave)");
    if (old) {
      [].forEach.call(old.children, function (ch, k) { ch.style.animationDelay = k * 14 + "ms"; });
      old.classList.add("leave");
      setTimeout(function () { old.remove(); }, reduce ? 0 : 420);
    }
    var w = document.createElement("span"); w.className = "w";
    Array.from(names[i]).forEach(function (ch, k) {
      var s = document.createElement("span"); s.textContent = ch === " " ? " " : ch;
      s.style.animationDelay = (old ? 120 : 0) + k * 22 + "ms";
      w.appendChild(s);
    });
    typeBox.appendChild(w);
  }

  function layout() {
    order.forEach(function (c, p) {
      c.dataset.pos = p < 3 ? String(p) : "hidden";
      c.setAttribute("aria-hidden", p === 0 ? "false" : "true");
    });
    setType(cards.indexOf(order[0]));
  }

  // Toss the front card off in direction dir (-1 left, 1 right), then tuck it in at the back.
  function next(dir) {
    if (busy) return; busy = true;
    var front = order.shift(); order.push(front);
    front.style.setProperty("--dir", dir || -1);
    front.classList.remove("dragging"); front.style.transform = "";
    front.classList.add("out");
    // the rest of the pile moves up at once; the tossed card keeps pos 0's stacking until it is gone
    order.forEach(function (c, p) { if (c !== front) c.dataset.pos = p < 3 ? String(p) : "hidden"; });
    setType(cards.indexOf(order[0]));
    setTimeout(function () {
      front.classList.add("snap"); front.classList.remove("out"); front.dataset.pos = "hidden";
      void front.offsetHeight; front.classList.remove("snap");
      layout(); busy = false;
    }, reduce ? 20 : 620);
  }
  // Going back (left to right): card i starts off to the left and slides in on top of the pile,
  // and the pile re-forms behind it in order.
  function slideIn(i) {
    if (busy) return; busy = true;
    var t = cards[i];
    order = cards.slice(i).concat(cards.slice(0, i));
    t.style.setProperty("--dir", -1);
    t.classList.add("snap", "out"); t.dataset.pos = "0";
    void t.offsetHeight; t.classList.remove("snap");
    layout();
    requestAnimationFrame(function () { requestAnimationFrame(function () { t.classList.remove("out"); }); });
    setTimeout(function () { busy = false; }, reduce ? 20 : 620);
  }
  function prev() { slideIn(cards.indexOf(order[order.length - 1])); }
  function goTo(i) {
    var target = cards[i], steps = order.indexOf(target);
    if (steps <= 0 || busy) return;
    if (i < cards.indexOf(order[0])) return slideIn(i);   // an earlier card: back, left to right
    // rotate all but one silently, then toss the last one for a single clean move
    var moved = order.splice(0, steps - 1);
    moved.forEach(function (c) { c.classList.add("snap"); c.dataset.pos = "hidden"; });
    order = order.concat(moved);
    layout(); moved.forEach(function (c) { void c.offsetHeight; c.classList.remove("snap"); });
    next(-1);
  }

  // How long each card stays before moving on. The book card has the most to read, so it stays longer.
  function stay() { return cards.indexOf(order[0]) === 0 ? 6500 : 3600; }
  function tick() { if (!hovering && visible && !document.hidden) next(-1); restart(); }
  function restart() { clearTimeout(timer); if (!reduce) timer = setTimeout(tick, stay()); }

  root.addEventListener("pointerenter", function (e) { if (e.pointerType === "mouse") hovering = true; });
  root.addEventListener("pointerleave", function () { hovering = false; });
  root.addEventListener("focusin", function () { hovering = true; });
  root.addEventListener("focusout", function () { hovering = false; });
  root.addEventListener("keydown", function (e) {
    if (e.key === "ArrowRight") { e.preventDefault(); next(-1); restart(); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); prev(); restart(); }
  });
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (es) { visible = es[0].isIntersecting; }, { threshold: 0.5 }).observe(root);
  } else visible = true;

  // Drag the front card sideways; let go past 60px and it is tossed that way, otherwise it springs back.
  var drag = null;
  cards.forEach(function (c) {
    c.addEventListener("pointerdown", function (e) {
      if (busy || order[0] !== c || e.button) return;
      drag = { c: c, x: e.clientX, dx: 0, moved: false };
      c.setPointerCapture(e.pointerId);
    });
    c.addEventListener("pointermove", function (e) {
      if (!drag || drag.c !== c) return;
      drag.dx = e.clientX - drag.x;
      if (Math.abs(drag.dx) > 4) { drag.moved = true; c.classList.add("dragging"); }
      if (drag.moved) c.style.transform = "translateX(" + drag.dx + "px) rotate(" + drag.dx / 40 + "deg)";
    });
    function end() {
      if (!drag || drag.c !== c) return;
      var d = drag; drag = null;
      c.classList.remove("dragging");
      if (!d.moved) { next(-1); restart(); return; }          // a plain click
      // swipe right to left: next card; swipe left to right: the previous card comes back in from the left
      if (d.dx < -60) { next(-1); restart(); }
      else if (d.dx > 60) { c.style.transform = ""; prev(); restart(); }
      else c.style.transform = "";                            // spring back
    }
    c.addEventListener("pointerup", end);
    c.addEventListener("pointercancel", function () { if (drag && drag.c === c) { drag = null; c.classList.remove("dragging"); c.style.transform = ""; } });
  });

  layout(); restart();
})();
