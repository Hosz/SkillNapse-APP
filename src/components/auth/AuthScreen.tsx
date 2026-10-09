import React, { useState } from 'react';
import {
  Sparkles,
  Lock,
  Mail,
  User,
  ArrowRight,
  ShieldCheck,
  Target,
  Sun,
  Moon,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { authService } from '../../services';
import { useTheme } from '../../context/useTheme';

interface AuthScreenProps {
  onAuthSuccess: () => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthSuccess }) => {
  const [mode, setMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [nome, setNome] = useState('');
  const [confirmSenha, setConfirmSenha] = useState('');
  const [cargoAlvo, setCargoAlvo] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const { theme, toggleTheme } = useTheme();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      const res = await authService.login({ email, senha });
      if (res?.accessToken) {
        setSuccessMsg('Autenticado com sucesso! Carregando painel...');
        setTimeout(() => {
          onAuthSuccess();
        }, 600);
      } else {
        // Fallback demo login se servidor não retornou
        onAuthSuccess();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha na autenticação';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (senha !== confirmSenha) {
      setErrorMsg('As senhas informadas não coincidem.');
      return;
    }
    if (senha.length < 6) {
      setErrorMsg('A senha deve conter pelo menos 6 caracteres.');
      return;
    }

    setLoading(true);
    try {
      const res = await authService.register({
        nome,
        email,
        senha,
      });
      if (res?.accessToken) {
        setSuccessMsg('Conta criada e autenticada com sucesso!');
        setTimeout(() => {
          onAuthSuccess();
        }, 700);
      } else {
        onAuthSuccess();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao cadastrar usuário';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleDemoAccess = () => {
    localStorage.setItem('skillnapse_user', JSON.stringify({ email: 'demo@skillnapse.ai', nome: 'Estudante Demo' }));
    onAuthSuccess();
  };

  return (
    <div className="min-h-screen w-screen flex flex-col justify-between bg-zinc-950 text-zinc-100 font-sans select-none relative overflow-hidden">
      {/* Decorative background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-gradient-to-b from-indigo-600/15 via-violet-600/5 to-transparent blur-3xl pointer-events-none" />

      {/* Top Bar with Brand & Theme Toggle */}
      <header className="h-16 px-6 sm:px-10 flex items-center justify-between border-b border-zinc-800 z-10 bg-zinc-950/60 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="font-bold text-zinc-100 text-sm tracking-tight flex items-center gap-2">
              SkillNapse
              <span className="text-[10px] font-mono uppercase bg-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded border border-indigo-500/30">
                PRO
              </span>
            </div>
            <div className="text-[11px] text-zinc-400 font-mono">Ecossistema Kyofuse</div>
          </div>
        </div>

        <button
          type="button"
          onClick={toggleTheme}
          className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200 transition-all flex items-center gap-2 text-xs"
          title="Alternar entre Tema Escuro e Tema Branco"
        >
          {theme === 'dark' ? (
            <>
              <Sun className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">Tema Branco</span>
            </>
          ) : (
            <>
              <Moon className="w-4 h-4 text-indigo-400" />
              <span className="hidden sm:inline">Tema Escuro</span>
            </>
          )}
        </button>
      </header>

      {/* Main Auth Card Area */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 z-10">
        <div className="w-full max-w-md rounded-2xl bg-zinc-900/80 border border-zinc-800 shadow-2xl p-6 sm:p-8 space-y-6 backdrop-blur-xl">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-100">
              {mode === 'LOGIN' ? 'Acesse seu Plano de Estudos' : 'Crie sua Conta no SkillNapse'}
            </h1>
            <p className="text-xs text-zinc-400 font-sans max-w-xs mx-auto">
              {mode === 'LOGIN'
                ? 'Entre com suas credenciais para sincronizar sessões, simulados e cronograma.'
                : 'Comece a dominar o edital com algoritmos SRS, horas líquidas e IA adaptativa.'}
            </p>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="grid grid-cols-2 p-1 rounded-xl bg-zinc-950 border border-zinc-800">
            <button
              type="button"
              onClick={() => {
                setMode('LOGIN');
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                mode === 'LOGIN'
                  ? 'bg-zinc-800 text-zinc-100 shadow-sm border border-zinc-700/80'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Entrar na Conta
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('REGISTER');
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                mode === 'REGISTER'
                  ? 'bg-zinc-800 text-zinc-100 shadow-sm border border-zinc-700/80'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Criar Nova Conta
            </button>
          </div>

          {/* Messages */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Form */}
          {mode === 'LOGIN' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">
                  E-mail do Estudante
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="estudante@dominio.com"
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-sans"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">
                  Senha
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-mono"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-600/20 cursor-pointer"
              >
                {loading ? 'Entrando...' : 'Entrar no SkillNapse'}
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-3.5">
              <div className="space-y-1.5">
                <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">
                  Nome Completo
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Seu Nome Completo"
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-sans"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">
                  E-mail
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu.email@exemplo.com"
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-sans"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">
                  Cargo Alvo / Concurso (Opcional)
                </label>
                <div className="relative">
                  <Target className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={cargoAlvo}
                    onChange={(e) => setCargoAlvo(e.target.value)}
                    placeholder="Ex: Auditor Fiscal, Perito PF, Analista Judiciário"
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-sans"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">
                    Senha
                  </label>
                  <input
                    type="password"
                    required
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    placeholder="Min 6 dígitos"
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">
                    Confirmar Senha
                  </label>
                  <input
                    type="password"
                    required
                    value={confirmSenha}
                    onChange={(e) => setConfirmSenha(e.target.value)}
                    placeholder="Repita a senha"
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-mono"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-600/20 cursor-pointer"
              >
                {loading ? 'Criando Conta...' : 'Cadastrar e Acessar'}
                <ShieldCheck className="w-3.5 h-3.5" />
              </button>
            </form>
          )}

          {/* Quick Demo Option */}
          <div className="pt-2 border-t border-zinc-800/80">
            <button
              type="button"
              onClick={handleDemoAccess}
              className="w-full py-2 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800 text-xs font-medium transition-all"
            >
              Testar com Modo Convidado / Dados Locais
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="h-12 px-6 flex items-center justify-center text-[11px] text-zinc-500 font-mono border-t border-zinc-800 z-10">
        SkillNapse © 2026 • Padrão Arquitetural Kyofuse • API Spring Boot 3.4
      </footer>
    </div>
  );
};
