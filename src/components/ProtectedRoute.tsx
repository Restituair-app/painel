import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import { api } from '../api/client';
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

  if (data.role !== 'admin') {
    return (
      <div className="screen-centered page-padding">
        <section className="card warning-card">
          <h1>Acesso negado</h1>
          <p className="muted-text">
            Sua conta está autenticada, mas não possui perfil de administrador.
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
