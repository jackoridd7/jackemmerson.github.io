document.addEventListener('DOMContentLoaded', () => {
  const file = location.pathname.split('/').pop() || 'index.html';
  const map  = { 'index.html':'jack', 'tools.html':'tools', 'shop.html':'shop' };
  (document.querySelectorAll('.nav-link')||[]).forEach(a=>{
    if(a.dataset.tab === (map[file] || 'jack'))
      a.classList.add('text-emerald-300');
  });
});
