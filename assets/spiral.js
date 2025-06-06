/*
 *  Mid-journey-style text morph:
 *  1.  Spawn 32 rows of repeated aerospace keywords across the screen.
 *  2.  After 500 ms, give every <span> its “spiral” coordinates – the
 *      CSS transition declared in index.html does the morph.
 */

(() => {
  // ---------- configurable bits ----------
  const rows      = 32;                 // horizontal text rows
  const spacing   = 28;                 // px between rows
  const thetaStep = 0.30;               // spiral tightness
  const radiusInc = 3.2;                // radial spacing
  const phrases   = [
    'TRAJECTORY', 'DELTA-V', 'CFD', 'PROPULSION', 'RE-ENTRY',
    'ORBITAL MECH', 'MICRO UAV', 'MARS LOGISTICS',
    'LIFT-DRAG', 'STARSHIP', 'SPICE KERNELS', 'ROVER DESIGN'
  ];
  // ---------------------------------------

  const field   = document.getElementById('field');
  const phrase  = phrases.join(' • ') + ' • ';      // non-breaking spaces
  const vw      = window.innerWidth;
  const vh      = window.innerHeight;
  const cx      = vw / 2;
  const cy      = vh / 2;

  // Helper to fill at least screen-width text
  const fillLine = () => phrase.repeat(Math.ceil(vw /  (phrase.length * 8)));

  // 1. generate rows
  let chars = [];
  for (let r = 0; r < rows; r++) {
    const y = cy + (r - rows / 2) * spacing;
    const line = fillLine();
    for (let i = 0; i < line.length; i++) {
      const span = document.createElement('span');
      span.className = 'char';
      span.textContent = line[i];
      span.style.left = `${i * 8}px`;
      span.style.top  = `${y}px`;
      field.appendChild(span);
      chars.push(span);
    }
  }

  // 2. after a tiny delay, assign spiral targets
  setTimeout(() => {
    let θ = 0, idx = 0;
    for (const span of chars) {
      const r = radiusInc * θ;
      if (r > Math.max(cx, cy)) break;  // stop once we leave viewport
      const x = cx + r * Math.cos(θ);
      const y = cy + r * Math.sin(θ);
      span.style.left = `${x}px`;
      span.style.top  = `${y}px`;
      span.style.transform = `translate(-50%,-50%) rotate(${θ*57.2958}deg)`;
      span.style.opacity = 0.85;
      θ += thetaStep;
      idx++;
    }
    // Fade out any unused characters
    for (let i = idx; i < chars.length; i++) chars[i].style.opacity = 0;
  }, 500);
})();
