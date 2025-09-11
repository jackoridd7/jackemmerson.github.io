// vortex.js (r10) — time-based speed + one-letter-per-cell + very slow intro
class VortexText extends HTMLElement {
  connectedCallback() {
    const num = (k, d) => +((this.getAttribute(k) ?? this.dataset[k]) ?? d);
    const str = (k, d) => (this.getAttribute(k) ?? this.dataset[k] ?? d);

    // Config
    this.words   = str("data-words", "CFD,Δv,ORBITAL").split(",").map(s=>s.trim());
    this.cellW   = num("data-cellw", 12);
    this.cellH   = num("data-cellh", 36);
    this.rowsVis = num("data-rows", 40);
    this.B       = num("data-b", 4.2);            // r = B * θ
    this.speed   = num("data-speed", 0.8);        // **radians per second**
    this.boot    = num("data-boot", 3000);        // ms before morph finishes
    this.cxPct   = Math.min(1, Math.max(0, num("data-centerx", 0.5)));
    this.cyPct   = Math.min(1, Math.max(0, num("data-centery", 0.58)));

    // Back-compat: if someone still passes a tiny per-frame speed like 0.02, scale ~60x
    if (this.speed > 0 && this.speed < 0.2) this.speed *= 60;

    // Tight line (no spaces)
    this.line = (this.words.join("•") + "•").replace(/ /g, "");

    // Canvas
    this.canvas = document.createElement("canvas");
    this.ctx = this.canvas.getContext("2d");
    this.style.display = "block";
    this.appendChild(this.canvas);

    // Init + loop
    this.__version = "r10";
    console.log("vortex build", this.__version, "speed(rad/s)=", this.speed);
    this._resize = this._resize.bind(this);
    window.addEventListener("resize", this._resize, { passive:true });
    this._resize();

    this.start = performance.now();
    this._prevT = this.start;
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

    // Centre in px
    this.cx = innerWidth  * this.cxPct;
    this.cy = innerHeight * this.cyPct;

    // Font ~ 0.61 of cell height
    this.fontPx = Math.max(10, Math.floor(this.cellH * 0.61));
    this.ctx.font = `${this.fontPx}px "Courier New", monospace`;

    // Ensure cell width fits glyphs
    const mW = Math.ceil(this.ctx.measureText("M").width) + 2;
    if (this.cellW < mW) this.cellW = mW;

    // Grid + limits
    this.cols = Math.max(1, Math.floor(innerWidth / this.cellW));
    this.rows = Math.max(1, this.rowsVis);
    this.N    = Math.min(this.cols * this.rows, 12000);

    this.maxR = Math.hypot(Math.max(this.cx, innerWidth - this.cx),
                           Math.max(this.cy, innerHeight - this.cy)) + 60;

    // θ from inner→outer
    const maxTheta = this.maxR / this.B;
    this.theta = new Float32Array(this.N);
    for (let i = 0; i < this.N; i++) this.theta[i] = (i / this.N) * maxTheta;

    // fixed matrix mapping
    this.rcRow = new Int16Array(this.N);
    this.rcCol = new Int16Array(this.N);
    let k = 0;
    for (let r = 0; r < this.rows && k < this.N; r++) {
      for (let c = 0; c < this.cols && k < this.N; c++, k++) {
        this.rcRow[k] = r; this.rcCol[k] = c;
      }
    }

    // occupancy grid
    this.occ = new Uint8Array(this.cols * this.rows);
  }

  _easeInOut(t){ return t < .5 ? 4*t*t*t : 1 - Math.pow(-2*t+2,3)/2; }

  _tick(now) {
    const dt = Math.max(0, (now - this._prevT) / 1000); // seconds since last frame
    this._prevT = now;

    const ctx = this.ctx;
    ctx.clearRect(0,0,innerWidth,innerHeight);
    ctx.fillStyle   = "#d7e0ee";
    ctx.font        = `${this.fontPx}px "Courier New", monospace`;
    ctx.textAlign   = "center";
    ctx.textBaseline= "middle";

    // Morph 0→1 after boot window (3s), eased
    const morphRaw = Math.min(1, Math.max(0, (now - this.start - this.boot) / 1200));
    const morph    = this._easeInOut(morphRaw);

    // SPEED PROFILE (tweak here)
    // Intro: 0.2% of base speed, Final vortex: 50% of base speed
    const INTRO = 0.002, FINAL = 0.50;
    const speedScale = INTRO + (FINAL - INTRO) * morph;   // 0.002→0.50
    const speedNow   = this.speed * speedScale;           // rad/second

    // occupancy reset
    this.occ.fill(0);

    const halfRowsH = (this.rowsVis * this.cellH) / 2;
    const line = this.line;

    // inner→outer (one glyph per cell)
    for (let i = 0; i < this.N; i++) {
      let t = this.theta[i];
      let r = this.B * t;

      // wrap past edge
      if (r > this.maxR) {
        t -= (this.maxR / this.B);
        r  = this.B * t;
        this.theta[i] = t;
      }

      // spiral position
      const sx = this.cx + r * Math.cos(t);
      const sy = this.cy + r * Math.sin(t);

      // initial matrix rows
      const rx = (this.rcCol[i] + 0.5) * this.cellW;
      const ry = (this.rcRow[i] + 0.5) * this.cellH + (this.cy - halfRowsH);

      // mix rows→spiral
      let x = rx * (1 - morph) + sx * morph;
      let y = ry * (1 - morph) + sy * morph;

      // snap to grid
      const ci = Math.round(x / this.cellW);
      const ri = Math.round(y / this.cellH);
      if (ci < 0 || ci >= this.cols || ri < 0 || ri >= this.rows) {
        this.theta[i] = t + speedNow * dt;
        continue;
      }

      // one letter per cell
      const key = ri * this.cols + ci;
      if (this.occ[key]) { this.theta[i] = t + speedNow * dt; continue; }
      this.occ[key] = 1;

      // draw
      const px = ci * this.cellW;
      const py = ri * this.cellH;
      const ch = line.charAt((i + (Math.floor(now * 0.06) % line.length)) % line.length) || "•";
      ctx.fillText(ch, px, py);

      // advance (time-based)
      this.theta[i] = t + speedNow * dt;
    }

    requestAnimationFrame(this._tick.bind(this));
  }
}
customElements.define("vortex-text", VortexText);
