import {
  Home,
  Upload,
  BarChart3,
  Database,
  Settings,
  Activity,
} from "lucide-react";

import { NavLink } from "react-router-dom";

const menuItems = [
  {
    name: "Inicio",
    path: "/",
    icon: Home,
  },
  {
    name: "Cargar datos",
    path: "/cargar-datos",
    icon: Upload,
  },
  {
    name: "Resultados",
    path: "/resultados",
    icon: BarChart3,
  },
  {
    name: "Bases de datos",
    path: "/bases-de-datos",
    icon: Database,
  },
  {
    name: "Configuración",
    path: "/configuracion",
    icon: Settings,
  },
];

function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <Activity size={30} />
        <span>BioSemantix</span>
      </div>

      <nav className="sidebar-menu">
        {menuItems.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `sidebar-link ${isActive ? "active" : ""}`
              }
            >
              <Icon size={20} />
              <span>{item.name}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="processing-status">
        <span className="status-dot"></span>

        <div>
          <strong>Procesamiento local</strong>
          <small>Activo</small>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;