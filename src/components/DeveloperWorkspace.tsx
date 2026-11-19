import React, { useEffect, useState, useCallback } from 'react';
import {
  RefreshCw,
  ShieldCheck,
  Plug,
  Plus,
  Trash2,
  DatabaseBackup,
  Search,
  Coins,
  GitBranch,
  SlidersHorizontal,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import {
  DeveloperHealthData,
  DeveloperOverviewData,
} from '../types/orvex.ts';

export type DeveloperSection =
  | 'estado'
  | 'apis'
  | 'agentes'
  | 'prospecao'
  | 'infraestrutura'
  | 'logs'
  | 'seguranca'
  | 'auditoria'
  | 'versoes'
  | 'backups'
  | 'custos'
  | 'configuracoes';

interface DeveloperWorkspaceProps {
  activeSection: DeveloperSection;
}

export const DeveloperWorkspace: React.FC<DeveloperWorkspaceProps> = ({
  activeSection,
}) => {
  const { apiFetch } = useAuth();
  const [health, setHealth] = useState<DeveloperHealthData | null>(null);
  const [overview, setOverview] = useState<DeveloperOverviewData | null>(null);
  const [integrationsList, setIntegrationsList] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [releases, setReleases] = useState<any[]>([]);
  const [backups, setBackups] = useState<any[]>([]);
  const [costs, setCosts] = useState<any>(null);
  const [configs, setConfigs] = useState<any[]>([]);

  const [checking, setChecking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Filters & forms
  const [logSearch, setLogSearch] = useState('');
  const [logEnvFilter, setLogEnvFilter] = useState('ALL');

  const [intCode, setIntCode] = useState('');
  const [intName, setIntName] = useState('');
  const [intDesc, setIntDesc] = useState('');
  const [intUrl, setIntUrl] = useState('');

  const [campName, setCampName] = useState('');
  const [campSector, setCampSector] = useState('');
  const [campRegion, setCampRegion] = useState('');

  const [relVersion, setRelVersion] = useState('');
  const [relTitle, setRelTitle] = useState('');
  const [relNotes, setRelNotes] = useState('');

  const [cfgKey, setCfgKey] = useState('');
  const [cfgVal, setCfgVal] = useState('');

  const loadAll = useCallback(async () => {
    try {
      setChecking(true);
      setError(null);
      const [h, o, ints, camps, rels, bks, c, cfgs] = await Promise.all([
        apiFetch<DeveloperHealthData>('/api/developer/health-check'),
        apiFetch<DeveloperOverviewData>('/api/developer/overview'),
        apiFetch<any[]>('/api/developer/integrations'),
        apiFetch<any[]>('/api/developer/prospecting'),
        apiFetch<any[]>('/api/developer/releases'),
        apiFetch<any[]>('/api/developer/backups'),
        apiFetch<any>('/api/developer/costs'),
        apiFetch<any[]>('/api/developer/config'),
      ]);
      setHealth(h);
      setOverview(o);
      setIntegrationsList(ints);
      setCampaigns(camps);
      setReleases(rels);
      setBackups(bks);
      setCosts(c);
      setConfigs(cfgs);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar Developer Console.');
    } finally {
      setChecking(false);
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

  const renderStatusPill = (status: 'OPERACIONAL' | 'INDISPONIVEL') => {
    if (status === 'OPERACIONAL') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#55B88A]/10 border border-[#55B88A]/30 text-[#55B88A] text-xs font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-[#55B88A]" />
          Operacional
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-950/60 border border-red-800 text-red-400 text-xs font-medium">
        <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
        Indisponível
      </span>
    );
  };

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

  // === APIS E INTEGRAÇÕES ===
  if (activeSection === 'apis') {
    const handleAddIntegration = async (e: React.FormEvent) => {
      e.preventDefault();
      try {
        setBusy(true);
        await apiFetch('/api/developer/integrations', {
          method: 'POST',
          body: JSON.stringify({
            code: intCode,
            name: intName,
            category: 'API',
            description: intDesc || 'Integração externa',
            endpointUrl: intUrl || undefined,
          }),
        });
        setIntCode('');
        setIntName('');
        setIntDesc('');
        setIntUrl('');
        showMsg('Integração guardada na base de dados.');
        await loadAll();
      } catch (err: any) {
        setError(err.message);
      } finally {
        setBusy(false);
      }
    };

    const handleTestInt = async (id: number) => {
      try {
        setBusy(true);
        await apiFetch(`/api/developer/integrations/${id}/test`, {
          method: 'POST',
        });
        showMsg('Teste de ligação concluído.');
        await loadAll();
      } catch (err: any) {
        setError(err.message);
      } finally {
        setBusy(false);
      }
    };

    const handleToggleInt = async (id: number, active: boolean) => {
      try {
        setBusy(true);
        await apiFetch(`/api/developer/integrations/${id}`, {
          method: 'PATCH',
          body: JSON.stringify({ active: !active }),
        });
        await loadAll();
      } catch (err: any) {
        setError(err.message);
      } finally {
        setBusy(false);
      }
    };

    return (
      <div className="px-4 py-6 max-w-4xl mx-auto space-y-5">
        <div>
          <p className="text-[11px] font-medium tracking-[0.2em] uppercase text-[#999895]">
            DEVELOPER CONSOLE
          </p>
          <h1 className="mt-1 text-2xl font-bold text-[#F5F5F3]">
            APIs e integrações
          </h1>
        </div>

        {banners}

        <form
          onSubmit={handleAddIntegration}
          className="bg-[#11100E] border border-[#1C1B18] rounded-2xl p-4 space-y-3"
        >
          <p className="text-xs font-semibold uppercase tracking-wider text-[#D6B36A]">
            Registar integração
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <input
              type="text"
              value={intCode}
              onChange={(e) => setIntCode(e.target.value)}
              required
              placeholder="Código (ex: GEMINI_AI, WHATSAPP)"
              className="px-3 py-2 rounded-xl bg-[#080807] border border-[#1C1B18] text-sm text-[#F5F5F3]"
            />
            <input
              type="text"
              value={intName}
              onChange={(e) => setIntName(e.target.value)}
              required
              placeholder="Nome da integração"
              className="px-3 py-2 rounded-xl bg-[#080807] border border-[#1C1B18] text-sm text-[#F5F5F3]"
            />
            <input
              type="text"
              value={intDesc}
              onChange={(e) => setIntDesc(e.target.value)}
              placeholder="Descrição"
              className="px-3 py-2 rounded-xl bg-[#080807] border border-[#1C1B18] text-sm text-[#F5F5F3]"
            />
            <input
              type="url"
              value={intUrl}
              onChange={(e) => setIntUrl(e.target.value)}
              placeholder="Endpoint URL (opcional)"
              className="px-3 py-2 rounded-xl bg-[#080807] border border-[#1C1B18] text-sm text-[#F5F5F3]"
            />
          </div>
          <button
            type="submit"
            disabled={busy}
            className="px-4 py-2 rounded-xl bg-[#D6B36A] text-[#080807] text-sm font-semibold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Guardar integração
          </button>
        </form>

        <div className="bg-[#11100E] border border-[#1C1B18] rounded-2xl divide-y divide-[#1C1B18]">
          {integrationsList.length === 0 ? (
            <p className="p-4 text-sm text-[#999895]">
              Nenhuma integração registada. Registe por exemplo GEMINI_AI para testar a chave do servidor.
            </p>
          ) : (
            integrationsList.map((item) => (
              <div
                key={item.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
              >
                <div>
                  <p className="text-sm font-semibold text-[#F5F5F3] flex items-center gap-2">
                    <Plug className="w-4 h-4 text-[#D6B36A]" />
                    {item.name} ({item.code})
                  </p>
                  <p className="text-xs text-[#999895] mt-0.5">
                    {item.lastTestStatus || item.description}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => handleTestInt(item.id)}
                    className="px-3 py-1.5 rounded-lg bg-[#1C1B18] text-xs text-[#F5F5F3] cursor-pointer"
                  >
                    Testar
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => handleToggleInt(item.id, item.active)}
                    className="px-3 py-1.5 rounded-lg bg-[#D6B36A] text-[#080807] text-xs font-semibold cursor-pointer"
                  >
                    {item.active ? 'Desativar' : 'Ativar'}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  // === MOTOR DE PROSPEÇÃO ===
  if (activeSection === 'prospecao') {
    const handleCreateCampaign = async (e: React.FormEvent) => {
      e.preventDefault();
      try {
        setBusy(true);
        await apiFetch('/api/developer/prospecting', {
          method: 'POST',
          body: JSON.stringify({
            name: campName,
            targetSector: campSector,
            targetRegion: campRegion,
          }),
        });
        setCampName('');
        setCampSector('');
        setCampRegion('');
        showMsg('Campanha de prospeção guardada.');
        await loadAll();
      } catch (err: any) {
        setError(err.message);
      } finally {
        setBusy(false);
      }
    };

    const handleDeleteCampaign = async (id: number) => {
      try {
        setBusy(true);
        await apiFetch(`/api/developer/prospecting/${id}`, {
          method: 'DELETE',
        });
        await loadAll();
      } catch (err: any) {
        setError(err.message);
      } finally {
        setBusy(false);
      }
    };

    return (
      <div className="px-4 py-6 max-w-4xl mx-auto space-y-5">
        <div>
          <p className="text-[11px] font-medium tracking-[0.2em] uppercase text-[#999895]">
            DEVELOPER CONSOLE
          </p>
          <h1 className="mt-1 text-2xl font-bold text-[#F5F5F3]">
            Motor de prospeção
          </h1>
          <p className="mt-1 text-xs text-[#999895]">
            Configure campanhas reais. A recolha automática externa requer integração com fornecedor de dados comerciais.
          </p>
        </div>

        {banners}

        <form
          onSubmit={handleCreateCampaign}
          className="bg-[#11100E] border border-[#1C1B18] rounded-2xl p-4 space-y-3"
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <input
              type="text"
              value={campName}
              onChange={(e) => setCampName(e.target.value)}
              required
              placeholder="Nome da campanha"
              className="px-3 py-2 rounded-xl bg-[#080807] border border-[#1C1B18] text-sm text-[#F5F5F3]"
            />
            <input
              type="text"
              value={campSector}
              onChange={(e) => setCampSector(e.target.value)}
              required
              placeholder="Setor alvo"
              className="px-3 py-2 rounded-xl bg-[#080807] border border-[#1C1B18] text-sm text-[#F5F5F3]"
            />
            <input
              type="text"
              value={campRegion}
              onChange={(e) => setCampRegion(e.target.value)}
              required
              placeholder="Região alvo"
              className="px-3 py-2 rounded-xl bg-[#080807] border border-[#1C1B18] text-sm text-[#F5F5F3]"
            />
          </div>
          <button
            type="submit"
            disabled={busy}
            className="px-4 py-2 rounded-xl bg-[#D6B36A] text-[#080807] text-sm font-semibold cursor-pointer"
          >
            Guardar campanha
          </button>
        </form>

        <div className="bg-[#11100E] border border-[#1C1B18] rounded-2xl divide-y divide-[#1C1B18]">
          {campaigns.length === 0 ? (
            <p className="p-4 text-sm text-[#999895]">
              Sem campanhas registadas.
            </p>
          ) : (
            campaigns.map((c) => (
              <div
                key={c.id}
                className="p-4 flex items-center justify-between gap-3"
              >
                <div>
                  <p className="text-sm font-semibold text-[#F5F5F3]">
                    {c.name}
                  </p>
                  <p className="text-xs text-[#999895]">
                    {c.targetSector} · {c.targetRegion} · {c.status}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteCampaign(c.id)}
                  className="p-2 text-[#999895] hover:text-red-400 cursor-pointer"
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

  // === VERSÕES ===
  if (activeSection === 'versoes') {
    const handleAddRelease = async (e: React.FormEvent) => {
      e.preventDefault();
      try {
        setBusy(true);
        await apiFetch('/api/developer/releases', {
          method: 'POST',
          body: JSON.stringify({
            version: relVersion,
            title: relTitle,
            notes: relNotes,
          }),
        });
        setRelVersion('');
        setRelTitle('');
        setRelNotes('');
        showMsg('Versão registada.');
        await loadAll();
      } catch (err: any) {
        setError(err.message);
      } finally {
        setBusy(false);
      }
    };

    return (
      <div className="px-4 py-6 max-w-4xl mx-auto space-y-5">
        <div>
          <p className="text-[11px] font-medium tracking-[0.2em] uppercase text-[#999895]">
            DEVELOPER CONSOLE
          </p>
          <h1 className="mt-1 text-2xl font-bold text-[#F5F5F3]">Versões</h1>
        </div>
        {banners}
        <form
          onSubmit={handleAddRelease}
          className="bg-[#11100E] border border-[#1C1B18] rounded-2xl p-4 space-y-3"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <input
              type="text"
              value={relVersion}
              onChange={(e) => setRelVersion(e.target.value)}
              required
              placeholder="Versão (ex: v1.1.0)"
              className="px-3 py-2 rounded-xl bg-[#080807] border border-[#1C1B18] text-sm text-[#F5F5F3]"
            />
            <input
              type="text"
              value={relTitle}
              onChange={(e) => setRelTitle(e.target.value)}
              required
              placeholder="Título da publicação"
              className="px-3 py-2 rounded-xl bg-[#080807] border border-[#1C1B18] text-sm text-[#F5F5F3]"
            />
          </div>
          <textarea
            value={relNotes}
            onChange={(e) => setRelNotes(e.target.value)}
            required
            rows={2}
            placeholder="Notas de alteração"
            className="w-full px-3 py-2 rounded-xl bg-[#080807] border border-[#1C1B18] text-sm text-[#F5F5F3]"
          />
          <button
            type="submit"
            disabled={busy}
            className="px-4 py-2 rounded-xl bg-[#D6B36A] text-[#080807] text-sm font-semibold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <GitBranch className="w-4 h-4" />
            Registar versão
          </button>
        </form>
        <div className="bg-[#11100E] border border-[#1C1B18] rounded-2xl divide-y divide-[#1C1B18]">
          {releases.map((r) => (
            <div key={r.id} className="p-4">
              <p className="text-sm font-semibold text-[#F5F5F3]">
                <span className="font-mono text-[#D6B36A]">{r.version}</span> ·{' '}
                {r.title}
              </p>
              <p className="text-xs text-[#999895] mt-1">{r.notes}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // === BACKUPS ===
  if (activeSection === 'backups') {
    const handleTriggerBackup = async () => {
      try {
        setBusy(true);
        await apiFetch('/api/developer/backups', { method: 'POST' });
        showMsg('Snapshot lógico de verificação criado na base de dados.');
        await loadAll();
      } catch (err: any) {
        setError(err.message);
      } finally {
        setBusy(false);
      }
    };

    return (
      <div className="px-4 py-6 max-w-4xl mx-auto space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-medium tracking-[0.2em] uppercase text-[#999895]">
              DEVELOPER CONSOLE
            </p>
            <h1 className="mt-1 text-2xl font-bold text-[#F5F5F3]">Backups</h1>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={handleTriggerBackup}
            className="px-4 py-2 rounded-xl bg-[#D6B36A] text-[#080807] text-sm font-semibold inline-flex items-center gap-2 cursor-pointer disabled:opacity-60"
          >
            <DatabaseBackup className="w-4 h-4" />
            {busy ? 'A executar...' : 'Criar snapshot'}
          </button>
        </div>
        {banners}
        <div className="bg-[#11100E] border border-[#1C1B18] rounded-2xl divide-y divide-[#1C1B18]">
          {backups.length === 0 ? (
            <p className="p-4 text-sm text-[#999895]">
              Nenhum snapshot registado ainda.
            </p>
          ) : (
            backups.map((b) => (
              <div key={b.id} className="p-4">
                <p className="text-xs font-mono text-[#55B88A]">{b.status}</p>
                <p className="text-sm text-[#F5F5F3] mt-1">{b.summary}</p>
                <p className="text-[11px] text-[#999895] mt-1">
                  {new Date(b.createdAt).toLocaleString('pt-PT')}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  // === CUSTOS TÉCNICOS ===
  if (activeSection === 'custos') {
    return (
      <div className="px-4 py-6 max-w-4xl mx-auto space-y-5">
        <div>
          <p className="text-[11px] font-medium tracking-[0.2em] uppercase text-[#999895]">
            DEVELOPER CONSOLE
          </p>
          <h1 className="mt-1 text-2xl font-bold text-[#F5F5F3]">
            Custos técnicos
          </h1>
          <p className="mt-1 text-xs text-[#999895]">
            Consumo real de IA registado. Valores monetários requerem integração de faturação.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3.5">
          <div className="bg-[#11100E] border border-[#1C1B18] rounded-2xl p-4">
            <span className="text-xs text-[#999895]">Requisições IA</span>
            <p className="text-2xl font-bold text-[#F5F5F3] mt-2">
              {costs?.totalRequests || 0}
            </p>
          </div>
          <div className="bg-[#11100E] border border-[#1C1B18] rounded-2xl p-4">
            <span className="text-xs text-[#999895] flex items-center gap-1.5">
              <Coins className="w-3.5 h-3.5 text-[#D6B36A]" />
              Total de tokens
            </span>
            <p className="text-2xl font-bold text-[#D6B36A] mt-2">
              {costs?.totalTokens || 0}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // === CONFIGURAÇÕES AVANÇADAS ===
  if (activeSection === 'configuracoes') {
    const handleSaveCfg = async (e: React.FormEvent) => {
      e.preventDefault();
      try {
        setBusy(true);
        await apiFetch('/api/developer/config', {
          method: 'PATCH',
          body: JSON.stringify({ key: cfgKey, value: cfgVal }),
        });
        setCfgKey('');
        setCfgVal('');
        showMsg('Configuração guardada.');
        await loadAll();
      } catch (err: any) {
        setError(err.message);
      } finally {
        setBusy(false);
      }
    };

    return (
      <div className="px-4 py-6 max-w-4xl mx-auto space-y-5">
        <div>
          <p className="text-[11px] font-medium tracking-[0.2em] uppercase text-[#999895]">
            DEVELOPER CONSOLE
          </p>
          <h1 className="mt-1 text-2xl font-bold text-[#F5F5F3]">
            Configurações avançadas
          </h1>
        </div>
        {banners}
        <form
          onSubmit={handleSaveCfg}
          className="bg-[#11100E] border border-[#1C1B18] rounded-2xl p-4 space-y-3"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <input
              type="text"
              value={cfgKey}
              onChange={(e) => setCfgKey(e.target.value)}
              required
              placeholder="Chave (ex: maintenance_mode)"
              className="px-3 py-2 rounded-xl bg-[#080807] border border-[#1C1B18] text-sm text-[#F5F5F3]"
            />
            <input
              type="text"
              value={cfgVal}
              onChange={(e) => setCfgVal(e.target.value)}
              required
              placeholder="Valor (ex: false)"
              className="px-3 py-2 rounded-xl bg-[#080807] border border-[#1C1B18] text-sm text-[#F5F5F3]"
            />
          </div>
          <button
            type="submit"
            disabled={busy}
            className="px-4 py-2 rounded-xl bg-[#D6B36A] text-[#080807] text-sm font-semibold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <SlidersHorizontal className="w-4 h-4" />
            Guardar parâmetro
          </button>
        </form>
        <div className="bg-[#11100E] border border-[#1C1B18] rounded-2xl divide-y divide-[#1C1B18]">
          {configs.map((c) => (
            <div
              key={c.key}
              className="p-4 flex items-center justify-between text-xs"
            >
              <span className="font-mono text-[#D6B36A]">{c.key}</span>
              <span className="font-mono text-[#F5F5F3]">{c.value}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // === LOGS / AUDITORIA / SEGURANÇA ===
  if (
    (activeSection === 'logs' ||
      activeSection === 'auditoria' ||
      activeSection === 'seguranca') &&
    overview
  ) {
    const filteredLogs = overview.auditLogs.filter((l) => {
      const matchEnv =
        logEnvFilter === 'ALL' || l.environment === logEnvFilter;
      const matchText =
        !logSearch.trim() ||
        l.action.toLowerCase().includes(logSearch.toLowerCase()) ||
        (l.details || '').toLowerCase().includes(logSearch.toLowerCase()) ||
        (l.actorEmail || '').toLowerCase().includes(logSearch.toLowerCase());
      return matchEnv && matchText;
    });

    return (
      <div className="px-4 py-6 max-w-4xl mx-auto space-y-5">
        <div>
          <p className="text-[11px] font-medium tracking-[0.2em] uppercase text-[#999895]">
            DEVELOPER CONSOLE
          </p>
          <h1 className="mt-1 text-2xl font-bold text-[#F5F5F3]">
            {activeSection === 'seguranca'
              ? 'Segurança'
              : activeSection === 'auditoria'
                ? 'Auditoria técnica'
                : 'Logs e depuração'}
          </h1>
        </div>

        {activeSection === 'seguranca' && (
          <div className="space-y-3">
            {overview.securityPolicies.map((p) => (
              <div
                key={p.id}
                className="bg-[#11100E] border border-[#1C1B18] rounded-2xl p-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-[#F5F5F3] flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#D6B36A]" />
                    {p.name}
                  </span>
                  {renderStatusPill('OPERACIONAL')}
                </div>
                <p className="mt-2 text-xs text-[#999895]">{p.description}</p>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#999895] absolute left-3.5 top-3" />
            <input
              type="text"
              value={logSearch}
              onChange={(e) => setLogSearch(e.target.value)}
              placeholder="Pesquisar ação, detalhe ou email..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#11100E] border border-[#1C1B18] text-sm text-[#F5F5F3]"
            />
          </div>
          <select
            value={logEnvFilter}
            onChange={(e) => setLogEnvFilter(e.target.value)}
            className="px-3.5 py-2.5 rounded-xl bg-[#11100E] border border-[#1C1B18] text-sm text-[#F5F5F3]"
          >
            <option value="ALL">Todos os ambientes</option>
            <option value="AUTH">AUTH</option>
            <option value="CLIENT">CLIENT</option>
            <option value="MASTER">MASTER</option>
            <option value="DEVELOPER">DEVELOPER</option>
          </select>
        </div>

        <div className="bg-[#11100E] border border-[#1C1B18] rounded-2xl divide-y divide-[#1C1B18]">
          {filteredLogs.length === 0 ? (
            <p className="p-5 text-sm text-[#999895]">Sem registos.</p>
          ) : (
            filteredLogs.map((log) => (
              <div key={log.id} className="p-4 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs text-[#D6B36A]">
                    {log.action}
                  </span>
                  <span className="font-mono text-[11px] text-[#999895]">
                    {log.environment}
                  </span>
                </div>
                <p className="text-xs text-[#F5F5F3]">{log.details || '—'}</p>
                <p className="text-[11px] text-[#999895]">
                  {log.actorEmail || 'Sistema'} ·{' '}
                  {new Date(log.createdAt).toLocaleString('pt-PT')}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  // === ESTADO DO SISTEMA / INFRAESTRUTURA / AGENTES (Reference Image 3) ===
  return (
    <div className="px-4 py-6 max-w-4xl mx-auto space-y-5">
      <div>
        <p className="text-[11px] font-medium tracking-[0.2em] uppercase text-[#999895]">
          DEVELOPER CONSOLE
        </p>
        <h1 className="mt-1.5 text-[28px] font-bold text-[#F5F5F3] leading-tight tracking-tight">
          Estado do sistema
        </h1>
        <p className="mt-1.5 text-sm text-[#999895]">
          Verificações reais executadas agora no servidor.
        </p>

        <button
          type="button"
          onClick={loadAll}
          disabled={checking}
          className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#11100E] hover:bg-[#1C1B18] border border-[#26241F] text-sm font-medium text-[#F5F5F3] transition cursor-pointer disabled:opacity-60"
        >
          <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
          Verificar
        </button>
      </div>

      {banners}

      {health && (
        <>
          <div className="space-y-3.5">
            <div className="bg-[#11100E] border border-[#1C1B18] rounded-2xl p-5">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-[15px] font-semibold text-[#F5F5F3]">
                  Backend (servidor)
                </h2>
                {renderStatusPill(health.services.backend.status)}
              </div>
              <p className="mt-3 font-mono text-xs text-[#999895]">
                {health.services.backend.latencyMs} ms
              </p>
              <p className="mt-1.5 text-xs text-[#999895]">
                {health.services.backend.message}
              </p>
            </div>

            <div className="bg-[#11100E] border border-[#1C1B18] rounded-2xl p-5">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-[15px] font-semibold text-[#F5F5F3]">
                  Base de dados
                </h2>
                {renderStatusPill(health.services.database.status)}
              </div>
              <p className="mt-3 font-mono text-xs text-[#999895]">
                {health.services.database.latencyMs} ms
              </p>
              <p className="mt-1.5 text-xs text-[#999895]">
                {health.services.database.message}
              </p>
            </div>

            <div className="bg-[#11100E] border border-[#1C1B18] rounded-2xl p-5">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-[15px] font-semibold text-[#F5F5F3]">
                  Autenticação
                </h2>
                {renderStatusPill(health.services.auth.status)}
              </div>
              <p className="mt-3 font-mono text-xs text-[#999895]">
                {health.services.auth.latencyMs} ms
              </p>
              <p className="mt-1.5 text-xs text-[#999895]">
                {health.services.auth.message}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            <div className="bg-[#11100E] border border-[#1C1B18] rounded-2xl p-4 min-h-[116px] flex flex-col justify-between">
              <span className="text-xs text-[#999895]">
                Erros nas últimas 24h
              </span>
              <p className="text-[28px] font-bold text-[#F5F5F3] leading-none mt-2">
                {health.errorsLast24h}
              </p>
            </div>

            <div className="bg-[#11100E] border border-[#1C1B18] rounded-2xl p-4 min-h-[116px] flex flex-col justify-between">
              <span className="text-xs text-[#999895]">Erros por resolver</span>
              <div>
                <p className="text-[28px] font-bold text-[#F5F5F3] leading-none mt-2">
                  {health.unresolvedErrors}
                </p>
                <p className="mt-2 text-[11px] text-[#999895]">
                  {health.unresolvedErrors === 0
                    ? 'Nada pendente'
                    : 'Requer atenção'}
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
