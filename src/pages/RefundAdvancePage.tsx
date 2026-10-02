import { ChangeEvent, FormEvent, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, CreditCard, Download, Eye, FileSignature, Landmark, Pencil, PlayCircle, Plus, RefreshCcw, Search, Trash2, Upload } from 'lucide-react';

import { api } from '../api/client';
import { formatCurrencyBRL, formatDateBR } from '../lib/format';
import type { RefundAdvanceModel, RefundAdvanceRequest, RefundAdvanceStatus } from '../types/api';

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const statuses: Record<RefundAdvanceStatus, string> = {
  enviada: 'Enviada', em_analise: 'Em análise', documentacao_pendente: 'Documentação pendente',
  proposta_disponivel: 'Proposta disponível', aguardando_assinatura: 'Aguardando assinatura',
  aguardando_cartao: 'Aguardando cartão', revisao_final: 'Revisão final', aprovada: 'Aprovada',
  pix_realizado: 'Pix realizado', em_pagamento: 'Em pagamento', quitada: 'Quitada',
  rejeitada: 'Rejeitada', cancelada: 'Cancelada',
};
const statusClass = (status: RefundAdvanceStatus) => status === 'rejeitada' || status === 'cancelada' ? 'pill-admin' : status === 'quitada' || status === 'em_pagamento' ? 'pill-success' : 'pill-user';
const money = (cents?: number | null) => formatCurrencyBRL((cents ?? 0) / 100);
const errorMessage = (error: unknown, fallback: string) => typeof error === 'object' && error && 'message' in error && typeof error.message === 'string' ? error.message : fallback;

type ModelForm = { title: string; description: string; type: 'contract' | 'promissory_note'; isActive: boolean; file: File | null };
const emptyModel: ModelForm = { title: '', description: '', type: 'contract', isActive: true, file: null };

export function RefundAdvancePage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'requests' | 'models'>('requests');
  const [status, setStatus] = useState<'all' | RefundAdvanceStatus>('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<RefundAdvanceRequest | null>(null);
  const [documentMessage, setDocumentMessage] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [pixProof, setPixProof] = useState<File | null>(null);
  const [proposal, setProposal] = useState({ advance: '', installments: '', installmentAmount: '', total: '', firstDueDate: '', notes: '' });
  const [modelForm, setModelForm] = useState<ModelForm>(emptyModel);
  const [editingModel, setEditingModel] = useState<RefundAdvanceModel | null>(null);

  const requestsQuery = useQuery({
    queryKey: ['refund-advance-admin', status, search],
    queryFn: () => api.admin.listRefundAdvanceRequests({ status: status === 'all' ? undefined : status, search: search || undefined }),
  });
  const detailQuery = useQuery({
    queryKey: ['refund-advance-admin-detail', selected?.id],
    queryFn: () => api.admin.getRefundAdvanceRequest(selected!.id), enabled: Boolean(selected?.id),
  });
  const active = detailQuery.data ?? selected;
  const modelsQuery = useQuery({ queryKey: ['refund-advance-models-admin'], queryFn: api.admin.listRefundAdvanceModels });

  const refreshRequest = (request: RefundAdvanceRequest) => {
    setSelected(request);
    queryClient.invalidateQueries({ queryKey: ['refund-advance-admin'] });
    queryClient.invalidateQueries({ queryKey: ['refund-advance-admin-detail', request.id] });
  };
  const action = useMutation({
    mutationFn: async ({ kind, id }: { kind: 'start' | 'documents' | 'proposal' | 'approve' | 'reject' | 'pix'; id: string }) => {
      if (kind === 'start') return api.admin.startRefundAdvanceAnalysis(id);
      if (kind === 'documents') {
        if (!documentMessage.trim()) throw new Error('Informe quais documentos são necessários.');
        return api.admin.requestRefundAdvanceDocuments(id, documentMessage.trim());
      }
      if (kind === 'proposal') {
        const values = [proposal.advance, proposal.installments, proposal.installmentAmount, proposal.total];
        if (values.some((value) => !value) || !proposal.firstDueDate) throw new Error('Preencha todos os valores e a primeira data de vencimento.');
        return api.admin.setRefundAdvanceProposal(id, {
          advanceAmountCents: Math.round(Number(proposal.advance.replace(',', '.')) * 100),
          installmentCount: Number(proposal.installments),
          installmentAmountCents: Math.round(Number(proposal.installmentAmount.replace(',', '.')) * 100),
          totalAmountCents: Math.round(Number(proposal.total.replace(',', '.')) * 100),
          firstDueDate: proposal.firstDueDate, notes: proposal.notes || undefined,
        });
      }
      if (kind === 'approve') return api.admin.approveRefundAdvance(id);
      if (kind === 'reject') {
        if (!rejectionReason.trim()) throw new Error('Informe o motivo da rejeição.');
        return api.admin.rejectRefundAdvance(id, rejectionReason.trim());
      }
      if (!pixProof) throw new Error('Anexe o comprovante do Pix.');
      return api.admin.markRefundAdvancePixPaid(id, pixProof);
    },
    onSuccess: (request) => { refreshRequest(request); setDocumentMessage(''); setRejectionReason(''); setPixProof(null); window.alert('Solicitação atualizada.'); },
    onError: (error) => window.alert(errorMessage(error, 'Não foi possível atualizar a solicitação.')),
  });

  const saveModel = useMutation({
    mutationFn: () => {
      if (!modelForm.title.trim() || !modelForm.description.trim()) throw new Error('Informe título e descrição.');
      if (editingModel) return api.admin.updateRefundAdvanceModel(editingModel.id, { ...modelForm, title: modelForm.title.trim(), description: modelForm.description.trim() });
      if (!modelForm.file) throw new Error('Selecione o arquivo do modelo.');
      return api.admin.createRefundAdvanceModel({ ...modelForm, title: modelForm.title.trim(), description: modelForm.description.trim(), file: modelForm.file });
    },
    onSuccess: () => { setEditingModel(null); setModelForm(emptyModel); queryClient.invalidateQueries({ queryKey: ['refund-advance-models-admin'] }); window.alert('Modelo salvo.'); },
    onError: (error) => window.alert(errorMessage(error, 'Não foi possível salvar o modelo.')),
  });
  const deleteModel = useMutation({
    mutationFn: api.admin.deleteRefundAdvanceModel,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['refund-advance-models-admin'] }),
    onError: (error) => window.alert(errorMessage(error, 'Não foi possível excluir o modelo.')),
  });

  const chooseRequest = (request: RefundAdvanceRequest) => {
    setSelected(request);
    setProposal({
      advance: request.advanceAmountCents ? String(request.advanceAmountCents / 100) : '',
      installments: request.installmentCount ? String(request.installmentCount) : '',
      installmentAmount: request.installmentAmountCents ? String(request.installmentAmountCents / 100) : '',
      total: request.totalAmountCents ? String(request.totalAmountCents / 100) : '',
      firstDueDate: request.firstDueDate || '', notes: request.proposalNotes || '',
    });
  };
  const chooseFile = (event: ChangeEvent<HTMLInputElement>, setter: (file: File | null) => void) => {
    const file = event.target.files?.[0] ?? null;
    if (file && file.size > MAX_FILE_SIZE) { window.alert('O arquivo deve ter no máximo 10 MB.'); event.target.value = ''; setter(null); return; }
    setter(file);
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header card">
        <div><p className="eyebrow">Crédito</p><h1>Antecipação de Restituição</h1><p className="muted-text">Analise documentos, formalize propostas e registre a liberação por Pix.</p></div>
        <button className="btn btn-secondary" onClick={() => tab === 'requests' ? requestsQuery.refetch() : modelsQuery.refetch()}><RefreshCcw size={16} /> Atualizar</button>
      </header>

      <div className="advance-tabs" role="tablist">
        <button className={tab === 'requests' ? 'active' : ''} onClick={() => setTab('requests')}><Landmark size={17} /> Solicitações</button>
        <button className={tab === 'models' ? 'active' : ''} onClick={() => setTab('models')}><FileSignature size={17} /> Contratos e promissórias</button>
      </div>

      {tab === 'requests' ? <>
        <section className="card filters-card"><div className="reviews-filters">
          <label className="select-inline"><span>Status</span><select value={status} onChange={(event) => setStatus(event.target.value as typeof status)}><option value="all">Todos</option>{Object.entries(statuses).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label className="search-wrap audit-search"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nome, CPF ou e-mail" /></label>
        </div></section>
        <section className="audit-layout">
          <div className="audit-ticket-list">
            {(requestsQuery.data ?? []).map((request) => <button key={request.id} className={`card audit-ticket-card${active?.id === request.id ? ' selected' : ''}`} onClick={() => chooseRequest(request)}>
              <div className="audit-ticket-row"><strong>{request.userName || request.userEmail}</strong><span className={`pill ${statusClass(request.status)}`}>{statuses[request.status]}</span></div>
              <p className="muted-text small">{request.userEmail} · {request.planAtRequest.toUpperCase()}</p><p className="muted-text small">Enviada em {formatDateBR(request.createdAt)}</p>
            </button>)}
            {!requestsQuery.isLoading && !(requestsQuery.data ?? []).length ? <article className="card empty-card"><Landmark size={22} /><p>Nenhuma solicitação encontrada.</p></article> : null}
          </div>
          <article className="card audit-detail-card">
            {active ? <>
              <header className="audit-detail-header"><div><p className="eyebrow">Solicitante</p><h2>{active.userName || active.userEmail}</h2><p className="muted-text small">{active.userEmail} · CPF {active.userCpf || 'não informado'} · {active.guaranteeType === 'guarantor' ? 'Fiador' : 'Seguro fiança'}</p></div><span className={`pill ${statusClass(active.status)}`}>{statuses[active.status]}</span></header>
              <div className="audit-actions-row"><button className="btn btn-primary" disabled={active.status !== 'enviada' || action.isPending} onClick={() => action.mutate({ kind: 'start', id: active.id })}><PlayCircle size={16} /> Iniciar análise</button>{active.pixProofUrl ? <a className="btn btn-outline" href={active.pixProofUrl} target="_blank" rel="noreferrer"><Eye size={16} /> Comprovante Pix</a> : null}</div>

              <section className="advance-section"><h3>Documentos enviados</h3><div className="advance-documents">{active.documents.map((document) => <a key={document.id} href={document.fileUrl} target="_blank" rel="noreferrer" className="advance-document"><FileSignature size={17} /><span><strong>{document.label}</strong><small>{document.fileName}</small></span><Eye size={15} /></a>)}</div>{!active.documents.length ? <p className="muted-text small">Nenhum documento enviado.</p> : null}</section>

              <section className="advance-section"><h3>Solicitar documentação</h3><textarea value={documentMessage} onChange={(event) => setDocumentMessage(event.target.value)} placeholder="Descreva os documentos que faltam" /><button className="btn btn-outline" disabled={action.isPending} onClick={() => action.mutate({ kind: 'documents', id: active.id })}><Upload size={16} /> Solicitar documentos</button></section>

              <section className="advance-section"><h3>Proposta financeira</h3><div className="advance-proposal-grid">
                <label className="form-field"><span>Valor antecipado (R$)</span><input value={proposal.advance} onChange={(e) => setProposal((v) => ({ ...v, advance: e.target.value }))} inputMode="decimal" /></label>
                <label className="form-field"><span>Parcelas</span><input value={proposal.installments} onChange={(e) => setProposal((v) => ({ ...v, installments: e.target.value }))} type="number" min="1" max="60" /></label>
                <label className="form-field"><span>Valor da parcela (R$)</span><input value={proposal.installmentAmount} onChange={(e) => setProposal((v) => ({ ...v, installmentAmount: e.target.value }))} inputMode="decimal" /></label>
                <label className="form-field"><span>Total contratado (R$)</span><input value={proposal.total} onChange={(e) => setProposal((v) => ({ ...v, total: e.target.value }))} inputMode="decimal" /></label>
                <label className="form-field"><span>Primeiro vencimento</span><input value={proposal.firstDueDate} onChange={(e) => setProposal((v) => ({ ...v, firstDueDate: e.target.value }))} type="date" /></label>
              </div><textarea value={proposal.notes} onChange={(e) => setProposal((v) => ({ ...v, notes: e.target.value }))} placeholder="Observações da proposta (opcional)" /><button className="btn btn-primary" disabled={action.isPending} onClick={() => action.mutate({ kind: 'proposal', id: active.id })}><CreditCard size={16} /> Publicar proposta</button></section>

              {active.advanceAmountCents ? <div className="advance-summary"><span>Antecipação <strong>{money(active.advanceAmountCents)}</strong></span><span>Parcelamento <strong>{active.installmentCount}x de {money(active.installmentAmountCents)}</strong></span><span>Total <strong>{money(active.totalAmountCents)}</strong></span></div> : null}
              <section className="advance-section"><h3>Decisão final</h3><div className="audit-actions-row"><button className="btn btn-primary" disabled={active.status !== 'revisao_final' || action.isPending} onClick={() => action.mutate({ kind: 'approve', id: active.id })}><CheckCircle2 size={16} /> Aprovar</button><input value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} placeholder="Motivo da rejeição" /><button className="btn btn-danger" disabled={action.isPending} onClick={() => action.mutate({ kind: 'reject', id: active.id })}>Rejeitar</button></div></section>
              <section className="advance-section"><h3>Liberação por Pix</h3><input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={(e) => chooseFile(e, setPixProof)} /><button className="btn btn-primary" disabled={active.status !== 'aprovada' || !pixProof || action.isPending} onClick={() => action.mutate({ kind: 'pix', id: active.id })}><Landmark size={16} /> Registrar Pix e iniciar parcelas</button></section>
              <section className="advance-section"><h3>Histórico</h3><div className="advance-timeline">{[...active.timeline].reverse().map((event) => <div key={event.id}><span /><p><strong>{event.title}</strong><small>{formatDateBR(event.occurredAt)} · {event.actor}</small>{event.description ? <em>{event.description}</em> : null}</p></div>)}</div></section>
            </> : <div className="empty-card"><Landmark size={28} /><p>Selecione uma solicitação para analisar.</p></div>}
          </article>
        </section>
      </> : <>
        <section className="card legal-model-form-card"><div className="card-header"><h2><Plus size={17} /> {editingModel ? 'Editar modelo' : 'Novo modelo'}</h2>{editingModel ? <button className="btn btn-outline" onClick={() => { setEditingModel(null); setModelForm(emptyModel); }}>Cancelar</button> : null}</div>
          <form className="legal-model-form" onSubmit={(event: FormEvent) => { event.preventDefault(); saveModel.mutate(); }}>
            <div className="advance-proposal-grid"><label className="form-field"><span>Título</span><input value={modelForm.title} onChange={(e) => setModelForm((v) => ({ ...v, title: e.target.value }))} /></label><label className="form-field"><span>Tipo</span><select value={modelForm.type} onChange={(e) => setModelForm((v) => ({ ...v, type: e.target.value as ModelForm['type'] }))}><option value="contract">Contrato</option><option value="promissory_note">Nota promissória</option></select></label></div>
            <label className="form-field"><span>Descrição</span><textarea value={modelForm.description} onChange={(e) => setModelForm((v) => ({ ...v, description: e.target.value }))} /></label>
            <label className="form-field"><span>{editingModel ? 'Substituir arquivo (opcional)' : 'Arquivo'}</span><input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={(e) => chooseFile(e, (file) => setModelForm((v) => ({ ...v, file })))} /></label>
            {editingModel ? <label className="checkbox-line"><input type="checkbox" checked={modelForm.isActive} onChange={(e) => setModelForm((v) => ({ ...v, isActive: e.target.checked }))} /> Disponível para usuários</label> : null}
            <button className="btn btn-primary" disabled={saveModel.isPending}><FileSignature size={16} /> Salvar modelo</button>
          </form>
        </section>
        <section className="legal-models-grid">{(modelsQuery.data ?? []).map((model) => <article className={`card legal-model-card${model.isActive ? '' : ' legal-model-card-disabled'}`} key={model.id}><header className="legal-model-card-header"><div className="legal-model-icon"><FileSignature size={20} /></div><div><h2>{model.title}</h2><p className="muted-text small">{model.type === 'contract' ? 'Contrato' : 'Nota promissória'} · versão {model.version}</p></div><span className={`pill ${model.isActive ? 'pill-success' : 'pill-admin'}`}>{model.isActive ? 'Ativo' : 'Inativo'}</span></header><p>{model.description}</p><div className="actions-inline legal-model-actions"><a className="btn btn-outline" href={model.fileUrl} target="_blank" rel="noreferrer"><Eye size={16} /> Ver</a><a className="btn btn-outline" href={model.fileUrl} download><Download size={16} /> Baixar</a><button className="btn btn-secondary" onClick={() => { setEditingModel(model); setModelForm({ title: model.title, description: model.description, type: model.type, isActive: model.isActive, file: null }); window.scrollTo({ top: 0, behavior: 'smooth' }); }}><Pencil size={16} /> Editar</button><button className="btn btn-danger" onClick={() => window.confirm('Excluir este modelo?') && deleteModel.mutate(model.id)}><Trash2 size={16} /> Excluir</button></div></article>)}</section>
      </>}
    </div>
  );
}
