import type {
  AdminOverview,
  AdminUserFilters,
  AppReviewsListResponse,
  AuthUser,
  LoginResponse,
  UsersListResponse,
} from '../types/api';
import { clearTokens, request, requestBlob, setTokens } from './http';

export const api = {
  auth: {
    async login(payload: { email: string; password: string }) {
      const response = await request<LoginResponse>('/auth/login', {
        method: 'POST',
        auth: false,
        body: payload,
      });

      setTokens({
        accessToken: response.tokens.accessToken,
        refreshToken: response.tokens.refreshToken,
      });

      return response;
    },

    me() {
      return request<AuthUser>('/auth/me');
    },

    async logout() {
      try {
        await request('/auth/logout', { method: 'POST' });
      } catch (_error) {
        // noop
      } finally {
        clearTokens();
      }
    },
  },

  admin: {
    overview(year: number) {
      return request<AdminOverview>('/admin/painel/overview', {
        query: { year },
      });
    },

    listUsers(query: AdminUserFilters) {
      return request<UsersListResponse>('/admin/painel/users', {
        query,
      });
    },

    exportUsers(query: Omit<AdminUserFilters, 'page' | 'limit'>) {
      return requestBlob('/admin/painel/users/export', {
        query,
      });
    },

    updateUser(id: string, payload: { role?: 'admin' | 'user'; isActive?: boolean }) {
      return request<AuthUser>(`/users/${id}`, {
        method: 'PATCH',
        body: payload,
      });
    },

    deleteUser(id: string) {
      return request<{ success: boolean }>(`/users/${id}`, {
        method: 'DELETE',
      });
    },

    listAppReviews(query: {
      page: number;
      limit: number;
      rating?: number;
      startDate?: string;
      endDate?: string;
    }) {
      return request<AppReviewsListResponse>('/admin/painel/app-reviews', {
        query,
      });
    },

    replyAppReview(id: string, payload: { message: string }) {
      return request<{ success: boolean }>(`/admin/painel/app-reviews/${id}/reply`, {
        method: 'POST',
        body: payload,
      });
    },
  },
};
