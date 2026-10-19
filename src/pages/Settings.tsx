import { CheckCircle, Laptop, RefreshCw, Server, WifiOff } from "lucide-react";

import { useBackendStatus } from "../context/BackendStatusContext";
import { getApiBaseUrl } from "../services/biosemantix";
import { BACKEND_STATUS_LABELS } from "../utils/backendStatus";
import type { BackendStatus } from "../utils/backendStatus";

const STATUS_TONES: Record<BackendStatus, string> = {
  checking: "info",
  connected: "success",
  unavailable: "error",
};

function StatusIcon({ status }: { status: BackendStatus }) {
  if (status === "connected") {
    return <CheckCircle size={22} />;
  }

  if (status === "unavailable") {
    return <WifiOff size={22} />;
  }

  return <Server size={22} />;
}

function Settings() {
  const { status, checkedAt, refresh } = useBackendStatus();

  let statusDetail =
    "Comprobando si el backend de BioSemantix responde.";

  if (status === "connected") {
    statusDetail = checkedAt
      ? `El backend responde. Última comprobación a las ${checkedAt.toLocaleTimeString(
          "es-ES"
        )}.`
      : "El backend responde.";
  } else if (status === "unavailable") {
    statusDetail =
      "No se pudo contactar con el backend. Verifica que el servicio " +
      `esté disponible en ${getApiBaseUrl()}.`;
  }

  return (
    <div className="page-container">
      <div className="page-title">
        <h1>Configuración</h1>
        <p>
          Información sobre cómo funciona BioSemantix y el estado de sus
          componentes.
        </p>
      </div>

      <div className="settings-stack">
        <section className="settings-card">
          <h2>Estado del backend</h2>

          <p>
            Comprobación del servicio de BioSemantix (ruta <code>GET /</code>).
            Este indicador solo confirma que el backend responde; no verifica
            la disponibilidad de Ensembl ni de UniProt.
          </p>

          <div
            className={`backend-state ${STATUS_TONES[status]}`}
            role="status"
            aria-live="polite"
          >
            <StatusIcon status={status} />

            <div className="backend-state-text">
              <strong>{BACKEND_STATUS_LABELS[status]}</strong>
              <span>{statusDetail}</span>
            </div>

            <button
              type="button"
              className="secondary-button"
              onClick={refresh}
              disabled={status === "checking"}
            >
              <RefreshCw size={16} />
              Comprobar de nuevo
            </button>
          </div>
        </section>

        <section className="settings-card">
          <h2>Qué ocurre en el navegador y qué necesita el backend</h2>

          <p>
            BioSemantix no realiza todas las operaciones localmente: algunas
            tareas se ejecutan en tu navegador y otras dependen de servicios
            externos a través del backend.
          </p>

          <div className="settings-group">
            <h3>
              <Laptop size={18} />
              En tu navegador (sin salir del equipo)
            </h3>

            <ul>
              <li>Lectura local de los archivos TXT, CSV y TSV.</li>
              <li>
                Validación del formato y detección de identificadores
                repetidos.
              </li>
              <li>Vista previa de la lista cargada.</li>
              <li>
                Búsqueda, filtrado por estado y exportación CSV del reporte ya
                consultado.
              </li>
            </ul>
          </div>

          <div className="settings-group">
            <h3>
              <Server size={18} />
              En el backend (requiere conexión)
            </h3>

            <ul>
              <li>Consulta de información de genes en Ensembl.</li>
              <li>
                Consulta de proteínas y anotaciones funcionales en UniProt.
              </li>
              <li>
                Construcción del reporte funcional a partir de las respuestas
                de las fuentes externas.
              </li>
            </ul>
          </div>
        </section>

        <section className="settings-card">
          <h2>Uso sin conexión (PWA)</h2>

          <p>
            La interfaz de BioSemantix se instala como aplicación web
            progresiva y su estructura puede abrirse sin conexión gracias al
            almacenamiento en caché.
          </p>

          <p>
            Las consultas nuevas a Ensembl y UniProt requieren conexión con el
            backend y acceso a estas fuentes externas. Sin ellos no es posible
            generar ni ampliar el reporte, aunque la interfaz siga disponible.
          </p>
        </section>
      </div>
    </div>
  );
}

export default Settings;
