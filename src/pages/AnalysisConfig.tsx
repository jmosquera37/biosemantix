
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useExpressionData } from "../context/ExpressionDataContext";
import type { AnalysisConfiguration } from "../types/expressionData";

function AnalysisConfig() {
  const navigate = useNavigate();

  const {
    expressionData,
    analysisConfiguration,
    setAnalysisConfiguration,
  } = useExpressionData();

  const [controlColumn, setControlColumn] = useState(
    analysisConfiguration?.controlColumn ?? "Control"
  );

  const [treatmentColumn, setTreatmentColumn] = useState(
    analysisConfiguration?.treatmentColumn ?? "Treatment"
  );

  const [method, setMethod] =
    useState<AnalysisConfiguration["method"]>(
      analysisConfiguration?.method ?? "over-representation"
    );

  const [annotationSource, setAnnotationSource] =
    useState<AnalysisConfiguration["annotationSource"]>(
      analysisConfiguration?.annotationSource ?? "ensembl"
    );

  const [significanceThreshold, setSignificanceThreshold] = useState(
    analysisConfiguration?.significanceThreshold ?? 0.05
  );

  const [maxResults, setMaxResults] = useState(
    analysisConfiguration?.maxResults ?? 20
  );

  const [configError, setConfigError] = useState("");

  const expressionColumnIndexes =
    expressionData?.expressionColumnIndexes ?? [];

  const expressionHeaders =
    expressionData?.headers.filter((_, index) =>
      expressionColumnIndexes.includes(index)
    ) ?? [];

  const handleExecute = () => {
    setConfigError("");

    if (!expressionData) {
      setConfigError(
        "Primero debes cargar un archivo de expresión génica."
      );
      return;
    }

    if (expressionHeaders.length < 2) {
      setConfigError(
        "El archivo debe tener al menos dos columnas de expresión para comparar condiciones."
      );
      return;
    }

    if (
      !expressionHeaders.includes(controlColumn) ||
      !expressionHeaders.includes(treatmentColumn)
    ) {
      setConfigError(
        "Selecciona columnas de expresión válidas para ambas condiciones."
      );
      return;
    }

    if (controlColumn === treatmentColumn) {
      setConfigError(
        "Selecciona columnas diferentes para el control y el tratamiento."
      );
      return;
    }

    const controlIndex = expressionData.headers.indexOf(controlColumn);
    const treatmentIndex = expressionData.headers.indexOf(treatmentColumn);

    const invalidValues = expressionData.rows.some((row) => {
      const controlValue = row[controlIndex]?.trim();
      const treatmentValue = row[treatmentIndex]?.trim();

      return (
        controlValue === undefined ||
        controlValue === "" ||
        treatmentValue === undefined ||
        treatmentValue === "" ||
        !Number.isFinite(Number(controlValue)) ||
        !Number.isFinite(Number(treatmentValue))
      );
    });

    if (invalidValues) {
      setConfigError(
        "Las columnas seleccionadas deben contener únicamente valores numéricos válidos."
      );
      return;
    }

    if (
      !Number.isFinite(significanceThreshold) ||
      significanceThreshold <= 0 ||
      significanceThreshold > 1
    ) {
      setConfigError(
        "El umbral debe ser mayor que 0 y menor o igual que 1."
      );
      return;
    }

    if (
      !Number.isInteger(maxResults) ||
      maxResults < 1 ||
      maxResults > 100
    ) {
      setConfigError(
        "El máximo de resultados debe ser un entero entre 1 y 100."
      );
      return;
    }

    const configuration: AnalysisConfiguration = {
      controlColumn,
      treatmentColumn,
      method,
      annotationSource,
      significanceThreshold,
      maxResults,
    };

    setAnalysisConfiguration(configuration);
    navigate("/resultados");
  };

  return (
    <div className="page-container">
      <div className="page-title">
        <h1>Configurar análisis</h1>
        <p>
          Define los parámetros que se utilizarán para preparar el análisis
          funcional.
        </p>
      </div>

      <div className="analysis-card">
        <div className="form-section">
          <h2>Archivo de datos</h2>

          <div className="selected-file">
            <div>
              <strong>
                {expressionData?.fileName ??
                  "No hay ningún archivo cargado"}
              </strong>

              <span>
                {expressionData
                  ? `${expressionData.rows.length} filas de datos · ${expressionData.headers.length} columnas`
                  : "Carga un archivo CSV o TSV para continuar."}
              </span>
            </div>

            <button
              type="button"
              className="secondary-button"
              onClick={() => navigate("/cargar-datos")}
            >
              Cambiar archivo
            </button>
          </div>
        </div>

        <div className="form-section">
          <h2>Tipo de análisis</h2>

          <label>
            Método
            <select
              value={method}
              onChange={(event) =>
                setMethod(
                  event.target.value as AnalysisConfiguration["method"]
                )
              }
            >
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
          <h2>Condiciones experimentales</h2>

          <p>
            Selecciona las columnas que representan el grupo de control y
            el grupo de tratamiento.
          </p>

          <div className="form-grid">
            <label>
              Grupo de control
              <select
                value={controlColumn}
                onChange={(event) =>
                  setControlColumn(event.target.value)
                }
                disabled={!expressionData}
              >
                {expressionHeaders.map((header) => (
                  <option key={header} value={header}>
                    {header}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Grupo de tratamiento
              <select
                value={treatmentColumn}
                onChange={(event) =>
                  setTreatmentColumn(event.target.value)
                }
                disabled={!expressionData}
              >
                {expressionHeaders.map((header) => (
                  <option key={header} value={header}>
                    {header}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div className="form-section">
          <h2>Base de datos</h2>

          <label>
            Fuente de anotaciones
            <select
              value={annotationSource}
              onChange={(event) =>
                setAnnotationSource(
                  event.target.value as AnalysisConfiguration["annotationSource"]
                )
              }
            >
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
                value={significanceThreshold}
                onChange={(event) =>
                  setSignificanceThreshold(Number(event.target.value))
                }
                step="0.01"
                min="0.001"
                max="1"
              />
            </label>

            <label>
              Número máximo de resultados
              <input
                type="number"
                value={maxResults}
                onChange={(event) =>
                  setMaxResults(Number(event.target.value))
                }
                min="1"
                max="100"
                step="1"
              />
            </label>
          </div>
        </div>

        {configError && (
          <div className="gene-message error" role="alert">
            {configError}
          </div>
        )}

        <div className="analysis-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={() => navigate("/cargar-datos")}
          >
            Atrás
          </button>

          <button
            type="button"
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
