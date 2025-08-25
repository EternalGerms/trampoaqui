# Limpeza do Banco de Dados - TrampoAqui

Este documento explica como limpar todos os dados do banco de dados mantendo a estrutura das tabelas.

## ⚠️ ATENÇÃO

**Esta operação é irreversível!** Todos os dados serão perdidos permanentemente. Certifique-se de que:
- Você tem backup dos dados importantes
- Está no ambiente correto (não em produção)
- Entende as consequências da operação

## 🗂️ Arquivos Criados

1. **`clear-database.sql`** - Script SQL puro para execução direta no PostgreSQL
2. **`clear-database.js`** - Script Node.js usando conexão direta
3. **`scripts/clear-db.ts`** - Script TypeScript integrado ao projeto
4. **`package.json`** - Comando npm adicionado

## 🚀 Como Executar

### Opção 1: Script NPM (Recomendado)

```bash
# Certifique-se de que o banco está rodando
npm run docker:up

# Execute o script de limpeza
npm run db:clear
```

### Opção 2: Script SQL Direto

```bash
# Conecte ao banco PostgreSQL
psql -h localhost -p 5433 -U trampoaqui -d trampoaqui

# Execute o script
\i clear-database.sql
```

### Opção 3: Script Node.js

```bash
# Certifique-se de que o banco está rodando
npm run docker:up

# Execute o script
node clear-database.js
```

## 📊 Tabelas que Serão Limpas

O script limpa as seguintes tabelas na ordem correta (respeitando dependências):

1. **`messages`** - Mensagens entre usuários
2. **`reviews`** - Avaliações de serviços
3. **`negotiations`** - Histórico de negociações
4. **`service_requests`** - Solicitações de serviços
5. **`service_providers`** - Perfis de prestadores
6. **`service_categories`** - Categorias de serviços
7. **`users`** - Usuários do sistema

## 🔧 Configuração do Banco

O script usa as seguintes configurações (do `docker-compose.yml`):
- **Host**: localhost
- **Porta**: 5433
- **Usuário**: trampoaqui
- **Senha**: trampoaqui123
- **Banco**: trampoaqui

## ✅ Verificação

Após a execução, o script mostrará:
- Confirmação de conexão
- Progresso da limpeza de cada tabela
- Contagem de registros em cada tabela (deve ser 0)
- Mensagem de sucesso

## 🚨 Solução de Problemas

### Erro de Conexão
```bash
# Verifique se o Docker está rodando
docker ps

# Inicie o banco se necessário
npm run docker:up

# Verifique logs
npm run docker:logs
```

### Erro de Permissão
```bash
# Verifique se o usuário tem permissões
psql -h localhost -p 5433 -U trampoaqui -d trampoaqui -c "SELECT current_user;"
```

### Erro de Dependências
```bash
# Instale dependências se necessário
npm install

# Verifique se tsx está instalado
npm install -g tsx
```

## 🔄 Restaurar Dados

Se você precisar restaurar dados após a limpeza:

1. **Backup anterior**: Use `pg_restore` ou `psql` com arquivo de backup
2. **Dados de teste**: Execute os scripts de inicialização em `init-db/`
3. **Dados de desenvolvimento**: Use `npm run docker:down && npm run docker:up` para resetar completamente

## 📝 Logs

O script gera logs detalhados no console. Em caso de erro, verifique:
- Mensagens de erro específicas
- Estado das tabelas antes da limpeza
- Permissões de usuário do banco
- Configuração de conexão

## 🎯 Uso Típico

Este script é útil para:
- **Desenvolvimento**: Limpar dados de teste
- **Testes**: Resetar ambiente para testes automatizados
- **Debugging**: Remover dados corrompidos
- **Deploy**: Preparar banco para nova instalação

---

**Lembre-se**: Sempre faça backup antes de executar este script em qualquer ambiente!
