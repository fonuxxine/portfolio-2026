/* Spacing redlines, in the manner of a design spec: every image (slide, clip, placeholder, card stack) is
   outlined, the text right above and below it is boxed with a dashed line, and the gap between them is
   shaded and measured in px. Measured live from the page, so the numbers are true at any window size.
   On for now; press S to hide or show. */
(function () {
  document.documentElement.classList.add("sp-off");   // off by default; press S to show
  var PINK = "#e0306f";
  var ALL = !!document.querySelector("main.body");   // the case study measures every gap, not just text ↔ image
  var MEDIA = ".gframe, .clip, .ph, .stack";
  var TEXT = ".eyebrow, .project h2, .hero h1, .label, .body h2, .body h3, .body h4, .body p, .body li, .meta dt, .meta dd";

  var css = document.createElement("style");
  css.textContent =
    ".sp-layer{position:absolute;left:0;top:0;width:100%;pointer-events:none;z-index:900;transition:opacity .2s ease}" +
    "html.sp-off .sp-layer,html.sp-off .sp-chip{opacity:0}" +
    ".sp-box{position:absolute;border:1px dashed " + PINK + ";box-sizing:border-box}" +
    ".sp-box.t{background:rgba(224,48,111,.05)}" +
    ".sp-box.m{border-style:solid;border-color:rgba(224,48,111,.55)}" +
    ".sp-band{position:absolute;background:rgba(224,48,111,.12)}" +
    ".sp-rule{position:absolute;width:9px;border-top:1px solid " + PINK + ";border-bottom:1px solid " + PINK + ";box-sizing:border-box}" +
    ".sp-rule::after{content:'';position:absolute;left:4px;top:0;bottom:0;border-left:1px solid " + PINK + "}" +
    ".sp-rule.h{height:9px;border:0;border-left:1px solid " + PINK + ";border-right:1px solid " + PINK + "}" +
    ".sp-rule.h::after{left:0;right:0;top:4px;bottom:auto;border-left:0;border-top:1px solid " + PINK + "}" +
    ".sp-tag{position:absolute;transform:translateY(-50%);white-space:nowrap;padding:2px 6px;border-radius:6px;" +
    "background:#fff;box-shadow:0 0 0 .5px rgba(224,48,111,.45);font:600 11px/1.2 ui-monospace,'SF Mono',Menlo,monospace;color:" + PINK + "}" +
    ".sp-chip{position:fixed;right:max(12px,env(safe-area-inset-right,0px));bottom:max(12px,env(safe-area-inset-bottom,0px));z-index:9001;" +
    "pointer-events:none;padding:6px 10px;border-radius:8px;background:rgba(255,255,255,.92);box-shadow:0 0 0 .5px rgba(224,48,111,.4),0 1px 3px rgba(0,0,0,.12);" +
    "font:500 11px/1.3 ui-monospace,'SF Mono',Menlo,monospace;color:" + PINK + ";transition:opacity .2s ease}" +
    ".sp-chip span{opacity:.6;margin-left:6px}";
  document.head.appendChild(css);

  var layer = document.createElement("div"); layer.className = "sp-layer"; layer.setAttribute("aria-hidden", "true");
  var chip = document.createElement("div"); chip.className = "sp-chip"; chip.setAttribute("aria-hidden", "true");
  chip.innerHTML = (ALL ? "spacing: all gaps" : "spacing: text ↔ image") + "<span>S hides</span>";
  document.body.appendChild(layer); document.body.appendChild(chip);

  function box(el) {
    var r = el.getBoundingClientRect();
    return { el: el, l: r.left + scrollX, r: r.right + scrollX, t: r.top + scrollY, b: r.bottom + scrollY, w: r.width, h: r.height };
  }
  function visible(b) { return b.w > 1 && b.h > 1 && getComputedStyle(b.el).visibility !== "hidden"; }
  function add(cls, s) { var d = document.createElement("div"); d.className = cls; for (var k in s) d.style[k] = s[k]; layer.appendChild(d); return d; }

  function draw() {
    layer.innerHTML = "";
    // Size to the page's content, leaving out this layer and the grid overlays. Measuring scrollHeight
    // counted the overlays themselves, so after a resize the page kept its old height (empty space at the end).
    var h = innerHeight;
    [].forEach.call(document.body.children, function (c) {
      if (c.matches(".grid-rows, .grid-overlay, .grid-info, .sp-layer, .sp-chip, script, style")) return;
      var cs = getComputedStyle(c); if (cs.position === "fixed" || cs.display === "none") return;
      h = Math.max(h, c.getBoundingClientRect().bottom + scrollY + (parseFloat(cs.marginBottom) || 0));
    });
    layer.style.height = Math.ceil(h) + "px";
    var media = [].slice.call(document.querySelectorAll(MEDIA)).filter(function (el) {
      return !el.parentElement.closest(MEDIA);            // an image inside another image counts once
    }).map(box).filter(visible);
    var text = [].slice.call(document.querySelectorAll(TEXT)).filter(function (el) {
      return !el.closest(MEDIA) && !el.closest(".toc") && el.textContent.trim();
    }).map(box).filter(visible);
    if (ALL) media = media.concat([].slice.call(document.querySelectorAll(".rule")).map(box).filter(function (b) { return b.w > 1; }));
    var all = media.map(function (m) { m.media = true; return m; }).concat(text);
    var boxed = [], seen = {};
    function mark(b) { if (boxed.indexOf(b) < 0) boxed.push(b); }
    function once(key) { if (seen[key]) return false; seen[key] = 1; return true; }

    // Vertical gaps. Home page: only text ↔ image. Case study: every block to the next one below it.
    (ALL ? all : media).forEach(function (m) {
      [-1, 1].forEach(function (dir) {
        if (ALL && dir < 0) return;                       // each gap once: measured from the block above
        var best = null, bestGap = Infinity;
        all.forEach(function (o) {
          if (o === m || Math.min(o.r, m.r) - Math.max(o.l, m.l) <= 1) return;
          var gap = dir < 0 ? m.t - o.b : o.t - m.b;
          if (gap > -0.5 && gap < bestGap) { bestGap = gap; best = o; }
        });
        if (!best || (!ALL && best.media)) return;
        var top = dir < 0 ? best.b : m.b, h = Math.max(0, bestGap);
        if (h < 0.5) return;                              // touching blocks: no gap to measure
        var l = Math.min(m.l, best.l), w = Math.max(m.r, best.r) - l;
        if (!once("v" + Math.round(top) + "|" + Math.round(h) + "|" + Math.round(l))) return;
        mark(best); mark(m);
        add("sp-band", { left: l + "px", top: top + "px", width: w + "px", height: h + "px" });
        // measure in the margin when there is room, otherwise just inside the left edge
        var inside = l < 84, x = inside ? l + 8 : l - 20;
        add("sp-rule", { left: x + "px", top: top + "px", height: Math.max(1, h) + "px" });
        var tag = add("sp-tag", { top: top + h / 2 + "px" });
        tag.textContent = Math.round(h * 10) / 10 + "px";
        if (inside) tag.style.left = x + 14 + "px"; else tag.style.right = (document.documentElement.clientWidth - x + 6) + "px";
      });
    });
    // Horizontal gaps (case study): side-by-side blocks such as the three columns, the pair and the meta row.
    if (ALL) all.forEach(function (a) {
      var best = null, bestGap = Infinity;
      all.forEach(function (o) {
        if (o === a || Math.min(o.b, a.b) - Math.max(o.t, a.t) <= 1) return;
        var gap = o.l - a.r;
        if (gap >= 0.5 && gap < bestGap) { bestGap = gap; best = o; }
      });
      if (!best) return;
      var t = Math.max(a.t, best.t), h = Math.min(a.b, best.b) - t;
      if (!once("h" + Math.round(a.r) + "|" + Math.round(bestGap) + "|" + Math.round(t))) return;
      mark(a); mark(best);
      add("sp-band", { left: a.r + "px", top: t + "px", width: bestGap + "px", height: h + "px" });
      add("sp-rule h", { left: a.r + "px", top: t + 6 + "px", width: bestGap + "px" });
      var tag = add("sp-tag", { left: a.r + bestGap / 2 + "px", top: t + 6 + "px" });
      tag.style.transform = "translate(-50%, -120%)";
      tag.textContent = Math.round(bestGap * 10) / 10 + "px";
    });
    boxed.forEach(function (b) {
      add("sp-box " + (b.media ? "m" : "t"), { left: b.l + "px", top: b.t + "px", width: b.w + "px", height: b.h + "px" });
    });
  }

  var queued = 0;
  function redraw() { if (!queued) queued = requestAnimationFrame(function () { queued = 0; draw(); }); }
  redraw();
  addEventListener("resize", redraw); addEventListener("load", redraw);
  if (document.fonts) document.fonts.ready.then(function () { setTimeout(redraw, 50); });
  if (window.ResizeObserver) new ResizeObserver(redraw).observe(document.body);
  setTimeout(redraw, 600); setTimeout(redraw, 1500);   // after the title animations settle
  addEventListener("keydown", function (e) {
    if ((e.key === "s" || e.key === "S") && !e.metaKey && !e.ctrlKey && !/INPUT|TEXTAREA/.test(document.activeElement.tagName))
      document.documentElement.classList.toggle("sp-off");
  });
})();
