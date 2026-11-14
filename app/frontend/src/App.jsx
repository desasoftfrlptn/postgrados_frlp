import React, { useState } from 'react';
import './App.css';

import Preinscripcion from './components/preinscripcion.jsx';
import PanelDocente from './components/panelDocente.jsx';
import PanelConduccionEstudiante from './components/PanelConduccionEstudiante.jsx';
import { PanelConduccionInscripciones } from './components/PanelConduccionInscripciones.jsx';
import VistaPostgrados from './components/VistaPostgrados.jsx';
import { VistaEstadisticas } from './components/VistaEstadisticas.jsx';
import { authService } from './services/authService';

// --- LOGIN ---
function Login({ onLogin, onIrAPreinscripcion }) {
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const emailNormalizado = user.trim();

    // Validaciones previas al envío
    if (!emailNormalizado) {
      setError('El correo electrónico es requerido');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailNormalizado)) {
      setError('Ingrese un formato de correo electrónico válido');
      return;
    }

    if (!pass) {
      setError('La contraseña es requerida');
      return;
    }

    setCargando(true);
    setError('');

    try {
      await authService.login(emailNormalizado, pass);
      onLogin();
    } catch (err) {
      if (err.status === 401) {
        setError('Credenciales inválidas. Verifique su correo institucional y contraseña.');
      } else if (err.name === 'TypeError' || err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError')) {
        setError('No se pudo conectar con el servidor de Posgrado. Verifique que el backend esté activo.');
      } else {
        setError(err.message || 'Error inesperado al iniciar sesión.');
      }
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-card">
        <h1>UTN FRLP</h1>
        <h2>Sistema de Posgrado</h2>
        <form onSubmit={handleSubmit} noValidate>
          {error && (
            <div 
              role="alert" 
              style={{
                backgroundColor: '#f8d7da',
                color: '#842029',
                border: '1px solid #f5c2c7',
                borderRadius: '4px',
                padding: '10px 14px',
                fontSize: '13px',
                marginBottom: '18px',
                textAlign: 'left',
                lineHeight: '1.4',
              }}
            >
              {error}
            </div>
          )}
          <input 
            type="email" 
            placeholder="Correo institucional (ej: admin@posgrado.frlp.utn.edu.ar)" 
            className="form-control" 
            style={{marginBottom: '15px'}} 
            value={user} 
            onChange={(e) => {setUser(e.target.value); setError('');}} 
            autoComplete="email"
            disabled={cargando}
          />
          <input 
            type="password" 
            placeholder="Contraseña" 
            className="form-control" 
            style={{marginBottom: '25px'}} 
            value={pass} 
            onChange={(e) => {setPass(e.target.value); setError('');}} 
            autoComplete="current-password"
            disabled={cargando}
          />
          <button 
            type="submit" 
            className="btn-primary" 
            disabled={cargando}
            style={cargando ? { opacity: 0.7, cursor: 'not-allowed' } : {}}
          >
            {cargando ? 'Iniciando sesión...' : 'Iniciar Sesión'}
          </button>
        </form>
        <p style={{marginTop: '20px', fontSize: '12px', color: '#666'}}>
          ¿Olvidó su contraseña? Contacte a soporte de Conducción.
        </p>

        <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #e9ecef', textAlign: 'center' }}>
          <p style={{ margin: '0 0 10px 0', fontSize: '13px', color: '#495057' }}>
            ¿Querés postularte a una carrera de posgrado?
          </p>
          <button
            type="button"
            className="btn-secondary"
            onClick={onIrAPreinscripcion}
            style={{ width: '100%', padding: '10px 14px', fontSize: '13px', fontWeight: '600' }}
          >
            📝 Preinscribite acá como aspirante
          </button>
        </div>
      </div>
    </div>
  );
}

// --- CONTENEDOR PRINCIPAL ---
export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => authService.isAuthenticated());
  const [mostrarPreinscripcionPublica, setMostrarPreinscripcionPublica] = useState(false);

  // Control de acceso según RBAC: sólo ADMIN_POSGRADO y SUPERADMIN acceden a conducción
  const usuarioActivo = authService.getUser();
  const tienePermisoConduccion = ['ADMIN_POSGRADO', 'SUPERADMIN'].includes(usuarioActivo?.rol);

  // Vista inicial inteligente: si no es admin, abrir preinscripción o docente según rol
  const vistaInicial = tienePermisoConduccion 
    ? 'inscripciones' 
    : (usuarioActivo?.rol === 'DOCENTE' ? 'docente' : 'preinscripcion');

  const [vista, setVista] = useState(vistaInicial);
  const [legajoBuscado, setLegajoBuscado] = useState(null);

  const handleIrAEstudiante = (legajo) => {
    setLegajoBuscado(legajo);
    setVista('estudiante');
  };

  const handleLogout = () => {
    authService.logout();
    setIsLoggedIn(false);
  };

  if (!isLoggedIn) {
    if (mostrarPreinscripcionPublica) {
      return <Preinscripcion onVolverAlLogin={() => setMostrarPreinscripcionPublica(false)} />;
    }
    return (
      <Login 
        onLogin={() => {
          setIsLoggedIn(true);
          setMostrarPreinscripcionPublica(false);
        }} 
        onIrAPreinscripcion={() => setMostrarPreinscripcionPublica(true)} 
      />
    );
  }

  // Barra de navegación con control de permisos RBAC
  const renderNav = () => (
    <nav className="demo-nav" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 20px' }}>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button className={vista === 'preinscripcion' ? 'active' : ''} onClick={() => setVista('preinscripcion')}>Preinscripcion</button>
        <button className={vista === 'docente' ? 'active' : ''} onClick={() => setVista('docente')}>Docente</button>
        {tienePermisoConduccion && (
          <button 
            className={['inscripciones', 'estudiante', 'posgrados', 'estadisticas'].includes(vista) ? 'active' : ''} 
            onClick={() => setVista('inscripciones')}
          >
            Equipo de Conducción
          </button>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
        {usuarioActivo && (
          <span style={{ fontSize: '13px', color: '#fff', opacity: 0.9 }}>
            👤 {usuarioActivo.nombre} {usuarioActivo.apellido} <strong>({usuarioActivo.rol})</strong>
          </span>
        )}
        <button style={{ background: '#dc3545', margin: 0 }} onClick={handleLogout}>Cerrar Sesión</button>
      </div>
    </nav>
  );

  if (vista === 'preinscripcion') {
    return (
      <>
        {renderNav()}
        <Preinscripcion />
      </>
    );
  }
  
  if (vista === 'docente') {
    return (
      <>
        {renderNav()}
        <PanelDocente />
      </>
    );
  }

  // Si intenta acceder al panel de conducción sin los permisos requeridos
  if (!tienePermisoConduccion) {
    return (
      <>
        {renderNav()}
        <div style={{ padding: '40px 20px', maxWidth: '600px', margin: '40px auto', textAlign: 'center', backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
          <h2 style={{ color: '#dc3545', marginBottom: '15px' }}>⛔ Acceso Restringido</h2>
          <p style={{ color: '#495057', fontSize: '14px', lineHeight: '1.6' }}>
            Su usuario actual <strong>({usuarioActivo?.email || 'Sin usuario'})</strong> con rol <strong>{usuarioActivo?.rol || 'DESCONOCIDO'}</strong> no cuenta con permisos de administración para visualizar el Panel de Equipo de Conducción.
          </p>
          <p style={{ color: '#6c757d', fontSize: '13px' }}>
            Se requiere el rol <code>ADMIN_POSGRADO</code> o <code>SUPERADMIN</code>.
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      {renderNav()}
      
      <div className="conduccion-layout">
        <aside className="sidebar">
          <div className="sidebar-logo">UTN</div>
          <ul>
            <li className={vista === 'inscripciones' ? 'active' : ''} onClick={() => setVista('inscripciones')}><span className="sidebar-icon">📋</span> Inscripciones</li>
            <li className={vista === 'estudiante' ? 'active' : ''} onClick={() => setVista('estudiante')}><span className="sidebar-icon">👥</span> Estudiantes</li>
            <li className={vista === 'posgrados' ? 'active' : ''} onClick={() => setVista('posgrados')}><span className="sidebar-icon">🎓</span> Posgrados</li>
            <li className={vista === 'estadisticas' ? 'active' : ''} onClick={() => setVista('estadisticas')}><span className="sidebar-icon">📊</span> Estadisticas</li>
          </ul>
        </aside>
        <main className="main-content">
           <div className="panel-header">Panel de Equipo de conducción</div>
           {vista === 'inscripciones' && <PanelConduccionInscripciones onIrAEstudiante={handleIrAEstudiante} />}
           {vista === 'estudiante' && <PanelConduccionEstudiante legajoInicial={legajoBuscado} />}
           {vista === 'posgrados' && <VistaPostgrados />}
           {vista === 'estadisticas' && <VistaEstadisticas />}
        </main>
      </div>
    </>
  );
}
