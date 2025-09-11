// Canvas-based vortex with cell-level de-duplication and very slow intro.
// One letter max per grid cell; inner -> outer fill; upright characters.

class VortexText extends HTMLElement {
  connectedCallback() {
    const num = (k, d) => +((this.getAttribute(k) ?? this.dataset[k]) ?? d);
    const str = (k, d) => (this.getAttribute(k) ?? this.dataset[k] ?? d);

    // Config (matches your <vortex-text ...> attributes)
    this.words   = str("data-words", "CFD,Δv,ORBITAL").split(",").map(s=>s.trim());
    this.cellW   = num("data-cellw", 12);
    this.cellH   = num("data-cellh", 36);
    this.rowsVis = num("data-rows", 40);         // visible rows baseline
    this.B       = num("data-b", 4.2);           // r = B * θ
    this.speed   = num("data-speed", 0.022);     // radians/frame at full speed
    this.boot    = num("data-boot", 3000);       // ms before morph completes
    this.centerX = Math.min(1, Math.max(0, num("data-centerx", 0.5)));
    this.centerY = Math.min(1, Math.max(0, num("data-centery", 0.58)));

    // Tight line: bullets without spaces
    this.line = (this.words.join("•") + "•").replace(/ /g, "");

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

    // Where the spiral centres
    this.cx = innerWidth  * this.centerX;
    this.cy = innerHeight * this.centerY;

    // Font size tied to cell height
    this.fontPx = Math.max(10, Math.floor(this.cellH * 0.61));
    this.ctx.font = `${this.fontPx}px "Courier New", monospace`;

    // Ensure cells are wide enough for glyphs -> legible
    const mW = Math.ceil(this.ctx.measureText("M").width) + 2;
    if (this.cellW < mW) this.cellW = mW;

    // Grid dims + arrays
    this.cols = Math.max(1, Math.floor(innerWidth / this.cellW));
    this.rows = Math.max(1, this.rowsVis);
    this.N    = Math.min(this.cols * this.rows, 12000);

    // Max radius from chosen centre to any corner
    this.maxR = Math.hypot(Math.max(this.cx, innerWidth - this.cx),
                           Math.max(this.cy, innerHeight - this.cy)) + 60;

    // θ distribution (0..max), inner -> outer
    const maxTheta = this.maxR / this.B;
    this.theta = new Float32Array(this.N);
    for (let i = 0; i < this.N; i++) this.theta[i] = (i / this.N) * maxTheta;

    // Fixed matrix mapping (row/col for each agent)
    this.rcRow = new Int16Array(this.N);
    this.rcCol = new Int16Array(this.N);
    let k = 0;
    for (let r = 0; r < this.rows && k < this.N; r++) {
      for (let c = 0; c < this.cols && k < this.N; c++, k++) {
        this.rcRow[k] = r;
        this.rcCol[k] = c;
      }
    }

    // Occupancy grid (one byte per cell)
    this.occ = new Uint8Array(this.cols * this.rows);
  }

  _easeInOut(t){ return t < .5 ? 4*t*t*t : 1 - Math.pow(-2*t+2,3)/2; }

  _tick(now) {
    const ctx = this.ctx;
    ctx.clearRect(0,0,innerWidth,innerHeight);

    // Crisp + bright enough to read over the spiral
    ctx.fillStyle   = "#d7e0ee";
    ctx.font        = `${this.fontPx}px "Courier New", monospace`;
    ctx.textAlign   = "center";
    ctx.textBaseline= "middle";

    // Morph factor 0..1 after boot (3s) with easing
    const morphRaw = Math.min(1, Math.max(0, (now - this.start - this.boot) / 1200));
    const morph    = this._easeInOut(morphRaw);

    // Ultra-slow intro: 0.4% speed during first 3s; then ramp to 100%
    const speedNow = (this.speed * 0.05) * (0.004 + 0.996 * morph);

    const halfRowsH = (this.rowsVis * this.cellH) / 2;
    const line = this.line;

    // reset occupancy for this frame
    this.occ.fill(0);

    // inner -> outer (θ grows with i)
    for (let i = 0; i < this.N; i++) {
      let t = this.theta[i];
      let r = this.B * t;

      // wrap to keep flowing
      if (r > this.maxR) {
        t -= (this.maxR / this.B);
        r  = this.B * t;
        this.theta[i] = t;
      }

      // spiral coordinates
      const sx = this.cx + r * Math.cos(t);
      const sy = this.cy + r * Math.sin(t);

      // initial matrix position (rows field)
      const rx = (this.rcCol[i] + 0.5) * this.cellW;
      const ry = (this.rcRow[i] + 0.5) * this.cellH + (this.cy - halfRowsH);

      // mix rows → spiral
      let x = rx * (1 - morph) + sx * morph;
      let y = ry * (1 - morph) + sy * morph;

      // snap to grid indices
      let ci = Math.round(x / this.cellW);
      let ri = Math.round(y / this.cellH);

      // clamp to grid bounds
      if (ci < 0 || ci >= this.cols || ri < 0 || ri >= this.rows) {
        this.theta[i] = t + speedNow;
        continue;
      }

      // one-glyph-per-cell
      const key = ri * this.cols + ci;
      if (this.occ[key]) { this.theta[i] = t + speedNow; continue; }
      this.occ[key] = 1;

      // draw at cell center
      const px = ci * this.cellW;
      const py = ri * this.cellH;
      const ch = line.charAt((i + (Math.floor(now * 0.06) % line.length)) % line.length) || "•";
      ctx.fillText(ch, px, py);

      // advance along spiral
      this.theta[i] = t + speedNow;
    }

    requestAnimationFrame(this._tick.bind(this));
  }
}

customElements.define("vortex-text", VortexText);
