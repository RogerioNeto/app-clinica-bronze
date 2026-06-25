'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Calendar as CalendarIcon, Clock, MapPin, Sparkles, CheckCircle2, User } from 'lucide-react';

// Interfaces for better type safety
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

interface ConfiguracaoGlobal {
  permitir_domingo_agendamento: boolean;
  chave_pix: string;
  dominio_app: string;
  admin_whatsapp?: string;
}

export default function AgendarPage() {
  const [etapa, setEtapa] = useState(1);
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [procedimentos, setProcedimentos] = useState<Procedimento[]>([]);

  // Dados do formulário da cliente
  const [nome, setNome] = useState('');
  const [apelido, setApelido] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [unidadeSelecionada, setUnidadeSelecionada] = useState('');
  const [procedimentosSelecionados, setProcedimentosSelecionados] = useState<string[]>([]);
  const [dataSelecionada, setDataSelecionada] = useState('');
  const [horaSelecionada, setHoraSelecionada] = useState('');
  const [configuracoesGlobais, setConfiguracoesGlobais] = useState<ConfiguracaoGlobal | null>(null);
  const [isEncaixe, setIsEncaixe] = useState(false);

  // Horários padrão de funcionamento da clínica
  const horariosPadrao = ['08:00', '09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00'];
  // Estado que guardará apenas os horários que estão realmente LIVRES no dia
  const [horariosDisponiveis, setHorariosDisponiveis] = useState<string[]>(horariosPadrao);
  const [carregandoHorarios, setCarregandoHorarios] = useState(false);

  useEffect(() => {
    document.title = "Feita de Bronze | Agendamento";
  }, []);

  // Pega a data de hoje no formato YYYY-MM-DD para travar datas passadas no calendário
  const dataMinima = new Date().toISOString().split('T')[0];

  // Carrega Unidades e Procedimentos do banco de dados
  useEffect(() => {
    async function carregarDados() {
      const { data: listaUnidades } = await supabase.from('unidades').select('*');
      const { data: listaProcedimentos } = await supabase.from('procedimentos').select('*');
      const { data: configData } = await supabase.from('configuracoes').select('*').maybeSingle();

      if (listaUnidades) setUnidades(listaUnidades);
      if (listaProcedimentos) setProcedimentos(listaProcedimentos);
      if (configData) {
        setConfiguracoesGlobais({
          permitir_domingo_agendamento: configData.permitir_domingo_agendamento || false,
          chave_pix: configData.chave_pix || '',
          dominio_app: configData.dominio_app || '',
          admin_whatsapp: configData.admin_whatsapp || undefined,
        });
      }
    }
    carregarDados();
  }, []);

  // INTELIGÊNCIA DO CALENDÁRIO: Roda toda vez que a cliente muda a DATA ou a UNIDADE
  useEffect(() => {
    // Feriados Nacionais (Brasil) para 2026 - pode ser expandido ou vir de um banco de dados
    const feriados2026 = [
      '2026-01-01', // Confraternização Universal
      '2026-02-17', // Carnaval (terça-feira)
      '2026-02-18', // Quarta-feira de Cinzas
      '2026-04-03', // Sexta-feira Santa
      '2026-04-05', // Páscoa
      '2026-04-21', // Tiradentes
      '2026-05-01', // Dia do Trabalho
      '2026-06-04', // Corpus Christi
      '2026-09-07', // Independência do Brasil
      '2026-10-12', // Nossa Senhora Aparecida
      '2026-11-02', // Finados
      '2026-11-15', // Proclamação da República
      '2026-12-25', // Natal
    ];

    async function verificarVagasDisponiveis() {

      // Adicione este check no início do useEffect que verifica as vagas por data:
      const dataObj = new Date(`${dataSelecionada}T00:00:00`);
      const diaDaSemana = dataObj.getDay(); // 0 for Sunday, 1 for Monday, etc.

      const trabalhaAosDomingos = configuracoesGlobais?.permitir_domingo_agendamento || false;

      if (diaDaSemana === 0 && !trabalhaAosDomingos) {
        alert("☀️ A clínica Feita de Bronze encontra-se fechada aos Domingos. Por favor, escolha outra data!");
        setDataSelecionada('');
        setHorariosDisponiveis([]);
        return;
      }
      
      // Bloqueia feriados
      if (feriados2026.includes(dataSelecionada)) {
        alert("🎉 A clínica Feita de Bronze estará fechada neste feriado. Por favor, escolha outra data!");
        setDataSelecionada('');
        setHorariosDisponiveis([]);
        return;
      }

      if (!dataSelecionada || !unidadeSelecionada) return;

      setCarregandoHorarios(true);
      setHoraSelecionada(''); // Limpa seleção anterior por segurança

      try {
        // Define o início e o fim do dia selecionado para filtrar no banco de dados
        const dataInicioDia = `${dataSelecionada}T00:00:00.000Z`;
        const dataFimDia = `${dataSelecionada}T23:59:59.999Z`;

        // Busca todos os agendamentos confirmados daquela unidade no dia escolhido
        const { data: agendamentosOcupados, error } = await supabase
          .from('agendamentos')
          .select('data_hora_inicio')
          .eq('unidade_id', unidadeSelecionada)
          .eq('status', 'CONFIRMADO')
          .gte('data_hora_inicio', dataInicioDia)
          .lte('data_hora_inicio', dataFimDia);

        if (error) throw error;

        // Extrai apenas a parte da HORA (HH:MM) dos agendamentos retornados pelo banco
        const horasBloqueadas = agendamentosOcupados?.map(ag => {
          const dataLocal = new Date(ag.data_hora_inicio);
          // Formata para garantir que bata com o array de strings (HH:MM)
          return dataLocal.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
        }) || [];

        // Inteligência de Encaixe: Permite selecionar qualquer horário.
        // Se o horário estiver ocupado, o sistema tratará como solicitação de encaixe na gravação.
        setHorariosDisponiveis(horariosPadrao);

      } catch (err) {
        console.error("Erro ao validar horários ocupados:", err);
        setHorariosDisponiveis(horariosPadrao); // Fallback em caso de erro
      } finally {
        setCarregandoHorarios(false);
      }
    }

    if (configuracoesGlobais) verificarVagasDisponiveis(); // Só executa se as configurações globais já foram carregadas
  }, [dataSelecionada, unidadeSelecionada]);

  const alternarProcedimento = (id: string) => {
    if (procedimentosSelecionados.includes(id)) {
      setProcedimentosSelecionados(procedimentosSelecionados.filter(item => item !== id));
    } else {
      setProcedimentosSelecionados([...procedimentosSelecionados, id]);
    }
  };

  const calcularTotal = () => {
    return procedimentos
      .filter(p => procedimentosSelecionados.includes(p.id))
      .reduce((soma, p) => soma + Number(p.preco), 0);
  };

  const enviarAgendamento = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      console.log("🚀 Iniciando gravação do agendamento...");

      // 1. Busca se a cliente já existe pelo número do WhatsApp
      const { data: clientesEncontrados, error: erroBusca } = await supabase
        .from('clientes')
        .select('id')
        .eq('whatsapp', whatsapp);

      if (erroBusca) throw erroBusca;

      let clienteId = null;

      // CORREÇÃO CRÍTICA DO ARRAY [0]: Garante o acesso ao primeiro registro da lista
      if (clientesEncontrados && clientesEncontrados.length > 0) {
        clienteId = clientesEncontrados[0].id;
        console.log("👤 Cliente já cadastrada encontrada no banco. ID:", clienteId);
      } else {
        console.log("🆕 Criando novo cadastro de cliente na tabela...");
        const { data: novoCliente, error: erroCli } = await supabase
          .from('clientes')
          .insert([{ nome_completo: nome, apelido, whatsapp }])
          .select('id');

        if (erroCli) throw erroCli;

        // CORREÇÃO CRÍTICA DO ARRAY [0]: Garante a leitura do ID da nova cliente criada
        if (novoCliente && novoCliente.length > 0) {
          clienteId = novoCliente[0].id;
          console.log("✅ Nova cliente criada com sucesso. ID:", clienteId);
        }
      }

      if (!clienteId) throw new Error("Não foi possível capturar ou criar o ID da cliente.");
      
      if (!horaSelecionada) {
        throw new Error("Por favor, selecione um horário.");
      }
      // 2. Mantém o fuso horário local intacto para a hora não alterar (ex: 19:00 fixo)
      const inicio = new Date(`${dataSelecionada}T${horaSelecionada}:00`);
      const fim = new Date(inicio.getTime() + 60 * 60 * 1000);

      // Validação de Duplicidade (Inteligência de Encaixe)
      const { data: agendamentosExistentes } = await supabase
        .from('agendamentos')
        .select('id')
        .eq('unidade_id', unidadeSelecionada)
        .eq('data_hora_inicio', inicio.toISOString())
        .neq('status', 'CANCELADO');

      const encaixeDetectado = !!(agendamentosExistentes && agendamentosExistentes.length > 0);
      setIsEncaixe(encaixeDetectado);

      // 3. Salva a solicitação do agendamento com status correto
      const valorTotal = calcularTotal();
      const statusInicial = encaixeDetectado ? 'AGUARDANDO_APROVACAO' : 'AGUARDANDO_SINAL';
      console.log("📅 Gravando agendamento na tabela...");
      const { data: novoAgendamento, error: erroAgend } = await supabase
        .from('agendamentos')
        .insert([{
          cliente_id: clienteId,
          unidade_id: unidadeSelecionada,
          data_hora_inicio: inicio.toISOString(),
          data_hora_fim: fim.toISOString(),
          valor_procedimentos: valorTotal,
          valor_sinal: valorTotal * 0.5,
          status: statusInicial
        }])
        .select('id');

      if (erroAgend) throw erroAgend;

      const agendamentoId = novoAgendamento && novoAgendamento.length > 0 ? novoAgendamento[0].id : null;

      // 4. Salva a relação dos procedimentos escolhidos
      if (agendamentoId) {
        console.log("🔗 Vinculando procedimentos ao agendamento...");
        const itens = procedimentosSelecionados.map(pId => ({
          agendamento_id: agendamentoId,
          procedimento_id: pId
        }));
        const { error: erroItens } = await supabase.from('agendamento_procedimentos').insert(itens);
        if (erroItens) throw erroItens;

        const valorSinal = valorTotal * 0.5;
        const chavePix = configuracoesGlobais?.chave_pix || '';
        const baseDom = configuracoesGlobais?.dominio_app || window.location.origin;
        const linkAnamnese = `${baseDom}/anamnese?id=${agendamentoId}`;
        const fone = `55${whatsapp.replace(/\D/g, '')}`;
        const nomeCliente = nome.split(' ')[0];

        if (encaixeDetectado) {
          // Encaixe: notifica admin e cliente
          const msgCliente = encodeURIComponent(
            `Olá *${nomeCliente}*, recebemos sua solicitação de horário! ${String.fromCodePoint(0x1F389)}\n\n` +
            `⚠️ O horário escolhido possui uma pré-reserva. Sua solicitação está pendente de aprovação.\n\n` +
            `${String.fromCodePoint(0x1F4DD)} *Ficha de Anamnese (Obrigatória):*\n${linkAnamnese}\n\n` +
            `Aguardamos a confirmação da equipe! ${String.fromCodePoint(0x2600)}`
          );
          window.open(`https://wa.me/${fone}?text=${msgCliente}`, '_blank');

          // Notifica admin sobre horário duplicado
          const adminFone = configuracoesGlobais?.admin_whatsapp
            ? `55${configuracoesGlobais.admin_whatsapp.replace(/\D/g, '')}`
            : null;
          if (adminFone) {
            const msgAdmin = encodeURIComponent(
              `⚠️ *NOVA SOLICITAÇÃO EM HORÁRIO OCUPADO*\n\n` +
              `Cliente: *${nome}*\nWhatsApp: ${whatsapp}\n` +
              `Data: ${new Date(inicio).toLocaleDateString('pt-BR')}\n` +
              `Horário: ${horaSelecionada}\n` +
              `Valor: R$ ${valorTotal.toFixed(2)}\n\n` +
              `Acesse o painel para revisar: ${baseDom}/admin`
            );
            window.open(`https://wa.me/${adminFone}?text=${msgAdmin}`, '_blank');
          }
        } else {
          // Pré-aprovado: envia sinal, PIX e anamnese
          const msg = encodeURIComponent(
            `Olá *${nomeCliente}*, seu bronze foi pré-aprovado! ${String.fromCodePoint(0x1F389)}\n\n` +
            `${String.fromCodePoint(0x1F4CC)} *Sinal 50%:* R$ ${Number(valorSinal).toFixed(2)}\n` +
            `${String.fromCodePoint(0x1F511)} *Chave Pix:* ${chavePix}\n\n` +
            `${String.fromCodePoint(0x1F4DD)} *Ficha de Anamnese (Obrigatória):*\n${linkAnamnese}\n\n` +
            `Envie o comprovante no WhatsApp para confirmar! Aguardamos você! ${String.fromCodePoint(0x2600)}`
          );
          window.open(`https://wa.me/${fone}?text=${msg}`, '_blank');
        }

        setEtapa(4);
      }
    } catch (err: any) {
      console.error("❌ Erro fatal ao salvar agendamento:", err);
      alert(`Falha ao registrar: ${err.message || 'Erro inesperado de sintaxe de array.'}`);
    }
  };

  return (
    <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-2xl">
      <div className="text-center mb-6 flex flex-col items-center">
        <img
          src="/logo.png"
          alt="Feita de Bronze Logo"
          className="w-24 h-24 object-contain mb-2 animate-pulse"
        />
        <h1 className="text-xl font-bold bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
          Feita de Bronze
        </h1>
        <p className="text-xs text-neutral-400 mt-1">Reserve a sua marquinha perfeita</p>
      </div>

      {/* ETAPA 1: DADOS E UNIDADE */}
      {etapa === 1 && (
        <div className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-amber-500 flex items-center gap-2">
            <User size={16} /> Seus Dados
          </h2>
          <input type="text" placeholder="Nome Completo" value={nome} onChange={e => setNome(e.target.value)} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-sm focus:outline-none focus:border-amber-500 text-white placeholder-neutral-500" />
          <input type="text" placeholder="Apelido (Como prefere ser chamada)" value={apelido} onChange={e => setApelido(e.target.value)} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-sm focus:outline-none focus:border-amber-500 text-white placeholder-neutral-500" />
          <input type="tel" placeholder="WhatsApp com DDD" value={whatsapp} onChange={e => setWhatsapp(e.target.value)} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-sm focus:outline-none focus:border-amber-500 text-white placeholder-neutral-500" />

          <h2 className="text-sm font-semibold uppercase tracking-wider text-amber-500 flex items-center gap-2 pt-2">
            <MapPin size={16} /> Escolha a Unidade
          </h2>
          <select value={unidadeSelecionada} onChange={e => setUnidadeSelecionada(e.target.value)} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-sm focus:outline-none focus:border-amber-500 text-neutral-300">
            <option value="">Selecione uma clínica...</option>
            {unidades.map(un => (
              <option key={un.id} value={un.id}>{un.nome}</option>
            ))}
          </select>

          <button onClick={() => setEtapa(2)} disabled={!nome || !whatsapp || !unidadeSelecionada} className="w-full bg-gradient-to-r from-amber-500 to-orange-600 font-medium py-3 rounded-lg text-sm mt-4 hover:brightness-110 transition disabled:opacity-40 text-black font-bold">
            Escolher Procedimentos
          </button>
        </div>
      )}

      {/* ETAPA 2: SELEÇÃO DE PROCEDIMENTOS */}
      {etapa === 2 && (
        <div className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-amber-500 flex items-center gap-2">
            <Sparkles size={16} /> O que deseja realizar?
          </h2>
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {procedimentos.map(p => (
              <div key={p.id} onClick={() => alternarProcedimento(p.id)} className={`p-3 rounded-lg border text-left cursor-pointer transition flex justify-between items-center ${procedimentosSelecionados.includes(p.id) ? 'border-amber-500 bg-amber-950/20' : 'border-neutral-800 bg-neutral-950'}`}>
                <div>
                  <p className="text-sm font-medium text-white">{p.nome}</p>
                  <p className="text-xs text-neutral-400">{p.duracao_minutos} min</p>
                </div>
                <span className="text-sm font-bold text-amber-400">R$ {Number(p.preco).toFixed(2)}</span>
              </div>
            ))}
          </div>

          <div className="border-t border-neutral-800 pt-3 flex justify-between items-center text-sm font-bold">
            <span>Total Estimado:</span>
            <span className="text-amber-400 text-lg">R$ {calcularTotal().toFixed(2)}</span>
          </div>

          <div className="flex gap-2 mt-4">
            <button onClick={() => setEtapa(1)} className="w-1/3 bg-neutral-800 py-3 rounded-lg text-sm font-medium text-neutral-300">Voltar</button>
            <button onClick={() => setEtapa(3)} disabled={procedimentosSelecionados.length === 0} className="w-2/3 bg-gradient-to-r from-amber-500 to-orange-600 py-3 rounded-lg text-sm text-black font-bold disabled:opacity-40">
              Escolher Data e Hora
            </button>
          </div>
        </div>
      )}

      {/* ETAPA 3: DATA E CALENDÁRIO INTELIGENTE */}
      {etapa === 3 && (
        <form onSubmit={enviarAgendamento} className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-amber-500 flex items-center gap-2">
            <CalendarIcon size={16} /> Escolha o Dia da Sessão
          </h2>
          <input type="date" min={dataMinima} value={dataSelecionada} onChange={e => setDataSelecionada(e.target.value)} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-sm focus:outline-none focus:border-amber-500 text-neutral-200 scheme-dark cursor-pointer" />

          <h2 className="text-sm font-semibold uppercase tracking-wider text-amber-500 flex items-center gap-2 pt-2">
            <Clock size={16} /> Horários Livres para este dia
          </h2>

          {carregandoHorarios ? (
            <p className="text-xs text-neutral-500 text-center py-4">Buscando vagas no sistema...</p>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {horariosDisponiveis.map(hr => (
                <button key={hr} type="button" onClick={() => setHoraSelecionada(hr)} className={`py-2 rounded-md text-xs font-medium transition ${horaSelecionada === hr ? 'bg-amber-500 text-black font-bold shadow-lg' : 'bg-neutral-950 border border-neutral-800 text-neutral-300 hover:border-amber-500'}`}>
                  {hr}
                </button>
              ))}
              {horariosDisponiveis.length === 0 && dataSelecionada && (
                <p className="col-span-4 text-xs text-center text-red-400 py-2">⚠️ Todos os horários deste dia estão lotados!</p>
              )}
            </div>
          )}

          <div className="flex gap-2 mt-6">
            <button type="button" onClick={() => setEtapa(2)} className="w-1/3 bg-neutral-800 py-3 rounded-lg text-sm font-medium text-neutral-300">Voltar</button>
            <button type="submit" disabled={!dataSelecionada || !horaSelecionada || carregandoHorarios} className="w-2/3 bg-gradient-to-r from-emerald-500 to-teal-600 py-3 rounded-lg text-sm font-bold text-neutral-950 disabled:opacity-40">
              Confirmar Sessão
            </button>
          </div>
        </form>
      )}

      {/* ETAPA 4: SUCESSO */}
      {etapa === 4 && (
        <div className="text-center py-6 space-y-4">
          <div className="flex justify-center text-emerald-500"><CheckCircle2 size={56} className="animate-bounce" /></div>
          <h2 className="text-xl font-bold text-neutral-100">
            {isEncaixe ? 'Solicitação de Encaixe Recebida!' : 'Pré-aprovado! ☀️'}
          </h2>
          {isEncaixe ? (
            <p className="text-sm text-neutral-400 px-4">
              Olá <span className="text-amber-400 font-bold">{nome}</span>, recebemos sua solicitação.
              <span className="block mt-2 text-amber-500 font-semibold bg-amber-500/10 p-2 rounded-lg border border-amber-500/20">
                ⚠️ Este horário possui uma pré-reserva. Sua solicitação está pendente de aprovação para encaixe.
              </span>
            </p>
          ) : (
            <p className="text-sm text-neutral-400 px-4">
              Olá <span className="text-amber-400 font-bold">{nome}</span>, sua sessão foi pré-aprovada!
              <span className="block mt-3 text-emerald-400 font-semibold bg-emerald-500/10 p-3 rounded-lg border border-emerald-500/20">
                🔑 Chave PIX: {configuracoesGlobais?.chave_pix || 'Consulte seu WhatsApp'}
              </span>
            </p>
          )}
          <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-xs text-left text-neutral-400 space-y-1">
            <p>📅 <strong>Dia:</strong> {dataSelecionada.split('-').reverse().join('/')}</p>
            <p>⏰ <strong>Horário:</strong> {horaSelecionada}</p>
            <p>💰 <strong>Valor Total:</strong> R$ {calcularTotal().toFixed(2)}</p>
            <p>🔒 <strong>Sinal (50%):</strong> R$ {(calcularTotal() * 0.5).toFixed(2)}</p>
          </div>
          {!isEncaixe && (
            <p className="text-xs text-amber-400 font-medium pt-2">
              💰 Deposite o sinal via PIX e envie o comprovante no WhatsApp para confirmar seu horário!
            </p>
          )}
          <p className="text-xs text-neutral-500 pt-1 animate-pulse">📱 Abrimos o WhatsApp com as instruções. Se não abrir, verifique seu número.</p>
        </div>
      )}

    </div>
  );
}
