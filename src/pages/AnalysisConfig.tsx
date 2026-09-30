import { useNavigate } from "react-router-dom";

function AnalysisConfig() {
  const navigate = useNavigate();

  const handleExecute = () => {
    navigate("/resultados");
  };

  return (
    <div className="page-container">
      <div className="page-title">
        <h1>Configurar análisis</h1>
        <p>
          Define los parámetros que se utilizarán para el análisis funcional.
        </p>
      </div>

      <div className="analysis-card">
        <div className="form-section">
          <h2>Archivo de datos</h2>

          <div className="selected-file">
            <div>
              <strong>ejemplo_expresion_genica.csv</strong>
              <span>Archivo CSV · 1.2 MB</span>
            </div>

            <button className="secondary-button">
              Cambiar archivo
            </button>
          </div>
        </div>

        <div className="form-section">
          <h2>Tipo de análisis</h2>

          <label>
            Método
            <select defaultValue="over-representation">
              <option value="over-representation">
                Análisis de sobre-representación
              </option>
              <option value="enrichment">
                Enriquecimiento funcional
              </option>
            </select>
          </label>
        </div>

        <div className="form-section">
          <h2>Base de datos</h2>

          <label>
            Fuente de anotaciones
            <select defaultValue="ensembl">
              <option value="ensembl">Ensembl</option>
              <option value="uniprot">UniProt</option>
            </select>
          </label>
        </div>

        <div className="form-section">
          <h2>Parámetros</h2>

          <div className="form-grid">
            <label>
              Umbral de significancia
              <input
                type="number"
                defaultValue="0.05"
                step="0.01"
                min="0"
                max="1"
              />
            </label>

            <label>
              Número máximo de resultados
              <input
                type="number"
                defaultValue="20"
                min="1"
                max="100"
              />
            </label>
          </div>
        </div>

        <div className="analysis-actions">
          <button
            className="secondary-button"
            onClick={() => navigate("/cargar-datos")}
          >
            Atrás
          </button>

          <button
            className="primary-button"
            onClick={handleExecute}
          >
            Ejecutar análisis
          </button>
        </div>
      </div>
    </div>
  );
}

export default AnalysisConfig;