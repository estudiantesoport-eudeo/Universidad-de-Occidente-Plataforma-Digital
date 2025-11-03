// js/avisos.js
(function () {
  // -------------------------
  // Estado + helpers de DOM
  // -------------------------
  const avisosState = {
    avisos: [],
    ui: { query: '' },
    hydratedOnce: false
  };

  const $ = {
    wrap:       document.getElementById('avisos-wrap'),     // contenedor para tarjetas
    tableBody:  document.getElementById('tabla-avisos'),    // <tbody> para modo tabla
    q:          document.getElementById('search-keywords'),
    btn:        document.getElementById('btn-search'),
    form:       document.getElementById('form-busqueda')
  };

  // Helpers
  function sanitize(s) {
    return (s || '').toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  }

  // Fecha en formato DD/MM/YYYY o D/M/YY → timestamp
  function parseDMYtoTS(s) {
    if (!s) return 0;
    const m = String(s).match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
    if (!m) return 0;
    const d  = parseInt(m[1], 10);
    const mo = parseInt(m[2], 10) - 1;
    const y  = parseInt(m[3], 10);
    const year = y < 100 ? 2000 + y : y;
    const t = new Date(year, mo, d).getTime();
    return isNaN(t) ? 0 : t;
  }

  // -------------------------
  // Render (cards)
  // -------------------------
  function chipsHTML(etiquetas) {
    const list = Array.isArray(etiquetas) ? etiquetas : [];
    if (!list.length) return '';
    return `<div class="chips" style="margin-top:8px">${list.map(e => `<span class="chip">${e}</span>`).join('')}</div>`;
  }

  function avisoCard(a) {
    const fecha     = a.fecha      || '—';
    const titulo    = a.titulo     || 'Aviso';
    const subtitulo = a.subtitulo  || a.resumen || '';
    const href      = a.detalleUrl || a.url || '#';

    return `
      <article class="card" style="margin-bottom:12px">
        <div class="card__body">
          <div class="util-row" style="justify-content:space-between;align-items:center">
            <div class="tag">${fecha}</div>
          </div>
          <h3 class="card__title" style="margin-top:8px">${titulo}</h3>
          ${subtitulo ? `<p class="util-muted" style="margin:6px 0 10px">${subtitulo}</p>` : ''}
          ${chipsHTML(a.etiquetas)}
        </div>
        <div class="card__footer">
          <a class="btn btn--soft" href="${href}">Ver detalle</a>
        </div>
      </article>
    `;
  }

  // -------------------------
  // Render (tabla)
  // -------------------------
  function avisoRow(a) {
    const fecha     = a.fecha      || '';
    const titulo    = a.titulo     || 'Aviso';
    const resumen   = a.subtitulo  || a.resumen || '';
    const href      = a.detalleUrl || a.url || '#';
    return `
      <tr>
        <td>${fecha}</td>
        <td>${titulo}</td>
        <td>${resumen}</td>
        <td><a class="btn btn--ghost" href="${href}">Leer</a></td>
      </tr>
    `;
  }

  // -------------------------
  // Filtro + render principal
  // -------------------------
  function matchAviso(a, query) {
    if (!query) return true;
    const q = sanitize(query);
    const bag = sanitize([
      a.titulo,
      a.subtitulo || a.resumen,
      a.fecha,
      (a.etiquetas || []).join(' ')
    ].join(' '));
    return q.split(/\s+/).every(tok => bag.includes(tok));
  }

  function sortedFiltered() {
    const q = avisosState.ui.query;
    return avisosState.avisos
      .filter(a => matchAviso(a, q))
      .sort((a, b) => parseDMYtoTS(b.fecha) - parseDMYtoTS(a.fecha)); // más recientes primero
  }

  function render() {
    const data = sortedFiltered();

    // Modo tarjetas
    if ($.wrap) {
      $.wrap.innerHTML = data.length
        ? data.map(avisoCard).join('')
        : '<div class="prose"><p class="util-muted">No hay avisos publicados.</p></div>';
    }

    // Modo tabla
    if ($.tableBody) {
      $.tableBody.innerHTML = data.length
        ? data.map(avisoRow).join('')
        : '';
    }
  }

  // -------------------------
  // Búsqueda
  // -------------------------
  function handleSearch() {
    avisosState.ui.query = ($.q && $.q.value || '').trim();
    render();
  }

  function bindSearch() {
    if ($.btn)  $.btn.addEventListener('click', handleSearch);
    if ($.q)    $.q.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); handleSearch(); }
    });
    if ($.form) $.form.addEventListener('submit', e => { e.preventDefault(); handleSearch(); });
  }

  // -------------------------
  // Carga desde Repo
  // -------------------------
  function hydrateFromRepo() {
    if (!window.Repo || !Repo.state) return false;

    let added = 0;

    // Nueva fuente oficial
    if (Array.isArray(Repo.state.avisos) && Repo.state.avisos.length) {
      Repo.state.avisos.forEach(Av.addAviso);
      added += Repo.state.avisos.length;
    }

    // Compat: por si hay datos viejos en "noticias"
    if (Array.isArray(Repo.state.noticias) && Repo.state.noticias.length) {
      Repo.state.noticias.forEach(n => {
        Av.addAviso({
          fecha:      n.fecha,
          titulo:     n.titulo,
          subtitulo:  n.resumen,
          detalleUrl: n.url
        });
      });
      added += Repo.state.noticias.length;
    }

    avisosState.hydratedOnce = added > 0;
    return avisosState.hydratedOnce;
  }

  // -------------------------
  // API pública
  // -------------------------
  const Av = {
    addAviso(a) {
      avisosState.avisos.push({
        id:         a.id || crypto.randomUUID(),
        fecha:      a.fecha || '',
        titulo:     a.titulo || 'Aviso',
        subtitulo:  a.subtitulo || a.resumen || '',
        etiquetas:  Array.isArray(a.etiquetas) ? a.etiquetas : [],
        detalleUrl: a.detalleUrl || a.url || '#'
      });
    },
    buscar(q) {
      if ($.q) $.q.value = q || '';
      avisosState.ui.query = (q || '').trim();
      render();
    },
    state: avisosState
  };

  window.Avisos = Av;

  // -------------------------
  // Inicio
  // -------------------------
  document.addEventListener('DOMContentLoaded', () => {
    bindSearch();

    // 1) Hidratar inmediatamente
    const okNow = hydrateFromRepo();

    // 2) Si no cargó porque el orden de scripts difiere, reintenta una vez al microtick y otra a 300ms
    if (!okNow) {
      setTimeout(() => {
        const okSoon = hydrateFromRepo();
        if (!okSoon) {
          setTimeout(() => {
            hydrateFromRepo();
            render();
          }, 300);
        } else {
          render();
        }
      }, 0);
    } else {
      render();
    }
  });
})();
