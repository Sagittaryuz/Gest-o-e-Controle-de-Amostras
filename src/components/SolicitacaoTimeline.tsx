/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { DatabaseService } from '../services/db';
import { Solicitacao, LogAuditoria, User, Exposicao, ProtocoloEnvio, Recebimento } from '../types';
import { 
  Check, X, ArrowLeft, Clock, AlertTriangle, 
  User as UserIcon, Calendar, Info, MapPin, 
  Truck, Eye, CheckCircle2, AlertCircle 
} from 'lucide-react';

interface SolicitacaoTimelineProps {
  solicitacao: Solicitacao;
  user: User;
  onClose: () => void;
}

export default function SolicitacaoTimeline({ solicitacao, user, onClose }: SolicitacaoTimelineProps) {
  const [logs, setLogs] = useState<LogAuditoria[]>([]);
  const [exposicao, setExposicao] = useState<Exposicao | null>(null);
  const [protocolo, setProtocolo] = useState<ProtocoloEnvio | null>(null);
  const [recebimento, setRecebimento] = useState<Recebimento | null>(null);

  useEffect(() => {
    // 1. Fetch relevant log auditoria entries
    const allLogs = DatabaseService.getLogs();
    const relatedExps = DatabaseService.getExposicoes().filter(e => e.solicitacaoId === solicitacao.id);
    const relatedProtocols = DatabaseService.getProtocolos().filter(p => p.solicitacaoId === solicitacao.id);
    const relatedRecebimentos = DatabaseService.getRecebimentos().filter(r => r.solicitacaoId === solicitacao.id);

    // Save related model instances
    if (relatedExps.length > 0) setExposicao(relatedExps[0]);
    if (relatedProtocols.length > 0) setProtocolo(relatedProtocols[0]);
    if (relatedRecebimentos.length > 0) setRecebimento(relatedRecebimentos[0]);

    const filtered = allLogs.filter(log => {
      // Match by solicitation ID or code/number
      if (log.registroId === solicitacao.id || log.registroId === solicitacao.numero) return true;
      // Match by any related exhibition record ID
      if (relatedExps.some(e => e.id === log.registroId)) return true;
      // Match by any related protocol ID
      if (relatedProtocols.some(p => p.id === log.registroId)) return true;
      // Text matching as a fallback
      if (log.observacao?.includes(solicitacao.numero) || log.observacao?.includes(solicitacao.id)) return true;
      return false;
    });

    // Sort chronologically ascending (oldest first for progression reading)
    const sorted = [...filtered].sort((a, b) => {
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

    setLogs(sorted);
  }, [solicitacao]);

  // Determine stage visual state:
  // - Completed: 'success'
  // - Current/In Progress: 'current'
  // - Has Warn/Divergent: 'error'
  // - Muted/Next: 'pending'

  const getStageStatus = (stage: 'criado' | 'separacao' | 'transporte' | 'recebimento' | 'exposicao') => {
    const status = solicitacao.status;

    if (stage === 'criado') {
      return 'success';
    }

    if (stage === 'separacao') {
      if (['Liberada para separação', 'Em separação'].includes(status)) {
        return 'current';
      }
      if (['Rascunho', 'Aguardando liberação'].includes(status)) {
        return 'pending';
      }
      if (status === 'Cancelada') {
        return 'error';
      }
      return 'success';
    }

    if (stage === 'transporte') {
      if (status === 'Enviada') return 'current';
      if (['Liberada para separação', 'Em separação', 'Rascunho', 'Aguardando liberação'].includes(status)) {
        return 'pending';
      }
      if (status === 'Cancelada') return 'pending';
      return 'success';
    }

    if (stage === 'recebimento') {
      if (status === 'Com divergência') return 'error';
      if (status === 'Recebida parcialmente') return 'error';
      if (['Exposição pendente', 'Exposição comprovada', 'Concluída', 'Recebida'].includes(status)) return 'success';
      if (status === 'Enviada') return 'current';
      return 'pending';
    }

    if (stage === 'exposicao') {
      if (['Exposição comprovada', 'Concluída'].includes(status)) return 'success';
      if (status === 'Exposição pendente') return 'current';
      return 'pending';
    }

    return 'pending';
  };

  const stages = [
    {
      id: 'criado',
      title: 'Pedido Requisitado',
      desc: 'Criação da solicitação comercial',
      icon: Info,
      status: getStageStatus('criado'),
      details: `Disparado por ${solicitacao.solicitanteNome} em ${new Date(solicitacao.dataSolicitacao).toLocaleString()}`
    },
    {
      id: 'separacao',
      title: 'Separação Física',
      desc: 'Triagem e baixa de estoque do CD',
      icon: Clock,
      status: getStageStatus('separacao'),
      details: protocolo 
        ? `Lote separado por ${protocolo.operadorSeparador} em ${new Date(protocolo.emitidoEm).toLocaleDateString()}. Prot: ${protocolo.numero}`
        : solicitacao.status === 'Em separação' ? 'Separação iniciada no galpão' : 'Aguardando operador de picking'
    },
    {
      id: 'transporte',
      title: 'Despachado / Transporte',
      desc: 'Transferência de carga para loja',
      icon: Truck,
      status: getStageStatus('transporte'),
      details: solicitacao.nomeMotorista 
        ? `Motorista: ${solicitacao.nomeMotorista} • Placa: ${solicitacao.placaVeiculo || 'N/D'}`
        : 'Carga aguardando despacho'
    },
    {
      id: 'recebimento',
      title: 'Confirmação de Carga',
      desc: 'Recepção e descarga física',
      icon: CheckCircle2,
      status: getStageStatus('recebimento'),
      details: recebimento 
        ? `Descarregado por ${recebimento.usuarioRecebedorNome} em ${new Date(recebimento.recebidoEm).toLocaleDateString()}. Divergências: ${recebimento.possuiDivergencias ? 'Sim' : 'Não'}`
        : solicitacao.status === 'Enviada' ? 'Veículo em rota de entrega' : 'Aguardando vistoria'
    },
    {
      id: 'exposicao',
      title: 'Exposição no Showroom',
      desc: 'Comprovação por fotos na gôndola',
      icon: Eye,
      status: getStageStatus('exposicao'),
      details: exposicao 
        ? `Exposto por ${exposicao.usuarioVerificadorNome || 'Gerente'} em ${new Date(exposicao.createdAt).toLocaleDateString()} no ${exposicao.localExposicao}`
        : solicitacao.status === 'Exposição pendente' ? 'Instrução aberta (Falta foto)' : 'Aguardando fixação'
    }
  ];

  return (
    <div 
      id="timeline_modal_backdrop"
      onClick={onClose}
      className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto animate-in fade-in duration-200 cursor-pointer"
    >
      <div 
        onClick={e => e.stopPropagation()}
        className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden font-sans cursor-default flex flex-col md:max-h-[90vh]"
      >
        {/* Header no-print */}
        <div className="bg-[#0A1D37] text-white p-5 flex justify-between items-center shrink-0 border-b border-white/5">
          <div className="flex items-center gap-3">
            <button 
              onClick={onClose}
              className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-white"
              title="Voltar"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs bg-red-650 text-white font-mono font-bold px-2 py-0.5 rounded uppercase">
                  {solicitacao.numero}
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-350">
                  Prioridade {solicitacao.prioridade}
                </span>
              </div>
              <h3 className="font-display font-semibold text-white text-base mt-0.5">
                Rastreabilidade e Log Processual do Pedido
              </h3>
            </div>
          </div>
          
          <button 
            onClick={onClose} 
            className="text-slate-450 hover:text-white hover:bg-white/10 p-2 rounded-lg transition-all flex items-center gap-1.5 text-xs font-semibold"
          >
            <X className="w-4 h-4" /> Voltar
          </button>
        </div>

        {/* Scrollable Timeline & Logs Content */}
        <div className="p-6 overflow-y-auto space-y-6 md:flex-1">
          {/* Top general status panel */}
          <div className="bg-slate-50 border border-slate-200/60 p-4 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Status Atual do Fluxo</p>
              <h4 className="text-lg font-bold text-[#0A1D37] mt-0.5">{solicitacao.status}</h4>
              <p className="text-xs text-slate-500 mt-1">
                Lojas de Destino: <strong className="text-slate-700">{solicitacao.lojasDestino.join(', ')}</strong> • Origem: <span className="font-mono font-bold text-slate-600 bg-slate-200/60 px-1 py-0.5 rounded text-[10px]">{solicitacao.lojaOrigem || 'CD'}</span>
              </p>
            </div>
            
            {solicitacao.observacoes && (
              <div className="bg-white p-3 rounded border border-slate-100 text-xs text-slate-600 max-w-md">
                <span className="font-bold block text-[10px] uppercase text-slate-400">Observações Solicitante:</span>
                "{solicitacao.observacoes}"
              </div>
            )}
          </div>

          {/* STEP BY STEP TIMELINE TRAIL */}
          <div className="space-y-4">
            <h4 className="font-display font-bold text-slate-800 text-sm tracking-tight border-b pb-2">
              Progresso Físico da Demanda
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 relative">
              {stages.map((stage, idx) => {
                let badgeColor = 'bg-slate-100 border-slate-200 text-slate-400';
                let iconColor = 'text-slate-400';
                let currentIndicatorClass = '';

                if (stage.status === 'success') {
                  badgeColor = 'bg-green-50 border-green-200 text-green-700';
                  iconColor = 'text-green-600';
                } else if (stage.status === 'current') {
                  badgeColor = 'bg-blue-50 border-blue-200 text-blue-700 font-bold ring-4 ring-blue-50/50';
                  iconColor = 'text-blue-600';
                  currentIndicatorClass = 'border-l-4 md:border-t-4 border-blue-500 animate-pulse';
                } else if (stage.status === 'error') {
                  badgeColor = 'bg-red-50 border-red-200 text-red-700 font-bold ring-4 ring-red-50/50';
                  iconColor = 'text-red-600';
                }

                const StageIcon = stage.icon;

                return (
                  <div 
                    key={stage.id} 
                    className={`p-3.5 rounded-lg border transition-all duration-150 flex flex-col justify-between ${
                      stage.status === 'current' ? 'bg-blue-50/30 border-blue-200' :
                      stage.status === 'error' ? 'bg-red-50/10 border-red-250' : 
                      stage.status === 'success' ? 'bg-green-50/10 border-slate-200' : 'bg-white border-slate-150'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${badgeColor}`}>
                          {stage.status === 'success' ? (
                            <Check className="w-4 h-4 text-green-600 stroke-[3px]" />
                          ) : stage.status === 'error' ? (
                            <AlertTriangle className="w-4 h-4 text-red-650" />
                          ) : (
                            <StageIcon className="w-4 h-4" />
                          )}
                        </span>
                        
                        <span className="text-[10px] font-mono text-slate-400 font-bold">
                          Etapa 0{idx + 1}
                        </span>
                      </div>
                      
                      <h5 className="font-semibold text-slate-800 text-xs">{stage.title}</h5>
                      <p className="text-[10px] text-slate-400 leading-tight mt-0.5">{stage.desc}</p>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-slate-100/85">
                      <p className="text-[9px] text-slate-500 leading-tight font-medium">
                        {stage.details}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* GRANULAR AUDIT LOG TIMELINE */}
          <div className="space-y-4">
            <h4 className="font-display font-bold text-slate-800 text-sm tracking-tight border-b pb-2">
              Histórico Operacional de Logs (Auditoria Relevante)
            </h4>

            {logs.length > 0 ? (
              <div className="relative border-l-2 border-slate-150 ml-4 pl-6 space-y-6 py-1">
                {logs.map((log, index) => {
                  // Style log points
                  let dotColor = 'border-slate-300 bg-slate-200';
                  let actionClass = 'text-slate-800';

                  if (log.acao.toLowerCase().includes('criada') || log.acao.toLowerCase().includes('lançada')) {
                    dotColor = 'bg-blue-600 border-blue-200 ring-4 ring-blue-50';
                    actionClass = 'text-blue-900 font-bold';
                  } else if (log.acao.toLowerCase().includes('concluída') || log.acao.toLowerCase().includes('sucesso') || log.acao.toLowerCase().includes('provada')) {
                    dotColor = 'bg-green-600 border-green-200 ring-4 ring-green-50';
                    actionClass = 'text-green-900 font-bold';
                  } else if (log.acao.toLowerCase().includes('recusada') || log.acao.toLowerCase().includes('erro') || log.acao.toLowerCase().includes('diverg') || log.acao.toLowerCase().includes('cancelada')) {
                    dotColor = 'bg-red-650 border-red-200 ring-4 ring-red-50';
                    actionClass = 'text-red-750 font-bold';
                  } else if (log.acao.toLowerCase().includes('atualiz') || log.acao.toLowerCase().includes('status')) {
                    dotColor = 'bg-indigo-600 border-indigo-200 ring-4 ring-indigo-50';
                    actionClass = 'text-indigo-900 font-medium';
                  }

                  return (
                    <div key={log.id} className="relative group">
                      {/* Timeline Dot icon */}
                      <span className={`absolute -left-[31px] top-1.5 w-4.5 h-4.5 rounded-full border-2 ${dotColor} flex items-center justify-center transition-all`} />

                      <div className="bg-slate-50 border border-slate-150/70 rounded-lg p-3 text-xs shadow-3xs hover:shadow-xs transition-shadow">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-bold ${actionClass}`}>
                              {log.acao}
                            </span>
                            <span className="text-[9px] uppercase font-mono tracking-wider font-bold bg-slate-200 text-slate-650 px-1.5 py-0.5 rounded">
                              {log.modulo}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono">
                            <Calendar className="w-3 h-3" />
                            {new Date(log.createdAt).toLocaleString()}
                          </div>
                        </div>

                        <p className="mt-2 text-slate-650 leading-relaxed bg-white p-2 rounded border border-slate-100 font-mono text-[11px]">
                          {log.observacao || 'Registro de status operacional de amostras.'}
                        </p>

                        <div className="mt-2 flex items-center gap-1.5 text-[10px] text-slate-500">
                          <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                          <span>Responsável: </span>
                          <strong className="text-slate-700">{log.usuarioNome}</strong>
                          <span className="text-slate-300 font-light">•</span>
                          <span className="text-slate-450">ID: {log.usuarioId}</span>
                        </div>

                        {/* Extra values inside log */}
                        {(log.valorAnterior || log.valorNovo) && (
                          <div className="mt-2 pt-2 border-t border-slate-100 grid grid-cols-2 gap-2 text-[10px]">
                            {log.valorAnterior && (
                              <div>
                                <span className="block text-slate-400 font-bold font-mono">Fase Anterior:</span>
                                <span className="text-slate-550 font-mono truncate block max-w-full">{log.valorAnterior}</span>
                              </div>
                            )}
                            {log.valorNovo && (
                              <div>
                                <span className="block text-slate-400 font-bold font-mono">Nova Fase:</span>
                                <span className="text-slate-800 font-mono font-bold truncate block max-w-full">{log.valorNovo}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-6 text-center text-slate-400 italic bg-slate-50 border border-slate-150 rounded-lg">
                <Clock className="w-6 h-6 mx-auto mb-1 text-slate-350" />
                Sem registros adicionais de auditoria em logs para esta solicitação.
              </div>
            )}
          </div>
        </div>

        {/* Footer/Ações no-print */}
        <div className="bg-slate-50 border-t border-slate-200 p-4 shrink-0 flex justify-end gap-2.5">
          <button 
            type="button" 
            onClick={onClose}
            className="px-5 py-2 border border-slate-250 bg-white hover:bg-slate-100 font-semibold rounded text-xs text-slate-700 flex items-center gap-1 cursor-pointer transition-all"
          >
            <ArrowLeft className="w-4 h-4" /> Voltar para Operações
          </button>
        </div>
      </div>
    </div>
  );
}
