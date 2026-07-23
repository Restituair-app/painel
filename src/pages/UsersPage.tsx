import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, Search, UserCog, UserX } from 'lucide-react';

import { api } from '../api/client';
import { formatDateBR } from '../lib/format';
import type { AuthUser } from '../types/api';

const toErrorMessage = (error: unknown, fallback: string) => {
  if (typeof error === 'object' && error && 'message' in error) {
    const value = (error as { message?: unknown }).message;
    if (typeof value === 'string') {
      return value;
    }
  }

  return fallback;
};

const downloadFile = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

export function UsersPage() {
  const queryClient = useQueryClient();
  const [usersPage, setUsersPage] = useState(1);
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'user'>('all');
  const [premiumFilter, setPremiumFilter] = useState<'all' | 'premium' | 'free'>('all');
  const [searchInput, setSearchInput] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [exportAll, setExportAll] = useState(true);
  const [exportStartDate, setExportStartDate] = useState('');
  const [exportEndDate, setExportEndDate] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchDebounced(searchInput.trim());
      setUsersPage(1);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    setUsersPage(1);
  }, [roleFilter, premiumFilter]);

  const meQuery = useQuery({
    queryKey: ['admin-me'],
    queryFn: api.auth.me,
  });

  const isPremiumQueryValue = useMemo(() => {
    if (premiumFilter === 'premium') {
      return 'true' as const;
    }

    if (premiumFilter === 'free') {
      return 'false' as const;
    }

    return undefined;
  }, [premiumFilter]);

  const usersQuery = useQuery({
    queryKey: ['admin-users', usersPage, roleFilter, premiumFilter, searchDebounced],
    queryFn: () =>
      api.admin.listUsers({
        page: usersPage,
        limit: 10,
        search: searchDebounced || undefined,
        role: roleFilter === 'all' ? undefined : roleFilter,
        isPremium: isPremiumQueryValue,
      }),
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

  const exportMutation = useMutation({
    mutationFn: () =>
      api.admin.exportUsers({
        search: searchDebounced || undefined,
        role: roleFilter === 'all' ? undefined : roleFilter,
        isPremium: isPremiumQueryValue,
        startDate: exportAll ? undefined : exportStartDate || undefined,
        endDate: exportAll ? undefined : exportEndDate || undefined,
      }),
    onSuccess: ({ blob, fileName }) => {
      downloadFile(blob, fileName || 'usuarios-restitua.csv');
    },
    onError: (error) => {
      window.alert(toErrorMessage(error, 'Não foi possível exportar a lista de usuários.'));
    },
  });

  const usersTotal = usersQuery.data?.total ?? 0;
  const usersLimit = usersQuery.data?.limit ?? 10;
  const usersTotalPages = Math.max(1, Math.ceil(usersTotal / usersLimit));
  const isBusyAction = updateUserMutation.isPending || deleteUserMutation.isPending;
  const canExport = exportAll || (Boolean(exportStartDate) && Boolean(exportEndDate));

  const handleToggleRole = (user: Pick<AuthUser, 'id' | 'role' | 'email'>) => {
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

  const handleToggleStatus = (user: Pick<AuthUser, 'id' | 'isActive'>) => {
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

  const handleDeleteUser = (user: Pick<AuthUser, 'id' | 'email'>) => {
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

  const handleExportUsers = () => {
    if (!exportAll && (!exportStartDate || !exportEndDate)) {
      window.alert('Informe data inicial e final ou marque a opção Exportar todos os períodos.');
      return;
    }

    if (!exportAll && exportStartDate > exportEndDate) {
      window.alert('A data inicial não pode ser maior que a data final.');
      return;
    }

    exportMutation.mutate();
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header card">
        <div>
          <p className="eyebrow">Administração</p>
          <h1>Usuários</h1>
          <p className="muted-text">Gerencie contas e exporte contatos para análise operacional.</p>
        </div>
      </header>

      <section className="card export-card">
        <header className="card-header">
          <h2>
            <Download size={16} /> Exportar Excel
          </h2>
          <p className="muted-text small">Arquivo CSV compatível com Excel contendo email, CPF, celular, name e full_name.</p>
        </header>

        <div className="export-grid">
          <label className="checkbox-line">
            <input type="checkbox" checked={exportAll} onChange={(event) => setExportAll(event.target.checked)} />
            Exportar todos os períodos
          </label>

          <label className="form-field compact-field">
            <span>Data inicial</span>
            <input
              type="date"
              value={exportStartDate}
              disabled={exportAll}
              onChange={(event) => setExportStartDate(event.target.value)}
            />
          </label>

          <label className="form-field compact-field">
            <span>Data final</span>
            <input
              type="date"
              value={exportEndDate}
              disabled={exportAll}
              onChange={(event) => setExportEndDate(event.target.value)}
            />
          </label>

          <button className="btn btn-primary" onClick={handleExportUsers} disabled={exportMutation.isPending || !canExport}>
            <Download size={16} /> {exportMutation.isPending ? 'Exportando...' : 'Baixar arquivo'}
          </button>
        </div>
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
                placeholder="Buscar por nome, CPF, celular ou e-mail"
              />
            </label>

            <label className="select-inline" aria-label="Filtrar por perfil">
              <span>Perfil</span>
              <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value as 'all' | 'admin' | 'user')}>
                <option value="all">Todos</option>
                <option value="admin">Admins</option>
                <option value="user">Usuários</option>
              </select>
            </label>

            <label className="select-inline" aria-label="Filtrar por premium">
              <span>Premium</span>
              <select value={premiumFilter} onChange={(event) => setPremiumFilter(event.target.value as 'all' | 'premium' | 'free')}>
                <option value="all">Todos</option>
                <option value="premium">Premium</option>
                <option value="free">Não premium</option>
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
                <th>CPF</th>
                <th>Celular</th>
                <th>Perfil</th>
                <th>Premium</th>
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
                    <td>{user.cpf || '-'}</td>
                    <td>{user.celular || '-'}</td>
                    <td>
                      <span className={`pill ${user.role === 'admin' ? 'pill-admin' : 'pill-user'}`}>{user.role}</span>
                    </td>
                    <td>
                      <span className={user.isPremium ? 'status-active' : 'status-inactive'}>
                        {user.isPremium ? 'Premium' : 'Não'}
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
            <button className="btn btn-outline" onClick={() => setUsersPage((prev) => Math.max(1, prev - 1))} disabled={usersPage <= 1}>
              Anterior
            </button>
            <span className="muted-text small">Página {usersPage} de {usersTotalPages}</span>
            <button className="btn btn-outline" onClick={() => setUsersPage((prev) => Math.min(usersTotalPages, prev + 1))} disabled={usersPage >= usersTotalPages}>
              Próxima
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}
