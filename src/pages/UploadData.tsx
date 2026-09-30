import { Upload, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";

function UploadData() {
  const navigate = useNavigate();
  return (
    <div className="page-container">
      <div className="page-title">
        <h1>Cargar datos</h1>
        <p>Carga los datos de expresión génica para iniciar un análisis.</p>
      </div>

      <div className="upload-card">
        <Upload size={48} />

        <h2>Arrastra tu archivo aquí</h2>

        <p>
          También puedes seleccionar un archivo CSV o TSV desde tu dispositivo.
        </p>

        <button
          className="primary-button"
          onClick={() => navigate("/configurar-analisis")}
        >
          <FileText size={18} />
          Seleccionar archivo
        </button>

        <span className="file-info">
          Formatos permitidos: .csv, .tsv
        </span>
      </div>
    </div>
  );
}

export default UploadData;