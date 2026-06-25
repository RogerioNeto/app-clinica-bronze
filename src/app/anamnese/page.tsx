'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { ShieldAlert, HeartPulse, UserCheck, Sparkles, CheckCircle2 } from 'lucide-react';

// Interfaces for better type safety
interface Cliente {
  id: string;
  nome_completo: string;
  whatsapp: string;
  apelido?: string;
  created_at: string;
}

function AnamneseForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const agendamentoId = searchParams.get('id'); // Pega o id do agendamento vindo no link

  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [sucesso, setSucesso] = useState(false);

  // Estado com todas as respostas integradas e unificadas
    const [respostas, setRespostas] = useState({
    pressao_alta: 'nao',
    doenca_pele_tratamento: '',
    acidente_recente: 'nao', // Começará marcado como NÃO (Aceso)
    detalhes_acidente: '',
    cirurgia_recente: 'nao',  // Começará marcado como NÃO (Aceso)
    qual_cirurgia: '',
    tempo_cirurgia: '',
    alergias: '',
    creme_facial_uso: '',
    gestante_ou_amamentando: 'nao', // Começará marcado como NÃO (Aceso)
    epilepsia_ou_claustrofobia: 'nao', // Começará marcado como NÃO (Aceso)
    uso_roacutan_6meses: 'nao',
    uso_acidos_atualmente: 'nao',
    antibioticos_antiinflamatorios: 'nao',
    pratica_atividade_fisica: 'nao',
    exposicao_sol_frequente: 'nao',
    se_alimentou_antes: 'nao',
    horario_alimentacao: '',
    reacao_sol_fitzpatrick: 'queima_moderado_bronzeia_gradual'
  });


  // Busca qual é a cliente associada a este agendamento para exibir o nome dela na tela
  useEffect(() => {
    async function buscarCliente() {
      if (!agendamentoId) {
        setCarregando(false);
        return;
      }
      const { data: agendamento } = await supabase
        .from('agendamentos')
        .select('*, clientes(*)')
        .eq('id', agendamentoId)
        .single();

      if (agendamento?.clientes) {
        setCliente(agendamento.clientes);
      }
      setCarregando(false);
    }
    buscarCliente();
  }, [agendamentoId]);

  const atualizarCampo = (campo: string, valor: string) => {
    setRespostas(prev => ({ ...prev, [campo]: valor }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cliente?.id) return;

    // Salva na tabela 'anamneses' enviando o objeto 'respostas' direto para o campo JSONB
    const { error } = await supabase.from('anamneses').insert([
      {
        cliente_id: cliente.id,
        respostas: respostas
      }
    ]);

    if (!error) {
      setSucesso(true);
    } else {
      alert("Erro ao salvar ficha: " + error.message);
    }
  };

  if (carregando) {
    return <div className="min-h-screen bg-neutral-950 text-neutral-400 flex items-center justify-center text-sm">Carregando formulário seguro...</div>;
  }

  if (sucesso) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl p-6 text-center space-y-4">
          <div className="flex justify-center text-emerald-500"><CheckCircle2 size={56} className="animate-bounce" /></div>
          <h2 className="text-xl font-bold">Ficha Salva com Sucesso!</h2>
          <p className="text-sm text-neutral-400">Obrigada, <span className="text-amber-400 font-bold">{cliente?.nome_completo}</span>. Seus dados de saúde foram registrados e sua marquinha está segura na nossa agenda.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center p-4 py-8">
      <div className="w-full max-w-xl bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-2xl">
        
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">Ficha de Anamnese</h1>
          <p className="text-xs text-neutral-400 mt-1">Clínica Feita de Bronze</p>
          {cliente && <p className="text-sm text-amber-500 font-medium mt-3">Cliente: {cliente.nome_completo}</p>}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* BLOCO 1: CLÍNICO */}
          <div className="space-y-4 bg-neutral-950 p-4 rounded-xl border border-neutral-800/60">
            <h2 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2 mb-2"><HeartPulse size={14}/> Histórico de Saúde</h2>
            
            <div className="flex justify-between items-center bg-neutral-900 p-2.5 rounded-lg border border-neutral-800">
              <span className="text-sm text-neutral-300">Tem Pressão Alta?</span>
              <div className="flex gap-2">
                <button type="button" onClick={() => atualizarCampo('pressao_alta', 'sim')} className={`px-3 py-1 rounded text-xs font-bold ${respostas.pressao_alta === 'sim' ? 'bg-red-600 text-white' : 'bg-neutral-800'}`}>SIM</button>
                <button type="button" onClick={() => atualizarCampo('pressao_alta', 'nao')} className={`px-3 py-1 rounded text-xs font-bold ${respostas.pressao_alta === 'nao' ? 'bg-emerald-600 text-white' : 'bg-neutral-800'}`}>NÃO</button>
              </div>
            </div>

            <div>
              <label className="text-xs text-neutral-400 font-medium block mb-1">Alguma doença de pele ou tratamento médico atual?</label>
              <input type="text" placeholder="Caso não tenha, deixe em branco" value={respostas.doenca_pele_tratamento} onChange={e => atualizarCampo('doenca_pele_tratamento', e.target.value)} className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2.5 text-sm focus:outline-none focus:border-amber-500" />
            </div>

            <div className="flex justify-between items-center bg-neutral-900 p-2.5 rounded-lg border border-neutral-800">
              <span className="text-sm text-neutral-300">Sofreu algum acidente recentemente?</span>
              <div className="flex gap-2">
                <button type="button" onClick={() => atualizarCampo('acidente_recente', 'sim')} className={`px-3 py-1 rounded text-xs font-bold ${respostas.acidente_recente === 'sim' ? 'bg-amber-500 text-black' : 'bg-neutral-800'}`}>SIM</button>
                <button type="button" onClick={() => atualizarCampo('acidente_recente', 'nao')} className={`px-3 py-1 rounded text-xs font-bold ${respostas.acidente_recente === 'nao' ? 'bg-emerald-600 text-white' : 'bg-neutral-800'}`}>NÃO</button>
              </div>
            </div>
            {respostas.acidente_recente === 'sim' && (
              <input type="text" placeholder="Qual acidente?" value={respostas.detalhes_acidente} onChange={e => atualizarCampo('detalhes_acidente', e.target.value)} className="w-full bg-neutral-900 border border-amber-500/50 rounded-lg p-2.5 text-sm focus:outline-none" />
            )}

            <div className="flex justify-between items-center bg-neutral-900 p-2.5 rounded-lg border border-neutral-800">
              <span className="text-sm text-neutral-300">Cirurgia plástica ou cirurgia recente?</span>
              <div className="flex gap-2">
                <button type="button" onClick={() => atualizarCampo('cirurgia_recente', 'sim')} className={`px-3 py-1 rounded text-xs font-bold ${respostas.cirurgia_recente === 'sim' ? 'bg-amber-500 text-black' : 'bg-neutral-800'}`}>SIM</button>
                <button type="button" onClick={() => atualizarCampo('cirurgia_recente', 'nao')} className={`px-3 py-1 rounded text-xs font-bold ${respostas.cirurgia_recente === 'nao' ? 'bg-emerald-600 text-white' : 'bg-neutral-800'}`}>NÃO</button>
              </div>
            </div>
            {respostas.cirurgia_recente === 'sim' && (
              <div className="grid grid-cols-2 gap-2">
<input type="text" placeholder="Qual cirurgia?" value={respostas.qual_cirurgia} onChange={e => atualizarCampo('qual_cirurgia', e.target.value)} className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2.5 text-sm" />
                <input type="text" placeholder="Há quanto tempo?" value={respostas.tempo_cirurgia} onChange={e => atualizarCampo('tempo_cirurgia', e.target.value)} className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2.5 text-sm" />
              </div>
            )}

            <div>
              <label className="text-xs text-neutral-400 font-medium block mb-1">Tem algum tipo de alergia?</label>
              <input type="text" placeholder="Produtos, cremes, remédios..." value={respostas.alergias} onChange={e => atualizarCampo('alergias', e.target.value)} className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2.5 text-sm focus:outline-none focus:border-amber-500" />
            </div>

            <div>
              <label className="text-xs text-neutral-400 font-medium block mb-1">Usa algum creme ou ácido facial atualmente?</label>
              <input type="text" placeholder="Ex: Vitamina C, Retinol, Ácido Glicólico..." value={respostas.creme_facial_uso} onChange={e => atualizarCampo('creme_facial_uso', e.target.value)} className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2.5 text-sm focus:outline-none focus:border-amber-500" />
            </div>

            <div className="flex justify-between items-center bg-neutral-900 p-2.5 rounded-lg border border-neutral-800">
              <span className="text-sm text-neutral-300">Está gestante ou amamentando?</span>
              <div className="flex gap-2">
                <button type="button" onClick={() => atualizarCampo('gestante_ou_amamentando', 'sim')} className={`px-3 py-1 rounded text-xs font-bold ${respostas.gestante_ou_amamentando === 'sim' ? 'bg-red-600' : 'bg-neutral-800'}`}>SIM</button>
                <button type="button" onClick={() => atualizarCampo('gestante_ou_amamentando', 'nao')} className={`px-3 py-1 rounded text-xs font-bold ${respostas.gestante_ou_amamentando === 'nao' ? 'bg-emerald-600' : 'bg-neutral-800'}`}>NÃO</button>
              </div>
            </div>

            <div className="flex justify-between items-center bg-neutral-900 p-2.5 rounded-lg border border-neutral-800">
              <span className="text-sm text-neutral-300">Sofre de epilepsia ou claustrofobia?</span>
              <div className="flex gap-2">
                <button type="button" onClick={() => atualizarCampo('epilepsia_ou_claustrofobia', 'sim')} className={`px-3 py-1 rounded text-xs font-bold ${respostas.epilepsia_ou_claustrofobia === 'sim' ? 'bg-amber-600 text-white' : 'bg-neutral-800'}`}>SIM</button>
                <button type="button" onClick={() => atualizarCampo('epilepsia_ou_claustrofobia', 'nao')} className={`px-3 py-1 rounded text-xs font-bold ${respostas.epilepsia_ou_claustrofobia === 'nao' ? 'bg-emerald-600 text-white' : 'bg-neutral-800'}`}>NÃO</button>
              </div>
            </div>
          </div>

          {/* BLOCO 2: REGRAS UV CRÍTICAS */}
          <div className="space-y-4 bg-neutral-950 p-4 rounded-xl border border-neutral-800/60">
            <h2 className="text-xs font-bold uppercase tracking-wider text-red-400 flex items-center gap-2 mb-2"><ShieldAlert size={14}/> Alertas de Restrição UV</h2>
            
            <div className="flex justify-between items-center bg-neutral-900 p-2.5 rounded-lg border border-neutral-800">
              <span className="text-sm text-neutral-300">Usa Roacutan nos últimos 6 meses?</span>
              <div className="flex gap-2">
                <button type="button" onClick={() => atualizarCampo('uso_roacutan_6meses', 'sim')} className={`px-3 py-1 rounded text-xs font-bold ${respostas.uso_roacutan_6meses === 'sim' ? 'bg-red-600 text-white' : 'bg-neutral-800'}`}>SIM</button>
                <button type="button" onClick={() => atualizarCampo('uso_roacutan_6meses', 'nao')} className={`px-3 py-1 rounded text-xs font-bold ${respostas.uso_roacutan_6meses === 'nao' ? 'bg-emerald-600 text-white' : 'bg-neutral-800'}`}>NÃO</button>
              </div>
            </div>

            <div className="flex justify-between items-center bg-neutral-900 p-2.5 rounded-lg border border-neutral-800">
              <span className="text-sm text-neutral-300">Usa ácidos atualmente (Vit C, Retinol, Glicólico)?</span>
              <div className="flex gap-2">
                <button type="button" onClick={() => atualizarCampo('uso_acidos_atualmente', 'sim')} className={`px-3 py-1 rounded text-xs font-bold ${respostas.uso_acidos_atualmente === 'sim' ? 'bg-amber-500 text-black' : 'bg-neutral-800'}`}>SIM</button>
                <button type="button" onClick={() => atualizarCampo('uso_acidos_atualmente', 'nao')} className={`px-3 py-1 rounded text-xs font-bold ${respostas.uso_acidos_atualmente === 'nao' ? 'bg-emerald-600 text-white' : 'bg-neutral-800'}`}>NÃO</button>
              </div>
            </div>

            <div className="flex justify-between items-center bg-neutral-900 p-2.5 rounded-lg border border-neutral-800">
              <span className="text-sm text-neutral-300">Tomando antibiótico ou anti-inflamatório?</span>
              <div className="flex gap-2">
                <button type="button" onClick={() => atualizarCampo('antibioticos_antiinflamatorios', 'sim')} className={`px-3 py-1 rounded text-xs font-bold ${respostas.antibioticos_antiinflamatorios === 'sim' ? 'bg-amber-500 text-black' : 'bg-neutral-800'}`}>SIM</button>
                <button type="button" onClick={() => atualizarCampo('antibioticos_antiinflamatorios', 'nao')} className={`px-3 py-1 rounded text-xs font-bold ${respostas.antibioticos_antiinflamatorios === 'nao' ? 'bg-emerald-600 text-white' : 'bg-neutral-800'}`}>NÃO</button>
              </div>
            </div>
          </div>

          {/* BLOCO 3: HÁBITOS */}
          <div className="space-y-4 bg-neutral-950 p-4 rounded-xl border border-neutral-800/60">
            <h2 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2 mb-2"><Sparkles size={14}/> Hábitos e Cuidados</h2>
            
            <div className="flex justify-between items-center bg-neutral-900 p-2.5 rounded-lg border border-neutral-800">
              <span className="text-sm text-neutral-300">Pratica atividade física regular?</span>
              <div className="flex gap-2">
                <button type="button" onClick={() => atualizarCampo('pratica_atividade_fisica', 'sim')} className={`px-3 py-1 rounded text-xs font-bold ${respostas.pratica_atividade_fisica === 'sim' ? 'bg-amber-500 text-black' : 'bg-neutral-800'}`}>SIM</button>
                <button type="button" onClick={() => atualizarCampo('pratica_atividade_fisica', 'nao')} className={`px-3 py-1 rounded text-xs font-bold ${respostas.pratica_atividade_fisica === 'nao' ? 'bg-emerald-600 text-white' : 'bg-neutral-800'}`}>NÃO</button>
              </div>
            </div>

            <div className="flex justify-between items-center bg-neutral-900 p-2.5 rounded-lg border border-neutral-800">
              <span className="text-sm text-neutral-300">Tem o hábito de se expor ao sol frequentemente?</span>
              <div className="flex gap-2">
                <button type="button" onClick={() => atualizarCampo('exposicao_sol_frequente', 'sim')} className={`px-3 py-1 rounded text-xs font-bold ${respostas.exposicao_sol_frequente === 'sim' ? 'bg-amber-500 text-black' : 'bg-neutral-800'}`}>SIM</button>
                <button type="button" onClick={() => atualizarCampo('exposicao_sol_frequente', 'nao')} className={`px-3 py-1 rounded text-xs font-bold ${respostas.exposicao_sol_frequente === 'nao' ? 'bg-emerald-600 text-white' : 'bg-neutral-800'}`}>NÃO</button>
              </div>
            </div>

            <div className="flex justify-between items-center bg-neutral-900 p-2.5 rounded-lg border border-neutral-800">
              <span className="text-sm text-neutral-300">Se alimentou antes de vir à sessão?</span>
              <div className="flex gap-2">
                <button type="button" onClick={() => atualizarCampo('se_alimentou_antes', 'sim')} className={`px-3 py-1 rounded text-xs font-bold ${respostas.se_alimentou_antes === 'sim' ? 'bg-emerald-600 text-white' : 'bg-neutral-800'}`}>SIM</button>
                <button type="button" onClick={() => atualizarCampo('se_alimentou_antes', 'nao')} className={`px-3 py-1 rounded text-xs font-bold ${respostas.se_alimentou_antes === 'nao' ? 'bg-red-600 text-white' : 'bg-neutral-800'}`}>NÃO</button>
              </div>
            </div>
            {respostas.se_alimentou_antes === 'sim' && (
              <input type="text" placeholder="Qual foi o horário da última refeição? (Ex: 11:30)" value={respostas.horario_alimentacao} onChange={e => atualizarCampo('horario_alimentacao', e.target.value)} className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2.5 text-sm" />
            )}
          </div>

          <button type="submit" disabled={!cliente?.id} className="w-full bg-gradient-to-r from-amber-500 to-orange-600 font-bold py-3.5 rounded-xl text-sm transition hover:brightness-110 disabled:opacity-40 flex items-center justify-center gap-2"><UserCheck size={18}/> Enviar Minha Ficha Digital</button>
        
        </form>
      </div>
    </div>
  );
}

// 2. Exportamos a página principal envolvendo o formulário com o Suspense obrigatório
export default function AnamnesePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-neutral-950 text-neutral-400 flex items-center justify-center text-sm">Carregando ambiente seguro...</div>}>
      <AnamneseForm />
    </Suspense>
  );
}
