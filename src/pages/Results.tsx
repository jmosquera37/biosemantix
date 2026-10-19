import { useState } from "react";

import GeneSearch from "../components/GeneSearch";
import GeneTable from "../components/GeneTable";
import { mockGenes } from "../data/mockGenes";

import { useExpressionData } from "../context/ExpressionDataContext";
import { getGeneDetails } from "../services/biosemantix";
import type { GeneDetails } from "../services/biosemantix";
import type { Gene } from "../types/gene";

type GeneTab =
  | "resumen"
  | "funcion"
  | "procesos"
  | "molecular"
  | "proteina";

const geneTabs: { id: GeneTab; label: string }[] = [
  { id: "resumen", label: "Resumen" },
  { id: "funcion", label: "Función" },
  { id: "procesos", label: "Procesos GO" },
  { id: "molecular", label: "Funciones moleculares" },
  { id: "proteina", label: "Proteína" },
];

function Results() {
  const [search, setSearch] = useState("");
  const [selectedGene, setSelectedGene] = useState<Gene | null>(null);
  const [geneDetails, setGeneDetails] = useState<GeneDetails | null>(null);
  const [activeTab, setActiveTab] = useState<GeneTab>("resumen");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [geneFilter, setGeneFilter] = useState("");
  const [expressionDirection, setExpressionDirection] = useState("all");
  const [sortBy, setSortBy] = useState("log2FoldChange");

  const normalizedSearch = search.trim().toLowerCase();

  const filteredGenes = mockGenes.filter((gene) => {
    return (
      gene.symbol.toLowerCase().includes(normalizedSearch) ||
      gene.name.toLowerCase().includes(normalizedSearch) ||
      gene.ensemblId.toLowerCase().includes(normalizedSearch) ||
      gene.uniprotId.toLowerCase().includes(normalizedSearch)
    );
  })
  const {
  expressionData,
  analysisConfiguration,
} = useExpressionData();

const expressionResults =
  expressionData && analysisConfiguration
    ? (() => {
        const geneIndex = expressionData.geneColumnIndex;

        const controlIndex = expressionData.headers.indexOf(
          analysisConfiguration.controlColumn
        );

        const treatmentIndex = expressionData.headers.indexOf(
          analysisConfiguration.treatmentColumn
        );

        return expressionData.rows
          .map((row) => {
            const symbol = row[geneIndex]?.trim().toUpperCase();
            const control = Number(row[controlIndex]);
            const treatment = Number(row[treatmentIndex]);

            if (
              !symbol ||
              !Number.isFinite(control) ||
              !Number.isFinite(treatment)
            ) {
              return null;
            }

            const difference = treatment - control;

            const foldChange =
              control > 0 && treatment > 0
                ? treatment / control
                : null;

            const log2FoldChange =
              foldChange !== null
                ? Math.log2(foldChange)
                : null;

            return {
              symbol,
              control,
              treatment,
              difference,
              foldChange,
              log2FoldChange,
            };
          })
          .filter(
            (result): result is NonNullable<typeof result> =>
              result !== null
          );
      })()
    : [];
const displayedExpressionResults = [...expressionResults]
  .filter((result) => {
    const matchesSearch = result.symbol
      .toLowerCase()
      .includes(geneFilter.trim().toLowerCase());

    const matchesDirection =
      expressionDirection === "all" ||
      (expressionDirection === "increase" && result.difference > 0) ||
      (expressionDirection === "decrease" && result.difference < 0) ||
      (expressionDirection === "unchanged" && result.difference === 0);

    return matchesSearch && matchesDirection;
  })
  .sort((a, b) => {
    if (sortBy === "symbol") {
      return a.symbol.localeCompare(b.symbol);
    }

    const valueA =
      sortBy === "difference"
        ? a.difference
        : a.log2FoldChange;

    const valueB =
      sortBy === "difference"
        ? b.difference
        : b.log2FoldChange;

    if (valueA === null) return valueB === null ? 0 : 1;
    if (valueB === null) return -1;

    return valueB - valueA;
  });

  function handleSearchChange(value: string) {
    setSearch(value);
    setError("");
    setGeneDetails(null);
    setSelectedGene(null);
    setActiveTab("resumen");
  }

  async function searchRealGene(symbolToSearch = search) {
    const symbol = symbolToSearch.trim();

    if (!symbol) {
      setError("Escribe el símbolo de un gen, por ejemplo BRCA1.");
      setGeneDetails(null);
      return;
    }

    setSearch(symbol);

    setLoading(true);
    setError("");
    setGeneDetails(null);
    setSelectedGene(null);
    setActiveTab("resumen");

    try {
      const result = await getGeneDetails(symbol);
      setGeneDetails(result);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No fue posible consultar el gen. Inténtalo de nuevo."
      );
    } finally {
      setLoading(false);
    }
  }

  function renderGeneTab(details: GeneDetails) {
    switch (activeTab) {
      case "resumen":
        return (
          <div className="gene-tab-panel">
            <section className="gene-section">
              <h3>Descripción del gen</h3>
              <p>
                {details.gene.description ||
                  "No hay una descripción disponible."}
              </p>
            </section>

            <section className="gene-section">
              <h3>Identificadores</h3>
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
            </section>

            <section className="gene-section">
              <h3>Localización celular</h3>
              {details.annotations.subcellular_location.length > 0 ? (
                <ul>
                  {details.annotations.subcellular_location.map((location) => (
                    <li key={location}>{location}</li>
                  ))}
                </ul>
              ) : (
                <div className="gene-empty-section">
                  No hay localizaciones celulares disponibles.
                </div>
              )}
            </section>

            <section className="gene-section">
              <h3>Vías relacionadas</h3>
              {details.annotations.pathways.length > 0 ? (
                <ul>
                  {details.annotations.pathways.map((pathway, index) => (
                    <li key={`${index}-${pathway}`}>{pathway}</li>
                  ))}
                </ul>
              ) : (
                <div className="gene-empty-section">
                  No hay vías relacionadas disponibles.
                </div>
              )}
            </section>
          </div>
        );

      case "funcion":
        return (
          <div className="gene-tab-panel">
            <section className="gene-section">
              <h3>Función molecular y biológica descrita</h3>
              {details.annotations.function.length > 0 ? (
                details.annotations.function.map((description, index) => (
                  <p key={`${index}-${description}`}>{description}</p>
                ))
              ) : (
                <div className="gene-empty-section">
                  No hay una descripción funcional disponible.
                </div>
              )}
            </section>
          </div>
        );

      case "procesos":
        return (
          <div className="gene-tab-panel">
            <section className="gene-section">
              <h3>
                Procesos biológicos
                <span className="gene-meta-chip">
                  {details.annotations.biological_processes.length} anotaciones
                </span>
              </h3>
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
                <div className="gene-empty-section">
                  No hay procesos biológicos disponibles.
                </div>
              )}
            </section>
          </div>
        );

      case "molecular":
        return (
          <div className="gene-tab-panel">
            <section className="gene-section">
              <h3>
                Funciones moleculares
                <span className="gene-meta-chip">
                  {details.annotations.molecular_functions.length} anotaciones
                </span>
              </h3>
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
                <div className="gene-empty-section">
                  No hay funciones moleculares disponibles.
                </div>
              )}
            </section>
          </div>
        );

      case "proteina":
        return (
          <div className="gene-tab-panel">
            <section className="gene-section">
              <h3>Información de la proteína</h3>
              <div className="gene-identifiers">
                <div>
                  <span>Nombre recomendado</span>
                  <strong>
                    {details.protein.recommended_name || "No disponible"}
                  </strong>
                </div>
                <div>
                  <span>Identificador UniProt</span>
                  <strong>
                    {details.protein.uniprot_id || "No disponible"}
                  </strong>
                </div>
              </div>
            </section>

            <section className="gene-section">
              <h3>Nombres alternativos</h3>
              {details.protein.alternative_names.length > 0 ? (
                <ul>
                  {details.protein.alternative_names.map((name) => (
                    <li key={name}>{name}</li>
                  ))}
                </ul>
              ) : (
                <div className="gene-empty-section">
                  No hay nombres alternativos disponibles.
                </div>
              )}
            </section>
          </div>
        );
    }
  }

  return (
    <div className="page-container">
      <div className="page-title">
        <h1>Diccionario de genes</h1>
        <p>
          Consulta información funcional y anotaciones biológicas de genes
          procedentes de fuentes públicas.
        </p>
      </div>

      <div className="results-summary">
        <div>
          <strong>Ensembl</strong>
          <span>Información del gen</span>
        </div>
        <div>
          <strong>UniProt</strong>
          <span>Información proteica</span>
        </div>
        <div>
          <strong>Gene Ontology</strong>
          <span>Anotaciones funcionales</span>
        </div>
      </div>

      <section className="gene-lookup">
        <GeneSearch
          search={search}
          onSearchChange={handleSearchChange}
        />

        <div className="gene-lookup-actions">
          <button
            className="secondary-button"
            onClick={() => searchRealGene()}
            disabled={loading}
          >
            {loading ? "Consultando fuentes..." : "Consultar gen real"}
          </button>

          {geneDetails && (
            <span className="gene-meta-chip">
              Información real consultada
            </span>
          )}
        </div>

        <p className="gene-lookup-hint">
          Introduce un símbolo génico, por ejemplo BRCA1, TP53 o EGFR.
        </p>

        {loading && (
          <div className="gene-message" role="status" aria-live="polite">
            Consultando Ensembl y UniProt. El tiempo de respuesta depende de
            los servicios externos.
          </div>
        )}

        {error && (
          <div className="gene-message error" role="alert">
            {error}
          </div>
        )}
      </section>

      {geneDetails && (
        <section className="gene-detail-panel">
          <div className="gene-detail-header">
            <div>
              <span className="detail-label">Ficha del gen</span>
              <h2>{geneDetails.gene.symbol}</h2>
              <p>
                {geneDetails.protein.recommended_name ||
                  geneDetails.gene.description ||
                  "Sin descripción disponible"}
              </p>

              <div className="gene-detail-meta">
                <span className="gene-meta-chip">
                  Especie: {geneDetails.gene.species || "No disponible"}
                </span>
                <span className="gene-meta-chip">
                  Ensamblaje: {geneDetails.gene.assembly || "No disponible"}
                </span>
              </div>
            </div>

            <button
              className="secondary-button"
              onClick={() => setGeneDetails(null)}
            >
              Cerrar ficha
            </button>
          </div>

          <div className="gene-tabs" role="tablist" aria-label="Información del gen">
            {geneTabs.map((tab) => (
              <button
                key={tab.id}
                id={`gene-tab-${tab.id}`}
                className={`gene-tab ${activeTab === tab.id ? "active" : ""}`}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                aria-controls="gene-tab-content"
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div
            id="gene-tab-content"
            role="tabpanel"
            aria-labelledby={`gene-tab-${activeTab}`}
          >
            {renderGeneTab(geneDetails)}
          </div>
        </section>
      )}
      <section className="demo-section">
        <div className="page-title">
          <h2>Resultados de expresión génica</h2>
          <p>
            Comparación descriptiva de los valores de control y tratamiento
            del archivo cargado.
          </p>
        </div>

        {!expressionData || !analysisConfiguration ? (
          <div className="gene-message">
            No hay un análisis configurado. Carga un archivo y configura
            las condiciones experimentales para consultar los resultados.
          </div>
        ) : (
          <>
            <div className="results-summary">
              <div>
                <strong>{expressionData.fileName}</strong>
                <span>Archivo analizado</span>
              </div>
              <div>
                <strong>{expressionResults.length}</strong>
                <span>Genes con valores válidos</span>
              </div>
              <div>
                <strong>
                  {analysisConfiguration.controlColumn} →{" "}
                  {analysisConfiguration.treatmentColumn}
                </strong>
                <span>Comparación seleccionada</span>
              </div>
            </div>

            <div className="gene-message">
              Estos resultados son descriptivos. Una diferencia de expresión
              no demuestra significancia estadística. El enriquecimiento
              funcional tampoco se ha ejecutado todavía.
            </div>
            <div className="results-filters">
          <label>
            Buscar gen
            <input
              type="text"
              value={geneFilter}
              onChange={(event) => setGeneFilter(event.target.value)}
              placeholder="Ej. BRCA1"
            />
          </label>

          <label>
            Dirección del cambio
            <select
              value={expressionDirection}
              onChange={(event) => setExpressionDirection(event.target.value)}
            >
              <option value="all">Todos los genes</option>
              <option value="increase">Aumentan en tratamiento</option>
              <option value="decrease">Disminuyen en tratamiento</option>
              <option value="unchanged">Sin cambio</option>
            </select>
          </label>

          <label>
            Ordenar por
            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value)}
            >
              <option value="log2FoldChange">Log2 fold change</option>
              <option value="difference">Diferencia de expresión</option>
              <option value="symbol">Símbolo del gen</option>
            </select>
          </label>
        </div>

        <p className="gene-lookup-hint">
          Mostrando {displayedExpressionResults.length} de {expressionResults.length} genes.
        </p>

            {displayedExpressionResults.length === 0 ? (
              <div className="gene-empty-section">
                No se encontraron filas con valores válidos para comparar.
              </div>
            ) : (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Gen</th>
                      <th>Control</th>
                      <th>Tratamiento</th>
                      <th>Diferencia</th>
                      <th>Fold change</th>
                      <th>Log2 fold change</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedExpressionResults.map((result, index) => (
                      <tr key={`${result.symbol}-${index}`}>
                        <td>
                          <button
                            type="button"
                            className="gene-result-link"
                            onClick={() => void searchRealGene(result.symbol)}
                            disabled={loading}
                            title={`Consultar información funcional de ${result.symbol}`}
                          >
                            {result.symbol}
                          </button>
                        </td>
                        <td>{result.control.toFixed(3)}</td>
                        <td>{result.treatment.toFixed(3)}</td>
                        <td>
                          {result.difference >= 0 ? "+" : ""}
                          {result.difference.toFixed(3)}
                        </td>
                        <td>
                          {result.foldChange === null
                            ? "No calculable"
                            : result.foldChange.toFixed(3)}
                        </td>
                        <td>
                          {result.log2FoldChange === null
                            ? "No calculable"
                            : result.log2FoldChange.toFixed(3)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </section>
      <section className="demo-section">
        <div className="page-title">
          <h2>Genes de demostración</h2>
          <p>
            Estos registros son ejemplos locales y no representan resultados
            reales de un análisis de expresión génica.
          </p>
        </div>

        <GeneTable
          genes={filteredGenes}
          onSelectGene={setSelectedGene}
        />

        {selectedGene && (
          <div className="gene-detail-panel">
            <div className="gene-detail-header">
              <div>
                <span className="detail-label">Registro de demostración</span>
                <h2>{selectedGene.symbol}</h2>
                <p>{selectedGene.name}</p>
              </div>

              <button
                className="secondary-button"
                onClick={() => setSelectedGene(null)}
              >
                Cerrar
              </button>
            </div>

            <div className="gene-description">
              <h3>Descripción</h3>
              <p>{selectedGene.description}</p>
            </div>

            <div className="gene-identifiers">
              <div>
                <span>Ensembl</span>
                <strong>{selectedGene.ensemblId}</strong>
              </div>
              <div>
                <span>UniProt</span>
                <strong>{selectedGene.uniprotId}</strong>
              </div>
            </div>

            <div className="gene-section">
              <h3>Función</h3>
              <p>{selectedGene.function}</p>
            </div>

            <div className="gene-columns">
              <div className="gene-section">
                <h3>Procesos biológicos</h3>
                <ul>
                  {selectedGene.biologicalProcesses.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>

              <div className="gene-section">
                <h3>Funciones moleculares</h3>
                <ul>
                  {selectedGene.molecularFunctions.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>

              <div className="gene-section">
                <h3>Componentes celulares</h3>
                <ul>
                  {selectedGene.cellularComponents.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>

              <div className="gene-section">
                <h3>Vías relacionadas</h3>
                <ul>
                  {selectedGene.pathways.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

export default Results;