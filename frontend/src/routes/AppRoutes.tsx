import { Navigate, Route, Routes } from "react-router-dom";
import { LoginPage } from "../features/auth/LoginPage";
import { RegisterPage } from "../features/auth/RegisterPage";
import { PricingPage } from "../features/pricing/PricingPage";
import { ProductsPage } from "../features/products/ProductsPage";
import { SimulationsPage } from "../features/simulations/SimulationsPage";
import { SettingsPage } from "../features/settings/SettingsPage";
import { ProtectedRoute } from "./ProtectedRoute";
import { AppShell } from "../components/AppShell";

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/simulations" element={<SimulationsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/pricing" replace />} />
    </Routes>
  );
}
