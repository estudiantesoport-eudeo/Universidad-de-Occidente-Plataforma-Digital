// =====================
// Estado local (Ingeniería)
// =====================
const ingState = {
  trabajos: [],
  metricas: { carreras: 0 },
  ui: { maxCards: Infinity, query: '' }
};

// =====================
// Cache de elementos
// =====================
const $ = {
  kpiTrabajos: document.getElementById('ing-kpi-trabajos'),
  kpiCarreras: document.getElementById('ing-kpi-carreras'),
  cards:       document.getElementById('cards-ultimos-ingenieria'),
  form:        document.getElementById('form-busqueda'),
  q:           document.getElementById('search-keywords'),
  btn:         document.getElementById('btn-search'),
  listaCarr:   document.getElementById('ing-lista-carreras')
};

// =====================
// Helpers de rutas (mismos criterios que inicio.js)
// =====================

// Construye una URL hacia /html/ desde cualquier página
function linkToHtml(relOrPrefixed){
  if (!relOrPrefixed) return '#';
  if (/^(https?:\/\/|mailto:|tel:|data:)/i.test(relOrPrefixed)) return relOrPrefixed;

  let rel = String(relOrPrefixed).replace(/\\/g, '/').replace(/^\/+/, '');
  const path = location.pathname.replace(/\\/g,'/');
  const idx = path.indexOf('/html/');
  const baseHtml = (idx !== -1)
    ? path.slice(0, idx + 6)   // …/html/
    : path.replace(/[^/]*$/, '') + 'html/'; // estamos en raíz

  if (/^html\//i.test(rel)) rel = rel.slice(5);
  return (baseHtml + rel).replace(/\/{2,}/g, '/');
}

// Prefijo correcto para /img según nivel actual
function prefixForImg(){
  const path = location.pathname.replace(/\\/g,'/');
  return path.indexOf('/html/') !== -1 ? '../../' : '';
}

// Resuelve assets del directorio /img desde cualquier nivel
function resolveAsset(pth){
  const fallback = 'img/placeholder-cover.jpg';
  if (!pth) return prefixForImg() + fallback;

  let p = String(pth).replace(/\\/g,'/');
  if (/^https?:\/\//i.test(p)) return p;           // absoluto
  p = p.replace(/^\.\/+/, '').replace(/^(?:\.\.\/)+/, ''); // limpia ./ y ../
  return prefixForImg() + p;
}

// =====================
// Utilidades
// =====================
function fnum(n){ return Intl.NumberFormat('es-GT',{maximumFractionDigits:0}).format(n||0); }
function sanitize(s){ return (s||'').toString().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase(); }
function match(item,query){
  if(!query) return true;
  const q = sanitize(query);
  const bag = [
    item.titulo, item.autor, item.carrera, item.anio, item.fecha,
    item.resumen, (item.etiquetas||[]).join(' ')
  ].map(sanitize).join(' ');
  return q.split(/\s+/).every(tok=>bag.includes(tok));
}

function toMillisFromISOorLatam(s){
  if(!s) return 0;
  const str = String(s).trim();

  // YYYY-MM-DD
  let m = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) { return new Date(+m[1], +m[2]-1, +m[3]).getTime() || 0; }

  // dd/mm/yyyy o dd-mm-yyyy
  m = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (m) {
    const d=+m[1], mo=+m[2]-1, y=+m[3]; const yr = y<100 ? 2000+y : y;
    return new Date(yr, mo, d).getTime() || 0;
  }

  const t = Date.parse(str);
  return isNaN(t) ? 0 : t;
}

function formatFechaBadge(s){
  if(!s) return '';
  try{
    const ms = toMillisFromISOorLatam(s);
    if(!ms) return s;
    const dtf = new Intl.DateTimeFormat('es-GT',{year:'numeric',month:'short',day:'2-digit'});
    return dtf.format(new Date(ms));
  }catch{ return s; }
}

// =====================
// Render KPIs
// =====================
function renderKPIs(){
  if ($.kpiTrabajos) $.kpiTrabajos.textContent = fnum(ingState.trabajos.length);
  if ($.kpiCarreras) $.kpiCarreras.textContent = fnum(ingState.metricas.carreras || 0);
}

// =====================
// Cards de trabajos (todos)
// =====================
function card(t){
  const img    = resolveAsset(t.portada || 'img/placeholder-cover.jpg');
  const titulo = t.titulo || 'Trabajo académico';
  const autor  = t.autor || (Array.isArray(t.autores) ? t.autores.join(', ') : '');
  const carrera= t.carrera || '';
  const fecha  = t.fecha || t.anio || '';
  const fechaB = formatFechaBadge(fecha);
  const det    = linkToHtml(t.detalleUrl || '#');

  return `
  <article class="card card--hover">
    <div class="card__media"><img src="${img}" alt="Portada"></div>
    <div class="card__body">
      <h3 class="card__title">${titulo}</h3>
      <div class="card__meta">
        <span class="badge">${carrera}</span>
        <span class="badge">${fechaB}</span>
      </div>
      <p class="util-muted">Autor: ${autor}</p>
    </div>
    <div class="card__footer">
      <a class="btn btn--ghost" href="${det}">Ver detalle</a>
    </div>
  </article>`;
}

function renderCards(){
  const q = ingState.ui.query;
  const filtrados = ingState.trabajos
    .filter(t=>match(t,q))
    // Orden del más reciente al más antiguo (usa fecha o anio)
    .sort((a,b)=>{
      const ta = toMillisFromISOorLatam(a.fecha || a.anio);
      const tb = toMillisFromISOorLatam(b.fecha || b.anio);
      return tb - ta || String(b.titulo).localeCompare(String(a.titulo));
    });

  const slice = filtrados.slice(0, ingState.ui.maxCards);
  if ($.cards) $.cards.innerHTML = slice.map(card).join('') || '';
}

// =====================
// Carreras (lista)
// =====================
function getCarrerasIngenieria(){
  if (typeof FACULTADES !== 'undefined' && FACULTADES.ingenieria) {
    return Array.from(FACULTADES.ingenieria.carreras || []);
  }
  return [];
}

function renderCarreras(){
  if (!$.listaCarr) return;
  const carreras = getCarrerasIngenieria();

  // KPI carreras: si no vino desde Repo, usa la longitud de la lista
  if (!ingState.metricas.carreras) {
    Ing.setCarreras(carreras.length);
  }

  $.listaCarr.innerHTML = carreras.map(nombre => `
    <li>${nombre}</li>
  `).join('') || '<li class="util-muted">No hay carreras registradas.</li>';
}

// =====================
// Búsqueda local
// =====================
function handleSearch(){
  ingState.ui.query = ($.q && $.q.value || '').trim();
  renderCards();
}
function bindSearch(){
  if ($.btn) $.btn.addEventListener('click', handleSearch);
  if ($.q) $.q.addEventListener('keydown', e=>{
    if(e.key==='Enter'){ e.preventDefault(); handleSearch(); }
  });
}

// =====================
// Hidratación desde Repo
// =====================
function hydrateFromRepo(){
  if(!window.Repo || !Repo.state) return;

  // Trabajos de Ingeniería
  const trabajosIng = (Repo.state.trabajos||[])
    .filter(t => (t.facultadKey||'').toLowerCase()==='ingenieria');

  trabajosIng.forEach(t => Ing.addTrabajo(t));

  // Carreras desde Repo (conteo), si existe
  if (Repo.state.facultades && Repo.state.facultades.ingenieria) {
    const n = Number(Repo.state.facultades.ingenieria.carreras || 0);
    if (n) Ing.setCarreras(n);
  }
}

function hydrate(){
  renderKPIs();
  renderCards();
  renderCarreras();
}

// =====================
// API pública
// =====================
const Ing = {
  addTrabajo(t){
    // Normaliza fecha desde anio si no viene
    let fecha = t.fecha || '';
    if (!fecha && t.anio) {
      const y = String(t.anio).trim();
      fecha = /^\d{4}$/.test(y) ? `${y}-01-01` : y;
    }

    ingState.trabajos.push({
      id:         t.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : String(Date.now())),
      titulo:     t.titulo||'',
      autor:      t.autor||'',
      autores:    Array.isArray(t.autores) ? t.autores : undefined,
      carrera:    t.carrera||'',
      anio:       t.anio||'',
      fecha,                      // preferida para ordenar/mostrar
      etiquetas:  t.etiquetas||[],
      resumen:    t.resumen||'',
      portada:    t.portada||'',
      detalleUrl: t.detalleUrl||'#',
      pdfUrl:     t.pdfUrl||'#'
    });
    renderKPIs();
    renderCards();
  },
  setCarreras(n){
    ingState.metricas.carreras = Number(n||0);
    renderKPIs();
  },
  setMaxCards(n){
    ingState.ui.maxCards = Math.max(1, Number(n)||5);
    renderCards();
  },
  buscar(q){
    if($.q){ $.q.value = q || ''; }
    ingState.ui.query = (q||'').trim();
    renderCards();
  },
  state: ingState
};

window.Ing = Ing;

// =====================
// Inicio
// =====================
document.addEventListener('DOMContentLoaded', ()=>{
  bindSearch();
  hydrateFromRepo();
  hydrate();
});
