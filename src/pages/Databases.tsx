import { Database, Info } from "lucide-react";

function Databases() {
  return (
    <div className="page-container">
      <div className="page-title">
        <h1>Bases de datos</h1>
        <p>
          Consulta las fuentes de información biológica utilizadas por
          BioSemantix.
        </p>
      </div>

      <div className="gene-message info" role="note">
        <Info size={18} />
        Las consultas a Ensembl y UniProt dependen de la conexión con el
        backend y de la disponibilidad de estos servicios externos. El
        indicador de Configuración solo confirma que el backend responde; no
        comprueba directamente Ensembl ni UniProt.
      </div>

      <div className="database-grid">
        <div className="database-card">
          <Database size={32} />
          <h2>Ensembl</h2>
          <p>
            Información de genes, identificadores, símbolos y descripciones.
          </p>
          <span className="status-badge neutral">Fuente externa</span>
        </div>

        <div className="database-card">
          <Database size={32} />
          <h2>UniProt</h2>
          <p>
            Información de proteínas y anotaciones funcionales, cuando están
            disponibles.
          </p>
          <span className="status-badge neutral">Fuente externa</span>
        </div>
      </div>
    </div>
  );
}

export default Databases;
