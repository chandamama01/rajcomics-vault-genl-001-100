(() => {
  const { $, esc, settings } = RC;
  const S = settings.get(), POS = 'rajComics.positions';
  const readPos = () => { try { return JSON.parse(localStorage.getItem(POS) || '{}'); } catch { return {}; } };
  const savePos = (id, p) => { try { localStorage.setItem(POS, JSON.stringify({ ...readPos(), [id]: p })); } catch {} };
  // Single shared state: both pagination toolbars render from this object only.
  const st = { comic: null, page: 1, total: 0, mode: S.readingMode === 'continuous' ? 'continuous' : 'single', width: Number(S.readingWidth) || 900 };
  const pages = $('#pages'), reader = $('#reader');
  let io, lock = false, lockT, alignUntil = 0;
  const FIT = { width: 'mx-auto h-auto w-full', height: 'mx-auto h-auto max-h-[calc(100vh-10rem)] w-auto max-w-full', original: 'h-auto w-auto max-w-none' };
  const fit = () => (st.mode === 'continuous' && S.pageFit === 'height') ? 'width' : (FIT[S.pageFit] ? S.pageFit : 'width');

  function showError(title, msg) {
    $('#meta').innerHTML = '';
    $('#toolbar').classList.add('hidden'); $('#topPager').innerHTML = ''; $('#bottomPager').innerHTML = '';
    pages.innerHTML = `<div class="rounded-lg border border-brand/50 bg-brand/10 p-8 text-center" role="alert"><p class="text-lg">${esc(title)}</p><p class="mt-1 text-fg/80">${esc(msg)}</p><a href="index.html" class="mt-4 inline-block rounded bg-brand px-4 py-2 text-white">Back to library</a></div>`;
  }
  const fallback = n => `<div class="flex min-h-[40vh] flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-edge bg-panel p-8 text-center"><p>Page ${n} could not be loaded.</p><button type="button" data-retry="${n}" class="rounded bg-brand px-4 py-2 text-white">Retry</button></div>`;
  const imgTag = (n, loading) => `<img src="${esc(st.comic.images[n - 1])}" data-i="${n}" alt="Page ${n} of ${esc(st.comic.comicName)}" loading="${loading}" decoding="async" class="${FIT[fit()]}">`;
  const figStyle = () => fit() === 'original' ? 'overflow-x:auto' : fit() === 'width' ? 'max-width:min(var(--w),100%)' : '';
  const fig = (n, loading) => `<figure data-i="${n}" class="mx-auto mb-3 min-h-[60vh] scroll-mt-28 bg-panel" style="${figStyle()}">${imgTag(n, loading)}</figure>`;

  function renderSingle() {
    pages.innerHTML = fig(st.page, 'eager');
    [st.page - 1, st.page + 1].forEach(n => { if (n >= 1 && n <= st.total) new Image().src = st.comic.images[n - 1]; });
  }
  function renderContinuous() {
    let h = ''; for (let i = 1; i <= st.total; i++) h += fig(i, i === st.page ? 'eager' : 'lazy');
    pages.innerHTML = h;
    io.disconnect(); [...pages.children].forEach(el => io.observe(el));
    if (st.page > 1) scrollToPage('auto');
  }
  function scrollToPage(behavior) {
    lock = true; alignUntil = Date.now() + 1500;
    pages.children[st.page - 1]?.scrollIntoView({ behavior, block: 'start' });
    clearTimeout(lockT); lockT = setTimeout(() => lock = false, behavior === 'smooth' ? 900 : 120);
  }
  function render() {
    document.querySelectorAll('[data-mode]').forEach(b => {
      const on = b.dataset.mode === st.mode;
      b.setAttribute('aria-pressed', on); b.className = `flex items-center gap-1 px-2 py-1.5 sm:px-3 ${on ? 'bg-gold text-on-gold' : 'text-fg/80 hover:text-fg'}`;
    });
    pages.style.setProperty('--w', st.width + 'px');
    st.mode === 'single' ? renderSingle() : renderContinuous();
    updatePagination();
  }
  // The only place pagination UI is written: every [data-pager] gets identical text and disabled states.
  function updatePagination() {
    const txt = `Page ${st.page} of ${st.total}`, showCounter = settings.get().showPageCounter;
    document.querySelectorAll('[data-pager]').forEach(p => {
      const c = $('[data-counter]', p); const gi = $('[data-goto]', p); if (document.activeElement !== gi) gi.value = st.page;
      $('[data-total]', p).textContent = st.total; c.children[1].textContent = txt; c.classList.toggle('hidden', !showCounter);
      p.querySelectorAll('[data-nav]').forEach(b => b.disabled = (['first', 'prev'].includes(b.dataset.nav) && st.page <= 1) || (['next', 'last'].includes(b.dataset.nav) && st.page >= st.total));
    });
    $('#live').textContent = txt; $('#goto').value = st.page;
  }
  function persist() {
    if (S.rememberPosition) savePos(st.comic.id, st.page);
    const p = new URLSearchParams({ comic: st.comic.id, page: st.page });
    history.replaceState(null, '', '?' + p);
  }
  // Every navigation source (toolbars, keys, go-to box, scroll observer) calls this one function.
  function goTo(n, { scroll = true, instant = false } = {}) {
    n = Math.round(Number(n)); if (!Number.isFinite(n) || !st.total) return;
    n = Math.min(st.total, Math.max(1, n));
    const changed = n !== st.page; st.page = n;
    if (st.mode === 'single' && changed) { renderSingle(); pages.firstElementChild?.scrollIntoView({ block: 'start' }); }
    else if (st.mode === 'continuous' && scroll) scrollToPage(instant ? 'auto' : 'smooth');
    updatePagination(); persist();
  }
  const dest = { first: () => 1, prev: () => st.page - 1, next: () => st.page + 1, last: () => st.total };

  async function init() {
    const id = new URLSearchParams(location.search).get('comic');
    pages.innerHTML = '<div class="mx-auto h-[70vh] max-w-2xl animate-pulse rounded-lg bg-panel" role="status"><span class="sr-only">Loading comic</span></div>';
    if (!id) return showError('No comic selected.', 'Open a comic from the library.');
    let list;
    try {
      const r = await fetch('data/comics.json');
      if (!r.ok) throw new Error('Server returned ' + r.status);
      const j = await r.json(); list = Array.isArray(j) ? j : j?.comics;
      if (!Array.isArray(list)) throw new Error('comics.json has an unexpected format.');
    } catch (e) {
      console.error(e);
      return showError('The comic data could not be loaded.', e.message + (location.protocol === 'file:' ? ' Serve the folder over HTTP (python -m http.server) instead of opening the file directly.' : ''));
    }
    const c = list.find(x => x && String(x.id) === id);
    if (!c) return showError('Comic not found.', `There is no comic with the ID "${id}".`);
    const images = Array.isArray(c.images) ? c.images.filter(x => typeof x === 'string' && x.trim()) : [];
    if (!images.length) return showError('This comic has no pages yet.', c.comicName || id);
    st.comic = { id: String(c.id), comicName: String(c.comicName || c.id), images };
    st.total = images.length;
    document.title = `${st.comic.comicName} | ComicVault`;
    if (S.showMetadata) {
      const heroes = Array.isArray(c.heroes) ? c.heroes.join(', ') : '';
      $('#meta').innerHTML = `<div class="flex flex-wrap items-center gap-x-3 gap-y-1"><h1 class="font-display text-3xl tracking-wide">${esc(st.comic.comicName)}</h1><span class="text-sm text-muted">${esc(c.comicNumber || c.id)}${c.year ? ' | ' + esc(c.year) : ''}</span></div>${heroes ? `<p class="text-sm text-muted">${esc(heroes)}</p>` : ''}`;
    }
    const tpl = $('#pagerTpl');
    ['#topPager', '#bottomPager'].forEach(s => $(s).append(tpl.content.cloneNode(true)));
    $('#goto').max = st.total;
    if (!document.fullscreenEnabled) $('#fs').classList.add('hidden');
    const q = parseInt(new URLSearchParams(location.search).get('page'), 10);
    const saved = S.rememberPosition ? parseInt(readPos()[st.comic.id], 10) : NaN;
    st.page = Math.min(st.total, Math.max(1, Number.isFinite(q) ? q : Number.isFinite(saved) ? saved : 1));
    io = new IntersectionObserver(es => {
      if (lock) return;
      es.forEach(e => { if (e.isIntersecting && +e.target.dataset.i !== st.page) goTo(+e.target.dataset.i, { scroll: false }); });
    }, { rootMargin: '-40% 0px -59% 0px' });
    render(); persist();
  }

  reader.addEventListener('click', e => {
    const nav = e.target.closest('[data-nav]')?.dataset.nav, mode = e.target.closest('[data-mode]')?.dataset.mode, retry = e.target.closest('[data-retry]')?.dataset.retry;
    if (nav) goTo(dest[nav]());
    else if (mode && mode !== st.mode) { st.mode = mode; settings.set({ readingMode: mode }); render(); }
    else if (retry) {
      const n = +retry, f = pages.querySelector(`figure[data-i="${n}"]`);
      f.innerHTML = imgTag(n, 'eager'); const im = $('img', f); im.src += (im.src.includes('?') ? '&' : '?') + 'r=' + Date.now();
    }
  });
  $('#goto').addEventListener('change', e => goTo(e.target.value));
  // Counter input inside both pagination toolbars (phones): same goTo, so both stay in sync.
  reader.addEventListener('change', e => { if (e.target.matches('[data-goto]')) { goTo(e.target.value); updatePagination(); } });
  reader.addEventListener('focusin', e => { if (e.target.matches('[data-goto]')) e.target.select(); });
  $('#fs').addEventListener('click', () => document.fullscreenElement ? document.exitFullscreen() : reader.requestFullscreen?.());
  document.addEventListener('fullscreenchange', () => {
    const t = document.fullscreenElement ? 'Exit fullscreen' : 'Fullscreen';
    $('#fs').title = t; $('#fs').setAttribute('aria-label', t); $('#fs span').textContent = t;
  });
  // Images do not bubble load/error events, so listen in the capture phase.
  pages.addEventListener('load', e => {
    const im = e.target; if (im.tagName !== 'IMG') return;
    im.parentElement.classList.remove('min-h-[60vh]', 'bg-panel');
    if (st.mode === 'continuous' && Date.now() < alignUntil && +im.dataset.i < st.page) scrollToPage('auto');
  }, true);
  pages.addEventListener('error', e => {
    if (e.target.tagName !== 'IMG') return;
    const f = e.target.parentElement; f.classList.remove('min-h-[60vh]', 'bg-panel'); f.innerHTML = fallback(+e.target.dataset.i);
  }, true);
  document.addEventListener('keydown', e => {
    if (!st.total || !settings.get().keyboardNavigation || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    if (e.target.closest?.('input,select,textarea,[contenteditable="true"]')) return;
    const k = { ArrowLeft: 'prev', ArrowRight: 'next', Home: 'first', End: 'last' }[e.key];
    if (k) { e.preventDefault(); goTo(dest[k]()); }
  });
  init();
})();
