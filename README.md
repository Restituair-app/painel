# Restitua Painel Admin

Sistema **separado** do frontend de usuários, dedicado à administração do Restitua.

## O que este projeto resolve

- Isola o painel em outra aplicação (`/painel`)
- Remove acoplamento com o app de usuários (`/frontend`)
- Mantém acesso apenas para contas com `role = admin`
- Usa os endpoints admin já existentes no backend

## Stack

- React 18 + TypeScript + Vite
- TanStack React Query
- Recharts (gráficos)
- API REST no backend NestJS (`/api/v1`)

## Rotas

- `/login`: autenticação do painel
- `/painel`: dashboard administrativo (protegido)

## Funcionalidades

- Login admin com JWT (access + refresh)
- Guard de rota por role admin
- Indicadores de usuários, notas e IA
- Gráficos por categoria e evolução mensal
- Gestão de usuários: buscar, filtrar, promover/rebaixar admin, ativar/desativar, excluir

## Variáveis de ambiente

Copie `.env.example` para `.env` e ajuste se necessário.

```bash
cp .env.example .env
```

## Rodar local

```bash
npm install
npm run dev
```

O painel sobe por padrão em `http://localhost:5174`.

## Requisito no backend (CORS)

No backend, garanta que `CORS_ORIGIN` contenha a origem do painel admin também.

Exemplo:

```env
CORS_ORIGIN=http://localhost:5173,http://localhost:5174,http://192.168.1.6:5173,http://192.168.1.6:5174
```
