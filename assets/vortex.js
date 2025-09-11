// Canvas-based, grid-snapped spiral with cell-level de-dup.
// • VERY slow drift during the first 3s (ramps up after).
// • Each frame, at most ONE glyph is drawn per grid cell.

class VortexText extends HTMLElement {
  connectedCallback() {
    const num = (k, d) => +((this.getAttribute(k) ?? this.dataset[k]) ?? d);
    const str = (k, d) => (this.getAttribute(k) ?? this.dataset[k] ?? d);

    // —— Config (matches your index.html attributes) ——
    this.words   = str("data-words", "CFD,Δv,ORBITAL").split(",").map(s=>s.trim());
    this.cellW   = num("data-cellw", 12);
    this.cellH   = num("data-cellh", 36);
    this.rows    = num("data-rows", 40);
    this.B       = num("data-b", 4.2);            // r = B * θ
    this.speed   = num("data-speed", 0.022);      // radians/frame at full speed
    this.boot    = num("data-boot", 3000);        // ms of rows→spiral morph window
    this.centerX = Math.min(1, Math.max(0, num("data-centerx", 0.5)));
    this.centerY = Math.min(1, Math.max(0, num("data-centery", 0.58)));

    // tighter rows: bullets without spaces
    this.line = (this.words.join("•") + "•").replace(/ /g, "");

    // Canvas
    this.canvas = document.createElement("canvas");
    this.ctx = this.canvas.getContext("2d");
    this.style.display = "block";
    this.appendChild(this.canvas);

    // Init + kick off loop
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

    // centre (as % of viewport)
    this.cx = innerWidth  * this.centerX;
    this.cy = innerHeight * this.centerY;

    // Font tied to cellH (keeps your 2× sizing)
    this.fontPx = Math.max(10, Math.floor(this.cellH * 0.61));
    this.ctx.font = `${this.fontPx}px "Courier New", monospace`;

    // widen cell if glyphs would overlap (keeps text legible)
    const mW = Math.ceil(this.ctx.measureText("M").width) + 2;
    if (this.cellW < mW) this.cellW = mW;

    // radius needed to cover corners from chosen centre
    this.maxR = Math.hypot(Math.max(this.cx, innerWidth - this.cx),
                           Math.max(this.cy, innerHeight - this.cy)) + 60;

    // grid agents (cap for perf)
    this.cols = Math.ceil(innerWidth / this.cellW);
    const N = Math.min(this.rows * this.cols, 12000);

    // deterministic theta distribution: dense inner core
    this.theta  = new Float32Array(N);
    const maxTheta = this.maxR / this.B;
    for (let i = 0; i < N; i++) this.theta[i] = (i / N) * maxTheta;

    // fixed matrix mapping
    this.rowcol = new Array(N);
    let k = 0;
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols && k < N; c++, k++) this.rowcol[k] = [c, r];
    }
  }

  _easeInOut(t){ return t < .5 ? 4*t*t*t : 1 - Math.pow(-2*t+2,3)/2; }

  _tick(now) {
    const ctx = this.ctx;
    ctx.clearRect(0,0,innerWidth,innerHeight);

    // readable on the spiral
    ctx.fillStyle   = "#cfd7e4";
    ctx.font        = `${this.fontPx}px "Courier New", monospace`;
    ctx.textAlign   = "center";
    ctx.textBaseline= "middle";

    // morph 0→1 after boot (3s), eased
    const raw   = Math.min(1, Math.max(0, (now - this.start - this.boot) / 1200));
    const morph = this._easeInOut(raw);

    // SUPER-slow start: 0.4% of full speed → 100% as morph completes
    const speedNow = this.speed * (0.004 + 0.996 * morph);

    const halfRowsH = (this.rows * this.cellH) / 2;
    const line = this.line;

    // pass 1: compute snapped targets
    const N = this.theta.length;
    const items = new Array(N);
    for (let i=0; i<N; i++) {
      let t = this.theta[i];
      let r = this.B * t;

      // wrap for endless flow
      if (r > this.maxR) {
        t -= (this.maxR / this.B);
        r  = this.B * t;
        this.theta[i] = t;
      }

      // spiral position
      const sx = this.cx + r * Math.cos(t);
      const sy = this.cy + r * Math.sin(t);

      // initial row position (matrix)
      const [c,row] = this.rowcol[i];
      const rx = (c + 0.5) * this.cellW;
      const ry = (row + 0.5) * this.cellH + (this.cy - halfRowsH);

      // mix rows → spiral, then SNAP to grid
      let x = rx * (1 - morph) + sx * morph;
      let y = ry * (1 - morph) + sy * morph;
      const ci = Math.round(x / this.cellW);
      const ri = Math.round(y / this.cellH);
      x = ci * this.cellW;
      y = ri * this.cellH;

      // glyph (upright)
      const ch = line.charAt((i + (Math.floor(now*0.06) % line.length)) % line.length) || "•";

      // update θ for next frame
      this.theta[i] = t + speedNow;

      items[i] = { r, x, y, ci, ri, ch };
    }

    // pass 2: sort inner→outer, then draw with cell-level de-dup
    items.sort((a,b)=> a.r - b.r);
    const occupied = new Set();  // "ci,ri" keys

    for (const it of items) {
      const key = it.ci + "," + it.ri;
      if (occupied.has(key)) continue;    // one glyph per grid cell
      occupied.add(key);
      ctx.fillText(it.ch, it.x, it.y);
    }

    requestAnimationFrame(this._tick.bind(this));
  }
}

customElements.define("vortex-text", VortexText);
