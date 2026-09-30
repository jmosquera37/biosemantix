import { Database } from "lucide-react";

function Databases() {
  return (
    <div className="page-container">
      <div className="page-title">
        <h1>Bases de datos</h1>
        <p>Consulta las fuentes de información biológica utilizadas por BioSemantix.</p>
      </div>

      <div className="database-grid">
        <div className="database-card">
          <Database size={32} />
          <h2>Ensembl</h2>
          <p>
            Información de referencia genómica y anotaciones de genes.
          </p>
          <span className="status-badge">Disponible</span>
        </div>

        <div className="database-card">
          <Database size={32} />
          <h2>UniProt</h2>
          <p>
            Información sobre proteínas y anotaciones funcionales.
          </p>
          <span className="status-badge">Disponible</span>
        </div>
      </div>
    </div>
  );
}

export default Databases;