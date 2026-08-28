import { Navigate, Route, Routes } from 'react-router-dom';

import { AdminLayout } from './components/AdminLayout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { LoginPage } from './pages/LoginPage';
import { ReviewsPage } from './pages/ReviewsPage';
import { LegalModelsPage } from './pages/LegalModelsPage';
import { AuditTicketsPage } from './pages/AuditTicketsPage';
import { SupportTicketsPage } from './pages/SupportTicketsPage';
import { UsersPage } from './pages/UsersPage';
import { PaymentsPage } from './pages/PaymentsPage';
import { CashbackPage } from './pages/CashbackPage';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/painel"
        element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminDashboardPage />} />
        <Route path="usuarios" element={<UsersPage />} />
        <Route path="avaliacoes" element={<ReviewsPage />} />
        <Route path="modelos-juridicos" element={<LegalModelsPage />} />
        <Route path="auditorias" element={<AuditTicketsPage />} />
        <Route path="suporte" element={<SupportTicketsPage />} />
        <Route path="pagamentos" element={<PaymentsPage />} />
        <Route path="cashback" element={<CashbackPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/painel" replace />} />
    </Routes>
  );
}
