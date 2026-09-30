import { BrowserRouter, Routes, Route } from "react-router-dom";

import Layout from "./components/Layout";

import Dashboard from "./pages/Dashboard";
import UploadData from "./pages/UploadData";
import Results from "./pages/Results";
import Databases from "./pages/Databases";
import Settings from "./pages/Settings";
import AnalysisConfig from "./pages/AnalysisConfig";

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/cargar-datos" element={<UploadData />} />
          <Route path="/resultados" element={<Results />} />
          <Route path="/bases-de-datos" element={<Databases />} />
          <Route path="/configuracion" element={<Settings />} />
          <Route path="/configurar-analisis" element={<AnalysisConfig />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;