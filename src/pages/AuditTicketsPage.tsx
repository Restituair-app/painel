import { ChangeEvent, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Download, Eye, FileSearch, PlayCircle, RefreshCcw, Search } from 'lucide-react';

import { api } from '../api/client';
import { formatCurrencyBRL, formatDateBR } from '../lib/format';
import type { AuditNotaFiscal, AuditTicket, AuditTicketStatus } from '../types/api';

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

const statusLabel: Record<AuditTicketStatus, string> = {
  pendente: 'Pendente',
  em_analise: 'Em análise',
  concluido: 'Concluído',
};

const statusClass: Record<AuditTicketStatus, string> = {
  pendente: 'pill-user',
  em_analise: 'pill-admin',
  concluido: 'pill-success',
};

const toErrorMessage = (error: unknown, fallback: string) => {
  if (typeof error === 'object' && error && 'message' in error) {
    const value = (error as { message?: unknown }).message;
    if (typeof value === 'string') return value;
  }
  return fallback;
};

const isImageUrl = (url?: string | null) => {
  if (!url) return false;
  return /\.(jpg|jpeg|png|webp|gif|heic)(\?|$)/i.test(url);
};

export function AuditTicketsPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<'all' | AuditTicketStatus>('all');
  const [search, setSearch] = useState('');
  const [selectedTicket, setSelectedTicket] = useState<AuditTicket | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchedRange, setSearchedRange] = useState<{ startDate: string; endDate: string } | null>(null);
  const [observations, setObservations] = useState('');
  const [reportFile, setReportFile] = useState<File | null>(null);

  const ticketsQuery = useQuery({
    queryKey: ['admin-audit-tickets', statusFilter, search],
    queryFn: () => api.admin.listAuditTickets({
      status: statusFilter === 'all' ? undefined : statusFilter,
      search: search || undefined,
    }),
  });

  const selectedTicketQuery = useQuery({
    queryKey: ['admin-audit-ticket', selectedTicket?.id],
    queryFn: () => api.admin.getAuditTicket(selectedTicket!.id),
    enabled: Boolean(selectedTicket?.id),
  });

  const activeTicket = selectedTicketQuery.data ?? selectedTicket;
  const canAnalyzeTicket = activeTicket?.status === 'em_analise' || activeTicket?.status === 'concluido';

  const notasQuery = useQuery({
    queryKey: ['admin-audit-ticket-notas', activeTicket?.id, searchedRange?.startDate, searchedRange?.endDate],
    queryFn: () => api.admin.listAuditTicketNotas(activeTicket!.id, {
      startDate: searchedRange!.startDate,
      endDate: searchedRange!.endDate,
    }),
    enabled: Boolean(activeTicket?.id) && canAnalyzeTicket && Boolean(searchedRange),
  });

  const totalNotas = useMemo(
    () => (notasQuery.data ?? []).reduce((sum, nota) => sum + Number(nota.valor_total || 0), 0),
    [notasQuery.data],
  );

  const startMutation = useMutation({
    mutationFn: (id: string) => api.admin.startAuditAnalysis(id),
    onSuccess: (ticket) => {
      setSelectedTicket(ticket);
      queryClient.invalidateQueries({ queryKey: ['admin-audit-tickets'] });
      queryClient.invalidateQueries({ queryKey: ['admin-audit-ticket', ticket.id] });
    },
    onError: (error) => window.alert(toErrorMessage(error, 'Não foi possível iniciar análise.')),
  });

  const completeMutation = useMutation({
    mutationFn: () => {
      if (!activeTicket) throw new Error('Selecione um ticket.');
      if (!searchedRange) throw new Error('Busque as notas por período antes de concluir a auditoria.');
      if (!reportFile) throw new Error('Anexe o relatório final da auditoria.');
      return api.admin.completeAuditTicket(activeTicket.id, {
        analysisRangeStart: searchedRange.startDate,
        analysisRangeEnd: searchedRange.endDate,
        observations: observations || undefined,
        file: reportFile,
      });
    },
    onSuccess: (ticket) => {
      setSelectedTicket(ticket);
      setReportFile(null);
      setObservations('');
      queryClient.invalidateQueries({ queryKey: ['admin-audit-tickets'] });
      queryClient.invalidateQueries({ queryKey: ['admin-audit-ticket', ticket.id] });
      window.alert('Auditoria concluída com sucesso.');
    },
    onError: (error) => window.alert(toErrorMessage(error, 'Não foi possível concluir a auditoria.')),
  });

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;

    if (file && file.size > MAX_FILE_SIZE_BYTES) {
      window.alert('O relatório deve ter no máximo 10 MB.');
      event.target.value = '';
      setReportFile(null);
      return;
    }

    setReportFile(file);
  };

  const handleSelectTicket = (ticket: AuditTicket) => {
    setSelectedTicket(ticket);
    setStartDate(ticket.analysisRangeStart || '');
    setEndDate(ticket.analysisRangeEnd || '');
    setSearchedRange(null);
    setReportFile(null);
    setObservations(ticket.observations || '');
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

    if (
      searchedRange &&
      searchedRange.startDate === nextRange.startDate &&
      searchedRange.endDate === nextRange.endDate
    ) {
      queryClient.invalidateQueries({ queryKey: ['admin-audit-ticket-notas', activeTicket?.id] });
    }
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
              <span>
                {item.quantidade !== null && item.quantidade !== undefined ? `${item.quantidade}x ` : ''}
                {item.valor_total !== null && item.valor_total !== undefined ? formatCurrencyBRL(item.valor_total) : '-'}
              </span>
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
          <p className="eyebrow">Premium</p>
          <h1>Auditoria Trimestral</h1>
          <p className="muted-text">Acompanhe tickets, analise notas por período e anexe o relatório final.</p>
        </div>

        <button className="btn btn-secondary" onClick={() => ticketsQuery.refetch()} disabled={ticketsQuery.isFetching}>
          <RefreshCcw size={16} /> Atualizar
        </button>
      </header>

      <section className="card filters-card">
        <div className="reviews-filters">
          <label className="select-inline" aria-label="Filtrar status">
            <span>Status</span>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}>
              <option value="all">Todos</option>
              <option value="pendente">Pendente</option>
              <option value="em_analise">Em análise</option>
              <option value="concluido">Concluído</option>
            </select>
          </label>

          <label className="search-wrap audit-search">
            <Search size={16} />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nome ou e-mail" />
          </label>
        </div>
      </section>

      <section className="audit-layout">
        <div className="audit-ticket-list">
          {(ticketsQuery.data ?? []).map((ticket) => (
            <button
              key={ticket.id}
              className={`card audit-ticket-card${activeTicket?.id === ticket.id ? ' selected' : ''}`}
              onClick={() => handleSelectTicket(ticket)}
            >
              <div className="audit-ticket-row">
                <strong>{ticket.userName || ticket.userEmail}</strong>
                <span className={`pill ${statusClass[ticket.status]}`}>{statusLabel[ticket.status]}</span>
              </div>
              <p className="muted-text small">{ticket.userEmail}</p>
              <p className="muted-text small">Solicitado em {formatDateBR(ticket.requestedAt)}</p>
            </button>
          ))}

          {!ticketsQuery.isLoading && (ticketsQuery.data ?? []).length === 0 ? (
            <article className="card empty-card">
              <FileSearch size={22} />
              <p>Nenhum ticket encontrado para os filtros selecionados.</p>
            </article>
          ) : null}
        </div>

        <article className="card audit-detail-card">
          {activeTicket ? (
            <>
              <header className="audit-detail-header">
                <div>
                  <p className="eyebrow">Ticket</p>
                  <h2>{activeTicket.userName || activeTicket.userEmail}</h2>
                  <p className="muted-text small">{activeTicket.userEmail}</p>
                </div>
                <span className={`pill ${statusClass[activeTicket.status]}`}>{statusLabel[activeTicket.status]}</span>
              </header>

              <div className="audit-actions-row">
                <button
                  className="btn btn-primary"
                  disabled={activeTicket.status !== 'pendente' || startMutation.isPending}
                  onClick={() => startMutation.mutate(activeTicket.id)}
                >
                  <PlayCircle size={16} /> Iniciar análise
                </button>
                {activeTicket.reportUrl ? (
                  <a className="btn btn-outline" href={activeTicket.reportUrl} target="_blank" rel="noreferrer">
                    <Eye size={16} /> Ver relatório
                  </a>
                ) : null}
                {activeTicket.reportUrl ? (
                  <a className="btn btn-outline" href={activeTicket.reportUrl} download={activeTicket.reportFileName || 'relatorio-auditoria.pdf'}>
                    <Download size={16} /> Baixar
                  </a>
                ) : null}
              </div>

              {canAnalyzeTicket ? (
                <>
                  <section className="audit-range-box">
                    <div className="audit-range-header">
                      <div>
                        <h3>Notas do usuário</h3>
                        <p className="muted-text small">Defina o período e clique em buscar. Nada é carregado automaticamente.</p>
                      </div>
                      <strong>
                        {searchedRange ? `${(notasQuery.data ?? []).length} notas • ${formatCurrencyBRL(totalNotas)}` : 'Aguardando busca'}
                      </strong>
                    </div>
                    <div className="reviews-filters">
                      <label className="form-field compact-field">
                        <span>Data inicial</span>
                        <input
                          type="date"
                          value={startDate}
                          onChange={(event) => {
                            setStartDate(event.target.value);
                            setSearchedRange(null);
                          }}
                        />
                      </label>
                      <label className="form-field compact-field">
                        <span>Data final</span>
                        <input
                          type="date"
                          value={endDate}
                          onChange={(event) => {
                            setEndDate(event.target.value);
                            setSearchedRange(null);
                          }}
                        />
                      </label>
                      <button
                        className="btn btn-primary"
                        disabled={!activeTicket || !canAnalyzeTicket || notasQuery.isFetching}
                        onClick={handleSearchNotas}
                      >
                        <Search size={16} /> {notasQuery.isFetching ? 'Buscando...' : 'Buscar notas'}
                      </button>
                    </div>

                    {searchedRange ? (
                      <div className="audit-notes-table-wrap">
                        <table className="users-table audit-notes-table">
                          <thead>
                            <tr>
                              <th>Data</th>
                              <th>Estabelecimento</th>
                              <th>Categoria</th>
                              <th>Valor</th>
                              <th>CNPJ</th>
                              <th>Número</th>
                              <th>Itens</th>
                              <th>Observações</th>
                              <th>Comprovante</th>
                              <th>Memória</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(notasQuery.data ?? []).map((nota) => (
                              <tr key={nota.id}>
                                <td>{nota.data_emissao}</td>
                                <td>{nota.estabelecimento || '-'}</td>
                                <td>{nota.categoria}</td>
                                <td>{formatCurrencyBRL(nota.valor_total)}</td>
                                <td>{nota.cnpj || '-'}</td>
                                <td>{nota.numero_nota || '-'}</td>
                                <td>{renderNotaItens(nota)}</td>
                                <td className="audit-note-observation">{nota.observacoes || '-'}</td>
                                <td>{renderAttachmentActions('comprovante', nota.imagem_url)}</td>
                                <td>{renderAttachmentActions('memória', nota.memoria_url)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="empty-card audit-search-empty">
                        <Search size={22} />
                        <p>Escolha data inicial e final para carregar as notas deste ticket.</p>
                      </div>
                    )}
                  </section>

                  <section className="audit-complete-box">
                    <h3>Concluir auditoria</h3>
                    <label className="form-field">
                      <span>Observação para o usuário (opcional)</span>
                      <textarea
                        value={observations}
                        onChange={(event) => setObservations(event.target.value)}
                        placeholder="Resumo da análise, pontos de atenção ou instruções para o usuário."
                        maxLength={2000}
                      />
                    </label>
                    <label className="form-field legal-file-field">
                      <span>Relatório final</span>
                      <input type="file" onChange={handleFileChange} accept=".pdf,.doc,.docx,.odt,.jpg,.jpeg,.png,.webp" />
                      <small className="muted-text">PDF, DOC, DOCX, ODT ou imagem até 10 MB.</small>
                    </label>
                    <button
                      className="btn btn-primary"
                      disabled={activeTicket.status === 'concluido' || !searchedRange || completeMutation.isPending}
                      onClick={() => completeMutation.mutate()}
                    >
                      <CheckCircle2 size={16} /> {completeMutation.isPending ? 'Concluindo...' : 'Concluir e anexar relatório'}
                    </button>
                  </section>
                </>
              ) : (
                <section className="audit-range-box">
                  <p className="muted-text">
                    Inicie a análise para carregar as notas do usuário por período e anexar o relatório final.
                  </p>
                </section>
              )}
            </>
          ) : (
            <div className="empty-card">
              <FileSearch size={24} />
              <p>Selecione um ticket para analisar.</p>
            </div>
          )}
        </article>
      </section>
    </div>
  );
}
