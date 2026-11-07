(() => {
  const { $, esc, debounce, settings } = RC;
  const res = $('#results');
  const S = settings.get();
  const SORTS = ['number-asc', 'number-desc', 'name-asc', 'name-desc', 'year-asc', 'year-desc'];
  const D = { q: '', year: '', lang: '', cat: '', sort: SORTS.includes(S.librarySort) ? S.librarySort : 'number-asc' };
  const st = { ...D };
  let all = [], layout = S.libraryLayout === 'list' ? 'list' : 'grid';

  const arr = v => Array.isArray(v) ? v.filter(x => typeof x === 'string' && x.trim()).map(x => x.trim()) : [];
  function norm(r) {
    if (!r || typeof r !== 'object') return null;
    const id = String(r.id || '').trim(), name = String(r.comicName || '').trim();
    if (!id || !name) return null;
    const y = parseInt(r.year, 10), v = String(r.viewer || '');
    return { id, number: String(r.comicNumber || id), name, year: Number.isFinite(y) ? y : null,
      heroes: arr(r.heroes), cats: arr(r.categories), lang: String(r.language || '').trim(), images: arr(r.images),
      viewer: /^[\w.-]+\.html$/.test(v) ? v : 'comics-viewer.html' };
  }
  const cmp = { number: (a, b) => a.number.localeCompare(b.number, undefined, { numeric: true }), name: (a, b) => a.name.localeCompare(b.name), year: (a, b) => (a.year ?? 0) - (b.year ?? 0) };
  const filtered = () => {
    const q = st.q.toLowerCase();
    const list = all.filter(c => (!st.year || String(c.year) === st.year) && (!st.lang || c.lang === st.lang) &&
      (!st.cat || c.cats.includes(st.cat)) && (!q || [c.number, c.name, ...c.heroes].some(s => s.toLowerCase().includes(q))));
    const [k, d] = st.sort.split('-');
    return list.sort((a, b) => cmp[k](a, b) * (d === 'desc' ? -1 : 1));
  };

  const href = c => `${c.viewer}?comic=${encodeURIComponent(c.id)}`;
  const ph = c => `<div class="ph flex h-full w-full items-center justify-center bg-edge p-2 text-center font-display text-2xl text-muted">${esc(c.number)}</div>`;
  const cover = c => c.images[0] ? `<img src="${esc(c.images[0])}" data-n="${esc(c.number)}" alt="Cover of ${esc(c.name)}" loading="lazy" class="block h-auto w-full">` : ph(c);
  const card = c => `<a href="${href(c)}" class="group flex flex-col overflow-hidden rounded-lg border border-edge bg-panel transition hover:-translate-y-1 hover:border-gold">
    <div class="relative aspect-[2/3] overflow-hidden bg-edge">${cover(c)}
      <span class="absolute inset-x-0 bottom-0 translate-y-full bg-brand py-2 text-center text-white font-display text-lg tracking-wide transition group-hover:translate-y-0 group-focus-visible:translate-y-0">Read comic</span></div>
    <div class="p-3"><div class="flex justify-between text-xs text-muted"><span>${esc(c.number)}</span><span>${c.year ?? ''}</span></div>
      <h3 class="line-clamp-2 font-semibold">${esc(c.name)}</h3>
      <p class="line-clamp-1 text-sm text-muted">${esc(c.heroes.join(', '))}</p><p class="text-xs text-subtle">${esc(c.lang)}</p></div></a>`;
  const row = c => `<a href="${href(c)}" class="group flex gap-4 rounded-lg border border-edge bg-panel p-3 transition hover:border-gold">
    <div class="aspect-[2/3] w-20 shrink-0 self-start overflow-hidden rounded bg-edge sm:w-24">${cover(c)}</div>
    <div class="min-w-0 flex-1"><div class="flex flex-wrap items-center gap-2 text-xs text-muted"><span>${esc(c.number)}</span><span>${c.year ?? ''}</span><span>${esc(c.lang)}</span></div>
      <h3 class="mt-1 text-lg font-semibold">${esc(c.name)}</h3>
      <p class="text-sm text-fg/80">${esc(c.heroes.join(', '))}</p><p class="text-sm text-subtle">${esc(c.cats.join(', '))}</p></div>
    <span class="self-center rounded bg-brand px-4 py-2 text-white font-display text-lg group-hover:bg-white group-hover:text-brand">Read</span></a>`;

  function fill(sel, vals, label, cur) {
    const el = $(sel);
    el.innerHTML = `<option value="">${label}</option>` + vals.map(v => `<option value="${esc(v)}">${esc(v)}</option>`).join('');
    el.value = cur;
  }
  function syncUrl() {
    const p = new URLSearchParams();
    for (const k in D) if (st[k] !== D[k]) p.set(k, st[k]);
    history.replaceState(null, '', p.toString() ? '?' + p : location.pathname);
  }
  function render() {
    const list = filtered(), active = ['q', 'year', 'lang', 'cat'].some(k => st[k]);
    $('#count').textContent = `Showing ${list.length} of ${all.length} comics`;
    $('#clear').classList.toggle('hidden', !active);
    document.querySelectorAll('[data-layout]').forEach(b => {
      const on = b.dataset.layout === layout;
      b.setAttribute('aria-pressed', on); b.className = `px-2.5 py-1.5 text-sm ${on ? 'bg-gold text-on-gold' : 'text-fg/80 hover:text-fg'}`;
    });
    if (!list.length) {
      res.className = '';
      res.innerHTML = '<div class="rounded-lg border border-dashed border-edge p-10 text-center"><p class="text-lg">No comics match your search.</p><p class="text-muted">Try different words or remove a filter.</p><button type="button" data-act="clear" class="mt-4 rounded bg-brand px-4 py-2 text-white">Clear filters</button></div>';
    } else {
      res.className = layout === 'grid' ? 'grid grid-cols-2 items-start gap-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6' : 'flex flex-col gap-3';
      res.innerHTML = list.map(layout === 'grid' ? card : row).join('');
    }
    syncUrl();
  }
  function clearAll() {
    Object.assign(st, { q: '', year: '', lang: '', cat: '' });
    $('#search').value = ''; ['year', 'lang', 'cat'].forEach(k => $('#' + k).value = ''); render();
  }

  async function load() {
    res.className = 'grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6';
    res.innerHTML = '<p class="sr-only" role="status">Loading comics</p>' + '<div class="aspect-[2/3] animate-pulse rounded-lg bg-panel"></div>'.repeat(12);
    try {
      const r = await fetch('data/comics.json');
      if (!r.ok) throw new Error('Server returned ' + r.status);
      const j = await r.json(), raw = Array.isArray(j) ? j : j?.comics;
      if (!Array.isArray(raw)) throw new Error('comics.json must be an array or an object with a "comics" array.');
      const seen = new Set(); let bad = 0;
      all = raw.map(norm).filter(c => { if (!c || seen.has(c.id)) { bad++; return false; } seen.add(c.id); return true; });
      if (bad) {
        console.warn(`${bad} comic record(s) skipped: missing id or comicName, or duplicate id.`);
        const n = $('#notice'); n.classList.replace('hidden', 'flex');
        n.innerHTML = `<span>${bad} invalid comic record(s) were skipped.</span><button type="button" data-act="dismiss" class="underline">Dismiss</button>`;
      }
      const u = a => [...new Set(a)].sort();
      fill('#year', u(all.map(c => c.year).filter(Boolean)).reverse(), 'All years', st.year);
      fill('#lang', u(all.map(c => c.lang).filter(Boolean)), 'All languages', st.lang);
      fill('#cat', u(all.flatMap(c => c.cats)), 'All categories', st.cat);
      $('#sort').value = st.sort;
      $('#total').textContent = `${all.length} comics in the library`;
      render();
    } catch (e) {
      console.error('Could not load comics.json:', e);
      res.className = '';
      res.innerHTML = `<div class="rounded-lg border border-brand/50 bg-brand/10 p-8 text-center" role="alert"><p class="text-lg">The comic list could not be loaded.</p><p class="mt-1 text-fg/80">${esc(e.message)}</p>${location.protocol === 'file:' ? '<p class="mt-1 text-fg/80">This page was opened as a local file. Start a local server (python -m http.server) and open http://localhost:8000 instead.</p>' : ''}<button type="button" data-act="retry" class="mt-4 rounded bg-brand px-4 py-2 text-white">Try again</button></div>`;
    }
  }

  const p = new URLSearchParams(location.search);
  if (p.has('q')) st.q = p.get('q');
  if (SORTS.includes(p.get('sort'))) st.sort = p.get('sort');
  ['year', 'lang', 'cat'].forEach(k => { if (p.has(k)) st[k] = p.get(k); });
  $('#search').value = st.q;

  $('#search').addEventListener('input', debounce(e => { st.q = e.target.value.trim(); render(); }));
  ['year', 'lang', 'cat', 'sort'].forEach(k => $('#' + k).addEventListener('change', e => { st[k] = e.target.value; render(); }));
  document.querySelectorAll('[data-layout]').forEach(b => b.addEventListener('click', () => { layout = b.dataset.layout; settings.set({ libraryLayout: layout }); render(); }));
  $('#clear').addEventListener('click', clearAll);
  $('#filterToggle').addEventListener('click', e => {
    const open = $('#filters').classList.toggle('hidden') === false;
    $('#filters').classList.toggle('grid', open); e.currentTarget.setAttribute('aria-expanded', open);
  });
  document.addEventListener('click', e => {
    const a = e.target.closest('[data-act]')?.dataset.act;
    if (a === 'clear') clearAll(); else if (a === 'retry') load(); else if (a === 'dismiss') $('#notice').classList.replace('flex', 'hidden');
  });
  // Reserve a 2:3 box while loading, then let each cover take its own full, uncropped shape.
  res.addEventListener('load', e => { if (e.target.tagName === 'IMG') e.target.parentElement.classList.remove('aspect-[2/3]'); }, true);
  res.addEventListener('error', e => {
    if (e.target.tagName === 'IMG') e.target.outerHTML = ph({ number: e.target.dataset.n });
  }, true);
  load();
})();
