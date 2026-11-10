const NOTIFICATIONS = [
  { id:1, type:'success', icon:'✅', msg:'<strong>Lucía González</strong> completó toda la documentación. Lista para matriculación.', time:'Hace 5 min', read:false },
  { id:2, type:'warn',    icon:'⚠️', msg:'<strong>Juan Pérez</strong> no presentó DNI. Plazo vence en 2 días.', time:'Hace 18 min', read:false },
  { id:3, type:'success', icon:'✅', msg:'<strong>Sofía Ramírez</strong> completó la declaración jurada faltante.', time:'Hace 1 h', read:false },
  { id:4, type:'info',    icon:'📋', msg:'<strong>Joaquín Méndez</strong> inició la carga de documentos en el portal.', time:'Hace 2 h', read:false },
  { id:5, type:'warn',    icon:'⚠️', msg:'<strong>Diego Luna</strong> — 3.er aviso: DNI original sin presentar.', time:'Hace 3 h', read:false },
  { id:6, type:'success', icon:'✅', msg:'<strong>Camila Bravo</strong> avanzó al paso de revisión académica.', time:'Hace 5 h', read:true },
  { id:7, type:'info',    icon:'📬', msg:'Se enviaron 12 recordatorios automáticos a alumnos con doc. pendiente.', time:'Hoy 08:00', read:true },
  { id:8, type:'danger',  icon:'🚨', msg:'<strong>Nicolás Benítez</strong> bloqueado: falta DNI y cert. analítico.', time:'Ayer 17:30', read:true },
];

function renderNotifList(listEl, items) {
  listEl.innerHTML = '';
  items.forEach(n => {
    const div = document.createElement('div');
    div.className = 'notif-drawer-item' + (n.read ? '' : ' unread');
    div.innerHTML = `
      <div class="notif-icon-wrap ${n.type}" style="font-size:16px;">${n.icon}</div>
      <div class="notif-body">
        <div class="notif-msg">${n.msg}</div>
        <div class="notif-time">${n.time}</div>
      </div>
      ${!n.read ? '<div class="notif-unread-dot"></div>' : ''}
    `;
    div.onclick = () => { n.read = true; refreshAll(); };
    listEl.appendChild(div);
  });
}

function refreshAll() {
  const unread = NOTIFICATIONS.filter(n => !n.read).length;
  const badge = document.getElementById('inlineNotifBadge');
  const dot = document.getElementById('notifDot');
  if (badge) badge.textContent = unread;
  if (dot) dot.style.display = unread > 0 ? '' : 'none';
  renderNotifList(document.getElementById('inlineNotifList'), NOTIFICATIONS);
  renderNotifList(document.getElementById('drawerNotifList'), NOTIFICATIONS);
}

function markAllRead() {
  NOTIFICATIONS.forEach(n => n.read = true);
  refreshAll();
  showToast('Todas las notificaciones marcadas como leídas');
}

function openNotifDrawer() {
  document.getElementById('notifDrawer').classList.add('open');
}
function closeNotifDrawer() {
  document.getElementById('notifDrawer').classList.remove('open');
}

// ===== TABS =====
function switchTab(el, id) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  el.classList.add('active');
  document.getElementById(id).classList.add('active');
}

function switchTabByName(id) {
  const map = { 'tab-inscripcion':0,'tab-legajo':1,'tab-workflow':2,'tab-docs':3 };
  const tabs = document.querySelectorAll('.tab');
  tabs.forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  tabs[map[id]].classList.add('active');
  document.getElementById(id).classList.add('active');
}

// ===== FILTERS =====
function normalizeText(v) {
  return (v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9\s.]/g,' ').replace(/\s+/g,' ').trim();
}

function toggleFilters() {
  const p = document.getElementById('inscripcionFilters');
  p.classList.toggle('open');
}

function applyInscripcionFilters() {
  const career = document.getElementById('careerFilter').value;
  const status = document.getElementById('statusFilter').value;
  const cohort = document.getElementById('cohortFilter').value;
  const dni    = normalizeText(document.getElementById('dniFilter').value);
  const leg    = normalizeText(document.getElementById('legajoFilter').value);

  document.querySelectorAll('#inscripcion-tbody tr').forEach(row => {
    const rCareer = normalizeText(row.querySelector('td:nth-child(2)')?.textContent);
    const rStatus = normalizeText(row.querySelector('.chip')?.textContent);
    const rCohort = normalizeText(row.dataset.cohorte);
    const rDni    = normalizeText(row.dataset.dni);
    const rLeg    = normalizeText(row.dataset.legajo);

    const ok =
      (career === 'all' || rCareer.includes(normalizeText(career))) &&
      (status === 'all' || rStatus.includes(normalizeText(status))) &&
      (cohort === 'all' || rCohort.includes(normalizeText(cohort))) &&
      (!dni || rDni.includes(dni)) &&
      (!leg || rLeg.includes(leg));

    row.style.display = ok ? '' : 'none';
  });
}

function clearInscripcionFilters() {
  ['careerFilter','statusFilter','cohortFilter'].forEach(id => document.getElementById(id).value='all');
  ['dniFilter','legajoFilter'].forEach(id => document.getElementById(id).value='');
  applyInscripcionFilters();
}

// ===== VALIDATION =====
function validateDniField(input) {
  const err = document.getElementById('dniError');
  const v = input.value;
  if (!v) { input.classList.remove('input-invalid'); if(err) err.textContent=''; return true; }
  if (/[a-zA-Z]/.test(v) || /[^0-9.\s-]/.test(v)) {
    input.classList.add('input-invalid');
    if(err) err.textContent='Solo se permiten números.';
    return false;
  }
  input.classList.remove('input-invalid'); if(err) err.textContent=''; return true;
}

function validateTextField(input, errorId, msg) {
  const err = document.getElementById(errorId);
  if (!input.value.trim()) { input.classList.remove('input-invalid'); if(err) err.textContent=''; return false; }
  if (/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s'-]/.test(input.value)) {
    input.classList.add('input-invalid'); if(err) err.textContent=msg; return false;
  }
  input.classList.remove('input-invalid'); if(err) err.textContent=''; return true;
}

function validateEmailField(input) {
  const err = document.getElementById('emailError');
  const v = input.value.trim();
  if (!v) { input.classList.remove('input-invalid'); if(err) err.textContent=''; return false; }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
    input.classList.add('input-invalid'); if(err) err.textContent='Correo inválido, ej. alumno@mail.com'; return false;
  }
  input.classList.remove('input-invalid'); if(err) err.textContent=''; return true;
}

// ===== MODAL =====
function openModal() { document.getElementById('modal').classList.add('open'); }
function closeModal() { document.getElementById('modal').classList.remove('open'); }
function closeModalOutside(e) { if(e.target.id==='modal') closeModal(); }

function submitForm() {
  const n  = document.getElementById('nameInput');
  const s  = document.getElementById('surnameInput');
  const d  = document.getElementById('dniInput');
  const em = document.getElementById('emailInput');
  const ok = [
    !n  || validateTextField(n,'nameError','Solo letras.'),
    !s  || validateTextField(s,'surnameError','Solo letras.'),
    !d  || validateDniField(d),
    !em || validateEmailField(em)
  ].every(Boolean);
  if (!ok) { showToast('Corregí los campos marcados antes de continuar'); return; }
  closeModal();
  showToast('Inscripción creada y workflow iniciado ✓');
}

// ===== TOAST =====
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2800);
}

// ===== LEGAJO =====
function selectLegajo(el, initials, name, carrera, id, cohorte, estado) {
  document.querySelectorAll('.legajo-item').forEach(i => i.classList.remove('active'));
  el.classList.add('active');
  document.getElementById('legajo-avatar').textContent = initials;
  document.getElementById('legajo-name').textContent = name;
  document.getElementById('legajo-id').textContent = 'Legajo #' + id;
  document.getElementById('legajo-carrera').textContent = carrera;
  document.getElementById('legajo-cohorte').textContent = cohorte;
  document.getElementById('legajo-estado').textContent = estado;
}

// ===== THEME =====
function toggleTheme() {
  document.body.classList.toggle('dark');
  const isDark = document.body.classList.contains('dark');
  document.getElementById('themeLabel').textContent = isDark ? 'Modo claro' : 'Modo oscuro';
  document.getElementById('themeIcon').textContent  = isDark ? '☀️' : '🌙';
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
}

window.addEventListener('load', () => {
  if (localStorage.getItem('theme') === 'dark') {
    document.body.classList.add('dark');
    document.getElementById('themeLabel').textContent = 'Modo claro';
    document.getElementById('themeIcon').textContent  = '☀️';
  }
  refreshAll();
  applyInscripcionFilters();
});