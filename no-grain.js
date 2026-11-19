/* Keeps the paper grain off the prototypes. The grain is one fixed layer over the whole page (body::after),
   so each prototype screen (the phone recordings and the app windows) is cut out of it with a mask:
   a viewport-sized SVG, opaque everywhere except a rounded hole over each visible screen. The holes follow
   the screens every frame, so scrolling, the hover lift and the image wipe all stay grain-free. */
(function () {
  // The main image's phones (.shot) are left out on purpose: they keep the grain, like the home page.
  var SEL = ".bgopt .phone video, .win video, .win img";
  var st = document.createElement("style");
  st.textContent = "body::after{-webkit-mask-image:var(--grain-mask,none);mask-image:var(--grain-mask,none);" +
    "-webkit-mask-size:100% 100%;mask-size:100% 100%;-webkit-mask-repeat:no-repeat;mask-repeat:no-repeat}";
  document.head.appendChild(st);
  var body = document.body, last = "";

  // The part of the screen actually showing: the element's box, trimmed by any ancestor that clips it.
  function visible(el) {
    var r = el.getBoundingClientRect(), L = r.left, T = r.top, R = r.right, B = r.bottom;
    var rad = parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0;
    for (var p = el.parentElement, n = 0; p && p !== body && n < 6; p = p.parentElement, n++) {
      var cs = getComputedStyle(p);
      if (cs.overflow === "visible" && cs.overflowY === "visible") continue;
      var q = p.getBoundingClientRect();
      L = Math.max(L, q.left); T = Math.max(T, q.top); R = Math.min(R, q.right); B = Math.min(B, q.bottom);
      if (!rad) rad = parseFloat(cs.borderTopLeftRadius) || 0;   // the screen's own corners: its nearest rounded clip
    }
    return R - L > 1 && B - T > 1 ? [L, T, R, B, rad] : null;
  }
  // A rounded rectangle painted black inside the SVG mask. Black shapes simply merge, so screens that overlap
  // (the side phones tuck behind the middle one) make one clean hole instead of cancelling each other out.
  function hole(b) {
    var r = Math.min(b[4], (b[2] - b[0]) / 2, (b[3] - b[1]) / 2);
    return '<rect x="' + b[0] + '" y="' + b[1] + '" width="' + (b[2] - b[0]) + '" height="' + (b[3] - b[1]) + '" rx="' + r + '"/>';
  }
  function frame() {
    var W = innerWidth, H = innerHeight, holes = "";
    document.querySelectorAll(SEL).forEach(function (el) {
      var b = visible(el);
      if (!b || b[3] < 0 || b[1] > H || b[2] < 0 || b[0] > W) return;
      holes += hole(b.map(function (v) { return Math.round(v * 2) / 2; }));
    });
    var key = holes ? W + "x" + H + holes : "";
    if (key !== last) {
      last = key;
      body.style.setProperty("--grain-mask", holes ? 'url("data:image/svg+xml,' + encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + " " + H +
        '"><mask id="m"><rect width="100%" height="100%" fill="#fff"/><g fill="#000">' + holes + '</g></mask>' +
        '<rect width="100%" height="100%" fill="#000" mask="url(#m)"/></svg>') + '")' : "none");
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
