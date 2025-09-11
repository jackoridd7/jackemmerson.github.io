// <vortex-text> — grid-snapped, canvas-based text vortex
// Attributes (all optional):
//   cellw, cellh   -> grid cell size in px (default 6x18)
//   rows           -> how many visible text rows before morph
//   speed          -> radians/frame increment
//   b              -> spiral spacing (r = b * theta)
//   boot           -> ms to show horizontal rows before morph begins

class VortexText extends HTMLElement {
  connectedCallback() {
    this.attachShadow({ mode: "open" });
    const wrap = document.createElement("div");
    wrap.style.cssText = `
      position:fixed; inset:0; pointer-events:none; z-index:0;
      background-image: repeating-linear-gradient(
        to bottom,
        rgba(255,255,255,.03) 0px,
        rgba(255,255,255,.03) 1px,
        transparent 1px,
        transparent 3px
      );`;

    this.canvas = document.createElement("canvas");
    wrap.appendChild(this.canvas);

    const style = document.createElement("style");
    style.textContent = `:host{display:block}`;
    this.shadowRoot.append(style, wrap);

    // config
    this.cellW = +this.getAttribute("cellw") || 6;
    this.cellH = +this.getAttribute("cellh") || 18;
    this.rows  = +this.getAttribute("rows")  || 44;
    this.speed = +this.getAttribute("speed") || 0.022;
    this.B     = +this.getAttribute("b")     || 4.2;
    this.boot  = +this.getAttribute("boot")  || 900;

    // data
    this.words = [
      "TRAJECTORY","PROPULSION","Δv","CFD","REENTRY","ORBITAL",
      "STARSHIP","MARS","SPICE","ROVER","SCRAMJET","UAV"
    ];
    this.line = (this.words.join(" • ") + " • ").replace(/ /g, "\u00A0");

    // size + init
    this.ctx = this.canvas.getContext("2d");
    this.onResize = this.onResize.bind(this);
    window.addEventListener("resize", this.onResize, { passive: true });
    this.onResize();
    this.start = performance.now();
    requestAnimationFrame(this.tick.bind(this));
  }

  disconnectedCallback() { window.removeEventListener("resize", this.onResize); }

  onResize() {
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    this.W = this.canvas.width  = Math.floor(innerWidth  * dpr);
    this.H = this.canvas.height = Math.floor(innerHeight * dpr);
    this.dpr = dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    this.cols = Math.ceil(innerWidth / this.cellW);
    this.gridCount = this.rows * this.cols;

    this.cx = innerWidth  / 2;
    this.cy = innerHeight / 2;
    this.maxR = Math.hypot(this.cx, this.cy) + 60;

    // agents: one per grid cell (capped for perf)
    const N = Math.min(this.gridCount, 9000);
    this.theta = new Float32Array(N);
    this.rowCol = new Array(N);
    const seed = Math.random() * Math.PI * 2;

    let i = 0;
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols && i < N; c++, i++) {
        this.theta[i] = seed + (i * 0.005) % (this.maxR / this.B);
        this.rowCol[i] = [c, r];
      }
    }
  }

  tick(now) {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, innerWidth, innerHeight);

    // style
    ctx.fillStyle = "#94a3b8";
    ctx.font = `11px "Courier New", monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = "rgba(0,0,0,.6)";
    ctx.shadowBlur = 0;

    const morph = Math.min(1, Math.max(0, (now - this.start - this.boot) / 1200));
    const line = this.line;

    for (let i = 0; i < this.theta.length; i++) {
      // spiral position
      const t = this.theta[i];
      const r = this.B * t;
      let sx = this.cx + r * Math.cos(t);
      let sy = this.cy + r * Math.sin(t);

      // wrap so flow is continuous
      if (r > this.maxR) {
        this.theta[i] = t - (this.maxR / this.B);
        continue;
      }

      // row (initial) position
      const [c, rRow] = this.rowCol[i];
      const rx = (c + 0.5) * this.cellW;
      const ry = (rRow + 0.5) * this.cellH + (this.cy - (this.rows * this.cellH) / 2);

      // mix & snap to grid
      let x = rx * (1 - morph) + sx * morph;
      let y = ry * (1 - morph) + sy * morph;
      x = Math.round(x / this.cellW) * this.cellW;
      y = Math.round(y / this.cellH) * this.cellH;

      // pick a character
      const ch = line.charAt((i + (Math.floor(now * 0.06) % line.length)) % line.length) || ".";

      ctx.fillText(ch, x, y);

      // advance along spiral (upright characters)
      this.theta[i] += this.speed;
    }

    requestAnimationFrame(this.tick.bind(this));
  }
}

customElements.define("vortex-text", VortexText);
