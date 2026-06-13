/* interface-craft · pointer parallax
 * Each [data-parallax] figure nudges its [data-depth] layers toward
 * the cursor — deeper layers move more. Smoothing lives in CSS
 * (transition on [data-depth]). Fine pointers only; off under
 * prefers-reduced-motion.
 */
(() => {
  const fine = window.matchMedia("(pointer: fine)").matches;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!fine || reduce) return;

  const MAX = 9; // px of travel at depth 1, edge of figure

  document.querySelectorAll("[data-parallax]").forEach((fig) => {
    const layers = [...fig.querySelectorAll("[data-depth]")].map((el) => ({
      el,
      depth: parseFloat(el.dataset.depth) || 1,
    }));
    if (!layers.length) return;

    let raf = 0;
    let nx = 0;
    let ny = 0;

    const apply = () => {
      raf = 0;
      layers.forEach(({ el, depth }) => {
        el.style.transform = `translate(${nx * depth * MAX}px, ${ny * depth * MAX}px)`;
      });
    };

    fig.addEventListener("pointermove", (e) => {
      const r = fig.getBoundingClientRect();
      nx = (e.clientX - r.left) / r.width - 0.5;
      ny = (e.clientY - r.top) / r.height - 0.5;
      if (!raf) raf = requestAnimationFrame(apply);
    });

    fig.addEventListener("pointerleave", () => {
      nx = ny = 0;
      if (!raf) raf = requestAnimationFrame(apply);
    });
  });
})();
