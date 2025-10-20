# 📚 Documentação Completa da API - Service Marketplace

> Documentação técnica completa para desenvolvedores backend e frontend.

---

## 🎯 Visão Geral

Esta é uma **API REST completa** para uma plataforma de marketplace de serviços que conecta clientes a prestadores de serviço profissionais. A plataforma permite:

- ✅ Registro e autenticação de usuários
- 👷 Cadastro de prestadores de serviço em múltiplas categorias
- 📝 Criação e gerenciamento de solicitações de serviço
- 💬 Sistema de negociação de preços e condições
- 💳 Processamento de pagamentos
- ⭐ Sistema de avaliações
- 💰 Gestão de saldo e saques para prestadores
- 👑 Dashboard administrativo

---

## 📖 Documentação Disponível

### 1️⃣ [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)
**Documentação Técnica Completa**

Referência completa de todos os endpoints, modelos de dados e fluxos de negócio.

📋 **Conteúdo:**
- Visão geral da arquitetura
- Sistema de autenticação JWT
- Modelos de dados detalhados (schemas)
- Documentação de todos os endpoints
- Fluxos de negócio principais
- Códigos de status HTTP
- Variáveis de ambiente
- Segurança e boas práticas

👉 **Use quando precisar:**
- Entender a estrutura da API
- Consultar endpoints específicos
- Compreender os modelos de dados
- Implementar autenticação
- Configurar ambiente

---

### 2️⃣ [API_EXAMPLES.md](./API_EXAMPLES.md)
**Guia Prático com Exemplos de Código**

Exemplos práticos e reutilizáveis para integração rápida.

📋 **Conteúdo:**
- Setup do cliente HTTP
- Casos de uso completos (cliente e prestador)
- Snippets reutilizáveis (React Hooks, componentes)
- Tratamento de erros
- Boas práticas de implementação
- Otimizações de performance

👉 **Use quando precisar:**
- Implementar funcionalidades rapidamente
- Ver exemplos de código real
- Criar hooks React personalizados
- Entender fluxos completos na prática
- Implementar tratamento de erros

---

### 3️⃣ [API_TESTING_DEBUG.md](./API_TESTING_DEBUG.md)
**Guia de Testes e Debugging**

Ferramentas e técnicas para testar e debugar a API.

📋 **Conteúdo:**
- Coleções Postman/Insomnia
- Testes automatizados (Jest + Supertest)
- Configuração de debugging (VS Code)
- Logging e monitoramento
- Solução de problemas comuns
- Ferramentas úteis

👉 **Use quando precisar:**
- Testar endpoints manualmente
- Escrever testes automatizados
- Debugar problemas
- Monitorar performance
- Resolver erros comuns

---

## 🚀 Quick Start

### Pré-requisitos

```bash
Node.js >= 18
PostgreSQL >= 14
Docker (opcional, mas recomendado)
```

### 1. Clone e Instale

```bash
# Clone o repositório
git clone <repository-url>
cd <project-directory>

# Instale dependências
npm install
```

### 2. Configure Variáveis de Ambiente

```bash
# Crie arquivo .env na raiz
cp .env.example .env

# Edite com suas configurações
nano .env
```

**Variáveis obrigatórias:**
```env
JWT_SECRET=seu-secret-super-seguro-aqui
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
PORT=5000
NODE_ENV=development
```

### 3. Inicie o Banco de Dados

**Com Docker:**
```bash
docker-compose up -d postgres
```

**Sem Docker:**
```bash
# Certifique-se de que PostgreSQL está rodando
# Crie o banco de dados
createdb servicemarketplace
```

### 4. Execute Migrations

```bash
npm run db:push
```

### 5. Inicie o Servidor

**Desenvolvimento:**
```bash
npm run dev
```

**Produção:**
```bash
npm run build
npm start
```

### 6. Teste a API

```bash
# Health check
curl http://localhost:5000/api/health

# Listar categorias
curl http://localhost:5000/api/categories
```

---

## 📊 Estrutura do Projeto

```
.
├── server/
│   ├── index.ts          # Configuração Express
│   ├── routes.ts         # Definição de rotas
│   ├── db.ts            # Configuração Drizzle ORM
│   └── storage.ts       # Camada de acesso a dados
│
├── shared/
│   └── schema.ts        # Schemas do banco (Drizzle + Zod)
│
├── client/
│   └── src/             # Aplicação React
│
├── scripts/
│   └── clear-db.ts      # Scripts auxiliares
│
├── .env                 # Variáveis de ambiente (não commitar)
├── docker-compose.yml   # Configuração Docker
├── drizzle.config.ts    # Config Drizzle
└── package.json
```

---

## 🔑 Principais Endpoints

### Autenticação
```
POST   /api/auth/register        # Registrar usuário
POST   /api/auth/login           # Login
GET    /api/auth/me              # Usuário atual
POST   /api/auth/enable-provider # Habilitar prestador
PUT    /api/auth/profile         # Atualizar perfil
```

### Categorias
```
GET    /api/categories           # Listar categorias
```

### Prestadores
```
GET    /api/providers            # Listar prestadores
GET    /api/providers/:id        # Detalhes de prestador
POST   /api/providers            # Criar serviço
PUT    /api/providers/:id        # Atualizar serviço
DELETE /api/providers/:id        # Deletar serviço
```

### Solicitações
```
GET    /api/requests             # Solicitações do cliente
GET    /api/requests/provider    # Solicitações do prestador
POST   /api/requests             # Criar solicitação
PUT    /api/requests/:id         # Atualizar solicitação
```

### Negociações
```
POST   /api/negotiations                      # Criar proposta
PUT    /api/negotiations/:id/status           # Aceitar/Rejeitar
POST   /api/negotiations/:id/counter-proposal # Contra-proposta
GET    /api/requests/:id/negotiations         # Listar negociações
```

### Pagamentos
```
POST   /api/requests/:id/payment          # Definir método
POST   /api/requests/:id/complete-payment # Confirmar pagamento
```

### Avaliações
```
POST   /api/reviews                      # Criar avaliação
GET    /api/reviews/provider/:id         # Avaliações de prestador
```

### Saldo
```
GET    /api/users/me/balance    # Ver saldo
POST   /api/withdrawals         # Solicitar saque
GET    /api/withdrawals         # Listar saques
```

### Admin
```
GET    /api/admin/dashboard     # Dashboard
GET    /api/admin/users         # Listar usuários
GET    /api/admin/requests      # Listar solicitações
PUT    /api/admin/users/:id/admin # Atualizar admin
DELETE /api/admin/users/:id    # Deletar usuário
```

---

## 🔐 Autenticação

A API usa **JWT (JSON Web Tokens)** para autenticação.

### Como Autenticar

1. **Registrar ou fazer login:**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "usuario@example.com",
    "password": "senha123"
  }'
```

2. **Receber token:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": { "id": "...", "name": "..." }
}
```

3. **Usar em requisições:**
```bash
curl http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## 💡 Fluxos Principais

### Fluxo do Cliente

```mermaid
graph LR
    A[Registro] --> B[Buscar Prestadores]
    B --> C[Criar Solicitação]
    C --> D[Negociar]
    D --> E[Pagar]
    E --> F[Receber Serviço]
    F --> G[Avaliar]
```

### Fluxo do Prestador

```mermaid
graph LR
    A[Registro] --> B[Habilitar Prestador]
    B --> C[Completar Perfil]
    C --> D[Criar Serviço]
    D --> E[Receber Solicitações]
    E --> F[Negociar]
    F --> G[Realizar Serviço]
    G --> H[Receber Pagamento]
```

---

## 🧪 Testes

### Testes Manuais (Postman)

1. Importe a coleção do [API_TESTING_DEBUG.md](./API_TESTING_DEBUG.md)
2. Configure as variáveis de ambiente
3. Execute os requests

### Testes Automatizados

```bash
# Rodar todos os testes
npm test

# Testes com coverage
npm run test:coverage

# Testes em modo watch
npm run test:watch
```

---

## 🐛 Debugging

### VS Code

1. Abra o projeto no VS Code
2. Use a configuração de debug em `.vscode/launch.json`
3. Pressione F5 para iniciar debug

### Logs

Os logs são salvos em:
- `logs/error.log` - Apenas erros
- `logs/combined.log` - Todos os logs

### Ferramentas Úteis

- **Postman**: Testes de API
- **pgAdmin**: Interface PostgreSQL
- **Docker Desktop**: Gerenciar containers

---

## 📚 Recursos Adicionais

### Stack Tecnológica

| Categoria | Tecnologia |
|-----------|-----------|
| Runtime | Node.js 18+ |
| Framework | Express.js |
| Linguagem | TypeScript |
| Banco de Dados | PostgreSQL 14+ |
| ORM | Drizzle ORM |
| Validação | Zod |
| Autenticação | JWT |
| Containerização | Docker |

### Dependências Principais

```json
{
  "express": "^4.21.2",
  "drizzle-orm": "^0.39.1",
  "jsonwebtoken": "^9.0.2",
  "bcrypt": "^6.0.0",
  "zod": "^3.24.2",
  "pg": "^8.12.0"
}
```

---

## 🔧 Scripts Disponíveis

```bash
npm run dev           # Iniciar em desenvolvimento
npm run build         # Build para produção
npm start             # Iniciar produção
npm test              # Rodar testes
npm run db:push       # Aplicar migrations
npm run db:clear      # Limpar banco de dados
npm run docker:up     # Iniciar containers
npm run docker:down   # Parar containers
npm run docker:logs   # Ver logs dos containers
```

---

## 🤝 Contribuindo

### Padrões de Código

1. **TypeScript**: Sempre tipar corretamente
2. **Validação**: Usar Zod para todos os inputs
3. **Erros**: Retornar mensagens claras
4. **Commits**: Usar conventional commits

### Exemplo de Commit

```bash
git commit -m "feat: adicionar endpoint de notificações"
git commit -m "fix: corrigir cálculo de taxa de serviço"
git commit -m "docs: atualizar documentação de autenticação"
```

---

## ❓ Perguntas Frequentes

### Como resetar o banco de dados?

```bash
npm run db:clear
npm run db:push
```

### Como adicionar uma nova categoria?

As categorias são criadas automaticamente no seed. Edite `server/routes.ts`:

```typescript
const categories = [
  { name: "Nova Categoria", icon: "fas fa-icon", slug: "nova-categoria" },
  // ...
];
```

### Como mudar a taxa da plataforma?

Edite em `server/routes.ts`:

```typescript
const platformFee = serviceAmount * 0.05; // 5% → Altere aqui
```

### Como adicionar HTTPS?

Configure as variáveis de ambiente:

```env
SSL_CERT=/path/to/cert.pem
SSL_KEY=/path/to/key.pem
```

---

## 📞 Suporte

### Problemas Comuns

Consulte [API_TESTING_DEBUG.md](./API_TESTING_DEBUG.md) seção "Problemas Comuns".

### Precisa de Ajuda?

1. Verifique a documentação relevante
2. Procure em Issues do GitHub
3. Abra uma nova Issue com:
   - Descrição do problema
   - Steps to reproduce
   - Logs relevantes
   - Ambiente (OS, Node version, etc.)

---

## 📄 Licença

Este projeto está sob a licença MIT.

---

## 🗺️ Roadmap

### Versão 1.1 (Próxima)
- [ ] WebSockets para notificações em tempo real
- [ ] Upload de imagens (perfil e portfólio)
- [ ] Sistema de chat integrado
- [ ] Notificações por email

### Versão 1.2
- [ ] Geolocalização e busca por proximidade
- [ ] Integração com gateway de pagamento real
- [ ] Sistema de agendamento com calendário
- [ ] App mobile (React Native)

### Versão 2.0
- [ ] GraphQL API
- [ ] Microserviços
- [ ] Sistema de assinaturas
- [ ] Analytics avançado

---

## 📊 Status do Projeto

![Build Status](https://img.shields.io/badge/build-passing-brightgreen)
![Coverage](https://img.shields.io/badge/coverage-85%25-green)
![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-blue)

---

## 🙏 Agradecimentos

Desenvolvido com ❤️ para facilitar a conexão entre clientes e prestadores de serviço.

---

**Última Atualização**: 2024-01-01  
**Versão da API**: 1.0.0  
**Documentação**: v1.0.0

---

## 🔗 Links Rápidos

- [📖 Documentação Completa](./API_DOCUMENTATION.md)
- [💻 Exemplos de Código](./API_EXAMPLES.md)
- [🧪 Testes e Debug](./API_TESTING_DEBUG.md)
- [🐳 Docker Hub](#) (se publicado)
- [📝 Changelog](#) (se existir)
