import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ProgramStorefront from "./pages/ProgramStorefront.jsx";
import ProgramDetail     from "./pages/ProgramDetail.jsx";
import PurchaseSuccess   from "./pages/PurchaseSuccess.jsx";
import ProgramAccess     from "./pages/ProgramAccess.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        {/* Public storefront */}
        <Route path="/programs"                   element={<ProgramStorefront />} />
        <Route path="/programs/success"           element={<PurchaseSuccess />} />

        {/* Individual program — public detail + purchase */}
        <Route path="/programs/:slug"             element={<ProgramDetail />} />

        {/* Consumer dashboard — requires auth */}
        <Route path="/programs/:slug/access"      element={<ProgramAccess />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/programs" replace />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
