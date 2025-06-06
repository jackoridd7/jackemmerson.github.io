/*
 * Populates #spiral with absolutely-positioned <span>s that follow
 * r = a + bθ, then lets CSS @keyframes rotate the whole lot.
 */
(() => {
  const keywords = [
    'TRAJECTORY','DELTA-V','CFD','PROPULSION','RE-ENTRY',
    'COMPUTATIONAL AERO','STRUCTURES','ORBITAL MECH','MARS LOGISTICS',
    'LIFT-DRAG','ROVER DESIGN','MICRO UAV','MISSION ANALYSIS',
    'STARSHIP','SPACE SYSTEMS','SPICE KERNELS'
  ];
  const phrase = keywords.join(' • ') + ' • ';
  const container = document.getElementById('spiral');
  const R = 310;                 // centre in px (half of 620)
  const step = 0.28;             // radians per character
  const scale = 5;               // spiral tightness
  let θ = 0;

  [...phrase.repeat(20)].forEach(char => {
    const span = document.createElement('span');
    const r = 6 + scale * θ;
    if (r > R - 20) { θ = 0; return; }   // stop near edge
    span.textContent = char;
    span.style.left = `${R + r * Math.cos(θ)}px`;
    span.style.top  = `${R + r * Math.sin(θ)}px`;
    span.style.transform = `translate(-50%,-50%) rotate(${θ * 57.2958}deg)`;
    container.appendChild(span);
    θ += step;
  });
})();
