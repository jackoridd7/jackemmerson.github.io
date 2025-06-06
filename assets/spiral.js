/* Mid-journey-style hero animation
 * ---------------------------------------------
 * 1. Fills the viewport with horizontal rows of
 *    aerospace keywords (monospace <span> grid).
 * 2. After 400 ms, morphs every character onto a
 *    logarithmic spiral:  r = b θ
 *    CSS transitions handle the smooth motion.
 * ---------------------------------------------
 */

(() => {
  const FIELD    = document.getElementById('field');

  /* — configuration — */
  const ROWS     = 36;                            // number of horizontal rows
  const CHAR_W   = 6;                             // monospace char width (px)
  const ROW_H    = 18;                            // line-height (px)
  const dTheta   = 0.34;                          // θ step per character
  const B        = 3.6;                           // controls radial spacing
  const WORDS    = [
    'TRAJECTORY','PROPULSION','Δv','CFD','RE-ENTRY','ORBITAL-MECH',
    'STARSHIP','MARS-BASE','SPICE','ROVER-DESIGN','UAV','SCRAMJET'
  ];
  /* ———————————— */

  const W  = window.innerWidth;
  const H  = window.innerHeight;
  const CX = W / 2;
  const CY = H / 2;

  const BASE_LINE = (WORDS.join(' • ') + ' • ').replace(/ /g, '\u00A0');
  const LINE      = BASE_LINE.repeat(Math.ceil(W / (BASE_LINE.length * CHAR_W)));

  /* 1️⃣ build the flat rows */
  const spans = [];
  for (let r = 0; r < ROWS; r++) {
    const top = CY - (ROWS / 2 - r) * ROW_H;
    for (let c = 0; c < LINE.length; c++) {
      const span = document.createElement('span');
      span.className  = 'char';
      span.textContent = LINE[c];
      span.style.left = `${c * CHAR_W}px`;
      span.style.top  = `${top}px`;
      FIELD.appendChild(span);
      spans.push(span);
    }
  }

  /* 2️⃣ morph to spiral */
  setTimeout(() => {
    let theta = 0;
    const maxR = Math.hypot(CX, CY) + 100;        // past viewport corner
    for (const span of spans) {
      const r = B * theta;
      if (r > maxR) { span.style.opacity = 0; theta += dTheta; continue; }

      const x = CX + r * Math.cos(theta);
      const y = CY + r * Math.sin(theta);

      span.style.left      = `${x}px`;
      span.style.top       = `${y}px`;
      span.style.transform = `translate(-50%,-50%) rotate(${theta * 57.2958}deg)`;
      span.style.opacity   = 0.9;

      theta += dTheta;
    }
  }, 400);
})();
