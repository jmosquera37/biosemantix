import { useMemo, useState } from "react";

import GeneSearch from "../components/GeneSearch";
import GeneTable from "../components/GeneTable";

import { mockGenes } from "../data/mockGenes";

import type { Gene } from "../types/gene";

function Results() {
  const [search, setSearch] = useState("");
  const [selectedGene, setSelectedGene] = useState<Gene | null>(null);

  const filteredGenes = useMemo(() => {
    const normalizedSearch = search.toLowerCase().trim();

    if (!normalizedSearch) {
      return mockGenes;
    }

    return mockGenes.filter((gene) => {
      return (
        gene.symbol.toLowerCase().includes(normalizedSearch) ||
        gene.name.toLowerCase().includes(normalizedSearch) ||
        gene.ensemblId.toLowerCase().includes(normalizedSearch) ||
        gene.uniprotId.toLowerCase().includes(normalizedSearch)
      );
    });
  }, [search]);

  return (
    <div className="page-container">
      <div className="page-title">
        <h1>Diccionario de genes</h1>

        <p>
          Consulta y explora la información funcional de los genes
          identificados en el análisis.
        </p>
      </div>

      <div className="results-summary">
        <div>
          <strong>{filteredGenes.length}</strong>
          <span>Genes encontrados</span>
        </div>

        <div>
          <strong>Ensembl</strong>
          <span>Fuente de anotación</span>
        </div>

        <div>
          <strong>UniProt</strong>
          <span>Información proteica</span>
        </div>
      </div>

      <GeneSearch
        search={search}
        onSearchChange={setSearch}
      />

      <GeneTable
        genes={filteredGenes}
        onSelectGene={setSelectedGene}
      />

      {selectedGene && (
        <div className="gene-detail-panel">
          <div className="gene-detail-header">
            <div>
              <span className="detail-label">Gen seleccionado</span>

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
    </div>
  );
}

export default Results;