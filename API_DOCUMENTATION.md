# Documentação da API - Plataforma de Serviços

## Índice
1. [Visão Geral](#visão-geral)
2. [Arquitetura](#arquitetura)
3. [Autenticação](#autenticação)
4. [Modelos de Dados](#modelos-de-dados)
5. [Endpoints](#endpoints)
6. [Fluxos de Negócio](#fluxos-de-negócio)
7. [Códigos de Status](#códigos-de-status)
8. [Variáveis de Ambiente](#variáveis-de-ambiente)

---

## Visão Geral

API REST para uma plataforma de marketplace de serviços, conectando clientes a prestadores de serviço. Desenvolvida com:

- **Framework**: Express.js + TypeScript
- **Banco de Dados**: PostgreSQL com Drizzle ORM
- **Autenticação**: JWT (JSON Web Tokens)
- **Validação**: Zod
- **Deploy**: Docker + Docker Compose

**URL Base**: `http://localhost:5000/api`

---

## Arquitetura

### Stack Tecnológica

```
├── Backend
│   ├── Express.js (servidor HTTP)
│   ├── TypeScript (tipagem estática)
│   ├── Drizzle ORM (queries SQL)
│   ├── PostgreSQL (banco de dados)
│   └── JWT (autenticação)
│
├── Frontend
│   ├── React + TypeScript
│   ├── Wouter (roteamento)
│   ├── TanStack Query (gerenciamento de estado)
│   └── Tailwind CSS + shadcn/ui
│
└── DevOps
    ├── Docker (containerização)
    └── Vite (build tool)
```

### Estrutura de Pastas

```
server/
├── index.ts       # Configuração do Express
├── routes.ts      # Definição de todas as rotas
├── db.ts          # Configuração Drizzle
└── storage.ts     # Camada de acesso a dados

shared/
└── schema.ts      # Schemas Drizzle e Zod

client/
└── src/           # Aplicação React
```

---

## Autenticação

### Sistema JWT

A API utiliza JWT (JSON Web Tokens) para autenticação stateless.

#### Headers Obrigatórios

```http
Authorization: Bearer <token>
```

#### Payload do Token

```typescript
{
  userId: string;
  isProviderEnabled: boolean;
  isAdmin: boolean;
}
```

#### Middleware de Autenticação

**`authenticateToken`**: Valida token JWT em rotas protegidas
- **401 Unauthorized**: Token não fornecido
- **403 Forbidden**: Token inválido ou expirado

**`authenticateAdmin`**: Valida permissões de administrador
- **403 Forbidden**: Usuário não é administrador

#### Exemplo de Uso

```typescript
// Cliente HTTP
const response = await fetch('/api/auth/me', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
```

---

## Modelos de Dados

### User (Usuário)

```typescript
{
  id: string;                    // UUID
  email: string;                 // Único
  password: string;              // Hash bcrypt
  name: string;
  phone?: string;
  cpf: string;                   // Único, 11 dígitos
  birthDate: Date;               // Mínimo 18 anos
  isProviderEnabled: boolean;    // Capacidade de prestador
  isAdmin: boolean;              // Permissões administrativas
  
  // Perfil de Prestador
  bio?: string;
  experience?: string;
  location?: string;
  
  // Endereço
  cep?: string;
  city?: string;
  state?: string;
  street?: string;
  neighborhood?: string;
  number?: string;
  hasNumber?: boolean;
  complement?: string;
  
  // Financeiro
  balance: decimal;              // Saldo disponível
  createdAt: Date;
}
```

**Validações**:
- CPF: 11-14 caracteres
- Idade: ≥ 18 anos
- Email: formato válido e único

### ServiceCategory (Categoria de Serviço)

```typescript
{
  id: string;        // UUID
  name: string;      // Ex: "Eletricista"
  icon: string;      // FontAwesome class
  slug: string;      // URL-friendly, único
}
```

**Categorias Padrão**:
- Eletricista (`fas fa-bolt`)
- Encanador (`fas fa-wrench`)
- Faxineira (`fas fa-broom`)
- Pintor (`fas fa-paint-roller`)
- Jardineiro (`fas fa-seedling`)
- Marido de Aluguel (`fas fa-tools`)
- Pedreiro (`fas fa-hammer`)

### ServiceProvider (Prestador de Serviço)

```typescript
{
  id: string;                    // UUID
  userId: string;                // FK -> users
  categoryId: string;            // FK -> serviceCategories
  description: string;
  
  // Tipos de precificação
  pricingTypes: ['hourly' | 'daily' | 'fixed'][];
  minHourlyRate?: decimal;       // Taxa mínima por hora
  minDailyRate?: decimal;        // Taxa mínima por dia
  minFixedRate?: decimal;        // Taxa mínima fixa
  
  experience?: string;
  location: string;              // "Cidade - Estado"
  isVerified: boolean;
  availability?: json;
  createdAt: Date;
}
```

**Regras de Negócio**:
- Um usuário pode ter múltiplos serviços (um por categoria)
- Pelo menos um tipo de precificação é obrigatório
- Location deve seguir formato "Cidade - Estado"

### ServiceRequest (Solicitação de Serviço)

```typescript
{
  id: string;                    // UUID
  clientId: string;              // FK -> users
  providerId: string;            // FK -> serviceProviders
  title: string;
  description: string;
  
  // Status do serviço
  status: 'pending' | 'negotiating' | 'accepted' | 
          'payment_pending' | 'pending_completion' | 
          'completed' | 'cancelled';
  
  // Precificação
  pricingType: 'hourly' | 'daily' | 'fixed';
  proposedPrice?: decimal;
  proposedHours?: number;        // Para tipo 'hourly'
  proposedDays?: number;         // Para tipo 'daily'
  
  scheduledDate?: Date;
  negotiationHistory: json[];    // Array de negociações
  
  // Conclusão
  clientCompletedAt?: Date;
  providerCompletedAt?: Date;
  
  // Pagamento
  paymentMethod?: 'boleto' | 'pix' | 'credit_card';
  paymentCompletedAt?: Date;
  
  createdAt: Date;
  updatedAt: Date;
}
```

**Fluxo de Status**:
```
pending → negotiating → payment_pending → accepted → 
pending_completion → completed
```

### Negotiation (Negociação)

```typescript
{
  id: string;                    // UUID
  requestId: string;             // FK -> serviceRequests
  proposerId: string;            // FK -> users (cliente ou prestador)
  
  pricingType: 'hourly' | 'daily' | 'fixed';
  proposedPrice?: decimal;
  proposedHours?: number;
  proposedDays?: number;
  proposedDate?: Date;
  
  message: string;               // Justificativa da proposta
  status: 'pending' | 'accepted' | 'rejected' | 'counter_proposed';
  
  createdAt: Date;
}
```

### Review (Avaliação)

```typescript
{
  id: string;                    // UUID
  requestId: string;             // FK -> serviceRequests
  reviewerId: string;            // FK -> users (quem avalia)
  revieweeId: string;            // FK -> users (quem é avaliado)
  rating: number;                // 1-5
  comment?: string;
  createdAt: Date;
}
```

### Message (Mensagem)

```typescript
{
  id: string;                    // UUID
  senderId: string;              // FK -> users
  receiverId: string;            // FK -> users
  requestId?: string;            // FK -> serviceRequests (opcional)
  content: string;
  isRead: boolean;
  createdAt: Date;
}
```

### Withdrawal (Saque)

```typescript
{
  id: string;                    // UUID
  userId: string;                // FK -> users
  amount: decimal;
  status: 'pending' | 'completed' | 'cancelled';
  createdAt: Date;
}
```

---

## Endpoints

### 🔐 Autenticação

#### POST `/api/auth/register`

Registrar novo usuário.

**Request Body**:
```json
{
  "email": "usuario@example.com",
  "password": "senha123",
  "name": "João Silva",
  "phone": "(11) 98765-4321",
  "cpf": "12345678901",
  "birthDate": "1990-01-01"
}
```

**Response** (200):
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "uuid",
    "email": "usuario@example.com",
    "name": "João Silva",
    "isProviderEnabled": false,
    "isAdmin": false
  }
}
```

**Erros**:
- `400`: Email ou CPF já em uso
- `400`: Dados inválidos (validação Zod)

---

#### POST `/api/auth/login`

Autenticar usuário existente.

**Request Body**:
```json
{
  "email": "usuario@example.com",
  "password": "senha123"
}
```

**Response** (200):
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "uuid",
    "email": "usuario@example.com",
    "name": "João Silva",
    "isProviderEnabled": false,
    "isAdmin": false
  }
}
```

**Erros**:
- `401`: Credenciais inválidas

---

#### GET `/api/auth/me`

Obter dados do usuário autenticado.

**Headers**: `Authorization: Bearer <token>`

**Response** (200):
```json
{
  "id": "uuid",
  "email": "usuario@example.com",
  "name": "João Silva",
  "isProviderEnabled": false,
  "isAdmin": false,
  "bio": null,
  "experience": null,
  "location": null,
  "city": null,
  "state": null
}
```

**Erros**:
- `401`: Token não fornecido
- `403`: Token inválido
- `404`: Usuário não encontrado

---

#### POST `/api/auth/enable-provider`

Habilitar capacidade de prestador de serviço.

**Headers**: `Authorization: Bearer <token>`

**Response** (200):
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",  // Novo token com isProviderEnabled: true
  "user": {
    "id": "uuid",
    "email": "usuario@example.com",
    "name": "João Silva",
    "isProviderEnabled": true,
    "bio": null,
    "experience": null,
    "location": null,
    "city": null,
    "state": null
  },
  "profileStatus": {
    "isComplete": false,
    "missingFields": ["bio", "experience", "location"],
    "redirectToProfile": true
  }
}
```

**Lógica de Negócio**:
- Atualiza `isProviderEnabled` para `true`
- Gera novo token com permissões atualizadas
- Verifica completude do perfil (bio, experience, location)

---

#### PUT `/api/auth/profile`

Atualizar perfil do prestador.

**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "bio": "Eletricista com 10 anos de experiência",
  "experience": "Trabalho com instalações residenciais e comerciais...",
  "location": "São Paulo - SP"
}
```

**Response** (200):
```json
{
  "id": "uuid",
  "email": "usuario@example.com",
  "name": "João Silva",
  "isProviderEnabled": true,
  "bio": "Eletricista com 10 anos de experiência",
  "experience": "Trabalho com instalações residenciais...",
  "location": "São Paulo - SP",
  "city": null,
  "state": null
}
```

**Validações**:
- `experience`: Mínimo 10 caracteres
- `location`: Mínimo 3 caracteres, formato recomendado "Cidade - Estado"

---

#### GET `/api/auth/profile/status`

Verificar status de completude do perfil.

**Headers**: `Authorization: Bearer <token>`

**Response** (200):
```json
{
  "isProfileComplete": false,
  "missingFields": ["bio", "experience", "location"],
  "profile": {
    "bio": null,
    "experience": null,
    "location": null
  },
  "isProviderEnabled": true,
  "redirectToProfile": true
}
```

---

### 📋 Categorias de Serviço

#### GET `/api/categories`

Listar todas as categorias de serviço.

**Response** (200):
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

---

### 👷 Prestadores de Serviço

#### GET `/api/providers`

Listar prestadores de serviço (com filtro opcional).

**Query Parameters**:
- `categoryId` (opcional): Filtrar por categoria

**Request**:
```http
GET /api/providers?categoryId=uuid-da-categoria
```

**Response** (200):
```json
[
  {
    "id": "uuid",
    "userId": "uuid",
    "categoryId": "uuid",
    "description": "Eletricista profissional",
    "pricingTypes": ["hourly", "fixed"],
    "minHourlyRate": "80.00",
    "minFixedRate": "150.00",
    "location": "São Paulo - SP",
    "isVerified": false,
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
]
```

---

#### GET `/api/providers/:id`

Obter detalhes de um prestador específico (com dados do usuário e avaliações).

**Response** (200):
```json
{
  "id": "uuid",
  "userId": "uuid",
  "categoryId": "uuid",
  "description": "Eletricista profissional",
  "pricingTypes": ["hourly", "fixed"],
  "minHourlyRate": "80.00",
  "minFixedRate": "150.00",
  "location": "São Paulo - SP",
  "isVerified": false,
  "user": {
    "id": "uuid",
    "name": "João Silva",
    "email": "joao@example.com",
    "bio": "Profissional experiente",
    "experience": "10 anos de experiência"
  },
  "category": {
    "id": "uuid",
    "name": "Eletricista",
    "icon": "fas fa-bolt",
    "slug": "eletricista"
  },
  "reviews": []
}
```

**Erros**:
- `404`: Prestador não encontrado

---

#### POST `/api/providers`

Criar novo serviço de prestador.

**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "categoryId": "uuid",
  "description": "Eletricista profissional com 10 anos de experiência",
  "pricingTypes": ["hourly", "fixed"],
  "minHourlyRate": "80.00",
  "minFixedRate": "150.00",
  "location": "São Paulo - SP"
}
```

**Response** (200):
```json
{
  "id": "uuid",
  "userId": "uuid",
  "categoryId": "uuid",
  "description": "Eletricista profissional...",
  "pricingTypes": ["hourly", "fixed"],
  "minHourlyRate": "80.00",
  "minFixedRate": "150.00",
  "location": "São Paulo - SP",
  "isVerified": false,
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

**Regras de Negócio**:
- Usuário deve ter `isProviderEnabled: true`
- Não pode criar serviço duplicado na mesma categoria
- Pelo menos um tipo de precificação obrigatório

**Erros**:
- `403`: Capacidade de prestador não habilitada
- `400`: Já existe serviço nesta categoria

---

#### PUT `/api/providers/:id`

Atualizar serviço de prestador.

**Headers**: `Authorization: Bearer <token>`

**Request Body** (campos opcionais):
```json
{
  "description": "Nova descrição",
  "pricingTypes": ["hourly"],
  "minHourlyRate": "100.00"
}
```

**Response** (200):
```json
{
  "id": "uuid",
  "userId": "uuid",
  "categoryId": "uuid",
  "description": "Nova descrição",
  "pricingTypes": ["hourly"],
  "minHourlyRate": "100.00",
  // ... outros campos
}
```

**Erros**:
- `403`: Usuário não é dono do serviço
- `404`: Prestador não encontrado

---

#### DELETE `/api/providers/:id`

Deletar serviço de prestador.

**Headers**: `Authorization: Bearer <token>`

**Response** (200):
```json
{
  "message": "Provider deleted successfully"
}
```

**Regras de Negócio**:
- Não pode deletar se houver solicitações ativas (pending, accepted, negotiating)

**Erros**:
- `403`: Usuário não é dono do serviço
- `404`: Prestador não encontrado
- `400`: Existem solicitações ativas

---

#### GET `/api/users/me/providers`

Listar todos os serviços do usuário autenticado (com detalhes).

**Headers**: `Authorization: Bearer <token>`

**Response** (200):
```json
[
  {
    "id": "uuid",
    "userId": "uuid",
    "categoryId": "uuid",
    "description": "Eletricista profissional",
    "pricingTypes": ["hourly"],
    "minHourlyRate": "80.00",
    "location": "São Paulo - SP",
    "category": {
      "id": "uuid",
      "name": "Eletricista",
      "icon": "fas fa-bolt",
      "slug": "eletricista"
    }
  }
]
```

---

### 📝 Solicitações de Serviço

#### GET `/api/requests`

Listar solicitações do cliente autenticado (com negociações).

**Headers**: `Authorization: Bearer <token>`

**Response** (200):
```json
[
  {
    "id": "uuid",
    "clientId": "uuid",
    "providerId": "uuid",
    "title": "Instalação elétrica",
    "description": "Preciso instalar tomadas",
    "status": "pending",
    "pricingType": "fixed",
    "proposedPrice": "200.00",
    "scheduledDate": "2024-01-15T10:00:00.000Z",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "negotiations": [
      {
        "id": "uuid",
        "proposerId": "uuid",
        "proposedPrice": "180.00",
        "message": "Posso fazer por este valor",
        "status": "pending",
        "proposer": {
          "name": "João Silva"
        }
      }
    ]
  }
]
```

---

#### GET `/api/requests/provider`

Listar solicitações recebidas pelo prestador autenticado.

**Headers**: `Authorization: Bearer <token>`

**Response** (200):
```json
{
  "message": "Success",
  "code": "SUCCESS",
  "profileStatus": {
    "isComplete": true,
    "missingFields": []
  },
  "requests": [
    {
      "id": "uuid",
      "clientId": "uuid",
      "providerId": "uuid",
      "title": "Instalação elétrica",
      "description": "Preciso instalar tomadas",
      "status": "pending",
      "pricingType": "fixed",
      "proposedPrice": "200.00",
      "client": {
        "name": "Maria Santos"
      },
      "negotiations": []
    }
  ]
}
```

**Códigos de Resposta**:
- `PROVIDER_NOT_ENABLED`: Capacidade de prestador não habilitada
- `PROFILE_INCOMPLETE`: Perfil incompleto (bio, experience, location)
- `PROVIDER_PROFILE_NOT_FOUND`: Nenhum serviço cadastrado
- `SUCCESS`: Sucesso

---

#### POST `/api/requests`

Criar nova solicitação de serviço.

**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "providerId": "uuid",
  "title": "Instalação de tomadas",
  "description": "Preciso instalar 5 tomadas na sala",
  "pricingType": "fixed",
  "proposedPrice": "200.00",
  "scheduledDate": "2024-01-15T10:00:00.000Z"
}
```

**Response** (200):
```json
{
  "id": "uuid",
  "clientId": "uuid",
  "providerId": "uuid",
  "title": "Instalação de tomadas",
  "description": "Preciso instalar 5 tomadas na sala",
  "status": "pending",
  "pricingType": "fixed",
  "proposedPrice": "200.00",
  "scheduledDate": "2024-01-15T10:00:00.000Z",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

**Campos por Tipo de Precificação**:
- `hourly`: Requer `proposedHours`
- `daily`: Requer `proposedDays`
- `fixed`: Requer `proposedPrice`

---

#### PUT `/api/requests/:id`

Atualizar solicitação de serviço.

**Headers**: `Authorization: Bearer <token>`

**Request Body** (campos opcionais):
```json
{
  "status": "completed",
  "proposedPrice": "250.00"
}
```

**Response** (200):
```json
{
  "id": "uuid",
  "status": "pending_completion",
  "clientCompletedAt": "2024-01-15T14:00:00.000Z",
  // ... outros campos
}
```

**Lógica de Conclusão**:
1. Quando cliente marca como `completed`: Define `clientCompletedAt`
2. Quando prestador marca como `completed`: Define `providerCompletedAt`
3. Quando ambos confirmam: Status vira `completed` e saldo é creditado ao prestador

**Cálculo de Pagamento**:
```typescript
serviceAmount = proposedPrice
platformFee = serviceAmount * 0.05  // 5% de taxa
providerAmount = serviceAmount - platformFee
```

**Permissões**:
- Cliente pode atualizar suas próprias solicitações
- Prestador pode atualizar solicitações recebidas

---

### 💬 Negociações

#### POST `/api/negotiations`

Criar nova proposta de negociação.

**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "requestId": "uuid",
  "pricingType": "fixed",
  "proposedPrice": "180.00",
  "proposedDate": "2024-01-16T10:00:00.000Z",
  "message": "Posso fazer por este valor na data proposta"
}
```

**Response** (200):
```json
{
  "id": "uuid",
  "requestId": "uuid",
  "proposerId": "uuid",
  "pricingType": "fixed",
  "proposedPrice": "180.00",
  "proposedDate": "2024-01-16T10:00:00.000Z",
  "message": "Posso fazer por este valor...",
  "status": "pending",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

**Efeito Colateral**:
- Altera status da solicitação para `negotiating`

---

#### PUT `/api/negotiations/:id/status`

Aceitar ou rejeitar negociação.

**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "status": "accepted"  // ou "rejected"
}
```

**Response** (200):
```json
{
  "message": "Negotiation status updated"
}
```

**Lógica de Aceitação**:
- Atualiza a solicitação com os valores propostos
- Muda status da solicitação para `payment_pending`
- Aplica pricing type, price, hours, days, date propostos

**Regras**:
- Usuário não pode responder à própria negociação
- Apenas cliente ou prestador da solicitação podem responder
- Status só pode ser `accepted` ou `rejected`

---

#### POST `/api/negotiations/:id/counter-proposal`

Criar contra-proposta para uma negociação.

**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "pricingType": "fixed",
  "proposedPrice": "190.00",
  "message": "Posso aceitar por este valor"
}
```

**Response** (200):
```json
{
  "message": "Counter proposal created successfully",
  "counterNegotiation": {
    "id": "uuid-novo",
    "requestId": "uuid",
    "proposerId": "uuid",
    "proposedPrice": "190.00",
    "message": "Posso aceitar por este valor",
    "status": "pending"
  },
  "originalNegotiationId": "uuid-original"
}
```

**Efeito Colateral**:
- Marca negociação original como `counter_proposed`
- Cria nova negociação com status `pending`

---

#### GET `/api/requests/:id/negotiations`

Listar todas as negociações de uma solicitação.

**Headers**: `Authorization: Bearer <token>`

**Response** (200):
```json
[
  {
    "id": "uuid",
    "requestId": "uuid",
    "proposerId": "uuid",
    "proposedPrice": "180.00",
    "message": "Primeira proposta",
    "status": "counter_proposed",
    "createdAt": "2024-01-01T00:00:00.000Z"
  },
  {
    "id": "uuid",
    "requestId": "uuid",
    "proposerId": "uuid",
    "proposedPrice": "190.00",
    "message": "Contra-proposta",
    "status": "accepted",
    "createdAt": "2024-01-01T01:00:00.000Z"
  }
]
```

---

### 💳 Pagamentos

#### POST `/api/requests/:id/payment`

Definir método de pagamento.

**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "paymentMethod": "pix"  // "boleto", "pix", "credit_card"
}
```

**Response** (200):
```json
{
  "id": "uuid",
  "status": "payment_pending",
  "paymentMethod": "pix",
  // ... outros campos
}
```

**Pré-requisitos**:
- Solicitação deve estar em status `payment_pending`
- Apenas o cliente pode definir método de pagamento

---

#### POST `/api/requests/:id/complete-payment`

Confirmar conclusão do pagamento.

**Headers**: `Authorization: Bearer <token>`

**Response** (200):
```json
{
  "id": "uuid",
  "status": "accepted",
  "paymentMethod": "pix",
  "paymentCompletedAt": "2024-01-01T12:00:00.000Z",
  // ... outros campos
}
```

**Lógica**:
- Define `paymentCompletedAt`
- Altera status para `accepted`

**Pré-requisitos**:
- Método de pagamento deve estar definido
- Apenas o cliente pode confirmar pagamento

---

### ⭐ Avaliações

#### POST `/api/reviews`

Criar avaliação para serviço concluído.

**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "requestId": "uuid",
  "revieweeId": "uuid",
  "rating": 5,
  "comment": "Excelente trabalho, muito profissional!"
}
```

**Response** (200):
```json
{
  "id": "uuid",
  "requestId": "uuid",
  "reviewerId": "uuid",
  "revieweeId": "uuid",
  "rating": 5,
  "comment": "Excelente trabalho...",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

**Validações**:
- `rating`: Número inteiro entre 1-5

---

#### GET `/api/reviews/provider/:providerId`

Listar avaliações de um prestador específico.

**Response** (200):
```json
[
  {
    "id": "uuid",
    "rating": 5,
    "comment": "Excelente trabalho!",
    "reviewer": {
      "name": "Maria Santos"
    },
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
]
```

---

#### GET `/api/providers/user/:userId/reviews`

Listar todas as avaliações recebidas por um usuário como prestador.

---

#### GET `/api/reviews/client/user/:userId/sent`

Listar avaliações enviadas por um usuário como cliente.

---

#### GET `/api/reviews/client/user/:userId/received`

Listar avaliações recebidas por um usuário como cliente.

---

### 💰 Saldo e Saques

#### GET `/api/users/me/balance`

Obter saldo do usuário autenticado.

**Headers**: `Authorization: Bearer <token>`

**Response** (200):
```json
{
  "balance": "1250.50"
}
```

---

#### POST `/api/withdrawals`

Solicitar saque do saldo.

**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "amount": 500.00
}
```

**Response** (200):
```json
{
  "id": "uuid",
  "userId": "uuid",
  "amount": "500.00",
  "status": "pending",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

**Regras**:
- `amount` deve ser maior que zero
- Saldo disponível deve ser suficiente
- Saldo é subtraído imediatamente

**Erros**:
- `400`: Valor inválido ou saldo insuficiente

---

#### GET `/api/withdrawals`

Listar saques do usuário autenticado.

**Headers**: `Authorization: Bearer <token>`

**Response** (200):
```json
[
  {
    "id": "uuid",
    "userId": "uuid",
    "amount": "500.00",
    "status": "completed",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
]
```

---

### 💬 Mensagens

#### POST `/api/messages`

Enviar mensagem.

**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "receiverId": "uuid",
  "content": "Olá, gostaria de saber...",
  "requestId": "uuid"  // Opcional
}
```

**Response** (200):
```json
{
  "id": "uuid",
  "senderId": "uuid",
  "receiverId": "uuid",
  "requestId": "uuid",
  "content": "Olá, gostaria de saber...",
  "isRead": false,
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

---

#### GET `/api/messages/conversation/:userId`

Obter conversas com um usuário específico.

**Headers**: `Authorization: Bearer <token>`

**Response** (200):
```json
[
  {
    "id": "uuid",
    "senderId": "uuid",
    "receiverId": "uuid",
    "content": "Mensagem 1",
    "isRead": true,
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
]
```

---

#### GET `/api/messages/received`

Listar mensagens recebidas.

**Headers**: `Authorization: Bearer <token>`

**Response** (200):
```json
[
  {
    "id": "uuid",
    "senderId": "uuid",
    "receiverId": "uuid",
    "content": "Nova mensagem",
    "isRead": false,
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
]
```

---

### 👑 Administração

Todos os endpoints admin requerem `isAdmin: true`.

#### GET `/api/admin/dashboard`

Dashboard com estatísticas do sistema.

**Headers**: `Authorization: Bearer <token>`

**Response** (200):
```json
{
  "statistics": {
    "totalUsers": 1523,
    "totalProviders": 342,
    "totalRequests": 1876,
    "totalCategories": 7
  },
  "recentUsers": [
    {
      "id": "uuid",
      "name": "João Silva",
      "email": "joao@example.com",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "recentRequests": [
    {
      "id": "uuid",
      "title": "Instalação elétrica",
      "status": "completed",
      "client": {
        "name": "Maria Santos"
      },
      "provider": {
        "description": "Eletricista profissional",
        "category": {
          "name": "Eletricista"
        }
      }
    }
  ]
}
```

---

#### GET `/api/admin/users`

Listar todos os usuários (com paginação e busca).

**Headers**: `Authorization: Bearer <token>`

**Query Parameters**:
- `page` (default: 1)
- `limit` (default: 20)
- `search` (opcional): Busca em nome e email

**Request**:
```http
GET /api/admin/users?page=1&limit=20&search=joão
```

**Response** (200):
```json
[
  {
    "id": "uuid",
    "name": "João Silva",
    "email": "joao@example.com",
    "isProviderEnabled": true,
    "isAdmin": false,
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
]
```

---

#### GET `/api/admin/requests`

Listar todas as solicitações (com paginação e filtro).

**Headers**: `Authorization: Bearer <token>`

**Query Parameters**:
- `page` (default: 1)
- `limit` (default: 20)
- `status` (opcional): Filtrar por status

**Request**:
```http
GET /api/admin/requests?page=1&limit=20&status=completed
```

---

#### PUT `/api/admin/users/:id/admin`

Atualizar status de administrador de um usuário.

**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "isAdmin": true
}
```

**Response** (200):
```json
{
  "id": "uuid",
  "isAdmin": true,
  // ... outros campos
}
```

---

#### DELETE `/api/admin/users/:id`

Deletar usuário.

**Headers**: `Authorization: Bearer <token>`

**Response** (200):
```json
{
  "message": "User deleted successfully"
}
```

**Regras**:
- Admin não pode deletar a si próprio

**Erros**:
- `400`: Tentativa de auto-exclusão

---

### 🔍 Utilitários

#### GET `/api/health`

Health check para Docker/monitoramento.

**Response** (200 - Healthy):
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "database": "connected"
}
```

**Response** (503 - Unhealthy):
```json
{
  "status": "unhealthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "database": "disconnected",
  "error": "Connection timeout"
}
```

---

#### GET `/api/debug/auth`

Debug de autenticação (desenvolvimento).

**Headers**: `Authorization: Bearer <token>`

**Response** (200):
```json
{
  "authenticatedUser": {
    "userId": "uuid",
    "isProviderEnabled": true,
    "isAdmin": false
  },
  "userFromDB": {
    "id": "uuid",
    "name": "João Silva",
    // ... dados completos do usuário
  },
  "providerProfile": {
    // ... dados do prestador se existir
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

#### GET `/api/users/:id`

Obter dados públicos de um usuário.

**Response** (200):
```json
{
  "id": "uuid",
  "name": "João Silva",
  "email": "joao@example.com",
  "bio": "Profissional experiente",
  "location": "São Paulo - SP",
  // ... outros campos públicos
}
```

---

## Fluxos de Negócio

### 1. Fluxo de Registro e Ativação de Prestador

```mermaid
sequenceDiagram
    participant U as Usuário
    participant A as API
    participant DB as Database

    U->>A: POST /api/auth/register
    A->>DB: Criar usuário
    A->>U: Token JWT + user data

    U->>A: POST /api/auth/enable-provider
    A->>DB: Atualizar isProviderEnabled = true
    A->>U: Novo token + profileStatus

    U->>A: PUT /api/auth/profile
    A->>DB: Atualizar bio, experience, location
    A->>U: Perfil atualizado

    U->>A: POST /api/providers
    A->>DB: Criar service provider
    A->>U: Service provider criado
```

**Passos**:
1. Usuário se registra (`POST /api/auth/register`)
2. Habilita capacidade de prestador (`POST /api/auth/enable-provider`)
3. Completa perfil (`PUT /api/auth/profile`)
4. Cria serviço em categoria (`POST /api/providers`)

---

### 2. Fluxo de Solicitação e Negociação

```mermaid
sequenceDiagram
    participant C as Cliente
    participant A as API
    participant P as Prestador
    participant DB as Database

    C->>A: POST /api/requests
    A->>DB: Criar solicitação (status: pending)
    A->>C: Solicitação criada

    P->>A: GET /api/requests/provider
    A->>P: Lista de solicitações

    P->>A: POST /api/negotiations
    A->>DB: Criar negociação
    A->>DB: Atualizar request status = negotiating
    A->>P: Negociação criada

    C->>A: PUT /api/negotiations/:id/status (accepted)
    A->>DB: Atualizar negociação
    A->>DB: Atualizar request (payment_pending)
    A->>C: Negociação aceita
```

**Passos**:
1. Cliente cria solicitação (`POST /api/requests`) → status: `pending`
2. Prestador visualiza solicitações (`GET /api/requests/provider`)
3. Prestador envia proposta (`POST /api/negotiations`) → status: `negotiating`
4. Cliente aceita (`PUT /api/negotiations/:id/status`) → status: `payment_pending`
5. Opcionalmente: Contra-propostas até acordo

---

### 3. Fluxo de Pagamento e Conclusão

```mermaid
sequenceDiagram
    participant C as Cliente
    participant A as API
    participant P as Prestador
    participant DB as Database

    C->>A: POST /api/requests/:id/payment
    A->>DB: Definir paymentMethod
    A->>C: Método definido

    C->>A: POST /api/requests/:id/complete-payment
    A->>DB: Atualizar paymentCompletedAt
    A->>DB: Status = accepted
    A->>C: Pagamento confirmado

    Note over P: Prestador realiza serviço

    P->>A: PUT /api/requests/:id (status: completed)
    A->>DB: Definir providerCompletedAt
    A->>DB: Status = pending_completion
    A->>P: Marcado como concluído

    C->>A: PUT /api/requests/:id (status: completed)
    A->>DB: Definir clientCompletedAt
    A->>DB: Status = completed
    A->>DB: Adicionar saldo ao prestador
    A->>C: Serviço concluído

    C->>A: POST /api/reviews
    A->>DB: Criar avaliação
    A->>C: Avaliação criada
```

**Passos**:
1. Cliente define método de pagamento (`POST /api/requests/:id/payment`)
2. Cliente confirma pagamento (`POST /api/requests/:id/complete-payment`) → status: `accepted`
3. Prestador realiza o serviço
4. Prestador marca como concluído (`PUT /api/requests/:id`) → status: `pending_completion`
5. Cliente confirma conclusão (`PUT /api/requests/:id`) → status: `completed`
   - **Saldo creditado ao prestador** (valor - 5% taxa)
6. Cliente/Prestador avaliam (`POST /api/reviews`)

---

### 4. Fluxo de Saque

```mermaid
sequenceDiagram
    participant P as Prestador
    participant A as API
    participant DB as Database

    P->>A: GET /api/users/me/balance
    A->>P: balance: 1250.50

    P->>A: POST /api/withdrawals (amount: 500)
    A->>DB: Criar withdrawal (status: pending)
    A->>DB: Subtrair do saldo
    A->>P: Saque solicitado

    Note over DB: Admin processa saque manualmente

    Note over DB: Admin atualiza status = completed
```

**Passos**:
1. Prestador verifica saldo (`GET /api/users/me/balance`)
2. Solicita saque (`POST /api/withdrawals`)
   - Saldo é subtraído imediatamente
   - Withdrawal criado com status `pending`
3. Admin processa saque offline
4. Admin atualiza status para `completed` ou `cancelled`

---

## Códigos de Status HTTP

### Sucesso (2xx)
- **200 OK**: Requisição bem-sucedida
- **201 Created**: Recurso criado (raramente usado, prefere-se 200)

### Erros do Cliente (4xx)
- **400 Bad Request**: Dados inválidos ou regra de negócio violada
- **401 Unauthorized**: Token não fornecido
- **403 Forbidden**: Token inválido ou permissões insuficientes
- **404 Not Found**: Recurso não encontrado

### Erros do Servidor (5xx)
- **500 Internal Server Error**: Erro inesperado
- **503 Service Unavailable**: Health check failed (banco desconectado)

---

## Variáveis de Ambiente

### Obrigatórias

```bash
# JWT
JWT_SECRET=seu-secret-super-seguro-aqui

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/dbname

# Servidor
PORT=5000
NODE_ENV=development  # ou production
```

### Opcionais (HTTPS)

```bash
# HTTPS (apenas produção)
SSL_CERT=/path/to/cert.pem
SSL_KEY=/path/to/key.pem
```

### Exemplo (.env)

```bash
# JWT Secret (mínimo 32 caracteres)
JWT_SECRET=supersecretjwtkeywith32characters

# PostgreSQL Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/servicemarketplace

# Server Config
PORT=5000
NODE_ENV=development

# HTTPS (production only)
# SSL_CERT=/etc/ssl/certs/cert.pem
# SSL_KEY=/etc/ssl/private/key.pem
```

---

## Segurança

### Proteções Implementadas

1. **Autenticação JWT**:
   - Tokens assinados com HS256
   - Validação em todas as rotas protegidas

2. **Criptografia de Senhas**:
   - bcrypt com 10 rounds
   - Nunca retorna senha nas respostas

3. **Validação de Dados**:
   - Zod schemas para todos os inputs
   - Sanitização automática

4. **Autorização**:
   - Verificação de propriedade de recursos
   - Middleware de admin

### Boas Práticas

```typescript
// ✅ Sempre use Authorization header
headers: {
  'Authorization': `Bearer ${token}`
}

// ✅ Valide inputs no cliente antes de enviar
const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

// ✅ Trate erros apropriadamente
try {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials)
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }
} catch (error) {
  console.error('Login failed:', error);
}
```

---

## Rate Limiting

⚠️ **Não implementado**: Considerar adicionar rate limiting para:
- Login/Register: 5 tentativas por minuto
- API geral: 100 requisições por minuto

---

## Webhooks

⚠️ **Não implementado**: Sistema de webhooks para notificações em tempo real.

Considerar adicionar para:
- Nova solicitação recebida
- Negociação aceita/rejeitada
- Pagamento confirmado
- Serviço concluído

---

## Versionamento da API

**Versão Atual**: v1 (implícita)

Não há versionamento explícito na URL. Para futuras versões, considerar:
- `/api/v2/...`
- Header `API-Version: 2`

---

## Exemplos de Integração

### cURL

```bash
# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"senha123"}'

# Listar categorias (sem auth)
curl http://localhost:5000/api/categories

# Obter usuário autenticado
curl http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."

# Criar solicitação
curl -X POST http://localhost:5000/api/requests \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "providerId": "uuid",
    "title": "Instalação elétrica",
    "description": "Preciso instalar tomadas",
    "pricingType": "fixed",
    "proposedPrice": "200.00"
  }'
```

### JavaScript (Fetch)

```javascript
// Login e armazenamento do token
async function login(email, password) {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  
  const data = await response.json();
  localStorage.setItem('token', data.token);
  return data.user;
}

// Criar solicitação de serviço
async function createServiceRequest(requestData) {
  const token = localStorage.getItem('token');
  
  const response = await fetch('/api/requests', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestData)
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }
  
  return response.json();
}

// Listar solicitações do cliente
async function getMyRequests() {
  const token = localStorage.getItem('token');
  
  const response = await fetch('/api/requests', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  return response.json();
}
```

### React + TanStack Query

```typescript
import { useQuery, useMutation } from '@tanstack/react-query';

// Hook para obter solicitações
function useRequests() {
  return useQuery({
    queryKey: ['requests'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/requests', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return response.json();
    }
  });
}

// Hook para criar solicitação
function useCreateRequest() {
  return useMutation({
    mutationFn: async (requestData) => {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/requests', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      });
      return response.json();
    }
  });
}

// Componente
function RequestsList() {
  const { data: requests, isLoading } = useRequests();
  const createRequest = useCreateRequest();
  
  if (isLoading) return <div>Loading...</div>;
  
  return (
    <div>
      {requests.map(request => (
        <div key={request.id}>{request.title}</div>
      ))}
    </div>
  );
}
```

---

## Troubleshooting

### Erro: "JWT_SECRET environment variable is required"

**Causa**: Variável de ambiente `JWT_SECRET` não definida.

**Solução**:
```bash
# Criar arquivo .env na raiz do projeto
echo "JWT_SECRET=supersecretjwtkeywith32characters" > .env
```

### Erro: "Invalid token" (403)

**Causas**:
1. Token expirado
2. Token inválido
3. JWT_SECRET mudou

**Solução**:
```javascript
// Re-autenticar usuário
localStorage.removeItem('token');
window.location.href = '/login';
```

### Erro: "Provider capability must be enabled first"

**Causa**: Tentando criar serviço sem habilitar capacidade de prestador.

**Solução**:
```javascript
// 1. Habilitar capacidade
await fetch('/api/auth/enable-provider', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` }
});

// 2. Completar perfil
await fetch('/api/auth/profile', {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    bio: '...',
    experience: '...',
    location: '...'
  })
});

// 3. Criar serviço
await fetch('/api/providers', { ... });
```

### Erro: Database Connection Failed

**Causa**: PostgreSQL não está rodando ou URL incorreta.

**Solução**:
```bash
# Verificar se PostgreSQL está rodando
docker-compose ps

# Reiniciar serviços
docker-compose down
docker-compose up -d
```

---

## Changelog

### v1.0.0 (2024-01-01)
- ✨ Release inicial
- 🔐 Autenticação JWT
- 👤 Sistema de usuários e prestadores
- 📝 Solicitações de serviço
- 💬 Sistema de negociações
- ⭐ Avaliações
- 💰 Saldo e saques
- 👑 Dashboard administrativo

---

## Roadmap

### Futuras Melhorias

- [ ] **WebSockets**: Notificações em tempo real
- [ ] **Upload de Imagens**: Fotos de perfil e portfólio
- [ ] **Geolocalização**: Busca por proximidade
- [ ] **Sistema de Notificações**: Email/SMS
- [ ] **Rate Limiting**: Proteção contra abuso
- [ ] **API Versioning**: Suporte a múltiplas versões
- [ ] **GraphQL**: Alternativa ao REST
- [ ] **Testes Automatizados**: Unit + Integration
- [ ] **CI/CD**: Deploy automático
- [ ] **Monitoring**: Logs estruturados + métricas

---

## Suporte

Para dúvidas ou problemas:
- **Email**: suporte@example.com
- **Documentação**: Esta documentação
- **Issues**: GitHub Issues (se aplicável)

---

**Última Atualização**: 2024-01-01  
**Autor**: Equipe de Backend  
**Versão da API**: 1.0.0
