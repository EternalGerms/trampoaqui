# TrampoAqui - Docker Setup

Este documento explica como executar o TrampoAqui usando Docker, preparado para futura migração para microsserviços.

## Pré-requisitos

- Docker
- Docker Compose
- Git

## Arquitetura Docker

A aplicação está configurada com:

- **PostgreSQL**: Banco de dados em container separado
- **API Backend**: Express.js + TypeScript em container
- **Frontend**: React + Vite servido pelo backend
- **Rede isolada**: Comunicação entre containers via rede Docker
- **Volumes persistentes**: Dados do PostgreSQL mantidos entre reinicializações

## Executando a Aplicação

### 1. Modo Produção (Recomendado)

```bash
# Construir as imagens
npm run docker:build

# Iniciar todos os serviços
npm run docker:up

# Ver logs em tempo real
npm run docker:logs

# Parar todos os serviços
npm run docker:down
```

### 2. Modo Desenvolvimento (com hot reload)

```bash
# Iniciar em modo desenvolvimento
npm run docker:dev

# Ver logs do desenvolvimento
npm run docker:dev-logs

# Parar serviços de desenvolvimento
docker-compose --profile dev down
```

## Acessando a Aplicação

- **Frontend**: http://localhost:5000
- **API**: http://localhost:5000/api
- **Health Check**: http://localhost:5000/api/health
- **PostgreSQL**: localhost:5432 (trampoaqui/trampoaqui123)

## Estrutura dos Containers

### 1. PostgreSQL (trampoaqui-db)
- **Imagem**: postgres:15-alpine
- **Porta**: 5432
- **Banco**: trampoaqui
- **Usuário**: trampoaqui
- **Senha**: trampoaqui123
- **Volume**: Dados persistentes em `postgres_data`

### 2. API Backend (trampoaqui-api)
- **Build**: Multi-stage Dockerfile otimizado
- **Porta**: 5000
- **Health Check**: GET /api/health
- **Dependência**: Aguarda PostgreSQL estar saudável
- **Usuário não-root**: nextjs (segurança)

### 3. Desenvolvimento (trampoaqui-dev)
- **Profile**: dev (opcional)
- **Porta**: 3000
- **Hot Reload**: Volume mount do código fonte
- **Todas as dependências**: Incluindo devDependencies

## Preparação para Microsserviços

A configuração atual está preparada para fácil migração para microsserviços:

### Estrutura Futura Sugerida:
```
services/
├── user-service/          # Gerenciamento de usuários
├── service-catalog/       # Catálogo de serviços
├── booking-service/       # Agendamentos e solicitações
├── messaging-service/     # Sistema de mensagens
├── review-service/        # Avaliações
├── notification-service/  # Notificações
└── api-gateway/          # Gateway de APIs
```

### Benefícios da Arquitetura Atual:
- **Isolamento**: Cada serviço em container separado
- **Comunicação**: Rede Docker isolada
- **Escalabilidade**: Fácil replicação de containers
- **Monitoramento**: Health checks implementados
- **Persistência**: Volumes separados por serviço

## Comandos Úteis

```bash
# Ver status dos containers
docker-compose ps

# Executar comando no container da API
docker-compose exec api sh

# Ver logs específicos
docker-compose logs postgres
docker-compose logs api

# Rebuild apenas um serviço
docker-compose build api

# Executar migrações do banco
docker-compose exec api npm run db:push

# Backup do banco
docker-compose exec postgres pg_dump -U trampoaqui trampoaqui > backup.sql

# Restaurar backup
docker-compose exec -T postgres psql -U trampoaqui trampoaqui < backup.sql
```

## Troubleshooting

### Container não inicia
```bash
# Ver logs detalhados
docker-compose logs api

# Verificar saúde do banco
docker-compose exec postgres pg_isready -U trampoaqui
```

### Problemas de conexão
```bash
# Testar conectividade
docker-compose exec api wget -qO- http://localhost:5000/api/health

# Verificar rede
docker network ls
docker network inspect trampoaqui_trampoaqui-network
```

### Reset completo
```bash
# Parar e remover tudo
docker-compose down -v

# Remover imagens
docker-compose down --rmi all

# Rebuild completo
npm run docker:build && npm run docker:up
```

## Segurança

- **Usuário não-root**: Containers executam com usuário limitado
- **Rede isolada**: Comunicação apenas entre containers necessários
- **Secrets**: Variáveis sensíveis em arquivos .env
- **Health checks**: Monitoramento automático da saúde dos serviços

## Monitoramento

- **Health checks**: Endpoint /api/health disponível
- **Logs centralizados**: docker-compose logs
- **Métricas**: Preparado para Prometheus/Grafana
- **Alertas**: Preparado para integração com sistemas de alerta