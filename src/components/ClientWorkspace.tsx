import React, { useEffect, useState, useCallback } from 'react';
import {
  Users,
  MailPlus,
  CreditCard,
  Cpu,
  Check,
  Bell,
  Building2,
  ShieldCheck,
  Plus,
  Trash2,
  Send,
  Package,
  Bot,
  CheckCheck,
  LogOut,
  Power,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { TenantContextData } from '../types/orvex.ts';

export type ClientTab =
  | 'inicio'
  | 'equipa'
  | 'alertas'
  | 'conta'
  | 'produtos'
  | 'ia';

interface ClientWorkspaceProps {
  organizationId: number;
  activeTab: ClientTab;
}

export const ClientWorkspace: React.FC<ClientWorkspaceProps> = ({
  organizationId,
  activeTab,
}) => {
  const { apiFetch, session, refreshSession, logout } = useAuth();
  const [data, setData] = useState<TenantContextData | null>(null);
  const [metrics, setMetrics] = useState({
    pendingInvitesCount: 0,
    productsCount: 0,
    agentsCount: 0,
    unreadNotificationsCount: 0,
    monthlyAiTokens: 0,
  });
  const [invites, setInvites] = useState<any[]>([]);
  const [notifs, setNotifs] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Invite form
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'MEMBER' | 'ORG_ADMIN'>('MEMBER');

  // Account & Org form
  const [profileName, setProfileName] = useState('');
  const [orgName, setOrgName] = useState('');
  const [orgSector, setOrgSector] = useState('');
  const [supportSubject, setSupportSubject] = useState('');
  const [supportMessage, setSupportMessage] = useState('');

  // Product form
  const [prodName, setProdName] = useState('');
  const [prodType, setProdType] = useState<'SERVICO' | 'PRODUTO'>('SERVICO');
  const [prodCategory, setProdCategory] = useState('');
  const [prodPrice, setProdPrice] = useState('');
  const [prodDesc, setProdDesc] = useState('');

  // AI Agent form & test
  const [agentName, setAgentName] = useState('');
  const [agentInstructions, setAgentInstructions] = useState('');
  const [testingAgentId, setTestingAgentId] = useState<number | null>(null);
  const [testPrompt, setTestPrompt] = useState('');
  const [testReply, setTestReply] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [ctx, m, inv, n, p, a] = await Promise.all([
        apiFetch<TenantContextData>(
          `/api/client/organizations/${organizationId}/context`
        ),
        apiFetch<any>(`/api/client/organizations/${organizationId}/metrics`),
        apiFetch<any[]>(`/api/client/organizations/${organizationId}/invites`),
        apiFetch<any[]>(
          `/api/client/organizations/${organizationId}/notifications`
        ),
        apiFetch<any[]>(`/api/client/organizations/${organizationId}/products`),
        apiFetch<any[]>(
          `/api/client/organizations/${organizationId}/ai-agents`
        ),
      ]);
      setData(ctx);
      setMetrics(m);
      setInvites(inv);
      setNotifs(n);
      setProducts(p);
      setAgents(a);
      setOrgName(ctx.organization.name);
      setOrgSector(ctx.organization.sector || '');
      setProfileName(session?.user.name || '');
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar dados da organização.');
    } finally {
      setLoading(false);
    }
  }, [organizationId, apiFetch, session?.user.name]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const showMessage = (msg: string) => {
    setFeedback(msg);
    setError(null);
    setTimeout(() => setFeedback(null), 4000);
  };

  // === HANDLERS ===
  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    try {
      setBusy(true);
      setError(null);
      await apiFetch(`/api/client/organizations/${organizationId}/invites`, {
        method: 'POST',
        body: JSON.stringify({ email: inviteEmail.trim(), orgRole: inviteRole }),
      });
      setInviteEmail('');
      showMessage('Convite enviado com sucesso.');
      await loadAll();
    } catch (err: any) {
      setError(err.message || 'Não foi possível enviar o convite.');
    } finally {
      setBusy(false);
    }
  };

  const handleInviteStatus = async (
    inviteId: number,
    status: 'CANCELLED' | 'ACCEPTED'
  ) => {
    try {
      setBusy(true);
      await apiFetch(
        `/api/client/organizations/${organizationId}/invites/${inviteId}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ status }),
        }
      );
      showMessage(
        status === 'CANCELLED' ? 'Convite cancelado.' : 'Convite atualizado.'
      );
      await loadAll();
    } catch (err: any) {
      setError(err.message || 'Erro ao atualizar convite.');
    } finally {
      setBusy(false);
    }
  };

  const handleMemberRole = async (memberUserId: number, orgRole: string) => {
    try {
      setBusy(true);
      await apiFetch(
        `/api/client/organizations/${organizationId}/members/${memberUserId}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ orgRole }),
        }
      );
      showMessage('Permissão do membro atualizada.');
      await loadAll();
    } catch (err: any) {
      setError(err.message || 'Erro ao alterar permissão.');
    } finally {
      setBusy(false);
    }
  };

  const handleRemoveMember = async (memberUserId: number) => {
    try {
      setBusy(true);
      await apiFetch(
        `/api/client/organizations/${organizationId}/members/${memberUserId}`,
        { method: 'DELETE' }
      );
      showMessage('Membro removido da organização.');
      await loadAll();
    } catch (err: any) {
      setError(err.message || 'Erro ao remover membro.');
    } finally {
      setBusy(false);
    }
  };

  const handleReadNotif = async (notifId: number) => {
    try {
      await apiFetch(
        `/api/client/organizations/${organizationId}/notifications/${notifId}/read`,
        { method: 'PATCH' }
      );
      await loadAll();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleReadAllNotifs = async () => {
    try {
      setBusy(true);
      await apiFetch(
        `/api/client/organizations/${organizationId}/notifications/read-all`,
        { method: 'POST' }
      );
      showMessage('Todos os alertas marcados como lidos.');
      await loadAll();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleSaveProfileAndOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setBusy(true);
      setError(null);
      if (profileName.trim().length >= 2) {
        await apiFetch('/api/auth/profile', {
          method: 'PATCH',
          body: JSON.stringify({ name: profileName.trim() }),
        });
      }
      await apiFetch(`/api/client/organizations/${organizationId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: orgName.trim(),
          sector: orgSector.trim(),
        }),
      });
      await refreshSession();
      await loadAll();
      showMessage('Dados guardados com sucesso.');
    } catch (err: any) {
      setError(err.message || 'Erro ao guardar alterações.');
    } finally {
      setBusy(false);
    }
  };

  const handleSupportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supportSubject.trim() || !supportMessage.trim()) return;
    try {
      setBusy(true);
      await apiFetch(`/api/client/organizations/${organizationId}/support`, {
        method: 'POST',
        body: JSON.stringify({
          subject: supportSubject.trim(),
          message: supportMessage.trim(),
        }),
      });
      setSupportSubject('');
      setSupportMessage('');
      showMessage('Pedido de suporte enviado à equipa ORVEX AI.');
    } catch (err: any) {
      setError(err.message || 'Erro ao enviar pedido de suporte.');
    } finally {
      setBusy(false);
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodName.trim()) return;
    try {
      setBusy(true);
      await apiFetch(`/api/client/organizations/${organizationId}/products`, {
        method: 'POST',
        body: JSON.stringify({
          name: prodName.trim(),
          type: prodType,
          category: prodCategory.trim() || 'Geral',
          priceEur: Number(prodPrice || 0),
          description: prodDesc.trim(),
        }),
      });
      setProdName('');
      setProdCategory('');
      setProdPrice('');
      setProdDesc('');
      showMessage('Produto/serviço registado com sucesso.');
      await loadAll();
    } catch (err: any) {
      setError(err.message || 'Erro ao registar produto.');
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteProduct = async (productId: number) => {
    try {
      setBusy(true);
      await apiFetch(
        `/api/client/organizations/${organizationId}/products/${productId}`,
        { method: 'DELETE' }
      );
      showMessage('Registo eliminado.');
      await loadAll();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleCreateAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agentName.trim() || !agentInstructions.trim()) return;
    try {
      setBusy(true);
      await apiFetch(`/api/client/organizations/${organizationId}/ai-agents`, {
        method: 'POST',
        body: JSON.stringify({
          name: agentName.trim(),
          model: 'gemini-2.5-flash',
          instructions: agentInstructions.trim(),
        }),
      });
      setAgentName('');
      setAgentInstructions('');
      showMessage('Agente de IA criado com sucesso.');
      await loadAll();
    } catch (err: any) {
      setError(err.message || 'Erro ao criar agente.');
    } finally {
      setBusy(false);
    }
  };

  const handleToggleAgent = async (agentId: number, active: boolean) => {
    try {
      setBusy(true);
      await apiFetch(
        `/api/client/organizations/${organizationId}/ai-agents/${agentId}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ active: !active }),
        }
      );
      showMessage(!active ? 'Agente ativado.' : 'Agente desativado.');
      await loadAll();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleTestAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testingAgentId || !testPrompt.trim()) return;
    try {
      setBusy(true);
      setError(null);
      setTestReply(null);
      const res = await apiFetch<any>(
        `/api/client/organizations/${organizationId}/ai-agents/${testingAgentId}/test`,
        {
          method: 'POST',
          body: JSON.stringify({ prompt: testPrompt.trim() }),
        }
      );
      setTestReply(res.reply);
      showMessage(
        `Resposta gerada (${res.usage?.totalTokens || 0} tokens registados).`
      );
      await loadAll();
    } catch (err: any) {
      setError(err.message || 'Erro ao testar agente de IA.');
    } finally {
      setBusy(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="px-4 py-8 text-sm text-[#999895]">
        A carregar dados da organização...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="px-4 py-6">
        <div className="p-4 rounded-2xl bg-red-950/40 border border-red-900/60 text-sm text-red-300">
          {error || 'Organização indisponível.'}
        </div>
      </div>
    );
  }

  const { organization, members, recentLogs } = data;

  const banners = (
    <>
      {error && (
        <div className="p-3.5 rounded-xl bg-red-950/50 border border-red-900/60 text-sm text-red-300">
          {error}
        </div>
      )}
      {feedback && (
        <div className="p-3.5 rounded-xl bg-[#55B88A]/10 border border-[#55B88A]/30 text-sm text-[#55B88A]">
          {feedback}
        </div>
      )}
    </>
  );

  // === EQUIPA ===
  if (activeTab === 'equipa') {
    return (
      <div className="px-4 py-6 max-w-4xl mx-auto space-y-5">
        <div>
          <p className="text-[11px] font-medium tracking-[0.2em] uppercase text-[#999895]">
            EQUIPA
          </p>
          <h1 className="mt-1 text-2xl font-bold text-[#F5F5F3]">
            Membros e convites
          </h1>
          <p className="mt-1 text-sm text-[#999895]">
            Gerir acessos e convites pendentes de {organization.name}.
          </p>
        </div>

        {banners}

        {/* Invite Form */}
        <form
          onSubmit={handleInvite}
          className="bg-[#11100E] border border-[#1C1B18] rounded-2xl p-4 space-y-3"
        >
          <p className="text-xs font-semibold uppercase tracking-wider text-[#D6B36A]">
            Convidar membro por email
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              required
              placeholder="email@empresa.com"
              className="sm:col-span-2 px-3.5 py-2.5 rounded-xl bg-[#080807] border border-[#1C1B18] text-sm text-[#F5F5F3] focus:outline-none focus:border-[#D6B36A]"
            />
            <select
              value={inviteRole}
              onChange={(e) =>
                setInviteRole(e.target.value as 'MEMBER' | 'ORG_ADMIN')
              }
              className="px-3.5 py-2.5 rounded-xl bg-[#080807] border border-[#1C1B18] text-sm text-[#F5F5F3]"
            >
              <option value="MEMBER">Membro</option>
              <option value="ORG_ADMIN">Administrador</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={busy}
            className="px-4 py-2.5 rounded-xl bg-[#D6B36A] hover:bg-[#B99A5C] text-[#080807] text-sm font-semibold inline-flex items-center gap-2 cursor-pointer disabled:opacity-60"
          >
            <MailPlus className="w-4 h-4" />
            {busy ? 'A enviar...' : 'Enviar convite'}
          </button>
        </form>

        {/* Active Members */}
        <div className="bg-[#11100E] border border-[#1C1B18] rounded-2xl divide-y divide-[#1C1B18]">
          <div className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[#999895]">
            Membros ativos ({members.length})
          </div>
          {members.map((m) => (
            <div
              key={m.id}
              className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#F5F5F3] truncate">
                  {m.name || 'Utilizador'}
                </p>
                <p className="text-xs text-[#999895] truncate">{m.email}</p>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={m.orgRole}
                  disabled={busy}
                  onChange={(e) => handleMemberRole(m.id, e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg bg-[#080807] border border-[#1C1B18] text-xs text-[#D6B36A]"
                >
                  <option value="MEMBER">MEMBER</option>
                  <option value="ORG_ADMIN">ORG_ADMIN</option>
                </select>
                {m.id !== session?.user.id && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => handleRemoveMember(m.id)}
                    className="p-1.5 rounded-lg text-[#999895] hover:text-red-400 hover:bg-[#1C1B18] cursor-pointer"
                    title="Remover membro"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Invites List */}
        <div className="bg-[#11100E] border border-[#1C1B18] rounded-2xl divide-y divide-[#1C1B18]">
          <div className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[#999895]">
            Convites ({invites.length})
          </div>
          {invites.length === 0 ? (
            <p className="p-4 text-sm text-[#999895]">
              Nenhum convite registado.
            </p>
          ) : (
            invites.map((inv) => (
              <div
                key={inv.id}
                className="p-4 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="text-sm text-[#F5F5F3] truncate">{inv.email}</p>
                  <p className="text-xs text-[#999895]">
                    {inv.orgRole} · {inv.status}
                  </p>
                </div>
                {inv.status === 'PENDING' && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => handleInviteStatus(inv.id, 'CANCELLED')}
                    className="px-3 py-1.5 rounded-lg bg-[#1C1B18] text-xs text-red-300 hover:bg-red-950/60 cursor-pointer"
                  >
                    Cancelar
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  // === ALERTAS ===
  if (activeTab === 'alertas') {
    return (
      <div className="px-4 py-6 max-w-4xl mx-auto space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-medium tracking-[0.2em] uppercase text-[#999895]">
              ALERTAS
            </p>
            <h1 className="mt-1 text-2xl font-bold text-[#F5F5F3]">
              Notificações
            </h1>
          </div>
          {notifs.some((n) => !n.isRead) && (
            <button
              type="button"
              disabled={busy}
              onClick={handleReadAllNotifs}
              className="px-3 py-2 rounded-xl bg-[#11100E] border border-[#1C1B18] text-xs text-[#D6B36A] inline-flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              Marcar todas lidas
            </button>
          )}
        </div>

        {banners}

        <div className="bg-[#11100E] border border-[#1C1B18] rounded-2xl divide-y divide-[#1C1B18]">
          {notifs.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="w-6 h-6 text-[#999895] mx-auto" />
              <p className="mt-2 text-sm text-[#999895]">
                Sem notificações nesta organização.
              </p>
            </div>
          ) : (
            notifs.map((n) => (
              <div
                key={n.id}
                className="p-4 flex items-start justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    {!n.isRead && (
                      <span className="w-2 h-2 rounded-full bg-[#D6B36A]" />
                    )}
                    <p className="text-sm font-semibold text-[#F5F5F3]">
                      {n.title}
                    </p>
                  </div>
                  <p className="text-xs text-[#999895] mt-1">{n.message}</p>
                  <p className="text-[11px] text-[#999895]/70 mt-1">
                    {new Date(n.createdAt).toLocaleString('pt-PT')}
                  </p>
                </div>
                {!n.isRead && (
                  <button
                    type="button"
                    onClick={() => handleReadNotif(n.id)}
                    className="px-2.5 py-1 rounded-lg bg-[#1C1B18] text-xs text-[#D6B36A] shrink-0 cursor-pointer"
                  >
                    Lida
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  // === PRODUTOS E SERVIÇOS ===
  if (activeTab === 'produtos') {
    return (
      <div className="px-4 py-6 max-w-4xl mx-auto space-y-5">
        <div>
          <p className="text-[11px] font-medium tracking-[0.2em] uppercase text-[#999895]">
            CATÁLOGO COMERCIAL
          </p>
          <h1 className="mt-1 text-2xl font-bold text-[#F5F5F3]">
            Produtos e serviços
          </h1>
        </div>

        {banners}

        <form
          onSubmit={handleCreateProduct}
          className="bg-[#11100E] border border-[#1C1B18] rounded-2xl p-4 space-y-3"
        >
          <p className="text-xs font-semibold uppercase tracking-wider text-[#D6B36A]">
            Registar novo item
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <input
              type="text"
              value={prodName}
              onChange={(e) => setProdName(e.target.value)}
              required
              placeholder="Nome do produto ou serviço"
              className="px-3.5 py-2.5 rounded-xl bg-[#080807] border border-[#1C1B18] text-sm text-[#F5F5F3]"
            />
            <select
              value={prodType}
              onChange={(e) =>
                setProdType(e.target.value as 'SERVICO' | 'PRODUTO')
              }
              className="px-3.5 py-2.5 rounded-xl bg-[#080807] border border-[#1C1B18] text-sm text-[#F5F5F3]"
            >
              <option value="SERVICO">Serviço</option>
              <option value="PRODUTO">Produto</option>
            </select>
            <input
              type="text"
              value={prodCategory}
              onChange={(e) => setProdCategory(e.target.value)}
              placeholder="Categoria"
              className="px-3.5 py-2.5 rounded-xl bg-[#080807] border border-[#1C1B18] text-sm text-[#F5F5F3]"
            />
            <input
              type="number"
              step="0.01"
              min="0"
              value={prodPrice}
              onChange={(e) => setProdPrice(e.target.value)}
              placeholder="Preço (€)"
              className="px-3.5 py-2.5 rounded-xl bg-[#080807] border border-[#1C1B18] text-sm text-[#F5F5F3]"
            />
          </div>
          <textarea
            value={prodDesc}
            onChange={(e) => setProdDesc(e.target.value)}
            rows={2}
            placeholder="Descrição comercial"
            className="w-full px-3.5 py-2.5 rounded-xl bg-[#080807] border border-[#1C1B18] text-sm text-[#F5F5F3]"
          />
          <button
            type="submit"
            disabled={busy}
            className="px-4 py-2.5 rounded-xl bg-[#D6B36A] hover:bg-[#B99A5C] text-[#080807] text-sm font-semibold inline-flex items-center gap-2 cursor-pointer disabled:opacity-60"
          >
            <Plus className="w-4 h-4" />
            {busy ? 'A guardar...' : 'Guardar item'}
          </button>
        </form>

        <div className="bg-[#11100E] border border-[#1C1B18] rounded-2xl divide-y divide-[#1C1B18]">
          {products.length === 0 ? (
            <div className="p-8 text-center">
              <Package className="w-6 h-6 text-[#999895] mx-auto" />
              <p className="mt-2 text-sm text-[#999895]">
                Ainda não existem produtos ou serviços registados.
              </p>
            </div>
          ) : (
            products.map((p) => (
              <div
                key={p.id}
                className="p-4 flex items-center justify-between gap-3"
              >
                <div>
                  <p className="text-sm font-semibold text-[#F5F5F3]">
                    {p.name}{' '}
                    <span className="text-[11px] font-normal text-[#D6B36A]">
                      ({p.type})
                    </span>
                  </p>
                  <p className="text-xs text-[#999895] mt-0.5">
                    {p.category} · {(p.priceCents / 100).toFixed(2)} €
                  </p>
                  {p.description && (
                    <p className="text-xs text-[#999895] mt-1">
                      {p.description}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => handleDeleteProduct(p.id)}
                  className="p-2 rounded-lg text-[#999895] hover:text-red-400 hover:bg-[#1C1B18] cursor-pointer"
                  title="Eliminar"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  // === AGENTES DE IA ===
  if (activeTab === 'ia') {
    return (
      <div className="px-4 py-6 max-w-4xl mx-auto space-y-5">
        <div>
          <p className="text-[11px] font-medium tracking-[0.2em] uppercase text-[#999895]">
            INTELIGÊNCIA ARTIFICIAL
          </p>
          <h1 className="mt-1 text-2xl font-bold text-[#F5F5F3]">
            Agentes de IA
          </h1>
          <p className="mt-1 text-sm text-[#999895]">
            Crie, configure e teste agentes contextualizados para {organization.name}.
          </p>
        </div>

        {banners}

        <form
          onSubmit={handleCreateAgent}
          className="bg-[#11100E] border border-[#1C1B18] rounded-2xl p-4 space-y-3"
        >
          <p className="text-xs font-semibold uppercase tracking-wider text-[#D6B36A]">
            Novo Agente de IA
          </p>
          <input
            type="text"
            value={agentName}
            onChange={(e) => setAgentName(e.target.value)}
            required
            placeholder="Nome do agente (ex: Especialista Comercial)"
            className="w-full px-3.5 py-2.5 rounded-xl bg-[#080807] border border-[#1C1B18] text-sm text-[#F5F5F3]"
          />
          <textarea
            value={agentInstructions}
            onChange={(e) => setAgentInstructions(e.target.value)}
            required
            rows={3}
            placeholder="Instruções do agente (tom, objetivos, contexto da empresa)..."
            className="w-full px-3.5 py-2.5 rounded-xl bg-[#080807] border border-[#1C1B18] text-sm text-[#F5F5F3]"
          />
          <button
            type="submit"
            disabled={busy}
            className="px-4 py-2.5 rounded-xl bg-[#D6B36A] hover:bg-[#B99A5C] text-[#080807] text-sm font-semibold inline-flex items-center gap-2 cursor-pointer disabled:opacity-60"
          >
            <Bot className="w-4 h-4" />
            {busy ? 'A criar...' : 'Criar agente'}
          </button>
        </form>

        <div className="space-y-3">
          {agents.map((a) => (
            <div
              key={a.id}
              className="bg-[#11100E] border border-[#1C1B18] rounded-2xl p-4 space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[#F5F5F3]">
                    {a.name}
                  </p>
                  <p className="text-xs text-[#999895] mt-0.5">
                    Modelo: {a.model} · {a.active ? 'Ativo' : 'Desativado'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggleAgent(a.id, a.active)}
                    className="px-2.5 py-1.5 rounded-lg bg-[#1C1B18] text-xs text-[#F5F5F3] inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Power className="w-3.5 h-3.5 text-[#D6B36A]" />
                    {a.active ? 'Desativar' : 'Ativar'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTestingAgentId(testingAgentId === a.id ? null : a.id);
                      setTestReply(null);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-[#D6B36A] text-[#080807] text-xs font-semibold cursor-pointer"
                  >
                    Testar
                  </button>
                </div>
              </div>

              {testingAgentId === a.id && (
                <form
                  onSubmit={handleTestAgent}
                  className="pt-3 border-t border-[#1C1B18] space-y-2.5"
                >
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={testPrompt}
                      onChange={(e) => setTestPrompt(e.target.value)}
                      required
                      placeholder="Escreva uma mensagem de teste..."
                      className="flex-1 px-3 py-2 rounded-xl bg-[#080807] border border-[#1C1B18] text-sm text-[#F5F5F3]"
                    />
                    <button
                      type="submit"
                      disabled={busy}
                      className="px-4 py-2 rounded-xl bg-[#D6B36A] text-[#080807] text-sm font-semibold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Enviar
                    </button>
                  </div>
                  {testReply && (
                    <div className="p-3.5 rounded-xl bg-[#080807] border border-[#1C1B18] text-sm text-[#F5F5F3] whitespace-pre-wrap">
                      {testReply}
                    </div>
                  )}
                </form>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // === CONTA ===
  if (activeTab === 'conta') {
    return (
      <div className="px-4 py-6 max-w-4xl mx-auto space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-medium tracking-[0.2em] uppercase text-[#999895]">
              CONTA
            </p>
            <h1 className="mt-1 text-2xl font-bold text-[#F5F5F3]">
              Perfil e organização
            </h1>
          </div>
          <button
            type="button"
            onClick={logout}
            className="px-3.5 py-2 rounded-xl bg-[#11100E] border border-[#1C1B18] text-xs text-red-300 inline-flex items-center gap-1.5 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            Terminar sessão
          </button>
        </div>

        {banners}

        <form
          onSubmit={handleSaveProfileAndOrg}
          className="bg-[#11100E] border border-[#1C1B18] rounded-2xl p-5 space-y-4"
        >
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#D6B36A]">
            <Building2 className="w-4 h-4" />
            Informações Pessoais e da Organização
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs text-[#999895] mb-1">
                O seu nome
              </label>
              <input
                type="text"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#080807] border border-[#1C1B18] text-sm text-[#F5F5F3]"
              />
            </div>
            <div>
              <label className="block text-xs text-[#999895] mb-1">
                Email (autenticado via Google)
              </label>
              <input
                type="text"
                value={session?.user.email || ''}
                disabled
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#080807]/60 border border-[#1C1B18] text-sm text-[#999895]"
              />
            </div>
            <div>
              <label className="block text-xs text-[#999895] mb-1">
                Nome da organização
              </label>
              <input
                type="text"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#080807] border border-[#1C1B18] text-sm text-[#F5F5F3]"
              />
            </div>
            <div>
              <label className="block text-xs text-[#999895] mb-1">
                Setor de atividade
              </label>
              <input
                type="text"
                value={orgSector}
                onChange={(e) => setOrgSector(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#080807] border border-[#1C1B18] text-sm text-[#F5F5F3]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={busy}
            className="px-5 py-2.5 rounded-xl bg-[#D6B36A] hover:bg-[#B99A5C] text-[#080807] text-sm font-semibold cursor-pointer disabled:opacity-60"
          >
            {busy ? 'A guardar...' : 'Guardar alterações'}
          </button>
        </form>

        {/* Support Form */}
        <form
          onSubmit={handleSupportSubmit}
          className="bg-[#11100E] border border-[#1C1B18] rounded-2xl p-5 space-y-3"
        >
          <p className="text-xs font-semibold uppercase tracking-wider text-[#D6B36A]">
            Abrir pedido de suporte
          </p>
          <input
            type="text"
            value={supportSubject}
            onChange={(e) => setSupportSubject(e.target.value)}
            required
            placeholder="Assunto"
            className="w-full px-3.5 py-2.5 rounded-xl bg-[#080807] border border-[#1C1B18] text-sm text-[#F5F5F3]"
          />
          <textarea
            value={supportMessage}
            onChange={(e) => setSupportMessage(e.target.value)}
            required
            rows={2}
            placeholder="Descreva a sua solicitação..."
            className="w-full px-3.5 py-2.5 rounded-xl bg-[#080807] border border-[#1C1B18] text-sm text-[#F5F5F3]"
          />
          <button
            type="submit"
            disabled={busy}
            className="px-4 py-2 rounded-xl bg-[#1C1B18] hover:bg-[#26241F] text-[#F5F5F3] text-sm font-medium cursor-pointer"
          >
            Enviar pedido
          </button>
        </form>

        <div className="bg-[#11100E] border border-[#1C1B18] rounded-2xl p-4 flex items-center justify-between text-xs text-[#999895]">
          <span className="flex items-center gap-1.5 text-[#55B88A]">
            <ShieldCheck className="w-4 h-4" />
            Isolamento Multi-Tenant Ativo
          </span>
          <span className="font-mono">{organization.uuid.slice(0, 12)}…</span>
        </div>
      </div>
    );
  }

  // === INÍCIO (Reference Image 1 with live metrics) ===
  const planDisplay =
    organization.plan === 'FREE' ? 'Experimental' : organization.plan;

  const steps = [
    { label: 'Organização criada', done: true },
    {
      label: 'Convidar a equipa',
      done: members.length > 1 || invites.length > 0,
    },
    {
      label: 'Registar produtos e serviços',
      done: metrics.productsCount > 0,
    },
    { label: 'Definir o comprador ideal', done: false },
    {
      label: 'Criar o primeiro agente de IA',
      done: metrics.agentsCount > 0,
    },
  ];

  return (
    <div className="px-4 py-6 max-w-4xl mx-auto space-y-5">
      <div>
        <p className="text-[11px] font-medium tracking-[0.2em] uppercase text-[#999895]">
          VISÃO GERAL
        </p>
        <h1 className="mt-1.5 text-[28px] font-bold text-[#F5F5F3] leading-tight tracking-tight">
          {organization.name}
        </h1>
        <p className="mt-1.5 text-sm text-[#999895]">
          Resumo real da atividade da sua organização.
        </p>
      </div>

      {/* 2x2 KPI Cards */}
      <div className="grid grid-cols-2 gap-3.5">
        <div className="bg-[#11100E] border border-[#1C1B18] rounded-2xl p-4 flex flex-col justify-between min-h-[126px]">
          <div className="flex items-start justify-between gap-2">
            <span className="text-xs text-[#999895]">Membros</span>
            <Users className="w-4 h-4 text-[#D6B36A] shrink-0" />
          </div>
          <div className="mt-2">
            <p className="text-[28px] font-bold text-[#F5F5F3] leading-none">
              {members.length}
            </p>
            <p className="mt-2 text-[11px] text-[#999895]">Limite por definir</p>
          </div>
        </div>

        <div className="bg-[#11100E] border border-[#1C1B18] rounded-2xl p-4 flex flex-col justify-between min-h-[126px]">
          <div className="flex items-start justify-between gap-2">
            <span className="text-xs text-[#999895]">Convites pendentes</span>
            <MailPlus className="w-4 h-4 text-[#D6B36A] shrink-0" />
          </div>
          <div className="mt-2">
            <p className="text-[28px] font-bold text-[#F5F5F3] leading-none">
              {metrics.pendingInvitesCount}
            </p>
            <p className="mt-2 text-[11px] text-[#999895]">&nbsp;</p>
          </div>
        </div>

        <div className="bg-[#11100E] border border-[#1C1B18] rounded-2xl p-4 flex flex-col justify-between min-h-[126px]">
          <div className="flex items-start justify-between gap-2">
            <span className="text-xs text-[#999895]">Plano</span>
            <CreditCard className="w-4 h-4 text-[#D6B36A] shrink-0" />
          </div>
          <div className="mt-2">
            <p className="text-[20px] font-bold text-[#F5F5F3] leading-tight truncate">
              {planDisplay}
            </p>
            <p className="mt-2 text-[11px] text-[#999895]">
              Estado: {organization.status}
            </p>
          </div>
        </div>

        <div className="bg-[#11100E] border border-[#1C1B18] rounded-2xl p-4 flex flex-col justify-between min-h-[126px]">
          <div className="flex items-start justify-between gap-2">
            <span className="text-xs text-[#999895] leading-snug">
              Consumo de IA este mês
            </span>
            <Cpu className="w-4 h-4 text-[#D6B36A] shrink-0" />
          </div>
          <div className="mt-2">
            <p className="text-[28px] font-bold text-[#F5F5F3] leading-none">
              {metrics.monthlyAiTokens}
            </p>
            <p className="mt-2 text-[11px] text-[#999895]">
              tokens · limite por definir
            </p>
          </div>
        </div>
      </div>

      {/* Primeiros passos */}
      <div className="bg-[#11100E] border border-[#1C1B18] rounded-2xl p-5">
        <h2 className="text-base font-semibold text-[#F5F5F3]">
          Primeiros passos
        </h2>
        <ul className="mt-4 space-y-3.5">
          {steps.map((step) => (
            <li key={step.label} className="flex items-center gap-3 text-sm">
              {step.done ? (
                <span className="w-5 h-5 rounded-full border border-[#D6B36A] flex items-center justify-center shrink-0">
                  <Check className="w-3 h-3 text-[#D6B36A]" strokeWidth={2.5} />
                </span>
              ) : (
                <span className="w-5 h-5 rounded-full border border-[#999895]/60 shrink-0" />
              )}
              <span
                className={
                  step.done ? 'text-[#999895] line-through' : 'text-[#F5F5F3]'
                }
              >
                {step.label}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Atividade recente */}
      <div className="bg-[#11100E] border border-[#1C1B18] rounded-2xl p-5">
        <h2 className="text-base font-semibold text-[#F5F5F3]">
          Atividade recente
        </h2>
        {recentLogs.length === 0 ? (
          <p className="mt-3 text-sm text-[#999895]">
            Ainda não existem registos de atividade.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-[#1C1B18]">
            {recentLogs.map((log) => (
              <li
                key={log.id}
                className="py-3 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1"
              >
                <div>
                  <span className="font-mono text-xs text-[#D6B36A]">
                    {log.action}
                  </span>
                  {log.details && (
                    <p className="text-xs text-[#999895] mt-0.5">
                      {log.details}
                    </p>
                  )}
                </div>
                <span className="text-[11px] text-[#999895] whitespace-nowrap">
                  {new Date(log.createdAt).toLocaleString('pt-PT')}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
