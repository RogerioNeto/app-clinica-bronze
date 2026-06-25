'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export interface Cliente {
  id: string;
  nome_completo: string;
  whatsapp: string;
  apelido?: string;
  created_at: string;
}

export interface Unidade {
  id: string;
  nome: string;
  endereco: string;
  telefone?: string;
  fachada_url?: string;
  instrucoes_acesso?: string;
  created_at: string;
}

export interface Procedimento {
  id: string;
  nome: string;
  preco: number;
  duracao_minutos: number;
  created_at: string;
}

export interface Produto {
  id: string;
  nome: string;
  preco_custo: number;
  preco_venda: number;
  estoque_atual: number;
  estoque_minimo: number;
  created_at: string;
}

export interface Agendamento {
  id: string;
  cliente_id: string;
  unidade_id: string;
  data_hora_inicio: string;
  data_hora_fim: string;
  valor_procedimentos: number;
  valor_sinal: number;
  status: 'AGUARDANDO_APROVACAO' | 'AGUARDANDO_SINAL' | 'CONFIRMADO' | 'CANCELADO' | 'CONCLUÍDO';
  created_at: string;
  clientes?: Cliente;
  unidades?: Unidade;
}

export interface FluxoCaixa {
  id: string;
  unidade_id?: string;
  tipo: 'entrada' | 'saida';
  valor: number;
  descricao: string;
  forma_pagamento?: 'pix' | 'cartao_credito' | 'cartao_debito' | 'dinheiro';
  agendamento_id?: string;
  fornecedor_id?: string;
  created_at: string;
}

export interface Anamnese {
  id: string;
  cliente_id: string;
  data_preenchimento: string;
  respostas: Record<string, unknown>;
  clientes?: Cliente;
}

export interface ComandaProduto {
  id: string;
  agendamento_id: string;
  produto_id: string;
  quantidade: number;
  preco_unitario: number;
  created_at: string;
  produtos?: Produto;
}

export interface Configuracao {
  id: string | null;
  chave_pix: string;
  dominio_app: string;
  whatsapp_instrucoes_bronze: string;
  whatsapp_instrucoes_unidade_imperador: string;
  whatsapp_instrucoes_unidade_limoeiro: string;
  permitir_domingo_agendamento: boolean;
}

export interface Fornecedor {
  id: string;
  nome: string;
  created_at: string;
}

export interface AgendamentoProcedimento {
  id: string;
  agendamento_id: string;
  procedimento_id: string;
  procedimentos?: { nome: string };
}

export function useAdminData() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null);

  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [procedimentos, setProcedimentos] = useState<Procedimento[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [historicoCaixa, setHistoricoCaixa] = useState<FluxoCaixa[]>([]);
  const [anamnesesRecentes, setAnamnesesRecentes] = useState<Anamnese[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [agendamentoProcedimentos, setAgendamentoProcedimentos] = useState<AgendamentoProcedimento[]>([]);
  const [itensConsumidos, setItensConsumidos] = useState<ComandaProduto[]>([]);

  const [configSet, setConfigSet] = useState<Configuracao>({
    id: null, chave_pix: '', dominio_app: '',
    whatsapp_instrucoes_bronze: '', whatsapp_instrucoes_unidade_imperador: '',
    whatsapp_instrucoes_unidade_limoeiro: '', permitir_domingo_agendamento: false,
  });

  const isOwner = userEmail === 'supervisaodepostos@gmail.com';

  const buscarDadosGerais = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/login'); return; }
    setUserEmail(user.email || null);

    const fetchConfig = async () => {
      try {
        const { data: list } = await supabase.from('configuracoes').select('*');
        if (list && list.length > 0) {
          setConfigSet({
            id: list[0].id,
            chave_pix: list[0].chave_pix || '',
            dominio_app: list[0].dominio_app || '',
            whatsapp_instrucoes_bronze: list[0].whatsapp_instrucoes_bronze || '',
            whatsapp_instrucoes_unidade_imperador: list[0].whatsapp_instrucoes_unidade_imperador || '',
            whatsapp_instrucoes_unidade_limoeiro: list[0].whatsapp_instrucoes_unidade_limoeiro || '',
            permitir_domingo_agendamento: list[0].permitir_domingo_agendamento || false,
          });
        }
      } catch (err) { console.error("Erro ao buscar configurações:", err); }
    };

    const fetchSafe = async (fn: () => Promise<unknown>, label: string) => {
      try { await fn(); } catch (err) { console.error(`Erro ao buscar ${label}:`, err); }
    };

    await Promise.all([
      fetchConfig(),
      fetchSafe(async () => {
        const { data } = await supabase.from('agendamentos').select('*, clientes(nome_completo, whatsapp), unidades(nome, endereco, fachada_url, instrucoes_acesso)').order('created_at', { ascending: false });
        if (data) setAgendamentos(data);
      }, 'agendamentos'),
      fetchSafe(async () => {
        const { data } = await supabase.from('unidades').select('*');
        if (data) setUnidades(data);
      }, 'unidades'),
      fetchSafe(async () => {
        const { data } = await supabase.from('procedimentos').select('*');
        if (data) setProcedimentos(data);
      }, 'procedimentos'),
      fetchSafe(async () => {
        const { data } = await supabase.from('produtos').select('*').order('nome', { ascending: true });
        if (data) setProdutos(data);
      }, 'produtos'),
      fetchSafe(async () => {
        const { data } = await supabase.from('fluxo_caixa').select('*').order('created_at', { ascending: false });
        if (data) setHistoricoCaixa(data);
      }, 'fluxo_caixa'),
      fetchSafe(async () => {
        const { data } = await supabase.from('anamneses').select('*, clientes(nome_completo, whatsapp)').order('data_preenchimento', { ascending: false });
        if (data) setAnamnesesRecentes(data);
      }, 'anamneses'),
      fetchSafe(async () => {
        const { data } = await supabase.from('fornecedores').select('*');
        if (data) setFornecedores(data.sort((a, b) => a.nome.localeCompare(b.nome)));
      }, 'fornecedores'),
      fetchSafe(async () => {
        const { data } = await supabase.from('clientes').select('*').order('nome_completo', { ascending: true });
        if (data) setClientes(data);
      }, 'clientes'),
      fetchSafe(async () => {
        const { data } = await supabase.from('agendamento_procedimentos').select('*, procedimentos(nome)');
        if (data) setAgendamentoProcedimentos(data);
      }, 'agendamento_procedimentos'),
    ]);
  }, [router]);

  const carregarItensComanda = useCallback(async (agendamentoId: string | null) => {
    if (!agendamentoId) { setItensConsumidos([]); return; }
    const { data } = await supabase.from('comanda_produtos').select('*, produtos(nome)').eq('agendamento_id', agendamentoId);
    if (data) setItensConsumidos(data);
  }, []);

  useEffect(() => { buscarDadosGerais(); }, [buscarDadosGerais]);

  const obterFaturamentoPorMetodo = useCallback(() => {
    let pix = 0, credito = 0, debito = 0, dinheiro = 0;
    historicoCaixa.filter(c => c.tipo === 'entrada').forEach((item) => {
      if (item.forma_pagamento === 'pix') pix += Number(item.valor);
      else if (item.forma_pagamento === 'cartao_credito') credito += Number(item.valor);
      else if (item.forma_pagamento === 'cartao_debito') debito += Number(item.valor);
      else if (item.forma_pagamento === 'dinheiro') dinheiro += Number(item.valor);
    });
    return { pix, credito, debito, dinheiro };
  }, [historicoCaixa]);

  return {
    // State
    userEmail, agendamentos, unidades, procedimentos, produtos,
    historicoCaixa, anamnesesRecentes, clientes, fornecedores,
    agendamentoProcedimentos, itensConsumidos, configSet, isOwner,
    // Setters
    setConfigSet, setClientes, setItensConsumidos,
    // Actions
    buscarDadosGerais, carregarItensComanda, obterFaturamentoPorMetodo,
    setFornecedores, setAgendamentoProcedimentos,
  };
}
