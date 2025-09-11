// Page fade-in
document.addEventListener("DOMContentLoaded", () => {
  document.body.style.opacity = "1";
});

// Soft page fade-out for internal links
document.addEventListener("click", (e) => {
  const a = e.target.closest('a[href]');
  if (!a) return;
  const url = new URL(a.href, location.href);
  const sameSite = url.origin === location.origin;
  const isFile = url.pathname.endsWith(".html") || url.pathname === "/" || url.pathname.endsWith("/");
  if (sameSite && isFile && !a.hasAttribute("data-no-transition") && a.target !== "_blank") {
    e.preventDefault();
    document.body.style.opacity = "0";
    setTimeout(() => (location.href = a.href), 180);
  }
});

// Very light "smooth scroll" feel without libs
(() => {
  let y = window.scrollY, vy = y;
  function raf() {
    y = window.scrollY;
    vy += (y - vy) * 0.12;                // ease towards target
    window.scrollTo(0, vy);
    requestAnimationFrame(raf);
  }
  requestAnimationFrame(raf);
})();

// Reveal-on-scroll
(() => {
  const obs = new IntersectionObserver(entries => {
    for (const en of entries) {
      if (en.isIntersecting) {
        en.target.style.transition = "opacity .6s ease, transform .6s ease";
        en.target.style.opacity = "1";
        en.target.style.transform = "translateY(0)";
        obs.unobserve(en.target);
      }
    }
  }, { rootMargin: "0px 0px -10% 0px", threshold: 0.1 });

  document.querySelectorAll("[data-reveal]").forEach(el => {
    el.style.opacity = "0";
    el.style.transform = "translateY(12px)";
    obs.observe(el);
  });
})();
