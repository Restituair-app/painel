export type UserRole = 'admin' | 'user';

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
