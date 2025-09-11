// Canvas-based, grid-snapped spiral.
// Tighter rows (no spaces), slower drift during the 3s boot, denser inner spiral.

class VortexText extends HTMLElement {
  connectedCallback() {
    const num = (k, d) => +((this.getAttribute(k) ?? this.dataset[k]) ?? d);
    const str = (k, d) => (this.getAttribute(k) ?? this.dataset[k] ?? d);

    // ── Config (same attributes as before) ──────────────────────────────────
    this.words   = str("data-words", "CFD,Δv,ORBITAL").split(",").map(s=>s.trim());
    this.cellW   = num("data-cellw", 12);
    this.cellH   = num("data-cellh", 36);
    this.rows    = num("data-rows", 40);
    this.B       = num("data-b", 4.2);          // r = B * θ
    this.speed   = num("data-speed", 0.022);    // radians/frame at full speed
    this.boot    = num("data-boot", 3000);      // ms before morph finishes
    this.centerX = Math.min(1, Math.max(0, num("data-centerx", 0.5)));
    this.centerY = Math.min(1, Math.max(0, num("data-centery", 0.58)));

    // Less gaps: join with a bullet *without* spaces.
    const SEP = "•";
    this.line = (this.words.join(SEP) + SEP).replace(/ /g, "");

    // Canvas
    this.canvas = document.createElement("canvas");
    this.ctx = this.canvas.getContext("2d");
    this.style.display = "block";
    this.appendChild(this.canvas);

    // Init
    this._resize = this._resize.bind(this);
    window.addEventListener("resize", this._resize, { passive:true });
    this._resize();

    this.start = performance.now();
    requestAnimationFrame(this._tick.bind(this));
  }

  disconnectedCallback(){ window.removeEventListener("resize", this._resize); }

  _resize() {
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    this.W = this.canvas.width  = Math.floor(innerWidth  * dpr);
    this.H = this.canvas.height = Math.floor(innerHeight * dpr);
    this.canvas.style.width  = innerWidth + "px";
    this.canvas.style.height = innerHeight + "px";
    this.ctx.setTransform(dpr,0,0,dpr,0,0);

    // Spiral centre
    this.cx = innerWidth  * this.centerX;
    this.cy = innerHeight * this.centerY;

    // Furthest radius to cover corners from chosen centre
    this.maxR = Math.hypot(Math.max(this.cx, innerWidth - this.cx),
                           Math.max(this.cy, innerHeight - this.cy)) + 60;

    // Agents (grid cells), capped for perf
    this.cols = Math.ceil(innerWidth / this.cellW);
    const N = Math.min(this.rows * this.cols, 9000);

    // Denser inner spiral: thetas from 0..max (not random-only).
    // A touch of jitter avoids aliasing on the grid.
    this.theta = new Float32Array(N);
    this.rowcol = new Array(N);
    const maxTheta = this.maxR / this.B;
    for (let i = 0; i < N; i++) {
      this.theta[i] = (i / N) * maxTheta + (Math.random() * 0.015);
    }

    // Map each agent to a fixed row/col (matrix)
    let k = 0;
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols && k < N; c++, k++) this.rowcol[k] = [c, r];
    }

    // Font tied to cell height
    this.fontPx = Math.max(10, Math.floor(this.cellH * 0.61));
  }

  _easeInOut(t){ return t < .5 ? 4*t*t*t : 1 - Math.pow(-2*t+2,3)/2; }

  _tick(now) {
    const ctx = this.ctx;
    ctx.clearRect(0,0,innerWidth,innerHeight);

    // Style
    ctx.fillStyle = "#a8b4c4";                 // slightly brighter for visibility
    ctx.font = `${this.fontPx}px "Courier New", monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Morph progress: 0 → 1 after boot (3s) with easing
    const raw = Math.min(1, Math.max(0, (now - this.start - this.boot) / 1200));
    const morph = this._easeInOut(raw);

    // Much slower during the first 3s:
    // scale speed from 12% → 100% as morph goes 0 → 1
    const speedNow = this.speed * (0.12 + 0.88 * morph);

    const line = this.line;
    const halfRowsH = (this.rows * this.cellH) / 2;

    for (let i=0; i<this.theta.length; i++) {
      let t = this.theta[i];
      let r = this.B * t;

      // Wrap for endless flow
      if (r > this.maxR) {
        t -= (this.maxR / this.B);
        r  = this.B * t;
        this.theta[i] = t;
      }

      // Spiral position
      let sx = this.cx + r * Math.cos(t);
      let sy = this.cy + r * Math.sin(t);

      // Initial row position (matrix)
      const [c,row] = this.rowcol[i];
      const rx = (c + 0.5) * this.cellW;
      const ry = (row + 0.5) * this.cellH + (this.cy - halfRowsH);

      // Mix rows → spiral, then SNAP to grid
      let x = rx * (1 - morph) + sx * morph;
      let y = ry * (1 - morph) + sy * morph;
      x = Math.round(x / this.cellW) * this.cellW;
      y = Math.round(y / this.cellH) * this.cellH;

      // Draw upright character
      const ch = line.charAt((i + (Math.floor(now * 0.06) % line.length)) % line.length) || "•";
      ctx.fillText(ch, x, y);

      // Advance along spiral
      this.theta[i] = t + speedNow;
    }

    requestAnimationFrame(this._tick.bind(this));
  }
}

customElements.define("vortex-text", VortexText);
