# TrampoAqui: Sistema Web para Contratação de Serviços Gerais em uma Comunidade

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/Node.js-18.x-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue.svg)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-blue.svg)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue.svg)](https://www.docker.com/)

## 🎯 Sobre o Projeto

<img width="1614" height="870" alt="image" src="https://github.com/user-attachments/assets/ce2550d0-f508-45a4-ad6d-dff1d9bb4297" />


### Introdução

O **TrampoAqui** é um sistema web desenvolvido para facilitar a contratação de serviços gerais em comunidades locais. O projeto visa tornar fácil contratar serviços gerais, incentivando o relacionamento entre prestadores de serviço e contratantes de forma eficiente e segura, tendo em base a dificuldade de acesso a profissionais qualificados, falta de clareza de preços e segurança no processo de contratação.

### Objetivos

O projeto tem como objetivos principais:

1. **Examinar os principais problemas** encontrados ao buscar por serviços gerais em comunidades locais
2. **Desenvolver e implementar um sistema web** com uma interface intuitiva e acessível
3. **Validar o sistema** através de testes funcionais
4. **Analisar o impacto social e econômico** dentro de uma comunidade local ao utilizar o sistema

## ✨ Características Principais

### Funcionalidades Implementadas

- ✅ **Gerenciamento de Usuários**: Cadastro, login, edição de perfil e exclusão de conta
- ✅ **Busca e Visualização de Serviços**: Navegação por categorias, filtros e ordenação
- ✅ **Sistema de Avaliação**: Avaliação mútua entre profissionais e contratantes
- ✅ **Sistema de Pagamento**: Pagamento antecipado com retenção de valor
- ✅ **Sistema de Negociações**: Propostas e contrapropostas de valores
- ✅ **Painel Administrativo**: Gerenciamento de usuários, serviços e categorias
- ✅ **Sistema de Saques**: Saques para prestadores de serviços
- ✅ **Verificação de Email**: Confirmação de conta por email
- ✅ **Serviços Diários**: Suporte para múltiplas sessões de serviço

## 🛠️ Tecnologias e Ferramentas

### Stack Tecnológico

O projeto utiliza uma stack moderna e robusta, escolhida para garantir escalabilidade, manutenibilidade e performance:

#### Backend

- **Node.js 18.x**: Plataforma de execução JavaScript server-side
- **TypeScript 5.6**: Superset tipado do JavaScript para maior segurança de tipos
- **Express.js 4.21**: Framework web minimalista e flexível para Node.js
- **Drizzle ORM 0.39**: ORM type-safe para PostgreSQL
- **PostgreSQL 15**: Banco de dados relacional robusto e escalável
- **JWT (JSON Web Token)**: Autenticação segura de usuários
- **bcrypt**: Criptografia de senhas
- **Zod 3.24**: Validação de dados em runtime

#### Frontend

- **React 18.3**: Biblioteca JavaScript para construção de interfaces
- **TypeScript 5.6**: Tipagem estática para React
- **Vite 5.4**: Build tool e dev server rápido
- **Tailwind CSS 3.4**: Framework CSS utility-first
- **Shadcn/UI**: Componentes UI acessíveis e customizáveis
- **React Hook Form 7.55**: Gerenciamento de formulários
- **TanStack Query 5.60**: Gerenciamento de estado do servidor
- **Wouter 3.3**: Roteamento leve para React

#### Ferramentas e Utilidades

- **Docker & Docker Compose**: Containerização e orquestração
- **Nodemailer 6.9**: Envio de emails transacionais
- **ViaCEP API**: Consulta de CEP para preenchimento automático de endereços
- **Drizzle Kit 0.30**: Ferramentas de migração e gerenciamento de schema
- **ESBuild 0.25**: Bundler rápido para produção

### Tabela de Tecnologias

| Tecnologia | Área | Finalidade | Versão |
|------------|------|------------|--------|
| Node.js | Backend | Plataforma de execução | 18.x |
| TypeScript | Backend/Frontend | Tipagem estática | 5.6.3 |
| Express.js | Backend | Framework web | 4.21.2 |
| React | Frontend | Biblioteca UI | 18.3.1 |
| PostgreSQL | Banco de Dados | Persistência de dados | 15 |
| Drizzle ORM | Banco de Dados | ORM type-safe | 0.39.1 |
| Docker | Infraestrutura | Containerização | - |
| JWT | Segurança | Autenticação | 9.0.2 |
| bcrypt | Segurança | Criptografia de senhas | 6.0.0 |
| Zod | Validação | Validação de dados | 3.24.2 |
| Tailwind CSS | Frontend | Estilização | 3.4.17 |
| Vite | Frontend | Build tool | 5.4.19 |
| Nodemailer | Email | Envio de emails | 6.9.14 |

## 🏗️ Arquitetura do Sistema

### Fluxo de Dados

1. **Frontend (React)**: Interface do usuário realiza requisições HTTP para a API
2. **API (Express)**: Recebe requisições, valida dados e autentica usuários
3. **Controllers**: Processam a lógica de negócio e coordenam operações
4. **Storage Layer**: Acessa o banco de dados através do Drizzle ORM
5. **Database (PostgreSQL)**: Persiste e recupera dados

### Padrões de Design

- **MVC (Model-View-Controller)**: Separação de responsabilidades
- **Repository Pattern**: Abstração do acesso a dados
- **Middleware Pattern**: Autenticação e validação
- **Dependency Injection**: Injeção de dependências para testabilidade

## 📦 Pré-requisitos

Antes de começar, certifique-se de ter os seguintes requisitos instalados:

- **Node.js**: Versão 18.x ou superior ([Download](https://nodejs.org/))
- **npm**: Versão 9.x ou superior (incluído com Node.js)
- **Docker**: Versão 20.x ou superior ([Download](https://www.docker.com/get-started))
- **Docker Compose**: Versão 2.x ou superior (incluído com Docker Desktop)
- **Git**: Para clonar o repositório ([Download](https://git-scm.com/))

### Verificação de Instalação

```bash
# Verificar versões instaladas
node --version
npm --version
docker --version
docker compose version
git --version
```

## 🚀 Instalação e Configuração

### 1. Clonar o Repositório

```bash
git clone https://github.com/seu-usuario/trampoaqui.git
cd trampoaqui
```

### 2. Configurar Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto com as seguintes variáveis:

```env
# Banco de Dados
DATABASE_URL=postgresql://trampoaqui:trampoaqui123@postgres:5432/trampoaqui

# Autenticação
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Servidor
PORT=5000
NODE_ENV=production

# Email (Opcional - necessário para envio de emails)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=seu-email@gmail.com
EMAIL_PASS=sua-senha-de-app
EMAIL_FROM=TrampoAqui <noreply@trampoaqui.com>

# Frontend
FRONTEND_URL=http://localhost:5173
APP_URL=http://localhost:5173
APP_NAME=TrampoAqui

# SSL (Opcional - apenas para produção com HTTPS)
# SSL_CERT=/path/to/cert.pem
# SSL_KEY=/path/to/key.pem
```

> **Nota**: Substitua os valores conforme necessário. Para produção, use valores seguros e não commite o arquivo `.env` no repositório.

### 3. Instalar Dependências

```bash
npm install
```

### 4. Configurar Banco de Dados

O banco de dados será configurado automaticamente ao iniciar o Docker Compose. O script de inicialização em `init-db/01-init-schema.sql` criará todas as tabelas necessárias.

## ▶️ Executando o Projeto

### Modo Desenvolvimento (Local)

Para executar o projeto em modo de desenvolvimento localmente:

```bash
# Iniciar banco de dados (docker)
docker compose up -d postgres

# Iniciar servidor de desenvolvimento (frontend e backend)
npm run dev

# Ou iniciar separadamente
npm run dev:client  # Frontend (porta 5173)
npm run dev:server  # Backend (porta 5000)
```

O frontend estará disponível em `http://localhost:5173` e o backend em `http://localhost:5000`.

### Modo Produção (Docker)

Para executar o projeto em modo produção usando Docker:

```bash
# Construir as imagens Docker
docker compose build

# Iniciar os serviços
docker compose up -d

# Verificar os logs
docker compose logs -f

# Parar os serviços
docker compose down
```

O sistema estará disponível em `http://localhost:5000`.

### Modo Desenvolvimento (Docker)

Para executar em modo desenvolvimento com Docker:

```bash
# Iniciar serviços de desenvolvimento
docker compose --profile dev up -d

# Ver logs do serviço de desenvolvimento
docker compose --profile dev logs -f dev
```

### Comandos Disponíveis

```bash
# Desenvolvimento
npm run dev              # Iniciar frontend e backend em modo desenvolvimento
npm run dev:client       # Iniciar apenas o frontend
npm run dev:server       # Iniciar apenas o backend

# Produção
npm run build            # Construir aplicação para produção
npm start                # Iniciar aplicação em modo produção

# Banco de Dados
npm run db:push          # Aplicar mudanças do schema ao banco de dados
npm run db:clear         # Limpar dados do banco de dados

# Docker
npm run docker:build     # Construir imagens Docker
npm run docker:up        # Iniciar serviços Docker
npm run docker:down      # Parar serviços Docker
npm run docker:logs      # Ver logs dos serviços Docker
npm run docker:dev       # Iniciar serviços de desenvolvimento
npm run docker:dev-logs  # Ver logs do serviço de desenvolvimento

# Verificação
npm run check            # Verificar tipos TypeScript
```

### Verificação de Funcionamento

Após iniciar o sistema, verifique se está funcionando corretamente:

```bash
# Verificar health check da API
curl http://localhost:5000/api/health

# Verificar status dos containers
docker compose ps

# Verificar logs da API
docker compose logs api

# Verificar logs do banco de dados
docker compose logs postgres
```

## 📚 Documentação da API

A API REST do TrampoAqui fornece endpoints para todas as funcionalidades do sistema. Todos os endpoints retornam dados em formato JSON.

### Autenticação

A maioria dos endpoints requer autenticação via JWT. Para autenticar, inclua o token no header da requisição:

```
Authorization: Bearer <seu-token-jwt>
```

### Base URL

- **Desenvolvimento**: `http://localhost:5000/api`
- **Produção**: `https://seu-dominio.com/api`

### Endpoints

#### Health Check

##### `GET /api/health`

Verifica o status da API e conexão com o banco de dados.

**Resposta de Sucesso (200)**:
```json
{
  "status": "healthy",
  "timestamp": "2025-11-13T00:35:43.420Z",
  "database": "connected"
}
```

#### Autenticação

##### `POST /api/auth/register`

Registra um novo usuário no sistema.

**Requisição**:
```json
{
  "email": "usuario@example.com",
  "password": "senha123",
  "name": "João Silva",
  "cpf": "12345678900",
  "birthDate": "1990-01-01T00:00:00.000Z",
  "phone": "11999999999"
}
```

**Resposta de Sucesso (200)**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "usuario@example.com",
    "name": "João Silva",
    "isProviderEnabled": false,
    "isAdmin": false,
    "emailVerified": false
  }
}
```

##### `POST /api/auth/login`

Autentica um usuário no sistema.

**Requisição**:
```json
{
  "email": "usuario@example.com",
  "password": "senha123"
}
```

**Resposta de Sucesso (200)**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "usuario@example.com",
    "name": "João Silva",
    "isProviderEnabled": false,
    "isAdmin": false,
    "emailVerified": true
  }
}
```

##### `POST /api/auth/resend-verification`

Reenvia email de verificação.

**Requisição**:
```json
{
  "email": "usuario@example.com"
}
```

**Resposta de Sucesso (200)**:
```json
{
  "message": "Um novo e-mail de verificação foi enviado."
}
```

##### `GET /api/auth/verify-email?token=<token>`

Verifica o email do usuário usando o token de verificação.

**Resposta de Sucesso (200)**:
```json
{
  "message": "Email verificado com sucesso"
}
```

##### `GET /api/auth/me`

Obtém informações do usuário autenticado.

**Headers**: `Authorization: Bearer <token>`

**Resposta de Sucesso (200)**:
```json
{
  "id": "uuid",
  "email": "usuario@example.com",
  "name": "João Silva",
  "isProviderEnabled": false,
  "isAdmin": false,
  "emailVerified": true
}
```

##### `POST /api/auth/enable-provider`

Habilita a capacidade de prestador de serviço para o usuário autenticado.

**Headers**: `Authorization: Bearer <token>`

**Resposta de Sucesso (200)**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "usuario@example.com",
    "name": "João Silva",
    "isProviderEnabled": true,
    "isAdmin": false,
    "emailVerified": true
  },
  "profileStatus": {
    "isComplete": true,
    "missingFields": [],
    "redirectToProfile": false
  }
}
```

##### `PUT /api/auth/profile`

Atualiza o perfil do usuário autenticado.

**Headers**: `Authorization: Bearer <token>`

**Requisição**:
```json
{
  "name": "João Silva",
  "phone": "11999999999",
  "bio": "Descrição do usuário",
  "experience": "Experiência profissional",
  "location": "São Paulo - SP",
  "cep": "12345-678",
  "city": "São Paulo",
  "state": "SP",
  "street": "Rua Exemplo",
  "neighborhood": "Bairro Exemplo",
  "number": "123",
  "complement": "Apto 45"
}
```

**Resposta de Sucesso (200)**:
```json
{
  "id": "uuid",
  "email": "usuario@example.com",
  "name": "João Silva",
  "phone": "11999999999",
  "bio": "Descrição do usuário",
  "experience": "Experiência profissional",
  "location": "São Paulo - SP",
  "cep": "12345-678",
  "city": "São Paulo",
  "state": "SP",
  "street": "Rua Exemplo",
  "neighborhood": "Bairro Exemplo",
  "number": "123",
  "complement": "Apto 45",
  "isProviderEnabled": true,
  "isAdmin": false,
  "emailVerified": true,
  "createdAt": "2025-01-01T00:00:00.000Z"
}
```

##### `PUT /api/auth/change-password`

Altera a senha do usuário autenticado.

**Headers**: `Authorization: Bearer <token>`

**Requisição**:
```json
{
  "oldPassword": "senha123",
  "newPassword": "novaSenha123"
}
```

**Resposta de Sucesso (200)**:
```json
{
  "message": "Senha alterada com sucesso"
}
```

##### `DELETE /api/auth/account`

Exclui a conta do usuário autenticado.

**Headers**: `Authorization: Bearer <token>`

**Requisição**:
```json
{
  "password": "senha123"
}
```

**Resposta de Sucesso (200)**:
```json
{
  "message": "Conta excluída com sucesso"
}
```

**Observação**: Não é possível excluir a conta se houver serviços ativos (pending, accepted, negotiating ou payment_pending) como cliente ou prestador.

#### Usuários

##### `GET /api/users/:id`

Obtém informações públicas de um usuário.

**Resposta de Sucesso (200)**:
```json
{
  "id": "uuid",
  "name": "João Silva",
  "email": "usuario@example.com",
  "phone": "11999999999",
  "location": "São Paulo - SP",
  "bio": "Descrição do usuário",
  "experience": "Experiência profissional",
  "isProviderEnabled": true,
  "isAdmin": false,
  "emailVerified": true,
  "cep": "12345-678",
  "city": "São Paulo",
  "state": "SP",
  "street": "Rua Exemplo",
  "neighborhood": "Bairro Exemplo",
  "number": "123",
  "complement": "Apto 45",
  "createdAt": "2025-01-01T00:00:00.000Z"
}
```

##### `GET /api/auth/profile/status`

Obtém o status do perfil do usuário autenticado.

**Headers**: `Authorization: Bearer <token>`

**Resposta de Sucesso (200)**:
```json
{
  "isProfileComplete": true,
  "missingFields": [],
  "profile": {
    "bio": "Descrição",
    "experience": "Experiência",
    "location": "São Paulo - SP"
  },
  "isProviderEnabled": true,
  "redirectToProfile": false
}
```

#### Categorias de Serviço

##### `GET /api/categories`

Obtém todas as categorias de serviços disponíveis.

**Resposta de Sucesso (200)**:
```json
[
  {
    "id": "uuid",
    "name": "Eletricista",
    "icon": "fas fa-bolt",
    "slug": "eletricista"
  },
  {
    "id": "uuid",
    "name": "Encanador",
    "icon": "fas fa-wrench",
    "slug": "encanador"
  }
]
```

#### Prestadores de Serviço

##### `GET /api/providers`

Obtém todos os prestadores de serviço, opcionalmente filtrados por categoria.

**Query Parameters**:
- `categoryId` (opcional): ID da categoria para filtrar

**Resposta de Sucesso (200)**:
```json
[
  {
    "id": "uuid",
    "userId": "uuid",
    "categoryId": "uuid",
    "description": "Descrição do serviço",
    "pricingTypes": ["hourly", "daily", "fixed"],
    "minHourlyRate": "50.00",
    "minDailyRate": "400.00",
    "minFixedRate": "200.00",
    "location": "São Paulo - SP",
    "isVerified": false,
    "user": {
      "id": "uuid",
      "name": "João Silva",
      "email": "usuario@example.com"
    },
    "category": {
      "id": "uuid",
      "name": "Eletricista",
      "icon": "fas fa-bolt",
      "slug": "eletricista"
    },
    "averageRating": 4.5,
    "reviewCount": 10
  }
]
```

##### `GET /api/providers/:id`

Obtém detalhes de um prestador de serviço específico.

**Resposta de Sucesso (200)**:
```json
{
  "id": "uuid",
  "userId": "uuid",
  "categoryId": "uuid",
  "description": "Descrição do serviço",
  "pricingTypes": ["hourly", "daily"],
  "minHourlyRate": "50.00",
  "minDailyRate": "400.00",
  "location": "São Paulo - SP",
  "isVerified": false,
  "user": {
    "id": "uuid",
    "name": "João Silva",
    "email": "usuario@example.com",
    "bio": "Descrição",
    "experience": "Experiência",
    "location": "São Paulo - SP"
  },
  "category": {
    "id": "uuid",
    "name": "Eletricista",
    "icon": "fas fa-bolt",
    "slug": "eletricista"
  },
  "averageRating": 4.5,
  "reviewCount": 10
}
```

##### `GET /api/users/me/providers`

Obtém todos os prestadores de serviço do usuário autenticado.

**Headers**: `Authorization: Bearer <token>`

**Resposta de Sucesso (200)**:
```json
[
  {
    "id": "uuid",
    "userId": "uuid",
    "categoryId": "uuid",
    "description": "Descrição do serviço",
    "pricingTypes": ["hourly", "daily", "fixed"],
    "minHourlyRate": "50.00",
    "minDailyRate": "400.00",
    "minFixedRate": "200.00",
    "location": "São Paulo - SP",
    "isVerified": false,
    "category": {
      "id": "uuid",
      "name": "Eletricista",
      "icon": "fas fa-bolt",
      "slug": "eletricista"
    },
    "averageRating": 4.5,
    "reviewCount": 10
  }
]
```

##### `POST /api/providers`

Cria um novo perfil de prestador de serviço.

**Headers**: `Authorization: Bearer <token>`

**Requisição**:
```json
{
  "categoryId": "uuid",
  "description": "Descrição do serviço oferecido",
  "pricingTypes": ["hourly", "daily", "fixed"],
  "minHourlyRate": "50.00",
  "minDailyRate": "400.00",
  "minFixedRate": "200.00",
  "location": "São Paulo - SP",
  "experience": "10 anos de experiência"
}
```

**Resposta de Sucesso (200)**:
```json
{
  "id": "uuid",
  "userId": "uuid",
  "categoryId": "uuid",
  "description": "Descrição do serviço oferecido",
  "pricingTypes": ["hourly", "daily", "fixed"],
  "minHourlyRate": "50.00",
  "minDailyRate": "400.00",
  "minFixedRate": "200.00",
  "location": "São Paulo - SP",
  "isVerified": false,
  "createdAt": "2025-01-01T00:00:00.000Z"
}
```

##### `PUT /api/providers/:id`

Atualiza um perfil de prestador de serviço.

**Headers**: `Authorization: Bearer <token>`

**Requisição**:
```json
{
  "description": "Nova descrição",
  "minHourlyRate": "60.00",
  "location": "Rio de Janeiro - RJ"
}
```

##### `DELETE /api/providers/:id`

Exclui um perfil de prestador de serviço.

**Headers**: `Authorization: Bearer <token>`

#### Solicitações de Serviço

##### `GET /api/requests`

Obtém todas as solicitações de serviço do usuário autenticado (como cliente).

**Headers**: `Authorization: Bearer <token>`

**Resposta de Sucesso (200)**:
```json
[
  {
    "id": "uuid",
    "clientId": "uuid",
    "providerId": "uuid",
    "title": "Reparo elétrico",
    "description": "Preciso de reparo elétrico",
    "status": "pending",
    "pricingType": "hourly",
    "proposedPrice": "150.00",
    "proposedHours": 3,
    "scheduledDate": "2025-12-01T10:00:00.000Z",
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2025-01-01T00:00:00.000Z",
    "provider": {
      "id": "uuid",
      "userId": "uuid",
      "categoryId": "uuid",
      "user": {
        "id": "uuid",
        "name": "João Silva"
      }
    },
    "negotiations": [],
    "reviews": []
  }
]
```

##### `GET /api/requests/provider`

Obtém todas as solicitações de serviço do usuário autenticado (como prestador).

**Headers**: `Authorization: Bearer <token>`

**Resposta de Sucesso (200)**:
```json
{
  "message": "OK",
  "code": "OK",
  "profileStatus": {
    "isComplete": true,
    "missingFields": []
  },
  "requests": [
    {
      "id": "uuid",
      "clientId": "uuid",
      "providerId": "uuid",
      "title": "Reparo elétrico",
      "description": "Preciso de reparo elétrico",
      "status": "pending",
      "pricingType": "hourly",
      "proposedPrice": "150.00",
      "proposedHours": 3,
      "scheduledDate": "2025-12-01T10:00:00.000Z",
      "createdAt": "2025-01-01T00:00:00.000Z",
      "updatedAt": "2025-01-01T00:00:00.000Z",
      "client": {
        "id": "uuid",
        "name": "Maria Silva",
        "email": "maria@example.com"
      },
      "negotiations": [],
      "reviews": []
    }
  ]
}
```

**Observação**: Requer que o usuário tenha capacidade de prestador habilitada (`isProviderEnabled: true`) e perfil completo (bio, experience, location).

##### `POST /api/requests`

Cria uma nova solicitação de serviço.

**Headers**: `Authorization: Bearer <token>`

**Requisição**:
```json
{
  "providerId": "uuid",
  "title": "Reparo elétrico",
  "description": "Preciso de reparo elétrico na minha casa",
  "pricingType": "hourly",
  "proposedPrice": "150.00",
  "proposedHours": 3,
  "scheduledDate": "2025-12-01T10:00:00.000Z"
}
```

**Resposta de Sucesso (200)**:
```json
{
  "id": "uuid",
  "clientId": "uuid",
  "providerId": "uuid",
  "title": "Reparo elétrico",
  "description": "Preciso de reparo elétrico na minha casa",
  "status": "pending",
  "pricingType": "hourly",
  "proposedPrice": "150.00",
  "proposedHours": 3,
  "scheduledDate": "2025-12-01T10:00:00.000Z",
  "createdAt": "2025-01-01T00:00:00.000Z",
  "updatedAt": "2025-01-01T00:00:00.000Z"
}
```

##### `PUT /api/requests/:id`

Atualiza uma solicitação de serviço.

**Headers**: `Authorization: Bearer <token>`

**Requisição**:
```json
{
  "status": "completed",
  "clientCompletedAt": "2025-12-01T15:00:00.000Z"
}
```

**Resposta de Sucesso (200)**:
```json
{
  "id": "uuid",
  "clientId": "uuid",
  "providerId": "uuid",
  "title": "Reparo elétrico",
  "description": "Preciso de reparo elétrico",
  "status": "completed",
  "clientCompletedAt": "2025-12-01T15:00:00.000Z",
  "updatedAt": "2025-12-01T15:00:00.000Z"
}
```

##### `PUT /api/requests/:id/daily-session/:dayIndex`

Atualiza uma sessão diária específica de uma solicitação de serviço.

**Headers**: `Authorization: Bearer <token>`

**Requisição**:
```json
{
  "completed": true,
  "notes": "Sessão concluída com sucesso"
}
```

**Resposta de Sucesso (200)**:
```json
{
  "id": "uuid",
  "dailySessions": [
    {
      "dayIndex": 0,
      "date": "2025-12-01T10:00:00.000Z",
      "completed": true,
      "notes": "Sessão concluída com sucesso"
    }
  ],
  "updatedAt": "2025-12-01T15:00:00.000Z"
}
```

##### `GET /api/requests/:id`

Obtém detalhes de uma solicitação de serviço específica.

**Headers**: `Authorization: Bearer <token>`

**Resposta de Sucesso (200)**:
```json
{
  "id": "uuid",
  "clientId": "uuid",
  "providerId": "uuid",
  "title": "Reparo elétrico",
  "description": "Preciso de reparo elétrico",
  "status": "pending",
  "pricingType": "hourly",
  "proposedPrice": "150.00",
  "proposedHours": 3,
  "scheduledDate": "2025-12-01T10:00:00.000Z",
  "dailySessions": [],
  "negotiations": [],
  "reviews": [],
  "createdAt": "2025-01-01T00:00:00.000Z",
  "updatedAt": "2025-01-01T00:00:00.000Z"
}
```

#### Negociações

##### `POST /api/negotiations`

Cria uma nova negociação para uma solicitação de serviço.

**Headers**: `Authorization: Bearer <token>`

**Requisição**:
```json
{
  "requestId": "uuid",
  "pricingType": "hourly",
  "proposedPrice": "200.00",
  "proposedHours": 4,
  "proposedDate": "2025-12-02T10:00:00.000Z",
  "message": "Posso fazer por este valor"
}
```

**Resposta de Sucesso (200)**:
```json
{
  "id": "uuid",
  "requestId": "uuid",
  "proposerId": "uuid",
  "pricingType": "hourly",
  "proposedPrice": "200.00",
  "proposedHours": 4,
  "proposedDate": "2025-12-02T10:00:00.000Z",
  "message": "Posso fazer por este valor",
  "status": "pending",
  "createdAt": "2025-01-01T00:00:00.000Z"
}
```

##### `PUT /api/negotiations/:id/status`

Atualiza o status de uma negociação (aceitar ou rejeitar).

**Headers**: `Authorization: Bearer <token>`

**Requisição**:
```json
{
  "status": "accepted"
}
```

**Resposta de Sucesso (200)**:
```json
{
  "message": "Negotiation status updated"
}
```

##### `POST /api/negotiations/:id/counter-proposal`

Cria uma contraproposta para uma negociação.

**Headers**: `Authorization: Bearer <token>`

**Requisição**:
```json
{
  "pricingType": "hourly",
  "proposedPrice": "180.00",
  "proposedHours": 3,
  "message": "Posso aceitar por este valor"
}
```

##### `GET /api/requests/:id/negotiations`

Obtém todas as negociações de uma solicitação de serviço.

**Headers**: `Authorization: Bearer <token>`

#### Avaliações

##### `POST /api/reviews`

Cria uma nova avaliação.

**Headers**: `Authorization: Bearer <token>`

**Requisição**:
```json
{
  "requestId": "uuid",
  "revieweeId": "uuid",
  "rating": 5,
  "comment": "Excelente serviço!"
}
```

**Resposta de Sucesso (200)**:
```json
{
  "id": "uuid",
  "requestId": "uuid",
  "reviewerId": "uuid",
  "revieweeId": "uuid",
  "rating": 5,
  "comment": "Excelente serviço!",
  "createdAt": "2025-01-01T00:00:00.000Z"
}
```

##### `GET /api/reviews/provider/:providerId`

Obtém todas as avaliações de um prestador de serviço.

**Resposta de Sucesso (200)**:
```json
[
  {
    "id": "uuid",
    "requestId": "uuid",
    "reviewerId": "uuid",
    "revieweeId": "uuid",
    "rating": 5,
    "comment": "Excelente serviço!",
    "createdAt": "2025-01-01T00:00:00.000Z",
    "reviewer": {
      "id": "uuid",
      "name": "Maria Silva",
      "email": "maria@example.com"
    }
  }
]
```

##### `GET /api/providers/user/:userId/reviews`

Obtém todas as avaliações de um usuário prestador.

##### `GET /api/reviews/service-provider/:serviceProviderId`

Obtém todas as avaliações de um prestador de serviço específico.

##### `GET /api/reviews/user/:userId/received`

Obtém todas as avaliações recebidas por um usuário.

##### `GET /api/reviews/user/:userId/sent`

Obtém todas as avaliações enviadas por um usuário.

Obtém todas as mensagens recebidas pelo usuário autenticado.

**Headers**: `Authorization: Bearer <token>`

#### Pagamentos

##### `POST /api/requests/:id/payment`

Processa o pagamento de uma solicitação de serviço.

**Headers**: `Authorization: Bearer <token>`

**Requisição**:
```json
{
  "paymentMethod": "pix"
}
```

**Valores válidos para `paymentMethod`**:
- `boleto`
- `pix`
- `credit_card`

**Resposta de Sucesso (200)**:
```json
{
  "id": "uuid",
  "status": "payment_pending",
  "paymentMethod": "pix",
  "paymentCompletedAt": null
}
```

##### `POST /api/requests/:id/complete-payment`

Completa o pagamento de uma solicitação de serviço.

**Headers**: `Authorization: Bearer <token>`

**Resposta de Sucesso (200)**:
```json
{
  "id": "uuid",
  "status": "payment_pending",
  "paymentMethod": "pix",
  "paymentCompletedAt": "2025-01-01T12:00:00.000Z"
}
```

#### Saldo e Saques

##### `GET /api/users/me/balance`

Obtém o saldo atual do usuário autenticado.

**Headers**: `Authorization: Bearer <token>`

**Resposta de Sucesso (200)**:
```json
{
  "balance": "500.00"
}
```

##### `POST /api/withdrawals`

Cria uma solicitação de saque.

**Headers**: `Authorization: Bearer <token>`

**Requisição**:
```json
{
  "amount": "300.00"
}
```

**Resposta de Sucesso (200)**:
```json
{
  "id": "uuid",
  "userId": "uuid",
  "amount": "300.00",
  "status": "pending",
  "createdAt": "2025-01-01T00:00:00.000Z"
}
```

##### `GET /api/withdrawals`

Obtém todas as solicitações de saque do usuário autenticado.

**Headers**: `Authorization: Bearer <token>`

#### Administração

##### `GET /api/admin/dashboard`

Obtém dados do painel administrativo.

**Headers**: `Authorization: Bearer <token>` (requer admin)

**Resposta de Sucesso (200)**:
```json
{
  "statistics": {
    "totalUsers": 100,
    "totalProviders": 50,
    "totalRequests": 200,
    "totalCategories": 7
  },
  "recentUsers": [...],
  "recentRequests": [...]
}
```

##### `GET /api/admin/users`

Obtém lista de usuários (com paginação e busca).

**Headers**: `Authorization: Bearer <token>` (requer admin)

**Query Parameters**:
- `page` (opcional): Número da página (padrão: 1)
- `limit` (opcional): Itens por página (padrão: 20)
- `search` (opcional): Termo de busca

##### `GET /api/admin/requests`

Obtém lista de solicitações de serviço (com paginação e filtro de status).

**Headers**: `Authorization: Bearer <token>` (requer admin)

**Query Parameters**:
- `page` (opcional): Número da página (padrão: 1)
- `limit` (opcional): Itens por página (padrão: 20)
- `status` (opcional): Filtrar por status

##### `PUT /api/admin/users/:id/admin`

Atualiza o status de administrador de um usuário.

**Headers**: `Authorization: Bearer <token>` (requer admin)

**Requisição**:
```json
{
  "isAdmin": true
}
```

##### `DELETE /api/admin/users/:id`

Exclui um usuário do sistema.

**Headers**: `Authorization: Bearer <token>` (requer admin)

### Códigos de Status HTTP

- `200 OK`: Requisição bem-sucedida
- `201 Created`: Recurso criado com sucesso
- `400 Bad Request`: Dados inválidos
- `401 Unauthorized`: Não autenticado
- `403 Forbidden`: Não autorizado (requer permissões específicas)
- `404 Not Found`: Recurso não encontrado
- `500 Internal Server Error`: Erro interno do servidor
- `503 Service Unavailable`: Serviço indisponível (health check)

### Tratamento de Erros

Todas as respostas de erro seguem o formato:

```json
{
  "message": "Mensagem de erro descritiva"
}
```

Para erros de validação (400), a resposta pode incluir detalhes:

```json
{
  "message": "Invalid input data",
  "details": {
    "fieldErrors": {
      "email": ["Email inválido"],
      "password": ["Senha deve ter pelo menos 6 caracteres"]
    }
  }
}
```


## 🗄️ Banco de Dados

### Schema do Banco de Dados

O banco de dados utiliza PostgreSQL 15 e é gerenciado através do Drizzle ORM. O schema é definido em `shared/schema.ts` e as tabelas são criadas automaticamente através do script em `init-db/01-init-schema.sql`.

### Tabelas Principais

#### `users`
Armazena informações dos usuários do sistema.

**Campos Principais**:
- `id`: UUID (chave primária)
- `email`: Email único do usuário
- `password`: Senha criptografada (bcrypt)
- `name`: Nome do usuário
- `cpf`: CPF único do usuário
- `birthDate`: Data de nascimento
- `isProviderEnabled`: Indica se o usuário é prestador
- `isAdmin`: Indica se o usuário é administrador
- `emailVerified`: Indica se o email foi verificado
- `balance`: Saldo do prestador
- `location`: Localização do serviço
- `bio`: Biografia do usuário
- `experience`: Experiência profissional
- Campos de endereço (cep, city, state, street, etc.)

#### `service_categories`
Armazena categorias de serviços disponíveis.

**Campos Principais**:
- `id`: UUID (chave primária)
- `name`: Nome da categoria
- `icon`: Ícone da categoria (FontAwesome)
- `slug`: Slug único da categoria

#### `service_providers`
Armazena perfis de prestadores de serviço.

**Campos Principais**:
- `id`: UUID (chave primária)
- `userId`: ID do usuário (foreign key)
- `categoryId`: ID da categoria (foreign key)
- `description`: Descrição do serviço
- `pricingTypes`: Tipos de precificação (JSONB)
- `minHourlyRate`: Taxa mínima por hora
- `minDailyRate`: Taxa mínima por dia
- `minFixedRate`: Taxa fixa mínima
- `location`: Localização do serviço
- `isVerified`: Indica se o prestador é verificado

#### `service_requests`
Armazena solicitações de serviço.

**Campos Principais**:
- `id`: UUID (chave primária)
- `clientId`: ID do cliente (foreign key)
- `providerId`: ID do prestador (foreign key)
- `title`: Título da solicitação
- `description`: Descrição da solicitação
- `status`: Status da solicitação (pending, negotiating, accepted, payment_pending, completed, cancelled)
- `pricingType`: Tipo de precificação (hourly, daily, fixed)
- `proposedPrice`: Preço proposto
- `proposedHours`: Horas propostas
- `proposedDays`: Dias propostos
- `scheduledDate`: Data agendada
- `dailySessions`: Sessões diárias (JSONB)
- `paymentMethod`: Método de pagamento
- `paymentCompletedAt`: Data de conclusão do pagamento
- `balanceAddedAt`: Data em que o saldo foi adicionado

#### `negotiations`
Armazena negociações de valores para solicitações de serviço.

**Campos Principais**:
- `id`: UUID (chave primária)
- `requestId`: ID da solicitação (foreign key)
- `proposerId`: ID do usuário que propôs (foreign key)
- `pricingType`: Tipo de precificação
- `proposedPrice`: Preço proposto
- `proposedHours`: Horas propostas
- `proposedDays`: Dias propostos
- `proposedDate`: Data proposta
- `message`: Mensagem da proposta
- `status`: Status da negociação (pending, accepted, rejected, counter_proposed)

#### `reviews`
Armazena avaliações de serviços.

**Campos Principais**:
- `id`: UUID (chave primária)
- `requestId`: ID da solicitação (foreign key)
- `reviewerId`: ID do avaliador (foreign key)
- `revieweeId`: ID do avaliado (foreign key)
- `rating`: Nota da avaliação (1-5)
- `comment`: Comentário da avaliação

#### `messages`
Armazena mensagens entre usuários.

**Campos Principais**:
- `id`: UUID (chave primária)
- `senderId`: ID do remetente (foreign key)
- `receiverId`: ID do destinatário (foreign key)
- `requestId`: ID da solicitação relacionada (foreign key, opcional)
- `content`: Conteúdo da mensagem
- `isRead`: Indica se a mensagem foi lida

#### `withdrawals`
Armazena solicitações de saque.

**Campos Principais**:
- `id`: UUID (chave primária)
- `userId`: ID do usuário (foreign key)
- `amount`: Valor do saque
- `status`: Status do saque (pending, completed, cancelled)

### Relacionamentos

- Um usuário pode ter múltiplos prestadores de serviço (1:N)
- Um prestador pertence a uma categoria (N:1)
- Uma solicitação pertence a um cliente e um prestador (N:1, N:1)
- Uma solicitação pode ter múltiplas negociações (1:N)
- Uma solicitação pode ter múltiplas avaliações (1:N)
- Uma solicitação pode ter múltiplas mensagens (1:N)
- Um usuário pode ter múltiplas solicitações de saque (1:N)

### Índices

O banco de dados possui índices nas seguintes colunas para melhorar a performance:

- `users.email`
- `users.cpf`
- `service_providers.user_id`
- `service_providers.category_id`
- `service_requests.client_id`
- `service_requests.provider_id`
- `service_requests.status`
- `negotiations.request_id`
- `reviews.request_id`
- `reviews.reviewer_id`
- `reviews.reviewee_id`
- `messages.sender_id`
- `messages.receiver_id`
- `messages.request_id`
- `withdrawals.user_id`

### Inicialização

O banco de dados é inicializado automaticamente quando o PostgreSQL é iniciado pela primeira vez. O script `init-db/01-init-schema.sql` é executado automaticamente pelo Docker, criando todas as tabelas, índices e triggers necessários.

## 🔐 Variáveis de Ambiente

### Variáveis Obrigatórias

| Variável | Descrição | Exemplo |
|----------|-----------|---------|
| `DATABASE_URL` | URL de conexão com o PostgreSQL | `postgresql://user:pass@host:5432/dbname` |
| `JWT_SECRET` | Chave secreta para assinatura de tokens JWT | `your-super-secret-jwt-key` |
| `PORT` | Porta do servidor | `5000` |
| `NODE_ENV` | Ambiente de execução | `production` ou `development` |

### Variáveis Opcionais

| Variável | Descrição | Exemplo | Padrão |
|----------|-----------|---------|--------|
| `EMAIL_HOST` | Host do servidor SMTP | `smtp.gmail.com` | - |
| `EMAIL_PORT` | Porta do servidor SMTP | `587` | - |
| `EMAIL_USER` | Usuário do servidor SMTP | `email@gmail.com` | - |
| `EMAIL_PASS` | Senha do servidor SMTP | `senha-de-app` | - |
| `EMAIL_FROM` | Email remetente | `TrampoAqui <noreply@trampoaqui.com>` | - |
| `FRONTEND_URL` | URL do frontend | `http://localhost:5173` | `http://localhost:5173` |
| `APP_URL` | URL da aplicação | `http://localhost:5000` | `http://localhost:5173` |
| `APP_NAME` | Nome da aplicação | `TrampoAqui` | `TrampoAqui` |
| `SSL_CERT` | Caminho para certificado SSL | `/path/to/cert.pem` | - |
| `SSL_KEY` | Caminho para chave SSL | `/path/to/key.pem` | - |

### Exemplo de Arquivo .env

```env
# Banco de Dados
DATABASE_URL=postgresql://trampoaqui:trampoaqui123@postgres:5432/trampoaqui

# Autenticação
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Servidor
PORT=5000
NODE_ENV=production

# Email (Opcional)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=seu-email@gmail.com
EMAIL_PASS=sua-senha-de-app
EMAIL_FROM=TrampoAqui <noreply@trampoaqui.com>

# Frontend
FRONTEND_URL=http://localhost:5173
APP_URL=http://localhost:5173
APP_NAME=TrampoAqui

# SSL (Opcional - apenas para produção)
# SSL_CERT=/path/to/cert.pem
# SSL_KEY=/path/to/key.pem
```

## 📄 Licença

Este projeto está licenciado sob a Licença MIT - veja o arquivo [LICENSE](LICENSE) para detalhes.

### Autores

- **Matheus Esposto Sagae** - Desenvolvimento do sistema
- **Prof. Viviane de Fátima Bartholo** - Orientação

## 📚 Referências

### APIs Externas

- [ViaCEP API](https://viacep.com.br/): API para consulta de CEP brasileiro
- [Nodemailer Documentation](https://nodemailer.com/about/): Biblioteca para envio de emails

---

**Desenvolvido com ❤️ para comunidades locais**

