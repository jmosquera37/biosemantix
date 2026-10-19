import type { ComponentType } from "react";
import { Home, Upload, FileText, Database, Settings } from "lucide-react";

/**
 * Definición única de la navegación principal.
 *
 * Se comparte entre el menú lateral (enlaces) y el encabezado (título y
 * descripción de la sección activa) para evitar duplicar rutas o textos.
 */
export interface NavigationItem {
  name: string;
  path: string;
  description: string;
  icon: ComponentType<{ size?: number | string }>;
}

export const navigationItems: NavigationItem[] = [
  {
    name: "Inicio",
    path: "/inicio",
    description: "Punto de partida y resumen de BioSemantix.",
    icon: Home,
  },
  {
    name: "Cargar lista de genes",
    path: "/cargar-datos",
    description: "Carga y validación local de identificadores.",
    icon: Upload,
  },
  {
    name: "Reporte funcional",
    path: "/resultados",
    description: "Anotaciones biológicas por identificador consultado.",
    icon: FileText,
  },
  {
    name: "Bases de datos",
    path: "/bases-de-datos",
    description: "Fuentes de información biológica utilizadas.",
    icon: Database,
  },
  {
    name: "Configuración",
    path: "/configuracion",
    description: "Preferencias generales de BioSemantix.",
    icon: Settings,
  },
];
