
import { Activity } from "lucide-react";

import { NavLink } from "react-router-dom";

import { navigationItems } from "../config/navigation";
import { useBackendStatus } from "../context/BackendStatusContext";
import { BACKEND_STATUS_LABELS } from "../utils/backendStatus";

function Sidebar() {
  const { status } = useBackendStatus();

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <Activity size={30} />
        <span>BioSemantix</span>
      </div>

      <nav className="sidebar-menu">
        {navigationItems.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/"}
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

      <div
        className="backend-status"
        title="Estado del servicio de BioSemantix (backend)"
      >
        <span className={`status-dot ${status}`}></span>

        <div>
          <strong>Backend</strong>
          <small>{BACKEND_STATUS_LABELS[status]}</small>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
