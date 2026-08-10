import { FormEvent, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CreditCard, Percent, RefreshCcw, Search, Webhook } from 'lucide-react';

import { api } from '../api/client';
import { formatCurrencyBRL, formatDateBR } from '../lib/format';

const centsToCurrency = (value: number) => formatCurrencyBRL(value / 100);

const statusLabel: Record<string, string> = {
  checkout_created: 'Checkout criado',
  pending: 'Pendente',
  active: 'Ativa',
  renewed: 'Renovada',
  cancelled: 'Cancelada',
  failed: 'Falhou',
  refunded: 'Reembolsada',
  disputed: 'Disputa',
  lost: 'Perdida',
};

export function PaymentsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'transactions' | 'coupons' | 'webhooks'>('transactions');
  const [search, setSearch] = useState('');
  const [plan, setPlan] = useState<'all' | 'basic' | 'premium'>('all');
  const [status, setStatus] = useState('');
  const [couponForm, setCouponForm] = useState({
    code: '',
    discountKind: 'PERCENTAGE' as 'PERCENTAGE' | 'FIXED',
    discount: '10',
    maxRedemptions: '-1',
    expiresAt: '',
    providerCouponId: '',
    useProviderCoupon: false,
    notes: '',
  });

  const query = useMemo(() => ({
    page: 1,
    limit: 30,
    search: search.trim() || undefined,
    plan: plan === 'all' ? undefined : plan,
    status: status || undefined,
  }), [plan, search, status]);

  const overviewQuery = useQuery({
    queryKey: ['billing-overview'],
    queryFn: api.admin.billingOverview,
  });

  const transactionsQuery = useQuery({
    queryKey: ['billing-transactions', query],
    queryFn: () => api.admin.listBillingTransactions(query),
    enabled: activeTab === 'transactions',
  });

  const couponsQuery = useQuery({
    queryKey: ['billing-coupons', search, status],
    queryFn: () => api.admin.listBillingCoupons({ page: 1, limit: 30, search: search.trim() || undefined, status: status || undefined }),
    enabled: activeTab === 'coupons',
  });

  const webhookLogsQuery = useQuery({
    queryKey: ['billing-webhook-logs', search, status],
    queryFn: () => api.admin.listBillingWebhookLogs({ page: 1, limit: 30, search: search.trim() || undefined, status: status || undefined }),
    enabled: activeTab === 'webhooks',
  });

  const createCouponMutation = useMutation({
    mutationFn: () => api.admin.createBillingCoupon({
      code: couponForm.code,
      discountKind: couponForm.discountKind,
      discount: Number(couponForm.discount),
      maxRedemptions: Number(couponForm.maxRedemptions),
      expiresAt: couponForm.expiresAt || undefined,
      providerCouponId: couponForm.providerCouponId || undefined,
      useProviderCoupon: couponForm.useProviderCoupon,
      notes: couponForm.notes || undefined,
    }),
    onSuccess: () => {
      setCouponForm((current) => ({ ...current, code: '', notes: '', providerCouponId: '' }));
      queryClient.invalidateQueries({ queryKey: ['billing-coupons'] });
      queryClient.invalidateQueries({ queryKey: ['billing-overview'] });
    },
    onError: (error) => {
      window.alert(error instanceof Error ? error.message : 'Não foi possível criar o cupom.');
    },
  });

  const handleCreateCoupon = (event: FormEvent) => {
    event.preventDefault();
    if (!couponForm.code.trim()) {
      window.alert('Informe o código do cupom.');
      return;
    }
    createCouponMutation.mutate();
  };

  const overview = overviewQuery.data;

  return (
    <div className="dashboard-container">
      <header className="dashboard-header card">
        <div>
          <p className="eyebrow">Billing</p>
          <h1>Pagamentos</h1>
          <p className="muted-text">Monitore assinaturas, cupons, transações e webhooks da Abacate Pay.</p>
        </div>
      </header>

      <section className="stats-grid">
        <div className="stat-card card"><CreditCard size={16} /><strong>{overview?.activeSubscriptions ?? 0}</strong><span>Assinaturas ativas</span></div>
        <div className="stat-card card"><RefreshCcw size={16} /><strong>{overview?.pendingTransactions ?? 0}</strong><span>Pendentes</span></div>
        <div className="stat-card card"><Percent size={16} /><strong>{overview?.totalCoupons ?? 0}</strong><span>Cupons</span></div>
        <div className="stat-card card"><Webhook size={16} /><strong>{overview?.recentWebhooks ?? 0}</strong><span>Webhooks 24h</span></div>
      </section>

      <section className="card users-card">
        <header className="card-header users-header">
          <h2><CreditCard size={16} /> Operação de pagamentos</h2>
          <div className="users-filters">
            <button className={`btn ${activeTab === 'transactions' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setActiveTab('transactions')}>Transações</button>
            <button className={`btn ${activeTab === 'coupons' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setActiveTab('coupons')}>Cupons</button>
            <button className={`btn ${activeTab === 'webhooks' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setActiveTab('webhooks')}>Webhooks</button>
          </div>
        </header>

        <div className="users-filters payments-filter-row">
          <label className="search-wrap" aria-label="Buscar pagamentos">
            <Search size={16} />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar e-mail, cupom, evento ou assinatura" />
          </label>
          {activeTab === 'transactions' && (
            <label className="select-inline"><span>Plano</span><select value={plan} onChange={(event) => setPlan(event.target.value as 'all' | 'basic' | 'premium')}><option value="all">Todos</option><option value="basic">Basic</option><option value="premium">Premium</option></select></label>
          )}
          <label className="select-inline"><span>Status</span><input value={status} onChange={(event) => setStatus(event.target.value)} placeholder="active, cancelled..." /></label>
        </div>

        {activeTab === 'coupons' && (
          <form className="coupon-form" onSubmit={handleCreateCoupon}>
            <label className="form-field compact-field"><span>Código</span><input value={couponForm.code} onChange={(event) => setCouponForm({ ...couponForm, code: event.target.value.toUpperCase() })} placeholder="RESTITUA10" /></label>
            <label className="form-field compact-field"><span>Tipo</span><select value={couponForm.discountKind} onChange={(event) => setCouponForm({ ...couponForm, discountKind: event.target.value as 'PERCENTAGE' | 'FIXED' })}><option value="PERCENTAGE">Percentual</option><option value="FIXED">Valor fixo em centavos</option></select></label>
            <label className="form-field compact-field"><span>Desconto</span><input type="number" value={couponForm.discount} onChange={(event) => setCouponForm({ ...couponForm, discount: event.target.value })} /></label>
            <label className="form-field compact-field"><span>Limite</span><input type="number" value={couponForm.maxRedemptions} onChange={(event) => setCouponForm({ ...couponForm, maxRedemptions: event.target.value })} /></label>
            <label className="checkbox-line"><input type="checkbox" checked={couponForm.useProviderCoupon} onChange={(event) => setCouponForm({ ...couponForm, useProviderCoupon: event.target.checked })} /> Usar cupom nativo Abacate</label>
            <button className="btn btn-primary" disabled={createCouponMutation.isPending}>{createCouponMutation.isPending ? 'Criando...' : 'Criar cupom'}</button>
          </form>
        )}

        <div className="users-table-wrap">
          {activeTab === 'transactions' && (
            <table className="users-table">
              <thead><tr><th>Usuário</th><th>Plano</th><th>Status</th><th>Valor</th><th>Cupom</th><th>Assinatura</th><th>Criado em</th></tr></thead>
              <tbody>{(transactionsQuery.data?.items ?? []).map((item) => (
                <tr key={item.id}><td>{item.userEmail}</td><td>{item.plan}</td><td>{statusLabel[item.status] ?? item.status}</td><td>{centsToCurrency(item.discountedAmount)}</td><td>{item.couponCode ?? '-'}</td><td>{item.providerSubscriptionId ?? '-'}</td><td>{formatDateBR(item.createdAt)}</td></tr>
              ))}</tbody>
            </table>
          )}

          {activeTab === 'coupons' && (
            <table className="users-table">
              <thead><tr><th>Código</th><th>Tipo</th><th>Desconto</th><th>Usos</th><th>Status</th><th>Gateway</th><th>Criado em</th></tr></thead>
              <tbody>{(couponsQuery.data?.items ?? []).map((item) => (
                <tr key={item.id}><td>{item.code}</td><td>{item.discountKind}</td><td>{item.discountKind === 'FIXED' ? centsToCurrency(item.discount) : `${item.discount}%`}</td><td>{item.redeemedCount}/{item.maxRedemptions < 0 ? '∞' : item.maxRedemptions}</td><td>{item.isActive ? 'Ativo' : 'Inativo'}</td><td>{item.useProviderCoupon ? item.providerCouponId || item.code : 'Local'}</td><td>{formatDateBR(item.createdAt)}</td></tr>
              ))}</tbody>
            </table>
          )}

          {activeTab === 'webhooks' && (
            <table className="users-table">
              <thead><tr><th>Evento</th><th>ID externo</th><th>Assinatura</th><th>Processado</th><th>Erro</th><th>Criado em</th></tr></thead>
              <tbody>{(webhookLogsQuery.data?.items ?? []).map((item) => (
                <tr key={item.id}><td>{item.event}</td><td>{item.externalEventId ?? '-'}</td><td>{item.signatureValid ? 'Válida' : 'Inválida'}</td><td>{item.processed ? 'Sim' : 'Não'}</td><td>{item.errorMessage ?? '-'}</td><td>{formatDateBR(item.createdAt)}</td></tr>
              ))}</tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}
