const arqState = {
  trabajos: [],
  metricas: { carreras: 0 },
  ui: { maxCards: Infinity, query: '' } // ← mostrar TODOS
};

const $ = {
  kpiTrabajos: document.getElementById('arq-kpi-trabajos'),
  kpiCarreras: document.getElementById('arq-kpi-carreras'),
  cards:       document.getElementById('cards-ultimos-arquitectura'),
  form:        document.getElementById('form-busqueda'),
  q:           document.getElementById('search-keywords'),
  btn:         document.getElementById('btn-search'),
  listaCarr:   document.getElementById('arq-lista-carreras')
};

// =====================
// Utilidades
// =====================
function fnum(n){ return Intl.NumberFormat('es-GT',{maximumFractionDigits:0}).format(n||0); }
function sanitize(s){ return (s||'').toString().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase(); }
function match(item,query){
  if(!query) return true;
  const q = sanitize(query);
  const bag = [
    item.titulo, item.autor, item.carrera, item.anio,
    item.resumen, (item.etiquetas||[]).join(' ')
  ].map(sanitize).join(' ');
  return q.split(/\s+/).every(tok=>bag.includes(tok));
}

// =====================
// Render KPIs
// =====================
function renderKPIs(){
  if ($.kpiTrabajos) $.kpiTrabajos.textContent = fnum(arqState.trabajos.length);
  if ($.kpiCarreras) $.kpiCarreras.textContent = fnum(arqState.metricas.carreras || 0);
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
  const q = arqState.ui.query;
  const filtrados = arqState.trabajos
    .filter(t=>match(t,q))
    // Más reciente → más antiguo
    .sort((a,b)=> String(b.anio).localeCompare(String(a.anio)));

  // Mostrar TODOS (sin slice)
  if ($.cards) $.cards.innerHTML = filtrados.map(card).join('') || '';
}

// =====================
// Carreras (lista)
// =====================
function getCarrerasArquitectura(){
  // Preferimos FACULTADES (contenido-inicio.js) para la lista completa
  if (typeof FACULTADES !== 'undefined' && FACULTADES.arquitectura) {
    return Array.from(FACULTADES.arquitectura.carreras || []);
  }
  return [];
}

function renderCarreras(){
  if (!$.listaCarr) return;
  const carreras = getCarrerasArquitectura();

  // Si el KPI aún no tiene valor (desde Repo), usar cantidad de la lista
  if (!arqState.metricas.carreras) {
    Arq.setCarreras(carreras.length);
  }

  $.listaCarr.innerHTML = carreras.map(nombre => `
    <li>${nombre}</li>
  `).join('') || '<li class="util-muted">No hay carreras registradas.</li>';
}

// =====================
// Búsqueda local
// =====================
function handleSearch(){
  arqState.ui.query = ($.q && $.q.value || '').trim();
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

  // Trabajos de Arquitectura
  const trabajosArq = (Repo.state.trabajos||[])
    .filter(t => (t.facultadKey||'').toLowerCase()==='arquitectura');
  trabajosArq.forEach(t => Arq.addTrabajo(t));

  // Carreras desde Repo (conteo), si existe
  if (Repo.state.facultades && Repo.state.facultades.arquitectura) {
    const n = Number(Repo.state.facultades.arquitectura.carreras || 0);
    if (n) Arq.setCarreras(n);
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
const Arq = {
  addTrabajo(t){
    arqState.trabajos.push({
      id:         t.id||crypto.randomUUID(),
      titulo:     t.titulo||'',
      autor:      t.autor||'',
      carrera:    t.carrera||'',
      anio:       t.anio||'',
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
    arqState.metricas.carreras = Number(n||0);
    renderKPIs();
  },
  setMaxCards(n){
    arqState.ui.maxCards = Math.max(1, Number(n)||Infinity);
    renderCards();
  },
  buscar(q){
    if($.q){ $.q.value = q || ''; }
    arqState.ui.query = (q||'').trim();
    renderCards();
  },
  state: arqState
};

window.Arq = Arq;

// =====================
// Inicio
// =====================
document.addEventListener('DOMContentLoaded', ()=>{
  bindSearch();
  hydrateFromRepo();
  hydrate();
});
