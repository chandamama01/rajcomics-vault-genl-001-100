(() => {
  const { $, settings } = RC, POS = 'rajComics.positions';
  const seg = (k, t, d, o) => ({ k, t, d, type: 'seg', o });
  const tog = (k, t, d) => ({ k, t, d, type: 'toggle' });
  const CFG = [
    { title: 'Appearance', rows: [
      seg('theme', 'Theme', 'Switch between the dark and light look.', [['dark', 'Dark'], ['light', 'Light']]),
      { k: 'fontSize', t: 'Text size', d: 'Scales the whole site. Try it, the page resizes as you drag.', type: 'range', min: 14, max: 20, step: 1 }] },
    { title: 'Reading', rows: [
      seg('readingMode', 'Default reading mode', 'How a comic opens: one page at a time or one long scroll.', [['single', 'Single page'], ['continuous', 'Continuous']]),
      seg('pageFit', 'Page fitting', 'Fit width fills the reading area. Fit height shows a whole page on screen (single page mode only). Original size never scales.', [['width', 'Fit width'], ['height', 'Fit height'], ['original', 'Original']]),
      { k: 'readingWidth', t: 'Maximum page width', d: 'The widest a page can get when fitting to width.', type: 'range', min: 600, max: 1600, step: 50 },
      tog('rememberPosition', 'Remember last position', 'Reopen each comic on the page where you stopped.'),
      tog('keyboardNavigation', 'Keyboard navigation', 'Left and right arrows change pages. Home and End jump to the first and last.'),
      tog('showPageCounter', 'Show page counter', 'Display the current page and total in the viewer.'),
      tog('showMetadata', 'Show comic details', 'Display the name, number, year and heroes above the pages.')] },
    { title: 'Library', rows: [
      seg('libraryLayout', 'Default layout', 'Covers in a grid, or rows with more detail.', [['grid', 'Grid'], ['list', 'List']]),
      { k: 'librarySort', t: 'Default sorting', d: 'The order comics appear in when the library opens.', type: 'select',
        o: [['number-asc', 'Number: low to high'], ['number-desc', 'Number: high to low'], ['name-asc', 'Name: A to Z'], ['name-desc', 'Name: Z to A'], ['year-asc', 'Year: oldest first'], ['year-desc', 'Year: newest first']] }] },
    { title: 'Data', rows: [
      { k: 'reset', t: 'Reset all preferences', d: 'Restore every setting on this page to its default.', type: 'btn', label: 'Reset', danger: true },
      { k: 'clearPos', t: 'Clear saved reading positions', d: 'Forget where you stopped in every comic. Your preferences stay as they are.', type: 'btn', label: 'Clear', danger: true }] }
  ];
  const ctl = r => {
    const l = `aria-labelledby="l-${r.k}"`;
    if (r.type === 'seg') return `<div role="group" ${l} data-seg="${r.k}" class="flex overflow-hidden rounded border border-edge">${r.o.map(([v, t]) => `<button type="button" data-val="${v}">${t}</button>`).join('')}</div>`;
    if (r.type === 'toggle') return `<button type="button" role="switch" ${l} data-toggle="${r.k}"><span></span></button>`;
    if (r.type === 'range') return `<div class="flex items-center gap-3"><input type="range" ${l} data-range="${r.k}" min="${r.min}" max="${r.max}" step="${r.step}" class="w-40"><output data-out="${r.k}" class="w-16 text-right text-sm text-muted"></output></div>`;
    if (r.type === 'select') return `<select ${l} data-select="${r.k}" class="rounded border border-edge bg-ink px-2 py-1.5 text-sm">${r.o.map(([v, t]) => `<option value="${v}">${t}</option>`).join('')}</select>`;
    return `<button type="button" data-act="${r.k}" class="rounded border px-3 py-1.5 text-sm ${r.danger ? 'border-brand text-brand hover:bg-brand hover:text-white' : 'border-edge'}">${r.label}</button>`;
  };
  $('#cards').innerHTML = CFG.map((c, i) => `<section aria-labelledby="h-${i}" class="rounded-lg border border-edge bg-panel px-4 pb-1 pt-3">
    <h2 id="h-${i}" class="font-display text-2xl tracking-wide">${c.title}</h2>
    ${c.rows.map(r => `<div class="flex flex-wrap items-center justify-between gap-3 border-t border-edge py-3"><div class="min-w-0 flex-1 basis-56"><p id="l-${r.k}" class="font-medium">${r.t}</p><p class="text-sm text-muted">${r.d}</p></div>${ctl(r)}</div>`).join('')}</section>`).join('');

  function sync() {
    const s = settings.get();
    document.querySelectorAll('[data-seg]').forEach(g => g.querySelectorAll('button').forEach(b => {
      const on = String(s[g.dataset.seg]) === b.dataset.val;
      b.setAttribute('aria-pressed', on); b.className = 'px-3 py-1.5 text-sm ' + (on ? 'bg-gold text-on-gold' : 'text-fg/80 hover:text-fg');
    }));
    document.querySelectorAll('[data-toggle]').forEach(b => {
      const on = !!s[b.dataset.toggle];
      b.setAttribute('aria-checked', on); b.className = 'relative h-6 w-11 shrink-0 rounded-full transition-colors ' + (on ? 'bg-gold' : 'bg-edge');
      b.firstElementChild.className = 'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ' + (on ? 'left-[1.375rem]' : 'left-0.5');
    });
    document.querySelectorAll('[data-range]').forEach(i => { const k = i.dataset.range; if (document.activeElement !== i) i.value = s[k]; $(`[data-out="${k}"]`).textContent = s[k] + ' px'; });
    document.querySelectorAll('[data-select]').forEach(e => e.value = s[e.dataset.select]);
  }
  let ft;
  const flash = msg => { const el = $('#status'); el.textContent = msg; clearTimeout(ft); ft = setTimeout(() => el.textContent = '', 2000); };
  const save = patch => { settings.set(patch); RC.apply(); flash('Saved'); };
  function ask(title, text, fn) {
    $('#dlgTitle').textContent = title; $('#dlgText').textContent = text;
    $('#dlgYes').onclick = () => { fn(); $('#dlg').close(); }; $('#dlgNo').onclick = () => $('#dlg').close();
    $('#dlg').showModal();
  }
  const root = $('#cards');
  root.addEventListener('click', e => {
    const sg = e.target.closest('[data-seg] button'), t = e.target.closest('[data-toggle]'), a = e.target.closest('[data-act]')?.dataset.act;
    if (sg) save({ [sg.parentElement.dataset.seg]: sg.dataset.val });
    else if (t) save({ [t.dataset.toggle]: !settings.get()[t.dataset.toggle] });
    else if (a === 'reset') ask('Reset all preferences?', 'Every setting returns to its default value. Your saved reading positions are not affected.', () => { settings.reset(); RC.apply(); flash('Settings reset to defaults'); });
    else if (a === 'clearPos') ask('Clear reading positions?', 'ComicVault will forget which page you were on in every comic. Your preferences are not affected.', () => { try { localStorage.removeItem(POS); } catch {} flash('Reading positions cleared'); });
  });
  root.addEventListener('input', e => { const k = e.target.dataset.range; if (k) save({ [k]: Number(e.target.value) }); });
  root.addEventListener('change', e => { const k = e.target.dataset.select; if (k) save({ [k]: e.target.value }); });
  document.addEventListener('rc:settings', sync);
  try { localStorage.setItem('rc.test', '1'); localStorage.removeItem('rc.test'); } catch { $('#warn').classList.remove('hidden'); }
  sync();
})();
