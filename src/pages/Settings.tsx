function Settings() {
  return (
    <div className="page-container">
      <div className="page-title">
        <h1>Configuración</h1>
        <p>Configura las opciones generales de BioSemantix.</p>
      </div>

      <div className="settings-card">
        <h2>Procesamiento local</h2>

        <p>
          Los datos serán procesados localmente en el navegador.
        </p>

        <label className="switch-row">
          <span>Procesamiento local</span>
          <input type="checkbox" defaultChecked />
        </label>

        <label className="switch-row">
          <span>Modo offline</span>
          <input type="checkbox" defaultChecked />
        </label>
      </div>
    </div>
  );
}

export default Settings;