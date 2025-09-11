// Canvas-based, grid-snapped spiral with a 3s boot delay and scalable text.
// New: data-centerx / data-centery control where the spiral is centred (0..1 of viewport).

class VortexText extends HTMLElement {
  connectedCallback() {
    const getNum = (k, d) => {
      const v = this.getAttribute(k) ?? this.dataset[k] ?? d;
      return v === null ? d : +v;
    };
    const getStr = (k, d) => (this.getAttribute(k) ?? this.dataset[k] ?? d);

    // config
    this.words = getStr("data-words", "CFD,Δv,ORBITAL").split(",").map(s=>s.trim());
    this.cellW = getNum("data-cellw", 12);          // 2× width (was 6)
    this.cellH = getNum("data-cellh", 36);          // 2× height (was 18)
    this.rows  = getNum("data-rows", 40);
    this.B     = getNum("data-b", 4.2);             // r = B * θ
    this.speed = getNum("data-speed", 0.022);       // rad / frame
    this.boot  = getNum("data-boot", 3000);         // ms rows-before-morph
    this.centerX = Math.min(1, Math.max(0, getNum("data-centerx", 0.5)));
    this.centerY = Math.min(1, Math.max(0, getNum("data-centery", 0.58)));

    // derived
    this.line = (this.words.join(" • ") + " • ").replace(/ /g, "\u00A0");

    // canvas
    this.canvas = document.createElement("canvas");
    this.ctx = this.canvas.getContext("2d");
    this.style.display = "block";
    this.appendChild(this.canvas);

    // sizing
    this._resize = this._resize.bind(this);
    window.addEventListener("resize", this._resize, { passive: true });
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
    this.maxR = Math.hypot(Math.max(this.cx, innerWidth - this.cx),
                           Math.max(this.cy, innerHeight - this.cy)) + 60;

    // agents on a grid (capped for perf)
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

    // font scales with cell height (≈ 0.61 of cellH)
    this.fontPx = Math.max(10, Math.floor(this.cellH * 0.61));
  }

  _easeInOut(t){ return t < .5 ? 4*t*t*t : 1 - Math.pow(-2*t+2,3)/2; }

  _tick(now) {
    const ctx = this.ctx;
    ctx.clearRect(0,0,innerWidth,innerHeight);

    // text style
    ctx.fillStyle   = "#94a3b8";
    ctx.font        = `${this.fontPx}px "Courier New", monospace`;
    ctx.textAlign   = "center";
    ctx.textBaseline= "middle";

    // 3s delay, then 1.2s ease to spiral
    const m = Math.min(1, Math.max(0, (now - this.start - this.boot) / 1200));
    const morph = this._easeInOut(m);

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
      let sx = this.cx + r*Math.cos(t);
      let sy = this.cy + r*Math.sin(t);

      // initial row position
      const [c,row] = this.rowcol[i];
      const rx = (c + 0.5) * this.cellW;
      const ry = (row + 0.5) * this.cellH + (this.cy - halfRowsH);

      // mix rows → spiral, then SNAP to grid
      let x = rx * (1-morph) + sx * morph;
      let y = ry * (1-morph) + sy * morph;
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
