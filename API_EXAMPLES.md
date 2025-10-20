# Guia Prático de Uso da API - Exemplos Completos

## Índice
1. [Configuração Inicial](#configuração-inicial)
2. [Casos de Uso Completos](#casos-de-uso-completos)
3. [Snippets Reutilizáveis](#snippets-reutilizáveis)
4. [Tratamento de Erros](#tratamento-de-erros)
5. [Boas Práticas](#boas-práticas)

---

## Configuração Inicial

### Setup do Cliente HTTP

```typescript
// api/client.ts
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

class ApiClient {
  private getHeaders(includeAuth = true): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (includeAuth) {
      const token = localStorage.getItem('token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    return headers;
  }

  async request<T>(
    endpoint: string,
    options: RequestInit = {},
    requireAuth = true
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        ...this.getHeaders(requireAuth),
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        message: 'An error occurred',
      }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // Métodos de conveniência
  get<T>(endpoint: string, requireAuth = true) {
    return this.request<T>(endpoint, { method: 'GET' }, requireAuth);
  }

  post<T>(endpoint: string, data?: unknown, requireAuth = true) {
    return this.request<T>(
      endpoint,
      {
        method: 'POST',
        body: data ? JSON.stringify(data) : undefined,
      },
      requireAuth
    );
  }

  put<T>(endpoint: string, data?: unknown, requireAuth = true) {
    return this.request<T>(
      endpoint,
      {
        method: 'PUT',
        body: data ? JSON.stringify(data) : undefined,
      },
      requireAuth
    );
  }

  delete<T>(endpoint: string, requireAuth = true) {
    return this.request<T>(endpoint, { method: 'DELETE' }, requireAuth);
  }
}

export const apiClient = new ApiClient();
```

---

## Casos de Uso Completos

### 1. Fluxo Completo: Cliente Contrata Serviço

```typescript
// Caso: Maria quer contratar um eletricista

// Passo 1: Maria se registra
async function registerClient() {
  const userData = {
    email: 'maria@example.com',
    password: 'senha123',
    name: 'Maria Santos',
    phone: '(11) 98765-4321',
    cpf: '12345678901',
    birthDate: '1990-05-15',
  };

  const { token, user } = await apiClient.post('/auth/register', userData, false);
  
  // Armazenar token
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
  
  console.log('✅ Registrada com sucesso:', user.name);
  return { token, user };
}

// Passo 2: Maria busca eletricistas
async function searchElectricians() {
  // Obter categorias
  const categories = await apiClient.get('/categories', false);
  const electricianCategory = categories.find(c => c.slug === 'eletricista');
  
  // Buscar prestadores
  const providers = await apiClient.get(
    `/providers?categoryId=${electricianCategory.id}`,
    false
  );
  
  console.log(`✅ Encontrados ${providers.length} eletricistas`);
  return providers;
}

// Passo 3: Maria visualiza perfil de um prestador
async function viewProviderProfile(providerId: string) {
  const provider = await apiClient.get(`/providers/${providerId}`, false);
  
  console.log('📋 Prestador:', provider.user.name);
  console.log('💰 Taxa por hora:', provider.minHourlyRate);
  console.log('⭐ Avaliações:', provider.reviews.length);
  
  return provider;
}

// Passo 4: Maria cria uma solicitação
async function createServiceRequest(providerId: string) {
  const requestData = {
    providerId,
    title: 'Instalação de tomadas',
    description: 'Preciso instalar 5 tomadas na sala e 3 no quarto',
    pricingType: 'hourly',
    proposedHours: 4,
    proposedPrice: '320.00', // 4 horas * R$ 80/hora
    scheduledDate: '2024-01-20T14:00:00.000Z',
  };

  const request = await apiClient.post('/requests', requestData);
  
  console.log('✅ Solicitação criada:', request.id);
  console.log('📊 Status:', request.status); // 'pending'
  
  return request;
}

// Passo 5: Maria monitora a solicitação
async function checkRequestStatus() {
  const requests = await apiClient.get('/requests');
  const myRequest = requests[0];
  
  console.log('📊 Status:', myRequest.status);
  console.log('💬 Negociações:', myRequest.negotiations.length);
  
  // Se houver negociações pendentes
  if (myRequest.negotiations.length > 0) {
    const latestNegotiation = myRequest.negotiations[0];
    console.log('💰 Proposta do prestador:', latestNegotiation.proposedPrice);
    console.log('📝 Mensagem:', latestNegotiation.message);
  }
  
  return myRequest;
}

// Passo 6: Maria aceita a negociação
async function acceptNegotiation(negotiationId: string) {
  await apiClient.put(`/negotiations/${negotiationId}/status`, {
    status: 'accepted',
  });
  
  console.log('✅ Negociação aceita!');
  console.log('💳 Próximo passo: realizar pagamento');
}

// Passo 7: Maria realiza o pagamento
async function processPayment(requestId: string) {
  // Selecionar método de pagamento
  await apiClient.post(`/requests/${requestId}/payment`, {
    paymentMethod: 'pix',
  });
  
  console.log('✅ Método de pagamento selecionado: PIX');
  
  // Simular pagamento (na prática, integraria com gateway)
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Confirmar pagamento
  const request = await apiClient.post(`/requests/${requestId}/complete-payment`);
  
  console.log('✅ Pagamento confirmado!');
  console.log('📊 Status:', request.status); // 'accepted'
  console.log('📅 Data agendada:', new Date(request.scheduledDate).toLocaleString());
  
  return request;
}

// Passo 8: Após o serviço, Maria marca como concluído
async function completeService(requestId: string) {
  const request = await apiClient.put(`/requests/${requestId}`, {
    status: 'completed',
  });
  
  console.log('✅ Serviço marcado como concluído');
  console.log('📊 Status:', request.status); // 'pending_completion' (aguarda confirmação do prestador)
  
  return request;
}

// Passo 9: Maria avalia o prestador
async function reviewProvider(requestId: string, providerId: string) {
  const review = await apiClient.post('/reviews', {
    requestId,
    revieweeId: providerId,
    rating: 5,
    comment: 'Excelente profissional! Trabalho impecável e pontual.',
  });
  
  console.log('✅ Avaliação enviada:', review.rating, '⭐');
  
  return review;
}

// Executar fluxo completo
async function fullClientFlow() {
  try {
    console.log('🚀 Iniciando fluxo do cliente...\n');
    
    // 1. Registro
    await registerClient();
    
    // 2. Buscar prestadores
    const providers = await searchElectricians();
    const selectedProvider = providers[0];
    
    // 3. Ver perfil
    await viewProviderProfile(selectedProvider.id);
    
    // 4. Criar solicitação
    const request = await createServiceRequest(selectedProvider.id);
    
    // Aguardar negociação do prestador...
    console.log('\n⏳ Aguardando resposta do prestador...\n');
    
    // 5. Verificar status (simulando após algum tempo)
    const updatedRequest = await checkRequestStatus();
    
    if (updatedRequest.negotiations.length > 0) {
      const negotiation = updatedRequest.negotiations[0];
      
      // 6. Aceitar negociação
      await acceptNegotiation(negotiation.id);
      
      // 7. Processar pagamento
      await processPayment(request.id);
      
      // Serviço realizado...
      console.log('\n🔧 Serviço sendo realizado...\n');
      
      // 8. Marcar como concluído
      await completeService(request.id);
      
      // 9. Avaliar
      await reviewProvider(request.id, selectedProvider.userId);
    }
    
    console.log('\n✅ Fluxo completo finalizado com sucesso!');
  } catch (error) {
    console.error('❌ Erro no fluxo:', error);
  }
}
```

---

### 2. Fluxo Completo: Prestador Oferece Serviço

```typescript
// Caso: João é eletricista e quer oferecer seus serviços

// Passo 1: João se registra
async function registerProvider() {
  const userData = {
    email: 'joao@example.com',
    password: 'senha123',
    name: 'João Silva',
    phone: '(11) 99999-8888',
    cpf: '98765432100',
    birthDate: '1985-03-20',
  };

  const { token, user } = await apiClient.post('/auth/register', userData, false);
  
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
  
  console.log('✅ Registrado com sucesso:', user.name);
  return { token, user };
}

// Passo 2: João habilita capacidade de prestador
async function enableProviderCapability() {
  const response = await apiClient.post('/auth/enable-provider');
  
  // Atualizar token
  localStorage.setItem('token', response.token);
  
  console.log('✅ Capacidade de prestador habilitada');
  console.log('📋 Perfil completo:', response.profileStatus.isComplete);
  console.log('⚠️ Campos faltantes:', response.profileStatus.missingFields);
  
  return response;
}

// Passo 3: João completa seu perfil
async function completeProviderProfile() {
  const profileData = {
    bio: 'Eletricista profissional com mais de 10 anos de experiência',
    experience: 
      'Trabalho com instalações elétricas residenciais e comerciais. ' +
      'Especialista em quadros de distribuição, automação e energia solar. ' +
      'Certificado pelo SENAI e com diversas capacitações em segurança.',
    location: 'São Paulo - SP',
  };

  const profile = await apiClient.put('/auth/profile', profileData);
  
  console.log('✅ Perfil completado com sucesso');
  console.log('📍 Localização:', profile.location);
  
  return profile;
}

// Passo 4: João cria seu serviço de eletricista
async function createProviderService() {
  // Obter categoria de eletricista
  const categories = await apiClient.get('/categories', false);
  const electricianCategory = categories.find(c => c.slug === 'eletricista');

  const serviceData = {
    categoryId: electricianCategory.id,
    description: 
      'Serviços de eletricista residencial e comercial. ' +
      'Instalação de tomadas, interruptores, quadros de distribuição, ' +
      'disjuntores, iluminação e muito mais. Trabalho com qualidade e garantia.',
    pricingTypes: ['hourly', 'fixed'],
    minHourlyRate: '80.00',
    minFixedRate: '150.00',
    location: 'São Paulo - SP',
  };

  const service = await apiClient.post('/providers', serviceData);
  
  console.log('✅ Serviço criado com sucesso:', service.id);
  console.log('💰 Taxa por hora: R$', service.minHourlyRate);
  console.log('💰 Taxa fixa mínima: R$', service.minFixedRate);
  
  return service;
}

// Passo 5: João verifica solicitações recebidas
async function checkReceivedRequests() {
  const response = await apiClient.get('/requests/provider');
  
  if (response.code !== 'SUCCESS') {
    console.log('⚠️', response.message);
    return [];
  }
  
  const requests = response.requests;
  
  console.log(`✅ ${requests.length} solicitações recebidas`);
  
  requests.forEach(request => {
    console.log('\n📋 Solicitação:', request.title);
    console.log('👤 Cliente:', request.client?.name);
    console.log('📊 Status:', request.status);
    console.log('💰 Proposta:', request.proposedPrice);
  });
  
  return requests;
}

// Passo 6: João envia uma negociação
async function sendNegotiation(requestId: string) {
  // João analisa e faz uma contra-proposta
  const negotiationData = {
    requestId,
    pricingType: 'hourly',
    proposedHours: 5, // Acha que levará mais tempo
    proposedPrice: '400.00', // 5 horas * R$ 80
    proposedDate: '2024-01-21T14:00:00.000Z', // Outra data
    message: 
      'Olá! Analisando o serviço, acredito que levará cerca de 5 horas ' +
      'para um trabalho bem feito. Posso realizar no dia 21/01 às 14h. ' +
      'O material está incluso no valor.',
  };

  const negotiation = await apiClient.post('/negotiations', negotiationData);
  
  console.log('✅ Proposta enviada com sucesso');
  console.log('💰 Valor proposto: R$', negotiation.proposedPrice);
  console.log('⏱️ Horas estimadas:', negotiation.proposedHours);
  
  return negotiation;
}

// Passo 7: João monitora o status da negociação
async function checkNegotiationStatus(requestId: string) {
  const negotiations = await apiClient.get(`/requests/${requestId}/negotiations`);
  
  console.log(`💬 ${negotiations.length} negociações nesta solicitação`);
  
  negotiations.forEach(neg => {
    console.log('\n📝 Negociação:', neg.id);
    console.log('📊 Status:', neg.status);
    console.log('💰 Valor:', neg.proposedPrice);
    console.log('👤 Proposto por:', neg.proposer.name);
  });
  
  return negotiations;
}

// Passo 8: Após aceite, João realiza o serviço e marca como concluído
async function completeServiceAsProvider(requestId: string) {
  const request = await apiClient.put(`/requests/${requestId}`, {
    status: 'completed',
  });
  
  console.log('✅ Serviço marcado como concluído');
  console.log('📊 Status:', request.status); // 'pending_completion'
  console.log('⏳ Aguardando confirmação do cliente...');
  
  return request;
}

// Passo 9: João verifica seu saldo
async function checkBalance() {
  const { balance } = await apiClient.get('/users/me/balance');
  
  console.log('💰 Saldo disponível: R$', balance);
  
  return balance;
}

// Passo 10: João solicita saque
async function requestWithdrawal(amount: number) {
  const withdrawal = await apiClient.post('/withdrawals', { amount });
  
  console.log('✅ Saque solicitado com sucesso');
  console.log('💰 Valor: R$', withdrawal.amount);
  console.log('📊 Status:', withdrawal.status); // 'pending'
  console.log('📅 Data:', new Date(withdrawal.createdAt).toLocaleString());
  
  return withdrawal;
}

// Executar fluxo completo do prestador
async function fullProviderFlow() {
  try {
    console.log('🚀 Iniciando fluxo do prestador...\n');
    
    // 1. Registro
    await registerProvider();
    
    // 2. Habilitar capacidade de prestador
    await enableProviderCapability();
    
    // 3. Completar perfil
    await completeProviderProfile();
    
    // 4. Criar serviço
    const service = await createProviderService();
    
    // 5. Verificar solicitações
    const requests = await checkReceivedRequests();
    
    if (requests.length > 0) {
      const request = requests[0];
      
      // 6. Enviar negociação
      await sendNegotiation(request.id);
      
      // 7. Monitorar status
      await checkNegotiationStatus(request.id);
      
      // Aguardar aceite do cliente...
      console.log('\n⏳ Aguardando aceite do cliente...\n');
      
      // Serviço aceito e realizado...
      console.log('\n🔧 Realizando serviço...\n');
      
      // 8. Marcar como concluído
      await completeServiceAsProvider(request.id);
      
      // Após cliente confirmar...
      console.log('\n✅ Cliente confirmou conclusão!\n');
      
      // 9. Verificar saldo
      const balance = await checkBalance();
      
      // 10. Solicitar saque
      if (parseFloat(balance) >= 100) {
        await requestWithdrawal(parseFloat(balance));
      }
    }
    
    console.log('\n✅ Fluxo completo finalizado com sucesso!');
  } catch (error) {
    console.error('❌ Erro no fluxo:', error);
  }
}
```

---

### 3. Fluxo de Negociação com Múltiplas Contra-Propostas

```typescript
async function negotiationFlow() {
  // Cliente propõe R$ 200
  const request = await apiClient.post('/requests', {
    providerId: 'provider-uuid',
    title: 'Reparos elétricos',
    description: 'Trocar disjuntores',
    pricingType: 'fixed',
    proposedPrice: '200.00',
  });
  
  console.log('💰 Cliente propõe: R$ 200');
  
  // Prestador contra-propõe R$ 250
  const negotiation1 = await apiClient.post('/negotiations', {
    requestId: request.id,
    pricingType: 'fixed',
    proposedPrice: '250.00',
    message: 'Devido à complexidade, preciso cobrar R$ 250',
  });
  
  console.log('💰 Prestador contra-propõe: R$ 250');
  
  // Cliente faz nova contra-proposta: R$ 225
  const negotiation2 = await apiClient.post(
    `/negotiations/${negotiation1.id}/counter-proposal`,
    {
      pricingType: 'fixed',
      proposedPrice: '225.00',
      message: 'Posso pagar R$ 225. É meu orçamento máximo.',
    }
  );
  
  console.log('💰 Cliente contra-propõe: R$ 225');
  
  // Prestador aceita
  await apiClient.put(`/negotiations/${negotiation2.id}/status`, {
    status: 'accepted',
  });
  
  console.log('✅ Prestador aceita R$ 225');
  console.log('🎉 Negociação finalizada com sucesso!');
}
```

---

## Snippets Reutilizáveis

### Hook React para Autenticação

```typescript
// hooks/useAuth.ts
import { useState, useEffect } from 'react';

interface User {
  id: string;
  email: string;
  name: string;
  isProviderEnabled: boolean;
  isAdmin: boolean;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Carregar do localStorage
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
    
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const response = await apiClient.post('/auth/login', { email, password }, false);
    
    localStorage.setItem('token', response.token);
    localStorage.setItem('user', JSON.stringify(response.user));
    
    setToken(response.token);
    setUser(response.user);
    
    return response;
  };

  const register = async (userData: any) => {
    const response = await apiClient.post('/auth/register', userData, false);
    
    localStorage.setItem('token', response.token);
    localStorage.setItem('user', JSON.stringify(response.user));
    
    setToken(response.token);
    setUser(response.user);
    
    return response;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    setToken(null);
    setUser(null);
  };

  const updateUser = async () => {
    const updatedUser = await apiClient.get('/auth/me');
    
    localStorage.setItem('user', JSON.stringify(updatedUser));
    setUser(updatedUser);
    
    return updatedUser;
  };

  return {
    user,
    token,
    loading,
    isAuthenticated: !!token,
    login,
    register,
    logout,
    updateUser,
  };
}
```

### Hook React Query para Solicitações

```typescript
// hooks/useRequests.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export function useRequests() {
  return useQuery({
    queryKey: ['requests'],
    queryFn: () => apiClient.get('/requests'),
  });
}

export function useProviderRequests() {
  return useQuery({
    queryKey: ['requests', 'provider'],
    queryFn: () => apiClient.get('/requests/provider'),
  });
}

export function useCreateRequest() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: any) => apiClient.post('/requests', data),
    onSuccess: () => {
      // Invalidar cache para recarregar lista
      queryClient.invalidateQueries({ queryKey: ['requests'] });
    },
  });
}

export function useUpdateRequest() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      apiClient.put(`/requests/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requests'] });
    },
  });
}
```

### Componente de Negociação

```typescript
// components/NegotiationForm.tsx
import { useState } from 'react';

interface NegotiationFormProps {
  requestId: string;
  onSuccess?: () => void;
}

export function NegotiationForm({ requestId, onSuccess }: NegotiationFormProps) {
  const [formData, setFormData] = useState({
    pricingType: 'fixed',
    proposedPrice: '',
    proposedHours: '',
    proposedDays: '',
    proposedDate: '',
    message: '',
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const data = {
        requestId,
        pricingType: formData.pricingType,
        message: formData.message,
      };

      // Adicionar campos específicos do tipo de precificação
      if (formData.pricingType === 'hourly') {
        data.proposedHours = parseInt(formData.proposedHours);
        data.proposedPrice = formData.proposedPrice;
      } else if (formData.pricingType === 'daily') {
        data.proposedDays = parseInt(formData.proposedDays);
        data.proposedPrice = formData.proposedPrice;
      } else {
        data.proposedPrice = formData.proposedPrice;
      }

      if (formData.proposedDate) {
        data.proposedDate = new Date(formData.proposedDate).toISOString();
      }

      await apiClient.post('/negotiations', data);
      
      onSuccess?.();
      
      // Resetar formulário
      setFormData({
        pricingType: 'fixed',
        proposedPrice: '',
        proposedHours: '',
        proposedDays: '',
        proposedDate: '',
        message: '',
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Tipo de precificação */}
      <select
        value={formData.pricingType}
        onChange={e => setFormData({ ...formData, pricingType: e.target.value })}
      >
        <option value="fixed">Preço Fixo</option>
        <option value="hourly">Por Hora</option>
        <option value="daily">Por Dia</option>
      </select>

      {/* Campos condicionais */}
      {formData.pricingType === 'hourly' && (
        <input
          type="number"
          placeholder="Horas"
          value={formData.proposedHours}
          onChange={e => setFormData({ ...formData, proposedHours: e.target.value })}
        />
      )}

      {formData.pricingType === 'daily' && (
        <input
          type="number"
          placeholder="Dias"
          value={formData.proposedDays}
          onChange={e => setFormData({ ...formData, proposedDays: e.target.value })}
        />
      )}

      <input
        type="number"
        placeholder="Valor (R$)"
        value={formData.proposedPrice}
        onChange={e => setFormData({ ...formData, proposedPrice: e.target.value })}
        required
      />

      <input
        type="datetime-local"
        value={formData.proposedDate}
        onChange={e => setFormData({ ...formData, proposedDate: e.target.value })}
      />

      <textarea
        placeholder="Mensagem"
        value={formData.message}
        onChange={e => setFormData({ ...formData, message: e.target.value })}
        required
      />

      {error && <div className="error">{error}</div>}

      <button type="submit" disabled={loading}>
        {loading ? 'Enviando...' : 'Enviar Proposta'}
      </button>
    </form>
  );
}
```

---

## Tratamento de Erros

### Middleware Global de Erros

```typescript
// utils/errorHandler.ts
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function handleApiError(error: any): never {
  if (error instanceof ApiError) {
    // Erro da API
    switch (error.statusCode) {
      case 401:
        // Redirecionar para login
        localStorage.removeItem('token');
        window.location.href = '/login';
        break;
      
      case 403:
        // Mostrar mensagem de permissão negada
        alert('Você não tem permissão para realizar esta ação');
        break;
      
      case 404:
        // Recurso não encontrado
        alert('Recurso não encontrado');
        break;
      
      case 400:
        // Validação falhou
        alert(`Erro: ${error.message}`);
        break;
      
      default:
        alert('Ocorreu um erro inesperado');
    }
  } else if (error instanceof TypeError && error.message === 'Failed to fetch') {
    // Erro de rede
    alert('Erro de conexão. Verifique sua internet.');
  } else {
    // Erro desconhecido
    console.error('Erro inesperado:', error);
    alert('Ocorreu um erro inesperado');
  }

  throw error;
}
```

### Try-Catch com Toast Notifications

```typescript
import { toast } from 'sonner'; // ou outra lib de toast

async function createRequestWithToast(data: any) {
  try {
    const request = await apiClient.post('/requests', data);
    
    toast.success('Solicitação criada com sucesso!', {
      description: `ID: ${request.id}`,
    });
    
    return request;
  } catch (error) {
    toast.error('Erro ao criar solicitação', {
      description: error.message,
    });
    
    throw error;
  }
}
```

---

## Boas Práticas

### 1. Validação no Cliente

```typescript
import { z } from 'zod';

// Schema de validação
const createRequestSchema = z.object({
  providerId: z.string().uuid(),
  title: z.string().min(5, 'Título deve ter pelo menos 5 caracteres'),
  description: z.string().min(20, 'Descrição deve ter pelo menos 20 caracteres'),
  pricingType: z.enum(['hourly', 'daily', 'fixed']),
  proposedPrice: z.string().regex(/^\d+(\.\d{2})?$/, 'Formato inválido'),
  scheduledDate: z.string().datetime(),
});

async function createRequestSafely(data: any) {
  // Validar antes de enviar
  const validatedData = createRequestSchema.parse(data);
  
  return apiClient.post('/requests', validatedData);
}
```

### 2. Debounce em Buscas

```typescript
import { useDebouncedValue } from '@mantine/hooks'; // ou criar custom

function ProviderSearch() {
  const [search, setSearch] = useState('');
  const [debouncedSearch] = useDebouncedValue(search, 500);

  const { data: providers } = useQuery({
    queryKey: ['providers', debouncedSearch],
    queryFn: () =>
      apiClient.get(`/providers?search=${debouncedSearch}`, false),
    enabled: debouncedSearch.length >= 3,
  });

  return (
    <input
      value={search}
      onChange={e => setSearch(e.target.value)}
      placeholder="Buscar prestadores..."
    />
  );
}
```

### 3. Polling para Status em Tempo Real

```typescript
function RequestStatus({ requestId }: { requestId: string }) {
  const { data: request } = useQuery({
    queryKey: ['request', requestId],
    queryFn: () => apiClient.get(`/requests/${requestId}`),
    refetchInterval: 5000, // Buscar a cada 5 segundos
    refetchIntervalInBackground: true,
  });

  return (
    <div>
      <p>Status: {request?.status}</p>
      {request?.status === 'pending' && <p>Aguardando resposta...</p>}
    </div>
  );
}
```

### 4. Optimistic Updates

```typescript
function useCompleteRequest() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      apiClient.put(`/requests/${id}`, data),
    
    // Atualização otimista
    onMutate: async ({ id, data }) => {
      // Cancelar queries em andamento
      await queryClient.cancelQueries({ queryKey: ['requests'] });
      
      // Snapshot do estado anterior
      const previousRequests = queryClient.getQueryData(['requests']);
      
      // Atualizar otimisticamente
      queryClient.setQueryData(['requests'], (old: any[]) =>
        old.map(r => (r.id === id ? { ...r, ...data } : r))
      );
      
      return { previousRequests };
    },
    
    // Reverter em caso de erro
    onError: (err, variables, context) => {
      queryClient.setQueryData(['requests'], context.previousRequests);
    },
    
    // Sempre refetch após sucesso ou erro
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['requests'] });
    },
  });
}
```

### 5. Interceptor de Refresh Token

```typescript
// Para futuras implementações de refresh token
class ApiClient {
  private async refreshToken() {
    const refreshToken = localStorage.getItem('refreshToken');
    
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    
    const { token } = await response.json();
    localStorage.setItem('token', token);
    
    return token;
  }

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    try {
      return await this.makeRequest(endpoint, options);
    } catch (error) {
      if (error.statusCode === 401) {
        // Tentar refresh
        await this.refreshToken();
        
        // Tentar novamente
        return this.makeRequest(endpoint, options);
      }
      
      throw error;
    }
  }
}
```

---

## Performance

### Paginação

```typescript
function useProviders(page = 1, limit = 20) {
  return useQuery({
    queryKey: ['providers', page, limit],
    queryFn: () =>
      apiClient.get(`/providers?page=${page}&limit=${limit}`, false),
    keepPreviousData: true, // Manter dados anteriores durante carregamento
  });
}
```

### Infinite Scroll

```typescript
import { useInfiniteQuery } from '@tanstack/react-query';

function useInfiniteProviders() {
  return useInfiniteQuery({
    queryKey: ['providers', 'infinite'],
    queryFn: ({ pageParam = 1 }) =>
      apiClient.get(`/providers?page=${pageParam}&limit=10`, false),
    getNextPageParam: (lastPage, pages) => {
      return lastPage.length === 10 ? pages.length + 1 : undefined;
    },
  });
}
```

---

**Última Atualização**: 2024-01-01  
**Versão**: 1.0.0
