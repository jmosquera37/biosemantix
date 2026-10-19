import { useState } from "react";
import {
  FileText,
  Search,
  AlertCircle,
  CheckCircle,
  Download,
  Info,
  RefreshCw,
  X,
} from "lucide-react";
import { useExpressionData } from "../context/ExpressionDataContext";
import { getGeneDetails } from "../services/biosemantix";
import type {
  GeneDetails,
  SourceInfo,
  SourceStatus,
} from "../services/biosemantix";
import {
  buildReportCsv,
  queryStatusLabel,
  queryStatusTone,
  reportCategory,
  reportEntryMatchesQuery,
  sourceStatusLabel,
} from "../utils/report";
import type { ReportStatusFilter, StatusTone } from "../utils/report";

interface GeneResult {
  identifier: string;
  details?: GeneDetails;
  error?: string;
}

const SOURCE_TONES: Record<SourceStatus, StatusTone> = {
  ok: "success",
  not_found: "neutral",
  unavailable: "warning",
  error: "error",
  malformed: "error",
  skipped: "neutral",
};

function toneToMessageClass(tone: StatusTone): string {
  switch (tone) {
    case "error":
      return "gene-message error";
    case "warning":
      return "gene-message partial";
    case "info":
      return "gene-message info";
    default:
      return "gene-message";
  }
}

function SourceChip({ name, info }: { name: string; info: SourceInfo }) {
  return (
    <span
      className={`source-status ${SOURCE_TONES[info.status] ?? "neutral"}`}
      title={info.message ?? undefined}
    >
      {name}: {sourceStatusLabel(info.status)}
    </span>
  );
}

function FunctionalReport() {
  const { geneListData } = useExpressionData();

  const [results, setResults] = useState<GeneResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [hasSearched, setHasSearched] = useState(false);
  const [retrying, setRetrying] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ReportStatusFilter>("all");

  async function queryIdentifier(identifier: string): Promise<GeneResult> {
    try {
      const details = await getGeneDetails(identifier);
      return { identifier, details };
    } catch (error) {
      return {
        identifier,
        error:
          error instanceof Error
            ? error.message
            : "No fue posible consultar este identificador.",
      };
    }
  }

  async function generateReport() {
    if (!geneListData || geneListData.genes.length === 0) return;

    setLoading(true);
    setProgress(0);
    setHasSearched(true);
    setResults([]);
    setSearch("");
    setStatusFilter("all");

    const newResults: GeneResult[] = [];

    for (let i = 0; i < geneListData.genes.length; i++) {
      const identifier = geneListData.genes[i];
      const result = await queryIdentifier(identifier);

      newResults.push(result);
      setResults([...newResults]);
      setProgress(i + 1);
    }

    setLoading(false);
  }

  async function retryResult(index: number) {
    const identifier = results[index]?.identifier;
    if (!identifier) return;

    setRetrying(index);

    const result = await queryIdentifier(identifier);

    setResults((previous) =>
      previous.map((item, i) => (i === index ? result : item))
    );

    setRetrying(null);
  }

  function exportCSV() {
    const csvContent = buildReportCsv(results);
    const blob = new Blob(["\uFEFF", csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "biosemantix_reporte_funcional.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
  }

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

  const completed = results.filter(
    (result) => reportCategory(result) === "completed"
  );
  const partial = results.filter(
    (result) => reportCategory(result) === "partial"
  );
  const notFound = results.filter(
    (result) => reportCategory(result) === "not_found"
  );
  const failed = results.filter(
    (result) => reportCategory(result) === "failed"
  );

  // Subconjunto visible según la búsqueda y el filtro, conservando el índice
  // original para poder reintentar una consulta concreta.
  const visibleResults = results
    .map((result, index) => ({ result, index }))
    .filter(({ result }) => {
      const matchesStatus =
        statusFilter === "all" || reportCategory(result) === statusFilter;

      return matchesStatus && reportEntryMatchesQuery(result, search);
    });

  const isFiltering = search.trim() !== "" || statusFilter !== "all";

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

        <p className="gene-lookup-hint">
          Fuentes consultadas: Ensembl (información del gen), UniProt
          (proteína y anotaciones funcionales) y Gene Ontology (términos GO,
          a través de UniProt). Las anotaciones se muestran en el idioma
          original de la fuente.
        </p>

        {loading && (
          <div className="gene-message" role="status">
            Consultando identificador {progress} de {geneListData.genes.length}.
            No cierres esta página hasta que termine el proceso.
          </div>
        )}
      </section>

      {hasSearched && !loading && (
        <div className="results-summary states">
          <div>
            <strong>{completed.length}</strong>
            <span>Consultas completas</span>
          </div>
          <div>
            <strong>{partial.length}</strong>
            <span>Consultas parciales</span>
          </div>
          <div>
            <strong>{notFound.length}</strong>
            <span>Sin resultados</span>
          </div>
          <div>
            <strong>{failed.length}</strong>
            <span>Errores</span>
          </div>
        </div>
      )}

      {hasSearched && !loading && results.length > 0 && (
        <section
          className="card"
          style={{ padding: "20px 24px", marginTop: "20px" }}
        >
          <div className="report-filter-bar">
            <div className="report-search">
              <Search size={18} />
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por símbolo, identificador, Ensembl o UniProt"
                aria-label="Buscar en los resultados del reporte"
              />
              {search !== "" && (
                <button
                  type="button"
                  className="clear-search"
                  onClick={() => setSearch("")}
                  aria-label="Limpiar búsqueda"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            <label className="report-filter-field">
              <span>Estado</span>
              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value as ReportStatusFilter)
                }
              >
                <option value="all">Todos</option>
                <option value="completed">Consultas completas</option>
                <option value="partial">Consultas parciales</option>
                <option value="not_found">Sin resultados</option>
                <option value="failed">Con error</option>
              </select>
            </label>
          </div>

          <p className="report-filter-count">
            Mostrando {visibleResults.length} de {results.length} identificadores
            procesados.
          </p>
        </section>
      )}

      {visibleResults.map(({ result, index }) => {
        const details = result.details;

        if (result.error || !details) {
          return (
            <section
              className="card"
              key={`${result.identifier}-${index}`}
              style={{ padding: "24px", marginTop: "20px" }}
            >
              <div className="gene-message error" role="alert">
                <AlertCircle size={18} />
                <div>
                  <strong>{result.identifier}</strong>
                  <p>{result.error}</p>
                </div>
              </div>
              <button
                type="button"
                className="secondary-button"
                style={{ marginTop: "12px" }}
                onClick={() => void retryResult(index)}
                disabled={retrying === index}
              >
                <RefreshCw size={16} />
                {retrying === index ? "Reintentando..." : "Reintentar"}
              </button>
            </section>
          );
        }

        const tone = queryStatusTone(details.status);
        const hasGeneData =
          details.status === "ok" || details.status === "partial";

        return (
          <section
            className="card"
            key={`${result.identifier}-${index}`}
            style={{ padding: "24px", marginTop: "20px" }}
          >
            <div className="gene-detail-header">
              <div>
                <span className="detail-label">
                  Identificador consultado: {details.identifier}
                </span>
                <h2>
                  {details.gene.symbol ||
                    details.protein.uniprot_accession ||
                    details.identifier}
                </h2>
                <p>
                  {details.gene.description ||
                    details.protein.recommended_name ||
                    details.message ||
                    "Sin descripción disponible."}
                </p>
              </div>
              {details.status === "ok" && (
                <CheckCircle size={22} color="#0f766e" />
              )}
              {details.status === "partial" && (
                <AlertCircle size={22} color="#b45309" />
              )}
            </div>

            <div className="source-status-list">
              <SourceChip name="Ensembl" info={details.sources.ensembl} />
              <SourceChip name="UniProt" info={details.sources.uniprot} />
              <span className="gene-meta-chip">
                {queryStatusLabel(details.status)}
              </span>
            </div>

            {details.status === "not_found" && (
              <div className={toneToMessageClass(tone)} role="status">
                <Info size={18} />
                <div>
                  <strong>No se encontró en las fuentes consultadas</strong>
                  <p>
                    {details.message} Esto no demuestra que el gen no exista
                    biológicamente: puede usar otro símbolo o no estar
                    registrado en las fuentes consultadas.
                  </p>
                </div>
              </div>
            )}

            {details.status === "unavailable" && (
              <>
                <div className={toneToMessageClass(tone)} role="status">
                  <AlertCircle size={18} />
                  <div>
                    <strong>Fuente no disponible</strong>
                    <p>
                      {details.message} No se puede confirmar si el gen existe.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  className="secondary-button"
                  style={{ marginTop: "12px" }}
                  onClick={() => void retryResult(index)}
                  disabled={retrying === index}
                >
                  <RefreshCw size={16} />
                  {retrying === index ? "Reintentando..." : "Reintentar"}
                </button>
              </>
            )}

            {details.status === "invalid_identifier" && (
              <div className={toneToMessageClass(tone)} role="alert">
                <AlertCircle size={18} />
                <div>
                  <strong>Identificador no admitido</strong>
                  <p>{details.message}</p>
                </div>
              </div>
            )}

            {hasGeneData && (
              <>
                {details.status === "partial" && (
                  <div className={toneToMessageClass("warning")} role="status">
                    <AlertCircle size={18} />
                    <div>
                      <strong>Consulta parcial</strong>
                      <p>
                        Se conserva la información disponible. La fuente que
                        falló se indica arriba y puede reintentarse.
                      </p>
                    </div>
                  </div>
                )}

                <div className="gene-identifiers">
                  <div>
                    <span>Ensembl</span>
                    <strong>
                      {details.gene.ensembl_id || "No disponible"}
                    </strong>
                  </div>
                  <div>
                    <span>UniProt</span>
                    <strong>
                      {details.protein.uniprot_accession || "No disponible"}
                    </strong>
                  </div>
                </div>

                <div className="gene-section">
                  <h3>Función biológica descrita</h3>

                  <p className="gene-lookup-hint">
                    Anotación original procedente de UniProt. El texto se
                    conserva en el idioma proporcionado por la fuente para
                    mantener su precisión científica.
                  </p>

                  {details.annotations.function.length > 0 ? (
                    details.annotations.function.map((item, i) => (
                      <p key={`${i}-${item}`}>{item}</p>
                    ))
                  ) : (
                    <p>
                      {details.sources.uniprot.status === "not_found"
                        ? "UniProt no tiene una función descrita para este registro."
                        : "No hay información funcional disponible."}
                    </p>
                  )}
                </div>

                <div className="gene-section">
                  <h3>Procesos biológicos</h3>
                  {details.annotations.biological_processes.length > 0 ? (
                    <ul>
                      {details.annotations.biological_processes.map((item) => (
                        <li key={item.id}>
                          {item.name}
                          <span className="gene-go-id">{item.id}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p>No hay procesos biológicos anotados.</p>
                  )}
                </div>

                <div className="gene-section">
                  <h3>Funciones moleculares</h3>
                  {details.annotations.molecular_functions.length > 0 ? (
                    <ul>
                      {details.annotations.molecular_functions.map((item) => (
                        <li key={item.id}>
                          {item.name}
                          <span className="gene-go-id">{item.id}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p>No hay funciones moleculares anotadas.</p>
                  )}
                </div>

                <div className="gene-section">
                  <h3>Localización celular y vías</h3>
                  <p>
                    <strong>Localización:</strong>{" "}
                    {details.annotations.subcellular_location.join("; ") ||
                      "No disponible"}
                  </p>
                  <p>
                    <strong>Vías:</strong>{" "}
                    {details.annotations.pathways.join("; ") ||
                      "No disponibles"}
                  </p>
                </div>
              </>
            )}
          </section>
        );
      })}

      {hasSearched &&
        !loading &&
        results.length > 0 &&
        visibleResults.length === 0 && (
          <div className="gene-message info" role="status">
            <Info size={18} />
            {isFiltering
              ? "Ningún identificador coincide con la búsqueda o el filtro seleccionado."
              : "No hay identificadores que mostrar."}
          </div>
        )}

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
