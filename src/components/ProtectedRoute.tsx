import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import { api } from '../api/client';
import { hasRoleValue, isAdminRole } from '../lib/auth';
import { LoadingScreen } from './LoadingScreen';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin-me'],
    queryFn: api.auth.me,
  });

  if (isLoading) {
    return <LoadingScreen label="Validando sessão admin..." />;
  }

  if (isError || !data) {
    return <Navigate to="/login" replace />;
  }

  const hasRole = hasRoleValue(data.role);

  if (!isAdminRole(data.role)) {
    return (
      <div className="screen-centered page-padding">
        <section className="card warning-card">
          <h1>Acesso negado</h1>
          <p className="muted-text">
            {hasRole
              ? 'Sua conta está autenticada, mas não possui perfil de administrador.'
              : 'Sua conta está autenticada, mas não possui valor no campo role.'}
          </p>
          <button
            className="btn btn-primary"
            onClick={async () => {
              await api.auth.logout();
              window.location.href = '/login';
            }}
          >
            Voltar para login
          </button>
        </section>
      </div>
    );
  }

  return <>{children}</>;
}
