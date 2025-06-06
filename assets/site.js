// Highlight current tab based on pathname
(() => {
  const page = location.pathname.split('/').pop() || 'index.html';
  const map = { 'index.html': 'jack', 'tools.html': 'tools', 'shop.html': 'shop' };
  const active = map[page] || 'jack';
  document.querySelectorAll('.nav-link').forEach(a => {
    if (a.dataset.tab === active) a.classList.add('text-emerald-300');
  });
})();
