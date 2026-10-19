
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Layout from "./components/Layout";

import UploadData from "./pages/UploadData";
import Databases from "./pages/Databases";
import Settings from "./pages/Settings";
import Inicio from "./pages/Inicio";
import FunctionalReport from "./pages/FunctionalReport";

import { ExpressionDataProvider } from "./context/ExpressionDataContext";
import { BackendStatusProvider } from "./context/BackendStatusContext";

function App() {
  return (
    <BrowserRouter>
      <BackendStatusProvider>
        <ExpressionDataProvider>
          <Layout>
            <Routes>
              <Route path="/" element={<Navigate to="/inicio" replace />} />
              <Route path="/inicio" element={<Inicio />} />
              <Route path="/cargar-datos" element={<UploadData />} />
              <Route path="/resultados" element={<FunctionalReport />} />
              <Route path="/bases-de-datos" element={<Databases />} />
              <Route path="/configuracion" element={<Settings />} />
              

              <Route path="*" element={<Navigate to="/inicio" replace />} />
            </Routes>
          </Layout>
        </ExpressionDataProvider>
      </BackendStatusProvider>
    </BrowserRouter>
  );
}

export default App;
