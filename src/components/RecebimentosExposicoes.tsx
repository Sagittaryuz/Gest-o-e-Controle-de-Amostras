/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { DatabaseService } from '../services/db';
import { Solicitacao, Exposicao, ConferenciaMensal, User } from '../types';
import { 
  Check, Camera, CheckCircle, RefreshCw, X, 
  AlertTriangle, Eye, ShieldAlert, BadgeHelp, CheckSquare, ArrowLeft
} from 'lucide-react';

interface RecebimentosExposicoesProps {
  user: User;
  onNavigateTo: (page: string) => void;
  // page subview toggle: 'recebimento' or 'exposicao' or 'conferencia'
  subView?: 'recebimento' | 'exposicao' | 'conferencia';
}

export default function RecebimentosExposicoes({ user, onNavigateTo, subView = 'recebimento' }: RecebimentosExposicoesProps) {
  const [activeTab, setActiveTab] = useState<'recebimento' | 'exposicao' | 'conferencia'>(subView);
  
  // Data lists
  const [transitSolicitacoes, setTransitSolicitacoes] = useState<Solicitacao[]>([]);
  const [receivedSolicitacoes, setReceivedSolicitacoes] = useState<Solicitacao[]>([]);
  const [exposicoesList, setExposicoesList] = useState<Exposicao[]>([]);
  const [conferencias, setConferencias] = useState<ConferenciaMensal[]>([]);

  // Focus structures
  const [activeSolicitacao, setActiveSolicitacao] = useState<Solicitacao | null>(null);
  const [activeExposicaoSolId, setActiveExposicaoSolId] = useState<string>('');
  const [activeConferencia, setActiveConferencia] = useState<ConferenciaMensal | null>(null);

  // Recebimento parameters state
  const [itensRecebimentos, setItensRecebimentos] = useState<Record<string, {
    quantidadeRecebida: number;
    divergencia: boolean;
    avaria: boolean;
    motivoDivergencia: string;
  }>>({});
  
  // Exposicao checklist checks
  const [expParam, setExpParam] = useState({
    amostraId: '',
    produtoExposto: 'sim' as 'sim' | 'não',
    localExposicao: '',
    integridadeFisica: true,
    limpezaConservacao: true,
    identificacaoCorreta: true,
    localizacaoAdequada: true,
    fotos: [] as string[],
    observacoes: ''
  });

  const [exposicaoItensState, setExposicaoItensState] = useState<Record<string, {
    integridadeFisica: boolean;
    limpezaConservacao: boolean;
    identificacaoCorreta: boolean;
    localizacaoAdequada: boolean;
    fotos: string[];
    observacoes: string;
  }>>({});

  // Photo simulation
  const [cameraUploading, setCameraUploading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState('');
  const [actionError, setActionError] = useState('');

  const isGerente = user.perfil === 'Gerente';
  const myStore = user.loja;

  useEffect(() => {
    loadLists();
    return DatabaseService.subscribe(loadLists);
  }, [activeTab, activeSolicitacao, activeExposicaoSolId, activeConferencia]);

  useEffect(() => {
    setActiveTab(subView);
  }, [subView]);

  const loadLists = () => {
    let sList = DatabaseService.getSolicitacoes();
    let exList = DatabaseService.getExposicoes();
    let confList = DatabaseService.getConferencias();

    // Sort solicitacoes descending
    sList = [...sList].sort((a, b) => {
      const timeA = new Date(a.createdAt || a.dataSolicitacao || 0).getTime();
      const timeB = new Date(b.createdAt || b.dataSolicitacao || 0).getTime();
      return timeB - timeA;
    });

    // Sort exposicoes descending
    exList = [...exList].sort((a, b) => {
      const timeA = new Date(a.createdAt || 0).getTime();
      const timeB = new Date(b.createdAt || 0).getTime();
      return timeB - timeA;
    });

    // Sort conferencias descending
    confList = [...confList].sort((a, b) => {
      const timeA = a.enviadoEm ? new Date(a.enviadoEm).getTime() : 0;
      const timeB = b.enviadoEm ? new Date(b.enviadoEm).getTime() : 0;
      if (timeA !== timeB) return timeB - timeA;
      return b.id.localeCompare(a.id);
    });

    // Filter by store if user is Gerente
    const filteredS = isGerente ? sList.filter(s => s.lojasDestino.includes(myStore)) : sList;
    const filteredEx = isGerente ? exList.filter(e => e.loja === myStore) : exList;
    const filteredConf = isGerente ? confList.filter(c => c.loja === myStore) : confList;

    // Transitos = Enviada
    setTransitSolicitacoes(filteredS.filter(s => s.status === 'Enviada' || s.status === 'Com divergência'));
    // Received = Ready for Expo proof
    setReceivedSolicitacoes(filteredS.filter(s => s.status === 'Exposição pendente' || s.status === 'Recebida parcialmente'));
    
    setExposicoesList(filteredEx);
    setConferencias(filteredConf);
  };

  const handleSimularFotoExposicao = () => {
    setCameraUploading(true);
    setTimeout(() => {
      const dummyPhoto = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200"><rect width="300" height="200" fill="%230f172a" /><text x="50%25" y="50%25" fill="%23fbbf24" font-size="12" font-family="sans-serif" text-anchor="middle" font-weight="bold">AMOSTRA CONFORME J. CRUZEIRO [${new Date().toLocaleDateString()}]</text></svg>`;
      setExpParam(prev => ({
        ...prev,
        // Append simulated photo
        fotos: [...prev.fotos, dummyPhoto]
      }));
      setCameraUploading(false);
    }, 850);
  };

  const fileToDataUri = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
      reader.readAsDataURL(file);
    });
  };

  const handleRealFotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setCameraUploading(true);
      try {
        const file = e.target.files[0];
        const dataUri = await fileToDataUri(file);
        setExpParam(prev => ({
          ...prev,
          fotos: [...prev.fotos, dataUri]
        }));
      } catch (err) {
        console.error(err);
      } finally {
        setCameraUploading(false);
      }
    }
  };

  // --- Recebimentos Actions ---
  const handleStartReceber = (sol: Solicitacao) => {
    setActiveSolicitacao(sol);
    const initialChecked: typeof itensRecebimentos = {};
    sol.itens.forEach(it => {
      initialChecked[it.amostraId] = {
        quantidadeRecebida: it.quantidadeSeparada,
        divergencia: false,
        avaria: false,
        motivoDivergencia: ''
      };
    });
    setItensRecebimentos(initialChecked);
    setActionError('');
    setActionSuccess('');
  };

  const handleUpdateRecField = (amostraId: string, field: string, value: any) => {
    setItensRecebimentos(prev => {
      const current = { ...prev[amostraId], [field]: value };
      
      if (field === 'quantidadeRecebida') {
        const item = activeSolicitacao?.itens.find(i => i.amostraId === amostraId);
        if (item) {
          current.divergencia = Number(value) !== item.quantidadeSeparada;
        }
      }
      return { ...prev, [amostraId]: current };
    });
  };

  const handleSubmeterRecebimento = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSolicitacao) return;

    setActionError('');
    setActionSuccess('');

    const itensArray = activeSolicitacao.itens.map(it => {
      const checkedData = itensRecebimentos[it.amostraId];
      return {
        amostraId: it.amostraId,
        quantidadeRecebida: checkedData?.quantidadeRecebida ?? 0,
        divergencia: checkedData?.divergencia ?? false,
        avaria: checkedData?.avaria ?? false,
        motivoDivergencia: checkedData?.motivoDivergencia ?? ''
      };
    });

    try {
      DatabaseService.registrarRecebimentoLoja({
        solicitacaoId: activeSolicitacao.id,
        itensRecebidos: itensArray,
        fotos: expParam.fotos, // optional at receipt
        observacao: expParam.observacoes
      }, user);

      setActionSuccess('Confirmação de recebimento operacional gravada! Encomenda transferida para controle de exposição.');
      setTimeout(() => {
        setActiveSolicitacao(null);
        setExpParam(prev => ({ ...prev, fotos: [] }));
        setActiveTab('exposicao');
      }, 2000);
    } catch (err: any) {
      setActionError(err.message || 'Erro ao registrar conferência.');
    }
  };

  // --- Exposicao actions ---
  const handleStartComprovacao = (sol: Solicitacao) => {
    setActiveExposicaoSolId(sol.id);
    const initialStates: Record<string, any> = {};
    sol.itens.forEach(it => {
      initialStates[it.amostraId] = {
        integridadeFisica: true,
        limpezaConservacao: true,
        identificacaoCorreta: true,
        localizacaoAdequada: true,
        fotos: [],
        observacoes: ''
      };
    });
    setExposicaoItensState(initialStates);
    setActionError('');
    setActionSuccess('');
  };

  const handleUpdateExposicaoItemCheck = (amostraId: string, field: 'integridadeFisica' | 'limpezaConservacao' | 'identificacaoCorreta' | 'localizacaoAdequada', checked: boolean) => {
    setExposicaoItensState(prev => {
      const itemState = prev[amostraId] || {
        integridadeFisica: true,
        limpezaConservacao: true,
        identificacaoCorreta: true,
        localizacaoAdequada: true,
        fotos: [],
        observacoes: ''
      };
      return {
        ...prev,
        [amostraId]: {
          ...itemState,
          [field]: checked
        }
      };
    });
  };

  const handleUpdateExposicaoItemObs = (amostraId: string, value: string) => {
    setExposicaoItensState(prev => {
      const itemState = prev[amostraId] || {
        integridadeFisica: true,
        limpezaConservacao: true,
        identificacaoCorreta: true,
        localizacaoAdequada: true,
        fotos: [],
        observacoes: ''
      };
      return {
        ...prev,
        [amostraId]: {
          ...itemState,
          observacoes: value
        }
      };
    });
  };

  const handleRemoveExposicaoItemFoto = (amostraId: string, imgIdx: number) => {
    setExposicaoItensState(prev => {
      const itemState = prev[amostraId];
      if (!itemState) return prev;
      const copyFotos = [...itemState.fotos];
      copyFotos.splice(imgIdx, 1);
      return {
        ...prev,
        [amostraId]: {
          ...itemState,
          fotos: copyFotos
        }
      };
    });
  };

  const handleRealFotoUploadForItem = async (amostraId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setCameraUploading(true);
      try {
        const file = e.target.files[0];
        const dataUri = await fileToDataUri(file);
        setExposicaoItensState(prev => {
          const itemState = prev[amostraId] || {
            integridadeFisica: true,
            limpezaConservacao: true,
            identificacaoCorreta: true,
            localizacaoAdequada: true,
            fotos: [],
            observacoes: ''
          };
          return {
            ...prev,
            [amostraId]: {
              ...itemState,
              fotos: [...itemState.fotos, dataUri]
            }
          };
        });
      } catch (err) {
        console.error(err);
      } finally {
        setCameraUploading(false);
      }
    }
  };

  const handleSubmeterExposicao = (e: React.FormEvent) => {
    e.preventDefault();
    setActionError('');
    setActionSuccess('');

    const sol = receivedSolicitacoes.find(s => s.id === activeExposicaoSolId);
    if (!sol) return;

    // Build the items payload
    const batchItens = sol.itens.map(it => {
      const state = exposicaoItensState[it.amostraId] || {
        integridadeFisica: true,
        limpezaConservacao: true,
        identificacaoCorreta: true,
        localizacaoAdequada: true,
        fotos: [],
        observacoes: ''
      };
      return {
        amostraId: it.amostraId,
        integridadeFisica: state.integridadeFisica,
        limpezaConservacao: state.limpezaConservacao,
        identificacaoCorreta: state.identificacaoCorreta,
        localizacaoAdequada: state.localizacaoAdequada,
        fotos: state.fotos,
        observacoes: state.observacoes
      };
    });

    // Check that each item has at least one photo
    const missingPhotoItem = sol.itens.find(it => {
      const state = exposicaoItensState[it.amostraId];
      return !state || state.fotos.length === 0;
    });

    if (missingPhotoItem) {
      setActionError(`Erro Crítico: O Upload de foto comprovando a exposição é obrigatório para o produto "${missingPhotoItem.descricao}"!`);
      return;
    }

    try {
      DatabaseService.registrarComprovacoesExposicaoLote({
        solicitacaoId: activeExposicaoSolId,
        itens: batchItens
      }, user);

      setActionSuccess('Todas as comprovações de exposição foram gravadas e enviadas com sucesso! Aguardando auditoria de Guilherme.');
      setTimeout(() => {
        setActiveExposicaoSolId('');
        setActionSuccess('');
      }, 2000);
    } catch (err: any) {
      setActionError(err.message || 'Erro ao registrar.');
    }
  };

  // --- Conferencia Mensal reply ---
  const handleSubmeterConferencia = (conf: ConferenciaMensal) => {
    setActionError('');
    setActionSuccess('');

    try {
      DatabaseService.responderConferenciaMensal(conf.id, {
        itensResult: conf.itens,
        fotosComplementares: conf.fotos || []
      }, user);

      setActionSuccess('Inventário Mensal de Amostras Obrigatórias respondido com sucesso!');
      setTimeout(() => {
        setActiveConferencia(null);
        setActionSuccess('');
      }, 2000);
    } catch (err: any) {
      setActionError(err.message || 'Falha ao responder conferência.');
    }
  };

  const handleUpdateConfItemField = (idx: number, field: string, value: any) => {
    if (!activeConferencia) return;
    const items = [...activeConferencia.itens];
    items[idx] = { ...items[idx], [field]: value };
    setActiveConferencia({ ...activeConferencia, itens: items });
  };

  return (
    <div className="space-y-6" id="loja_exposicao_panel">
      {/* Tab Navigation */}
      {subView !== 'conferencia' && (
        <div className="flex border-b border-slate-200 bg-white shadow-xs p-1 rounded-lg gap-2 overflow-x-auto no-print shrink-0">
          <button 
            onClick={() => { setActiveTab('recebimento'); setActiveSolicitacao(null); }}
            className={`btn-operational px-4 py-2 rounded-md text-xs font-semibold whitespace-nowrap transition-all border ${
              activeTab === 'recebimento' ? 'bg-[#0A1D37] text-white border-[#0A1D37]' : 'bg-slate-50 text-slate-500 hover:text-[#0A1D37] border-slate-200'
            }`}
          >
            Recebimento de Cargas ({transitSolicitacoes.length})
          </button>
          <button 
            onClick={() => { setActiveTab('exposicao'); setActiveExposicaoSolId(''); }}
            className={`btn-operational px-4 py-2 rounded-md text-xs font-semibold whitespace-nowrap transition-all border ${
              activeTab === 'exposicao' ? 'bg-[#0A1D37] text-white border-[#0A1D37]' : 'bg-slate-50 text-slate-500 hover:text-[#0A1D37] border-slate-200'
            }`}
          >
            Comprovação de Exposição ({receivedSolicitacoes.length})
          </button>
        </div>
      )}

      {/* RENDER VIEW: RECEBIMENTO */}
      {activeTab === 'recebimento' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-lg border border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-display font-bold text-slate-800">Conferência no Descarregamento</h3>
              <p className="text-xs text-slate-400 mt-1">Sempre compare as peças físicas entregues com a listagem enviada pelo CD no Protocolo.</p>
            </div>
            {isGerente && (
              <span className="text-[10px] bg-indigo-50 text-indigo-700 font-bold px-3 py-1 font-mono rounded-full uppercase">
                {myStore}
              </span>
            )}
          </div>

          {activeSolicitacao && (
            /* Formulário de Conferência de Recebimento Popup Over */
            <div 
              onClick={() => setActiveSolicitacao(null)}
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto cursor-pointer animate-in fade-in duration-200"
            >
              <div 
                onClick={e => e.stopPropagation()}
                className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xl space-y-4 w-full max-w-4xl cursor-default animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]"
              >
                <div className="flex justify-between items-center border-b border-slate-150 pb-3 shrink-0">
                  <h4 className="font-display font-bold text-[#0A1D37] text-sm flex items-center gap-1.5">
                    Conferencia de Descarregamento da Remessa {activeSolicitacao.numero}
                  </h4>
                  <button onClick={() => setActiveSolicitacao(null)} className="text-slate-500 hover:text-slate-850 hover:bg-slate-100 rounded p-1">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {actionError && <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-md shrink-0">{actionError}</div>}
                {actionSuccess && <div className="p-3 bg-green-50 border border-green-200 text-green-800 text-xs rounded-md font-semibold shrink-0">{actionSuccess}</div>}

                <form onSubmit={handleSubmeterRecebimento} className="space-y-4 overflow-y-auto pr-1 flex-1">
                  {activeSolicitacao.itens.map(it => {
                    const check = itensRecebimentos[it.amostraId] || {
                      quantidadeRecebida: it.quantidadeSeparada,
                      divergencia: false,
                      avaria: false,
                      motivoDivergencia: ''
                    };

                    return (
                      <div key={it.id} className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3 text-xs leading-relaxed">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                          <div>
                            <span className="font-mono bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded text-[10px] font-bold">
                              {it.codigoAdm}
                            </span>
                            <strong className="text-slate-800 block mt-1">{it.descricao}</strong>
                          </div>

                          <div className="flex items-center gap-2">
                            <div className="text-center bg-white border border-slate-200 p-2 rounded">
                              <span className="text-[9px] uppercase font-mono block text-slate-400 font-semibold">Enviado CD</span>
                              <span className="font-bold text-slate-800 text-sm font-display">{it.quantidadeSeparada}</span>
                            </div>

                            <div className="text-center bg-slate-50 border border-slate-200 text-slate-800 p-2 rounded">
                              <label className="text-[9px] uppercase font-bold block text-slate-400">Rec. Loja</label>
                              <input 
                                type="number" 
                                value={check.quantidadeRecebida}
                                onChange={e => handleUpdateRecField(it.amostraId, 'quantidadeRecebida', Number(e.target.value))}
                                className="bg-transparent border-none text-center font-bold font-display text-sm w-12 focus:ring-0 focus:outline-none"
                                min={0}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Quebra física/avaria na recepção */}
                        <div className="flex flex-wrap items-center gap-4 pt-1">
                          <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-slate-700">
                            <input 
                              type="checkbox" 
                              checked={check.avaria}
                              onChange={e => handleUpdateRecField(it.amostraId, 'avaria', e.target.checked)}
                              className="rounded border-slate-300 text-red-650 w-4 h-4 focus:ring-red-500 cursor-pointer"
                            />
                            <span className="text-red-650">Peça quebrada ou avariada no trânsito?</span>
                          </label>

                          {check.divergencia && (
                            <input 
                              type="text" 
                              placeholder="Adicione obrigatoriamente a justificativa para divergência de quantidade..."
                              value={check.motivoDivergencia}
                              onChange={e => handleUpdateRecField(it.amostraId, 'motivoDivergencia', e.target.value)}
                              className="flex-1 px-3 py-1 border border-rose-200 bg-white text-xs rounded focus:outline-none"
                              required
                            />
                          )}
                        </div>
                      </div>
                    );
                  })}

                  <div className="flex justify-end gap-2 border-t border-slate-100 pt-4 shrink-0">
                    <button 
                      type="button" 
                      onClick={() => setActiveSolicitacao(null)} 
                      className="px-4 py-2 border border-slate-200 text-slate-600 rounded text-xs font-semibold hover:bg-slate-50 cursor-pointer flex items-center gap-1"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" /> Voltar
                    </button>
                    <button type="submit" className="px-5 py-2 bg-[#0A1D37] hover:bg-slate-805 text-white font-bold rounded text-xs cursor-pointer shadow-sm">
                      Confirmar Recebimento de Carga
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {!activeSolicitacao && (
            /* Lista de cargas a caminho */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {transitSolicitacoes.length > 0 ? (
                transitSolicitacoes.map(s => (
                  <div key={s.id} className="bg-white p-5 rounded-lg border border-slate-200 flex flex-col justify-between hover:border-[#0A1D37]/20 transition-all">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-mono font-bold text-slate-800 text-xs bg-slate-100 p-1 px-2 rounded">
                          {s.numero}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-[#0A1D37]">
                          Carga Despachada CD
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">
                        Disparo da Remessa: {new Date(s.dataSolicitacao).toLocaleDateString()}
                      </p>
                      
                      <div className="text-xs bg-slate-50 p-3 rounded space-y-1">
                        <span className="font-semibold block text-slate-600 uppercase font-mono text-[10px]">Carga a caminho:</span>
                        {s.itens.map((it, i) => (
                          <span key={i} className="block text-slate-500 font-medium">• {it.codigoAdm} - {it.descricao} (Entregar: {it.quantidadeSeparada})</span>
                        ))}
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-slate-100 flex justify-end">
                      <button 
                        onClick={() => handleStartReceber(s)}
                        className="btn-operational px-4 py-2 bg-slate-100 hover:bg-slate-200 text-[#0A1D37] text-xs font-bold rounded flex items-center gap-1 cursor-pointer border border-slate-200"
                      >
                        <Check className="w-4 h-4" /> Verificar Carga
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="bg-slate-55 p-8 rounded border border-dashed text-center text-slate-400 md:col-span-2">
                  <CheckCircle className="w-8 h-8 text-slate-250 mx-auto mb-1" />
                  <p className="text-xs">Nenhum veículo em trânsito com carga cadastrada para a loja.</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* RENDER VIEW: EXPOSICAO */}
      {activeTab === 'exposicao' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-lg border border-slate-100">
            <h3 className="font-display font-bold text-slate-800">Comprovação Física por Fotos</h3>
            <p className="text-xs text-slate-400 mt-1">Selecione o lote descarregado e registre o upload das fotos físicas expondo as peças.</p>
          </div>

          {activeExposicaoSolId && (
            /* Formulário de Upload de Foto de Exposição Popup Over */
            <div 
              onClick={() => setActiveExposicaoSolId('')}
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto cursor-pointer animate-in fade-in duration-200"
            >
              <div 
                onClick={e => e.stopPropagation()}
                className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xl space-y-4 w-full max-w-4xl cursor-default animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]"
              >
                <div className="flex justify-between items-center border-b border-slate-150 pb-2 shrink-0">
                  <h4 className="font-display font-bold text-[#0A1D37] text-sm flex items-center gap-1.5">
                    Registrando Prova de Gôndola
                  </h4>
                  <button onClick={() => setActiveExposicaoSolId('')} className="text-slate-500 hover:text-slate-850 hover:bg-slate-100 rounded p-1">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {actionError && <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-md shrink-0">{actionError}</div>}
                {actionSuccess && <div className="p-3 bg-green-50 border border-green-200 text-green-800 text-xs rounded-md font-semibold shrink-0">{actionSuccess}</div>}

                <form onSubmit={handleSubmeterExposicao} className="space-y-4 overflow-y-auto pr-1 flex-1 text-xs leading-relaxed">
                  
                  {receivedSolicitacoes.find(s => s.id === activeExposicaoSolId)?.itens.map((it, idx) => {
                    const itemState = exposicaoItensState[it.amostraId] || {
                      integridadeFisica: true,
                      limpezaConservacao: true,
                      identificacaoCorreta: true,
                      localizacaoAdequada: true,
                      fotos: [],
                      observacoes: ''
                    };

                    return (
                      <div key={it.amostraId} className="p-4 border border-slate-200 rounded-lg bg-white space-y-4 shadow-xs">
                        {/* Title of the product */}
                        <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded border border-slate-100">
                          <span className="font-bold text-slate-800 text-xs">
                            Produto {idx + 1}: <strong className="text-[#0A1D37]">{it.codigoAdm}</strong> - {it.descricao}
                          </span>
                          <span className="text-[10px] bg-slate-100 text-slate-650 p-1 px-2 rounded font-mono font-bold">
                            Amostra Qtd: {it.quantidadeRecebida || 1}
                          </span>
                        </div>

                        {/* Checklist Obrigatório */}
                        <div className="space-y-2">
                          <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                            Checklist Obrigatório
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 bg-slate-50/55 rounded-lg border border-slate-150 font-medium text-slate-700">
                            
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input 
                                type="checkbox" 
                                checked={itemState.integridadeFisica} 
                                onChange={e => handleUpdateExposicaoItemCheck(it.amostraId, 'integridadeFisica', e.target.checked)} 
                                className="rounded text-red-650 focus:ring-0" 
                              />
                              Peça está 100% Íntegra (sem trincos, riscos ou avarias)
                            </label>

                            <label className="flex items-center gap-2 cursor-pointer">
                              <input 
                                type="checkbox" 
                                checked={itemState.limpezaConservacao} 
                                onChange={e => handleUpdateExposicaoItemCheck(it.amostraId, 'limpezaConservacao', e.target.checked)} 
                                className="rounded text-red-650 focus:ring-0" 
                              />
                              Produto limpo e conservado
                            </label>

                            <label className="flex items-center gap-2 cursor-pointer">
                              <input 
                                type="checkbox" 
                                checked={itemState.identificacaoCorreta} 
                                onChange={e => handleUpdateExposicaoItemCheck(it.amostraId, 'identificacaoCorreta', e.target.checked)} 
                                className="rounded text-red-650 focus:ring-0" 
                              />
                              Possui etiqueta de identificação e preço
                            </label>

                            <label className="flex items-center gap-2 cursor-pointer">
                              <input 
                                type="checkbox" 
                                checked={itemState.localizacaoAdequada} 
                                onChange={e => handleUpdateExposicaoItemCheck(it.amostraId, 'localizacaoAdequada', e.target.checked)} 
                                className="rounded text-red-650 focus:ring-0" 
                              />
                              Organização Visual Padrão da Loja respeitada
                            </label>

                          </div>
                        </div>

                        {/* Comprovação por Foto */}
                        <div className="space-y-2">
                          <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                            Comprovação por Foto
                          </span>
                          
                          <div className="flex gap-3 flex-wrap items-center">
                            {/* Camera Upload trigger for real smartphones */}
                            <label className="p-3 px-5 border border-slate-200 bg-slate-50 hover:bg-slate-100/80 hover:border-slate-350 text-center flex flex-col items-center justify-center gap-1 cursor-pointer transition-all shrink-0 rounded-lg">
                              <Camera className="w-5 h-5 text-indigo-600 block mx-auto" />
                              <span className="text-[10px] font-bold block text-slate-700">Abrir Câmera Real</span>
                              <input 
                                type="file" 
                                accept="image/*" 
                                capture="environment" 
                                onChange={e => handleRealFotoUploadForItem(it.amostraId, e)} 
                                className="hidden" 
                              />
                            </label>

                            {/* Active photos list */}
                            {itemState.fotos.length > 0 ? (
                              itemState.fotos.map((f, i) => (
                                <div key={i} className="relative w-24 h-20 rounded border border-slate-200 overflow-hidden shrink-0 group">
                                  <img src={f} className="w-full h-full object-cover" />
                                  <button 
                                    type="button" 
                                    onClick={() => handleRemoveExposicaoItemFoto(it.amostraId, i)}
                                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 cursor-pointer shadow hover:bg-red-600 transition-colors"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ))
                            ) : (
                              <span className="text-[10px] text-red-500 font-medium italic animate-pulse">
                                * Pelo menos 1 foto é necessária para comprovar a exposição
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Notas da Exposição */}
                        <div className="space-y-1">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                            Notas da Exposição
                          </label>
                          <textarea 
                            value={itemState.observacoes}
                            onChange={e => handleUpdateExposicaoItemObs(it.amostraId, e.target.value)}
                            placeholder="Adicione observações sobre a exposição deste produto..."
                            className="w-full px-3 py-1.5 border border-slate-200 rounded-md focus:ring-1 focus:ring-slate-300 outline-none text-xs"
                            rows={1.5}
                          />
                        </div>

                      </div>
                    );
                  })}

                  <div className="flex justify-end gap-2 border-t border-slate-150 pt-4 shrink-0 font-sans">
                    <button 
                      type="button" 
                      onClick={() => setActiveExposicaoSolId('')} 
                      className="px-4 py-2 border border-slate-200 text-slate-600 rounded flex items-center gap-1 cursor-pointer hover:bg-slate-50 font-semibold text-xs"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" /> Voltar
                    </button>
                    <button type="submit" className="px-6 py-2 bg-[#0A1D37] hover:bg-slate-800 text-white font-bold rounded cursor-pointer text-xs shadow-sm">
                      Validar e Submeter Provas de Exposição
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {!activeExposicaoSolId && (
            /* Lista de itens aguardando exposição */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {receivedSolicitacoes.length > 0 ? (
                receivedSolicitacoes.map(s => (
                  <div key={s.id} className="bg-white p-5 rounded-lg border border-slate-200 flex flex-col justify-between hover:border-[#0A1D37]/20 transition-all">
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="font-mono font-bold text-slate-800 bg-slate-100 p-1 px-2 rounded">
                          {s.numero}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-red-50 text-red-650 border border-red-100">
                          Exposição Pendente
                        </span>
                      </div>
                      <p className="text-slate-400">Peças disponíveis em loja pendentes de exposição.</p>
                      
                      <div className="p-3 bg-slate-50 rounded space-y-1">
                        <span className="font-semibold block text-slate-600">Peças para Colar Código ADM:</span>
                        {s.itens.map((it, i) => (
                          <span key={i} className="block text-slate-500 font-medium">• {it.codigoAdm} - {it.descricao} (Amostra Qtd: {it.quantidadeRecebida})</span>
                        ))}
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-slate-100 flex justify-end">
                      <button 
                        onClick={() => handleStartComprovacao(s)}
                        className="btn-operational px-4 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-[#0A1D37] text-xs font-bold rounded flex items-center gap-1 cursor-pointer"
                      >
                        <Camera className="w-4 h-4" /> Comprovar Exposição (Foto)
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="bg-slate-55 p-8 border border-dashed text-slate-400 rounded text-center md:col-span-2">
                  <CheckSquare className="w-8 h-8 text-slate-250 mx-auto mb-1" />
                  <p className="text-xs">Não restam remessas descarregadas pendentes de comprovação física.</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* RENDER VIEW: CONFERENCIA MENSAL */}
      {activeTab === 'conferencia' && (
        <div className="space-y-4 text-xs leading-relaxed">
          <div className="bg-white p-4 rounded-lg border border-slate-100 flex justify-between items-center flex-wrap gap-2">
            <div>
              <h3 className="font-display font-bold text-slate-800">Conferência Física Mensal Obrigatória</h3>
              <p className="text-slate-400 mt-0.5">Disparada mensalmente para auditoria de 100% de produtos obrigatórios nas lojas.</p>
            </div>
            
            {user.perfil === 'Admin' && (
              <button 
                onClick={() => {
                  try {
                    DatabaseService.gerarCompetenciaMensal('06/2026', user);
                    alert('Competência mensal 06/2026 criada e disparada para todas as lojas J. Cruzeiro!');
                    loadLists();
                  } catch (e: any) {
                    alert(e.message);
                  }
                }}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-205 text-[#0A1D37] font-bold border rounded border-slate-200 cursor-pointer"
              >
                Gerar Competência de Exibição (Novo Mês)
              </button>
            )}
          </div>

          {activeConferencia && (
            /* Formulário Ativo de Preenchimento da conferência Popup Over */
            <div 
              onClick={() => setActiveConferencia(null)}
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto cursor-pointer animate-in fade-in duration-200"
            >
              <div 
                onClick={e => e.stopPropagation()}
                className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xl space-y-4 w-full max-w-4xl cursor-default animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]"
              >
                <div className="flex justify-between items-center border-b border-slate-150 pb-2 shrink-0">
                  <h4 className="font-display font-bold text-[#0A1D37] text-sm flex items-center gap-1.5">
                    Respondendo Inventário {activeConferencia.competencia} - {activeConferencia.loja}
                  </h4>
                  <button onClick={() => setActiveConferencia(null)} className="text-slate-500 hover:text-slate-805 hover:bg-slate-100 rounded p-1">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {actionError && <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-md shrink-0">{actionError}</div>}
                {actionSuccess && <div className="p-3 bg-green-50 border border-green-200 text-green-800 text-xs rounded-md font-semibold shrink-0">{actionSuccess}</div>}

                <div className="space-y-4 overflow-y-auto pr-1 flex-1 max-h-[460px]">
                  {activeConferencia.itens.map((it, idx) => (
                    <div key={idx} className="p-4 bg-slate-50 border border-slate-200 rounded space-y-3">
                      <div className="flex justify-between items-center flex-wrap gap-2 text-xs">
                        <div>
                          <span className="font-mono bg-slate-200 text-slate-700 font-bold p-0.5 px-1.5 rounded">{it.codigoAdm}</span>
                          <strong className="text-slate-800 block mt-1">{it.descricao}</strong>
                        </div>

                        <select 
                          value={it.statusExposicao}
                          onChange={e => handleUpdateConfItemField(idx, 'statusExposicao', e.target.value)}
                          className="px-3 py-1 bg-white border border-slate-205 rounded text-xs focus:ring-red-500 focus:border-[#0A1D37] font-semibold"
                        >
                          <option value="Exposto corretamente">Exposto corretamente</option>
                          <option value="Não exposto">Não exposto</option>
                          <option value="Avariado">Avariado / Quebrado</option>
                          <option value="Pendente de reposição">Pendente de reposição</option>
                          <option value="Produto inexistente">Produto inexistente na loja</option>
                          <option value="Exposição inadequada">Exposição inadequada</option>
                        </select>
                      </div>

                      {/* Quality factors checkbox checklist */}
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 pt-2 border-t border-slate-150 font-semibold text-slate-600 text-[10px]">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input type="checkbox" checked={it.integridadeFisica} onChange={e => handleUpdateConfItemField(idx, 'integridadeFisica', e.target.checked)} className="rounded text-red-650 focus:ring-0" />
                          Íntegro
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input type="checkbox" checked={it.limpeza} onChange={e => handleUpdateConfItemField(idx, 'limpeza', e.target.checked)} className="rounded text-red-650 focus:ring-0" />
                          Limpo
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input type="checkbox" checked={it.conservacao} onChange={e => handleUpdateConfItemField(idx, 'conservacao', e.target.checked)} className="rounded text-red-650 focus:ring-0" />
                          Conservado
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input type="checkbox" checked={it.identificacaoCorreta} onChange={e => handleUpdateConfItemField(idx, 'identificacaoCorreta', e.target.checked)} className="rounded text-red-650 focus:ring-0" />
                          Código Colado
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input type="checkbox" checked={it.localizacaoAdequada} onChange={e => handleUpdateConfItemField(idx, 'localizacaoAdequada', e.target.checked)} className="rounded text-red-650 focus:ring-0" />
                          Padronizado
                        </label>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end gap-2 border-t pt-4 shrink-0">
                  <button 
                    type="button" 
                    onClick={() => setActiveConferencia(null)} 
                    className="px-4 py-2 border border-slate-200 text-slate-600 rounded font-semibold cursor-pointer text-xs flex items-center gap-1"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Voltar
                  </button>
                  <button 
                    type="button" 
                    onClick={() => handleSubmeterConferencia(activeConferencia)} 
                    className="px-6 py-2 bg-[#0A1D37] text-white hover:bg-slate-800 font-bold rounded cursor-pointer text-xs shadow-sm"
                  >
                    Finalizar e Enviar Inventário Mensal
                  </button>
                </div>
              </div>
            </div>
          )}

          {!activeConferencia && (
            /* Lista das competências vigentes */
            <div className="bg-white rounded border overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-400 font-mono border-b border-slate-100 text-[10px] uppercase">
                    <th className="p-4">Mês/Ano</th>
                    <th className="p-4">Loja avaliada</th>
                    <th className="p-4 text-center">Prazo Limite para Resposta</th>
                    <th className="p-4">Status Auditoria</th>
                    <th className="p-4 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                  {conferencias.length > 0 ? (
                    conferencias.map(c => (
                      <tr key={c.id} className="hover:bg-slate-50/50">
                        <td className="p-4 font-mono font-bold text-slate-800 text-sm">{c.competencia}</td>
                        <td className="p-4 text-slate-600">{c.loja}</td>
                        <td className="p-4 text-center text-red-500">Até {c.prazoResposta} (5º dia útil)</td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-mono font-bold inline-block border ${
                            c.status === 'Pendente' ? 'bg-red-50 text-red-700 border-red-100 animate-pulse font-bold' : 'bg-green-50 text-green-700 border-green-200'
                          }`}>
                            {c.status}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <button 
                            onClick={() => setActiveConferencia(c)}
                            className="bg-[#0A1D37] text-white text-xs font-bold p-1 px-3 rounded hover:bg-slate-800 cursor-pointer"
                          >
                            {c.status === 'Pendente' ? 'Responder Auditoria' : 'Rever Respostas'}
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-400 italic">
                        <BadgeHelp className="w-8 h-8 mx-auto text-slate-200 mb-1" />
                        Nenhuma competência mensal de showroom ativa no momento.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
