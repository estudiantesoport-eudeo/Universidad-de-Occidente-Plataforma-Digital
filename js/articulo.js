// js/articulo.js
(function(){
  function getPathInfo(){
    const full = location.pathname.replace(/\\/g,'/');
    const i = full.lastIndexOf('/html/');
    const after = i>=0 ? full.substring(i + '/html/'.length) : '';
    const folder = after.includes('/') ? after.substring(0, after.lastIndexOf('/')) : '';
    const depth = folder ? folder.split('/').length : 0;
    const prefixHtml = depth ? '../'.repeat(depth) : '';
    const prefixRoot = '../'.repeat(depth + 1);
    const relFromHtml = after;
    return { depth, prefixHtml, prefixRoot, relFromHtml };
  }
  const PI = getPathInfo();

  function isAbs(u){ return /^(https?:)?\/\//i.test(u); }
  function toHtmlHref(u){
    if (!u) return '#';
    if (isAbs(u)) return u;
    if (/^\.\.\//.test(u)) return u;
    return PI.prefixHtml + u.replace(/^\/+/, '');
  }
  function toRootHref(u){
    if (!u) return '#';
    if (isAbs(u)) return u;
    if (u.startsWith('../../')) return u;
    if (u.startsWith('../')) return PI.prefixRoot + u.slice(3);
    return PI.prefixRoot + u.replace(/^\/+/, '');
  }

  const $  = (sel)=>document.querySelector(sel);
  const $$ = (sel)=>Array.from(document.querySelectorAll(sel));
  const fnum = (n)=>Intl.NumberFormat('es-GT',{maximumFractionDigits:0}).format(n||0);
  const sanitize = (s)=> (s||'').toString().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();

  function byId(id){
    return (window.Repo && Repo.state && Array.isArray(Repo.state.trabajos))
      ? Repo.state.trabajos.find(t => (t.id||'')===id)
      : null;
  }
  function byCurrentPath(){
    if (!window.Repo || !Repo.state) return null;
    const pool = Repo.state.trabajos || [];
    return pool.find(t => (t.detalleUrl||'').replace(/^\.\//,'') === PI.relFromHtml
                      || PI.relFromHtml.endsWith( (t.detalleUrl||'') ));
  }
  function getArticle(){
    if (window.ART_ID){
      const a = byId(String(window.ART_ID));
      if (a) return a;
    }
    const q = new URLSearchParams(location.search);
    const id = q.get('id');
    if (id){
      const a = byId(id);
      if (a) return a;
    }
    return byCurrentPath();
  }

  function normalizeName(name){
    if(!name) return '';
    const parts = name.trim().split(/\s+/);
    if(parts.length===1) return parts[0];
    if (/\b[A-ZÁÉÍÓÚÑ]\.\b/.test(parts[0])) return name;
    const last = parts.pop();
    const initials = parts.map(w=> (w[0]||'').toUpperCase() + '.').join(' ');
    return `${last}, ${initials}`.replace(/\s+/g,' ').trim();
  }
  function formatAuthors(art){
    if(Array.isArray(art.autores) && art.autores.length){
      return art.autores.map(normalizeName).join(', ');
    }
    if(art.autor){
      const many = String(art.autor).split(/\s*,\s*|\s*;\s*/).filter(Boolean);
      return many.map(normalizeName).join(', ');
    }
    return '—';
  }
  function buildAPACitation(art){
    const autores = formatAuthors(art);
    const anio = art.anio || art.fecha || 's.f.';
    const titulo = art.titulo || 'Sin título';
    const tipo = art.tipo || 'Artículo académico';
    const carrera = art.carrera ? `, ${art.carrera}` : '';
    const facultad = art.facultad ? `, ${art.facultad}` : '';
    const inst = 'Universidad de Occidente — Sede Mazatenango';
    const url = (location.origin ? location.origin : '') + location.pathname;
    return `${autores} (${anio}). ${titulo}. [${tipo}${carrera}${facultad}]. ${inst}. ${url}`;
  }

  function setChips(containerSel, items){
    const cont = $(containerSel);
    if (!cont) return;
    cont.innerHTML = (items||[]).map(e=>`<span class="chip">${e}</span>`).join('') || '';
  }
  function facKeyToLanding(fk){
    const map = {
      ingenieria:'ingenieria.html',
      economicas:'economicas.html',
      humanidades:'humanidades.html',
      derecho:'derecho.html',
      arquitectura:'arquitectura.html',
      salud:'salud.html'
    };
    const file = map[(fk||'').toLowerCase()] || 'facultades.html';
    return PI.prefixHtml + file;
  }
  function cardHTML(t) {
  const det = t.detalleUrl ? toHtmlHref(t.detalleUrl) : '#';
  return `
    <article class="card card--hover">
      <div class="card__body">
        <h3 class="card__title">${t.titulo || 'Trabajo académico'}</h3>
        <div class="card__meta">
          <span class="badge">${t.carrera || ''}</span>
          <span class="badge">${t.anio || ''}</span>
        </div>
        <p class="util-muted">Autor: ${t.autor || (Array.isArray(t.autores) ? (t.autores || []).join(', ') : '')}</p>
      </div>
      <div class="card__footer">
        <a class="btn btn--ghost" href="${det}">Ver detalle</a>
      </div>
    </article>`;
}

  function renderRelacionados(art){
    const wrap = $('#cards-relacionados');
    if (!wrap || !window.Repo || !Repo.state) return;
    const fac = (art.facultadKey||'').toLowerCase();
    const relacionados = (Repo.state.trabajos||[])
      .filter(t => (t.facultadKey||'').toLowerCase()===fac && (t.id!==art.id))
      .sort((a,b)=> String(b.anio).localeCompare(String(a.anio)))
      .slice(0,6);
    wrap.innerHTML = relacionados.map(cardHTML).join('') || '<p class="util-muted">Sin artículos relacionados.</p>';
  }

  function render(){
    const art = getArticle();
    if (!art){
      const t = $('#art-titulo');     if (t) t.textContent = 'Artículo no encontrado';
      const s = $('#art-subtitulo');  if (s) s.textContent = 'Verifica el identificador o la ruta del archivo.';
      return;
    }
    const title = `${art.titulo} — Plataforma Académica UDEO`;
    const docTitle = document.getElementById('doc-title');
    if (docTitle) docTitle.textContent = title;
    document.title = title;

    const bcFacs = $('#bc-facultad'); if (bcFacs) bcFacs.href = PI.prefixHtml + 'facultades.html';
    const bcCar = $('#bc-carrera');   if (bcCar) bcCar.textContent = art.carrera || 'Carrera';
    const btnFac = $('#btn-ver-facultad'); if (btnFac) btnFac.href = facKeyToLanding(art.facultadKey);

    const btnVolver = $('#btn-volver');
    if (btnVolver) {
      btnVolver.addEventListener('click', (e)=>{
        e.preventDefault();
        if (history.length>1) history.back();
        else location.href = PI.prefixHtml + 'inicio.html';
      });
      btnVolver.setAttribute('href', PI.prefixHtml + 'inicio.html');
    }

    $('#art-titulo')   && ($('#art-titulo').textContent = art.titulo || 'Título del artículo');
    $('#art-subtitulo')&& ($('#art-subtitulo').textContent = art.subtitulo || art.linea || '');
    $('#art-facultad') && ($('#art-facultad').textContent = art.facultad || '');
    $('#art-carrera')  && ($('#art-carrera').textContent = art.carrera || '');
    $('#art-anio')     && ($('#art-anio').textContent = art.anio || '');
    $('#art-autores')  && ($('#art-autores').textContent = Array.isArray(art.autores)?art.autores.join(', '):(art.autor||'—'));
    $('#art-tipo')     && ($('#art-tipo').textContent = art.tipo || 'Artículo académico');
    setChips('#art-etiquetas', art.etiquetas || []);

    const cita = art.citaAPA || art.cita || buildAPACitation(art);
    $('#art-cita-apa') && ($('#art-cita-apa').textContent = cita);

    $('#art-fecha')    && ($('#art-fecha').textContent = art.fecha || art.anio || '—');
    $('#art-licencia') && ($('#art-licencia').textContent = art.licencia || 'Todos los derechos reservados');
    $('#art-id')       && ($('#art-id').textContent = art.id || '—');

    const btnPdf = $('#btn-descargar');
    if (btnPdf) {
      if (art.pdfUrl) { btnPdf.setAttribute('href', toRootHref(art.pdfUrl)); btnPdf.removeAttribute('disabled'); }
      else { btnPdf.setAttribute('href', '#'); btnPdf.setAttribute('disabled', 'disabled'); }
    }

    const verTodos = $('#btn-ver-todos');
    if (verTodos) verTodos.href = facKeyToLanding(art.facultadKey);

    renderRelacionados(art);
  }

  function debounce(fn, ms){
    let t; return (...args)=>{ clearTimeout(t); t=setTimeout(()=>fn.apply(null,args), ms); };
  }

  function indexTrabajos(){
    const trabajos = (window.Repo && Repo.state && Array.isArray(Repo.state.trabajos)) ? Repo.state.trabajos.slice() : [];
    return trabajos.map(t=>{
      const titulo = sanitize(t.titulo);
      const autor = sanitize(Array.isArray(t.autores)? t.autores.join(' ') : (t.autor||''));
      const carrera = sanitize(t.carrera);
      const facultad = sanitize(t.facultad||t.facultadKey);
      const etiquetas = sanitize((t.etiquetas||[]).join(' '));
      const anio = sanitize(t.anio);
      const blob = [titulo,autor,carrera,facultad,etiquetas,anio].filter(Boolean).join(' ');
      return { raw:t, titulo, autor, carrera, facultad, etiquetas, anio, blob };
    });
  }

  function scoreItem(it, tokens){
    let s = 0;
    for(const tok of tokens){
      if(!tok) continue;
      if (it.titulo.includes(tok)) s += 5;
      if (it.autor.includes(tok)) s += 3;
      if (it.carrera.includes(tok) || it.facultad.includes(tok)) s += 2;
      if (it.etiquetas.includes(tok)) s += 1.5;
      if (it.anio.includes(tok)) s += 1;
      if (it.blob.includes(tok)) s += 0.5;
      if (it.titulo.startsWith(tok)) s += 2;
    }
    return s;
  }

  function search(data, q, limit=10){
    const qn = sanitize(q);
    if(!qn) return [];
    const tokens = qn.split(/\s+/).filter(Boolean);
    const hits = [];
    for(const it of data){
      const sc = scoreItem(it, tokens);
      if (sc>0) hits.push({it, sc});
    }
    hits.sort((a,b)=> b.sc - a.sc || String(b.it.raw.anio||'').localeCompare(String(a.it.raw.anio||'')));
    return hits.slice(0, limit).map(h=>h.it.raw);
  }

  function ensureSuggestContainer(input){
    let box = document.getElementById('search-suggest');
    if (!box){
      box = document.createElement('div');
      box.id = 'search-suggest';
      box.style.position = 'absolute';
      box.style.left = '0';
      box.style.right = '0';
      box.style.top = '100%';
      box.style.marginTop = '6px';
      box.style.background = '#fff';
      box.style.border = '1px solid var(--c-border)';
      box.style.borderRadius = '12px';
      box.style.boxShadow = 'var(--shadow-1)';
      box.style.zIndex = '1001';
      const wrap = document.createElement('div');
      wrap.style.position = 'relative';
      input.parentElement.style.position = input.parentElement.style.position || 'relative';
      input.parentElement.appendChild(box);
    }
    return box;
  }

  function renderSuggest(list, anchorInput){
    const box = ensureSuggestContainer(anchorInput);
    if(!list.length){
      box.innerHTML = '';
      box.style.display = 'none';
      return;
    }
    const html = list.map((t,i)=>{
      const det = t.detalleUrl ? toHtmlHref(t.detalleUrl) : '#';
      const meta = [t.carrera, t.facultad || t.facultadKey, t.anio].filter(Boolean).join(' • ');
      return `
        <a class="sg-item" href="${det}" data-idx="${i}" style="display:flex;flex-direction:column;gap:2px;padding:10px 12px;border-bottom:1px solid var(--c-border);text-decoration:none">
          <span style="font-weight:800;color:var(--c-text)">${t.titulo||'Artículo'}</span>
          <span style="font-size:.86rem;color:var(--c-text-soft)">${meta}</span>
        </a>`;
    }).join('') + `<button type="button" class="sg-close" style="width:100%;text-align:center;padding:8px 10px;background:#fff;border:0;border-top:1px solid var(--c-border);cursor:pointer">Cerrar</button>`;
    box.innerHTML = html;
    box.style.display = 'block';
    $$('#search-suggest .sg-item').forEach(a=>{
      a.addEventListener('mouseenter',()=>highlight(a));
      a.addEventListener('focus',()=>highlight(a));
    });
    const closeBtn = $('#search-suggest .sg-close');
    if (closeBtn) closeBtn.onclick = ()=>{ box.style.display='none'; };
    highlight($$('#search-suggest .sg-item')[0] || null);
  }

  function highlight(el){
    $$('#search-suggest .sg-item').forEach(a=>{
      a.style.background = '#fff';
    });
    if (el){
      el.style.background = 'color-mix(in srgb, var(--c-accent) 8%, #fff 92%)';
      el.focus({preventScroll:true});
    }
  }

  function moveHighlight(dir){
    const items = $$('#search-suggest .sg-item');
    if(!items.length) return;
    const idx = items.findIndex(a=> a===document.activeElement);
    let next = 0;
    if (idx===-1) next = dir>0 ? 0 : items.length-1;
    else next = (idx + dir + items.length) % items.length;
    highlight(items[next]);
  }

  function attachSearch(inputSel='#global-search', formSel='#global-search-form'){
    const input = $(inputSel);
    if (!input) return;
    const form = $(formSel) || input.closest('form');
    const data = indexTrabajos();
    const doSuggest = debounce(()=>{
      const q = input.value;
      const res = search(data, q, 8);
      renderSuggest(res, input);
    }, 120);

    input.setAttribute('autocomplete','off');
    input.addEventListener('input', doSuggest);
    input.addEventListener('focus', doSuggest);

    input.addEventListener('keydown', (e)=>{
      if (e.key==='ArrowDown'){ e.preventDefault(); moveHighlight(1); }
      if (e.key==='ArrowUp'){ e.preventDefault(); moveHighlight(-1); }
      if (e.key==='Escape'){ const box=$('#search-suggest'); if (box) box.style.display='none'; }
      if (e.key==='Enter'){
        const current = document.activeElement && document.activeElement.classList && document.activeElement.classList.contains('sg-item') ? document.activeElement : $$('#search-suggest .sg-item')[0];
        if (current){ e.preventDefault(); location.href = current.getAttribute('href'); }
      }
    });

    document.addEventListener('click', (e)=>{
      const box = $('#search-suggest');
      if (!box) return;
      if (e.target===box || box.contains(e.target) || e.target===input) return;
      box.style.display='none';
    });

    if (form){
      form.addEventListener('submit', (e)=>{
        const q = sanitize(input.value);
        if(!q) return;
        const res = search(data, q, 1);
        if (res.length){
          e.preventDefault();
          const det = res[0].detalleUrl ? toHtmlHref(res[0].detalleUrl) : '#';
          location.href = det;
        }
      });
    }
  }

  document.addEventListener('DOMContentLoaded', function(){
    render();
    attachSearch('#global-search', '#global-search-form');
  });
})();
