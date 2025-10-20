# 🚀 API Quick Reference - Cheat Sheet

> Referência rápida para consulta durante desenvolvimento

---

## 🔑 Autenticação Rápida

### Setup Headers
```typescript
const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${token}`
};
```

### Login Express
```bash
# Login
curl -X POST localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@mail.com","password":"senha123"}'

# Usar token
TOKEN="eyJhbGciOiJIUz..." # copiar do response
curl localhost:5000/api/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

---

## 📋 Endpoints por Categoria

### Auth
| Método | Endpoint | Auth | Descrição |
|--------|----------|------|-----------|
| POST | `/auth/register` | ❌ | Registrar |
| POST | `/auth/login` | ❌ | Login |
| GET | `/auth/me` | ✅ | Usuário atual |
| POST | `/auth/enable-provider` | ✅ | Habilitar prestador |
| PUT | `/auth/profile` | ✅ | Atualizar perfil |
| GET | `/auth/profile/status` | ✅ | Status do perfil |

### Providers
| Método | Endpoint | Auth | Descrição |
|--------|----------|------|-----------|
| GET | `/providers` | ❌ | Listar |
| GET | `/providers/:id` | ❌ | Detalhes |
| POST | `/providers` | ✅ | Criar |
| PUT | `/providers/:id` | ✅ | Atualizar |
| DELETE | `/providers/:id` | ✅ | Deletar |
| GET | `/users/me/providers` | ✅ | Meus serviços |

### Requests
| Método | Endpoint | Auth | Descrição |
|--------|----------|------|-----------|
| GET | `/requests` | ✅ | Minhas (cliente) |
| GET | `/requests/provider` | ✅ | Minhas (prestador) |
| POST | `/requests` | ✅ | Criar |
| PUT | `/requests/:id` | ✅ | Atualizar |

### Negotiations
| Método | Endpoint | Auth | Descrição |
|--------|----------|------|-----------|
| POST | `/negotiations` | ✅ | Nova proposta |
| PUT | `/negotiations/:id/status` | ✅ | Aceitar/Rejeitar |
| POST | `/negotiations/:id/counter-proposal` | ✅ | Contra-proposta |
| GET | `/requests/:id/negotiations` | ✅ | Listar |

### Payments
| Método | Endpoint | Auth | Descrição |
|--------|----------|------|-----------|
| POST | `/requests/:id/payment` | ✅ | Definir método |
| POST | `/requests/:id/complete-payment` | ✅ | Confirmar |

### Reviews
| Método | Endpoint | Auth | Descrição |
|--------|----------|------|-----------|
| POST | `/reviews` | ✅ | Criar |
| GET | `/reviews/provider/:id` | ❌ | De prestador |

### Balance
| Método | Endpoint | Auth | Descrição |
|--------|----------|------|-----------|
| GET | `/users/me/balance` | ✅ | Ver saldo |
| POST | `/withdrawals` | ✅ | Solicitar saque |
| GET | `/withdrawals` | ✅ | Listar saques |

---

## 📝 Request Bodies Comuns

### Register
```json
{
  "email": "user@example.com",
  "password": "senha123",
  "name": "João Silva",
  "phone": "(11) 98765-4321",
  "cpf": "12345678901",
  "birthDate": "1990-01-01"
}
```

### Create Provider
```json
{
  "categoryId": "uuid",
  "description": "Profissional experiente",
  "pricingTypes": ["hourly", "fixed"],
  "minHourlyRate": "80.00",
  "minFixedRate": "150.00",
  "location": "São Paulo - SP"
}
```

### Create Request
```json
{
  "providerId": "uuid",
  "title": "Instalação elétrica",
  "description": "Descrição detalhada...",
  "pricingType": "fixed",
  "proposedPrice": "200.00",
  "scheduledDate": "2024-01-20T14:00:00Z"
}
```

### Create Negotiation
```json
{
  "requestId": "uuid",
  "pricingType": "fixed",
  "proposedPrice": "250.00",
  "message": "Contra-proposta..."
}
```

### Create Review
```json
{
  "requestId": "uuid",
  "revieweeId": "uuid",
  "rating": 5,
  "comment": "Excelente trabalho!"
}
```

---

## 🔄 Status dos Requests

```
pending          → Aguardando resposta
  ↓
negotiating      → Em negociação
  ↓
payment_pending  → Aguardando pagamento
  ↓
accepted         → Pagamento confirmado
  ↓
pending_completion → Um confirmou conclusão
  ↓
completed        → Ambos confirmaram
```

### Quando mudar status?

- **pending** → **negotiating**: Ao criar negotiation
- **negotiating** → **payment_pending**: Ao aceitar negotiation
- **payment_pending** → **accepted**: Ao confirmar pagamento
- **accepted** → **pending_completion**: Primeiro a marcar como completo
- **pending_completion** → **completed**: Segundo a marcar como completo

---

## 💰 Cálculo de Valores

### Taxa da Plataforma
```typescript
const serviceAmount = 400.00;
const platformFee = serviceAmount * 0.05;  // 5%
const providerAmount = serviceAmount - platformFee;

// Exemplo: R$ 400 → Prestador recebe R$ 380
```

### Por Tipo de Precificação

**Hourly:**
```typescript
const total = hourlyRate * proposedHours;
// Ex: R$ 80/h * 4h = R$ 320
```

**Daily:**
```typescript
const total = dailyRate * proposedDays;
// Ex: R$ 300/dia * 2 dias = R$ 600
```

**Fixed:**
```typescript
const total = proposedPrice;
// Ex: R$ 500 (fixo)
```

---

## 🐛 Debugging Rápido

### Ver Token Decodificado
```typescript
import jwt from 'jsonwebtoken';
const decoded = jwt.decode(token);
console.log(decoded);
```

### Testar Query Manual
```typescript
const users = await db.select().from(users);
console.log(users);
```

### Ver Erro Completo Zod
```typescript
try {
  schema.parse(data);
} catch (e) {
  console.log(e.errors); // Array de erros
}
```

---

## ⚡ Hooks React Prontos

### useAuth
```typescript
const { user, login, logout, isAuthenticated } = useAuth();
```

### useRequests
```typescript
const { data: requests, isLoading } = useRequests();
```

### useCreateRequest
```typescript
const { mutate: create } = useCreateRequest();
create({ providerId: '...', title: '...' });
```

---

## 🎨 Componentes Úteis

### Protected Route
```typescript
function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" />;
  return children;
}
```

### Request Status Badge
```typescript
const statusColors = {
  pending: 'yellow',
  negotiating: 'blue',
  payment_pending: 'orange',
  accepted: 'green',
  completed: 'gray',
  cancelled: 'red',
};
```

---

## 📊 Validações Comuns

### CPF
```typescript
// 11-14 caracteres (com ou sem máscara)
cpf: z.string().min(11).max(14)
```

### Data de Nascimento
```typescript
// Mínimo 18 anos
birthDate: z.string().refine(date => {
  const age = (new Date() - new Date(date)) / 31557600000;
  return age >= 18;
})
```

### Email
```typescript
email: z.string().email()
```

### Preço
```typescript
proposedPrice: z.string().regex(/^\d+(\.\d{2})?$/)
```

### Rating
```typescript
rating: z.number().min(1).max(5)
```

---

## 🔧 Variáveis de Ambiente

### Desenvolvimento
```env
NODE_ENV=development
JWT_SECRET=dev-secret-min-32-chars
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/dev
PORT=5000
```

### Produção
```env
NODE_ENV=production
JWT_SECRET=super-secure-production-secret-here
DATABASE_URL=postgresql://user:pass@host:5432/prod
PORT=5000
SSL_CERT=/path/to/cert.pem
SSL_KEY=/path/to/key.pem
```

---

## 🚨 Códigos de Erro

| Código | Significado | Ação |
|--------|-------------|------|
| 400 | Bad Request | Validar dados |
| 401 | Unauthorized | Fazer login |
| 403 | Forbidden | Verificar permissões |
| 404 | Not Found | Verificar ID |
| 500 | Server Error | Ver logs |

### Mensagens Comuns

- `"Access token required"` → Header Authorization faltando
- `"Invalid token"` → Token expirado ou inválido
- `"Provider capability must be enabled first"` → Precisa habilitar prestador
- `"Email já está em uso"` → Email duplicado
- `"Invalid credentials"` → Email/senha errados

---

## 🎯 Fluxos Rápidos

### Cliente Solicita Serviço
```typescript
// 1. Login
const { token } = await login(email, password);

// 2. Buscar prestadores
const providers = await getProviders({ categoryId });

// 3. Criar solicitação
const request = await createRequest({
  providerId: providers[0].id,
  title: 'Título',
  description: 'Descrição',
  pricingType: 'fixed',
  proposedPrice: '200.00'
});

// 4. Aguardar negociação...
// 5. Aceitar negociação
await acceptNegotiation(negotiationId);

// 6. Pagar
await setPaymentMethod(requestId, 'pix');
await completePayment(requestId);

// 7. Marcar como concluído
await updateRequest(requestId, { status: 'completed' });

// 8. Avaliar
await createReview({
  requestId,
  revieweeId: provider.userId,
  rating: 5,
  comment: 'Ótimo!'
});
```

### Prestador Responde
```typescript
// 1. Login
const { token } = await login(email, password);

// 2. Habilitar prestador (se necessário)
await enableProvider();
await updateProfile({ bio, experience, location });

// 3. Criar serviço
await createProvider({
  categoryId,
  description,
  pricingTypes: ['hourly'],
  minHourlyRate: '80.00',
  location
});

// 4. Ver solicitações
const { requests } = await getProviderRequests();

// 5. Negociar
await createNegotiation({
  requestId: requests[0].id,
  pricingType: 'hourly',
  proposedHours: 5,
  proposedPrice: '400.00',
  message: 'Proposta...'
});

// 6. Após aceite e pagamento...
// 7. Marcar como concluído
await updateRequest(requestId, { status: 'completed' });

// 8. Ver saldo
const { balance } = await getBalance();

// 9. Solicitar saque
await createWithdrawal({ amount: balance });
```

---

## 📦 Database Queries Rápidas

### Verificar Usuário
```sql
SELECT * FROM users WHERE email = 'user@example.com';
```

### Ver Todas as Solicitações
```sql
SELECT sr.*, u.name as client_name, sp.description 
FROM service_requests sr
LEFT JOIN users u ON sr.client_id = u.id
LEFT JOIN service_providers sp ON sr.provider_id = sp.id
ORDER BY sr.created_at DESC;
```

### Ver Saldo de Todos os Prestadores
```sql
SELECT u.name, u.email, u.balance
FROM users u
WHERE u.is_provider_enabled = true
ORDER BY CAST(u.balance AS DECIMAL) DESC;
```

---

## 🎭 Mock Data

### Usuário Teste
```json
{
  "email": "test@example.com",
  "password": "senha123",
  "name": "Test User",
  "phone": "(11) 98765-4321",
  "cpf": "12345678901",
  "birthDate": "1990-01-01"
}
```

### CPFs Válidos para Teste
```
123.456.789-01
987.654.321-00
111.222.333-44
```

---

## 🔍 Busca Rápida

### Encontrar Categoria
```typescript
const categories = await api.get('/categories');
const categoryId = categories.find(c => c.slug === 'eletricista').id;
```

### Encontrar Prestador por Usuário
```typescript
const providers = await api.get('/users/me/providers');
const providerId = providers[0].id;
```

---

## 💡 Dicas Pro

### 1. Sempre Validar Antes de Enviar
```typescript
const schema = z.object({ /* ... */ });
const validated = schema.parse(data); // Lança erro se inválido
```

### 2. Use TypeScript
```typescript
import type { ServiceRequest } from '@shared/schema';

const request: ServiceRequest = /* ... */;
```

### 3. Tratamento de Erro Consistente
```typescript
try {
  await api.post('/endpoint', data);
} catch (error) {
  if (error.statusCode === 401) {
    // Redirecionar para login
  } else {
    // Mostrar erro
  }
}
```

### 4. Cache com React Query
```typescript
const { data } = useQuery({
  queryKey: ['key'],
  queryFn: fetchFn,
  staleTime: 5 * 60 * 1000, // 5 minutos
});
```

### 5. Otimistic Updates
```typescript
onMutate: async (newData) => {
  await queryClient.cancelQueries(['key']);
  const previous = queryClient.getQueryData(['key']);
  queryClient.setQueryData(['key'], old => [...old, newData]);
  return { previous };
},
```

---

## 🎓 Comandos Docker

```bash
# Iniciar tudo
docker-compose up -d

# Ver logs
docker-compose logs -f

# Parar tudo
docker-compose down

# Rebuild
docker-compose up -d --build

# Entrar no container
docker exec -it <container-id> sh

# Ver status
docker-compose ps

# Limpar tudo
docker-compose down -v
```

---

## 🧹 Database Maintenance

```bash
# Limpar banco
npm run db:clear

# Aplicar migrations
npm run db:push

# Backup
pg_dump dbname > backup.sql

# Restore
psql dbname < backup.sql
```

---

## 🎯 Performance Tips

### 1. Limit Results
```typescript
api.get('/providers?limit=20&page=1')
```

### 2. Select Only Needed Fields
```typescript
db.select({
  id: users.id,
  name: users.name
}).from(users)
```

### 3. Use Indexes
```sql
CREATE INDEX idx_user_email ON users(email);
```

### 4. Pagination
```typescript
const offset = (page - 1) * limit;
db.select().from(table).limit(limit).offset(offset)
```

---

**🔖 Bookmark esta página para consulta rápida!**

---

**Última Atualização**: 2024-01-01  
**Versão**: 1.0.0
