import React, { useState } from 'react';
import { X, KeyRound, CheckCircle2, AlertCircle, LogIn, UserPlus } from 'lucide-react';
import { authService, ApiService } from '../../services';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onAuthSuccess,
}) => {
  const [mode, setMode] = useState<'LOGIN' | 'REGISTRO' | 'TOKEN'>('LOGIN');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [nome, setNome] = useState('');
  const [customToken, setCustomToken] = useState(ApiService.getToken() || '');
  const [statusMsg, setStatusMsg] = useState<{ text: string; error?: boolean } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setStatusMsg(null);

    const res = await authService.login({ email, senha });
    setIsLoading(false);

    if (res?.accessToken) {
      setStatusMsg({ text: 'Autenticado com sucesso via JWT!' });
      if (onAuthSuccess) onAuthSuccess();
      setTimeout(onClose, 1200);
    } else {
      setStatusMsg({
        text: 'Não foi possível conectar à API Spring Boot. Verifique se o backend está rodando em localhost:8080.',
        error: true,
      });
    }
  };

  const handleSaveToken = () => {
    if (customToken.trim()) {
      ApiService.setToken(customToken.trim());
      setStatusMsg({ text: 'Token JWT salvo no armazenamento local!' });
      if (onAuthSuccess) onAuthSuccess();
      setTimeout(onClose, 1000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
          <div className="flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-indigo-400" />
            <h2 className="text-sm font-semibold text-zinc-100">
              Autenticação & Conexão Backend
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-zinc-500 hover:text-zinc-200 rounded-lg hover:bg-zinc-900"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex bg-zinc-900 p-1 rounded-xl border border-zinc-800 text-xs font-medium">
          <button
            onClick={() => setMode('LOGIN')}
            className={`flex-1 py-1.5 rounded-lg transition-all ${
              mode === 'LOGIN' ? 'bg-zinc-800 text-zinc-100 shadow-sm' : 'text-zinc-400'
            }`}
          >
            Entrar (Login)
          </button>
          <button
            onClick={() => setMode('REGISTRO')}
            className={`flex-1 py-1.5 rounded-lg transition-all ${
              mode === 'REGISTRO' ? 'bg-zinc-800 text-zinc-100 shadow-sm' : 'text-zinc-400'
            }`}
          >
            Cadastrar
          </button>
          <button
            onClick={() => setMode('TOKEN')}
            className={`flex-1 py-1.5 rounded-lg transition-all ${
              mode === 'TOKEN' ? 'bg-zinc-800 text-zinc-100 shadow-sm' : 'text-zinc-400'
            }`}
          >
            Token JWT Direto
          </button>
        </div>

        {/* Status Message */}
        {statusMsg && (
          <div
            className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
              statusMsg.error
                ? 'bg-red-950/30 border-red-500/30 text-red-300'
                : 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300'
            }`}
          >
            {statusMsg.error ? (
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            ) : (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            )}
            <span>{statusMsg.text}</span>
          </div>
        )}

        {/* Form */}
        {mode === 'LOGIN' && (
          <form onSubmit={handleLogin} className="space-y-3">
            <div>
              <label className="text-xs text-zinc-400 block mb-1">E-mail</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="usuario@skillnapse.com"
                className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-100 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-400 block mb-1">Senha</label>
              <input
                type="password"
                required
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-100 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all mt-4"
            >
              <LogIn className="w-3.5 h-3.5" />
              {isLoading ? 'Autenticando...' : 'Entrar com JWT'}
            </button>
          </form>
        )}

        {mode === 'REGISTRO' && (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setIsLoading(true);
              setStatusMsg(null);
              const res = await authService.registrar({ nome, email, senha });
              setIsLoading(false);
              if (res) {
                setStatusMsg({ text: 'Usuário registrado com sucesso! Agora faça login.' });
                setMode('LOGIN');
              } else {
                setStatusMsg({ text: 'Erro ao cadastrar usuário na API.', error: true });
              }
            }}
            className="space-y-3"
          >
            <div>
              <label className="text-xs text-zinc-400 block mb-1">Nome Completo</label>
              <input
                type="text"
                required
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Carlos Silva"
                className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-100 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-400 block mb-1">E-mail</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="usuario@skillnapse.com"
                className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-100 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-400 block mb-1">Senha</label>
              <input
                type="password"
                required
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-100 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all mt-4"
            >
              <UserPlus className="w-3.5 h-3.5" />
              {isLoading ? 'Cadastrando...' : 'Criar Conta'}
            </button>
          </form>
        )}

        {mode === 'TOKEN' && (
          <div className="space-y-3">
            <p className="text-xs text-zinc-400">
              Cole aqui o token retornado pelo Swagger UI ou Postman para testar requisições autenticadas diretamente:
            </p>
            <textarea
              rows={3}
              value={customToken}
              onChange={(e) => setCustomToken(e.target.value)}
              placeholder="eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
              className="w-full p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs font-mono text-zinc-200 focus:outline-none focus:border-indigo-500"
            />
            <button
              type="button"
              onClick={handleSaveToken}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all"
            >
              Salvar Access Token
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
