# Guia de Testes e Debugging da API

## Índice
1. [Testes com Postman/Insomnia](#testes-com-postmaninsomnia)
2. [Testes Automatizados](#testes-automatizados)
3. [Debugging](#debugging)
4. [Logs e Monitoramento](#logs-e-monitoramento)
5. [Problemas Comuns](#problemas-comuns)

---

## Testes com Postman/Insomnia

### Coleção Completa Postman

```json
{
  "info": {
    "name": "Service Marketplace API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Authentication",
      "item": [
        {
          "name": "Register",
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"email\": \"{{email}}\",\n  \"password\": \"{{password}}\",\n  \"name\": \"{{name}}\",\n  \"phone\": \"(11) 98765-4321\",\n  \"cpf\": \"12345678901\",\n  \"birthDate\": \"1990-01-01\"\n}"
            },
            "url": {
              "raw": "{{baseUrl}}/auth/register",
              "host": ["{{baseUrl}}"],
              "path": ["auth", "register"]
            }
          },
          "event": [
            {
              "listen": "test",
              "script": {
                "exec": [
                  "const response = pm.response.json();",
                  "",
                  "pm.test('Status code is 200', function() {",
                  "  pm.response.to.have.status(200);",
                  "});",
                  "",
                  "pm.test('Response has token', function() {",
                  "  pm.expect(response).to.have.property('token');",
                  "});",
                  "",
                  "// Salvar token para próximos requests",
                  "pm.environment.set('authToken', response.token);",
                  "pm.environment.set('userId', response.user.id);"
                ]
              }
            }
          ]
        },
        {
          "name": "Login",
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"email\": \"{{email}}\",\n  \"password\": \"{{password}}\"\n}"
            },
            "url": {
              "raw": "{{baseUrl}}/auth/login",
              "host": ["{{baseUrl}}"],
              "path": ["auth", "login"]
            }
          },
          "event": [
            {
              "listen": "test",
              "script": {
                "exec": [
                  "const response = pm.response.json();",
                  "",
                  "pm.test('Status code is 200', function() {",
                  "  pm.response.to.have.status(200);",
                  "});",
                  "",
                  "pm.environment.set('authToken', response.token);",
                  "pm.environment.set('userId', response.user.id);"
                ]
              }
            }
          ]
        },
        {
          "name": "Get Current User",
          "request": {
            "method": "GET",
            "header": [
              {
                "key": "Authorization",
                "value": "Bearer {{authToken}}"
              }
            ],
            "url": {
              "raw": "{{baseUrl}}/auth/me",
              "host": ["{{baseUrl}}"],
              "path": ["auth", "me"]
            }
          }
        },
        {
          "name": "Enable Provider",
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Authorization",
                "value": "Bearer {{authToken}}"
              }
            ],
            "url": {
              "raw": "{{baseUrl}}/auth/enable-provider",
              "host": ["{{baseUrl}}"],
              "path": ["auth", "enable-provider"]
            }
          }
        }
      ]
    },
    {
      "name": "Categories",
      "item": [
        {
          "name": "List Categories",
          "request": {
            "method": "GET",
            "url": {
              "raw": "{{baseUrl}}/categories",
              "host": ["{{baseUrl}}"],
              "path": ["categories"]
            }
          }
        }
      ]
    },
    {
      "name": "Providers",
      "item": [
        {
          "name": "List Providers",
          "request": {
            "method": "GET",
            "url": {
              "raw": "{{baseUrl}}/providers?categoryId={{categoryId}}",
              "host": ["{{baseUrl}}"],
              "path": ["providers"],
              "query": [
                {
                  "key": "categoryId",
                  "value": "{{categoryId}}"
                }
              ]
            }
          }
        },
        {
          "name": "Create Provider",
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Authorization",
                "value": "Bearer {{authToken}}"
              },
              {
                "key": "Content-Type",
                "value": "application/json"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"categoryId\": \"{{categoryId}}\",\n  \"description\": \"Professional electrician with 10 years of experience\",\n  \"pricingTypes\": [\"hourly\", \"fixed\"],\n  \"minHourlyRate\": \"80.00\",\n  \"minFixedRate\": \"150.00\",\n  \"location\": \"São Paulo - SP\"\n}"
            },
            "url": {
              "raw": "{{baseUrl}}/providers",
              "host": ["{{baseUrl}}"],
              "path": ["providers"]
            }
          }
        }
      ]
    }
  ],
  "variable": [
    {
      "key": "baseUrl",
      "value": "http://localhost:5000/api"
    }
  ]
}
```

### Variáveis de Ambiente Postman

```json
{
  "name": "Development",
  "values": [
    {
      "key": "baseUrl",
      "value": "http://localhost:5000/api",
      "enabled": true
    },
    {
      "key": "email",
      "value": "test@example.com",
      "enabled": true
    },
    {
      "key": "password",
      "value": "senha123",
      "enabled": true
    },
    {
      "key": "name",
      "value": "Test User",
      "enabled": true
    },
    {
      "key": "authToken",
      "value": "",
      "enabled": true
    },
    {
      "key": "userId",
      "value": "",
      "enabled": true
    },
    {
      "key": "categoryId",
      "value": "",
      "enabled": true
    },
    {
      "key": "providerId",
      "value": "",
      "enabled": true
    },
    {
      "key": "requestId",
      "value": "",
      "enabled": true
    }
  ]
}
```

---

## Testes Automatizados

### Setup Jest + Supertest

```bash
npm install --save-dev jest @types/jest ts-jest supertest @types/supertest
```

**jest.config.js**:
```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  collectCoverageFrom: [
    'server/**/*.ts',
    '!server/**/*.d.ts',
  ],
};
```

### Testes de Integração

```typescript
// tests/auth.test.ts
import request from 'supertest';
import { app } from '../server/index';

describe('Authentication', () => {
  const testUser = {
    email: 'test@example.com',
    password: 'senha123',
    name: 'Test User',
    phone: '(11) 98765-4321',
    cpf: '12345678901',
    birthDate: '1990-01-01',
  };

  let authToken: string;

  beforeAll(async () => {
    // Limpar banco de dados de teste
    // await clearTestDatabase();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(testUser)
        .expect(200);

      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(testUser.email);
      expect(response.body.user.name).toBe(testUser.name);

      authToken = response.body.token;
    });

    it('should not register user with duplicate email', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(testUser)
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Email já está em uso');
    });

    it('should not register user under 18', async () => {
      const youngUser = {
        ...testUser,
        email: 'young@example.com',
        cpf: '98765432100',
        birthDate: new Date(Date.now() - 17 * 365 * 24 * 60 * 60 * 1000).toISOString(),
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(youngUser)
        .expect(400);

      expect(response.body).toHaveProperty('message');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200);

      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
    });

    it('should not login with invalid password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'wrongpassword',
        })
        .expect(401);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toBe('Invalid credentials');
    });

    it('should not login with non-existent email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: testUser.password,
        })
        .expect(401);
    });
  });

  describe('GET /api/auth/me', () => {
    it('should get current user with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body.email).toBe(testUser.email);
    });

    it('should not get user without token', async () => {
      await request(app)
        .get('/api/auth/me')
        .expect(401);
    });

    it('should not get user with invalid token', async () => {
      await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalidtoken')
        .expect(403);
    });
  });

  describe('POST /api/auth/enable-provider', () => {
    it('should enable provider capability', async () => {
      const response = await request(app)
        .post('/api/auth/enable-provider')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('token');
      expect(response.body.user.isProviderEnabled).toBe(true);
      expect(response.body.profileStatus.isComplete).toBe(false);
      expect(response.body.profileStatus.missingFields).toContain('bio');

      // Atualizar token
      authToken = response.body.token;
    });
  });
});
```

### Testes de Providers

```typescript
// tests/providers.test.ts
import request from 'supertest';
import { app } from '../server/index';

describe('Service Providers', () => {
  let authToken: string;
  let userId: string;
  let categoryId: string;
  let providerId: string;

  beforeAll(async () => {
    // Criar usuário e habilitar como prestador
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'provider@example.com',
        password: 'senha123',
        name: 'Provider User',
        phone: '(11) 98765-4321',
        cpf: '11122233344',
        birthDate: '1985-03-20',
      });

    authToken = registerResponse.body.token;
    userId = registerResponse.body.user.id;

    // Habilitar capacidade de prestador
    const enableResponse = await request(app)
      .post('/api/auth/enable-provider')
      .set('Authorization', `Bearer ${authToken}`);

    authToken = enableResponse.body.token;

    // Completar perfil
    await request(app)
      .put('/api/auth/profile')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        bio: 'Professional service provider',
        experience: 'Over 10 years of experience in the field',
        location: 'São Paulo - SP',
      });

    // Obter categoria
    const categoriesResponse = await request(app).get('/api/categories');
    categoryId = categoriesResponse.body[0].id;
  });

  describe('POST /api/providers', () => {
    it('should create a new provider service', async () => {
      const providerData = {
        categoryId,
        description: 'Professional electrician service',
        pricingTypes: ['hourly', 'fixed'],
        minHourlyRate: '80.00',
        minFixedRate: '150.00',
        location: 'São Paulo - SP',
      };

      const response = await request(app)
        .post('/api/providers')
        .set('Authorization', `Bearer ${authToken}`)
        .send(providerData)
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body.userId).toBe(userId);
      expect(response.body.description).toBe(providerData.description);

      providerId = response.body.id;
    });

    it('should not create duplicate service in same category', async () => {
      const response = await request(app)
        .post('/api/providers')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          categoryId,
          description: 'Another service',
          pricingTypes: ['hourly'],
          minHourlyRate: '90.00',
          location: 'São Paulo - SP',
        })
        .expect(400);

      expect(response.body.message).toContain('já possui um serviço');
    });

    it('should not create service without provider capability', async () => {
      // Criar novo usuário sem capacidade de prestador
      const newUserResponse = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'client@example.com',
          password: 'senha123',
          name: 'Client User',
          phone: '(11) 99999-8888',
          cpf: '55566677788',
          birthDate: '1992-06-15',
        });

      const response = await request(app)
        .post('/api/providers')
        .set('Authorization', `Bearer ${newUserResponse.body.token}`)
        .send({
          categoryId,
          description: 'Service',
          pricingTypes: ['fixed'],
          minFixedRate: '100.00',
          location: 'São Paulo - SP',
        })
        .expect(403);

      expect(response.body.message).toContain('Provider capability');
    });
  });

  describe('GET /api/providers', () => {
    it('should list all providers', async () => {
      const response = await request(app)
        .get('/api/providers')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('should filter providers by category', async () => {
      const response = await request(app)
        .get(`/api/providers?categoryId=${categoryId}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      response.body.forEach(provider => {
        expect(provider.categoryId).toBe(categoryId);
      });
    });
  });

  describe('PUT /api/providers/:id', () => {
    it('should update own provider service', async () => {
      const updateData = {
        description: 'Updated description',
        minHourlyRate: '90.00',
      };

      const response = await request(app)
        .put(`/api/providers/${providerId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.description).toBe(updateData.description);
      expect(response.body.minHourlyRate).toBe(updateData.minHourlyRate);
    });

    it('should not update other user\'s provider service', async () => {
      // Criar outro usuário
      const anotherUserResponse = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'another@example.com',
          password: 'senha123',
          name: 'Another User',
          phone: '(11) 88888-7777',
          cpf: '99988877766',
          birthDate: '1988-08-08',
        });

      await request(app)
        .put(`/api/providers/${providerId}`)
        .set('Authorization', `Bearer ${anotherUserResponse.body.token}`)
        .send({ description: 'Hacked' })
        .expect(403);
    });
  });

  describe('DELETE /api/providers/:id', () => {
    it('should not delete provider with active requests', async () => {
      // Criar solicitação
      const clientResponse = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'client2@example.com',
          password: 'senha123',
          name: 'Client 2',
          phone: '(11) 77777-6666',
          cpf: '44455566677',
          birthDate: '1993-07-07',
        });

      await request(app)
        .post('/api/requests')
        .set('Authorization', `Bearer ${clientResponse.body.token}`)
        .send({
          providerId,
          title: 'Test request',
          description: 'Test description with more than 20 characters',
          pricingType: 'fixed',
          proposedPrice: '200.00',
        });

      const response = await request(app)
        .delete(`/api/providers/${providerId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.message).toContain('solicitações ativas');
    });
  });
});
```

### Testes de Negociação

```typescript
// tests/negotiations.test.ts
import request from 'supertest';
import { app } from '../server/index';

describe('Negotiations', () => {
  let clientToken: string;
  let providerToken: string;
  let providerId: string;
  let requestId: string;
  let negotiationId: string;

  beforeAll(async () => {
    // Setup completo: criar cliente, prestador, solicitação
    // ... (similar aos testes anteriores)
  });

  describe('POST /api/negotiations', () => {
    it('should create a negotiation proposal', async () => {
      const negotiationData = {
        requestId,
        pricingType: 'fixed',
        proposedPrice: '250.00',
        message: 'Counter proposal with detailed explanation',
      };

      const response = await request(app)
        .post('/api/negotiations')
        .set('Authorization', `Bearer ${providerToken}`)
        .send(negotiationData)
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body.proposedPrice).toBe(negotiationData.proposedPrice);
      expect(response.body.status).toBe('pending');

      negotiationId = response.body.id;

      // Verificar se status da solicitação mudou para 'negotiating'
      const requestResponse = await request(app)
        .get('/api/requests')
        .set('Authorization', `Bearer ${clientToken}`);

      const request = requestResponse.body.find(r => r.id === requestId);
      expect(request.status).toBe('negotiating');
    });
  });

  describe('PUT /api/negotiations/:id/status', () => {
    it('should accept a negotiation', async () => {
      await request(app)
        .put(`/api/negotiations/${negotiationId}/status`)
        .set('Authorization', `Bearer ${clientToken}`)
        .send({ status: 'accepted' })
        .expect(200);

      // Verificar se solicitação foi atualizada
      const requestResponse = await request(app)
        .get('/api/requests')
        .set('Authorization', `Bearer ${clientToken}`);

      const request = requestResponse.body.find(r => r.id === requestId);
      expect(request.status).toBe('payment_pending');
      expect(request.proposedPrice).toBe('250.00');
    });

    it('should not allow user to respond to own negotiation', async () => {
      const response = await request(app)
        .put(`/api/negotiations/${negotiationId}/status`)
        .set('Authorization', `Bearer ${providerToken}`)
        .send({ status: 'accepted' })
        .expect(400);

      expect(response.body.message).toContain('own negotiation');
    });
  });

  describe('POST /api/negotiations/:id/counter-proposal', () => {
    let newNegotiationId: string;

    beforeAll(async () => {
      // Criar nova negociação
      const response = await request(app)
        .post('/api/negotiations')
        .set('Authorization', `Bearer ${providerToken}`)
        .send({
          requestId,
          pricingType: 'fixed',
          proposedPrice: '300.00',
          message: 'New proposal',
        });

      newNegotiationId = response.body.id;
    });

    it('should create a counter proposal', async () => {
      const response = await request(app)
        .post(`/api/negotiations/${newNegotiationId}/counter-proposal`)
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          pricingType: 'fixed',
          proposedPrice: '275.00',
          message: 'Counter proposal',
        })
        .expect(200);

      expect(response.body).toHaveProperty('counterNegotiation');
      expect(response.body.counterNegotiation.proposedPrice).toBe('275.00');

      // Verificar se original foi marcada como counter_proposed
      const negotiationsResponse = await request(app)
        .get(`/api/requests/${requestId}/negotiations`)
        .set('Authorization', `Bearer ${clientToken}`);

      const originalNeg = negotiationsResponse.body.find(
        n => n.id === newNegotiationId
      );
      expect(originalNeg.status).toBe('counter_proposed');
    });
  });
});
```

### Script de Teste

```bash
# package.json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:integration": "jest tests/integration",
    "test:unit": "jest tests/unit"
  }
}
```

---

## Debugging

### VS Code Launch Configuration

```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Server",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "dev"],
      "port": 9229,
      "skipFiles": ["<node_internals>/**"],
      "env": {
        "NODE_ENV": "development",
        "JWT_SECRET": "dev-secret",
        "DATABASE_URL": "postgresql://postgres:postgres@localhost:5432/test"
      }
    },
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Tests",
      "program": "${workspaceFolder}/node_modules/.bin/jest",
      "args": ["--runInBand", "--no-cache"],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    }
  ]
}
```

### Logging com Winston

```typescript
// utils/logger.ts
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    })
  );
}

export default logger;

// Uso
import logger from './utils/logger';

app.post('/api/auth/login', async (req, res) => {
  try {
    logger.info('Login attempt', { email: req.body.email });
    
    const user = await storage.getUserByEmail(req.body.email);
    
    if (!user) {
      logger.warn('Login failed - user not found', { email: req.body.email });
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    logger.info('Login successful', { userId: user.id });
    // ...
  } catch (error) {
    logger.error('Login error', { error, email: req.body.email });
    res.status(500).json({ message: 'Server error' });
  }
});
```

### Request Debugging Middleware

```typescript
// middleware/debug.ts
import { Request, Response, NextFunction } from 'express';

export function debugMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  
  // Log request
  console.log('\n🔵 Incoming Request:');
  console.log('Method:', req.method);
  console.log('URL:', req.url);
  console.log('Headers:', JSON.stringify(req.headers, null, 2));
  console.log('Body:', JSON.stringify(req.body, null, 2));
  console.log('User:', req.user);

  // Capture original json method
  const originalJson = res.json.bind(res);

  // Override json method to log response
  res.json = (body: any) => {
    const duration = Date.now() - start;
    
    console.log('\n🟢 Outgoing Response:');
    console.log('Status:', res.statusCode);
    console.log('Duration:', duration, 'ms');
    console.log('Body:', JSON.stringify(body, null, 2));
    
    return originalJson(body);
  };

  next();
}

// Use apenas em desenvolvimento
if (process.env.NODE_ENV === 'development') {
  app.use(debugMiddleware);
}
```

### Database Query Debugging

```typescript
// db.ts
import { drizzle } from 'drizzle-orm/node-postgres';

export const db = drizzle(pool, {
  logger: process.env.NODE_ENV === 'development' ? {
    logQuery(query: string, params: unknown[]) {
      console.log('\n🗄️  Database Query:');
      console.log('SQL:', query);
      console.log('Params:', params);
    },
  } : false,
});
```

---

## Logs e Monitoramento

### Estrutura de Logs

```typescript
// Estrutura padronizada de logs
interface LogEntry {
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  userId?: string;
  requestId?: string;
  duration?: number;
  error?: {
    message: string;
    stack?: string;
  };
  metadata?: Record<string, any>;
}

// Exemplo de uso
logger.info('Service request created', {
  userId: req.user.userId,
  requestId: request.id,
  providerId: request.providerId,
  amount: request.proposedPrice,
});

logger.error('Payment processing failed', {
  userId: req.user.userId,
  requestId: req.params.id,
  error: {
    message: error.message,
    stack: error.stack,
  },
});
```

### Métricas de Performance

```typescript
// middleware/metrics.ts
import { Request, Response, NextFunction } from 'express';

interface Metrics {
  requests: {
    total: number;
    byMethod: Record<string, number>;
    byStatus: Record<number, number>;
  };
  responseTimes: number[];
}

const metrics: Metrics = {
  requests: {
    total: 0,
    byMethod: {},
    byStatus: {},
  },
  responseTimes: [],
};

export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;

    // Atualizar métricas
    metrics.requests.total++;
    metrics.requests.byMethod[req.method] = (metrics.requests.byMethod[req.method] || 0) + 1;
    metrics.requests.byStatus[res.statusCode] = (metrics.requests.byStatus[res.statusCode] || 0) + 1;
    metrics.responseTimes.push(duration);

    // Manter apenas últimas 1000 entradas
    if (metrics.responseTimes.length > 1000) {
      metrics.responseTimes.shift();
    }
  });

  next();
}

// Endpoint para visualizar métricas
app.get('/api/metrics', (req, res) => {
  const avgResponseTime =
    metrics.responseTimes.reduce((a, b) => a + b, 0) / metrics.responseTimes.length;

  res.json({
    requests: metrics.requests,
    performance: {
      avgResponseTime: avgResponseTime.toFixed(2),
      minResponseTime: Math.min(...metrics.responseTimes),
      maxResponseTime: Math.max(...metrics.responseTimes),
    },
  });
});
```

---

## Problemas Comuns

### 1. Token Expirado

**Sintoma**: Erro 403 em requests autenticados

**Debug**:
```typescript
// Decodificar token manualmente
import jwt from 'jsonwebtoken';

const token = 'eyJhbGciOiJIUzI1NiIs...';
try {
  const decoded = jwt.decode(token);
  console.log('Token decoded:', decoded);
  
  // Verificar expiração
  if (decoded.exp && decoded.exp < Date.now() / 1000) {
    console.log('Token expired!');
  }
} catch (error) {
  console.error('Token decode error:', error);
}
```

**Solução**: Implementar refresh token ou aumentar tempo de expiração

### 2. Validação Falhando

**Sintoma**: Erro 400 com mensagem de validação

**Debug**:
```typescript
import { z } from 'zod';

const schema = insertServiceRequestSchema;

try {
  const result = schema.parse(data);
  console.log('✅ Valid:', result);
} catch (error) {
  if (error instanceof z.ZodError) {
    console.log('❌ Validation errors:');
    error.errors.forEach(err => {
      console.log(`  - ${err.path.join('.')}: ${err.message}`);
    });
  }
}
```

**Solução**: Ajustar dados de entrada ou schema

### 3. Conexão com Banco Falhando

**Sintoma**: Erro 503 no health check

**Debug**:
```bash
# Verificar se PostgreSQL está rodando
docker-compose ps

# Ver logs do PostgreSQL
docker-compose logs postgres

# Testar conexão manualmente
psql -h localhost -U postgres -d servicemarketplace
```

**Solução**: Reiniciar serviços ou corrigir DATABASE_URL

### 4. CORS Errors

**Sintoma**: Erro de CORS no browser

**Debug**:
```typescript
// Adicionar logging de CORS
app.use((req, res, next) => {
  console.log('Origin:', req.headers.origin);
  console.log('Method:', req.method);
  next();
});
```

**Solução**: Configurar CORS corretamente
```typescript
import cors from 'cors';

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
```

### 5. Requests Pendentes Não Aparecendo

**Debug**:
```typescript
// Verificar no banco manualmente
const requests = await db.select().from(serviceRequests);
console.log('All requests:', requests);

// Verificar filtros
const providerRequests = await db
  .select()
  .from(serviceRequests)
  .where(eq(serviceRequests.providerId, providerId));
console.log('Provider requests:', providerRequests);
```

---

## Ferramentas Úteis

### 1. pgAdmin

Interface gráfica para PostgreSQL:
```bash
docker run -p 5050:80 \
  -e 'PGADMIN_DEFAULT_EMAIL=admin@admin.com' \
  -e 'PGADMIN_DEFAULT_PASSWORD=admin' \
  -d dpage/pgadmin4
```

### 2. Postman Collection Runner

Executar toda coleção automaticamente para testar fluxos completos.

### 3. k6 (Load Testing)

```javascript
// load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 20 },
    { duration: '1m', target: 50 },
    { duration: '30s', target: 0 },
  ],
};

export default function() {
  const url = 'http://localhost:5000/api/categories';
  const response = http.get(url);

  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });

  sleep(1);
}
```

Run: `k6 run load-test.js`

---

**Última Atualização**: 2024-01-01  
**Versão**: 1.0.0
