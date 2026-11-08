(() => {
  const KEY = 'rajComics.settings';
  const SORTS = ['number-asc', 'number-desc', 'name-asc', 'name-desc', 'year-asc', 'year-desc'];
  const num = (a, b) => v => typeof v === 'number' && Number.isFinite(v) && v >= a && v <= b;
  const oneOf = l => v => l.includes(v), bool = v => typeof v === 'boolean';
  // Single source of truth: [default, validator]. New fields added here get defaults for existing users automatically.
  const FIELDS = {
    theme: ['dark', oneOf(['dark', 'light'])], fontSize: [16, num(14, 20)],
    readingMode: ['continuous', oneOf(['single', 'continuous'])], pageFit: ['width', oneOf(['width', 'height', 'original'])],
    readingWidth: [1600, num(600, 1600)], rememberPosition: [true, bool], keyboardNavigation: [true, bool],
    showPageCounter: [true, bool], showMetadata: [true, bool],
    libraryLayout: ['grid', oneOf(['grid', 'list'])], librarySort: ['number-asc', oneOf(SORTS)]
  };
  const DEFAULTS = Object.fromEntries(Object.entries(FIELDS).map(([k, [d]]) => [k, d]));
  const clean = o => { const r = {}; for (const k in FIELDS) { const [d, ok] = FIELDS[k]; r[k] = o && ok(o[k]) ? o[k] : d; } return r; };
  const settings = {
    defaults: DEFAULTS,
    get() { try { const o = JSON.parse(localStorage.getItem(KEY)); return clean(o && typeof o === 'object' ? o : null); } catch { return clean(null); } },
    set(patch) { try { localStorage.setItem(KEY, JSON.stringify(clean({ ...settings.get(), ...patch }))); } catch {} },
    reset() { try { localStorage.removeItem(KEY); } catch {} }
  };
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const debounce = (fn, ms = 200) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
  const $ = (s, r = document) => r.querySelector(s);
  const ico = p => `<svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
  const SUN = ico('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>');
  const MOON = ico('<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>');

  // Applies theme and text size from saved settings to the current page.
  function apply() {
    const s = settings.get(), r = document.documentElement;
    r.dataset.theme = s.theme; r.style.fontSize = s.fontSize + 'px';
    const b = $('#themeBtn');
    if (b) {
      const t = s.theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme';
      b.setAttribute('aria-label', t); b.title = t; b.innerHTML = s.theme === 'dark' ? SUN : MOON;
    }
    document.dispatchEvent(new Event('rc:settings'));
  }

  function init() {
    const head = $('#app-header');
    if (head) {
      const page = head.dataset.page;
      const links = [['library', 'Comic Library', 'index.html'], ['settings', 'Settings', 'settings.html']];
      const nav = links.map(([k, label, href]) => `<a href="${href}" ${k === page ? 'aria-current="page"' : ''} class="rounded px-3 py-2 ${k === page ? 'bg-panel text-gold' : 'text-fg/80 hover:text-fg'}">${label}</a>`).join('');
      const back = page === 'viewer' ? '<a href="index.html" class="rounded px-3 py-2 text-brand hover:text-fg">Back to library</a>' : '';
      head.className = 'sticky top-0 z-40';
      head.innerHTML = `<header class="border-b border-edge bg-ink/95 backdrop-blur">
        <div class="mx-auto flex max-w-7xl flex-wrap items-center justify-between px-4 py-2">
          <a href="index.html" class="font-display text-3xl tracking-wider text-gold">Comic<span class="text-brand">Vault</span></a>
          <div class="flex items-center gap-2 sm:order-last sm:ml-2">
            <button id="themeBtn" type="button" class="rounded border border-edge p-1.5 hover:border-gold"></button>
            <button id="navBtn" type="button" class="rounded border border-edge px-3 py-1 sm:hidden" aria-expanded="false" aria-controls="mainNav">Menu</button>
          </div>
          <nav id="mainNav" aria-label="Main" class="hidden w-full flex-col sm:flex sm:w-auto sm:flex-row">${back}${nav}</nav>
        </div></header>`;
      $('#navBtn').addEventListener('click', e => {
        const open = $('#mainNav').classList.toggle('hidden') === false;
        e.currentTarget.setAttribute('aria-expanded', open);
      });
      $('#themeBtn').addEventListener('click', () => { settings.set({ theme: settings.get().theme === 'dark' ? 'light' : 'dark' }); apply(); });
    }
    const foot = $('#app-footer');
    if (foot) foot.innerHTML = '<footer class="mt-8 border-t border-edge py-6 text-center text-sm text-subtle">ComicVault. Your reading preferences are stored in this browser only.</footer>';
    apply();
  }
  window.addEventListener('storage', e => { if (e.key === KEY || e.key === null) apply(); });
  window.RC = { settings, esc, debounce, $, apply };
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();
})();
