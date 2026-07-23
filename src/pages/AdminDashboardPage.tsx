import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
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
import { BarChart3, Cpu, DollarSign, Receipt, RefreshCcw, ShieldCheck, Sparkles, Target, UserCheck, Users, Wallet } from 'lucide-react';

import { api } from '../api/client';
import { formatCurrencyBRL } from '../lib/format';
import { StatCard } from '../components/StatCard';

const YEARS = [2026, 2025, 2024, 2023, 2022];

const CATEGORY_LABELS: Record<string, string> = {
  saude: 'Médico / Saúde',
  dentista: 'Dentista / Saúde',
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
  estetica_beleza: 'Estética / Beleza',
  lazer_diversao: 'Lazer / Diversão',
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
  estetica_beleza: '#fb7185',
  lazer_diversao: '#38bdf8',
  outros: '#64748b',
};

export function AdminDashboardPage() {
  const [year, setYear] = useState<number>(new Date().getFullYear());

  const overviewQuery = useQuery({
    queryKey: ['admin-overview', year],
    queryFn: () => api.admin.overview(year),
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

  return (
    <div className="dashboard-container">
      <header className="dashboard-header card">
        <div>
          <p className="eyebrow">Restitua</p>
          <h1>Painel Administrativo</h1>
          <p className="muted-text">Indicadores principais de operação e governança.</p>
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

          <button className="btn btn-secondary" onClick={() => overviewQuery.refetch()} disabled={overviewQuery.isFetching}>
            <RefreshCcw size={16} /> Atualizar
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
    </div>
  );
}
