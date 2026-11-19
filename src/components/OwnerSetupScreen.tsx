import React, { useState } from 'react';
import { ShieldCheck, Building2, CheckCircle2, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { OrvexLogo } from './OrvexLogo.tsx';

export const OwnerSetupScreen: React.FC = () => {
  const { session, apiFetch, refreshSession, logout } = useAuth();
  const [organizationName, setOrganizationName] = useState('Dm evolution');
  const [organizationSector, setOrganizationSector] = useState(
    'Consultoria e Inteligência Comercial'
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organizationName.trim()) {
      setError('Indique o nome da organização inaugural.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await apiFetch('/api/setup/owner', {
        method: 'POST',
        body: JSON.stringify({
          organizationName: organizationName.trim(),
          organizationSector: organizationSector.trim(),
        }),
      });
      await refreshSession();
    } catch (err: any) {
      setError(err.message || 'Erro ao concluir a configuração inicial.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#080807] text-[#F5F5F3] flex flex-col justify-center items-center p-4 sm:p-6">
      <div className="w-full max-w-lg bg-[#11100E] border border-[#1C1B18] rounded-2xl p-6 sm:p-8">
        <div className="flex items-center justify-between pb-5 border-b border-[#1C1B18]">
          <OrvexLogo environmentLabel="CONFIGURAÇÃO INICIAL" />
          <button
            type="button"
            onClick={logout}
            className="text-xs text-[#999895] hover:text-[#F5F5F3] flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#1C1B18] cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sair
          </button>
        </div>

        <div className="mt-6 flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#D6B36A]/10 border border-[#D6B36A]/30 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-4 h-4 text-[#D6B36A]" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-[#F5F5F3]">
              Ativação do OWNER (Uso Único)
            </h1>
            <p className="text-xs text-[#999895] mt-1 leading-relaxed">
              Esta conta assumirá o papel de proprietário global da ORVEX AI com acesso aos três ambientes.
            </p>
          </div>
        </div>

        <div className="mt-5 p-3.5 rounded-xl bg-[#080807] border border-[#1C1B18] text-sm">
          <p className="text-[11px] uppercase tracking-wider text-[#999895]">
            Conta Autenticada
          </p>
          <p className="mt-1 font-medium text-[#F5F5F3]">
            {session?.user.email}
          </p>
        </div>

        {error && (
          <div className="mt-4 p-3.5 rounded-xl bg-red-950/50 border border-red-900/60 text-sm text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#999895] mb-1.5">
              Organização Inaugural
            </label>
            <div className="relative">
              <Building2 className="w-4 h-4 text-[#D6B36A] absolute left-3.5 top-3" />
              <input
                type="text"
                value={organizationName}
                onChange={(e) => setOrganizationName(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#080807] border border-[#1C1B18] text-[#F5F5F3] text-sm focus:outline-none focus:border-[#D6B36A]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#999895] mb-1.5">
              Setor de Atividade
            </label>
            <input
              type="text"
              value={organizationSector}
              onChange={(e) => setOrganizationSector(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-[#080807] border border-[#1C1B18] text-[#F5F5F3] text-sm focus:outline-none focus:border-[#D6B36A]"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#D6B36A] hover:bg-[#B99A5C] disabled:opacity-60 text-[#080807] font-semibold text-sm transition cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            {submitting
              ? 'A inicializar...'
              : 'Confirmar OWNER e Inicializar ORVEX AI'}
          </button>
        </form>
      </div>
    </div>
  );
};
