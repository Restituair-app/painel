import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ShieldCheck } from 'lucide-react';

import { api } from '../api/client';
import { getAccessToken } from '../api/http';
import { hasRoleValue, isAdminRole } from '../lib/auth';

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasSessionToken = useMemo(() => Boolean(getAccessToken()), []);

  const sessionQuery = useQuery({
    queryKey: ['admin-me'],
    queryFn: api.auth.me,
    enabled: hasSessionToken,
  });

  useEffect(() => {
    if (isAdminRole(sessionQuery.data?.role)) {
      navigate('/painel', { replace: true });
      return;
    }

    if (sessionQuery.data && !hasRoleValue(sessionQuery.data.role)) {
      api.auth.logout();
      setError('Conta autenticada sem perfil de acesso (role). Contate o suporte.');
      return;
    }

    if (sessionQuery.data && !isAdminRole(sessionQuery.data.role)) {
      api.auth.logout();
      setError('Sua conta não possui permissão de administrador.');
    }
  }, [navigate, sessionQuery.data]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await api.auth.login({ email, password });
      const me = await api.auth.me();

      if (!hasRoleValue(me.role)) {
        await api.auth.logout();
        setError('Conta autenticada sem perfil de acesso (role). Contate o suporte.');
        return;
      }

      if (!isAdminRole(me.role)) {
        await api.auth.logout();
        setError('Conta autenticada, mas sem perfil admin.');
        return;
      }

      navigate('/painel', { replace: true });
    } catch (rawError) {
      const fallback = 'Não foi possível autenticar no painel.';
      const message =
        typeof rawError === 'object' &&
        rawError &&
        'message' in rawError &&
        typeof (rawError as { message?: unknown }).message === 'string'
          ? (rawError as { message: string }).message
          : fallback;

      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-card">
        <header className="auth-header">
          <div className="auth-icon-wrap" aria-hidden="true">
            <ShieldCheck className="auth-icon" />
          </div>
          <h1>Painel Administrativo</h1>
          <p className="muted-text">
            Acesso exclusivo para administradores do Restitua.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="form-stack">
          <label className="form-field">
            <span>E-mail</span>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              placeholder="admin@restitua.com"
            />
          </label>

          <label className="form-field">
            <span>Senha</span>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              placeholder="Sua senha"
            />
          </label>

          {error ? <div className="alert alert-error">{error}</div> : null}

          <button className="btn btn-primary" type="submit" disabled={submitting}>
            {submitting ? 'Entrando...' : 'Entrar no painel'}
          </button>
        </form>
      </section>
    </main>
  );
}
