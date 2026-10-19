
import { Dna, FileText, Database, ShieldCheck, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

function Inicio() {
  const navigate = useNavigate();

  return (
    <div className="page-container">
      <div className="page-title">
        <h1>Bienvenido a BioSemantix</h1>
        <p>
          Explora e interpreta la función biológica de los genes
          mediante información procedente de bases de datos especializadas.
        </p>
      </div>

      <section className="card" style={{ padding: "32px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <Dna size={42} color="#0f766e" />

          <div>
            <h2>Del identificador a la función biológica</h2>
            <p>
              BioSemantix facilita la consulta de información funcional
              de genes, sus procesos biológicos y sus funciones moleculares.
            </p>
          </div>
        </div>

        <button
          type="button"
          className="primary-button"
          style={{ marginTop: "24px" }}
          onClick={() => navigate("/cargar-datos")}
        >
          Cargar lista de genes
          <ArrowRight size={18} />
        </button>
      </section>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "20px",
          marginTop: "24px",
        }}
      >
        <section className="card" style={{ padding: "24px" }}>
          <FileText size={28} color="#0f766e" />
          <h2>Consulta de genes</h2>
          <p>
            Introduce una lista de identificadores para consultar
            la información disponible de cada gen.
          </p>
        </section>

        <section className="card" style={{ padding: "24px" }}>
          <Database size={28} color="#0f766e" />
          <h2>Anotaciones funcionales</h2>
          <p>
            Explora funciones moleculares, procesos biológicos y
            otras anotaciones cuando estén disponibles.
          </p>
        </section>

        <section className="card" style={{ padding: "24px" }}>
          <ShieldCheck size={28} color="#0f766e" />
          <h2>Procesamiento local</h2>
          <p>
            Los archivos se leen en el navegador. Para obtener
            anotaciones externas, se consultan los servicios biológicos
            mediante el backend.
          </p>
        </section>
      </div>
    </div>
  );
}

export default Inicio;
