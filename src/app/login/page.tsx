'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Lock, Mail, Sun, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const router = useRouter();

  const lidarComLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setCarregando(true);
    setErro('');

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: senha,
      });

      if (error) {
        setErro('E-mail ou senha incorretos. Verifique os dados.');
        console.error('Erro de autenticação:', error.message);
      } else if (data?.user) {
        console.log('✅ Usuário logado com sucesso:', data.user.email);
        router.push('/admin'); // Manda para o painel administrativo
      }
    } catch (err) {
      setErro('Ocorreu um erro inesperado ao tentar fazer login.');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl p-8 shadow-2xl space-y-6">
        
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 bg-amber-500/10 rounded-full text-amber-500">
            <Sun size={32} className="animate-spin-slow" />
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
            Feita de Bronze
          </h1>
          <p className="text-xs text-neutral-400">Painel de Gestão e Segurança</p>
        </div>

        {erro && (
          <div className="bg-red-950/50 border border-red-800 text-red-400 p-3 rounded-lg text-xs text-center font-medium">
            {erro}
          </div>
        )}

        <form onSubmit={lidarComLogin} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs text-neutral-400 font-medium block">E-mail Corporativo</label>
            <div className="relative">
              <Mail className="absolute left-3 top-3.5 text-neutral-500" size={16} />
              <input
                type="email"
                required
                placeholder="seu-email@exemplo.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-amber-500 text-white placeholder-neutral-600"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-neutral-400 font-medium block">Senha de Acesso</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3.5 text-neutral-500" size={16} />
              <input
                type={mostrarSenha ? 'text' : 'password'}
                required
                placeholder="••••••••"
                value={senha}
                onChange={e => setSenha(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg py-3 pl-10 pr-10 text-sm focus:outline-none focus:border-amber-500 text-white placeholder-neutral-600"
              />
              <button
                type="button"
                onClick={() => setMostrarSenha(!mostrarSenha)}
                className="absolute right-3 top-3 text-neutral-500 hover:text-neutral-300"
                tabIndex={-1}
              >
                {mostrarSenha ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={carregando}
            className="w-full bg-gradient-to-r from-amber-500 to-orange-600 font-bold py-3.5 rounded-xl text-sm text-black transition hover:brightness-110 disabled:opacity-40"
          >
            {carregando ? 'Verificando credenciais...' : 'Entrar no Painel'}
          </button>
        </form>

      </div>
    </div>
  );
}
