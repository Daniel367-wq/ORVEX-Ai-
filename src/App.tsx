import React, { useEffect, useState } from 'react';
import {
  LayoutGrid,
  Users,
  Bell,
  UserCog,
  Menu,
  X,
  Gauge,
  Building2,
  LifeBuoy,
  Activity,
  Plug,
  ScrollText,
  Shield,
  Bot,
  Radar,
  Server,
  FileSearch,
  GitBranch,
  DatabaseBackup,
  Coins,
  SlidersHorizontal,
  ArrowLeftRight,
  LogOut,
} from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { AuthScreen } from './components/AuthScreen.tsx';
import { OwnerSetupScreen } from './components/OwnerSetupScreen.tsx';
import {
  ClientWorkspace,
  ClientTab,
} from './components/ClientWorkspace.tsx';
import {
  MasterWorkspace,
  MasterTab,
} from './components/MasterWorkspace.tsx';
import {
  DeveloperWorkspace,
  DeveloperSection,
} from './components/DeveloperWorkspace.tsx';
import { OrvexLogo } from './components/OrvexLogo.tsx';
import { EnvironmentId } from './types/orvex.ts';

const OrvexShell: React.FC = () => {
  const { firebaseUser, session, loading, logout } = useAuth();
  const [activeEnv, setActiveEnv] = useState<EnvironmentId>('CLIENT');
  const [activeOrgId, setActiveOrgId] = useState<number | null>(null);
  const [clientTab, setClientTab] = useState<ClientTab>('inicio');
  const [masterTab, setMasterTab] = useState<MasterTab>('geral');
  const [devSection, setDevSection] = useState<DeveloperSection>('estado');
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (!session) return;

    if (session.memberships.length > 0) {
      setActiveOrgId((prev) =>
        prev && session.memberships.some((m) => m.organizationId === prev)
          ? prev
          : session.memberships[0].organizationId
      );
    }

    if (activeEnv === 'MASTER' && !session.environments.master) {
      setActiveEnv('CLIENT');
    } else if (activeEnv === 'DEVELOPER' && !session.environments.developer) {
      setActiveEnv('CLIENT');
    } else if (
      activeEnv === 'CLIENT' &&
      !session.environments.client &&
      session.environments.master
    ) {
      setActiveEnv('MASTER');
    }
  }, [session, activeEnv]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080807] flex flex-col items-center justify-center gap-3 text-[#999895] text-sm">
        <OrvexLogo environmentLabel="ENTERPRISE SAAS PLATFORM" />
        <span>A validar sessão segura...</span>
      </div>
    );
  }

  if (!firebaseUser || !session) {
    return <AuthScreen />;
  }

  if (!session.ownerInitialized) {
    return <OwnerSetupScreen />;
  }

  const isOwner = session.user.globalRole === 'OWNER';

  const envLabel =
    activeEnv === 'CLIENT'
      ? 'PAINEL DO CLIENTE'
      : activeEnv === 'MASTER'
        ? 'PAINEL MASTER'
        : 'DEVELOPER CONSOLE';

  const switchEnv = (env: EnvironmentId) => {
    setActiveEnv(env);
    setDrawerOpen(false);
  };

  const renderDrawerItem = (
    label: string,
    Icon: React.ComponentType<{ className?: string }>,
    active: boolean,
    onClick: () => void
  ) => (
    <button
      key={label}
      type="button"
      onClick={onClick}
      className={`w-full relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm transition cursor-pointer ${
        active
          ? 'bg-[#1C1B18] text-[#F5F5F3] font-medium'
          : 'text-[#999895] hover:text-[#F5F5F3] hover:bg-[#11100E]'
      }`}
    >
      {active && (
        <span className="w-1 h-6 rounded-r bg-[#D6B36A] absolute left-0 top-1/2 -translate-y-1/2" />
      )}
      <Icon
        className={`w-4 h-4 shrink-0 ${
          active ? 'text-[#F5F5F3]' : 'text-[#999895]'
        }`}
      />
      <span className="truncate">{label}</span>
    </button>
  );

  const drawerContent = (
    <div className="flex flex-col h-full bg-[#080807] text-[#F5F5F3]">
      {/* Drawer Header */}
      <div className="px-5 h-16 flex items-center justify-between border-b border-[#1C1B18] shrink-0">
        <OrvexLogo environmentLabel={envLabel} />
        <button
          type="button"
          onClick={() => setDrawerOpen(false)}
          className="lg:hidden w-8 h-8 rounded-lg border border-[#D6B36A]/60 flex items-center justify-center text-[#D6B36A] hover:bg-[#1C1B18] cursor-pointer"
          aria-label="Fechar menu"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Drawer Scrollable Menu */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
        {activeEnv === 'DEVELOPER' && (
          <>
            <div className="space-y-1">
              {renderDrawerItem(
                'Dashboard técnico',
                Activity,
                devSection === 'estado',
                () => {
                  setDevSection('estado');
                  setDrawerOpen(false);
                }
              )}
            </div>

            <div>
              <p className="px-3 mb-2 text-[10.5px] font-medium tracking-[0.2em] uppercase text-[#999895]">
                SERVIÇOS
              </p>
              <div className="space-y-1">
                {renderDrawerItem(
                  'APIs e integrações',
                  Plug,
                  devSection === 'apis',
                  () => {
                    setDevSection('apis');
                    setDrawerOpen(false);
                  }
                )}
                {renderDrawerItem(
                  'Agentes de IA',
                  Bot,
                  devSection === 'agentes',
                  () => {
                    setDevSection('agentes');
                    setDrawerOpen(false);
                  }
                )}
                {renderDrawerItem(
                  'Motor de prospeção',
                  Radar,
                  devSection === 'prospecao',
                  () => {
                    setDevSection('prospecao');
                    setDrawerOpen(false);
                  }
                )}
                {renderDrawerItem(
                  'Infraestrutura',
                  Server,
                  devSection === 'infraestrutura',
                  () => {
                    setDevSection('infraestrutura');
                    setDrawerOpen(false);
                  }
                )}
              </div>
            </div>

            <div>
              <p className="px-3 mb-2 text-[10.5px] font-medium tracking-[0.2em] uppercase text-[#999895]">
                OPERAÇÃO
              </p>
              <div className="space-y-1">
                {renderDrawerItem(
                  'Logs e depuração',
                  ScrollText,
                  devSection === 'logs',
                  () => {
                    setDevSection('logs');
                    setDrawerOpen(false);
                  }
                )}
                {renderDrawerItem(
                  'Segurança',
                  Shield,
                  devSection === 'seguranca',
                  () => {
                    setDevSection('seguranca');
                    setDrawerOpen(false);
                  }
                )}
                {renderDrawerItem(
                  'Auditoria técnica',
                  FileSearch,
                  devSection === 'auditoria',
                  () => {
                    setDevSection('auditoria');
                    setDrawerOpen(false);
                  }
                )}
                {renderDrawerItem(
                  'Versões',
                  GitBranch,
                  devSection === 'versoes',
                  () => {
                    setDevSection('versoes');
                    setDrawerOpen(false);
                  }
                )}
                {renderDrawerItem(
                  'Backups',
                  DatabaseBackup,
                  devSection === 'backups',
                  () => {
                    setDevSection('backups');
                    setDrawerOpen(false);
                  }
                )}
                {renderDrawerItem(
                  'Custos técnicos',
                  Coins,
                  devSection === 'custos',
                  () => {
                    setDevSection('custos');
                    setDrawerOpen(false);
                  }
                )}
                {renderDrawerItem(
                  'Configurações avançadas',
                  SlidersHorizontal,
                  devSection === 'configuracoes',
                  () => {
                    setDevSection('configuracoes');
                    setDrawerOpen(false);
                  }
                )}
              </div>
            </div>
          </>
        )}

        {activeEnv === 'CLIENT' && (
          <div className="space-y-1">
            {session.memberships.length > 1 && (
              <div className="px-1 pb-3">
                <label className="block text-[10px] uppercase tracking-[0.2em] text-[#999895] px-2 mb-1.5">
                  Organização
                </label>
                <select
                  value={activeOrgId ?? ''}
                  onChange={(e) => {
                    setActiveOrgId(Number(e.target.value));
                    setDrawerOpen(false);
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-[#11100E] border border-[#1C1B18] text-xs text-[#F5F5F3]"
                >
                  {session.memberships.map((m) => (
                    <option key={m.organizationId} value={m.organizationId}>
                      {m.organizationName}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {renderDrawerItem(
              'Visão geral',
              LayoutGrid,
              clientTab === 'inicio',
              () => {
                setClientTab('inicio');
                setDrawerOpen(false);
              }
            )}
            {renderDrawerItem('Equipa', Users, clientTab === 'equipa', () => {
              setClientTab('equipa');
              setDrawerOpen(false);
            })}
            {renderDrawerItem(
              'Produtos e serviços',
              Building2,
              clientTab === 'produtos',
              () => {
                setClientTab('produtos');
                setDrawerOpen(false);
              }
            )}
            {renderDrawerItem(
              'Agentes de IA',
              Bot,
              clientTab === 'ia',
              () => {
                setClientTab('ia');
                setDrawerOpen(false);
              }
            )}
            {renderDrawerItem('Alertas', Bell, clientTab === 'alertas', () => {
              setClientTab('alertas');
              setDrawerOpen(false);
            })}
            {renderDrawerItem('Conta', UserCog, clientTab === 'conta', () => {
              setClientTab('conta');
              setDrawerOpen(false);
            })}
          </div>
        )}

        {activeEnv === 'MASTER' && (
          <div className="space-y-1">
            {renderDrawerItem(
              'Visão geral',
              Gauge,
              masterTab === 'geral',
              () => {
                setMasterTab('geral');
                setDrawerOpen(false);
              }
            )}
            {renderDrawerItem(
              'Utilizadores',
              Users,
              masterTab === 'utilizadores',
              () => {
                setMasterTab('utilizadores');
                setDrawerOpen(false);
              }
            )}
            {renderDrawerItem(
              'Empresas',
              Building2,
              masterTab === 'empresas',
              () => {
                setMasterTab('empresas');
                setDrawerOpen(false);
              }
            )}
            {renderDrawerItem(
              'Suporte',
              LifeBuoy,
              masterTab === 'suporte',
              () => {
                setMasterTab('suporte');
                setDrawerOpen(false);
              }
            )}
            {renderDrawerItem(
              'Gestão de planos',
              Coins,
              masterTab === 'planos',
              () => {
                setMasterTab('planos');
                setDrawerOpen(false);
              }
            )}
          </div>
        )}

        {/* OUTRAS ÁREAS — Exclusivo OWNER */}
        {isOwner && (
          <div className="pt-4 border-t border-[#1C1B18]">
            <p className="px-3 mb-2 text-[10.5px] font-medium tracking-[0.2em] uppercase text-[#999895]">
              OUTRAS ÁREAS
            </p>
            <div className="space-y-1">
              {activeEnv !== 'CLIENT' &&
                session.environments.client &&
                renderDrawerItem('Painel do Cliente', ArrowLeftRight, false, () =>
                  switchEnv('CLIENT')
                )}
              {activeEnv !== 'MASTER' &&
                session.environments.master &&
                renderDrawerItem('Painel MASTER', ArrowLeftRight, false, () =>
                  switchEnv('MASTER')
                )}
              {activeEnv !== 'DEVELOPER' &&
                session.environments.developer &&
                renderDrawerItem(
                  'Developer Console',
                  ArrowLeftRight,
                  false,
                  () => switchEnv('DEVELOPER')
                )}
            </div>
          </div>
        )}
      </div>

      {/* Drawer Footer */}
      <div className="px-5 py-4 border-t border-[#1C1B18] flex items-center justify-between gap-2 shrink-0">
        <span className="text-xs text-[#999895] truncate">
          {session.user.email}
        </span>
        <button
          type="button"
          onClick={logout}
          title="Terminar sessão"
          className="p-2 rounded-lg text-[#999895] hover:text-[#F5F5F3] hover:bg-[#1C1B18] transition cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#080807] text-[#F5F5F3] flex flex-col lg:flex-row">
      {/* Desktop Fixed Sidebar */}
      <aside className="hidden lg:block w-72 border-r border-[#1C1B18] shrink-0 h-screen sticky top-0">
        {drawerContent}
      </aside>

      {/* Mobile Slide-Over Drawer (Reference Image 2) */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="w-[82%] max-w-xs h-full border-r border-[#1C1B18] shadow-2xl">
            {drawerContent}
          </div>
          <div
            className="flex-1 bg-black/70"
            onClick={() => setDrawerOpen(false)}
          />
        </div>
      )}

      {/* Main Column */}
      <div className="flex-1 min-w-0 flex flex-col min-h-screen">
        {/* Sticky Top Header */}
        <header className="sticky top-0 z-30 h-16 px-4 lg:px-6 bg-[#080807]/95 backdrop-blur border-b border-[#1C1B18] flex items-center justify-between">
          <div className="lg:hidden">
            <OrvexLogo environmentLabel={envLabel} />
          </div>
          <div className="hidden lg:flex items-center gap-2 text-xs text-[#999895] tracking-[0.18em] uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-[#D6B36A]" />
            {envLabel}
          </div>

          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="lg:hidden p-2 rounded-lg text-[#F5F5F3] hover:bg-[#1C1B18] cursor-pointer"
            aria-label="Abrir menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        </header>

        {/* Scrollable Content (with bottom padding for fixed mobile nav) */}
        <main className="flex-1 pb-24 lg:pb-10">
          {activeEnv === 'CLIENT' && activeOrgId ? (
            <ClientWorkspace
              organizationId={activeOrgId}
              activeTab={clientTab}
            />
          ) : activeEnv === 'MASTER' && session.environments.master ? (
            <MasterWorkspace activeTab={masterTab} />
          ) : activeEnv === 'DEVELOPER' && session.environments.developer ? (
            <DeveloperWorkspace activeSection={devSection} />
          ) : (
            <div className="px-4 py-12 max-w-md mx-auto text-center">
              <Building2 className="w-8 h-8 text-[#D6B36A] mx-auto" />
              <h2 className="mt-3 text-lg font-semibold text-[#F5F5F3]">
                Sem Organização Associada
              </h2>
              <p className="mt-2 text-sm text-[#999895]">
                A sua conta está autenticada, mas ainda não está vinculada a nenhuma organização na ORVEX AI.
              </p>
            </div>
          )}
        </main>

        {/* Fixed Bottom Navigation (Mobile — Exact 5 tabs per environment) */}
        <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-[#080807] border-t border-[#1C1B18] px-2 h-16 flex items-center justify-around">
          {activeEnv === 'CLIENT' && (
            <>
              {[
                { id: 'inicio', label: 'Início', icon: LayoutGrid },
                { id: 'equipa', label: 'Equipa', icon: Users },
                { id: 'alertas', label: 'Alertas', icon: Bell },
                { id: 'conta', label: 'Conta', icon: UserCog },
              ].map((t) => {
                const active = clientTab === t.id;
                const Icon = t.icon;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setClientTab(t.id as ClientTab)}
                    className={`flex flex-col items-center justify-center gap-1 flex-1 py-1.5 cursor-pointer ${
                      active ? 'text-[#D6B36A]' : 'text-[#999895]'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-[11px] font-medium">{t.label}</span>
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                className="flex flex-col items-center justify-center gap-1 flex-1 py-1.5 text-[#999895] cursor-pointer"
              >
                <Menu className="w-5 h-5" />
                <span className="text-[11px] font-medium">Mais</span>
              </button>
            </>
          )}

          {activeEnv === 'MASTER' && (
            <>
              {[
                { id: 'geral', label: 'Geral', icon: Gauge },
                { id: 'utilizadores', label: 'Utilizadores', icon: Users },
                { id: 'empresas', label: 'Empresas', icon: Building2 },
                { id: 'suporte', label: 'Suporte', icon: LifeBuoy },
              ].map((t) => {
                const active = masterTab === t.id;
                const Icon = t.icon;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setMasterTab(t.id as MasterTab)}
                    className={`flex flex-col items-center justify-center gap-1 flex-1 py-1.5 cursor-pointer ${
                      active ? 'text-[#D6B36A]' : 'text-[#999895]'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-[11px] font-medium">{t.label}</span>
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                className="flex flex-col items-center justify-center gap-1 flex-1 py-1.5 text-[#999895] cursor-pointer"
              >
                <Menu className="w-5 h-5" />
                <span className="text-[11px] font-medium">Mais</span>
              </button>
            </>
          )}

          {activeEnv === 'DEVELOPER' && (
            <>
              {[
                { id: 'estado', label: 'Estado', icon: Activity },
                { id: 'apis', label: 'APIs', icon: Plug },
                { id: 'logs', label: 'Logs', icon: ScrollText },
                { id: 'seguranca', label: 'Segurança', icon: Shield },
              ].map((t) => {
                const active = devSection === t.id;
                const Icon = t.icon;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setDevSection(t.id as DeveloperSection)}
                    className={`flex flex-col items-center justify-center gap-1 flex-1 py-1.5 cursor-pointer ${
                      active ? 'text-[#D6B36A]' : 'text-[#999895]'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-[11px] font-medium">{t.label}</span>
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                className="flex flex-col items-center justify-center gap-1 flex-1 py-1.5 text-[#999895] cursor-pointer"
              >
                <Menu className="w-5 h-5" />
                <span className="text-[11px] font-medium">Mais</span>
              </button>
            </>
          )}
        </nav>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <OrvexShell />
    </AuthProvider>
  );
}
