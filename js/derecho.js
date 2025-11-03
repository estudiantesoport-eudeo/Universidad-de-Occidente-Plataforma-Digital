const derState = {
  trabajos: [],
  metricas: { carreras: 0 },
  ui: { maxCards: Infinity, query: '' } // mostrar TODOS
};

const $ = {
  kpiTrabajos: document.getElementById('der-kpi-trabajos'),
  kpiCarreras: document.getElementById('der-kpi-carreras'),
  cards:       document.getElementById('cards-ultimos-derecho'),
  form:        document.getElementById('form-busqueda'),
  q:           document.getElementById('search-keywords'),
  btn:         document.getElementById('btn-search'),
  listaCarr:   document.getElementById('der-lista-carreras')
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
  return q.split(/\s+/).every(tok => bag.includes(tok));
}

// =====================
// KPIs
// =====================
function renderKPIs(){
  if ($.kpiTrabajos) $.kpiTrabajos.textContent = fnum(derState.trabajos.length);
  if ($.kpiCarreras) $.kpiCarreras.textContent = fnum(derState.metricas.carreras || 0);
}

// =====================
// Cards (todos los trabajos)
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
  const q = derState.ui.query;
  const filtrados = derState.trabajos
    .filter(t => match(t, q))
    .sort((a,b) => String(b.anio).localeCompare(String(a.anio))); // más reciente → antiguo

  if ($.cards) $.cards.innerHTML = filtrados.map(card).join('') || '';
}

// =====================
// Carreras (lista)
// =====================
function getCarrerasDerecho(){
  if (typeof FACULTADES !== 'undefined' && FACULTADES.derecho) {
    return Array.from(FACULTADES.derecho.carreras || []);
  }
  return [];
}

function renderCarreras(){
  if (!$.listaCarr) return;
  const carreras = getCarrerasDerecho();

  if (!derState.metricas.carreras) {
    Der.setCarreras(carreras.length);
  }

  $.listaCarr.innerHTML = carreras.map(nombre => `
    <li>${nombre}</li>
  `).join('') || '<li class="util-muted">No hay carreras registradas.</li>';
}

// =====================
// Búsqueda local
// =====================
function handleSearch(){
  derState.ui.query = ($.q && $.q.value || '').trim();
  renderCards();
}
function bindSearch(){
  if ($.btn) $.btn.addEventListener('click', handleSearch);
  if ($.q) $.q.addEventListener('keydown', e=>{
    if(e.key === 'Enter'){ e.preventDefault(); handleSearch(); }
  });
}

// =====================
// Hidratación desde Repo
// =====================
function hydrateFromRepo(){
  if (!window.Repo || !Repo.state) return;

  // Trabajos de Derecho
  const trabajosDer = (Repo.state.trabajos || [])
    .filter(t => (t.facultadKey || '').toLowerCase() === 'derecho');
  trabajosDer.forEach(t => Der.addTrabajo(t));

  // Carreras desde Repo (conteo), si existe
  if (Repo.state.facultades && Repo.state.facultades.derecho) {
    const n = Number(Repo.state.facultades.derecho.carreras || 0);
    if (n) Der.setCarreras(n);
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
const Der = {
  addTrabajo(t){
    derState.trabajos.push({
      id:         t.id || crypto.randomUUID(),
      titulo:     t.titulo || '',
      autor:      t.autor || '',
      carrera:    t.carrera || '',
      anio:       t.anio || '',
      etiquetas:  t.etiquetas || [],
      resumen:    t.resumen || '',
      portada:    t.portada || '',
      detalleUrl: t.detalleUrl || '#',
      pdfUrl:     t.pdfUrl || '#'
    });
    renderKPIs();
    renderCards();
  },
  setCarreras(n){
    derState.metricas.carreras = Number(n || 0);
    renderKPIs();
  },
  setMaxCards(n){
    derState.ui.maxCards = Math.max(1, Number(n) || Infinity);
    renderCards();
  },
  buscar(q){
    if ($.q){ $.q.value = q || ''; }
    derState.ui.query = (q || '').trim();
    renderCards();
  },
  state: derState
};

window.Der = Der;

// =====================
// Inicio
// =====================
document.addEventListener('DOMContentLoaded', ()=>{
  bindSearch();
  hydrateFromRepo();
  hydrate();
});
