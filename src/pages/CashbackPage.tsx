import { ChangeEvent, FormEvent, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Download, Eye, Gift, PlayCircle, RefreshCcw, Search, Ticket, Trophy, Wallet, XCircle } from 'lucide-react';

import { api } from '../api/client';
import { formatCurrencyBRL, formatDateBR } from '../lib/format';
import type {
  AuditNotaFiscal,
  CashbackCoupon,
  CashbackPrizeCampaign,
  CashbackWithdrawal,
  CashbackWithdrawalStatus,
} from '../types/api';

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

const statusLabel: Record<CashbackWithdrawalStatus, string> = {
  pendente: 'Pendente',
  em_analise: 'Em análise',
  pagamento_realizado: 'Pagamento realizado',
  rejeitado: 'Rejeitado',
};

const statusClass: Record<CashbackWithdrawalStatus, string> = {
  pendente: 'pill-user',
  em_analise: 'pill-admin',
  pagamento_realizado: 'pill-success',
  rejeitado: 'pill-danger',
};

const couponStatusLabel: Record<CashbackCoupon['status'], string> = {
  ativo: 'Ativo',
  sorteado: 'Sorteado',
  expirado: 'Expirado',
};

const toErrorMessage = (error: unknown, fallback: string) => {
  if (typeof error === 'object' && error && 'message' in error) {
    const value = (error as { message?: unknown }).message;
    if (typeof value === 'string') return value;
  }
  return fallback;
};

const centsToCurrency = (value: number) => formatCurrencyBRL(value / 100);

const isImageUrl = (url?: string | null) => {
  if (!url) return false;
  return /\.(jpg|jpeg|png|webp|gif|heic)(\?|$)/i.test(url);
};

export function CashbackPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'withdrawals' | 'coupons' | 'prizes'>('withdrawals');
  const [statusFilter, setStatusFilter] = useState<'all' | CashbackWithdrawalStatus>('all');
  const [search, setSearch] = useState('');
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<CashbackWithdrawal | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchedRange, setSearchedRange] = useState<{ startDate: string; endDate: string } | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [campaignForm, setCampaignForm] = useState({ title: '', subtitle: '', notes: '', isActive: true });
  const [campaignFile, setCampaignFile] = useState<File | null>(null);
  const [winnerByCampaign, setWinnerByCampaign] = useState<Record<string, string>>({});

  const withdrawalsQuery = useQuery({
    queryKey: ['admin-cashback-withdrawals', statusFilter, search],
    queryFn: () => api.admin.listCashbackWithdrawals({
      status: statusFilter === 'all' ? undefined : statusFilter,
      search: search.trim() || undefined,
    }),
    enabled: activeTab === 'withdrawals',
  });

  const activeWithdrawal = selectedWithdrawal;
  const canAnalyzeWithdrawal = activeWithdrawal?.status === 'em_analise' || activeWithdrawal?.status === 'pagamento_realizado';

  const notasQuery = useQuery({
    queryKey: ['admin-cashback-withdrawal-notas', activeWithdrawal?.id, searchedRange?.startDate, searchedRange?.endDate],
    queryFn: () => api.admin.listCashbackWithdrawalNotas(activeWithdrawal!.id, {
      startDate: searchedRange!.startDate,
      endDate: searchedRange!.endDate,
    }),
    enabled: activeTab === 'withdrawals' && Boolean(activeWithdrawal?.id) && canAnalyzeWithdrawal && Boolean(searchedRange),
  });

  const couponsQuery = useQuery({
    queryKey: ['admin-cashback-coupons', search],
    queryFn: () => api.admin.listCashbackCoupons({ search: search.trim() || undefined }),
    enabled: activeTab === 'coupons',
  });

  const campaignsQuery = useQuery({
    queryKey: ['admin-cashback-prize-campaigns'],
    queryFn: () => api.admin.listCashbackPrizeCampaigns(),
    enabled: activeTab === 'prizes',
  });

  const totalNotas = useMemo(
    () => (notasQuery.data ?? []).reduce((sum, nota) => sum + Number(nota.valor_total || 0), 0),
    [notasQuery.data],
  );

  const startAnalysisMutation = useMutation({
    mutationFn: (id: string) => api.admin.startCashbackWithdrawalAnalysis(id),
    onSuccess: (withdrawal) => {
      setSelectedWithdrawal(withdrawal);
      queryClient.invalidateQueries({ queryKey: ['admin-cashback-withdrawals'] });
    },
    onError: (error) => window.alert(toErrorMessage(error, 'Não foi possível iniciar análise.')),
  });

  const markPaidMutation = useMutation({
    mutationFn: () => {
      if (!activeWithdrawal) throw new Error('Selecione uma solicitação.');
      if (!proofFile) throw new Error('Anexe o comprovante do Pix.');
      return api.admin.markCashbackWithdrawalPaid(activeWithdrawal.id, { notes: adminNotes || undefined, file: proofFile });
    },
    onSuccess: (withdrawal) => {
      setSelectedWithdrawal(withdrawal);
      setProofFile(null);
      queryClient.invalidateQueries({ queryKey: ['admin-cashback-withdrawals'] });
      window.alert('Pagamento registrado com sucesso.');
    },
    onError: (error) => window.alert(toErrorMessage(error, 'Não foi possível registrar o pagamento.')),
  });

  const rejectMutation = useMutation({
    mutationFn: () => {
      if (!activeWithdrawal) throw new Error('Selecione uma solicitação.');
      return api.admin.rejectCashbackWithdrawal(activeWithdrawal.id, { notes: adminNotes || undefined });
    },
    onSuccess: (withdrawal) => {
      setSelectedWithdrawal(withdrawal);
      queryClient.invalidateQueries({ queryKey: ['admin-cashback-withdrawals'] });
    },
    onError: (error) => window.alert(toErrorMessage(error, 'Não foi possível rejeitar a solicitação.')),
  });

  const createCampaignMutation = useMutation({
    mutationFn: () => api.admin.createCashbackPrizeCampaign({ ...campaignForm, file: campaignFile || undefined }),
    onSuccess: () => {
      setCampaignForm({ title: '', subtitle: '', notes: '', isActive: true });
      setCampaignFile(null);
      queryClient.invalidateQueries({ queryKey: ['admin-cashback-prize-campaigns'] });
    },
    onError: (error) => window.alert(toErrorMessage(error, 'Não foi possível criar a campanha.')),
  });

  const publishWinnerMutation = useMutation({
    mutationFn: ({ campaignId, couponCode }: { campaignId: string; couponCode: string }) =>
      api.admin.publishCashbackPrizeWinner(campaignId, { couponCode }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-cashback-prize-campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['admin-cashback-coupons'] });
      window.alert('Cupom sorteado publicado.');
    },
    onError: (error) => window.alert(toErrorMessage(error, 'Não foi possível publicar o cupom sorteado.')),
  });

  const handleSelectWithdrawal = (withdrawal: CashbackWithdrawal) => {
    setSelectedWithdrawal(withdrawal);
    setStartDate('');
    setEndDate('');
    setSearchedRange(null);
    setProofFile(null);
    setAdminNotes(withdrawal.notes || '');
  };

  const handleSearchNotas = () => {
    if (!startDate || !endDate) {
      window.alert('Informe data inicial e data final antes de buscar as notas.');
      return;
    }

    if (startDate > endDate) {
      window.alert('A data inicial não pode ser maior que a data final.');
      return;
    }

    const nextRange = { startDate, endDate };
    setSearchedRange(nextRange);

    if (searchedRange && searchedRange.startDate === nextRange.startDate && searchedRange.endDate === nextRange.endDate) {
      queryClient.invalidateQueries({ queryKey: ['admin-cashback-withdrawal-notas', activeWithdrawal?.id] });
    }
  };

  const handleProofChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;

    if (file && file.size > MAX_FILE_SIZE_BYTES) {
      window.alert('O comprovante deve ter no máximo 10 MB.');
      event.target.value = '';
      setProofFile(null);
      return;
    }

    setProofFile(file);
  };

  const handleCampaignFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;

    if (file && file.size > MAX_FILE_SIZE_BYTES) {
      window.alert('O banner deve ter no máximo 10 MB.');
      event.target.value = '';
      setCampaignFile(null);
      return;
    }

    setCampaignFile(file);
  };

  const handleCreateCampaign = (event: FormEvent) => {
    event.preventDefault();
    if (!campaignForm.title.trim() || !campaignForm.subtitle.trim()) {
      window.alert('Informe título e subtítulo da campanha.');
      return;
    }
    createCampaignMutation.mutate();
  };

  const renderAttachmentActions = (label: string, url?: string | null) => {
    if (!url) {
      return <span className="muted-text small">Sem {label.toLowerCase()}</span>;
    }

    return (
      <div className="audit-attachment">
        {isImageUrl(url) ? <img src={url} alt={label} loading="lazy" /> : null}
        <div className="audit-attachment-actions">
          <a className="btn btn-outline compact" href={url} target="_blank" rel="noreferrer" aria-label={`Ver ${label}`}>
            <Eye size={15} />
          </a>
          <a className="btn btn-outline compact" href={url} download aria-label={`Baixar ${label}`}>
            <Download size={15} />
          </a>
        </div>
      </div>
    );
  };

  const renderNotaItens = (nota: AuditNotaFiscal) => {
    if (!nota.itens || nota.itens.length === 0) {
      return <span className="muted-text small">Sem itens</span>;
    }

    return (
      <details className="audit-items-detail">
        <summary>{nota.itens.length} itens</summary>
        <ul>
          {nota.itens.map((item, index) => (
            <li key={`${item.descricao || 'item'}-${index}`}>
              <strong>{item.descricao || `Item ${index + 1}`}</strong>
              <span>{item.valor_total !== null && item.valor_total !== undefined ? formatCurrencyBRL(item.valor_total) : '-'}</span>
            </li>
          ))}
        </ul>
      </details>
    );
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header card">
        <div>
          <p className="eyebrow">Cashback</p>
          <h1>Programa Cashback</h1>
          <p className="muted-text">Analise saques, acompanhe cupons e publique campanhas de prêmios.</p>
        </div>

        <button className="btn btn-secondary" onClick={() => {
          withdrawalsQuery.refetch();
          couponsQuery.refetch();
          campaignsQuery.refetch();
        }}>
          <RefreshCcw size={16} /> Atualizar
        </button>
      </header>

      <section className="stats-grid">
        <div className="stat-card card"><Wallet size={16} /><strong>{(withdrawalsQuery.data ?? []).length}</strong><span>Saques</span></div>
        <div className="stat-card card"><Ticket size={16} /><strong>{(couponsQuery.data ?? []).length}</strong><span>Cupons</span></div>
        <div className="stat-card card"><Trophy size={16} /><strong>{(campaignsQuery.data ?? []).length}</strong><span>Campanhas</span></div>
        <div className="stat-card card"><Gift size={16} /><strong>{(campaignsQuery.data ?? []).filter((item) => item.winningCouponCode).length}</strong><span>Sorteios publicados</span></div>
      </section>

      <section className="card users-card">
        <header className="card-header users-header">
          <h2><Wallet size={16} /> Gestão do cashback</h2>
          <div className="users-filters">
            <button className={`btn ${activeTab === 'withdrawals' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setActiveTab('withdrawals')}>Saques</button>
            <button className={`btn ${activeTab === 'coupons' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setActiveTab('coupons')}>Cupons</button>
            <button className={`btn ${activeTab === 'prizes' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setActiveTab('prizes')}>Prêmios</button>
          </div>
        </header>

        <div className="users-filters payments-filter-row">
          <label className="search-wrap" aria-label="Buscar cashback">
            <Search size={16} />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar e-mail, nome, Pix ou cupom" />
          </label>
          {activeTab === 'withdrawals' ? (
            <label className="select-inline">
              <span>Status</span>
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}>
                <option value="all">Todos</option>
                <option value="pendente">Pendente</option>
                <option value="em_analise">Em análise</option>
                <option value="pagamento_realizado">Pagamento realizado</option>
                <option value="rejeitado">Rejeitado</option>
              </select>
            </label>
          ) : null}
        </div>
      </section>

      {activeTab === 'withdrawals' ? (
        <section className="audit-layout">
          <div className="audit-ticket-list">
            {(withdrawalsQuery.data ?? []).map((withdrawal) => (
              <button
                key={withdrawal.id}
                className={`card audit-ticket-card${activeWithdrawal?.id === withdrawal.id ? ' selected' : ''}`}
                onClick={() => handleSelectWithdrawal(withdrawal)}
              >
                <div className="audit-ticket-row">
                  <strong>{withdrawal.userName || withdrawal.userEmail}</strong>
                  <span className={`pill ${statusClass[withdrawal.status]}`}>{statusLabel[withdrawal.status]}</span>
                </div>
                <p className="muted-text small">{withdrawal.userEmail}</p>
                <p className="muted-text small">{centsToCurrency(withdrawal.amountCents)} • Pix: {withdrawal.pixKey}</p>
                <p className="muted-text small">Solicitado em {formatDateBR(withdrawal.requestedAt)}</p>
              </button>
            ))}

            {!withdrawalsQuery.isLoading && (withdrawalsQuery.data ?? []).length === 0 ? (
              <article className="card empty-card"><Wallet size={22} /><p>Nenhum saque encontrado.</p></article>
            ) : null}
          </div>

          <article className="card audit-detail-card">
            {activeWithdrawal ? (
              <>
                <header className="audit-detail-header">
                  <div>
                    <p className="eyebrow">Solicitação</p>
                    <h2>{activeWithdrawal.userName || activeWithdrawal.userEmail}</h2>
                    <p className="muted-text small">{activeWithdrawal.userEmail}</p>
                  </div>
                  <span className={`pill ${statusClass[activeWithdrawal.status]}`}>{statusLabel[activeWithdrawal.status]}</span>
                </header>

                <div className="cashback-withdrawal-summary">
                  <div><span>Valor</span><strong>{centsToCurrency(activeWithdrawal.amountCents)}</strong></div>
                  <div><span>Chave Pix</span><strong>{activeWithdrawal.pixKey}</strong></div>
                  <div><span>Solicitado</span><strong>{formatDateBR(activeWithdrawal.requestedAt)}</strong></div>
                </div>

                <div className="audit-actions-row">
                  <button className="btn btn-primary" disabled={activeWithdrawal.status !== 'pendente' || startAnalysisMutation.isPending} onClick={() => startAnalysisMutation.mutate(activeWithdrawal.id)}>
                    <PlayCircle size={16} /> Iniciar análise
                  </button>
                  {activeWithdrawal.proofUrl ? (
                    <a className="btn btn-outline" href={activeWithdrawal.proofUrl} target="_blank" rel="noreferrer"><Eye size={16} /> Ver comprovante</a>
                  ) : null}
                  {activeWithdrawal.proofUrl ? (
                    <a className="btn btn-outline" href={activeWithdrawal.proofUrl} download={activeWithdrawal.proofFileName || 'comprovante-pix'}><Download size={16} /> Baixar</a>
                  ) : null}
                </div>

                {canAnalyzeWithdrawal ? (
                  <section className="audit-range-box">
                    <div className="audit-range-header">
                      <div>
                        <h3>Notas para análise</h3>
                        <p className="muted-text small">Defina o período e clique em buscar para carregar comprovantes e memórias.</p>
                      </div>
                      <strong>{searchedRange ? `${(notasQuery.data ?? []).length} notas • ${formatCurrencyBRL(totalNotas)}` : 'Aguardando busca'}</strong>
                    </div>
                    <div className="reviews-filters">
                      <label className="form-field compact-field"><span>Data inicial</span><input type="date" value={startDate} onChange={(event) => { setStartDate(event.target.value); setSearchedRange(null); }} /></label>
                      <label className="form-field compact-field"><span>Data final</span><input type="date" value={endDate} onChange={(event) => { setEndDate(event.target.value); setSearchedRange(null); }} /></label>
                      <button className="btn btn-primary" disabled={notasQuery.isFetching} onClick={handleSearchNotas}><Search size={16} /> {notasQuery.isFetching ? 'Buscando...' : 'Buscar notas'}</button>
                    </div>

                    {searchedRange ? (
                      <div className="audit-notes-table-wrap">
                        <table className="users-table audit-notes-table">
                          <thead><tr><th>Data</th><th>Estabelecimento</th><th>Categoria</th><th>Valor</th><th>CNPJ</th><th>Número</th><th>Itens</th><th>Observações</th><th>Nota</th><th>Memória</th></tr></thead>
                          <tbody>{(notasQuery.data ?? []).map((nota) => (
                            <tr key={nota.id}>
                              <td>{nota.data_emissao}</td><td>{nota.estabelecimento || '-'}</td><td>{nota.categoria}</td><td>{formatCurrencyBRL(nota.valor_total)}</td><td>{nota.cnpj || '-'}</td><td>{nota.numero_nota || '-'}</td><td>{renderNotaItens(nota)}</td><td className="audit-note-observation">{nota.observacoes || '-'}</td><td>{renderAttachmentActions('nota fiscal', nota.imagem_url)}</td><td>{renderAttachmentActions('memória', nota.memoria_url)}</td>
                            </tr>
                          ))}</tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="empty-card audit-search-empty"><Search size={22} /><p>Escolha o período para carregar as notas desta solicitação.</p></div>
                    )}
                  </section>
                ) : (
                  <section className="audit-range-box"><p className="muted-text">Inicie a análise para buscar as notas do usuário por período.</p></section>
                )}

                <section className="audit-complete-box">
                  <h3>Decisão do saque</h3>
                  <label className="form-field"><span>Observação interna/para histórico</span><textarea value={adminNotes} onChange={(event) => setAdminNotes(event.target.value)} placeholder="Motivo da decisão ou observações sobre a análise." maxLength={2000} /></label>
                  <label className="form-field legal-file-field"><span>Comprovante do Pix</span><input type="file" onChange={handleProofChange} accept=".pdf,.jpg,.jpeg,.png,.webp,.heic" /><small className="muted-text">PDF ou imagem até 10 MB.</small></label>
                  <div className="audit-actions-row">
                    <button className="btn btn-primary" disabled={activeWithdrawal.status === 'pagamento_realizado' || !proofFile || markPaidMutation.isPending} onClick={() => markPaidMutation.mutate()}><CheckCircle2 size={16} /> Marcar pagamento realizado</button>
                    <button className="btn btn-outline danger" disabled={activeWithdrawal.status === 'pagamento_realizado' || rejectMutation.isPending} onClick={() => rejectMutation.mutate()}><XCircle size={16} /> Rejeitar</button>
                  </div>
                </section>
              </>
            ) : (
              <div className="empty-card"><Wallet size={24} /><p>Selecione uma solicitação para analisar.</p></div>
            )}
          </article>
        </section>
      ) : null}

      {activeTab === 'coupons' ? (
        <section className="card users-card">
          <header className="card-header"><h2><Ticket size={16} /> Cupons de cashback</h2></header>
          <div className="users-table-wrap">
            <table className="users-table">
              <thead><tr><th>Código</th><th>Usuário</th><th>Valor</th><th>Status</th><th>Sorteado em</th><th>Criado em</th></tr></thead>
              <tbody>{(couponsQuery.data ?? []).map((coupon) => (
                <tr key={coupon.id}><td><strong>{coupon.code}</strong></td><td>{coupon.userName || coupon.userEmail}<br /><span className="muted-text small">{coupon.userEmail}</span></td><td>{centsToCurrency(coupon.amountCents)}</td><td>{couponStatusLabel[coupon.status]}</td><td>{coupon.drawnAt ? formatDateBR(coupon.drawnAt) : '-'}</td><td>{formatDateBR(coupon.createdAt)}</td></tr>
              ))}</tbody>
            </table>
          </div>
        </section>
      ) : null}

      {activeTab === 'prizes' ? (
        <section className="cashback-prizes-layout">
          <form className="card cashback-prize-form" onSubmit={handleCreateCampaign}>
            <header className="card-header"><h2><Trophy size={16} /> Nova campanha</h2></header>
            <label className="form-field"><span>Título</span><input value={campaignForm.title} onChange={(event) => setCampaignForm({ ...campaignForm, title: event.target.value })} placeholder="Sorteio Restitua" /></label>
            <label className="form-field"><span>Subtítulo</span><input value={campaignForm.subtitle} onChange={(event) => setCampaignForm({ ...campaignForm, subtitle: event.target.value })} placeholder="Acumule cupons e concorra" /></label>
            <label className="form-field"><span>Observações</span><textarea value={campaignForm.notes} onChange={(event) => setCampaignForm({ ...campaignForm, notes: event.target.value })} placeholder="Regulamento resumido ou observação interna." /></label>
            <label className="checkbox-line"><input type="checkbox" checked={campaignForm.isActive} onChange={(event) => setCampaignForm({ ...campaignForm, isActive: event.target.checked })} /> Publicar como campanha ativa</label>
            <label className="form-field legal-file-field"><span>Banner/flyer</span><input type="file" onChange={handleCampaignFileChange} accept=".jpg,.jpeg,.png,.webp,.heic" /><small className="muted-text">Imagem até 10 MB.</small></label>
            <button className="btn btn-primary" disabled={createCampaignMutation.isPending}>{createCampaignMutation.isPending ? 'Criando...' : 'Criar campanha'}</button>
          </form>

          <div className="cashback-campaign-list">
            {(campaignsQuery.data ?? []).map((campaign: CashbackPrizeCampaign) => (
              <article className="card cashback-campaign-card" key={campaign.id}>
                {campaign.bannerUrl ? <img src={campaign.bannerUrl} alt={campaign.title} loading="lazy" /> : <div className="cashback-campaign-placeholder"><Gift size={28} /></div>}
                <div className="cashback-campaign-body">
                  <div className="audit-ticket-row">
                    <div><h3>{campaign.title}</h3><p className="muted-text small">{campaign.subtitle}</p></div>
                    <span className={`pill ${campaign.isActive ? 'pill-success' : 'pill-user'}`}>{campaign.isActive ? 'Ativa' : 'Inativa'}</span>
                  </div>
                  {campaign.winningCouponCode ? <p className="muted-text small">Cupom sorteado: <strong>{campaign.winningCouponCode}</strong> • {campaign.winnerUserEmail}</p> : null}
                  <div className="reviews-filters cashback-winner-row">
                    <label className="form-field compact-field"><span>Cupom vencedor</span><input value={winnerByCampaign[campaign.id] || ''} onChange={(event) => setWinnerByCampaign({ ...winnerByCampaign, [campaign.id]: event.target.value.toUpperCase() })} placeholder="RST-2026-XXXX" /></label>
                    <button className="btn btn-primary" disabled={!winnerByCampaign[campaign.id] || publishWinnerMutation.isPending} onClick={() => publishWinnerMutation.mutate({ campaignId: campaign.id, couponCode: winnerByCampaign[campaign.id] })}><Trophy size={16} /> Publicar sorteado</button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
