import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LogisticsPage } from "./pages/LogisticsPage";
import { ProductDeliveryTab } from "./pages/ProductDeliveryTab";
import { ProductDeliveryInfoBadge } from "./pages/ProductDeliveryInfoBadge";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LogisticsPage />} />
        <Route path="/product-delivery" element={<ProductDeliveryTab />} />
        <Route
          path="/product-delivery-info"
          element={<ProductDeliveryInfoBadge />}
        />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
