import { Navigate, Route, Routes } from "react-router-dom";
import { LoginPage } from "../features/auth/LoginPage";
import { RegisterPage } from "../features/auth/RegisterPage";
import { CategoriesPage } from "../features/finance/CategoriesPage";
import { DashboardPage } from "../features/finance/DashboardPage";
import { DrePage } from "../features/finance/DrePage";
import { FinanceLayout } from "../features/finance/FinanceLayout";
import { TransactionsPage } from "../features/finance/TransactionsPage";
import { PricingPage } from "../features/pricing/PricingPage";
import { ProductsPage } from "../features/products/ProductsPage";
import { SimulationsPage } from "../features/simulations/SimulationsPage";
import { TaxesPage } from "../features/taxes/TaxesPage";
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
          <Route path="/finance" element={<FinanceLayout />}>
            <Route index element={<Navigate to="/finance/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="transactions" element={<TransactionsPage />} />
            <Route path="dre" element={<DrePage />} />
            <Route path="categories" element={<CategoriesPage />} />
          </Route>
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/simulations" element={<SimulationsPage />} />
          <Route path="/taxes" element={<TaxesPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/pricing" replace />} />
    </Routes>
  );
}
