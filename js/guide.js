/* ─────────────────────────────────────────────────────────────
 * guide.js · paged-deck navigation for the AI-native field guide
 *
 * Progressive enhancement: without JS the slides flow as a plain
 * scroll. This script adds `.js` to <html>, then drives one slide
 * at a time — tabs, prev/next, dots, keyboard, swipe, hash routing,
 * focus management and an aria-live announcer.
 * ───────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  var root = document.documentElement;
  root.classList.add('js');

  var CHAPTERS = [
    { id: 'why',    label: 'Why now' },
    { id: 'shift',  label: 'The shift' },
    { id: 'system', label: 'The system' },
    { id: 'pieces', label: 'The pieces' },
    { id: 'moat',   label: 'The moat' },
    { id: 'start',  label: 'Start' }
  ];

  var deck    = document.getElementById('deck');
  var slides  = Array.prototype.slice.call(deck.querySelectorAll('.slide'));
  var tabs    = Array.prototype.slice.call(document.querySelectorAll('.tab'));
  var prevBtn = document.querySelector('.ctrl--prev');
  var nextBtn = document.querySelector('.ctrl--next');
  var edgeBtn = document.querySelector('.edge-hint');
  var dotsBox = document.querySelector('.dots');
  var counter = document.querySelector('.counter');
  var live    = document.getElementById('live');

  if (!slides.length) return;

  var supportsInert = 'inert' in HTMLElement.prototype;
  var index = 0;

  /* ── chapter helpers ──────────────────────────────────────── */
  function chapterOf(i) { return slides[i].getAttribute('data-chapter'); }

  function chapterSlides(chId) {
    return slides.filter(function (s) { return s.getAttribute('data-chapter') === chId; });
  }

  function localPosition(i) {
    var chId = chapterOf(i);
    var first = slides.indexOf(chapterSlides(chId)[0]);
    return i - first; // 0-based position within the chapter
  }

  /* ── dots rebuilt per chapter ─────────────────────────────── */
  function buildDots() {
    var chId  = chapterOf(index);
    var group = chapterSlides(chId);
    var here  = localPosition(index);
    dotsBox.innerHTML = '';
    group.forEach(function (s, n) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'dot';
      b.setAttribute('aria-label', 'Page ' + (n + 1) + ' of ' + group.length + ' in ' + chId);
      if (n === here) b.setAttribute('aria-current', 'true');
      b.addEventListener('click', function () {
        go(slides.indexOf(group[n]));
      });
      dotsBox.appendChild(b);
    });
  }

  /* ── render the current state ─────────────────────────────── */
  function render(focus) {
    slides.forEach(function (s, i) {
      var active = i === index;
      s.classList.toggle('is-active', active);
      s.classList.toggle('in', active); // reuse styles.css `.in .art--X` triggers
      if (supportsInert) s.inert = !active;
      s.setAttribute('aria-hidden', active ? 'false' : 'true');
    });

    var chId = chapterOf(index);
    tabs.forEach(function (t) {
      t.setAttribute('aria-current', t.getAttribute('data-chapter') === chId ? 'true' : 'false');
    });

    prevBtn.disabled = index === 0;
    nextBtn.disabled = index === slides.length - 1;
    edgeBtn.disabled = index === slides.length - 1;

    buildDots();

    counter.textContent =
      String(index + 1).padStart(2, '0') + ' / ' + String(slides.length).padStart(2, '0');

    var heading = slides[index].querySelector('.slide__head');
    var chLabel = (CHAPTERS.filter(function (c) { return c.id === chId; })[0] || {}).label || '';
    live.textContent = chLabel + ' — ' + (heading ? heading.textContent.trim() : '') +
      ' (' + (index + 1) + ' of ' + slides.length + ')';

    if (focus && heading) {
      heading.setAttribute('tabindex', '-1');
      heading.focus({ preventScroll: true });
    }
  }

  /* ── navigation ───────────────────────────────────────────── */
  function go(i, focus) {
    index = Math.max(0, Math.min(slides.length - 1, i));
    updateHash();
    render(focus !== false);
  }
  function next() { if (index < slides.length - 1) go(index + 1); }
  function prev() { if (index > 0) go(index - 1); }

  function goChapter(chId) {
    var first = chapterSlides(chId)[0];
    if (first) go(slides.indexOf(first));
  }

  /* ── hash routing (#why-1, #moat-3 …) ─────────────────────── */
  function updateHash() {
    var id = slides[index].id;
    if (id && '#' + id !== location.hash) {
      history.replaceState(null, '', '#' + id);
    }
  }
  function indexFromHash() {
    var id = (location.hash || '').replace('#', '');
    if (!id) return 0;
    for (var i = 0; i < slides.length; i++) {
      if (slides[i].id === id) return i;
    }
    // allow bare chapter ids too
    var chFirst = chapterSlides(id)[0];
    return chFirst ? slides.indexOf(chFirst) : 0;
  }

  /* ── wiring ───────────────────────────────────────────────── */
  tabs.forEach(function (t) {
    t.addEventListener('click', function (e) {
      e.preventDefault();
      goChapter(t.getAttribute('data-chapter'));
    });
  });

  prevBtn.addEventListener('click', function () { prev(); });
  nextBtn.addEventListener('click', function () { next(); });
  edgeBtn.addEventListener('click', function () { next(); });

  document.addEventListener('keydown', function (e) {
    if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
    switch (e.key) {
      case 'ArrowRight':
      case 'PageDown':
        e.preventDefault(); next(); break;
      case ' ':
        e.preventDefault(); next(); break;
      case 'ArrowLeft':
      case 'PageUp':
        e.preventDefault(); prev(); break;
      case 'Home':
        e.preventDefault(); go(0); break;
      case 'End':
        e.preventDefault(); go(slides.length - 1); break;
    }
  });

  /* touch swipe */
  var tx = 0, ty = 0;
  deck.addEventListener('touchstart', function (e) {
    tx = e.changedTouches[0].clientX; ty = e.changedTouches[0].clientY;
  }, { passive: true });
  deck.addEventListener('touchend', function (e) {
    var dx = e.changedTouches[0].clientX - tx;
    var dy = e.changedTouches[0].clientY - ty;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) next(); else prev();
    }
  }, { passive: true });

  window.addEventListener('hashchange', function () {
    var i = indexFromHash();
    if (i !== index) go(i);
  });

  /* ── boot ─────────────────────────────────────────────────── */
  index = indexFromHash();
  render(false);
})();
