'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
  DollarSign, Calendar, Sliders, Check, X,
  ShoppingBag, ClipboardList, ArrowDownRight, MessageSquare, Printer, User
} from 'lucide-react';
import { ComandaPanel } from '@/components/admin/ComandaPanel';

// Interfaces for better type safety
interface Cliente {
  id: string;
  nome_completo: string;
  whatsapp: string;
  apelido?: string;
  created_at: string;
}

interface Unidade {
  id: string;
  nome: string;
  endereco: string;
  telefone?: string;
  fachada_url?: string;
  instrucoes_acesso?: string;
  created_at: string;
}

interface Procedimento {
  id: string;
  nome: string;
  preco: number;
  duracao_minutos: number;
  created_at: string;
}

interface Produto {
  id: string;
  nome: string;
  preco_custo: number;
  preco_venda: number;
  estoque_atual: number;
  estoque_minimo: number;
  created_at: string;
}

interface Agendamento {
  id: string;
  cliente_id: string;
  unidade_id: string;
  data_hora_inicio: string;
  data_hora_fim: string;
  valor_procedimentos: number;
  valor_sinal: number;
  status: 'AGUARDANDO_APROVACAO' | 'AGUARDANDO_SINAL' | 'CONFIRMADO' | 'CANCELADO' | 'CONCLUÍDO';
  created_at: string;
  clientes?: Cliente; // Joined relation
  unidades?: Unidade; // Joined relation
}

interface FluxoCaixa {
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

interface Anamnese {
  id: string;
  cliente_id: string;
  data_preenchimento: string;
  respostas: Record<string, any>; // JSONB field
  clientes?: Cliente; // Joined relation
}

interface ComandaProduto {
  id: string;
  agendamento_id: string;
  produto_id: string;
  quantidade: number;
  preco_unitario: number;
  created_at: string;
  produtos?: Produto; // Joined relation
}

interface Configuracao {
  id: string | null;
  chave_pix: string;
  dominio_app: string;
  whatsapp_instrucoes_bronze: string;
  whatsapp_instrucoes_unidade_imperador: string;
  whatsapp_instrucoes_unidade_limoeiro: string;
  permitir_domingo_agendamento: boolean;
  admin_whatsapp?: string;
}

interface Fornecedor {
  id: string;
  nome: string;
  created_at: string;
}

export default function AdminPage() {
  const router = useRouter();
  const [abaAtiva, setAbaAtiva] = useState('agendamentos');
  const [userEmail, setUserEmail] = useState<string | null>(null);

  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [procedimentos, setProcedimentos] = useState<Procedimento[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [historicoCaixa, setHistoricoCaixa] = useState<FluxoCaixa[]>([]);
  const [anamnesesRecentes, setAnamnesesRecentes] = useState<Anamnese[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);

  const [agendamentoProcedimentos, setAgendamentoProcedimentos] = useState<{
    id: string;
    agendamento_id: string;
    procedimento_id: string;
    procedimentos?: { nome: string };
  }[]>([]);
  const [clienteSendoEditado, setClienteSendoEditado] = useState<Cliente | null>(null);
  const [novaUnidade, setNovaUnidade] = useState({ nome: '', endereco: '', telefone: '' });
  const [novoProcedimento, setNovoProcedimento] = useState({ nome: '', preco: '', duracao: '60' });
  const [novoProduto, setNovoProduto] = useState({ nome: '', preco_custo: '', preco_venda: '', estoque_atual: '', estoque_minimo: '' });
  const [novaDespesa, setNovaDespesa] = useState({ descricao: '', valor: '', unidade_id: '' });
  const [fornecedorInput, setFornecedorInput] = useState('');

  // ESTADOS PARA CONFIGURAÇÕES GLOBAIS
  const [configSet, setConfigSet] = useState<Configuracao>({ id: null, chave_pix: '', dominio_app: '', whatsapp_instrucoes_bronze: '', whatsapp_instrucoes_unidade_imperador: '', whatsapp_instrucoes_unidade_limoeiro: '', permitir_domingo_agendamento: false, admin_whatsapp: '' });

  // Definição de permissão de proprietária
  const isOwner = userEmail === 'supervisaodepostos@gmail.com';

  const buscarDadosGerais = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/login'); return; }
    setUserEmail(user.email || null);

    // Busca Configurações
    try {
      const { data: listConfig, error: errConfig } = await supabase.from('configuracoes').select('*');
      if (errConfig) throw errConfig;
      if (listConfig && listConfig.length > 0) {
        setConfigSet({
          id: listConfig[0].id,
          chave_pix: listConfig[0].chave_pix || '',
          dominio_app: listConfig[0].dominio_app || '',
          whatsapp_instrucoes_bronze: listConfig[0].whatsapp_instrucoes_bronze || '',
          whatsapp_instrucoes_unidade_imperador: listConfig[0].whatsapp_instrucoes_unidade_imperador || '',
          whatsapp_instrucoes_unidade_limoeiro: listConfig[0].whatsapp_instrucoes_unidade_limoeiro || '',
          permitir_domingo_agendamento: listConfig[0].permitir_domingo_agendamento || false,
          admin_whatsapp: listConfig[0].admin_whatsapp || '',
        });
      }
    } catch (err) { console.error("Erro ao buscar configurações:", err); }

    // Busca Agendamentos
    try {
      const { data: listAgend, error: errAgend } = await supabase.from('agendamentos').select('*, clientes(nome_completo, whatsapp), unidades(nome, endereco, fachada_url, instrucoes_acesso)').order('created_at', { ascending: false });
      if (errAgend) throw errAgend;
      if (listAgend) setAgendamentos(listAgend);
    } catch (err) { console.error("Erro ao buscar agendamentos:", err); }

    // Busca Unidades
    try {
      const { data: listUnid, error: errUnid } = await supabase.from('unidades').select('*');
      if (errUnid) throw errUnid;
      if (listUnid) setUnidades(listUnid);
    } catch (err) { console.error("Erro ao buscar unidades:", err); }

    // Busca Procedimentos
    try {
      const { data: listProc, error: errProc } = await supabase.from('procedimentos').select('*');
      if (errProc) throw errProc;
      if (listProc) setProcedimentos(listProc);
    } catch (err) { console.error("Erro ao buscar procedimentos:", err); }

    // Busca Produtos
    try {
      const { data: listProd, error: errProd } = await supabase.from('produtos').select('*').order('nome', { ascending: true });
      if (errProd) throw errProd;
      if (listProd) setProdutos(listProd);
    } catch (err) { console.error("Erro ao buscar produtos:", err); }

    // Busca Histórico de Caixa
    try {
      const { data: listCaixa, error: errCaixa } = await supabase.from('fluxo_caixa').select('*').order('created_at', { ascending: false });
      if (errCaixa) throw errCaixa;
      if (listCaixa) setHistoricoCaixa(listCaixa);
    } catch (err) { console.error("Erro ao buscar histórico de caixa:", err); }

    // Busca Anamneses Recentes
    try {
      const { data: listAnamnese, error: errAnamnese } = await supabase.from('anamneses').select('*, clientes(nome_completo, whatsapp)').order('data_preenchimento', { ascending: false });
      if (errAnamnese) throw errAnamnese;
      if (listAnamnese) setAnamnesesRecentes(listAnamnese);
    } catch (err) { console.error("Erro ao buscar anamneses:", err); }

    // Busca Fornecedores
    try {
      const { data: listForn, error: errForn } = await supabase.from('fornecedores').select('*');
      if (errForn) throw errForn;
      if (listForn) setFornecedores(listForn.sort((a, b) => a.nome.localeCompare(b.nome)));
    } catch (err) { console.error("Erro ao buscar fornecedores:", err); }

    // Busca Clientes
    try {
      const { data: listCli, error: errCli } = await supabase.from('clientes').select('*').order('nome_completo', { ascending: true });
      if (errCli) throw errCli;
      if (listCli) setClientes(listCli);
    } catch (err) { console.error("Erro ao buscar clientes:", err); }

    // Busca Agendamento Procedimentos
    try {
      const { data: listAgendProcs, error: errAgendProcs } = await supabase.from('agendamento_procedimentos').select('*, procedimentos(nome)');
      if (errAgendProcs) throw errAgendProcs;
      if (listAgendProcs) setAgendamentoProcedimentos(listAgendProcs);
    } catch (err) { console.error("Erro ao buscar agendamento_procedimentos:", err); }
  };

  useEffect(() => { buscarDadosGerais(); }, []);

  // Segurança extra: impede acesso à aba financeira via estado se não for dono
  useEffect(() => {
    if (abaAtiva === 'financeiro' && userEmail && !isOwner) {
      setAbaAtiva('agendamentos');
    }
  }, [abaAtiva, userEmail, isOwner]);

  // FUNÇÃO UNIFICADA E BLINDADA PARA ALTERAR STATUS (APROVAR / RECUSAR)
  const alterarStatusAgendamento = async (id: string, novoStatus: string, valorSinal?: number, unidadeId?: string) => {
    try {
      console.log(`🚀 Solicitando alteração de status para: ${novoStatus} no ID: ${id}`);
      
      // 1. Registro Financeiro apenas na confirmação real do sinal
      if (novoStatus === 'CONFIRMADO' && valorSinal !== undefined && unidadeId) {
        const agRef = agendamentos.find(a => a.id === id);
        if (!agRef) return;
        
        // Validação Crítica: Bloqueia confirmação se não houver ficha de anamnese
        const { data: anamneseData, error: anamneseError } = await supabase
          .from('anamneses')
          .select('id')
          .eq('cliente_id', agRef.cliente_id)
          .limit(1);

        if (!anamneseData || anamneseData.length === 0) {
          alert("⚠️ BLOQUEIO DE SEGURANÇA: A cliente ainda não preencheu a ficha de anamnese digital. É obrigatório o preenchimento para confirmar o sinal.");
          return;
        }

        const { error: erroCaixa } = await supabase.from('fluxo_caixa').insert([{
          unidade_id: unidadeId,
          tipo: 'entrada',
          valor: valorSinal,
          descricao: `Sinal 50% - ${agRef.clientes?.nome_completo || 'Cliente'}`,
          forma_pagamento: "pix",
          agendamento_id: id
        }]);
        if (erroCaixa) {
          console.error("Erro ao registrar entrada de caixa:", erroCaixa);
          alert("Aviso: O sinal não pôde ser registrado no caixa, mas tentaremos atualizar o status.");
        }
      }

      // 2. Atualização de Status
      const { data: updateCheck, error: erroStatus } = await supabase
        .from('agendamentos')
        .update({ status: novoStatus })
        .eq('id', id)
        .select(); // Força o retorno do registro alterado

      if (erroStatus) throw erroStatus;
      
      if (!updateCheck || updateCheck.length === 0) {
        throw new Error("Nenhum agendamento foi encontrado com este ID para atualizar.");
      }

      // 3. Comunicação WhatsApp Automática com Instruções Dinâmicas por Unidade
      const agObj = agendamentos.find(a => a.id === id);
      if (agObj) {
        const fone = `55${agObj.clientes?.whatsapp?.replace(/\D/g, '')}`;
        let msg = "";
        const nomeCliente = agObj.clientes?.nome_completo?.split(' ')[0] || "Cliente";

        const baseDom = configSet.dominio_app || window.location.origin;
        const linkAnamnese = `${baseDom}/anamnese?id=${id}`;

        let instrucoesUnidade = ''; // Captura instruções dinâmicas conforme unidade selecionada
        if (agObj.unidades?.nome) {
          if (agObj.unidades.nome.toLowerCase().includes('imperador')) {
            instrucoesUnidade = configSet.whatsapp_instrucoes_unidade_imperador;
          } else if (agObj.unidades.nome.toLowerCase().includes('limoeiro')) {
            instrucoesUnidade = configSet.whatsapp_instrucoes_unidade_limoeiro;
          }
        }

        // Validação de Ficha para Alerta na Mensagem
        const { data: anamneseCheck } = await supabase.from('anamneses').select('id').eq('cliente_id', agObj.cliente_id).limit(1);
        const temAnamnese = anamneseCheck && anamneseCheck.length > 0;
        
        // Mensagem de pendência caso não tenha preenchido
        const alertaAnamnese = !temAnamnese
          ? `\n\n${String.fromCodePoint(0x1F4DD)} *IMPORTANTE:* Notei que sua Ficha de Anamnese Digital ainda não foi preenchida. Ela é obrigatória para seu atendimento, preencha no link abaixo:\n${linkAnamnese}`
          : '';

        const fachadaInfo = agObj.unidades?.fachada_url ? `\n${String.fromCodePoint(0x1F4F8)} Fachada: ${agObj.unidades.fachada_url}` : '';
        const enderecoInfo = agObj.unidades?.endereco ? `\n${String.fromCodePoint(0x1F4CD)} Endereço: ${agObj.unidades.endereco}` : '';

        if (novoStatus === 'AGUARDANDO_SINAL') {
          msg = encodeURIComponent(`Olá *${nomeCliente}*, seu bronze foi pré-aprovado! ${String.fromCodePoint(0x1F389)}\n\n` +
            `${String.fromCodePoint(0x1F4CC)} *Sinal 50%:* R$ ${Number(agObj.valor_sinal).toFixed(2)}\n` +
            `${String.fromCodePoint(0x1F511)} *Pix:* ${configSet.chave_pix || 'Solicitar aqui'}\n\n` +
            `${String.fromCodePoint(0x1F4DD)} *Ficha de Anamnese (Obrigatória):*\n${linkAnamnese}\n\n` +
            `Envie o comprovante para confirmar! Aguardamos você! ${String.fromCodePoint(0x2600, 0xFE0F)}`);
        } else if (novoStatus === 'CONFIRMADO') {
          msg = encodeURIComponent(`Olá *${nomeCliente}*, parabéns! Seu agendamento foi *CONFIRMADO*! ${String.fromCodePoint(0x1F389, 0x2705)}\n\n` +
            `${String.fromCodePoint(0x1F4CD)} *Unidade:* ${agObj.unidades?.nome}\n` +
            `${String.fromCodePoint(0x1F4C5)} *Data:* ${new Date(agObj.data_hora_inicio).toLocaleDateString('pt-BR')}\n` +
            `${String.fromCodePoint(0x23F0)} *Horário:* ${new Date(agObj.data_hora_inicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })}\n\n` +
            `${String.fromCodePoint(0x2728)} *Instruções Gerais:* ${configSet.whatsapp_instrucoes_bronze}\n` +
            `${String.fromCodePoint(0x1F3E0)} *Instruções da Unidade:* ${instrucoesUnidade}\n` +
            `*Localização:* ${enderecoInfo}${fachadaInfo}${alertaAnamnese}\n\nEstamos te aguardando! ${String.fromCodePoint(0x2600, 0xFE0F)}`);
        } else if (novoStatus === 'CANCELADO') {
          msg = encodeURIComponent(`Olá *${nomeCliente}*, tudo bem?\n\nInfelizmente não conseguiremos te atender no horário solicitado. ${String.fromCodePoint(0x1F614)}\n\nPoderia verificar uma nova data ou horário disponível no nosso link da bio? Aguardamos você! ${String.fromCodePoint(0x2600, 0xFE0F)}`);
        }
        if (msg) window.open(`https://wa.me/${fone}?text=${msg}`, '_blank');
      }

      await buscarDadosGerais(); // Recarrega os dados para refletir a mudança na UI antes do alerta
      alert(`✅ Status do agendamento atualizado para: ${novoStatus}.`);
    } catch (err: any) {
      console.error("❌ Erro ao processar operação:", err);
      alert("Falha ao processar: " + (err.message || "Erro interno de permissão."));
    }
  };

  const cadastrarUnidade = async (e: React.FormEvent) => {
    e.preventDefault(); if (!novaUnidade.nome) { alert("Nome da unidade é obrigatório."); return; } // Adicionei validação
    await supabase.from('unidades').insert([novaUnidade]); // Inserção com as novas colunas
    setNovaUnidade({ nome: '', endereco: '', telefone: '' }); await buscarDadosGerais(); // Limpa e recarrega
  };

  const cadastrarProcedimento = async (e: React.FormEvent) => {
    e.preventDefault(); if (!novoProcedimento.nome || !novoProcedimento.preco) { alert("Nome e preço do procedimento são obrigatórios."); return; }
    await supabase.from('procedimentos').insert([{ nome: novoProcedimento.nome, preco: parseFloat(novoProcedimento.preco), duracao_minutos: parseInt(novoProcedimento.duracao) }]);
    setNovoProcedimento({ nome: '', preco: '', duracao: '60' }); await buscarDadosGerais(); // Recarrega
  };

  const cadastrarProduto = async (e: React.FormEvent) => {
    e.preventDefault(); if (!novoProduto.nome || !novoProduto.preco_venda) { alert("Nome e preço de venda do produto são obrigatórios."); return; }
    await supabase.from('produtos').insert([{ nome: novoProduto.nome, preco_custo: parseFloat(novoProduto.preco_custo || '0'), preco_venda: parseFloat(novoProduto.preco_venda), estoque_atual: parseInt(novoProduto.estoque_atual || '0', 10), estoque_minimo: parseInt(novoProduto.estoque_minimo || '2', 10) }]);
    setNovaDespesa({ descricao: '', valor: '', unidade_id: '' }); await buscarDadosGerais(); // Recarrega
  };

  const salvarConfiguracoes = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: any = {
        chave_pix: configSet.chave_pix || '',
        dominio_app: configSet.dominio_app || '',
        whatsapp_instrucoes_bronze: configSet.whatsapp_instrucoes_bronze || '',
        whatsapp_instrucoes_unidade_imperador: configSet.whatsapp_instrucoes_unidade_imperador || '',
        whatsapp_instrucoes_unidade_limoeiro: configSet.whatsapp_instrucoes_unidade_limoeiro || '',
        admin_whatsapp: configSet.admin_whatsapp || '',
      };

      // Só enviamos o ID se ele já existir no estado (carregado do banco)
      // Se for o primeiro salvamento (id null), o Supabase gera o ID automaticamente
      if (configSet.id) payload.id = configSet.id;

      const { error } = await supabase.from('configuracoes').upsert([payload], { onConflict: 'id' });

      if (error) throw error;

      await buscarDadosGerais();
      alert("✅ Configurações salvas com sucesso!");
    } catch (err: any) {
      console.error("Erro ao salvar configurações:", err);
      alert("❌ Erro ao salvar: " + (err.message || "Verifique o console para detalhes."));
    }
  };

  // FUNÇÃO DE LANÇAMENTO BLINDADA: Só permite lançar se o agendamento NÃO estiver concluído
  const salvarEdicaoCliente = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clienteSendoEditado) return;

    try {
      const { error } = await supabase
        .from('clientes')
        .update({
          nome_completo: clienteSendoEditado.nome_completo,
          apelido: clienteSendoEditado.apelido,
          whatsapp: clienteSendoEditado.whatsapp
        })
        .eq('id', clienteSendoEditado.id); // Garante que atualiza o cliente correto

      if (error) throw error;
      alert("✅ Cliente atualizado!");
      setClienteSendoEditado(null); // Fecha o formulário de edição e recarrega
      buscarDadosGerais();
    } catch (err: any) { alert("Erro ao atualizar: " + err.message); }
  };

  const lancarDespesaSaida = async (e: React.FormEvent) => {
    e.preventDefault(); 
    if (!novaDespesa.descricao || !novaDespesa.valor || !fornecedorInput) return;
    
    try {
      let fId = null;
      const fExistente = fornecedores.find(f => f.nome.toLowerCase() === fornecedorInput.toLowerCase());
      
      if (fExistente) {
        fId = fExistente.id;
      } else {
        const { data: novoF, error: errF } = await supabase.from('fornecedores').insert([{ nome: fornecedorInput }]).select('id').single();
        if (!errF && novoF) fId = novoF.id;
      }
      // A unidade_id foi removida daqui, pois não é mais relevante para despesas
      await supabase.from('fluxo_caixa').insert([{ 
        tipo: 'saida',
        valor: parseFloat(novaDespesa.valor), 
        descricao: `Compra: ${novaDespesa.descricao} (${fornecedorInput})`, 
        forma_pagamento: 'dinheiro',
        fornecedor_id: fId
      }]);
      
      alert("✅ Despesa registrada!");
      setNovaDespesa({ descricao: '', valor: '', unidade_id: '' });
      setFornecedorInput('');
      await buscarDadosGerais();
    } catch (err) { console.error(err); }
  };

  // MAPEAMENTO DO FECHAMENTO ANALÍTICO DE VENDAS POR TIPO
  const obterFaturamentoPorMetodo = () => {
    let pix = 0; let credito = 0; let debito = 0; let dinheiro = 0;
    historicoCaixa.filter(c => c.tipo === 'entrada').forEach((item: FluxoCaixa) => {
      if (item.forma_pagamento === 'pix') pix += Number(item.valor);
      else if (item.forma_pagamento === 'cartao_credito') credito += Number(item.valor);
      else if (item.forma_pagamento === 'cartao_debito') debito += Number(item.valor);
      else if (item.forma_pagamento === 'dinheiro') dinheiro += Number(item.valor);
    });
    return { pix, credito, debito, dinheiro };
  };

  const imprimirFichaAnamnese = (an: any) => {
    const win = window.open('', '_blank'); if (!win) return;
    
    // Formatação das respostas para o PDF completo
    const listaRespostas = Object.entries(an.respostas).map(([chave, valor]) => {
      const label = chave.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
      const formatado = (valor === null || valor === undefined || valor === '') ? '—' : (typeof valor === 'string' ? valor.toUpperCase() : valor);
      const isAlerta = (chave.includes('pressao') || chave.includes('roacutan') || chave.includes('gestante')) && valor === 'sim';
      return `<p style="margin: 8px 0; border-bottom: 1px solid #f3f4f6; padding-bottom: 4px;">
        <strong style="color: #4b5563;">${label}:</strong> 
        <span class="${isAlerta ? 'alerta' : ''}">${formatado}</span>
      </p>`;
    }).join('');

    win.document.write(`
      <html>
        <head>
          <title>Ficha Anamnese - ${an.clientes?.nome_completo}</title>
          <style>
            body{font-family:sans-serif;padding:40px;color:#1f2937;line-height:1.5;}
            h1{color:#b45309;border-bottom:3px solid #f59e0b;padding-bottom:10px;margin-bottom:20px;}
            .info-cliente{background:#fffbeb;padding:15px;border-radius:10px;margin-bottom:20px;border:1px solid #fef3c7;}
            .alerta{color:#dc2626;font-weight:bold;text-decoration:underline;}
            h3{color:#92400e;margin-top:30px;border-bottom:1px solid #fbbf24;display:inline-block;}
          </style>
        </head>
        <body>
          <h1>Ficha de Anamnese Digital</h1>
          <div class="info-cliente">
            <p><strong>Cliente:</strong> ${an.clientes?.nome_completo}</p>
            <p><strong>WhatsApp:</strong> ${an.clientes?.whatsapp}</p>
            <p><strong>Data de Preenchimento:</strong> ${new Date(an.data_preenchimento).toLocaleString('pt-BR')}</p>
          </div>
          <h3>Respostas do Questionário</h3>
          <div style="margin-top:10px;">${listaRespostas}</div>
          
          <div style="margin-top: 80px; display: flex; flex-direction: column; align-items: center; justify-content: center;">
            <div style="border-top: 1px solid #000; width: 300px; text-align: center; padding-top: 5px;">
              <p style="font-size: 12px; margin: 0;">Assinatura da Cliente / Visto Digital</p>
              <p style="font-size: 10px; color: #6b7280;">Documento gerado eletronicamente em ${new Date().toLocaleDateString('pt-BR')}</p>
            </div>
          </div>
          <script>window.onload = () => { window.print(); window.close(); }</script>
        </body>
      </html>
    `);
    win.document.close();
  };

  const imprimirRelatorioMensal = async () => {
    const agora = new Date();
    const mesAtual = agora.getMonth();
    const anoAtual = agora.getFullYear();
    const nomeMes = agora.toLocaleString('pt-BR', { month: 'long' });

    const movimentacoesMes = historicoCaixa.filter(item => {
      const dataItem = new Date(item.created_at);
      return dataItem.getMonth() === mesAtual && dataItem.getFullYear() === anoAtual;
    });

    const entradasMes = movimentacoesMes.filter(i => i.tipo === 'entrada').reduce((s, i) => s + Number(i.valor), 0);
    const saidasMes = movimentacoesMes.filter(i => i.tipo === 'saida').reduce((s, i) => s + Number(i.valor), 0);

    const faturamento = { pix: 0, credito: 0, debito: 0, dinheiro: 0 };
    movimentacoesMes.filter(c => c.tipo === 'entrada').forEach((item: FluxoCaixa) => {
      if (item.forma_pagamento === 'pix') faturamento.pix += Number(item.valor);
      else if (item.forma_pagamento === 'cartao_credito') faturamento.credito += Number(item.valor);
      else if (item.forma_pagamento === 'cartao_debito') faturamento.debito += Number(item.valor);
      else if (item.forma_pagamento === 'dinheiro') faturamento.dinheiro += Number(item.valor);
    });

    // Detalhamento Analítico das Entradas (Vendas e Sinais)
    const listaEntradas = await Promise.all(movimentacoesMes
      .filter(i => i.tipo === 'entrada')
      .map(async (item: FluxoCaixa) => {
        let descricaoFinal = item.descricao;
        let tipoMovimentacao = '';
        
        // Identificação Automática do Tipo
        if (item.descricao.includes('Sinal 50%')) tipoMovimentacao = 'Sinal';
        else if (item.descricao.includes('Fechamento Total')) tipoMovimentacao = 'Fechamento';
        else tipoMovimentacao = 'Extra';

        if (item.agendamento_id) {
          const agendamento = agendamentos.find(ag => ag.id === item.agendamento_id);
          if (agendamento) {
            // Encontra os procedimentos vinculados a este agendamento
            const procsStr = agendamentoProcedimentos
              .filter(ap => ap.agendamento_id === item.agendamento_id)
              .map(ap => ap.procedimentos?.nome)
              .filter(Boolean).join(', ');

            descricaoFinal = `${agendamento.clientes?.nome_completo || 'Cliente'} ${procsStr ? `[${procsStr}]` : ''}`;

            // Busca produtos se for fechamento
            if (tipoMovimentacao === 'Fechamento' && item.agendamento_id) {
              const { data: prods } = await supabase.from('comanda_produtos').select('quantidade, produtos(nome)').eq('agendamento_id', item.agendamento_id);
              if (prods && prods.length > 0) {
                const pStr = prods.map(cp => {
                  const produtos = Array.isArray(cp.produtos) ? cp.produtos : [cp.produtos].filter(Boolean);
                  const nomes = produtos.map(p => p.nome).filter(Boolean).join(', ');
                  return `${cp.quantidade}x ${nomes}`;
                }).join(', ');
                descricaoFinal += ` + Consumo: ${pStr}`;
              }
            }
          }
        }
        return `
          <tr>
            <td>${new Date(item.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
            <td style="font-size: 9px;">${descricaoFinal}</td>
            <td style="font-weight:bold; color: #4b5563;">${tipoMovimentacao}</td>
            <td style="text-transform: uppercase;">${item.forma_pagamento}</td>
            <td style="font-weight:bold;">R$ ${Number(item.valor).toFixed(2)}</td>
          </tr>
        `;
      }));

    const win = window.open('', '_blank');
    if (!win) return;

    win.document.write(`
      <html>
        <head>
          <title>Relatório Feita de Bronze - ${nomeMes}/${anoAtual}</title>
          <style>
            body { font-family: sans-serif; padding: 20px; color: #171717; font-size: 10px; }
            .header { text-align: center; border-bottom: 2px solid #f59e0b; padding-bottom: 20px; margin-bottom: 30px; }
            h1 { color: #b45309; margin: 0; font-size: 20px; }
            h3 { font-size: 12px; color: #92400e; margin-top: 25px; border-bottom: 1px solid #fbbf24; display: inline-block; padding-bottom: 2px; }
            .resumo-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 30px; }
            .card { border: 1px solid #e5e5e5; padding: 15px; border-radius: 8px; }
            .label { font-size: 8px; color: #737373; text-transform: uppercase; font-weight: bold; }
            .valor { font-size: 18px; font-weight: 900; margin-top: 5px; }
            .verde { color: #10b981; }
            .vermelho { color: #ef4444; }
            table { width: 100%; border-collapse: collapse; margin-top: 5px; }
            th, td { border: 1px solid #e5e5e5; padding: 5px; text-align: left; }
            th { background-color: #fafafa; color: #737373; font-size: 9px; text-transform: uppercase; }
            .total-row { font-weight: bold; background-color: #fffbeb; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Feita de Bronze</h1>
            <p>Relatório de Movimentação Financeira - ${nomeMes.toUpperCase()} / ${anoAtual}</p>
          </div>
          <div class="resumo-grid">
            <div class="card"><div class="label">Entradas</div><div class="valor verde">R$ ${entradasMes.toFixed(2)}</div></div>
            <div class="card"><div class="label">Saídas</div><div class="valor vermelho">R$ ${saidasMes.toFixed(2)}</div></div>
            <div class="card"><div class="label">Saldo</div><div class="valor">R$ ${(entradasMes - saidasMes).toFixed(2)}</div></div>
          </div>
          <h3>Detalhamento por Método de Pagamento (Entradas)</h3>
          <table>
            <thead><tr><th>Método</th><th>Valor</th></tr></thead>
            <tbody>
              <tr><td>Pix</td><td>R$ ${faturamento.pix.toFixed(2)}</td></tr>
              <tr><td>Dinheiro</td><td>R$ ${faturamento.dinheiro.toFixed(2)}</td></tr>
              <tr><td>Cartão de Crédito</td><td>R$ ${faturamento.credito.toFixed(2)}</td></tr>
              <tr><td>Cartão de Débito</td><td>R$ ${faturamento.debito.toFixed(2)}</td></tr>
              <tr class="total-row"><td>TOTAL</td><td>R$ ${entradasMes.toFixed(2)}</td></tr>
            </tbody>
          </table>
          
          <h3>Lista Detalhada de Entradas (Vendas e Sinais)</h3>
          <table>
            <thead>
              <tr><th>Data</th><th>Descrição / Itens</th><th>Operação</th><th>Pagto</th><th>Valor</th></tr>
            </thead>
            <tbody>
              ${listaEntradas.join('') || '<tr><td colspan="5" style="text-align:center;">Nenhuma entrada registrada.</td></tr>'}
            </tbody>
          </table>
          <div style="margin-top: 50px; font-size: 10px; color: #a3a3a3; text-align: center;">Gerado em ${new Date().toLocaleString('pt-BR')}</div>
          <script>window.print();</script>
        </body>
      </html>
    `);
    win.document.close();
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex flex-col md:flex-row">

      {/* MENU LATERAL */}
      <aside className="w-full md:w-64 bg-neutral-900 border-b md:border-b-0 md:border-r border-neutral-800 p-6 space-y-6">
        <div>
          <h2 className="text-xl font-bold bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">Feita de Bronze</h2>
          <p className="text-xs text-neutral-400">Painel de Controle Admin</p>
        </div>

        <nav className="space-y-1">
          <button onClick={() => setAbaAtiva('agendamentos')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition ${abaAtiva === 'agendamentos' ? 'bg-amber-50 text-black font-bold' : 'text-neutral-400 hover:bg-neutral-800'}`}>
            <Calendar size={18} /> Solicitações da Bio
          </button>
          <button onClick={() => setAbaAtiva('comandas')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition ${abaAtiva === 'comandas' ? 'bg-amber-50 text-black font-bold' : 'text-neutral-400 hover:bg-neutral-800'}`}>
            <ShoppingBag size={18} /> Consumo e Comanda
          </button>
          <button onClick={() => setAbaAtiva('cadastros')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition ${abaAtiva === 'cadastros' ? 'bg-amber-50 text-black font-bold' : 'text-neutral-400 hover:bg-neutral-800'}`}>
            <Sliders size={18} /> Cadastros Rápidos
          </button>
          <button onClick={() => setAbaAtiva('anamneses')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition ${abaAtiva === 'anamneses' ? 'bg-amber-50 text-black font-bold' : 'text-neutral-400 hover:bg-neutral-800'}`}>
            <ClipboardList size={18} /> Fichas de Anamnese
          </button>
          <button onClick={() => setAbaAtiva('clientes')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition ${abaAtiva === 'clientes' ? 'bg-amber-50 text-black font-bold' : 'text-neutral-400 hover:bg-neutral-800'}`}>
            <User size={18} /> Clientes
          </button>
          {isOwner && (
            <button onClick={() => setAbaAtiva('financeiro')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition ${abaAtiva === 'financeiro' ? 'bg-amber-50 text-black font-bold' : 'text-neutral-400 hover:bg-neutral-800'}`}>
              <DollarSign size={18} /> Caixa e Relatórios
            </button>
          )}
        </nav>
      </aside>

      {/* ÁREA PRINCIPAL CONTEÚDO */}
      <main className="flex-1 p-8 overflow-y-auto">

        {/* TAB 1: SOLICITAÇÕES DA BIO */}
        {abaAtiva === 'agendamentos' && (
          <div className="space-y-6">
            {/* TAB 1: LISTAGEM E OPERAÇÃO DE AGENDAMENTOS RESPONSIVO */}
            {abaAtiva === 'agendamentos' && (
              <div className="space-y-6">
                <h1 className="text-2xl font-bold">Solicitações de Sessão</h1>

                {/* VISÃO PARA COMPUTADOR (Esconde no celular e aparece em telas grandes) */}
                <div className="hidden md:block bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-neutral-950 text-neutral-400 text-xs uppercase tracking-wider border-b border-neutral-800">
                      <tr>
                        <th className="p-4">Cliente</th>
                        <th className="p-4">Unidade</th>
                        <th className="p-4">Data / Hora</th>
                        <th className="p-4">Sinal 50%</th>
                        <th className="p-4">Status</th>
                        <th className="p-4">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800">
                      {agendamentos.map((ag) => (
                        <tr key={ag.id} className="hover:bg-neutral-900/50 transition">
                          <td className="p-4">
                            <div className="font-semibold">{ag.clientes?.nome_completo}</div>
                            <div className="text-xs text-neutral-500">{ag.clientes?.whatsapp}</div>
                          </td>
                          <td className="p-4 text-neutral-300">{ag.unidades?.nome}</td>
                          <td className="p-4 text-neutral-300">{new Date(ag.data_hora_inicio).toLocaleString('pt-BR')}</td>
                          <td className="p-4 text-amber-400 font-bold">R$ {Number(ag.valor_sinal).toFixed(2)}</td>
                          <td className="p-4">
                            <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${ag.status === 'CONFIRMADO' ? 'bg-emerald-950 text-emerald-400' :
                              ag.status === 'AGUARDANDO_SINAL' ? 'bg-amber-950 text-amber-400' :
                              ag.status === 'CANCELADO' ? 'bg-red-950 text-red-400' :
                                ag.status === 'CONCLUÍDO' ? 'bg-blue-950 text-blue-400' : 'bg-amber-950 text-amber-400'
                              }`}>
                              {ag.status === 'AGUARDANDO_APROVACAO' ? '⏳ Nova Solicitação' : 
                               ag.status === 'AGUARDANDO_SINAL' ? '💰 Aguardando Pix' :
                               ag.status === 'CONFIRMADO' ? '✓ Confirmado' : 
                               ag.status === 'CANCELADO' ? '✕ Cancelado' : '✓ Concluído'}
                            </span>
                          </td>
                          <td className="p-4">
                            <div className="flex gap-2">
                              {ag.status === 'AGUARDANDO_APROVACAO' && (
                                <>
                                  <button
                                    onClick={() => alterarStatusAgendamento(ag.id, 'AGUARDANDO_SINAL')}
                                    className="bg-amber-500 hover:bg-amber-400 text-black px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition"><Check size={14} /> Pré-Aprovar
                                  </button>
                                  <button onClick={() => alterarStatusAgendamento(ag.id, 'CANCELADO')} className="bg-red-950 text-red-400 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1"><X size={12} /> Recusar</button>
                                </>
                              )}
                              {ag.status === 'AGUARDANDO_SINAL' && (
                                <button
                                    onClick={() => alterarStatusAgendamento(ag.id, 'CONFIRMADO', Number(ag.valor_sinal), ag.unidade_id)}
                                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition"><DollarSign size={14} /> Confirmar Sinal
                                </button>
                              )}
                              {ag.status !== 'CANCELADO' && ag.status !== 'CONCLUÍDO' && (
                                <a 
                                  href={`https://wa.me/55${ag.clientes?.whatsapp?.replace(/\D/g, '')}`} 
                                  target="_blank"
                                  className="bg-neutral-800 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 border border-neutral-700">
                                  <MessageSquare size={12} /> WhatsApp
                                </a>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* VISÃO PARA CELULAR (Aparece no celular e esconde no computador) */}
                <div className="block md:hidden space-y-4">
                  {agendamentos.map((ag) => (
                    <div key={ag.id} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 space-y-3 shadow-md">
                      <div className="flex justify-between items-start border-b border-neutral-800 pb-2">
                        <div>
                          <div className="font-bold text-neutral-100 text-base">{ag.clientes?.nome_completo}</div>
                          <div className="text-xs text-neutral-400">{ag.unidades?.nome}</div>
                        </div>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${ag.status === 'CONFIRMADO' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                          ag.status === 'AGUARDANDO_SINAL' ? 'bg-amber-950 text-amber-400 border border-amber-800' :
                          ag.status === 'CANCELADO' ? 'bg-red-950 text-red-400 border border-red-800' :
                            ag.status === 'CONCLUÍDO' ? 'bg-blue-950 text-blue-400 border border-blue-800' : 'bg-amber-950 text-amber-400 border border-amber-800'
                          }`}>
                          {ag.status === 'AGUARDANDO_APROVACAO' ? 'Pendente' : ag.status === 'AGUARDANDO_SINAL' ? 'Pix Pendente' : ag.status === 'CONFIRMADO' ? 'Confirmado' : ag.status === 'CANCELADO' ? 'Cancelado' : 'Concluído'}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs text-neutral-400">
                        <div>📅 <strong>Data/Hora:</strong><p className="text-neutral-200 mt-0.5">{new Date(ag.data_hora_inicio).toLocaleString('pt-BR')}</p></div>
                        <div>💰 <strong>Sinal 50%:</strong><p className="text-amber-400 font-bold mt-0.5">R$ {Number(ag.valor_sinal).toFixed(2)}</p></div>
                      </div>

                      {/* BOTÕES GRANDES CONFORTEIS PARA O DEDO CLICAR NO CELULAR */}
                      <div className="pt-2 border-t border-neutral-800 flex gap-2">
                        {ag.status === 'AGUARDANDO_APROVACAO' && (
                          <>
                             <button
                                onClick={() => alterarStatusAgendamento(ag.id, 'AGUARDANDO_SINAL')}
                                className="flex-1 bg-amber-500 text-black py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition"><Check size={14} /> Pré-Aprovar
                              </button>
                            <button onClick={() => alterarStatusAgendamento(ag.id, 'CANCELADO')} className="flex-1 bg-neutral-800 text-red-400 py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 font-bold border border-red-900/30"><X size={14} /> Recusar</button>
                          </>
                        )}
                        {ag.status === 'AGUARDANDO_SINAL' && (
                          <button
                              onClick={() => alterarStatusAgendamento(ag.id, 'CONFIRMADO', Number(ag.valor_sinal), ag.unidade_id)}
                              className="w-full bg-emerald-600 text-white py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition">
                              <DollarSign size={14} /> Confirmar Pagto Sinal
                            </button>
                        )}
                        {ag.status !== 'CANCELADO' && ag.status !== 'CONCLUÍDO' && (
                          <a 
                            href={`https://wa.me/55${ag.clientes?.whatsapp?.replace(/\D/g, '')}`}
                            className="bg-neutral-800 text-white px-3 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1 border border-neutral-700">
                            <MessageSquare size={12} /> WhatsApp
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {agendamentos.length === 0 && (
                  <p className="text-center text-neutral-500 py-8">Nenhum agendamento encontrado.</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: CONSUMO E COMANDA */}
        {abaAtiva === 'comandas' && (
          <ComandaPanel
            agendamentos={agendamentos}
            produtos={produtos}
            buscarDadosGerais={buscarDadosGerais}
          />
        )}

        {/* TAB 3: CADASTROS */}
        {abaAtiva === 'cadastros' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-neutral-900 p-5 rounded-2xl border border-neutral-800 space-y-4">
              <h2 className="text-sm font-bold text-amber-400">Novo Procedimento</h2>
              <form onSubmit={cadastrarProcedimento} className="space-y-2">
                <input type="text" placeholder="Nome" value={novoProcedimento.nome} onChange={e => setNovoProcedimento({ ...novoProcedimento, nome: e.target.value })} className="w-full bg-neutral-950 border border-neutral-800 p-2.5 rounded-lg text-xs" />
                <input type="number" placeholder="Preço R$" value={novoProcedimento.preco} onChange={e => setNovoProcedimento({ ...novoProcedimento, preco: e.target.value })} className="w-full bg-neutral-950 border border-neutral-800 p-2.5 rounded-lg text-xs" />
                <button type="submit" className="w-full bg-amber-500 text-black py-2 rounded-lg text-xs font-bold">Salvar Serviço</button>
              </form>
              <div className="divide-y divide-neutral-800 max-h-32 overflow-y-auto pt-2">
                {procedimentos.map(p => <div key={p.id} className="py-1.5 text-xs text-neutral-400 flex justify-between"><span>{p.nome}</span><strong>R$ {Number(p.preco).toFixed(2)}</strong></div>)}
              </div>
            </div>

            <div className="bg-neutral-900 p-5 rounded-2xl border border-neutral-800 space-y-4">
              <h2 className="text-sm font-bold text-amber-400">Novo Produto (Estoque)</h2>
              <form onSubmit={cadastrarProduto} className="space-y-2">
                <input type="text" placeholder="Nome" value={novoProduto.nome} onChange={e => setNovoProduto({ ...novoProduto, nome: e.target.value })} className="w-full bg-neutral-950 border border-neutral-800 p-2.5 rounded-lg text-xs" />
                <div className="grid grid-cols-2 gap-1">
                  <input type="number" placeholder="Custo R$" value={novoProduto.preco_custo} onChange={e => setNovoProduto({ ...novoProduto, preco_custo: e.target.value })} className="w-full bg-neutral-950 border border-neutral-800 p-2 rounded-lg text-xs" />
                  <input type="number" placeholder="Venda R$" value={novoProduto.preco_venda} onChange={e => setNovoProduto({ ...novoProduto, preco_venda: e.target.value })} className="w-full bg-neutral-950 border border-neutral-800 p-2 rounded-lg text-xs" />
                </div>
                <div className="grid grid-cols-2 gap-1">
                  <input type="number" placeholder="Qtd Inicial" value={novoProduto.estoque_atual} onChange={e => setNovoProduto({ ...novoProduto, estoque_atual: e.target.value })} className="w-full bg-neutral-950 border border-neutral-800 p-2 rounded-lg text-xs" />
                  <input type="number" placeholder="Mínimo" value={novoProduto.estoque_minimo} onChange={e => setNovoProduto({ ...novoProduto, estoque_minimo: e.target.value })} className="w-full bg-neutral-950 border border-neutral-800 p-2 rounded-lg text-xs" />
                </div>
                <button type="submit" className="w-full bg-amber-500 text-black py-2 rounded-lg text-xs font-bold">Salvar Produto</button>
              </form>
              <div className="divide-y divide-neutral-800 max-h-24 overflow-y-auto pt-2">
                {produtos.map(pr => <div key={pr.id} className="py-1 text-xs text-neutral-400 flex justify-between"><span>{pr.nome}</span><span className={pr.estoque_atual <= pr.estoque_minimo ? 'text-red-400' : 'text-emerald-400'}>Qtd: {pr.estoque_atual}</span></div>)}
              </div>
            </div>

            <div className="bg-neutral-900 p-5 rounded-2xl border border-neutral-800 space-y-4">
              <h2 className="text-sm font-bold text-amber-400">Unidades da Clínica</h2>
              <form onSubmit={cadastrarUnidade} className="space-y-2">
                <input type="text" placeholder="Nome da Unidade" value={novaUnidade.nome} onChange={e => setNovaUnidade({ ...novaUnidade, nome: e.target.value })} className="w-full bg-neutral-950 border border-neutral-800 p-2.5 rounded-lg text-xs" />
                <input type="text" placeholder="Endereço" value={novaUnidade.endereco} onChange={e => setNovaUnidade({ ...novaUnidade, endereco: e.target.value })} className="w-full bg-neutral-950 border border-neutral-800 p-2.5 rounded-lg text-xs" />
                <button type="submit" className="w-full bg-amber-500 text-black py-2 rounded-lg text-xs font-bold">Salvar Unidade</button>
              </form>
              <div className="divide-y divide-neutral-800 max-h-32 overflow-y-auto pt-2">
                {unidades.map(u => <div key={u.id} className="py-1.5 text-xs text-neutral-400 font-bold">{u.nome}</div>)}
              </div>
            </div>

            {/* NOVA SEÇÃO DE CONFIGURAÇÕES GLOBAIS */}
            <div className="bg-neutral-900 p-5 rounded-2xl border border-amber-500/30 space-y-4 md:col-span-3">
              <h2 className="text-sm font-bold text-amber-400 flex items-center gap-2">Configurações do Sistema (WhatsApp & Links)</h2>
              <form onSubmit={salvarConfiguracoes} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div>
                  <label className="text-[10px] text-neutral-500 uppercase font-bold block mb-1">Chave Pix para Mensagens</label>
                  <input type="text" value={configSet.chave_pix} onChange={e => setConfigSet({ ...configSet, chave_pix: e.target.value })} className="w-full bg-neutral-950 border border-neutral-800 p-2.5 rounded-lg text-xs" placeholder="Ex: CNPJ ou Celular" />
                </div>
                <div>
                  <label className="text-[10px] text-neutral-500 uppercase font-bold block mb-1">Domínio do Site (Vercel)</label>
                  <input type="text" value={configSet.dominio_app} onChange={e => setConfigSet({ ...configSet, dominio_app: e.target.value })} className="w-full bg-neutral-950 border border-neutral-800 p-2.5 rounded-lg text-xs" placeholder="https://seu-site.vercel.app" />
                </div>
                <div className="md:col-span-3">
                  <label className="text-[10px] text-neutral-500 uppercase font-bold block mb-1">Instruções Gerais para Bronze (WhatsApp)</label>
                  <textarea value={configSet.whatsapp_instrucoes_bronze} onChange={e => setConfigSet({ ...configSet, whatsapp_instrucoes_bronze: e.target.value })} className="w-full bg-neutral-950 border border-neutral-800 p-2.5 rounded-lg text-xs h-24" placeholder="Ex: Se alimentar 1h antes, não levar acompanhante..."></textarea>
                </div>
                <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] text-neutral-500 uppercase font-bold block mb-1">Instruções Unidade Imperador (WhatsApp)</label>
                    <textarea value={configSet.whatsapp_instrucoes_unidade_imperador} onChange={e => setConfigSet({ ...configSet, whatsapp_instrucoes_unidade_imperador: e.target.value })} className="w-full bg-neutral-950 border border-neutral-800 p-2.5 rounded-lg text-xs h-24" placeholder="Ex: Subindo a escada, tocar interfone Branco..."></textarea>
                  </div>
                  <div>
                    <label className="text-[10px] text-neutral-500 uppercase font-bold block mb-1">Instruções Unidade Limoeiro (WhatsApp)</label>
                    <textarea value={configSet.whatsapp_instrucoes_unidade_limoeiro} onChange={e => setConfigSet({ ...configSet, whatsapp_instrucoes_unidade_limoeiro: e.target.value })} className="w-full bg-neutral-950 border border-neutral-800 p-2.5 rounded-lg text-xs h-24" placeholder="Ex: Só apertar a campainha e aguardar..."></textarea>
                  </div>
                </div>
                <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] text-neutral-500 uppercase font-bold block mb-1">WhatsApp do Admin (para notificações)</label>
                    <input
                      type="text"
                      value={configSet.admin_whatsapp || ''}
                      onChange={e => setConfigSet({ ...configSet, admin_whatsapp: e.target.value })}
                      className="w-full bg-neutral-950 border border-neutral-800 p-2.5 rounded-lg text-xs"
                      placeholder="Ex: 11999999999"
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-5">
                    <input
                      type="checkbox"
                      id="permitirDomingo"
                      checked={configSet.permitir_domingo_agendamento}
                      onChange={e => setConfigSet({ ...configSet, permitir_domingo_agendamento: e.target.checked })}
                      className="form-checkbox h-4 w-4 text-amber-500 transition duration-150 ease-in-out bg-neutral-950 border-neutral-800 rounded"
                    />
                    <label htmlFor="permitirDomingo" className="text-xs text-neutral-400">Permitir agendamentos aos Domingos (ignora bloqueio padrão)</label>
                  </div>
                </div>
                <button type="submit" className="bg-emerald-600 text-white py-2.5 rounded-lg text-xs font-black hover:bg-emerald-500 transition">SALVAR ALTERAÇÕES</button>
              </form>
              <p className="text-[10px] text-neutral-500">* Se o domínio for deixado vazio, o sistema usará o link atual automaticamente.</p>
            </div>
          </div>
        )}

        {/* TAB 4: ANAMNESES */}
        {abaAtiva === 'anamneses' && (
          <div className="space-y-4">
            <h1 className="text-2xl font-bold">Histórico Clínico das Clientes</h1>
            <div className="grid grid-cols-1 gap-4">
              {anamnesesRecentes.map((an) => (
                <div key={an.id} className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-base font-bold text-neutral-100">{an.clientes?.nome_completo}</h3>
                      <span className="text-[10px] bg-neutral-950 px-2 py-0.5 rounded border border-neutral-800 text-neutral-400">{new Date(an.data_preenchimento).toLocaleDateString('pt-BR')}</span>
                    </div>
                    <p className="text-xs text-neutral-500">WhatsApp: {an.clientes?.whatsapp}</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-1 text-xs pt-2 text-neutral-400">
                      <div>• Pressão Alta: <span className={an.respostas.pressao_alta === 'sim' ? 'text-red-400 font-bold' : 'text-emerald-400'}>{an.respostas.pressao_alta?.toUpperCase()}</span></div>
                      <div>• Gestante: <span className={an.respostas.gestante_ou_amamentando === 'sim' ? 'text-red-400 font-bold' : 'text-emerald-400'}>{an.respostas.gestante_ou_amamentando?.toUpperCase()}</span></div>
                      <div>• Roacutan: <span className={an.respostas.uso_roacutan_6meses === 'sim' ? 'text-red-400 font-bold' : 'text-emerald-400'}>{an.respostas.uso_roacutan_6meses?.toUpperCase()}</span></div>
                    </div>
                  </div>
                  <button onClick={() => imprimirFichaAnamnese(an)} className="w-full md:w-auto bg-neutral-800 border border-neutral-700 hover:bg-neutral-700 px-4 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition"><Printer size={14} /> Imprimir PDF</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 6: CLIENTES */}
        {abaAtiva === 'clientes' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold">Gestão de Clientes</h1>
              {clienteSendoEditado && (
                <button onClick={() => setClienteSendoEditado(null)} className="text-xs bg-neutral-800 px-3 py-1 rounded-lg">Cancelar Edição</button>
              )}
            </div>

            {clienteSendoEditado && (
              <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-2xl mb-6">
                <h2 className="text-sm font-bold text-amber-500 mb-3">Editando: {clienteSendoEditado.nome_completo}</h2>
                <form onSubmit={salvarEdicaoCliente} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-neutral-500 block mb-1">Nome Completo</label>
                    <input type="text" value={clienteSendoEditado.nome_completo} onChange={e => setClienteSendoEditado({...clienteSendoEditado, nome_completo: e.target.value})} className="w-full bg-neutral-950 border border-neutral-800 p-2 rounded-lg text-xs" />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-neutral-500 block mb-1">Apelido</label>
                    <input type="text" value={clienteSendoEditado.apelido || ''} onChange={e => setClienteSendoEditado({...clienteSendoEditado, apelido: e.target.value})} className="w-full bg-neutral-950 border border-neutral-800 p-2 rounded-lg text-xs" />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-neutral-500 block mb-1">WhatsApp</label>
                    <input type="text" value={clienteSendoEditado.whatsapp} onChange={e => setClienteSendoEditado({...clienteSendoEditado, whatsapp: e.target.value})} className="w-full bg-neutral-950 border border-neutral-800 p-2 rounded-lg text-xs" />
                  </div>
                  <button type="submit" className="bg-amber-500 text-black font-bold py-2 rounded-lg text-xs">SALVAR ALTERAÇÕES</button>
                </form>
              </div>
            )}

            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-neutral-950 text-neutral-400 text-xs uppercase tracking-wider border-b border-neutral-800">
                  <tr>
                    <th className="p-4">Nome Completo</th>
                    <th className="p-4">Apelido</th>
                    <th className="p-4">WhatsApp</th>
                    <th className="p-4">Cadastro</th>
                    <th className="p-4 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800">
                  {clientes.map((cli) => (
                    <tr key={cli.id} className={`hover:bg-neutral-900/50 transition ${clienteSendoEditado?.id === cli.id ? 'bg-amber-500/5' : ''}`}>
                      <td className="p-4 font-semibold">{cli.nome_completo}</td>
                      <td className="p-4 text-neutral-300">{cli.apelido || '—'}</td>
                      <td className="p-4 text-neutral-300">{cli.whatsapp}</td>
                      <td className="p-4 text-neutral-500 text-xs">{new Date(cli.created_at).toLocaleDateString('pt-BR')}</td>
                      <td className="p-4 text-center">
                        <button 
                          onClick={() => {
                            setClienteSendoEditado(cli);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }} 
                          className="text-amber-500 hover:underline text-xs font-bold"
                        >
                          EDITAR
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 5: FINANCEIRO ANALÍTICO TOTAL */}
        {abaAtiva === 'financeiro' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <h1 className="text-2xl font-bold">Balanço Geral e Caixa Analítico</h1>
              <button onClick={imprimirRelatorioMensal} className="w-full md:w-auto bg-amber-500 text-black px-4 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:brightness-110 transition shadow-lg shadow-amber-500/20">
                <Printer size={18} /> Gerar Relatório do Mês
              </button>
            </div>

            {/* CARDS MACRO */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-neutral-900 border border-neutral-800 p-4 rounded-xl">
                <p className="text-xs text-neutral-400 uppercase tracking-wider">Entradas Totais</p>
                <h3 className="text-xl font-black text-emerald-400 mt-0.5">R$ {historicoCaixa.filter(c => c.tipo === 'entrada').reduce((s, i) => s + Number(i.valor), 0).toFixed(2)}</h3>
              </div>
              <div className="bg-neutral-900 border border-neutral-800 p-4 rounded-xl">
                <p className="text-xs text-neutral-400 uppercase tracking-wider">Saídas Totais</p>
                <h3 className="text-xl font-black text-red-400 mt-0.5">R$ {historicoCaixa.filter(c => c.tipo === 'saida').reduce((s, i) => s + Number(i.valor), 0).toFixed(2)}</h3>
              </div>
              <div className="bg-neutral-900 border border-neutral-800 p-4 rounded-xl">
                <p className="text-xs text-neutral-400 uppercase tracking-wider">Saldo em Caixa</p>
                <h3 className="text-xl font-black text-amber-400 mt-0.5">R$ {(historicoCaixa.filter(c => c.tipo === 'entrada').reduce((s, i) => s + Number(i.valor), 0) - historicoCaixa.filter(c => c.tipo === 'saida').reduce((s, i) => s + Number(i.valor), 0)).toFixed(2)}</h3>
              </div>
            </div>

            {/* RELATÓRIO DO FECHAMENTO METÓDICO EXCLUSIVO */}
            <div className="bg-neutral-900 border border-neutral-800 p-5 rounded-2xl space-y-3">
              <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider">Faturamento por Método de Recebimento</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800">
                  <span className="text-neutral-500 block">📱 Total em Pix:</span>
                  <strong className="text-base text-neutral-200 mt-1 block">R$ {obterFaturamentoPorMetodo().pix.toFixed(2)}</strong>
                </div>
                <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800">
                  <span className="text-neutral-500 block">💵 Total em Dinheiro:</span>
                  <strong className="text-base text-neutral-200 mt-1 block">R$ {obterFaturamentoPorMetodo().dinheiro.toFixed(2)}</strong>
                </div>
                <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800">
                  <span className="text-neutral-500 block">💳 Cartão de Crédito:</span>
                  <strong className="text-base text-neutral-200 mt-1 block">R$ {obterFaturamentoPorMetodo().credito.toFixed(2)}</strong>
                </div>
                <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800">
                  <span className="text-neutral-500 block">💳 Cartão de Débito:</span>
                  <strong className="text-base text-neutral-200 mt-1 block">R$ {obterFaturamentoPorMetodo().debito.toFixed(2)}</strong>
                </div>
              </div>
            </div>

            {/* LANÇAMENTOS E EXTRATO */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-neutral-900 border border-neutral-800 p-5 rounded-2xl space-y-3">
                <h3 className="text-xs font-bold text-neutral-200 uppercase tracking-wider flex items-center gap-1"><ArrowDownRight size={14} className="text-red-400" /> Lançar Compra</h3>
                <form onSubmit={lancarDespesaSaida} className="space-y-2">
                  <input type="text" placeholder="Item (Ex: Rolo Fita, Biquíni)" value={novaDespesa.descricao} onChange={e => setNovaDespesa({ ...novaDespesa, descricao: e.target.value })} className="w-full bg-neutral-950 border border-neutral-800 p-2 rounded-lg text-xs" />
                  <input type="number" placeholder="Valor Gasto R$" value={novaDespesa.valor} onChange={e => setNovaDespesa({ ...novaDespesa, valor: e.target.value })} className="w-full bg-neutral-950 border border-neutral-800 p-2 rounded-lg text-xs" />
                  <input list="fornecedoresList" placeholder="Fornecedor (Selecione ou Digite)" value={fornecedorInput} onChange={e => setFornecedorInput(e.target.value)} className="w-full bg-neutral-950 border border-neutral-800 p-2 rounded-lg text-xs text-white" />
                  <datalist id="fornecedoresList">
                    {fornecedores.map(f => <option key={f.id} value={f.nome} />)}
                  </datalist>
                  <button type="submit" className="w-full bg-red-600 text-white font-bold py-2 rounded-lg text-xs">Registrar Despesa</button>
                </form>
              </div>

              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden md:col-span-2">
                <div className="p-3 bg-neutral-950 font-bold border-b border-neutral-800 text-xs text-neutral-400 uppercase tracking-wider">Histórico de Movimentações</div>
                <div className="divide-y divide-neutral-800 max-h-56 overflow-y-auto">
                  {historicoCaixa.map((cx) => (
                    <div key={cx.id} className="p-3 flex justify-between items-center text-xs">
                      <div><p className="font-semibold text-neutral-200">{cx.descricao}</p><p className="text-[10px] text-neutral-500">{new Date(cx.created_at).toLocaleDateString('pt-BR')}</p></div>
                      <span className={`font-bold ${cx.tipo === 'entrada' ? 'text-emerald-400' : 'text-red-400'}`}>{cx.tipo === 'entrada' ? '+' : '-'} R$ {Number(cx.valor).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
