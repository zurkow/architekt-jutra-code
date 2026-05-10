import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { CustomersPage } from "./pages/CustomersPage";
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<CustomersPage />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
