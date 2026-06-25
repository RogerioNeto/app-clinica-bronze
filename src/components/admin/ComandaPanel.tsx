'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { PlusCircle } from 'lucide-react';
import type {
  Agendamento, Produto, ComandaProduto,
} from '@/hooks/useAdminData';

interface ComandaPanelProps {
  agendamentos: Agendamento[];
  produtos: Produto[];
  buscarDadosGerais: () => Promise<void>;
}

export function ComandaPanel({
  agendamentos, produtos, buscarDadosGerais,
}: ComandaPanelProps) {
  const [agendamentoSelecionadoComanda, setAgendamentoSelecionadoComanda] = useState<string | null>(null);
  const [produtoSelecionadoComanda, setProdutoSelecionadoComanda] = useState<string | null>(null);
  const [quantidadeComanda, setQuantidadeComanda] = useState<number>(1);
  const [formaPagamentoRestante, setFormaPagamentoRestante] = useState<string>('pix');
  const [itensConsumidos, setItensConsumidos] = useState<ComandaProduto[]>([]);
  const [semAnamnese, setSemAnamnese] = useState(false);

  const carregarItensComanda = async (agendamentoId: string | null) => {
    if (!agendamentoId) { setItensConsumidos([]); setSemAnamnese(false); return; }
    const { data } = await supabase.from('comanda_produtos').select('*, produtos(nome)').eq('agendamento_id', agendamentoId);
    if (data) setItensConsumidos(data);
  };

  const verificarAnamnese = async (agendamentoId: string | null) => {
    if (!agendamentoId) { setSemAnamnese(false); return; }
    const agObj = agendamentos.find(a => a.id === agendamentoId);
    if (!agObj) { setSemAnamnese(false); return; }
    const { data } = await supabase.from('anamneses').select('id').eq('cliente_id', agObj.cliente_id).limit(1);
    setSemAnamnese(!data || data.length === 0);
  };

  useEffect(() => {
    carregarItensComanda(agendamentoSelecionadoComanda);
    verificarAnamnese(agendamentoSelecionadoComanda);
  }, [agendamentoSelecionadoComanda]);

  const calcularRestanteAcumulado = () => {
    const agObj = agendamentos.find(a => a.id === agendamentoSelecionadoComanda);
    if (!agObj) return { subtotalBronze: 0, sinalPago: 0, restanteBronze: 0, totalProdutos: 0, totalGeralPagar: 0 };
    const subtotalBronze = Number(agObj.valor_procedimentos);
    const sinalPago = Number(agObj.valor_sinal);
    const restanteBronze = subtotalBronze - sinalPago;
    const totalProdutos = itensConsumidos.reduce((s, i) => s + (Number(i.preco_unitario) * i.quantidade), 0);
    return { subtotalBronze, sinalPago, restanteBronze, totalProdutos, totalGeralPagar: restanteBronze + totalProdutos };
  };

  const lancarItemComanda = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agendamentoSelecionadoComanda || !produtoSelecionadoComanda) {
      alert("Selecione um agendamento e um produto.");
      return;
    }

    const agObj = agendamentos.find(a => a.id === agendamentoSelecionadoComanda);
    if (agObj?.status === 'CONCLUÍDO') {
      alert("❌ Operação Bloqueada! Esta comanda já está encerrada.");
      return;
    }

    if (semAnamnese) {
      alert("❌ BLOQUEADO: Esta cliente ainda não preencheu a Ficha de Anamnese digital. É obrigatório o preenchimento antes de abrir a comanda.");
      return;
    }

    const pObj = produtos.find(p => p.id === produtoSelecionadoComanda);
    if (!pObj || pObj.estoque_atual < quantidadeComanda) {
      alert("⚠️ Estoque insuficiente!");
      return;
    }

    await supabase.from('comanda_produtos').insert([{
      agendamento_id: agendamentoSelecionadoComanda,
      produto_id: produtoSelecionadoComanda,
      quantidade: quantidadeComanda,
      preco_unitario: pObj.preco_venda,
    }]);
    await supabase.from('produtos').update({ estoque_atual: pObj.estoque_atual - quantidadeComanda }).eq('id', produtoSelecionadoComanda);

    await Promise.all([
      buscarDadosGerais(),
      carregarItensComanda(agendamentoSelecionadoComanda),
    ]);
    alert("✅ Item adicionado à comanda da cliente com sucesso!");
  };

  const fecharComandaTotal = async () => {
    if (!agendamentoSelecionadoComanda) return;
    try {
      const agObj = agendamentos.find(a => a.id === agendamentoSelecionadoComanda);
      if (!agObj) return;

      const { data: anamneseData } = await supabase
        .from('anamneses')
        .select('id')
        .eq('cliente_id', agObj.cliente_id)
        .limit(1);

      if (!anamneseData || anamneseData.length === 0) {
        alert("❌ Esta cliente ainda não preencheu a ficha de anamnese digital.");
        return;
      }

      const { totalGeralPagar } = calcularRestanteAcumulado();

      const check = await supabase.from('fluxo_caixa').select('id')
        .eq('agendamento_id', agendamentoSelecionadoComanda)
        .like('descricao', '%Fechamento Total%');

      if (check.data && check.data.length > 0) {
        const { error: errUp } = await supabase
          .from('agendamentos')
          .update({ status: 'CONCLUÍDO' })
          .eq('id', agendamentoSelecionadoComanda)
          .select();
        if (errUp) throw errUp;
        setAgendamentoSelecionadoComanda(null);
        await Promise.all([buscarDadosGerais(), carregarItensComanda(null)]);
        alert("✅ Esta comanda já estava paga. Status sincronizado para CONCLUÍDO!");
        return;
      }

      if (confirm(`Fechar conta e receber R$ ${totalGeralPagar.toFixed(2)} via ${formaPagamentoRestante.toUpperCase()}?`)) {
        const { error: errCaixa } = await supabase.from('fluxo_caixa').insert([{
          unidade_id: agObj.unidade_id,
          tipo: 'entrada',
          valor: totalGeralPagar,
          descricao: `Fechamento Total: ${agObj.clientes?.nome_completo} (${formaPagamentoRestante.toUpperCase()})`,
          forma_pagamento: formaPagamentoRestante,
          agendamento_id: agendamentoSelecionadoComanda,
        }]);
        if (errCaixa) throw errCaixa;

        const { error: errUp } = await supabase
          .from('agendamentos')
          .update({ status: 'CONCLUÍDO' })
          .eq('id', agendamentoSelecionadoComanda)
          .select();
        if (errUp) throw errUp;

        alert("🎉 Comanda encerrada e baixada com sucesso!");
        setAgendamentoSelecionadoComanda(null);
        await Promise.all([buscarDadosGerais(), carregarItensComanda(null)]);
      }
    } catch (err: any) {
      console.error("Erro no fechamento:", err);
      alert("❌ Erro ao fechar comanda: " + (err.message || "Verifique permissões."));
    }
  };

  const restante = calcularRestanteAcumulado();
  const agSelecionado = agendamentos.find(a => a.id === agendamentoSelecionadoComanda);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Consumo e Fechamento de Comanda</h1>

      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
        <form onSubmit={lancarItemComanda} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="text-xs text-neutral-400 block mb-2">Clientes com Sessão Iniciada</label>
            <select
              value={agendamentoSelecionadoComanda || ''}
              onChange={e => setAgendamentoSelecionadoComanda(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-sm text-white"
            >
              <option value="">Selecione uma cliente...</option>
              {agendamentos
                .filter(a => a.status === 'CONFIRMADO')
                .map(a => (
                  <option key={a.id} value={a.id}>
                    {a.clientes?.nome_completo} ({new Date(a.data_hora_inicio).toLocaleDateString('pt-BR')})
                  </option>
                ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-neutral-400 block mb-2">Produto</label>
            <select
              value={produtoSelecionadoComanda || ''}
              onChange={e => setProdutoSelecionadoComanda(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-sm text-white"
            >
              <option value="">Escolha...</option>
              {produtos.map(p => (
                <option key={p.id} value={p.id}>
                  {p.nome} (Estoque: {p.estoque_atual})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-neutral-400 block mb-2">Quantidade</label>
            <input
              type="number" min="1"
              value={quantidadeComanda}
              onChange={e => setQuantidadeComanda(parseInt(e.target.value))}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-sm text-white"
            />
          </div>
          <button
            type="submit"
            disabled={!agendamentoSelecionadoComanda}
            className="bg-amber-500 text-black font-bold p-3 rounded-lg text-sm flex items-center justify-center gap-2 disabled:opacity-40"
          >
            <PlusCircle size={14} /> Lançar Item
          </button>
        </form>
      </div>

      {semAnamnese && agendamentoSelecionadoComanda && (
        <div className="bg-red-950/40 border border-red-800 rounded-2xl p-4 flex items-start gap-3">
          <span className="text-red-400 text-lg">⚠️</span>
          <div>
            <p className="text-sm font-bold text-red-400">Anamnese Pendente</p>
            <p className="text-xs text-red-300/80 mt-1">
              Esta cliente ainda não preencheu a Ficha de Anamnese digital.
              É obrigatório o preenchimento para abrir a comanda e lançar produtos.
              Solicite que ela acesse o link enviado no WhatsApp.
            </p>
          </div>
        </div>
      )}

      {agendamentoSelecionadoComanda && !semAnamnese && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 md:col-span-2 space-y-2">
            <h3 className="text-sm font-bold text-neutral-200">Produtos Consumidos</h3>
            {itensConsumidos.map((item) => (
              <div key={item.id} className="py-2 border-b border-neutral-800 text-xs flex justify-between">
                <div>
                  <span>{item.produtos?.nome}</span>
                  <span className="text-neutral-500"> (x{item.quantidade})</span>
                </div>
                <strong>R$ {(Number(item.preco_unitario) * item.quantidade).toFixed(2)}</strong>
              </div>
            ))}
            {itensConsumidos.length === 0 && (
              <p className="text-xs text-neutral-500 py-4 text-center">Nenhum produto na comanda.</p>
            )}
          </div>

          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-amber-400">Resumo da Conta</h3>
            <div className="space-y-1.5 text-xs text-neutral-400">
              <div className="flex justify-between">
                <span>Restante Bronze:</span>
                <span>R$ {restante.restanteBronze.toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-b border-neutral-800 pb-2">
                <span>Total Lingeries:</span>
                <span>R$ {restante.totalProdutos.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-sm font-bold text-white pt-2">
                <span>A pagar na clínica:</span>
                <span className="text-amber-400 text-base">R$ {restante.totalGeralPagar.toFixed(2)}</span>
              </div>
            </div>

            {agSelecionado?.status === 'CONCLUÍDO' ? (
              <div className="bg-neutral-950 border border-neutral-800 p-3 rounded-xl text-center text-xs font-bold text-neutral-400">
                🔒 COMANDA JÁ FECHADA
              </div>
            ) : (
              <>
                <div className="space-y-1">
                  <label className="text-[11px] text-neutral-400 block font-medium">Método de Recebimento:</label>
                  <select
                    value={formaPagamentoRestante}
                    onChange={e => setFormaPagamentoRestante(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-xs text-white focus:outline-none"
                  >
                    <option value="pix">Pix</option>
                    <option value="cartao_credito">Cartão de Crédito</option>
                    <option value="cartao_debito">Cartão de Débito</option>
                    <option value="dinheiro">Dinheiro (Espécie)</option>
                  </select>
                </div>
                <button
                  onClick={fecharComandaTotal}
                  className="w-full bg-emerald-600 text-neutral-950 font-black py-2.5 rounded-lg text-xs"
                >
                  FECHAR CONTA E RECEBER
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Status das Comandas */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden mt-6">
        <div className="p-4 bg-neutral-950 border-b border-neutral-800 font-bold text-xs text-neutral-400 uppercase tracking-wider">
          Status das Comandas Recentes
        </div>
        <div className="divide-y divide-neutral-800 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-neutral-500 uppercase font-black bg-neutral-900/50">
                <th className="p-3">Cliente</th>
                <th className="p-3">Data</th>
                <th className="p-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {agendamentos
                .filter(a => a.status === 'CONFIRMADO' || a.status === 'CONCLUÍDO')
                .slice(0, 10)
                .map(a => (
                  <tr key={a.id} className="hover:bg-neutral-800/30">
                    <td className="p-3 font-medium">{a.clientes?.nome_completo}</td>
                    <td className="p-3">{new Date(a.data_hora_inicio).toLocaleDateString('pt-BR')}</td>
                    <td className="p-3 text-right">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${a.status === 'CONCLUÍDO' ? 'bg-blue-900/40 text-blue-400' : 'bg-emerald-900/40 text-emerald-400 animate-pulse'}`}>
                        {a.status === 'CONCLUÍDO' ? 'FECHADA' : 'EM ATENDIMENTO'}
                      </span>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
