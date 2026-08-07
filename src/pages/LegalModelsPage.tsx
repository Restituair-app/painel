import { ChangeEvent, FormEvent, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, Eye, FileText, Pencil, Plus, RefreshCcw, Trash2 } from 'lucide-react';

import { api } from '../api/client';
import { formatDateBR } from '../lib/format';
import type { LegalModel } from '../types/api';

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

const formatBytes = (value: number) => {
  if (!Number.isFinite(value) || value <= 0) return '0 KB';
  if (value >= 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.ceil(value / 1024)} KB`;
};

const toErrorMessage = (error: unknown, fallback: string) => {
  if (typeof error === 'object' && error && 'message' in error) {
    const value = (error as { message?: unknown }).message;
    if (typeof value === 'string') return value;
  }
  return fallback;
};

type FormState = {
  title: string;
  description: string;
  isActive: boolean;
  file: File | null;
};

const initialForm: FormState = {
  title: '',
  description: '',
  isActive: true,
  file: null,
};

export function LegalModelsPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState>(initialForm);
  const [editing, setEditing] = useState<LegalModel | null>(null);

  const legalModelsQuery = useQuery({
    queryKey: ['admin-legal-models'],
    queryFn: () => api.admin.listLegalModels(),
  });

  const sortedModels = useMemo(() => legalModelsQuery.data ?? [], [legalModelsQuery.data]);

  const saveMutation = useMutation({
    mutationFn: () => {
      if (editing) {
        return api.admin.updateLegalModel(editing.id, form);
      }

      if (!form.file) {
        throw new Error('Selecione o arquivo do modelo jurídico.');
      }

      return api.admin.createLegalModel({
        title: form.title,
        description: form.description,
        file: form.file,
      });
    },
    onSuccess: () => {
      setForm(initialForm);
      setEditing(null);
      queryClient.invalidateQueries({ queryKey: ['admin-legal-models'] });
      window.alert(editing ? 'Modelo atualizado com sucesso.' : 'Modelo criado com sucesso.');
    },
    onError: (error) => {
      window.alert(toErrorMessage(error, 'Não foi possível salvar o modelo jurídico.'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.admin.deleteLegalModel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-legal-models'] });
      window.alert('Modelo removido com sucesso.');
    },
    onError: (error) => {
      window.alert(toErrorMessage(error, 'Não foi possível remover o modelo jurídico.'));
    },
  });

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;

    if (file && file.size > MAX_FILE_SIZE_BYTES) {
      window.alert('O arquivo deve ter no máximo 10 MB.');
      event.target.value = '';
      setForm((current) => ({ ...current, file: null }));
      return;
    }

    setForm((current) => ({ ...current, file }));
  };

  const startEdit = (model: LegalModel) => {
    setEditing(model);
    setForm({
      title: model.title,
      description: model.description,
      isActive: model.isActive,
      file: null,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditing(null);
    setForm(initialForm);
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();

    if (!form.title.trim() || !form.description.trim()) {
      window.alert('Informe título e descrição.');
      return;
    }

    saveMutation.mutate();
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header card">
        <div>
          <p className="eyebrow">Premium</p>
          <h1>Modelos Jurídicos</h1>
          <p className="muted-text">Cadastre arquivos, títulos e descrições para assinantes Premium.</p>
        </div>

        <button className="btn btn-secondary" onClick={() => legalModelsQuery.refetch()} disabled={legalModelsQuery.isFetching}>
          <RefreshCcw size={16} /> Atualizar
        </button>
      </header>

      <section className="card legal-model-form-card">
        <div className="card-header">
          <h2><Plus size={17} /> {editing ? 'Editar modelo' : 'Novo modelo'}</h2>
          {editing ? <button className="btn btn-outline" onClick={cancelEdit}>Cancelar edição</button> : null}
        </div>

        <form className="legal-model-form" onSubmit={handleSubmit}>
          <label className="form-field">
            <span>Título</span>
            <input
              value={form.title}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
              placeholder="Ex: Modelo de requerimento administrativo"
              maxLength={140}
            />
          </label>

          <label className="form-field">
            <span>Descrição</span>
            <textarea
              value={form.description}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              placeholder="Explique quando o usuário deve usar este modelo."
              maxLength={1200}
            />
          </label>

          <div className="legal-form-bottom-row">
            <label className="form-field legal-file-field">
              <span>{editing ? 'Novo anexo (opcional)' : 'Anexo'}</span>
              <input type="file" onChange={handleFileChange} accept=".pdf,.doc,.docx,.odt,.jpg,.jpeg,.png,.webp,.heic,.heif" />
              <small className="muted-text">PDF, DOC, DOCX, ODT ou imagem até 10 MB.</small>
            </label>

            {editing ? (
              <label className="checkbox-line legal-active-check">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked }))}
                />
                Ativo para usuários Premium
              </label>
            ) : null}
          </div>

          <button className="btn btn-primary" type="submit" disabled={saveMutation.isPending}>
            <FileText size={16} /> {saveMutation.isPending ? 'Salvando...' : editing ? 'Salvar alterações' : 'Criar modelo'}
          </button>
        </form>
      </section>

      <section className="legal-models-grid">
        {sortedModels.map((model) => (
          <article key={model.id} className={`card legal-model-card${!model.isActive ? ' legal-model-card-disabled' : ''}`}>
            <header className="legal-model-card-header">
              <div className="legal-model-icon"><FileText size={20} /></div>
              <div>
                <h2>{model.title}</h2>
                <p className="muted-text small">{model.fileName} • {formatBytes(model.size)}</p>
              </div>
              <span className={`pill ${model.isActive ? 'pill-user' : 'pill-admin'}`}>{model.isActive ? 'Ativo' : 'Inativo'}</span>
            </header>

            <p className="legal-model-description">{model.description}</p>
            <p className="muted-text small">Criado em {formatDateBR(model.createdAt)} por {model.createdBy}</p>

            <div className="actions-inline legal-model-actions">
              <a className="btn btn-outline" href={model.fileUrl} target="_blank" rel="noreferrer">
                <Eye size={16} /> Ver
              </a>
              <a className="btn btn-outline" href={model.fileUrl} download={model.fileName}>
                <Download size={16} /> Baixar
              </a>
              <button className="btn btn-secondary" onClick={() => startEdit(model)}>
                <Pencil size={16} /> Editar
              </button>
              <button
                className="btn btn-danger"
                onClick={() => {
                  if (window.confirm('Remover este modelo jurídico?')) {
                    deleteMutation.mutate(model.id);
                  }
                }}
                disabled={deleteMutation.isPending}
              >
                <Trash2 size={16} /> Remover
              </button>
            </div>
          </article>
        ))}

        {!legalModelsQuery.isLoading && sortedModels.length === 0 ? (
          <article className="card empty-card">
            <FileText size={22} />
            <p>Nenhum modelo jurídico cadastrado ainda.</p>
          </article>
        ) : null}
      </section>
    </div>
  );
}
