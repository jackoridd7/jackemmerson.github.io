/*
 * Grid-locked logarithmic vortex
 * ──────────────────────────────
 * 1.   Build a huge grid (cols × rows) of 6×18 px cells.
 * 2.   Place characters (from WORDS) into random grid cells.
 * 3.   Each animation frame moves every char ONE cell farther
 *      along a log-spiral path r = bθ.  When a char reaches
 *      the outer radius it wraps back near the centre.
 * 4.   Letters stay upright (no rotation) and never leave the grid.
 */

(() => {
  /* ═══ CONFIG ═══════════════════════════════════════════════ */
  const CELL_W  = 6;                        // px
  const CELL_H  = 18;                       // px (must match line-height)
  const SPEED   = 0.024;                    // rad per frame
  const B       = 4.5;                      // r = B θ spacing
  const WORDS   = [
    'TRAJECTORY','CFD','Δv','REENTRY','PROPULSION','ORBITAL',
    'STARSHIP','SCRAMJET','SPICE','MARS','UAV','ROVER'
  ];
  /* ══════════════════════════════════════════════════════════ */

  const field  = document.getElementById('field');
  const W      = window.innerWidth;
  const H      = window.innerHeight;
  const cols   = Math.ceil(W / CELL_W)  + 40;          // overscan
  const rows   = Math.ceil(H / CELL_H) + 40;
  const cxPix  = W / 2;
  const cyPix  = H / 2;
  const maxR   = Math.hypot(cxPix, cyPix) + 50;

  // convert grid (col,row) => pixel centre
  const toPx = (c, r) => [c * CELL_W, r * CELL_H];

  // build characters
  const chars = [];
  let idx = 0;
  for (let r = -rows/2; r < rows/2; r++) {
    for (let c = -cols/2; c < cols/2; c++) {
      const span = document.createElement('span');
      span.className = 'char';
      span.textContent = WORDS.join('•')[idx++ % (WORDS.join('•').length)];
      span.dataset.c = c;
      span.dataset.r = r;
      // initial position
      const [x,y] = toPx(c, r);
      span.style.left = `${x + cxPix}px`;
      span.style.top  = `${y + cyPix}px`;
      field.appendChild(span);
      chars.push(span);
    }
  }

  // animation
  function animate() {
    for (const s of chars) {
      let c = parseInt(s.dataset.c, 10);
      let r = parseInt(s.dataset.r, 10);

      // convert current grid cell to polar θ
      const xPix = c * CELL_W;
      const yPix = r * CELL_H;
      const theta = Math.atan2(yPix, xPix);
      const radius = Math.hypot(xPix, yPix);

      // target θ is current θ + SPEED
      let newTheta = theta + SPEED;
      let newR     = B * newTheta;

      // wrap if beyond max radius
      if (newR > maxR) {
        newTheta = newTheta - (maxR / B);
        newR     = B * newTheta;
      }

      // convert back to nearest grid cell
      const newX = newR * Math.cos(newTheta);
      const newY = newR * Math.sin(newTheta);
      c = Math.round(newX / CELL_W);
      r = Math.round(newY / CELL_H);

      s.dataset.c = c;
      s.dataset.r = r;
      s.style.left = `${c * CELL_W + cxPix}px`;
      s.style.top  = `${r * CELL_H + cyPix}px`;
    }
    requestAnimationFrame(animate);
  }
  requestAnimationFrame(animate);
})();
