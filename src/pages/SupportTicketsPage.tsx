import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, MessageCircle, RefreshCcw, Search, Send } from 'lucide-react';

import { api } from '../api/client';
import { formatDateBR } from '../lib/format';
import type { SupportTicket, SupportTicketStatus } from '../types/api';

const statusLabel: Record<SupportTicketStatus, string> = {
  nao_respondido: 'Não respondido',
  em_curso: 'Em curso',
  finalizado: 'Finalizado',
};

const statusClass: Record<SupportTicketStatus, string> = {
  nao_respondido: 'pill-user',
  em_curso: 'pill-admin',
  finalizado: 'pill-success',
};

const toErrorMessage = (error: unknown, fallback: string) => {
  if (typeof error === 'object' && error && 'message' in error) {
    const value = (error as { message?: unknown }).message;
    if (typeof value === 'string') return value;
  }
  return fallback;
};

export function SupportTicketsPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<'all' | SupportTicketStatus>('all');
  const [search, setSearch] = useState('');
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [replyMessage, setReplyMessage] = useState('');

  const ticketsQuery = useQuery({
    queryKey: ['admin-support-tickets', statusFilter, search],
    queryFn: () => api.admin.listSupportTickets({
      status: statusFilter === 'all' ? undefined : statusFilter,
      search: search || undefined,
    }),
  });

  const selectedTicketQuery = useQuery({
    queryKey: ['admin-support-ticket', selectedTicket?.id],
    queryFn: () => api.admin.getSupportTicket(selectedTicket!.id),
    enabled: Boolean(selectedTicket?.id),
  });

  const activeTicket = selectedTicketQuery.data ?? selectedTicket;
  const canReply = activeTicket && activeTicket.status !== 'finalizado';

  const lastMessage = useMemo(() => {
    const messages = activeTicket?.messages ?? [];
    return messages[messages.length - 1];
  }, [activeTicket]);

  const replyMutation = useMutation({
    mutationFn: () => {
      if (!activeTicket) throw new Error('Selecione um atendimento.');
      if (!replyMessage.trim()) throw new Error('Digite uma resposta.');
      return api.admin.replySupportTicket(activeTicket.id, { message: replyMessage.trim() });
    },
    onSuccess: (ticket) => {
      setSelectedTicket(ticket);
      setReplyMessage('');
      queryClient.invalidateQueries({ queryKey: ['admin-support-tickets'] });
      queryClient.invalidateQueries({ queryKey: ['admin-support-ticket', ticket.id] });
    },
    onError: (error) => window.alert(toErrorMessage(error, 'Não foi possível responder o atendimento.')),
  });

  const finalizeMutation = useMutation({
    mutationFn: () => {
      if (!activeTicket) throw new Error('Selecione um atendimento.');
      return api.admin.finalizeSupportTicket(activeTicket.id);
    },
    onSuccess: (ticket) => {
      setSelectedTicket(ticket);
      queryClient.invalidateQueries({ queryKey: ['admin-support-tickets'] });
      queryClient.invalidateQueries({ queryKey: ['admin-support-ticket', ticket.id] });
    },
    onError: (error) => window.alert(toErrorMessage(error, 'Não foi possível finalizar o atendimento.')),
  });

  return (
    <div className="dashboard-container">
      <header className="dashboard-header card">
        <div>
          <p className="eyebrow">Premium</p>
          <h1>Suporte ao Cliente</h1>
          <p className="muted-text">Gerencie conversas de suporte premium, responda clientes e finalize atendimentos.</p>
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
              <option value="nao_respondido">Não respondidos</option>
              <option value="em_curso">Em curso</option>
              <option value="finalizado">Finalizados</option>
            </select>
          </label>

          <label className="search-wrap audit-search">
            <Search size={16} />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nome ou e-mail" />
          </label>
        </div>
      </section>

      <section className="support-layout">
        <div className="support-ticket-list">
          {(ticketsQuery.data ?? []).map((ticket) => {
            const preview = ticket.messages[ticket.messages.length - 1]?.body || 'Sem mensagens';

            return (
              <button
                key={ticket.id}
                className={`card support-ticket-card${activeTicket?.id === ticket.id ? ' selected' : ''}`}
                onClick={() => {
                  setSelectedTicket(ticket);
                  setReplyMessage('');
                }}
              >
                <div className="support-ticket-row">
                  <strong>{ticket.userName || ticket.userEmail}</strong>
                  <span className={`pill ${statusClass[ticket.status]}`}>{statusLabel[ticket.status]}</span>
                </div>
                <p className="muted-text small">{ticket.userEmail}</p>
                <p className="support-ticket-preview">{preview}</p>
                <p className="muted-text small">Última atualização: {formatDateBR(ticket.lastMessageAt)}</p>
              </button>
            );
          })}

          {!ticketsQuery.isLoading && (ticketsQuery.data ?? []).length === 0 ? (
            <article className="card empty-card">
              <MessageCircle size={22} />
              <p>Nenhum atendimento encontrado.</p>
            </article>
          ) : null}
        </div>

        <article className="card support-detail-card">
          {activeTicket ? (
            <>
              <header className="support-detail-header">
                <div>
                  <p className="eyebrow">Atendimento</p>
                  <h2>{activeTicket.userName || activeTicket.userEmail}</h2>
                  <p className="muted-text small">{activeTicket.userEmail}</p>
                  {lastMessage ? <p className="muted-text small">Última mensagem: {formatDateBR(lastMessage.createdAt)}</p> : null}
                </div>
                <span className={`pill ${statusClass[activeTicket.status]}`}>{statusLabel[activeTicket.status]}</span>
              </header>

              <div className="support-messages">
                {activeTicket.messages.map((message, index) => (
                  <div
                    key={`${message.createdAt}-${index}`}
                    className={`support-message ${message.sender === 'admin' ? 'admin' : 'user'}`}
                  >
                    <div className="support-message-meta">
                      <strong>{message.sender === 'admin' ? 'Suporte Restitua' : activeTicket.userName || activeTicket.userEmail}</strong>
                      <span>{formatDateBR(message.createdAt)}</span>
                    </div>
                    <p>{message.body}</p>
                  </div>
                ))}
              </div>

              {canReply ? (
                <section className="support-reply-box">
                  <label className="form-field">
                    <span>Responder atendimento</span>
                    <textarea
                      value={replyMessage}
                      onChange={(event) => setReplyMessage(event.target.value)}
                      placeholder="Digite sua resposta para o cliente..."
                      maxLength={4000}
                    />
                  </label>
                  <div className="support-actions-row">
                    <button className="btn btn-primary" disabled={replyMutation.isPending} onClick={() => replyMutation.mutate()}>
                      <Send size={16} /> {replyMutation.isPending ? 'Enviando...' : 'Responder'}
                    </button>
                    <button className="btn btn-outline" disabled={finalizeMutation.isPending} onClick={() => finalizeMutation.mutate()}>
                      <CheckCircle2 size={16} /> Finalizar atendimento
                    </button>
                  </div>
                </section>
              ) : (
                <section className="support-reply-box">
                  <p className="muted-text">Atendimento finalizado por {activeTicket.finalizedBy || '-'} em {formatDateBR(activeTicket.finalizedAt)}.</p>
                </section>
              )}
            </>
          ) : (
            <div className="empty-card">
              <MessageCircle size={24} />
              <p>Selecione um atendimento para responder.</p>
            </div>
          )}
        </article>
      </section>
    </div>
  );
}
