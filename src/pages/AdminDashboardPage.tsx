import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  BarChart3,
  Cpu,
  DollarSign,
  LogOut,
  Receipt,
  RefreshCcw,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  UserCheck,
  UserCog,
  UserX,
  Users,
  Wallet,
} from 'lucide-react';

import { api } from '../api/client';
import { formatCurrencyBRL, formatDateBR } from '../lib/format';
import { StatCard } from '../components/StatCard';

const YEARS = [2026, 2025, 2024, 2023, 2022];

const CATEGORY_LABELS: Record<string, string> = {
  saude: 'Médico/Saúde',
  dentista: 'Dentista/Saúde',
  educacao: 'Educação',
  previdencia_privada: 'Previdência Privada',
  pensao_alimenticia: 'Pensão Alimentícia',
  dependentes: 'Dependentes',
  alimentacao: 'Alimentação',
  transporte: 'Transporte',
  moradia: 'Moradia',
  servicos: 'Serviços',
  vestuario: 'Vestuário',
  pets: 'Pets',
  farmacia: 'Farmácia',
  outros: 'Outros',
};

const CATEGORY_COLORS: Record<string, string> = {
  saude: '#ef4444',
  dentista: '#06b6d4',
  educacao: '#2563eb',
  previdencia_privada: '#059669',
  pensao_alimenticia: '#f97316',
  dependentes: '#14b8a6',
  alimentacao: '#22c55e',
  transporte: '#eab308',
  moradia: '#a855f7',
  servicos: '#6366f1',
  vestuario: '#ec4899',
  pets: '#f59e0b',
  farmacia: '#84cc16',
  outros: '#64748b',
};

const toErrorMessage = (error: unknown, fallback: string) => {
  if (typeof error === 'object' && error && 'message' in error) {
    const value = (error as { message?: unknown }).message;
    if (typeof value === 'string') {
      return value;
    }
  }

  return fallback;
};

export function AdminDashboardPage() {
  const queryClient = useQueryClient();
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [usersPage, setUsersPage] = useState(1);
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'user'>('all');
  const [searchInput, setSearchInput] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [busyUserId, setBusyUserId] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchDebounced(searchInput.trim());
      setUsersPage(1);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    setUsersPage(1);
  }, [roleFilter]);

  const meQuery = useQuery({
    queryKey: ['admin-me'],
    queryFn: api.auth.me,
  });

  const overviewQuery = useQuery({
    queryKey: ['admin-overview', year],
    queryFn: () => api.admin.overview(year),
    enabled: meQuery.data?.role === 'admin',
  });

  const usersQuery = useQuery({
    queryKey: ['admin-users', usersPage, roleFilter, searchDebounced],
    queryFn: () =>
      api.admin.listUsers({
        page: usersPage,
        limit: 10,
        search: searchDebounced || undefined,
        role: roleFilter === 'all' ? undefined : roleFilter,
      }),
    enabled: meQuery.data?.role === 'admin',
    placeholderData: (previousData) => previousData,
  });

  const updateUserMutation = useMutation({
    mutationFn: (args: { id: string; role?: 'admin' | 'user'; isActive?: boolean }) =>
      api.admin.updateUser(args.id, {
        role: args.role,
        isActive: args.isActive,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-overview'] });
    },
    onError: (error) => {
      window.alert(toErrorMessage(error, 'Não foi possível atualizar o usuário.'));
    },
    onSettled: () => {
      setBusyUserId(null);
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: (id: string) => api.admin.deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-overview'] });
    },
    onError: (error) => {
      window.alert(toErrorMessage(error, 'Não foi possível excluir o usuário.'));
    },
    onSettled: () => {
      setBusyUserId(null);
    },
  });

  const categoriesChart = useMemo(() => {
    return (overviewQuery.data?.categorias ?? []).map((item) => ({
      ...item,
      nome: CATEGORY_LABELS[item.categoria] || item.categoria,
      cor: CATEGORY_COLORS[item.categoria] || '#64748b',
    }));
  }, [overviewQuery.data?.categorias]);

  const monthlyExpensesChart = useMemo(() => {
    return (overviewQuery.data?.mensal ?? []).map((item) => ({
      ...item,
      label: item.mes.slice(5),
    }));
  }, [overviewQuery.data?.mensal]);

  const monthlyAiChart = useMemo(() => {
    return (overviewQuery.data?.iaMensal ?? []).map((item) => ({
      ...item,
      label: item.mes.slice(5),
    }));
  }, [overviewQuery.data?.iaMensal]);

  const usersTotal = usersQuery.data?.total ?? 0;
  const usersLimit = usersQuery.data?.limit ?? 10;
  const usersTotalPages = Math.max(1, Math.ceil(usersTotal / usersLimit));

  const isBusyAction = updateUserMutation.isPending || deleteUserMutation.isPending;

  const handleRefresh = () => {
    overviewQuery.refetch();
    usersQuery.refetch();
  };

  const handleToggleRole = (user: {
    id: string;
    role: 'admin' | 'user';
    email: string;
  }) => {
    if (user.id === meQuery.data?.id && user.role === 'admin') {
      window.alert('Você não pode remover o próprio perfil admin pelo painel.');
      return;
    }

    setBusyUserId(user.id);
    updateUserMutation.mutate({
      id: user.id,
      role: user.role === 'admin' ? 'user' : 'admin',
    });
  };

  const handleToggleStatus = (user: {
    id: string;
    isActive: boolean;
  }) => {
    if (user.id === meQuery.data?.id && user.isActive) {
      window.alert('Você não pode desativar a própria conta em uso.');
      return;
    }

    setBusyUserId(user.id);
    updateUserMutation.mutate({
      id: user.id,
      isActive: !user.isActive,
    });
  };

  const handleDeleteUser = (user: { id: string; email: string }) => {
    if (user.id === meQuery.data?.id) {
      window.alert('Por segurança, a própria conta não pode ser removida por aqui.');
      return;
    }

    const confirmed = window.confirm(
      `Excluir ${user.email}? Todas as notas fiscais desse usuário também serão removidas.`,
    );

    if (!confirmed) {
      return;
    }

    setBusyUserId(user.id);
    deleteUserMutation.mutate(user.id);
  };

  const handleLogout = async () => {
    await api.auth.logout();
    window.location.href = '/login';
  };

  return (
    <main className="dashboard-page">
      <div className="dashboard-container">
        <header className="dashboard-header card">
          <div>
            <p className="eyebrow">Restitua</p>
            <h1>Painel Administrativo</h1>
            <p className="muted-text">Sistema independente para operação e governança.</p>
          </div>

          <div className="header-actions">
            <label className="select-wrap" aria-label="Ano do painel">
              <span>Ano</span>
              <select value={year} onChange={(event) => setYear(Number(event.target.value))}>
                {YEARS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <button className="btn btn-secondary" onClick={handleRefresh} disabled={overviewQuery.isFetching}>
              <RefreshCcw size={16} /> Atualizar
            </button>

            <button className="btn btn-danger" onClick={handleLogout}>
              <LogOut size={16} /> Sair
            </button>
          </div>
        </header>

        <section className="stats-grid">
          <StatCard
            title="Usuários"
            value={String(overviewQuery.data?.users.total ?? 0)}
            note={`${overviewQuery.data?.users.novosNoAno ?? 0} novos em ${year}`}
            icon={<Users size={16} />}
          />
          <StatCard
            title="Admins"
            value={String(overviewQuery.data?.users.admins ?? 0)}
            note={`${overviewQuery.data?.users.active ?? 0} contas ativas`}
            icon={<ShieldCheck size={16} />}
          />
          <StatCard
            title="Cadastro Completo"
            value={`${overviewQuery.data?.users.percentualCadastroCompleto ?? 0}%`}
            note={`${overviewQuery.data?.users.cadastroCompleto ?? 0} usuários completos`}
            icon={<UserCheck size={16} />}
          />
          <StatCard
            title={`Notas em ${year}`}
            value={String(overviewQuery.data?.notas.totalNoAno ?? 0)}
            note={`Total geral: ${overviewQuery.data?.notas.total ?? 0}`}
            icon={<Receipt size={16} />}
          />

          <StatCard
            title={`Valor em ${year}`}
            value={formatCurrencyBRL(overviewQuery.data?.notas.valorNoAno ?? 0)}
            note={`Ticket: ${formatCurrencyBRL(overviewQuery.data?.notas.ticketMedioNoAno ?? 0)}`}
            icon={<Wallet size={16} />}
          />
          <StatCard
            title="Dedutíveis"
            value={formatCurrencyBRL(overviewQuery.data?.notas.dedutiveisValor ?? 0)}
            note={`Não dedutíveis: ${formatCurrencyBRL(overviewQuery.data?.notas.naoDedutiveisValor ?? 0)}`}
            icon={<Target size={16} />}
          />
          <StatCard
            title="Requests IA"
            value={String(overviewQuery.data?.ia.requestsNoAno ?? 0)}
            note={`Histórico: ${overviewQuery.data?.ia.requestsTotal ?? 0}`}
            icon={<Sparkles size={16} />}
          />
          <StatCard
            title="Tokens IA"
            value={(overviewQuery.data?.ia.tokensNoAno ?? 0).toLocaleString('pt-BR')}
            note={`Média/request: ${(overviewQuery.data?.ia.mediaTokensPorRequestNoAno ?? 0).toLocaleString('pt-BR')}`}
            icon={<Cpu size={16} />}
          />
        </section>

        <section className="stats-grid two-cols">
          <StatCard
            title={`Custo IA em ${year}`}
            value={`US$ ${(overviewQuery.data?.ia.custoUsdNoAno ?? 0).toFixed(4)}`}
            note={`Histórico: US$ ${(overviewQuery.data?.ia.custoUsdTotal ?? 0).toFixed(4)}`}
            icon={<DollarSign size={16} />}
          />
          <StatCard
            title="Valor histórico de notas"
            value={formatCurrencyBRL(overviewQuery.data?.notas.totalValor ?? 0)}
            note={`Ticket médio: ${formatCurrencyBRL(overviewQuery.data?.notas.ticketMedio ?? 0)}`}
            icon={<BarChart3 size={16} />}
          />
        </section>

        <section className="charts-grid">
          <article className="card chart-card">
            <header className="card-header">
              <h2>Valor por Categoria ({year})</h2>
            </header>
            <div className="chart-wrap">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoriesChart} margin={{ top: 12, right: 16, left: 0, bottom: 50 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.25)" />
                  <XAxis dataKey="nome" angle={-25} textAnchor="end" interval={0} height={75} tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={(value) => `R$${Number(value).toFixed(0)}`} />
                  <Tooltip formatter={(value) => formatCurrencyBRL(Number(value))} />
                  <Bar dataKey="totalValor" radius={[8, 8, 0, 0]}>
                    {categoriesChart.map((item) => (
                      <Cell key={item.categoria} fill={item.cor} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </article>

          <article className="card chart-card">
            <header className="card-header">
              <h2>Distribuição Percentual ({year})</h2>
            </header>
            <div className="chart-wrap">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoriesChart}
                    dataKey="totalValor"
                    nameKey="nome"
                    outerRadius={105}
                    label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                  >
                    {categoriesChart.map((item) => (
                      <Cell key={item.categoria} fill={item.cor} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrencyBRL(Number(value))} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </article>
        </section>

        <section className="charts-grid">
          <article className="card chart-card">
            <header className="card-header">
              <h2>Evolução Mensal de Notas ({year})</h2>
            </header>
            <div className="chart-wrap">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyExpensesChart} margin={{ top: 12, right: 16, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.25)" />
                  <XAxis dataKey="label" />
                  <YAxis tickFormatter={(value) => `R$${Number(value).toFixed(0)}`} />
                  <Tooltip formatter={(value) => formatCurrencyBRL(Number(value))} />
                  <Line type="monotone" dataKey="totalValor" stroke="#2563eb" strokeWidth={2.5} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </article>

          <article className="card chart-card">
            <header className="card-header">
              <h2>Evolução de Custo IA ({year})</h2>
            </header>
            <div className="chart-wrap">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyAiChart} margin={{ top: 12, right: 16, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.25)" />
                  <XAxis dataKey="label" />
                  <YAxis tickFormatter={(value) => `US$${Number(value).toFixed(3)}`} />
                  <Tooltip formatter={(value) => `US$ ${Number(value || 0).toFixed(4)}`} />
                  <Line type="monotone" dataKey="custoUsd" stroke="#0d9488" strokeWidth={2.5} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </article>
        </section>

        <section className="cards-grid">
          <article className="card">
            <header className="card-header">
              <h2>Top Usuários por Valor ({year})</h2>
            </header>
            <div className="stack-list">
              {(overviewQuery.data?.topUsuarios ?? []).map((user, index) => (
                <div key={user.email} className="row-item">
                  <div>
                    <p className="row-title">{index + 1}. {user.email}</p>
                    <p className="muted-text small">{user.totalNotas} notas</p>
                  </div>
                  <strong>{formatCurrencyBRL(user.totalValor)}</strong>
                </div>
              ))}
            </div>
          </article>

          <article className="card">
            <header className="card-header">
              <h2>Notas Recentes ({year})</h2>
            </header>
            <div className="stack-list">
              {(overviewQuery.data?.recentes ?? []).map((nota) => (
                <div key={nota.id} className="row-item">
                  <div>
                    <p className="row-title">{nota.estabelecimento || 'Estabelecimento não informado'}</p>
                    <p className="muted-text small">{nota.created_by} • {nota.data_emissao}</p>
                  </div>
                  <strong>{formatCurrencyBRL(nota.valor_total)}</strong>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="card users-card">
          <header className="card-header users-header">
            <h2>
              <UserCog size={16} /> Gestão de Usuários
            </h2>
            <div className="users-filters">
              <label className="search-wrap" aria-label="Buscar usuários">
                <Search size={16} />
                <input
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder="Buscar por nome ou e-mail"
                />
              </label>

              <label className="select-inline" aria-label="Filtrar por perfil">
                <span>Perfil</span>
                <select
                  value={roleFilter}
                  onChange={(event) => setRoleFilter(event.target.value as 'all' | 'admin' | 'user')}
                >
                  <option value="all">Todos</option>
                  <option value="admin">Admins</option>
                  <option value="user">Usuários</option>
                </select>
              </label>
            </div>
          </header>

          <div className="users-table-wrap">
            <table className="users-table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>E-mail</th>
                  <th>Perfil</th>
                  <th>Status</th>
                  <th>Cadastro</th>
                  <th>Criado em</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {(usersQuery.data?.items ?? []).map((user) => {
                  const isBusy = isBusyAction && busyUserId === user.id;

                  return (
                    <tr key={user.id}>
                      <td>{user.nome_completo || user.full_name || user.name || '-'}</td>
                      <td>{user.email}</td>
                      <td>
                        <span className={`pill ${user.role === 'admin' ? 'pill-admin' : 'pill-user'}`}>
                          {user.role}
                        </span>
                      </td>
                      <td>
                        <span className={user.isActive ? 'status-active' : 'status-inactive'}>
                          {user.isActive ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td>{user.cadastro_completo ? 'Completo' : 'Pendente'}</td>
                      <td>{formatDateBR(user.created_date || user.createdAt)}</td>
                      <td>
                        <div className="actions-inline">
                          <button
                            className="btn btn-outline"
                            onClick={() => handleToggleRole({ id: user.id, role: user.role, email: user.email })}
                            disabled={isBusy}
                          >
                            {user.role === 'admin' ? 'Remover admin' : 'Promover admin'}
                          </button>
                          <button
                            className="btn btn-outline"
                            onClick={() => handleToggleStatus({ id: user.id, isActive: user.isActive })}
                            disabled={isBusy}
                          >
                            {user.isActive ? 'Desativar' : 'Ativar'}
                          </button>
                          <button
                            className="btn btn-danger compact"
                            onClick={() => handleDeleteUser({ id: user.id, email: user.email })}
                            disabled={isBusy}
                            title="Excluir usuário"
                          >
                            <UserX size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <footer className="users-footer">
            <p className="muted-text small">{usersTotal} usuário(s) encontrados</p>
            <div className="pager-wrap">
              <button
                className="btn btn-outline"
                onClick={() => setUsersPage((prev) => Math.max(1, prev - 1))}
                disabled={usersPage <= 1}
              >
                Anterior
              </button>
              <span className="muted-text small">Página {usersPage} de {usersTotalPages}</span>
              <button
                className="btn btn-outline"
                onClick={() => setUsersPage((prev) => Math.min(usersTotalPages, prev + 1))}
                disabled={usersPage >= usersTotalPages}
              >
                Próxima
              </button>
            </div>
          </footer>
        </section>
      </div>
    </main>
  );
}
