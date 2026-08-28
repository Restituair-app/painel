export type UserRole = 'admin' | 'user';
export type SubscriptionPlan = 'free' | 'basic' | 'premium';

export type AuthUser = {
  id: string;
  email: string;
  name?: string | null;
  full_name?: string | null;
  nome_completo?: string | null;
  cpf?: string | null;
  celular?: string | null;
  cadastro_completo: boolean;
  role: UserRole;
  isActive: boolean;
  isPremium?: boolean;
  premiumPlan?: string | null;
  premiumSince?: string | null;
  premiumExpiresAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  created_date?: string;
  updated_date?: string;
};

export type LoginResponse = {
  user: AuthUser;
  tokens: {
    accessToken: string;
    refreshToken: string;
    accessTokenExpiresIn: string;
    refreshTokenExpiresIn: string;
  };
};

export type CategoriaResumo = {
  categoria: string;
  totalNotas: number;
  totalValor: number;
  percentualValor: number;
};

export type MensalResumo = {
  mes: string;
  totalNotas: number;
  totalValor: number;
};

export type TopUsuario = {
  email: string;
  totalNotas: number;
  totalValor: number;
};

export type NotaRecente = {
  id: string;
  created_by: string;
  estabelecimento: string | null;
  categoria: string;
  valor_total: number;
  data_emissao: string;
  createdAt: string;
};

export type AiMensalResumo = {
  mes: string;
  requests: number;
  totalTokens: number;
  custoUsd: number;
};

export type AdminOverview = {
  generatedAt: string;
  scopeYear: string;
  users: {
    total: number;
    active: number;
    admins: number;
    cadastroCompleto: number;
    percentualCadastroCompleto: number;
    novosNoAno: number;
  };
  notas: {
    total: number;
    totalValor: number;
    ticketMedio: number;
    totalNoAno: number;
    valorNoAno: number;
    ticketMedioNoAno: number;
    dedutiveisValor: number;
    naoDedutiveisValor: number;
  };
  categorias: CategoriaResumo[];
  mensal: MensalResumo[];
  topUsuarios: TopUsuario[];
  ia: {
    requestsTotal: number;
    requestsNoAno: number;
    tokensTotal: number;
    tokensNoAno: number;
    custoUsdTotal: number;
    custoUsdNoAno: number;
    mediaTokensPorRequestNoAno: number;
  };
  iaMensal: AiMensalResumo[];
  recentes: NotaRecente[];
};

export type UsersListResponse = {
  items: AuthUser[];
  total: number;
  page: number;
  limit: number;
};

export type AdminUserFilters = {
  page: number;
  limit: number;
  search?: string;
  role?: UserRole;
  isPremium?: 'true' | 'false';
  startDate?: string;
  endDate?: string;
};

export type AppReviewReply = {
  message: string;
  sentAt: string;
  sentBy: string;
};

export type AppReview = {
  id: string;
  userId: string;
  email: string;
  rating: number;
  comment?: string | null;
  source: 'mobile_app';
  tags: string[];
  replies: AppReviewReply[];
  createdAt: string;
  updatedAt: string;
};

export type AppReviewsListResponse = {
  items: AppReview[];
  total: number;
  page: number;
  limit: number;
};

export type LegalModel = {
  id: string;
  title: string;
  description: string;
  fileUrl: string;
  fileKey: string;
  fileName: string;
  mimeType: string;
  size: number;
  isActive: boolean;
  createdBy: string;
  updatedBy?: string | null;
  createdAt: string;
  updatedAt: string;
  expiresInSeconds?: number | null;
};

export type AuditTicketStatus = 'pendente' | 'em_analise' | 'concluido';

export type AuditTicket = {
  id: string;
  userId: string;
  userEmail: string;
  userName?: string | null;
  status: AuditTicketStatus;
  requestedAt: string;
  analysisStartedAt?: string | null;
  completedAt?: string | null;
  analysisRangeStart?: string | null;
  analysisRangeEnd?: string | null;
  reportUrl?: string | null;
  reportKey?: string | null;
  reportFileName?: string | null;
  reportMimeType?: string | null;
  reportSize?: number | null;
  observations?: string | null;
  handledBy?: string | null;
  createdAt: string;
  updatedAt: string;
  expiresInSeconds?: number | null;
};

export type AuditNotaFiscal = {
  id: string;
  created_by: string;
  estabelecimento?: string | null;
  cnpj?: string | null;
  valor_total: number;
  data_emissao: string;
  categoria: string;
  imagem_url?: string | null;
  numero_nota?: string | null;
  itens?: Array<{
    descricao?: string | null;
    quantidade?: number | null;
    valor_unitario?: number | null;
    valor_total?: number | null;
  }>;
  observacoes?: string | null;
  memoria_url?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SupportTicketStatus = 'nao_respondido' | 'em_curso' | 'finalizado';

export type SupportMessage = {
  sender: 'user' | 'admin';
  senderEmail: string;
  body: string;
  createdAt: string;
};

export type SupportTicket = {
  id: string;
  userId: string;
  userEmail: string;
  userName?: string | null;
  status: SupportTicketStatus;
  messages: SupportMessage[];
  lastMessageAt: string;
  firstRespondedAt?: string | null;
  finalizedAt?: string | null;
  finalizedBy?: string | null;
  handledBy?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type BillingOverview = {
  activeSubscriptions: number;
  pendingTransactions: number;
  failedTransactions: number;
  totalCoupons: number;
  recentWebhooks: number;
};

export type BillingTransaction = {
  id: string;
  userId: string;
  userEmail: string;
  plan: 'basic' | 'premium';
  provider: string;
  status: string;
  amount: number;
  discountedAmount: number;
  couponCode?: string | null;
  providerCheckoutId?: string | null;
  providerSubscriptionId?: string | null;
  providerCustomerId?: string | null;
  checkoutUrl?: string | null;
  event?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type BillingCoupon = {
  id: string;
  code: string;
  discountKind: 'PERCENTAGE' | 'FIXED';
  discount: number;
  maxRedemptions: number;
  redeemedCount: number;
  isActive: boolean;
  expiresAt?: string | null;
  providerCouponId?: string | null;
  useProviderCoupon: boolean;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type BillingWebhookLog = {
  id: string;
  provider: string;
  event: string;
  externalEventId?: string | null;
  signatureValid: boolean;
  processed: boolean;
  processingStatus?: string | null;
  errorMessage?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CashbackWithdrawalStatus = 'pendente' | 'em_analise' | 'pagamento_realizado' | 'rejeitado';
export type CashbackCouponStatus = 'ativo' | 'sorteado' | 'expirado';

export type CashbackWithdrawal = {
  id: string;
  userId: string;
  userEmail: string;
  userName?: string | null;
  amountCents: number;
  pixKey: string;
  status: CashbackWithdrawalStatus;
  requestedAt: string;
  analysisStartedAt?: string | null;
  paidAt?: string | null;
  rejectedAt?: string | null;
  handledBy?: string | null;
  proofUrl?: string | null;
  proofKey?: string | null;
  proofFileName?: string | null;
  proofMimeType?: string | null;
  proofSize?: number | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  expiresInSeconds?: number | null;
};

export type CashbackCoupon = {
  id: string;
  code: string;
  userId: string;
  userEmail: string;
  userName?: string | null;
  amountCents: number;
  status: CashbackCouponStatus;
  drawnAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CashbackPrizeCampaign = {
  id: string;
  title: string;
  subtitle: string;
  bannerUrl?: string | null;
  bannerKey?: string | null;
  isActive: boolean;
  winningCouponCode?: string | null;
  winnerUserId?: string | null;
  winnerUserEmail?: string | null;
  winnerUserName?: string | null;
  drawnAt?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  expiresInSeconds?: number | null;
};

export type PaginatedResponse<T> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
};
