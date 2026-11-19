import React, { useEffect, useState, useCallback } from 'react';
import {
  Users,
  Building2,
  LifeBuoy,
  Cpu,
  Plus,
  CheckCircle2,
  AlertCircle,
  Search,
  CreditCard,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { MasterOverviewData } from '../types/orvex.ts';

export type MasterTab =
  | 'geral'
  | 'utilizadores'
  | 'empresas'
  | 'suporte'
  | 'planos';

interface MasterWorkspaceProps {
  activeTab: MasterTab;
}

export const MasterWorkspace: React.FC<MasterWorkspaceProps> = ({
  activeTab,
}) => {
  const { session, apiFetch, refreshSession } = useAuth();
  const [data, setData] = useState<MasterOverviewData | null>(null);
  const [tickets, setTickets] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const [userSearch, setUserSearch] = useState('');
  const [newOrgName, setNewOrgName] = useState('');
  const [newOrgSector, setNewOrgSector] = useState('');
  const [newOrgPlan, setNewOrgPlan] = useState('FREE');
  const [replyText, setReplyText] = useState<Record<number, string>>({});

  // New plan form
  const [planCode, setPlanCode] = useState('');
  const [planName, setPlanName] = useState('');
  const [planPrice, setPlanPrice] = useState('');
  const [planMaxMembers, setPlanMaxMembers] = useState('5');
  const [planMaxTokens, setPlanMaxTokens] = useState('50000');

  const loadAll = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [overview, sup, pl] = await Promise.all([
        apiFetch<MasterOverviewData>('/api/master/overview'),
        apiFetch<any[]>('/api/master/support'),
        apiFetch<any[]>('/api/master/plans'),
      ]);
      setData(overview);
      setTickets(sup);
      setPlans(pl);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar Painel MASTER.');
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const showMsg = (msg: string) => {
    setFeedback(msg);
    setError(null);
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrgName.trim()) return;
    try {
      setBusy(true);
      await apiFetch('/api/master/organizations', {
        method: 'POST',
        body: JSON.stringify({
          name: newOrgName.trim(),
          sector: newOrgSector.trim() || 'Geral',
          plan: newOrgPlan,
        }),
      });
      setNewOrgName('');
      setNewOrgSector('');
      showMsg('Organização criada com sucesso.');
      await loadAll();
      await refreshSession();
    } catch (err: any) {
      setError(err.message || 'Erro ao criar organização.');
    } finally {
      setBusy(false);
    }
  };

  const handleToggleOrgStatus = async (orgId: number, currentStatus: string) => {
    try {
      setBusy(true);
      const nextStatus = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
      await apiFetch(`/api/master/organizations/${orgId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus }),
      });
      showMsg(
        nextStatus === 'ACTIVE'
          ? 'Organização reativada.'
          : 'Organização suspensa.'
      );
      await loadAll();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleRoleChange = async (
    userId: number,
    globalRole: 'OWNER' | 'ADMIN' | 'USER'
  ) => {
    try {
      setBusy(true);
      await apiFetch(`/api/master/users/${userId}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ globalRole }),
      });
      showMsg('Papel atualizado no servidor.');
      await loadAll();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleUserStatusChange = async (
    userId: number,
    status: 'ACTIVE' | 'SUSPENDED' | 'BLOCKED'
  ) => {
    try {
      setBusy(true);
      await apiFetch(`/api/master/users/${userId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      showMsg(`Estado do utilizador alterado para ${status}.`);
      await loadAll();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleUpdateTicket = async (
    ticketId: number,
    status: 'OPEN' | 'IN_PROGRESS' | 'CLOSED'
  ) => {
    try {
      setBusy(true);
      await apiFetch(`/api/master/support/${ticketId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status,
          reply: replyText[ticketId] || undefined,
        }),
      });
      showMsg('Pedido de suporte atualizado.');
      await loadAll();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!planCode.trim() || !planName.trim()) return;
    try {
      setBusy(true);
      await apiFetch('/api/master/plans', {
        method: 'POST',
        body: JSON.stringify({
          code: planCode.trim(),
          name: planName.trim(),
          priceEur: Number(planPrice || 0),
          maxMembers: Number(planMaxMembers || 5),
          maxAiTokens: Number(planMaxTokens || 50000),
        }),
      });
      setPlanCode('');
      setPlanName('');
      setPlanPrice('');
      showMsg('Plano criado com sucesso.');
      await loadAll();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="px-4 py-8 text-sm text-[#999895]">
        A carregar indicadores da plataforma...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="px-4 py-6">
        <div className="p-4 rounded-2xl bg-red-950/40 border border-red-900/60 text-sm text-red-300">
          {error || 'Painel MASTER indisponível.'}
        </div>
      </div>
    );
  }

  const banners = (
    <>
      {error && (
        <div className="p-3.5 rounded-xl bg-red-950/50 border border-red-900/60 text-sm text-red-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}
      {feedback && (
        <div className="p-3.5 rounded-xl bg-[#55B88A]/10 border border-[#55B88A]/30 text-sm text-[#55B88A] flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          {feedback}
        </div>
      )}
    </>
  );

  // === UTILIZADORES ===
  if (activeTab === 'utilizadores') {
    const filteredUsers = data.users.filter(
      (u) =>
        u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
        (u.name || '').toLowerCase().includes(userSearch.toLowerCase())
    );

    return (
      <div className="px-4 py-6 max-w-4xl mx-auto space-y-5">
        <div>
          <p className="text-[11px] font-medium tracking-[0.2em] uppercase text-[#999895]">
            PAINEL MASTER
          </p>
          <h1 className="mt-1 text-2xl font-bold text-[#F5F5F3]">
            Utilizadores
          </h1>
        </div>

        {banners}

        <div className="relative">
          <Search className="w-4 h-4 text-[#999895] absolute left-3.5 top-3" />
          <input
            type="text"
            value={userSearch}
            onChange={(e) => setUserSearch(e.target.value)}
            placeholder="Pesquisar por nome ou email..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#11100E] border border-[#1C1B18] text-sm text-[#F5F5F3] focus:outline-none focus:border-[#D6B36A]"
          />
        </div>

        <div className="bg-[#11100E] border border-[#1C1B18] rounded-2xl divide-y divide-[#1C1B18]">
          {filteredUsers.map((u) => (
            <div
              key={u.id}
              className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#F5F5F3] truncate">
                  {u.name || 'Utilizador'}
                </p>
                <p className="text-xs text-[#999895] truncate">{u.email}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {session?.user.globalRole === 'OWNER' &&
                u.id !== session.user.id ? (
                  <>
                    <select
                      value={u.globalRole}
                      disabled={busy}
                      onChange={(e) =>
                        handleRoleChange(
                          u.id,
                          e.target.value as 'OWNER' | 'ADMIN' | 'USER'
                        )
                      }
                      className="px-2.5 py-1.5 rounded-lg bg-[#080807] border border-[#1C1B18] text-xs text-[#F5F5F3]"
                    >
                      <option value="USER">EMPRESA</option>
                      <option value="ADMIN">ADMIN</option>
                      <option value="OWNER">OWNER</option>
                    </select>
                    <select
                      value={u.status}
                      disabled={busy}
                      onChange={(e) =>
                        handleUserStatusChange(
                          u.id,
                          e.target.value as 'ACTIVE' | 'SUSPENDED' | 'BLOCKED'
                        )
                      }
                      className="px-2.5 py-1.5 rounded-lg bg-[#080807] border border-[#1C1B18] text-xs text-[#D6B36A]"
                    >
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="SUSPENDED">SUSPENDED</option>
                      <option value="BLOCKED">BLOCKED</option>
                    </select>
                  </>
                ) : (
                  <span className="px-2.5 py-1 rounded-lg bg-[#1C1B18] text-[#D6B36A] text-xs font-semibold">
                    {u.globalRole} · {u.status}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // === EMPRESAS ===
  if (activeTab === 'empresas') {
    return (
      <div className="px-4 py-6 max-w-4xl mx-auto space-y-5">
        <div>
          <p className="text-[11px] font-medium tracking-[0.2em] uppercase text-[#999895]">
            PAINEL MASTER
          </p>
          <h1 className="mt-1 text-2xl font-bold text-[#F5F5F3]">Empresas</h1>
        </div>

        {banners}

        <form
          onSubmit={handleCreateOrg}
          className="bg-[#11100E] border border-[#1C1B18] rounded-2xl p-4 space-y-3"
        >
          <p className="text-xs font-semibold uppercase tracking-wider text-[#D6B36A]">
            Nova Organização
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <input
              type="text"
              value={newOrgName}
              onChange={(e) => setNewOrgName(e.target.value)}
              required
              placeholder="Nome da empresa"
              className="px-3.5 py-2.5 rounded-xl bg-[#080807] border border-[#1C1B18] text-sm text-[#F5F5F3]"
            />
            <input
              type="text"
              value={newOrgSector}
              onChange={(e) => setNewOrgSector(e.target.value)}
              placeholder="Setor"
              className="px-3.5 py-2.5 rounded-xl bg-[#080807] border border-[#1C1B18] text-sm text-[#F5F5F3]"
            />
            <select
              value={newOrgPlan}
              onChange={(e) => setNewOrgPlan(e.target.value)}
              className="px-3.5 py-2.5 rounded-xl bg-[#080807] border border-[#1C1B18] text-sm text-[#F5F5F3]"
            >
              <option value="FREE">FREE</option>
              <option value="STARTER">STARTER</option>
              <option value="PROFESSIONAL">PROFESSIONAL</option>
              <option value="ENTERPRISE">ENTERPRISE</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={busy}
            className="px-4 py-2.5 rounded-xl bg-[#D6B36A] hover:bg-[#B99A5C] text-[#080807] text-sm font-semibold inline-flex items-center gap-2 cursor-pointer disabled:opacity-60"
          >
            <Plus className="w-4 h-4" />
            {busy ? 'A registar...' : 'Registar organização'}
          </button>
        </form>

        <div className="bg-[#11100E] border border-[#1C1B18] rounded-2xl divide-y divide-[#1C1B18]">
          {data.organizations.map((org) => (
            <div
              key={org.id}
              className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#F5F5F3] truncate">
                  {org.name}
                </p>
                <p className="text-xs text-[#999895] mt-0.5">
                  {org.sector || 'Geral'} · {org.memberCount} membro(s) · Plano{' '}
                  {org.plan}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs font-medium ${
                    org.status === 'ACTIVE'
                      ? 'text-[#55B88A]'
                      : 'text-red-400'
                  }`}
                >
                  {org.status}
                </span>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => handleToggleOrgStatus(org.id, org.status)}
                  className="px-3 py-1.5 rounded-lg bg-[#1C1B18] text-xs text-[#F5F5F3] hover:bg-[#26241F] cursor-pointer"
                >
                  {org.status === 'ACTIVE' ? 'Suspender' : 'Reativar'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // === SUPORTE ===
  if (activeTab === 'suporte') {
    return (
      <div className="px-4 py-6 max-w-4xl mx-auto space-y-5">
        <div>
          <p className="text-[11px] font-medium tracking-[0.2em] uppercase text-[#999895]">
            PAINEL MASTER
          </p>
          <h1 className="mt-1 text-2xl font-bold text-[#F5F5F3]">Suporte</h1>
        </div>

        {banners}

        {tickets.length === 0 ? (
          <div className="bg-[#11100E] border border-[#1C1B18] rounded-2xl p-8 text-center">
            <LifeBuoy className="w-7 h-7 text-[#D6B36A] mx-auto" />
            <p className="mt-3 text-sm font-medium text-[#F5F5F3]">
              0 pedidos de suporte registados
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {tickets.map((t) => (
              <div
                key={t.id}
                className="bg-[#11100E] border border-[#1C1B18] rounded-2xl p-4 space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-[#F5F5F3]">
                      {t.subject}
                    </p>
                    <p className="text-xs text-[#999895]">
                      {t.organizationName || 'Organização'} · {t.userEmail}
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg bg-[#1C1B18] text-xs text-[#D6B36A]">
                    {t.status}
                  </span>
                </div>
                <p className="text-xs text-[#F5F5F3]/90">{t.message}</p>
                <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-[#1C1B18]">
                  <input
                    type="text"
                    value={replyText[t.id] ?? t.reply ?? ''}
                    onChange={(e) =>
                      setReplyText((prev) => ({
                        ...prev,
                        [t.id]: e.target.value,
                      }))
                    }
                    placeholder="Escrever resposta..."
                    className="flex-1 px-3 py-2 rounded-xl bg-[#080807] border border-[#1C1B18] text-xs text-[#F5F5F3]"
                  />
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => handleUpdateTicket(t.id, 'IN_PROGRESS')}
                    className="px-3 py-2 rounded-xl bg-[#1C1B18] text-xs text-[#F5F5F3] cursor-pointer"
                  >
                    Responder
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => handleUpdateTicket(t.id, 'CLOSED')}
                    className="px-3 py-2 rounded-xl bg-[#D6B36A] text-[#080807] text-xs font-semibold cursor-pointer"
                  >
                    Encerrar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // === PLANOS ===
  if (activeTab === 'planos') {
    return (
      <div className="px-4 py-6 max-w-4xl mx-auto space-y-5">
        <div>
          <p className="text-[11px] font-medium tracking-[0.2em] uppercase text-[#999895]">
            PAINEL MASTER
          </p>
          <h1 className="mt-1 text-2xl font-bold text-[#F5F5F3]">
            Gestão de planos
          </h1>
        </div>

        {banners}

        <form
          onSubmit={handleCreatePlan}
          className="bg-[#11100E] border border-[#1C1B18] rounded-2xl p-4 space-y-3"
        >
          <p className="text-xs font-semibold uppercase tracking-wider text-[#D6B36A]">
            Criar plano
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <input
              type="text"
              value={planCode}
              onChange={(e) => setPlanCode(e.target.value)}
              required
              placeholder="Código (ex: STARTER)"
              className="px-3 py-2 rounded-xl bg-[#080807] border border-[#1C1B18] text-sm text-[#F5F5F3]"
            />
            <input
              type="text"
              value={planName}
              onChange={(e) => setPlanName(e.target.value)}
              required
              placeholder="Nome do plano"
              className="px-3 py-2 rounded-xl bg-[#080807] border border-[#1C1B18] text-sm text-[#F5F5F3]"
            />
            <input
              type="number"
              value={planPrice}
              onChange={(e) => setPlanPrice(e.target.value)}
              placeholder="Preço mensal (€)"
              className="px-3 py-2 rounded-xl bg-[#080807] border border-[#1C1B18] text-sm text-[#F5F5F3]"
            />
            <input
              type="number"
              value={planMaxMembers}
              onChange={(e) => setPlanMaxMembers(e.target.value)}
              placeholder="Máx. membros"
              className="px-3 py-2 rounded-xl bg-[#080807] border border-[#1C1B18] text-sm text-[#F5F5F3]"
            />
            <input
              type="number"
              value={planMaxTokens}
              onChange={(e) => setPlanMaxTokens(e.target.value)}
              placeholder="Limite tokens IA"
              className="px-3 py-2 rounded-xl bg-[#080807] border border-[#1C1B18] text-sm text-[#F5F5F3]"
            />
          </div>
          <button
            type="submit"
            disabled={busy}
            className="px-4 py-2 rounded-xl bg-[#D6B36A] text-[#080807] text-sm font-semibold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <CreditCard className="w-4 h-4" />
            Criar plano
          </button>
        </form>

        <div className="bg-[#11100E] border border-[#1C1B18] rounded-2xl divide-y divide-[#1C1B18]">
          {plans.length === 0 ? (
            <p className="p-4 text-sm text-[#999895]">
              Ainda não existem planos personalizados configurados.
            </p>
          ) : (
            plans.map((p) => (
              <div
                key={p.id}
                className="p-4 flex items-center justify-between gap-3"
              >
                <div>
                  <p className="text-sm font-semibold text-[#F5F5F3]">
                    {p.name}{' '}
                    <span className="text-xs text-[#D6B36A]">({p.code})</span>
                  </p>
                  <p className="text-xs text-[#999895]">
                    {(p.priceCents / 100).toFixed(2)} €/mês · {p.maxMembers}{' '}
                    membros · {p.maxAiTokens} tokens IA
                  </p>
                </div>
                <span className="text-xs text-[#55B88A]">
                  {p.active ? 'Ativo' : 'Inativo'}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  // === GERAL (Reference Image 4) ===
  const openTicketsCount = tickets.filter((t) => t.status !== 'CLOSED').length;
  const weekly = data.weeklyNewUsers || [];
  const maxVal = Math.max(4, ...weekly.map((w) => w.count));
  const yTicks = [
    maxVal,
    Math.round((maxVal * 3) / 4),
    Math.round(maxVal / 2),
    Math.round(maxVal / 4),
    0,
  ];

  return (
    <div className="px-4 py-6 max-w-4xl mx-auto space-y-5">
      <div>
        <p className="text-[11px] font-medium tracking-[0.2em] uppercase text-[#999895]">
          PAINEL MASTER
        </p>
        <h1 className="mt-1.5 text-[28px] font-bold text-[#F5F5F3] leading-tight tracking-tight">
          Visão geral
        </h1>
        <p className="mt-1.5 text-sm text-[#999895]">
          Indicadores reais da plataforma.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3.5">
        <div className="bg-[#11100E] border border-[#1C1B18] rounded-2xl p-4 flex flex-col justify-between min-h-[126px]">
          <div className="flex items-start justify-between gap-2">
            <span className="text-xs text-[#999895]">Utilizadores</span>
            <Users className="w-4 h-4 text-[#D6B36A] shrink-0" />
          </div>
          <div className="mt-2">
            <p className="text-[28px] font-bold text-[#F5F5F3] leading-none">
              {data.stats.totalUsers}
            </p>
            <p className="mt-2 text-[11px] text-[#999895]">
              {data.stats.suspendedUsers ?? 0} suspensos · 0 bloqueados
            </p>
          </div>
        </div>

        <div className="bg-[#11100E] border border-[#1C1B18] rounded-2xl p-4 flex flex-col justify-between min-h-[126px]">
          <div className="flex items-start justify-between gap-2">
            <span className="text-xs text-[#999895]">Organizações ativas</span>
            <Building2 className="w-4 h-4 text-[#D6B36A] shrink-0" />
          </div>
          <div className="mt-2">
            <p className="text-[28px] font-bold text-[#F5F5F3] leading-none">
              {data.stats.activeOrganizations}
            </p>
            <p className="mt-2 text-[11px] text-[#999895]">
              {data.stats.totalOrganizations} no total
            </p>
          </div>
        </div>

        <div className="bg-[#11100E] border border-[#1C1B18] rounded-2xl p-4 flex flex-col justify-between min-h-[126px]">
          <div className="flex items-start justify-between gap-2">
            <span className="text-xs text-[#999895] leading-snug">
              Pedidos de suporte abertos
            </span>
            <LifeBuoy className="w-4 h-4 text-[#D6B36A] shrink-0" />
          </div>
          <div className="mt-2">
            <p className="text-[28px] font-bold text-[#F5F5F3] leading-none">
              {openTicketsCount}
            </p>
            <p className="mt-2 text-[11px] text-[#999895]">&nbsp;</p>
          </div>
        </div>

        <div className="bg-[#11100E] border border-[#1C1B18] rounded-2xl p-4 flex flex-col justify-between min-h-[126px]">
          <div className="flex items-start justify-between gap-2">
            <span className="text-xs text-[#999895] leading-snug">
              Registos de consumo (30 dias)
            </span>
            <Cpu className="w-4 h-4 text-[#D6B36A] shrink-0" />
          </div>
          <div className="mt-2">
            <p className="text-[28px] font-bold text-[#F5F5F3] leading-none">
              0
            </p>
            <p className="mt-2 text-[11px] text-[#999895]">
              Ver consumo no Developer Console
            </p>
          </div>
        </div>
      </div>

      {/* Novos utilizadores por semana */}
      <div className="bg-[#11100E] border border-[#1C1B18] rounded-2xl p-5">
        <h2 className="text-base font-semibold text-[#F5F5F3]">
          Novos utilizadores por semana
        </h2>
        <p className="text-xs text-[#999895] mt-0.5">Últimas 13 semanas</p>

        <div className="mt-6 flex gap-3 h-52">
          <div className="flex flex-col justify-between text-[11px] text-[#999895] pr-1 pb-5">
            {yTicks.map((t, idx) => (
              <span key={idx}>{t}</span>
            ))}
          </div>

          <div className="flex-1 flex items-end justify-between gap-1.5 pb-5 border-b border-[#1C1B18]">
            {weekly.map((bucket) => {
              const pct = maxVal > 0 ? (bucket.count / maxVal) * 100 : 0;
              return (
                <div
                  key={bucket.label}
                  className="flex-1 h-full flex flex-col justify-end items-center"
                  title={`${bucket.label}: ${bucket.count} utilizador(es)`}
                >
                  <div
                    className="w-full max-w-[20px] rounded-t-md bg-[#D6B36A] transition-all"
                    style={{
                      height:
                        bucket.count > 0 ? `${Math.max(pct, 8)}%` : '0%',
                    }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
