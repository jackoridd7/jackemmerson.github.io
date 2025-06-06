/*
 * Continuous vortex animation (upright characters)
 * ------------------------------------------------
 * • Creates a big rectangular grid of <span>s filled with aerospace words.
 * • Every frame, each span slides a tiny step further along the spiral
 *   r = bθ  (log-spiral), keeping letters upright (no rotation).
 * • When a span travels beyond the outer radius, its θ is wrapped so it
 *   re-enters near the centre – producing endless flow.
 */

(() => {
  /* ===== CONFIG ===== */
  const ROWS      = 48;                        // vertical rows of text
  const CHAR_W    = 6;                         // monospace width  (px)
  const LINE_H    = 18;                        // line-height      (px)
  const DTHETA    = 0.012;                     // rad/frame speed
  const B         = 4.0;                       // spiral spacing   (b in r=bθ)
  const WORDS     = [
    'TRAJECTORY','PROPULSION','Δv','CFD','RE-ENTRY',
    'ORBITAL-MECH','STARSHIP','MARS-BASE','SPICE',
    'ROVER-DESIGN','SCRAMJET','UAV'
  ];
  /* ================== */

  const FIELD  = document.getElementById('field');
  const BASE   = (WORDS.join(' • ') + ' • ').replace(/ /g, '\u00A0');
  const LINE   = BASE.repeat(300);            // plenty long (clipped later)
  const W      = window.innerWidth;
  const H      = window.innerHeight;
  const CX     = W / 2;
  const CY     = H / 2;
  const MAX_R  = Math.hypot(CX, CY) + 100;

  // Build the grid once
  const spans = [];
  let index = 0;
  for (let r = 0; r < ROWS; r++) {
    const y = CY - (ROWS / 2 - r) * LINE_H;
    for (let c = 0; c < W / CHAR_W + 40; c++) {
      const span = document.createElement('span');
      span.className = 'char';
      span.textContent = LINE.charAt((index++) % LINE.length);
      span.dataset.theta = (Math.random() * 2 * Math.PI).toString(); // random start θ
      FIELD.appendChild(span);
      spans.push(span);
    }
  }

  // Animation loop
  function tick() {
    for (const s of spans) {
      let theta = parseFloat(s.dataset.theta) + DTHETA;
      if (theta > (MAX_R / B)) theta -= (MAX_R / B);   // wrap when too far
      s.dataset.theta = theta;

      const r = B * theta;
      const x = CX + r * Math.cos(theta);
      const y = CY + r * Math.sin(theta);

      s.style.left = `${x}px`;
      s.style.top  = `${y}px`;
    }
    requestAnimationFrame(tick);
  }
  tick();
})();
