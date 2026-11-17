import { Outlet, NavLink } from 'react-router-dom';

export default function CoordinatorLayout() {
    return (
        <div className="flex flex-grow bg-slate-50">

            {/* Sidebar para sub-navegación. A ajustar estilos */}
            <aside className="w-64 bg-[#2a3441] text-white flex flex-col shadow-lg z-10">
                <div className="p-6 text-sm uppercase tracking-wider font-bold border-b border-slate-700/50 text-slate-300">
                    Menú Coordinador
                </div>

                <nav className="flex-1 p-4 space-y-2">
                    <NavLink
                        to="/coordinador/legajos"
                        className={({ isActive }) =>
                            `block px-4 py-3 rounded transition-colors ${isActive ? 'bg-slate-700 font-bold border-l-4 border-white' : 'hover:bg-slate-700/50 border-l-4 border-transparent'}`
                        }
                    >
                        Gestión de Legajos
                    </NavLink>

                    <NavLink
                        to="/coordinador/panel"
                        className={({ isActive }) =>
                            `block px-4 py-3 rounded transition-colors ${isActive ? 'bg-slate-700 font-bold border-l-4 border-white' : 'hover:bg-slate-700/50 border-l-4 border-transparent'}`
                        }
                    >
                        Panel de Conducción
                    </NavLink>

                    <NavLink
                        to="/coordinador/gestion-docente"
                        className={({ isActive }) =>
                            `block px-4 py-3 rounded transition-colors ${isActive ? 'bg-slate-700 font-bold border-l-4 border-white' : 'hover:bg-slate-700/50 border-l-4 border-transparent'}`
                        }
                    >
                        Gestión Docente
                    </NavLink>

                    <NavLink
                        to="/coordinador/graduacion"
                        className={({ isActive }) =>
                            `block px-4 py-3 rounded transition-colors ${isActive ? 'bg-slate-700 font-bold border-l-4 border-white' : 'hover:bg-slate-700/50 border-l-4 border-transparent'}`
                        }
                    >
                        Seguimiento de Graduación
                    </NavLink>
                </nav>

            </aside>

            {/* Contenido de Coordinador */}
            <div className="flex-grow flex flex-col overflow-y-auto">
                <Outlet />
            </div>

        </div>
    );
}