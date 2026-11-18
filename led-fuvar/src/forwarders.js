// Szállítmányozók listája
(function initFwd() {
  const box = $('fwdList'); if (!box) return;
  let filter = 'all';
  function render() {
    const F = D.forwarders || EMBEDDED.forwarders; if (!F) return;
    $('fwdMeta').textContent = `${F.list.length} cég · frissítve: ${F.updated}`;
    $('fwdNote').textContent = F.note;
    const items = F.list.filter(f => filter === 'all' || (filter === 'hu' ? /Magyar tulajdon/.test(f.tag) : f.modes.some(m => m.startsWith(filter))));
    box.replaceChildren(...items.map(f => {
      const c = el('article', 'fwd');
      const h = el('div', 'fwd-h'); h.append(el('h3', '', f.name), el('span', 'fwd-tag' + (/Magyar tulajdon/.test(f.tag) ? ' hu' : ''), f.tag)); c.append(h);
      const m = el('div', 'fwd-modes'); f.modes.forEach(x => m.append(el('span', 'fwd-mode' + (/LCL/.test(x) ? ' lcl' : ''), x))); c.append(m);
      const ul = el('ul'); f.facts.forEach(x => ul.append(el('li', '', x))); c.append(ul);
      const ln = el('div', 'fwd-links');
      f.links.forEach(l => { const u = safeUrl(l.url); if (!u) return; const a = el('a', '', l.label + ' ↗'); a.href = u; a.target = '_blank'; a.rel = 'noopener noreferrer'; ln.append(a); });
      c.append(ln); return c;
    }));
    if (!items.length) box.append(el('p', 'src', 'Nincs találat.'));
  }
  document.querySelectorAll('#fwdFilter button').forEach(b => b.addEventListener('click', () => {
    filter = b.dataset.f; document.querySelectorAll('#fwdFilter button').forEach(x => x.setAttribute('aria-pressed', x === b)); render();
  }));
  render(); window.__fwdRender = render;
})();
