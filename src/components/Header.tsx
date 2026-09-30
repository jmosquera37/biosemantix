import { Bell, User } from "lucide-react";

function Header() {
  return (
    <header className="header">
      <div>
        <h1>Dashboard</h1>
        <p>Plataforma de interpretación funcional</p>
      </div>

      <div className="header-actions">
        <button className="icon-button">
          <Bell size={20} />
        </button>

        <button className="user-button">
          <User size={20} />
          <span>Usuario</span>
        </button>
      </div>
    </header>
  );
}

export default Header;