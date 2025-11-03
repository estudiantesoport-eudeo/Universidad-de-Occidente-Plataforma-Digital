const humState = {
  trabajos: [],
  metricas: { carreras: 0 },
  ui: { maxCards: Infinity, query: '' } // mostrar TODOS
};

const $ = {
  kpiTrabajos: document.getElementById('hum-kpi-trabajos'),
  kpiCarreras: document.getElementById('hum-kpi-carreras'),
  cards:       document.getElementById('cards-ultimos-humanidades'),
  form:        document.getElementById('form-busqueda'),
  q:           document.getElementById('search-keywords'),
  btn:         document.getElementById('btn-search'),
  listaCarr:   document.getElementById('hum-lista-carreras')
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
function renderKPIs(){
  if ($.kpiTrabajos) $.kpiTrabajos.textContent = fnum(humState.trabajos.length);
  if ($.kpiCarreras) $.kpiCarreras.textContent = fnum(humState.metricas.carreras || 0);
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
  const q = humState.ui.query;
  const filtrados = humState.trabajos
    .filter(t => match(t, q))
    .sort((a,b) => String(b.anio).localeCompare(String(a.anio))); // más reciente → antiguo

  if ($.cards) $.cards.innerHTML = filtrados.map(card).join('') || '';
}

// =====================
// Carreras (lista)
// =====================
function getCarrerasHumanidades(){
  if (typeof FACULTADES !== 'undefined' && FACULTADES.humanidades) {
    return Array.from(FACULTADES.humanidades.carreras || []);
  }
  return [];
}

function renderCarreras(){
  if (!$.listaCarr) return;
  const carreras = getCarrerasHumanidades();

  if (!humState.metricas.carreras) {
    Hum.setCarreras(carreras.length);
  }

  $.listaCarr.innerHTML = carreras.map(nombre => `
    <li>${nombre}</li>
  `).join('') || '<li class="util-muted">No hay carreras registradas.</li>';
}

// =====================
// Búsqueda local
// =====================
function handleSearch(){
  humState.ui.query = ($.q && $.q.value || '').trim();
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

  // Trabajos de Humanidades
  const trabajosHum = (Repo.state.trabajos || [])
    .filter(t => (t.facultadKey || '').toLowerCase() === 'humanidades');
  trabajosHum.forEach(t => Hum.addTrabajo(t));

  // Carreras desde Repo (conteo), si existe
  if (Repo.state.facultades && Repo.state.facultades.humanidades) {
    const n = Number(Repo.state.facultades.humanidades.carreras || 0);
    if (n) Hum.setCarreras(n);
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
const Hum = {
  addTrabajo(t){
    humState.trabajos.push({
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
    humState.metricas.carreras = Number(n || 0);
    renderKPIs();
  },
  setMaxCards(n){
    humState.ui.maxCards = Math.max(1, Number(n) || Infinity);
    renderCards();
  },
  buscar(q){
    if ($.q){ $.q.value = q || ''; }
    humState.ui.query = (q || '').trim();
    renderCards();
  },
  state: humState
};

window.Hum = Hum;

// =====================
// Inicio
// =====================
document.addEventListener('DOMContentLoaded', ()=>{
  bindSearch();
  hydrateFromRepo();
  hydrate();
});
