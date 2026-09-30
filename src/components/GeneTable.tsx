import { Eye } from "lucide-react";
import type { Gene } from "../types/gene";

interface GeneTableProps {
  genes: Gene[];
  onSelectGene: (gene: Gene) => void;
}

function GeneTable({ genes, onSelectGene }: GeneTableProps) {
  return (
    <div className="gene-table-container">
      <table className="gene-table">
        <thead>
          <tr>
            <th>Gen</th>
            <th>Nombre</th>
            <th>Ensembl</th>
            <th>UniProt</th>
            <th>Expresión</th>
            <th>p-value</th>
            <th></th>
          </tr>
        </thead>

        <tbody>
          {genes.map((gene) => (
            <tr key={gene.id}>
              <td>
                <strong className="gene-symbol">{gene.symbol}</strong>
              </td>

              <td>{gene.name}</td>

              <td>
                <span className="gene-id">{gene.ensemblId}</span>
              </td>

              <td>
                <span className="gene-id">{gene.uniprotId}</span>
              </td>

              <td>{gene.expressionLevel.toFixed(2)}</td>

              <td>{gene.pValue}</td>

              <td>
                <button
                  className="icon-button"
                  onClick={() => onSelectGene(gene)}
                  title="Ver información del gen"
                >
                  <Eye size={18} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {genes.length === 0 && (
        <div className="table-empty">
          No se encontraron genes con los criterios de búsqueda.
        </div>
      )}
    </div>
  );
}

export default GeneTable;