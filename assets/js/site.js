// Toyota Akademie – kleine, abhängigkeitsfreie Interaktionen.
(() => {
  const $ = (sel, root = document) => root.querySelector(sel);
  document.documentElement.classList.add('motion-ready');

  // Bilder vom Original-Server können fehlen: Platzhalter statt Alt-Text-Salat
  const markMissing = (img) => img.parentElement?.classList.add('is-missing');
  document.addEventListener('error', (e) => { if (e.target instanceof HTMLImageElement) markMissing(e.target); }, true);
  document.querySelectorAll('img').forEach((img) => { if (img.complete && img.naturalWidth === 0 && img.currentSrc) markMissing(img); });
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const desktop = window.matchMedia('(min-width: 1080px)');

  // ---------------------------------------------------------- Navigation
  const toggle = $('[data-nav-toggle]');
  const nav = $('[data-nav]');
  const toggleLabel = $('[data-nav-toggle-label]');

  const setMenu = (open) => {
    if (!toggle || !nav) return;
    if (open) {
      const island = toggle.closest('.island');
      if (island) nav.style.setProperty('--menu-top', `${Math.round(island.getBoundingClientRect().bottom + 20)}px`);
    }
    toggle.setAttribute('aria-expanded', String(open));
    if (toggleLabel) toggleLabel.textContent = open ? 'Menü schließen' : 'Menü öffnen';
    nav.classList.toggle('is-open', open);
    document.documentElement.classList.toggle('menu-open', open);
    if (open) nav.querySelector('a, button')?.focus({ preventScroll: true });
  };
  toggle?.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
  desktop.addEventListener('change', () => setMenu(false));

  const closeSubs = (except) => {
    $$('[data-sub-toggle][aria-expanded="true"]').forEach((btn) => {
      if (btn === except) return;
      btn.setAttribute('aria-expanded', 'false');
      document.getElementById(btn.getAttribute('aria-controls'))?.classList.remove('is-open');
    });
  };
  $$('[data-sub-toggle]').forEach((btn) => {
    const panel = document.getElementById(btn.getAttribute('aria-controls'));
    btn.addEventListener('click', () => {
      const open = btn.getAttribute('aria-expanded') !== 'true';
      closeSubs(btn);
      btn.setAttribute('aria-expanded', String(open));
      panel?.classList.toggle('is-open', open);
    });
  });
  document.addEventListener('click', (e) => {
    if (desktop.matches && !e.target.closest('.has-mega')) closeSubs();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const openBtn = $('[data-sub-toggle][aria-expanded="true"]');
    if (openBtn) { closeSubs(); openBtn.focus(); return; }
    if (toggle?.getAttribute('aria-expanded') === 'true') { setMenu(false); toggle.focus(); }
  });
  // Fokus im offenen Mobilmenü halten
  nav?.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab' || !nav.classList.contains('is-open')) return;
    const focusables = [...$$('a[href], button:not([disabled])', nav).filter((el) => el.offsetParent !== null), toggle];
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  // ---------------------------------------------------------- Einlauf beim Hereinscrollen (einmalig, gestaffelt)
  const revealables = $$('[data-reveal]');
  if (document.documentElement.classList.contains('js-motion') && revealables.length) {
    const io = new IntersectionObserver((entries) => {
      const entering = entries.filter((e) => e.isIntersecting);
      entering.forEach((e, i) => {
        e.target.style.setProperty('--reveal-delay', `${Math.min(i, 6) * 60}ms`);
        e.target.classList.add('is-in');
        io.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    revealables.forEach((el) => io.observe(el));
  } else {
    revealables.forEach((el) => el.classList.add('is-in'));
  }

  // ---------------------------------------------------------- Tabs (Workshop-Agenda)
  $$('[data-tabs]').forEach((root) => {
    const tabs = $$('[role="tab"]', root);
    const select = (tab, focus = true) => {
      root.classList.add('is-interacted');
      tabs.forEach((t) => {
        const selected = t === tab;
        t.setAttribute('aria-selected', String(selected));
        t.tabIndex = selected ? 0 : -1;
        document.getElementById(t.getAttribute('aria-controls')).hidden = !selected;
      });
      if (focus) tab.focus();
    };
    tabs.forEach((tab, i) => {
      tab.addEventListener('click', () => select(tab, false));
      tab.addEventListener('keydown', (e) => {
        const dir = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
        if (dir) { e.preventDefault(); select(tabs[(i + dir + tabs.length) % tabs.length]); }
        if (e.key === 'Home') { e.preventDefault(); select(tabs[0]); }
        if (e.key === 'End') { e.preventDefault(); select(tabs[tabs.length - 1]); }
      });
    });
  });

  // ---------------------------------------------------------- Termine: vergangene ausblenden, nächstes Datum zeigen
  const today = new Date();
  const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const MON = ['Jan', 'Feb', 'März', 'Apr', 'Mai', 'Juni', 'Juli', 'Aug', 'Sept', 'Okt', 'Nov', 'Dez'];
  const DAYS = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
  $$('[data-agenda]').forEach((list) => {
    if (list.closest('.past')) return;
    let visible = 0;
    $$('[data-dates]', list).forEach((row) => {
      const next = row.dataset.dates.split(' ').find((d) => d >= todayIso);
      if (!next) { row.hidden = true; return; }
      visible++;
      const time = $('time', row);
      if (time && time.getAttribute('datetime') !== next) {
        const [y, m, d] = next.split('-').map(Number);
        time.setAttribute('datetime', next);
        $('.date-badge__day', time).textContent = d;
        $('.date-badge__mon', time).textContent = `${MON[m - 1]} ${String(y).slice(2)}`;
      }
      const wd = $('[data-weekday]', row);
      if (wd) {
        const [y, m, d] = next.split('-').map(Number);
        const diff = Math.round((Date.UTC(y, m - 1, d) - Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())) / 864e5);
        wd.textContent = diff === 0 ? 'heute' : diff === 1 ? 'morgen' : diff < 14 ? `in ${diff} Tagen` : DAYS[new Date(y, m - 1, d).getDay()];
      }
    });
    if (!visible) $('[data-agenda-empty]')?.removeAttribute('hidden');
  });

  // ---------------------------------------------------------- Archiv: Filter nach Rubrik
  const filter = $('[data-filter]');
  if (filter) {
    const chips = $$('[data-filter-key]', filter);
    const items = $$('[data-filter-items] > li');
    const status = $('[data-filter-status]', filter);
    const list = $('[data-filter-items]');
    const apply = (key, push = true) => {
      if (push) list.classList.add('is-filtering');
      let n = 0;
      items.forEach((li) => {
        const show = !key || li.dataset.rubriken.split(' ').includes(key);
        li.hidden = !show;
        if (show) n++;
      });
      chips.forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.filterKey === key)));
      const label = chips.find((c) => c.dataset.filterKey === key)?.firstChild.textContent.trim();
      status.textContent = key ? `${n} Beiträge in „${label}“` : `Alle ${n} Beiträge`;
      if (push) {
        const url = new URL(location.href);
        if (key) url.searchParams.set('rubrik', key); else url.searchParams.delete('rubrik');
        history.replaceState(null, '', url);
      }
    };
    chips.forEach((c) => c.addEventListener('click', () => apply(c.dataset.filterKey)));
    const initial = new URLSearchParams(location.search).get('rubrik') || '';
    if (chips.some((c) => c.dataset.filterKey === initial)) apply(initial, false);
  }

  // ---------------------------------------------------------- Suche
  const form = $('[data-search]');
  if (form) {
    const input = $('[data-search-input]', form);
    const list = $('[data-search-results]');
    const status = $('[data-search-status]');
    const suggest = $('[data-search-suggest]');
    const base = $('link[rel="stylesheet"]').getAttribute('href').replace(/assets\/css\/site\.css$/, '');
    const norm = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ß/g, 'ss');
    const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const mark = (text, terms) => {
      let out = esc(text);
      terms.forEach((t) => {
        if (t.length < 2) return;
        const re = new RegExp(`(${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        out = out.replace(re, '<mark>$1</mark>');
      });
      return out;
    };

    const run = () => {
      const index = window.SEARCH_INDEX || [];
      const raw = input.value.trim();
      const q = norm(raw);
      suggest.hidden = !!q;
      if (!q) { list.innerHTML = ''; status.textContent = ''; return; }
      const terms = q.split(/\s+/).filter(Boolean);
      const hits = index
        .map((e) => {
          const hay = norm(`${e.t} ${e.d} ${e.c} ${e.i || ''}`);
          if (!terms.every((t) => hay.includes(t))) return null;
          const score = terms.reduce((s, t) => s + (norm(e.t).includes(t) ? 3 : 1), 0);
          return { e, score };
        })
        .filter(Boolean)
        .sort((a, b) => b.score - a.score);
      status.textContent = hits.length
        ? `${hits.length} ${hits.length === 1 ? 'Treffer' : 'Treffer'} für „${raw}“`
        : `Keine Treffer für „${raw}“. Versuchen Sie einen kürzeren oder allgemeineren Begriff, etwa einen Kurs-Code oder ein Modell.`;
      const rawTerms = raw.split(/\s+/).filter(Boolean);
      list.innerHTML = hits.map(({ e }) => `<li><small>${esc(e.c)}${e.i ? ` · ${esc(e.i)}` : ''}</small><a href="${base}${e.u}">${mark(e.t, rawTerms)}</a><p>${mark(e.d, rawTerms)}</p></li>`).join('');
    };

    form.addEventListener('submit', (e) => { e.preventDefault(); run(); });
    input.addEventListener('input', run);
    const q = new URLSearchParams(location.search).get('q');
    if (q) input.value = q;
    if (window.SEARCH_INDEX) run(); else window.addEventListener('load', run);
  }
})();
