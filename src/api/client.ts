import type {
  AdminOverview,
  AdminUserFilters,
  AuditNotaFiscal,
  AuditTicket,
  AuditTicketStatus,
  AppReviewsListResponse,
  AuthUser,
  BillingCoupon,
  BillingOverview,
  BillingTransaction,
  BillingWebhookLog,
  LegalModel,
  LoginResponse,
  SubscriptionPlan,
  SupportTicket,
  SupportTicketStatus,
  PaginatedResponse,
  UsersListResponse,
} from '../types/api';
import { clearTokens, request, requestBlob, requestFormData, setTokens } from './http';

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

    updateUserPlan(id: string, payload: { plan: SubscriptionPlan }) {
      return request<AuthUser>(`/admin/painel/users/${id}/plan`, {
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

    listLegalModels() {
      return request<LegalModel[]>('/admin/painel/legal-models');
    },

    createLegalModel(payload: { title: string; description: string; file: File }) {
      const form = new FormData();
      form.append('title', payload.title);
      form.append('description', payload.description);
      form.append('file', payload.file);

      return requestFormData<LegalModel>('/admin/painel/legal-models', {
        method: 'POST',
        body: form,
      });
    },

    updateLegalModel(id: string, payload: { title: string; description: string; isActive: boolean; file?: File | null }) {
      const form = new FormData();
      form.append('title', payload.title);
      form.append('description', payload.description);
      form.append('isActive', String(payload.isActive));
      if (payload.file) {
        form.append('file', payload.file);
      }

      return requestFormData<LegalModel>(`/admin/painel/legal-models/${id}`, {
        method: 'PATCH',
        body: form,
      });
    },

    deleteLegalModel(id: string) {
      return request<{ success: boolean }>(`/admin/painel/legal-models/${id}`, {
        method: 'DELETE',
      });
    },

    listAuditTickets(query: { status?: AuditTicketStatus; search?: string }) {
      return request<AuditTicket[]>('/admin/painel/audit-tickets', { query });
    },

    getAuditTicket(id: string) {
      return request<AuditTicket>(`/admin/painel/audit-tickets/${id}`);
    },

    startAuditAnalysis(id: string) {
      return request<AuditTicket>(`/admin/painel/audit-tickets/${id}/start-analysis`, {
        method: 'PATCH',
      });
    },

    listAuditTicketNotas(id: string, query: { startDate: string; endDate: string }) {
      return request<AuditNotaFiscal[]>(`/admin/painel/audit-tickets/${id}/notas`, { query });
    },

    completeAuditTicket(id: string, payload: { analysisRangeStart?: string; analysisRangeEnd?: string; observations?: string; file: File }) {
      const form = new FormData();
      if (payload.analysisRangeStart) form.append('analysisRangeStart', payload.analysisRangeStart);
      if (payload.analysisRangeEnd) form.append('analysisRangeEnd', payload.analysisRangeEnd);
      if (payload.observations) form.append('observations', payload.observations);
      form.append('file', payload.file);

      return requestFormData<AuditTicket>(`/admin/painel/audit-tickets/${id}/complete`, {
        method: 'POST',
        body: form,
      });
    },



    billingOverview() {
      return request<BillingOverview>('/billing/admin/overview');
    },

    listBillingTransactions(query: { page: number; limit: number; search?: string; plan?: 'basic' | 'premium'; status?: string }) {
      return request<PaginatedResponse<BillingTransaction>>('/billing/admin/transactions', { query });
    },

    listBillingCoupons(query: { page: number; limit: number; search?: string; status?: string }) {
      return request<PaginatedResponse<BillingCoupon>>('/billing/admin/coupons', { query });
    },

    createBillingCoupon(payload: { code: string; discountKind: 'PERCENTAGE' | 'FIXED'; discount: number; maxRedemptions?: number; expiresAt?: string; providerCouponId?: string; useProviderCoupon?: boolean; notes?: string }) {
      return request<BillingCoupon>('/billing/admin/coupons', {
        method: 'POST',
        body: payload,
      });
    },

    updateBillingCoupon(id: string, payload: Partial<{ code: string; discountKind: 'PERCENTAGE' | 'FIXED'; discount: number; maxRedemptions: number; expiresAt: string; providerCouponId: string; useProviderCoupon: boolean; notes: string; isActive: boolean }>) {
      return request<BillingCoupon>(`/billing/admin/coupons/${id}`, {
        method: 'PATCH',
        body: payload,
      });
    },

    listBillingWebhookLogs(query: { page: number; limit: number; search?: string; status?: string }) {
      return request<PaginatedResponse<BillingWebhookLog>>('/billing/admin/webhook-logs', { query });
    },

    listSupportTickets(query: { status?: SupportTicketStatus; search?: string }) {
      return request<SupportTicket[]>('/admin/painel/support-tickets', { query });
    },

    getSupportTicket(id: string) {
      return request<SupportTicket>(`/admin/painel/support-tickets/${id}`);
    },

    replySupportTicket(id: string, payload: { message: string }) {
      return request<SupportTicket>(`/admin/painel/support-tickets/${id}/reply`, {
        method: 'POST',
        body: payload,
      });
    },

    finalizeSupportTicket(id: string) {
      return request<SupportTicket>(`/admin/painel/support-tickets/${id}/finalize`, {
        method: 'PATCH',
      });
    },
  },
};
