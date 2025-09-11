// Canvas-based, grid-snapped spiral.
// - Super-slow drift during the first 3s
// - Auto widens the grid cell if your font would overlap (so text stays legible)
// - Denser inner spiral, characters remain upright and visible

class VortexText extends HTMLElement {
  connectedCallback() {
    const num = (k, d) => +((this.getAttribute(k) ?? this.dataset[k]) ?? d);
    const str = (k, d) => (this.getAttribute(k) ?? this.dataset[k] ?? d);

    // ── Config (same attributes as before) ────────────────────────────────
    this.words   = str("data-words", "CFD,Δv,ORBITAL").split(",").map(s=>s.trim());
    this.cellW   = num("data-cellw", 12);
    this.cellH   = num("data-cellh", 36);
    this.rows    = num("data-rows", 40);
    this.B       = num("data-b", 4.2);           // r = B * θ
    this.speed   = num("data-speed", 0.022);     // base radians / frame
    this.boot    = num("data-boot", 3000);       // ms before morph completes
    this.centerX = Math.min(1, Math.max(0, num("data-centerx", 0.5)));
    this.centerY = Math.min(1, Math.max(0, num("data-centery", 0.58)));
    // Join with bullets but NO spaces → tighter rows
    this.line    = (this.words.join("•") + "•").replace(/ /g, "");

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

    // centre (percentage of viewport)
    this.cx = innerWidth  * this.centerX;
    this.cy = innerHeight * this.centerY;

    // font size tied to cell height (keeps 2× sizing you chose)
    this.fontPx = Math.max(10, Math.floor(this.cellH * 0.61));
    this.ctx.font = `${this.fontPx}px "Courier New", monospace`;

    // ⚠️ auto widen cell if letters would overlap (keeps text readable)
    const mWidth = Math.ceil(this.ctx.measureText("M").width) + 2; // average wide glyph
    if (this.cellW < mWidth) this.cellW = mWidth;

    // Max radius needed from this centre
    this.maxR = Math.hypot(Math.max(this.cx, innerWidth - this.cx),
                           Math.max(this.cy, innerHeight - this.cy)) + 60;

    // Agents on a grid (capped for perf)
    this.cols = Math.ceil(innerWidth / this.cellW);
    const N = Math.min(this.rows * this.cols, 12000);

    // Deterministic theta distribution → dense, readable core
    this.theta  = new Float32Array(N);
    this.rowcol = new Array(N);
    const maxTheta = this.maxR / this.B;
    for (let i = 0; i < N; i++) this.theta[i] = (i / N) * maxTheta;

    let k = 0;
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols && k < N; c++, k++) this.rowcol[k] = [c, r];
    }
  }

  _easeInOut(t){ return t < .5 ? 4*t*t*t : 1 - Math.pow(-2*t+2,3)/2; }

  _tick(now) {
    const ctx = this.ctx;
    ctx.clearRect(0,0,innerWidth,innerHeight);

    // crisp, slightly brighter so it’s legible on the spiral
    ctx.fillStyle   = "#cdd6e3";
    ctx.font        = `${this.fontPx}px "Courier New", monospace`;
    ctx.textAlign   = "center";
    ctx.textBaseline= "middle";
    ctx.shadowColor = "transparent"; // keep sharp

    // morph 0→1 after boot with easing
    const raw   = Math.min(1, Math.max(0, (now - this.start - this.boot) / 1200));
    const morph = this._easeInOut(raw);

    // 🔉 MUCH slower during the first 3 s
    // start at 2% of full speed, ease up to 100% as the morph completes
    const speedNow = this.speed * (0.02 + 0.98 * morph);

    const line = this.line;
    const halfRowsH = (this.rows * this.cellH) / 2;

    for (let i=0; i<this.theta.length; i++) {
      let t = this.theta[i];
      let r = this.B * t;

      // wrap for endless flow
      if (r > this.maxR) {
        t -= (this.maxR / this.B);
        r  = this.B * t;
        this.theta[i] = t;
      }

      // spiral position
      let sx =
