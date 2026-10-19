/** Estado de la comprobación de disponibilidad del backend. */
export type BackendStatus = "checking" | "connected" | "unavailable";

/** Etiquetas en español para los estados del backend. */
export const BACKEND_STATUS_LABELS: Record<BackendStatus, string> = {
  checking: "Comprobando…",
  connected: "Conectado",
  unavailable: "No disponible",
};
