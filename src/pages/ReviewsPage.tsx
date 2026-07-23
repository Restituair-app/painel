import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Mail, MessageSquareText, RefreshCcw, Star } from 'lucide-react';

import { api } from '../api/client';
import { formatDateBR } from '../lib/format';

const toErrorMessage = (error: unknown, fallback: string) => {
  if (typeof error === 'object' && error && 'message' in error) {
    const value = (error as { message?: unknown }).message;
    if (typeof value === 'string') {
      return value;
    }
  }

  return fallback;
};

const Stars = ({ rating }: { rating: number }) => (
  <span className="stars-inline" aria-label={`${rating} estrelas`}>
    {Array.from({ length: 5 }).map((_, index) => (
      <Star key={index} size={15} fill={index < rating ? 'currentColor' : 'none'} />
    ))}
  </span>
);

export function ReviewsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [ratingFilter, setRatingFilter] = useState<'all' | '1' | '2' | '3' | '4' | '5'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [replyByReview, setReplyByReview] = useState<Record<string, string>>({});
  const [busyReviewId, setBusyReviewId] = useState<string | null>(null);

  const reviewsQuery = useQuery({
    queryKey: ['admin-app-reviews', page, ratingFilter, startDate, endDate],
    queryFn: () =>
      api.admin.listAppReviews({
        page,
        limit: 10,
        rating: ratingFilter === 'all' ? undefined : Number(ratingFilter),
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      }),
    placeholderData: (previousData) => previousData,
  });

  const replyMutation = useMutation({
    mutationFn: (args: { id: string; message: string }) => api.admin.replyAppReview(args.id, { message: args.message }),
    onSuccess: (_data, variables) => {
      setReplyByReview((current) => ({ ...current, [variables.id]: '' }));
      queryClient.invalidateQueries({ queryKey: ['admin-app-reviews'] });
      window.alert('Resposta enviada com sucesso.');
    },
    onError: (error) => {
      window.alert(toErrorMessage(error, 'Não foi possível responder a avaliação.'));
    },
    onSettled: () => {
      setBusyReviewId(null);
    },
  });

  const total = reviewsQuery.data?.total ?? 0;
  const limit = reviewsQuery.data?.limit ?? 10;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const handleReply = (id: string) => {
    const message = (replyByReview[id] || '').trim();

    if (message.length < 3) {
      window.alert('Escreva uma resposta antes de enviar.');
      return;
    }

    setBusyReviewId(id);
    replyMutation.mutate({ id, message });
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header card">
        <div>
          <p className="eyebrow">Feedback</p>
          <h1>Avaliações do App</h1>
          <p className="muted-text">Consulte avaliações da collection appreviews e responda usuários por e-mail.</p>
        </div>

        <button className="btn btn-secondary" onClick={() => reviewsQuery.refetch()} disabled={reviewsQuery.isFetching}>
          <RefreshCcw size={16} /> Atualizar
        </button>
      </header>

      <section className="card filters-card">
        <div className="reviews-filters">
          <label className="select-inline" aria-label="Filtrar por rating">
            <span>Rating</span>
            <select
              value={ratingFilter}
              onChange={(event) => {
                setRatingFilter(event.target.value as typeof ratingFilter);
                setPage(1);
              }}
            >
              <option value="all">Todos</option>
              <option value="5">5 estrelas</option>
              <option value="4">4 estrelas</option>
              <option value="3">3 estrelas</option>
              <option value="2">2 estrelas</option>
              <option value="1">1 estrela</option>
            </select>
          </label>

          <label className="form-field compact-field">
            <span>Data inicial</span>
            <input
              type="date"
              value={startDate}
              onChange={(event) => {
                setStartDate(event.target.value);
                setPage(1);
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
                setPage(1);
              }}
            />
          </label>
        </div>
      </section>

      <section className="reviews-list">
        {(reviewsQuery.data?.items ?? []).map((review) => {
          const isBusy = replyMutation.isPending && busyReviewId === review.id;

          return (
            <article key={review.id} className="card review-card">
              <header className="review-header">
                <div>
                  <p className="row-title">{review.email}</p>
                  <p className="muted-text small">{formatDateBR(review.createdAt)} • {review.source}</p>
                </div>
                <Stars rating={review.rating} />
              </header>

              <p className="review-comment">{review.comment || 'Sem comentário.'}</p>

              {review.tags.length > 0 && (
                <div className="tags-row">
                  {review.tags.map((tag) => (
                    <span key={tag} className="pill pill-user">{tag}</span>
                  ))}
                </div>
              )}

              {review.replies.length > 0 && (
                <div className="reply-history">
                  <strong>Respostas enviadas</strong>
                  {review.replies.map((reply, index) => (
                    <p key={`${reply.sentAt}-${index}`} className="muted-text small">
                      {formatDateBR(reply.sentAt)} por {reply.sentBy}: {reply.message}
                    </p>
                  ))}
                </div>
              )}

              <div className="reply-box">
                <label className="form-field">
                  <span>Responder por e-mail</span>
                  <textarea
                    value={replyByReview[review.id] || ''}
                    onChange={(event) => setReplyByReview((current) => ({ ...current, [review.id]: event.target.value }))}
                    placeholder="Escreva a resposta que será enviada para o e-mail do usuário..."
                  />
                </label>
                <button className="btn btn-primary" onClick={() => handleReply(review.id)} disabled={isBusy}>
                  <Mail size={16} /> {isBusy ? 'Enviando...' : 'Enviar resposta'}
                </button>
              </div>
            </article>
          );
        })}

        {!reviewsQuery.isLoading && (reviewsQuery.data?.items ?? []).length === 0 && (
          <article className="card empty-card">
            <MessageSquareText size={22} />
            <p>Nenhuma avaliação encontrada para os filtros selecionados.</p>
          </article>
        )}
      </section>

      <footer className="users-footer card">
        <p className="muted-text small">{total} avaliação(ões) encontradas</p>
        <div className="pager-wrap">
          <button className="btn btn-outline" onClick={() => setPage((prev) => Math.max(1, prev - 1))} disabled={page <= 1}>
            Anterior
          </button>
          <span className="muted-text small">Página {page} de {totalPages}</span>
          <button className="btn btn-outline" onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))} disabled={page >= totalPages}>
            Próxima
          </button>
        </div>
      </footer>
    </div>
  );
}
