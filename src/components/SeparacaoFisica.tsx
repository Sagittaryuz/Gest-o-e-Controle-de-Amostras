/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { DatabaseService } from '../services/db';
import { Solicitacao, ProtocoloEnvio, User } from '../types';
import { 
  Check, Play, Printer, ChevronRight, X, 
  AlertTriangle, ClipboardList, CheckSquare, ArrowLeft 
} from 'lucide-react';

interface SeparacaoFisicaProps {
  user: User;
  onNavigateTo: (page: string) => void;
}

export default function SeparacaoFisica({ user, onNavigateTo }: SeparacaoFisicaProps) {
  const [solicitacoesPendentes, setSolicitacoesPendentes] = useState<Solicitacao[]>([]);
  const [activeSolicitacao, setActiveSolicitacao] = useState<Solicitacao | null>(null);
  
  // Checking data for picking process
  const [itensSeparados, setItensSeparados] = useState<Record<string, {
    quantidadeSeparada: number;
    divergente: boolean;
    avariaCD: boolean;
    avariaTexto: string;
    observacao: string;
  }>>({});

  const [observacaoGeral, setObservacaoGeral] = useState('');
  const [successInfo, setSuccessInfo] = useState('');
  const [errorInfo, setErrorInfo] = useState('');

  const [placaVeiculo, setPlacaVeiculo] = useState('');
  const [nomeMotorista, setNomeMotorista] = useState('');
  const [dbVeiculos, setDbVeiculos] = useState<{ id: string; placa: string; modelo: string }[]>([]);
  const [dbMotoristas, setDbMotoristas] = useState<{ id: string; nome: string; cnh: string }[]>([]);

  // Built printable protocol view
  const [generatedProtocol, setGeneratedProtocol] = useState<ProtocoloEnvio | null>(null);

  const canSeparate = user.perfil === 'Admin' || user.perfil === 'Separador';

  useEffect(() => {
    loadList();
    return DatabaseService.subscribe(loadList);
  }, [activeSolicitacao]);

  useEffect(() => {
    setDbVeiculos(DatabaseService.getVeiculos());
    setDbMotoristas(DatabaseService.getMotoristas());
  }, []);

  const loadList = () => {
    const list = DatabaseService.getSolicitacoes();
    // Separators can list everything marked "Liberada para separação" or "Em separação"
    const relevant = list.filter(s => s.status === 'Liberada para separação' || s.status === 'Em separação');
    relevant.sort((a, b) => {
      const timeA = new Date(a.createdAt || a.dataSolicitacao || 0).getTime();
      const timeB = new Date(b.createdAt || b.dataSolicitacao || 0).getTime();
      return timeB - timeA;
    });
    setSolicitacoesPendentes(relevant);
  };

  const handleStartSeparacao = (sol: Solicitacao) => {
    setActiveSolicitacao(sol);
    DatabaseService.updateSolicitacaoStatus(sol.id, 'Em separação', user, 'Separador iniciou a separação física do lote.');
    
    // Set default identical picks
    const initialChecked: typeof itensSeparados = {};
    sol.itens.forEach(it => {
      initialChecked[it.amostraId] = {
        quantidadeSeparada: it.quantidadeSolicitada, // defaults to perfect pick
        divergente: false,
        avariaCD: false,
        avariaTexto: '',
        observacao: ''
      };
    });
    setItensSeparados(initialChecked);
    setObservacaoGeral('');
    setPlacaVeiculo('');
    setNomeMotorista('');
    setSuccessInfo('');
    setErrorInfo('');
  };

  const handleUpdateItemField = (amostraId: string, field: string, value: any) => {
    setItensSeparados(prev => {
      const current = { ...prev[amostraId], [field]: value };
      
      // Auto toggle divergence flag if qty differs from initial requested
      if (field === 'quantidadeSeparada') {
        const item = activeSolicitacao?.itens.find(i => i.amostraId === amostraId);
        if (item) {
          current.divergente = Number(value) !== item.quantidadeSolicitada;
        }
      }

      return {
        ...prev,
        [amostraId]: current
      };
    });
  };

  const handleSubmeterSeparacao = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSolicitacao) return;

    setErrorInfo('');
    setSuccessInfo('');

    if (!placaVeiculo) {
      setErrorInfo('A placa do veículo é campo obrigatório para finalização da separação e despacho.');
      return;
    }

    if (!nomeMotorista) {
      setErrorInfo('O nome do motorista é campo de seleção obrigatório para expedição de carga.');
      return;
    }

    const itensArray = activeSolicitacao.itens.map(it => {
      const checkedData = itensSeparados[it.amostraId];
      return {
        amostraId: it.amostraId,
        quantidadeSeparada: checkedData?.quantidadeSeparada ?? 0,
        divergente: checkedData?.divergente ?? false,
        avariaCD: checkedData?.avariaCD ?? false,
        avariaTexto: checkedData?.avariaTexto ?? '',
        observacao: checkedData?.observacao ?? ''
      };
    });

    try {
      DatabaseService.processarSeparacaoFisica(activeSolicitacao.id, {
        itensSeparados: itensArray,
        observacaoGeral,
        nomeMotorista,
        placaVeiculo
      }, user);

      setSuccessInfo('Baixa de separação e estoque concluída no CD com sucesso! Emitindo Protocolo Internacional...');
      
      // Load latest generated protocol
      const protocols = DatabaseService.getProtocolos();
      const currentGenerated = protocols.find(p => p.solicitacaoId === activeSolicitacao.id);
      if (currentGenerated) {
        setGeneratedProtocol(currentGenerated);
      }

      setTimeout(() => {
        setActiveSolicitacao(null);
        setSuccessInfo('');
      }, 3000);

    } catch (err: any) {
      setErrorInfo(err.message || 'Erro ao processar as baixas de estoque.');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6" id="picking_panel">
      {/* Printable Protocol Box overlay */}
      {generatedProtocol && (
        <div 
          onClick={() => setGeneratedProtocol(null)}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto print:absolute print:inset-0 print:p-0 print:bg-white animate-in font-display cursor-pointer"
        >
          
          {/* Print helper to override default modal styles on A4 paper */}
          <style dangerouslySetInnerHTML={{ __html: `
            @media print {
              body {
                background: white !important;
                color: black !important;
              }
              .no-print {
                display: none !important;
              }
              @page {
                size: A4 portrait;
                margin: 15mm;
              }
              .fixed {
                position: absolute !important;
                top: 0 !important;
                left: 0 !important;
                right: 0 !important;
                bottom: 0 !important;
                background: white !important;
                padding: 0 !important;
                margin: 0 !important;
                overflow: visible !important;
              }
              .print-a4-card {
                border: none !important;
                box-shadow: none !important;
                max-width: 100% !important;
                width: 100% !important;
                padding: 0 !important;
                margin: 0 !important;
                overflow: visible !important;
              }
            }
          `}} />

          <div 
            onClick={e => e.stopPropagation()}
            className="bg-white rounded-lg border border-slate-200 shadow-2xl w-full max-w-3xl overflow-hidden print:shadow-none print:border-none print-a4-card cursor-default"
          >
            
            {/* Nav controls no-print */}
            <div className="bg-[#0A1D37] text-white p-4 flex justify-between items-center border-b border-red-500/20 no-print font-sans">
              <span className="font-bold text-white text-sm">Protocolo de Despacho Gerado com Sucesso</span>
              <div className="flex gap-2 items-center">
                <button onClick={handlePrint} className="px-3 py-1.5 bg-red-650 hover:bg-red-700 text-white text-xs font-bold rounded flex items-center gap-1 cursor-pointer transition-colors">
                  <Printer className="w-3.5 h-3.5" /> Imprimir em Folha A4
                </button>
                <button 
                  onClick={() => setGeneratedProtocol(null)} 
                  className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 font-semibold text-white text-xs rounded-md shadow-xs cursor-pointer flex items-center gap-1 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Voltar
                </button>
                <button 
                  onClick={() => setGeneratedProtocol(null)} 
                  className="p-1 px-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded text-xs cursor-pointer flex items-center gap-1 transition-colors shadow-xs"
                  title="Fechar Protocolo"
                >
                  <X className="w-4 h-4" /> Fechar (X)
                </button>
              </div>
            </div>

            {/* Print Body */}
            <div className="p-8 space-y-6 text-slate-900 bg-white">
              <div className="flex justify-between items-center border-b-2 border-slate-900 pb-4">
                <div>
                  <h1 className="text-xl font-bold uppercase tracking-wider text-slate-900">J. Cruzeiro Construção & Acabamento</h1>
                  <span className="text-xs text-slate-400 font-mono">Controle Unificado de Amostras de Showrooms</span>
                </div>
                <div className="text-right">
                  <span className="bg-[#0A1D37] text-[10px] text-white px-3 py-1 font-mono font-bold rounded block uppercase">
                    Protocolo de Rastreio
                  </span>
                  <strong className="text-lg font-mono block mt-1 text-slate-800">{generatedProtocol.numero}</strong>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                <div>
                  <p className="text-[10px] uppercase font-mono font-bold text-slate-400">Pedido Origem:</p>
                  <strong className="text-slate-800">{generatedProtocol.solicitacaoNumero}</strong>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-mono font-bold text-slate-400">Data de Envio CD:</p>
                  <strong>{new Date(generatedProtocol.dataEnvio).toLocaleString()}</strong>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-mono font-bold text-slate-400">Loja Destinatária:</p>
                  <strong>{generatedProtocol.lojaDestino}</strong>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-mono font-bold text-slate-400">Responsável Recepção na Loja:</p>
                  <strong>{generatedProtocol.responsavelRecebimento}</strong>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-mono font-bold text-slate-400">Separador Técnico CD:</p>
                  <strong>{generatedProtocol.responsavelSeparacao}</strong>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-mono font-bold text-slate-400">Status Operação:</p>
                  <strong className="text-green-600 font-mono uppercase font-bold text-[10px]">Despachado</strong>
                </div>
                {generatedProtocol.nomeMotorista && (
                  <div>
                    <p className="text-[10px] uppercase font-mono font-bold text-slate-400">Motorista do Caminhão:</p>
                    <strong className="text-slate-805">{generatedProtocol.nomeMotorista}</strong>
                  </div>
                )}
                {generatedProtocol.placaVeiculo && (
                  <div>
                    <p className="text-[10px] uppercase font-mono font-bold text-slate-400">Placa do Veículo:</p>
                    <strong className="font-mono text-blue-900 font-bold">{generatedProtocol.placaVeiculo}</strong>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <h3 className="text-xs bg-[#0A1D37] text-white font-bold p-1 px-2 uppercase font-mono">Carregamento Físico</h3>
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-350 text-slate-400 uppercase font-mono font-bold text-[9px]">
                      <th className="py-2">Código ADM</th>
                      <th className="py-2">Descrição da Peça</th>
                      <th className="py-2">Fabricante</th>
                      <th className="py-2 text-center">Quantidade de Peças</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150">
                    {generatedProtocol.itens.map((it, index) => (
                      <tr key={index}>
                        <td className="py-2.5 font-mono font-bold text-slate-800">{it.codigoAdm}</td>
                        <td className="py-2.5 font-medium">{it.descricao}</td>
                        <td className="py-2.5">{it.marca}</td>
                        <td className="py-2.5 text-center font-bold font-display text-slate-900 text-base">{it.quantidade}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {generatedProtocol.observacoes && (
                <div className="bg-slate-50 p-3 rounded border border-slate-200 text-xs">
                  <p className="font-bold text-slate-500 uppercase font-mono text-[9px]">Observações de Tráfego:</p>
                  <p className="italic text-slate-705 mt-1">"{generatedProtocol.observacoes}"</p>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-10 border-t border-slate-205 text-center text-xs">
                
                {/* Col 1: Separador CD */}
                <div className="space-y-1">
                  <div className="border-t border-slate-300 w-full mx-auto max-w-[170px] mt-4"></div>
                  <p className="font-semibold text-slate-700 text-[11px]">Responsável Separação (CD)</p>
                  <p className="text-[10px] text-slate-400">{generatedProtocol.responsavelSeparacao}</p>
                </div>

                {/* Col 2: Motorista Recebimento de Carga */}
                <div className="space-y-1">
                  <div className="border-t border-slate-300 w-full mx-auto max-w-[170px] mt-4"></div>
                  <p className="font-semibold text-slate-700 text-[11px]">Assinatura de Recebimento de Carga</p>
                  <p className="text-[10px] text-slate-400 font-medium">
                    Motorista: {generatedProtocol.nomeMotorista || 'Motorista do Caminhão'}
                    {generatedProtocol.placaVeiculo ? ` (Placa: ${generatedProtocol.placaVeiculo})` : ''}
                  </p>
                </div>

                {/* Col 3: Assinatura de Quem Recebeu na Loja */}
                <div className="space-y-1">
                  <div className="border-t border-slate-300 w-full mx-auto max-w-[170px] mt-4"></div>
                  <p className="font-semibold text-slate-700 text-[11px]">Assinatura de Recebimento na Loja</p>
                  <p className="text-[10px] text-slate-400 font-medium">
                    Recebedor: {generatedProtocol.responsavelRecebimento || 'Gerência de Destino / Loja'}
                  </p>
                </div>

              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main flow of picking */}
      {!canSeparate ? (
        <div className="bg-red-50 p-6 rounded-lg text-red-800 max-w-xl border border-red-200 leading-relaxed">
          <AlertTriangle className="w-8 h-8 text-red-650 mb-2" />
          <h3 className="font-display font-bold text-base">Área de Operações Físicas Reservada</h3>
          <p className="text-sm mt-1">
            Esta tela é de uso exclusivo dos Separadores da J. Cruzeiro (Juliano e Juliana) ou do Administrador (Guilherme) para dar baixa fatiada no estoque do Centro de Distribuição. Seu usuário atual não possui essa credencial.
          </p>
        </div>
      ) : activeSolicitacao ? (
        /* Painel Ativo de Separação */
        <div className="bg-white rounded-lg border border-slate-200 shadow-xl overflow-hidden animate-in fade-in duration-200">
          <div className="bg-[#0A1D37] text-white p-4 flex justify-between items-center border-b border-red-500/20">
            <div>
              <h3 className="font-display font-bold text-white">Separando Pedido: {activeSolicitacao.numero}</h3>
              <p className="text-[10px] text-slate-300 mt-0.5">Destino: {activeSolicitacao.lojasDestino[0]}</p>
            </div>
            <button onClick={() => setActiveSolicitacao(null)} className="text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmeterSeparacao} className="p-6 space-y-6">
            {errorInfo && <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-md">{errorInfo}</div>}
            {successInfo && <div className="p-3 bg-green-50 border border-green-200 text-green-800 text-xs rounded-md font-semibold">{successInfo}</div>}

            <h4 className="font-display font-bold text-slate-800 text-xs uppercase tracking-wider">Checklist de Itens para Coleta</h4>

            <div className="space-y-4">
              {activeSolicitacao.itens.map(it => {
                const checkData = itensSeparados[it.amostraId] || {
                  quantidadeSeparada: it.quantidadeSolicitada,
                  divergente: false,
                  avariaCD: false,
                  avariaTexto: '',
                  observacao: ''
                };

                return (
                  <div key={it.id} className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                      <div>
                        <span className="font-mono bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded text-[10px] font-bold">
                          {it.codigoAdm}
                        </span>
                        <strong className="text-slate-850 block mt-1 text-sm">{it.descricao}</strong>
                        <span className="text-slate-400 text-xs block">Marca: {it.marca} • Origem: <strong>{it.origem}</strong></span>
                        {it.verbaCompra && <span className="text-blue-600 text-xs font-semibold block">Faturamento Verba: {it.verbaCompra}</span>}
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-center bg-white p-2 px-3 rounded border border-slate-200">
                          <span className="text-[10px] uppercase font-mono font-bold text-slate-400">Solicitado</span>
                          <span className="text-lg font-bold font-display text-slate-900 block">{it.quantidadeSolicitada}</span>
                        </div>

                        <div className="text-center bg-[#0A1D37] text-white p-2 px-3 rounded border border-[#00142b]">
                          <label className="block text-[10px] uppercase font-mono font-bold text-slate-300">Separado Fato</label>
                          <input 
                            type="number" 
                            value={checkData.quantidadeSeparada}
                            onChange={e => handleUpdateItemField(it.amostraId, 'quantidadeSeparada', Number(e.target.value))}
                            className="bg-transparent border-none text-center text-lg font-bold w-12 focus:ring-0 focus:outline-none text-white font-mono"
                            min={0}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Alerta de Divergência se quantidade for diferente */}
                    {checkData.divergente && (
                      <div className="p-2.5 bg-rose-50 border border-rose-200 rounded text-xs text-rose-800 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>A quantidade separada difere da solicitada! Isso gerará um chamado de pendência automática de divergência para Ivan e Guilherme.</span>
                      </div>
                    )}

                    {/* Acionador de Avaria de Prateleira */}
                    <div className="flex flex-wrap items-center gap-4 text-xs pt-1">
                      <label className="flex items-center gap-1.5 font-semibold text-slate-700 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={checkData.avariaCD}
                          onChange={e => handleUpdateItemField(it.amostraId, 'avariaCD', e.target.checked)}
                          className="rounded border-slate-300 text-red-650 w-4 h-4 focus:ring-red-500"
                        />
                        <span className="text-red-500">Material Danificado no CD?</span>
                      </label>

                      {checkData.avariaCD && (
                        <input 
                          type="text" 
                          placeholder="Descreva detalhes do defeito físico..."
                          value={checkData.avariaTexto}
                          onChange={e => handleUpdateItemField(it.amostraId, 'avariaTexto', e.target.value)}
                          className="flex-1 px-3 py-1 bg-white border border-slate-200 rounded focus:outline-none"
                          required
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Veículo e Motorista (Transferido para a tela de Separação Física) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-b border-slate-100 py-4 bg-slate-50/50 p-4 rounded-lg border border-slate-205">
              <div>
                <label className="block text-xs font-bold text-[#0A1D37] uppercase mb-1 flex items-center gap-1">
                  <span>Placa do Veículo</span>
                  <span className="text-red-650 font-bold">*</span>
                </label>
                <select 
                  value={placaVeiculo}
                  onChange={e => setPlacaVeiculo(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm bg-white focus:outline-none focus:border-[#0A1D37] font-semibold text-slate-800"
                >
                  <option value="">-- Escolha uma Placa de Veículo --</option>
                  {dbVeiculos.map(v => (
                    <option key={v.id} value={v.placa}>
                      {v.placa} ({v.modelo})
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-400 mt-1 font-medium">Placa pré-definida no Gerenciamento (não permite digitação livre)</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#0A1D37] uppercase mb-1 flex items-center gap-1">
                  <span>Nome do Motorista</span>
                  <span className="text-red-650 font-bold">*</span>
                </label>
                <select 
                  value={nomeMotorista}
                  onChange={e => setNomeMotorista(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm bg-white focus:outline-none focus:border-[#0A1D37] font-semibold text-slate-800"
                >
                  <option value="">-- Escolha um Motorista --</option>
                  {dbMotoristas.map(m => (
                    <option key={m.id} value={m.nome}>
                      {m.nome} (CNH: {m.cnh})
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-400 mt-1 font-medium">Motorista pré-definido no Gerenciamento (não permite digitação livre)</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Responsável pelo Transporte / Notas Gerais de Despacho</label>
              <textarea 
                value={observacaoGeral}
                onChange={e => setObservacaoGeral(e.target.value)}
                placeholder="Insira dados do motorista, portaria, placa do carro J. Cruzeiro ou anomalias observadas..."
                rows={2}
                className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:border-[#0A1D37]"
              />
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
              <button 
                type="button" 
                onClick={() => setActiveSolicitacao(null)}
                className="btn-operational px-4 py-2 border border-slate-200 text-slate-600 rounded text-sm hover:bg-slate-50 font-semibold cursor-pointer"
              >
                Voltar à Lista
              </button>
              <button 
                type="submit"
                className="btn-operational px-6 py-2 bg-[#0A1D37] hover:bg-slate-800 text-white font-bold rounded text-sm shrink-0 cursor-pointer"
              >
                Confirmar Coleta Físico & dar Baixa CD
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* Lista de Demandas Pendentes de Separação */
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-lg border border-slate-100 space-y-1">
            <h3 className="font-display font-bold text-slate-800">Demandas Pendentes de Separação Físico</h3>
            <p className="text-xs text-slate-500">Visualize as solicitações de envio que já foram liberadas/faturadas pela coordenação e aguardam separação física no CD.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {solicitacoesPendentes.length > 0 ? (
              solicitacoesPendentes.map(s => (
                <div key={s.id} className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs flex flex-col justify-between hover:border-[#0A1D37]/30 transition-all">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-mono font-bold text-slate-800 text-sm">
                        {s.numero}
                      </span>
                    </div>

                    <p className="text-xs text-slate-500">
                      Destino: <strong className="text-slate-700">{s.lojasDestino[0]}</strong>
                    </p>

                    <div className="p-2.5 bg-slate-50 rounded border border-slate-100 text-xs">
                      <span className="font-semibold text-slate-600 text-[11px] block uppercase font-mono mb-1">Amostras Requisitadas:</span>
                      <ul className="space-y-1 list-disc pl-4 text-slate-500 font-medium">
                        {s.itens.map((it, i) => (
                          <li key={i}>{it.codigoAdm} - {it.descricao} (Amostra Qtd: {it.quantidadeSolicitada})</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-100 flex justify-end">
                    <button 
                      onClick={() => handleStartSeparacao(s)}
                      className="btn-operational px-4 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-[#0A1D37] text-xs font-bold rounded flex items-center gap-1 transition-all cursor-pointer"
                    >
                      <Play className="w-4 h-4 text-red-650" /> Iniciar Separação
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="bg-slate-50 rounded-lg p-8 text-center text-slate-400 border border-dashed border-slate-200 md:col-span-2">
                <CheckSquare className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-600">Nenhuma demanda pendente de separação ativa!</p>
                <p className="text-xs text-slate-400">Todo o CD J. Cruzeiro está em dia.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
