# Scripts de Limpeza do Banco de Dados - TrampoAqui

## 📋 Visão Geral

Este diretório contém scripts para limpar dados do banco de dados TrampoAqui, **preservando as categorias de serviço** para manter a funcionalidade do sistema.

## 🚨 Importante

**As categorias de serviço NÃO são mais excluídas** durante a limpeza para evitar que o sistema fique sem categorias disponíveis.

## 📁 Arquivos Disponíveis

### Scripts de Limpeza (Modificados)
- `clear-database.js` - Script JavaScript para limpeza
- `clear-database.sql` - Script SQL para limpeza
- `scripts/clear-db.ts` - Script TypeScript para limpeza

### Scripts de Restauração de Categorias
- `restore-categories.js` - Script JavaScript para restaurar categorias
- `restore-categories.sql` - Script SQL para restaurar categorias
- `scripts/restore-categories.ts` - Script TypeScript para restaurar categorias

## 🔧 Como Usar

### 1. Limpeza do Banco (Preserva Categorias)

```bash
# JavaScript
node clear-database.js

# TypeScript
cd scripts && npx tsx clear-db.ts

# SQL (via psql ou pgAdmin)
psql -h localhost -p 5433 -U trampoaqui -d trampoaqui -f clear-database.sql
```

### 2. Restauração de Categorias (Se Necessário)

```bash
# JavaScript
node restore-categories.js

# TypeScript
cd scripts && npx tsx restore-categories.ts

# SQL (via psql ou pgAdmin)
psql -h localhost -p 5433 -U trampoaqui -d trampoaqui -f restore-categories.sql
```

## 📊 O que é Limpo

✅ **Tabelas que SÃO limpas:**
- `users` - Todos os usuários
- `service_providers` - Todos os prestadores de serviço
- `service_requests` - Todas as solicitações de serviço
- `negotiations` - Todas as negociações
- `reviews` - Todas as avaliações
- `messages` - Todas as mensagens

🛡️ **Tabelas que NÃO são limpas:**
- `service_categories` - Categorias de serviço (preservadas)

## 🎯 Categorias de Serviço Disponíveis

O sistema inclui as seguintes categorias padrão:

1. **Eletricista** - `fas fa-bolt`
2. **Encanador** - `fas fa-wrench`
3. **Faxineira** - `fas fa-broom`
4. **Pintor** - `fas fa-paint-roller`
5. **Jardineiro** - `fas fa-seedling`
6. **Marido de Aluguel** - `fas fa-tools`
7. **Pedreiro** - `fas fa-hammer`
8. **Técnico de Informática** - `fas fa-laptop`
9. **Manutenção de Ar Condicionado** - `fas fa-snowflake`
10. **Limpeza de Piscina** - `fas fa-swimming-pool`
11. **Instalação de Móveis** - `fas fa-couch`
12. **Serviços de Transporte** - `fas fa-truck`

## ⚠️ Avisos

- **Backup**: Sempre faça backup antes de executar scripts de limpeza
- **Ambiente**: Execute apenas em ambiente de desenvolvimento/teste
- **Conexão**: Certifique-se de que o banco está rodando na porta 5433
- **Permissões**: Verifique se o usuário tem permissões adequadas

## 🔄 Recuperação

Se por algum motivo as categorias forem perdidas, use um dos scripts de restauração:

```bash
# Verificar se existem categorias
psql -h localhost -p 5433 -U trampoaqui -d trampoaqui -c "SELECT COUNT(*) FROM service_categories;"

# Restaurar categorias se necessário
npx tsx scripts/restore-categories.ts
```

## 📝 Histórico de Mudanças

- **v2.0**: Scripts modificados para preservar categorias de serviço
- **v1.0**: Scripts originais que limpavam todas as tabelas
