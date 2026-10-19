
import { useRef, useState } from "react";
import {
  Upload,
  FileText,
  X,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { useExpressionData } from "../context/ExpressionDataContext";

function UploadData() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { geneListData, setGeneListData } = useExpressionData();

  const [fileName, setFileName] = useState("");
  const [genes, setGenes] = useState<string[]>([]);
  const [duplicates, setDuplicates] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function handleFile(file?: File) {
    setError("");
    setSuccess("");
    setFileName("");
    setGenes([]);
    setDuplicates([]);

    if (!file) return;

    const extension = file.name.split(".").pop()?.toLowerCase();

    if (!["txt", "csv", "tsv"].includes(extension ?? "")) {
      setError("Formato no válido. Selecciona un archivo TXT, CSV o TSV.");
      return;
    }

    if (file.size === 0) {
      setError("El archivo está vacío.");
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      const content = String(reader.result ?? "").replace(/^\uFEFF/, "");

      let identifiers: string[] = [];

      if (extension === "txt") {
        identifiers = content
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter(Boolean);
      } else {
        const separator = extension === "tsv" ? "\t" : ",";

        function parseLine(line: string): string[] {
          const values: string[] = [];
          let value = "";
          let insideQuotes = false;

          for (let i = 0; i < line.length; i++) {
            const char = line[i];

            if (char === '"') {
              if (insideQuotes && line[i + 1] === '"') {
                value += '"';
                i++;
              } else {
                insideQuotes = !insideQuotes;
              }
            } else if (char === separator && !insideQuotes) {
              values.push(value.trim());
              value = "";
            } else {
              value += char;
            }
          }

          values.push(value.trim());
          return values;
        }

        const rows = content
          .split(/\r?\n/)
          .filter((line) => line.trim())
          .map(parseLine);

        if (rows.length === 0) {
          setError("El archivo no contiene identificadores.");
          return;
        }

        const normalizeHeader = (header: string) =>
          header.trim().toLowerCase().replace(/[\s-]+/g, "_");

        const geneHeaders = [
          "gene",
          "genes",
          "symbol",
          "gene_symbol",
          "gene_id",
          "gene_name",
          "ensembl",
          "uniprot",
          "accession",
          "identifier",
          "identificador",
        ];

        const headerIndex = rows[0].findIndex((header) =>
          geneHeaders.includes(normalizeHeader(header))
        );

        if (headerIndex >= 0) {
          identifiers = rows
            .slice(1)
            .map((row) => row[headerIndex]?.trim() ?? "")
            .filter(Boolean);
        } else {
          identifiers = rows
            .map((row) => row[0]?.trim() ?? "")
            .filter(Boolean);
        }
      }

      if (identifiers.length === 0) {
        setError("No se encontraron identificadores de genes en el archivo.");
        return;
      }

      const uniqueGenes: string[] = [];
      const seen = new Set<string>();
      const repeated: string[] = [];

      for (const identifier of identifiers) {
        const key = identifier.toUpperCase();

        if (seen.has(key)) {
          if (!repeated.some((item) => item.toUpperCase() === key)) {
            repeated.push(identifier);
          }
        } else {
          seen.add(key);
          uniqueGenes.push(identifier);
        }
      }

      setFileName(file.name);
      setGenes(uniqueGenes);
      setDuplicates(repeated);

      setGeneListData({
        fileName: file.name,
        genes: uniqueGenes,
      });

      setSuccess(
        repeated.length > 0
          ? `Se cargaron ${uniqueGenes.length} identificadores únicos. Se omitieron ${repeated.length} identificadores repetidos.`
          : `Se cargaron ${uniqueGenes.length} identificadores correctamente.`
      );
    };

    reader.onerror = () => {
      setError("No se pudo leer el archivo.");
    };

    reader.readAsText(file);
  }

  function clearFile() {
    setGeneListData(null);
    setFileName("");
    setGenes([]);
    setDuplicates([]);
    setError("");
    setSuccess("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  return (
    <div className="page-container">
      <div className="page-title">
        <h1>Cargar lista de genes</h1>
        <p>
          Carga una lista de identificadores para consultar su función
          biológica y sus anotaciones en bases de datos especializadas.
          Los archivos se leen localmente en el navegador.
        </p>
      </div>

      <div
        className="upload-card"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          handleFile(event.dataTransfer.files[0]);
        }}
      >
        <Upload size={48} />

        <h2>Arrastra tu archivo aquí</h2>

        <p>
          También puedes seleccionar una lista de genes desde tu dispositivo.
        </p>

        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.csv,.tsv,text/plain,text/csv,text/tab-separated-values"
          hidden
          onChange={(event) => handleFile(event.target.files?.[0])}
        />

        <button
          type="button"
          className="primary-button"
          onClick={() => fileInputRef.current?.click()}
        >
          <FileText size={18} />
          Seleccionar archivo
        </button>

        <span className="file-info">
          Formatos permitidos: .txt, .csv y .tsv
        </span>
      </div>

      {error && (
        <div className="gene-message error" role="alert">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {success && (
        <div className="gene-message" role="status">
          <CheckCircle size={18} />
          <div>
            <strong>Lista cargada</strong>
            <p>{success}</p>
            <p>
              La lista está preparada. La consulta de las bases de datos
              todavía no se ha ejecutado.
            </p>
          </div>
        </div>
      )}

      {duplicates.length > 0 && (
        <section className="card">
          <h3>Identificadores repetidos</h3>
          <p>
            Estos identificadores aparecían más de una vez y se conservaron
            solo una vez:
          </p>
          <p>{duplicates.join(", ")}</p>
        </section>
      )}

      {fileName && (
        <section className="card upload-preview">
          <div className="upload-preview-header">
            <div>
              <h2>Vista previa de la lista</h2>
              <p>{fileName}</p>
              <p>{genes.length} identificadores únicos</p>
            </div>

            <button
              type="button"
              className="secondary-button"
              onClick={clearFile}
            >
              <X size={16} />
              Quitar archivo
            </button>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Identificador</th>
                </tr>
              </thead>
              <tbody>
                {genes.slice(0, 10).map((gene, index) => (
                  <tr key={`${gene}-${index}`}>
                    <td>{index + 1}</td>
                    <td>{gene}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="file-info">
            {genes.length > 10
              ? `Se muestran los primeros 10 de ${genes.length} identificadores.`
              : `Se muestran los ${genes.length} identificadores de la lista.`}
            {" "}El archivo se lee en el navegador.
          </p>
        </section>
      )}

      {!fileName && geneListData && (
        <div className="gene-message">
          Hay una lista previamente cargada: {geneListData.fileName}.
        </div>
      )}
    </div>
  );
}

export default UploadData;
