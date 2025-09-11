// Canvas-based, grid-snapped spiral. Upright letters only.
// Works even if Tailwind fails; no Shadow DOM, so it can't be hidden.

class VortexText extends HTMLElement {
  connectedCallback() {
    // read config (with defaults)
    const parse = (a, d) => (this.getAttribute(a) ?? this.dataset[a] ?? d);
    this.words = (parse("data-words", "CFD,Δv,ORBITAL").split(",")).map(s=>s.trim());
    this.cellW = +parse("data-cellw", 6);
    this.cellH = +parse("data-cellh", 18);
    this.rows  = +parse("data-rows", 44);
    this.B     = +parse("data-b", 4.2);          // r = B * θ
    this.speed = +parse("data-speed", 0.022);    // rad / frame
    this.boot  = +parse("data-boot", 900);       // ms rows-before-morph
    this.line  = (this.words.join(" • ") + " • ").replace(/ /g, "\u00A0");

    // canvas
    this.canvas = document.createElement("canvas");
    this.ctx = this.canvas.getContext("2d");
    this.style.display = "block";
    this.appendChild(this.canvas);

    // sizing + data
    this._resize = this._resize.bind(this);
    window.addEventListener("resize", this._resize, {passive:true});
    this._resize();

    this.start = performance.now();
    requestAnimationFrame(this._tick.bind(this));
  }

  disconnectedCallback(){ window.removeEventListener("resize", this._resize); }

  _resize() {
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    this.W = this.canvas.width  = Math.floor(innerWidth  * dpr);
    this.H = this.canvas.height = Math.floor(innerHeight * dpr);
    this.dpr = dpr;
    this.canvas.style.width  = innerWidth + "px";
    this.canvas.style.height = innerHeight + "px";
    this.ctx.setTransform(dpr,0,0,dpr,0,0);

    this.cx = innerWidth/2;
    this.cy = innerHeight/2;
    this.maxR = Math.hypot(this.cx, this.cy) + 60;

    // “matrix” agents (grid cells) capped for perf
    this.cols = Math.ceil(innerWidth / this.cellW);
    const N = Math.min(this.rows * this.cols, 9000);
    this.theta = new Float32Array(N);
    this.rowcol = new Array(N);
    let i = 0, seed = Math.random()*Math.PI*2;
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols && i < N; c++, i++) {
        this.theta[i] = seed + (i*0.005) % (this.maxR/this.B);
        this.rowcol[i] = [c, r];
      }
    }
  }

  _tick(now) {
    const ctx = this.ctx;
    ctx.clearRect(0,0,innerWidth,innerHeight);

    // text style
    ctx.fillStyle   = "#94a3b8";
    ctx.font        = `11px "Courier New", monospace`;
    ctx.textAlign   = "center";
    ctx.textBaseline= "middle";

    const m = Math.min(1, Math.max(0, (now - this.start - this.boot) / 1200));
    const line = this.line;
    const halfRowsH = (this.rows * this.cellH) / 2;

    for (let i=0; i<this.theta.length; i++) {
      // spiral position
      let t = this.theta[i];
      let r = this.B * t;
      if (r > this.maxR) {                 // wrap for endless flow
        t -= (this.maxR / this.B);
        r  = this.B * t;
        this.theta[i] = t;
      }
      let sx = this.cx + r*Math.cos(t);
      let sy = this.cy + r*Math.sin(t);

      // row position (for initial state)
      const [c,row] = this.rowcol[i];
      const rx = (c + 0.5) * this.cellW;
      const ry = (row + 0.5) * this.cellH + (this.cy - halfRowsH);

      // mix rows → spiral, then SNAP to grid
      let x = rx * (1-m) + sx * m;
      let y = ry * (1-m) + sy * m;
      x = Math.round(x / this.cellW) * this.cellW;
      y = Math.round(y / this.cellH) * this.cellH;

      // draw character (upright)
      const ch = line.charAt((i + (Math.floor(now*0.06) % line.length)) % line.length) || ".";
      ctx.fillText(ch, x, y);

      // progress along spiral
      this.theta[i] = t + this.speed;
    }

    requestAnimationFrame(this._tick.bind(this));
  }
}

customElements.define("vortex-text", VortexText);
