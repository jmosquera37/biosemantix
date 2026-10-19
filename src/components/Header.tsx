import { useLocation } from "react-router-dom";

import { navigationItems } from "../config/navigation";

function Header() {
  const { pathname } = useLocation();

  const currentSection = navigationItems.find(
    (item) => pathname === item.path || pathname.startsWith(`${item.path}/`)
  );

  return (
    <header className="header">
      <div>
        <h1>{currentSection?.name ?? "BioSemantix"}</h1>
        <p>
          {currentSection?.description ??
            "Plataforma de interpretación funcional"}
        </p>
      </div>
    </header>
  );
}

export default Header;
