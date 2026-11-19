import React from 'react';
import { ShieldCheck, Lock, Building2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { OrvexLogo } from './OrvexLogo.tsx';

export const AuthScreen: React.FC = () => {
  const { signInWithGoogle, authError } = useAuth();

  return (
    <div className="min-h-screen bg-[#080807] text-[#F5F5F3] flex flex-col justify-between p-5 sm:p-8">
      <header className="max-w-md w-full mx-auto pt-2 flex items-center justify-between">
        <OrvexLogo environmentLabel="ENTERPRISE SAAS PLATFORM" />
      </header>

      <main className="max-w-md w-full mx-auto my-10">
        <div className="bg-[#11100E] border border-[#1C1B18] rounded-2xl p-6 sm:p-8">
          <p className="text-[11px] font-medium tracking-[0.2em] uppercase text-[#999895]">
            ACESSO SEGURO
          </p>
          <h1 className="mt-2 text-2xl font-bold text-[#F5F5F3] tracking-tight">
            Entrar na ORVEX AI
          </h1>
          <p className="mt-2 text-sm text-[#999895] leading-relaxed">
            Autentique-se com a sua conta autorizada para aceder ao ambiente da sua organização.
          </p>

          {authError && (
            <div className="mt-5 p-3.5 rounded-xl bg-red-950/50 border border-red-900/60 text-sm text-red-300">
              {authError}
            </div>
          )}

          <button
            type="button"
            onClick={signInWithGoogle}
            className="mt-7 w-full flex items-center justify-center gap-3 px-4 py-3.5 rounded-xl bg-[#D6B36A] hover:bg-[#B99A5C] text-[#080807] font-semibold text-sm transition cursor-pointer"
          >
            <svg className="w-4 h-4 bg-white rounded-full p-0.5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continuar com Google
          </button>

          <div className="mt-7 pt-5 border-t border-[#1C1B18] grid grid-cols-3 gap-2 text-center">
            <div className="p-2.5 rounded-xl bg-[#080807] border border-[#1C1B18]">
              <Building2 className="w-4 h-4 text-[#D6B36A] mx-auto" />
              <p className="mt-1.5 text-[11px] text-[#999895]">Multi-Tenant</p>
            </div>
            <div className="p-2.5 rounded-xl bg-[#080807] border border-[#1C1B18]">
              <ShieldCheck className="w-4 h-4 text-[#D6B36A] mx-auto" />
              <p className="mt-1.5 text-[11px] text-[#999895]">RBAC Servidor</p>
            </div>
            <div className="p-2.5 rounded-xl bg-[#080807] border border-[#1C1B18]">
              <Lock className="w-4 h-4 text-[#D6B36A] mx-auto" />
              <p className="mt-1.5 text-[11px] text-[#999895]">Auditoria</p>
            </div>
          </div>
        </div>
      </main>

      <footer className="max-w-md w-full mx-auto text-center text-[11px] text-[#999895] pb-2">
        ORVEX AI · Enterprise SaaS Platform
      </footer>
    </div>
  );
};
