
import { useState } from "react";
import { FileText, Search, AlertCircle, CheckCircle, Download} from "lucide-react";
import { useExpressionData } from "../context/ExpressionDataContext";
import { getGeneDetails } from "../services/biosemantix";
import type { GeneDetails } from "../services/biosemantix";

interface GeneResult {
  identifier: string;
  details?: GeneDetails;
  error?: string;
}

function FunctionalReport() {
  const { geneListData } = useExpressionData();

  const [results, setResults] = useState<GeneResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [hasSearched, setHasSearched] = useState(false);

  async function generateReport() {
    if (!geneListData || geneListData.genes.length === 0) return;

    setLoading(true);
    setProgress(0);
    setHasSearched(true);
    setResults([]);

    const newResults: GeneResult[] = [];

    for (let i = 0; i < geneListData.genes.length; i++) {
      const identifier = geneListData.genes[i];

      try {
        const details = await getGeneDetails(identifier);
        newResults.push({ identifier, details });
      } catch (error) {
        newResults.push({
          identifier,
          error:
            error instanceof Error
              ? error.message
              : "No fue posible consultar este identificador.",
        });
      }

      setResults([...newResults]);
      setProgress(i + 1);
    }

    setLoading(false);
  }
  
  const exportCSV = () => {
    const headers = [
      "Identificador consultado",
      "Símbolo del gen",
      "ID Ensembl",
      "Accession UniProt",
      "Descripción del gen",
      "Función biológica",
      "Procesos biológicos",
      "Funciones moleculares",
      "Localización celular",
      "Vías biológicas",
      "Estado de consulta",
    ];

    const escapeCSV = (value: unknown): string => {
      const text = String(value ?? "");
      return `"${text.replace(/"/g, '""')}"`;
    };

    const rows = results.map((result) => {
      const details = result.details;
      const annotations = details?.annotations;

      return [
        result.identifier,
        details?.gene.symbol ?? "",
        details?.gene.ensembl_id ?? "",
        details?.protein.uniprot_accession ?? "",
        details?.gene.description ?? "",
        annotations?.function.join("; ") ?? "",
        annotations?.biological_processes
          .map((item) => `${item.id}: ${item.name}`)
          .join("; ") ?? "",
        annotations?.molecular_functions
          .map((item) => `${item.id}: ${item.name}`)
          .join("; ") ?? "",
        annotations?.subcellular_location.join("; ") ?? "",
        annotations?.pathways.join("; ") ?? "",
        details ? "Consultado correctamente" : "No resuelto",
      ];
    });

    const csvContent = [
      headers,
      ...rows,
    ]
      .map((row) => row.map(escapeCSV).join(","))
      .join("\r\n");

    const blob = new Blob(
      ["\uFEFF", csvContent],
      { type: "text/csv;charset=utf-8;" }
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "biosemantix_reporte_funcional.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
  };

  if (!geneListData) {
    return (
      <div className="page-container">
        <div className="page-title">
          <h1>Reporte funcional</h1>
          <p>Consulta la información funcional de una lista de genes.</p>
        </div>

        <div className="gene-message">
          <AlertCircle size={18} />
          Primero debes cargar una lista de genes desde la sección
          «Cargar lista de genes».
        </div>
      </div>
    );
  }

  const successful = results.filter((result) => result.details);
  const failed = results.filter((result) => result.error);

  return (
    <div className="page-container">
      <div className="page-title">
        <h1>Reporte funcional</h1>
        <p>
          Consulta las anotaciones biológicas disponibles para los
          identificadores de tu lista.
        </p>
      </div>

      <section className="card" style={{ padding: "24px" }}>
        <div className="upload-preview-header">
          <div>
            <h2>{geneListData.fileName}</h2>
            <p>{geneListData.genes.length} identificadores cargados</p>
          </div>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button
            type="button"
            className="primary-button"
            onClick={generateReport}
            disabled={loading}
          >
            <Search size={18} />
            {loading ? "Consultando..." : "Generar reporte"}
          </button>

          <button
            type="button"
            className="secondary-button"
            onClick={exportCSV}
            disabled={loading || results.length === 0}
          >
            <Download size={18} />
            Exportar CSV
          </button>
        </div>

        </div>

        {loading && (
          <div className="gene-message" role="status">
            Consultando identificador {progress} de {geneListData.genes.length}.
            No cierres esta página hasta que termine el proceso.
          </div>
        )}
      </section>

      {hasSearched && !loading && (
        <div className="results-summary">
          <div>
            <strong>{successful.length}</strong>
            <span>Consultas exitosas</span>
          </div>
          <div>
            <strong>{failed.length}</strong>
            <span>Identificadores sin resolver</span>
          </div>
          <div>
            <strong>{results.length}</strong>
            <span>Identificadores procesados</span>
          </div>
        </div>
      )}

      {results.map((result, index) => (
        <section
          className="card"
          key={`${result.identifier}-${index}`}
          style={{ padding: "24px", marginTop: "20px" }}
        >
          {result.details ? (
            <>
              <div className="gene-detail-header">
                <div>
                  <span className="detail-label">Gen consultado</span>
                  <h2>{result.details.gene.symbol}</h2>
                  <p>
                    {result.details.gene.description ||
                      "No hay una descripción disponible."}
                  </p>
                </div>
                <CheckCircle size={22} color="#0f766e" />
              </div>

              <div className="gene-identifiers">
                <div>
                  <span>Ensembl</span>
                  <strong>
                    {result.details.gene.ensembl_id || "No disponible"}
                  </strong>
                </div>
                <div>
                  <span>UniProt</span>
                  <strong>
                    {result.details.protein.uniprot_accession ||
                      "No disponible"}
                  </strong>
                </div>
              </div>

              
              <div className="gene-section">
                <h3>Función biológica descrita</h3>

                <p className="gene-lookup-hint">
                  Anotación original procedente de UniProt. El texto se conserva
                  en el idioma proporcionado por la fuente para mantener su
                  precisión científica.
                </p>

                {result.details.annotations.function.length > 0 ? (
                  result.details.annotations.function.map((item, i) => (
                    <p key={`${i}-${item}`}>{item}</p>
                  ))
                ) : (
                  <p>No hay información funcional disponible.</p>
                )}
              </div>


              <div className="gene-section">
                <h3>Procesos biológicos</h3>
                {result.details.annotations.biological_processes.length > 0 ? (
                  <ul>
                    {result.details.annotations.biological_processes.map(
                      (item) => (
                        <li key={item.id}>
                          {item.name}{" "}
                          <span className="gene-go-id">{item.id}</span>
                        </li>
                      )
                    )}
                  </ul>
                ) : (
                  <p>No hay procesos biológicos anotados.</p>
                )}
              </div>

              <div className="gene-section">
                <h3>Funciones moleculares</h3>
                {result.details.annotations.molecular_functions.length > 0 ? (
                  <ul>
                    {result.details.annotations.molecular_functions.map(
                      (item) => (
                        <li key={item.id}>
                          {item.name}{" "}
                          <span className="gene-go-id">{item.id}</span>
                        </li>
                      )
                    )}
                  </ul>
                ) : (
                  <p>No hay funciones moleculares anotadas.</p>
                )}
              </div>

              <div className="gene-section">
                <h3>Localización celular y vías</h3>
                <p>
                  <strong>Localización:</strong>{" "}
                  {result.details.annotations.subcellular_location.join("; ") ||
                    "No disponible"}
                </p>
                <p>
                  <strong>Vías:</strong>{" "}
                  {result.details.annotations.pathways.join("; ") ||
                    "No disponibles"}
                </p>
              </div>
            </>
          ) : (
            <div className="gene-message error" role="alert">
              <AlertCircle size={18} />
              <div>
                <strong>{result.identifier}</strong>
                <p>{result.error}</p>
              </div>
            </div>
          )}
        </section>
      ))}

      {hasSearched && !loading && results.length === 0 && (
        <div className="gene-message">
          <FileText size={18} />
          No se obtuvieron resultados.
        </div>
      )}
    </div>
  );
}

export default FunctionalReport;
