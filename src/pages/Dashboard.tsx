import { getGeneBySymbol } from "../services/ensembl";
import { getProteinByGene } from "../services/uniprot";
import {
  Activity,
  FileText,
  Play,
  Upload,
} from "lucide-react";

function Dashboard() {
  const testEnsembl = async () => {
    try {
      const gene = await getGeneBySymbol("BRCA1");
      console.log("Resultado de Ensembl:", gene);
    } catch (error) {
      console.error("Error consultando Ensembl:", error);
    }
  };
  const testUniProt = async () => {
    try {
      const protein = await getProteinByGene("BRCA1");
      console.log("Resultado de UniProt:", protein);
    } catch (error) {
      console.error("Error consultando UniProt:", error);
    }
  };
  return (
    <div className="dashboard">
      <section className="welcome-section">
        <div>
          <span className="eyebrow">BioSemantix PWA</span>

          <h2>
            Análisis funcional de
            <br />
            expresión génica
          </h2>

          <p>
            Interpreta tus datos de expresión génica mediante
            una interfaz sencilla y orientada al procesamiento local.
          </p>
        </div>

        <button className="primary-button">
          <Play size={18} />
          Nuevo análisis
        </button>
      </section>

      <section className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">
            <FileText size={22} />
          </div>

          <span>Archivos cargados</span>
          <strong>0</strong>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <Activity size={22} />
          </div>

          <span>Análisis realizados</span>
          <strong>0</strong>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <Upload size={22} />
          </div>

          <span>Datos procesados</span>
          <strong>0</strong>
        </div>
      </section>

      <section className="quick-section">
        <h3>Acciones rápidas</h3>

        <div className="quick-grid">
          <button className="quick-card">
            <Upload size={24} />
            <div>
              <strong>Cargar datos</strong>
              <span>Importar un archivo CSV o TSV</span>
            </div>
          </button>

          <button className="quick-card">
            <Play size={24} />
            <div>
              <strong>Nuevo análisis</strong>
              <span>Configurar un análisis funcional</span>
            </div>
          </button>
        </div>

        {/* Prueba temporal de Ensembl */}
        <button onClick={testEnsembl}>
          Probar Ensembl
        </button>
        <button onClick={testUniProt}>
          Probar UniProt
        </button>
      </section>
    </div>
  );
}

export default Dashboard;