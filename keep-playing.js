/* Keeps the looping videos playing. Browsers pause videos in a background tab and do not always start them
   again when you come back, so each video is played whenever it is on screen and the tab is showing:
   on returning to the tab, on the back button, and on a check every 1.5s. A video that sits frozen
   (paused, or its time not moving) is nudged, and reloaded if a nudge is not enough.
   Videos off screen are paused, which also spares the battery. If the browser blocks autoplay
   (Low Power Mode, for example), they start on the first tap, click, key or scroll. */
(function () {
  var vids = [].slice.call(document.querySelectorAll("video[autoplay]"));
  if (!vids.length) return;
  var onScreen = new Map();   // video -> is it in view
  var lastTime = new Map(), stuck = new Map();

  function showing() { return document.visibilityState === "visible"; }
  function play(v) {
    // Autoplay is only allowed while muted, except for a video whose sound the viewer turned on (data-sound="on").
    // If the browser still refuses it with sound, it plays muted and the toggle shows that.
    var wantsSound = v.dataset.sound === "on";
    if (!wantsSound && !v.muted) v.muted = true;
    var p = v.play();
    if (p && p.catch) p.catch(function () {
      if (wantsSound && !v.muted) { v.muted = true; v.dataset.sound = "off"; play(v); return; }
      waitForGesture();
    });
  }
  function sync() {
    vids.forEach(function (v) {
      var want = showing() && onScreen.get(v) !== false;
      if (want && v.paused) play(v);
      else if (!want && !v.paused) v.pause();
    });
  }

  // Off-screen videos pause; they start again as they scroll back in.
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { onScreen.set(e.target, e.isIntersecting); });
      sync();
    }, { rootMargin: "200px 0px" });
    vids.forEach(function (v) { io.observe(v); });
  }

  // Coming back to the tab, the window, or the page through the back button.
  document.addEventListener("visibilitychange", function () { lastTime.clear(); stuck.clear(); sync(); });
  addEventListener("pageshow", sync);
  addEventListener("focus", sync);

  // Watchdog: a visible video that is paused, or whose time has not moved, gets played again;
  // after two failed checks it is reloaded (a background tab can leave a video with no decoder).
  setInterval(function () {
    if (!showing()) return;
    vids.forEach(function (v) {
      if (onScreen.get(v) === false || v.error) return;   // a file that failed to load is left alone
      if (v.paused) { play(v); return; }
      var t = v.currentTime, before = lastTime.get(v);
      lastTime.set(v, t);
      if (before === undefined || t !== before) { stuck.set(v, 0); return; }
      var n = (stuck.get(v) || 0) + 1; stuck.set(v, n);
      if (n >= 2) { stuck.set(v, 0); var at = t; v.load(); v.currentTime = at; play(v); }
      else play(v);
    });
  }, 1500);

  // Autoplay blocked: start everything on the first gesture.
  var waiting = false;
  function waitForGesture() {
    if (waiting) return; waiting = true;
    var kick = function () {
      waiting = false;
      ["pointerdown", "keydown", "touchstart", "wheel"].forEach(function (t) { removeEventListener(t, kick, true); });
      sync();
    };
    ["pointerdown", "keydown", "touchstart", "wheel"].forEach(function (t) { addEventListener(t, kick, { capture: true, passive: true }); });
  }

  sync();
})();
