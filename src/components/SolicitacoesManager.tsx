/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { DatabaseService } from '../services/db';
import { Solicitacao, Amostra, User } from '../types';
import SolicitacaoTimeline from './SolicitacaoTimeline';
import { 
  Plus, ClipboardList, Clock, CheckCircle, 
  Trash, ChevronDown, Sparkles, HelpCircle, 
  AlertCircle, X, ShieldAlert, Search, ArrowLeft 
} from 'lucide-react';

interface SolicitacoesManagerProps {
  user: User;
  onNavigateTo: (page: string) => void;
  // allow triggering creation directly or starting the form
  isNewFormRequested?: boolean;
}

export default function SolicitacoesManager({ user, onNavigateTo, isNewFormRequested = false }: SolicitacoesManagerProps) {
  const [solicitacoes, setSolicitacoes] = useState<Solicitacao[]>([]);
  const [amostras, setAmostras] = useState<Amostra[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(isNewFormRequested);
  const [selectedSolicitacaoForTimeline, setSelectedSolicitacaoForTimeline] = useState<Solicitacao | null>(null);

  // Form Fields
  const [prioridade, setPrioridade] = useState<'baixa' | 'normal' | 'alta' | 'urgente'>('normal');
  const [lojaOrigem, setLojaOrigem] = useState<string>('CD');
  const [lojasDestino, setLojasDestino] = useState<string[]>(['MATRIZ']);
  const [responsaveisRecebimento, setResponsaveisRecebimento] = useState<Record<string, string>>({
    'MATRIZ': 'Gerente Matriz'
  });
  const [observacoes, setObservacoes] = useState('');
  
  // Open search autocomplete state
  const [productSearchText, setProductSearchText] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedAmostra, setSelectedAmostra] = useState<Amostra | null>(null);

  // Itens para a nova solicitação
  const [formItens, setFormItens] = useState<{
    amostraId: string;
    quantidadeSolicitada: number;
    origem: 'Estoque da empresa' | 'Envio direto da fábrica sem custo';
    verbaCompra?: string;
  }[]>([]);

  // Current selected item to append
  const [currentAmostraId, setCurrentAmostraId] = useState('');
  const [currentQty, setCurrentQty] = useState(1);

  const [formError, setFormError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  const canCreate = user.perfil === 'Admin' || user.perfil === 'Controlador';

  useEffect(() => {
    loadData();
    return DatabaseService.subscribe(loadData);
  }, [isFormOpen]);

  // Synchronize destination manager when store or users list changes
  useEffect(() => {
    if (lojasDestino.length > 0 && users.length > 0) {
      const activeLoja = lojasDestino[0];
      const matchedUser = users.find(u => u.loja === activeLoja && u.cargo === 'OPERADOR DE LOJA');
      if (matchedUser) {
        setResponsaveisRecebimento({ [activeLoja]: matchedUser.nome });
      } else {
        setResponsaveisRecebimento({ [activeLoja]: `Operador de Loja - ${activeLoja}` });
      }
    }
  }, [users, lojasDestino]);

  const loadData = () => {
    const list = DatabaseService.getSolicitacoes();
    const sorted = [...list].sort((a, b) => {
      const timeA = new Date(a.createdAt || a.dataSolicitacao || 0).getTime();
      const timeB = new Date(b.createdAt || b.dataSolicitacao || 0).getTime();
      return timeB - timeA;
    });
    setSolicitacoes(sorted);
    setAmostras(DatabaseService.getAmostras().filter(a => a.status === 'ativo'));
    setUsers(DatabaseService.getUsers());
  };

  const getCodigoOriginal = (a: Amostra): string => {
    if (a.codigoAdm === 'ADM-POR-8001') return 'ELIZ-84-POL-CALACATA';
    if (a.codigoAdm === 'ADM-POR-8002') return 'ELIZ-60-MATT-PORTORO';
    if (a.codigoAdm === 'ADM-POR-8003') return 'ELIZ-120-PNT';
    if (a.codigoAdm === 'ADM-LOU-5001') return 'DECA-MTCRL-W';
    if (a.codigoAdm === 'ADM-MET-4002') return 'DOCOL-MONO-400';
    return `ORIG-FAC-${a.codigoAdm.split('-')[2] || a.id.slice(-4).toUpperCase()}`;
  };

  const filteredSuggestions = productSearchText.trim().length > 0
    ? amostras.filter(a => {
        const query = productSearchText.toLowerCase();
        const origCode = getCodigoOriginal(a).toLowerCase();
        return (
          a.codigoAdm.toLowerCase().includes(query) ||
          a.descricao.toLowerCase().includes(query) ||
          a.marca.toLowerCase().includes(query) ||
          origCode.includes(query)
        );
      })
    : [];

  const handleAddLineItem = () => {
    setFormError('');
    if (!currentAmostraId) {
      setFormError('Selecione um produto para incluir na solicitação.');
      return;
    }

    if (currentQty <= 0) {
      setFormError('A quantidade solicitada deve ser maior do que zero.');
      return;
    }

    const selectedAmostraObj = amostras.find(a => a.id === currentAmostraId);
    if (!selectedAmostraObj) return;

    // Se houver saldo insuficiente no CD para estoque, avisar mas permitir que registre (visto que o Controlador pode pedir reposição)
    if (selectedAmostraObj.saldoAtual < currentQty) {
      alert(`Atenção: A quantidade física em estoque no CD (${selectedAmostraObj.saldoAtual}) é menor do que a solicitada (${currentQty}). A solicitação será gravada, mas requererá separação cuidadosa.`);
    }

    setFormItens([
      ...formItens,
      {
        amostraId: currentAmostraId,
        quantidadeSolicitada: currentQty,
        origem: 'Estoque da empresa'
      }
    ]);

    // Reset current Item Select box and suggestion box
    setCurrentAmostraId('');
    setSelectedAmostra(null);
    setProductSearchText('');
    setCurrentQty(1);
    setFormError('');
  };

  const handleRemoverLineItem = (idx: number) => {
    const list = [...formItens];
    list.splice(idx, 1);
    setFormItens(list);
  };

  const handleSubmeterForm = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setActionSuccess('');

    if (formItens.length === 0) {
      setFormError('Você deve adicionar ao menos 1 item na lista de remessas.');
      return;
    }

    try {
      DatabaseService.createSolicitacao({
        prioridade,
        lojaOrigem,
        lojasDestino,
        responsaveisRecebimento,
        observacoes,
        itens: formItens
      }, user);

      setActionSuccess('Pedido de envio criado e enviado com sucesso para a equipe de separação física!');
      
      // Delay to close
      setTimeout(() => {
        setIsFormOpen(false);
        setFormItens([]);
        setObservacoes('');
        setActionSuccess('');
        loadData();
      }, 2000);

    } catch (err: any) {
      setFormError(err.message || 'Erro ao criar solicitação.');
    }
  };

  return (
    <div className="space-y-6" id="solicitacoes_panel">
      {/* Title */}
      <div className="flex justify-between items-center bg-white p-4 rounded-lg border border-slate-100 shadow-xs">
        <div>
          <h2 className="text-xl font-display font-bold text-slate-900">
            Solicitações de Envio de Amostras
          </h2>
          <p className="text-sm text-slate-500">
            Controle e rastreabilidade detalhada do ciclo de vida das remessas para as gôndolas físicas.
          </p>
        </div>
        {canCreate && (
          <button 
            onClick={() => {
              setIsFormOpen(true);
              setFormItens([]);
            }}
            className="btn-operational px-4 py-2 bg-[#0A1D37] hover:bg-slate-850 text-white font-semibold rounded-md flex items-center gap-1.5 transition-all text-sm shadow-sm cursor-pointer"
          >
            <Plus className="w-4.5 h-4.5" /> Criar Solicitação de Envio
          </button>
        )}
      </div>

      {isFormOpen && (
        /* Form de Criação de Solicitação Popup Over */
        <div 
          onClick={() => setIsFormOpen(false)}
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto cursor-pointer animate-in fade-in duration-200"
        >
          <div 
            onClick={e => e.stopPropagation()}
            className="bg-white rounded-xl border border-slate-200 shadow-2xl w-full max-w-4xl cursor-default animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]"
          >
            <div className="bg-slate-50 text-[#0A1D37] p-4 flex justify-between items-center border-b border-slate-200 shrink-0">
              <div>
                <h3 className="font-display font-semibold text-[#0A1D37] flex items-center gap-1.5 text-sm md:text-base">
                  <Sparkles className="w-5 h-5 text-amber-500" />
                  Nova Solicitação de Envio de Amostras
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5 font-sans">Gerador automático de número de controle interno</p>
              </div>
              <button 
                onClick={() => setIsFormOpen(false)} 
                className="text-slate-500 hover:text-[#0A1D37] flex items-center gap-1 text-xs font-semibold px-2.5 py-1 hover:bg-slate-100 rounded transition cursor-pointer"
              >
                <X className="w-5 h-5" /> Voltar
              </button>
            </div>

            <form onSubmit={handleSubmeterForm} className="p-6 space-y-5 overflow-y-auto">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-md">
                  {formError}
                </div>
              )}
              
              {actionSuccess && (
                <div className="p-3 bg-green-50 border border-green-200 text-green-800 text-xs rounded-md font-semibold">
                  {actionSuccess}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-b border-slate-100 pb-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Loja de Origem</label>
                  <div className="w-full px-3 py-2 border border-slate-200 bg-slate-100 text-slate-650 rounded-md text-sm font-bold font-mono">
                    CD (Centro de Distribuição)
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Loja de Destino</label>
                  <select 
                    value={lojasDestino[0]}
                    onChange={e => {
                      const l = e.target.value;
                      setLojasDestino([l]);
                    }}
                    className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:border-[#0A1D37]"
                  >
                    <option value="MATRIZ">MATRIZ</option>
                    <option value="CD">CD</option>
                    <option value="CATEDRAL">CATEDRAL</option>
                    <option value="MINEIROS">MINEIROS</option>
                    <option value="RHARO">RHARO</option>
                    <option value="SAID ABDALA">SAID ABDALA</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Destinatário Responsável</label>
                  <input 
                    type="text" 
                    value={responsaveisRecebimento[lojasDestino[0]] || 'Gerente Responsável'}
                    readOnly
                    className="w-full px-3 py-2 border border-slate-100 bg-slate-50 text-slate-500 rounded-md text-sm focus:outline-none font-bold"
                  />
                </div>
              </div>

              {/* Inclusão de Itens */}
              <div className="space-y-3 bg-slate-50/70 p-4 rounded-lg border border-slate-200/60">
                <h4 className="font-display font-semibold text-slate-800 text-xs uppercase tracking-wider">
                  Adicionar Itens
                </h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
                  <div className="sm:col-span-6 relative">
                    <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Selecionar Produto (Pesquisa Aberta)</label>
                    <div className="relative">
                      <input 
                        type="text"
                        placeholder="Busque por ADM, Código Original ou Nome do Porcelanato/Louça..."
                        value={productSearchText}
                        onChange={e => {
                          setProductSearchText(e.target.value);
                          setShowDropdown(true);
                          if (selectedAmostra && e.target.value !== `${selectedAmostra.codigoAdm} - ${selectedAmostra.descricao}`) {
                            setSelectedAmostra(null);
                            setCurrentAmostraId('');
                          }
                        }}
                        onFocus={() => setShowDropdown(true)}
                        className="w-full px-3 py-2 pl-9 border border-slate-200 text-slate-850 rounded text-xs focus:outline-none focus:border-[#0A1D37]"
                      />
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                      
                      {selectedAmostra && (
                        <button 
                          type="button"
                          onClick={() => {
                            setSelectedAmostra(null);
                            setCurrentAmostraId('');
                            setProductSearchText('');
                          }}
                          className="absolute right-3 top-1.5 text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] px-2 py-0.5 rounded font-bold"
                        >
                          Alterar
                        </button>
                      )}
                    </div>

                    {/* Autocomplete Suggestion Dropdown */}
                    {showDropdown && productSearchText.trim().length > 0 && !selectedAmostra && (
                      <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded shadow-lg max-h-56 overflow-y-auto divide-y divide-slate-50">
                        {filteredSuggestions.length > 0 ? (
                          filteredSuggestions.map(a => {
                            const origCode = getCodigoOriginal(a);
                            return (
                              <button
                                type="button"
                                key={a.id}
                                onClick={() => {
                                  setSelectedAmostra(a);
                                  setCurrentAmostraId(a.id);
                                  setProductSearchText(`${a.codigoAdm} - ${a.descricao}`);
                                  setShowDropdown(false);
                                  if (a.saldoAtual <= 0) {
                                    alert('Atenção: Saldo de estoque físico do item selecionado é nulo no CD!');
                                  }
                                }}
                                className="w-full text-left p-2.5 hover:bg-slate-50 transition-colors block text-xs"
                              >
                                <div className="flex justify-between items-center font-bold mb-0.5">
                                  <span className="text-[#0A1D37] text-[10px] bg-slate-100 px-1.5 py-0.5 rounded font-mono">
                                    {a.codigoAdm}
                                  </span>
                                  <span className="text-red-700 text-[9px] font-mono">
                                    COD: {origCode}
                                  </span>
                                </div>
                                <p className="text-slate-800 font-medium text-[11px] truncate">{a.descricao}</p>
                                <p className="text-slate-400 text-[9px]">Saldo: {a.saldoAtual} {a.unidade} • Marca: {a.marca}</p>
                              </button>
                            );
                          })
                        ) : (
                          <div className="p-3 text-center text-slate-400 text-xs italic">
                            Nenhum produto encontrado com "{productSearchText}".
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Estoque Disp.</label>
                    <input 
                      type="text" 
                      value={selectedAmostra ? `${selectedAmostra.saldoAtual} ${selectedAmostra.unidade}` : '0'} 
                      readOnly 
                      className="w-full px-3 py-2 border border-slate-250 bg-slate-100 text-slate-700 rounded text-xs focus:outline-none font-bold"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Qtd Solicitada</label>
                    <input 
                      type="number" 
                      value={currentQty}
                      onChange={e => setCurrentQty(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-200 rounded bg-white text-xs focus:outline-none focus:border-[#0A1D37]"
                      min={1}
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <button 
                      type="button" 
                      onClick={handleAddLineItem}
                      className="w-full px-4 py-2 bg-[#0A1D37] hover:bg-slate-800 text-white rounded text-xs font-semibold cursor-pointer border border-transparent transition-all h-8.5 flex items-center justify-center font-display"
                    >
                      Adicionar Item
                    </button>
                  </div>
                </div>
              </div>

              {/* Tabela dos itens inclusos */}
              <div className="space-y-2">
                <h4 className="font-display font-bold text-slate-800 text-xs text-left">Amostras Incluídas no Pedido</h4>
                <div className="border border-slate-100 rounded overflow-hidden">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100 text-slate-500 font-mono text-[9px] uppercase border-b border-slate-200">
                        <th className="p-2.5">Código ADM</th>
                        <th className="p-2.5">Descrição</th>
                        <th className="p-2.5 text-center">Qtd Solicitada</th>
                        <th className="p-2.5 text-right">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {formItens.length > 0 ? (
                        formItens.map((it, idx) => {
                          const amObj = amostras.find(a => a.id === it.amostraId);
                          return (
                            <tr key={idx} className="hover:bg-slate-50/50">
                              <td className="p-2.5 font-mono font-bold">{amObj?.codigoAdm}</td>
                              <td className="p-2.5 font-medium">{amObj?.descricao}</td>
                              <td className="p-2.5 text-center font-bold font-display text-slate-800">{it.quantidadeSolicitada}</td>
                              <td className="p-2.5 text-right">
                                <button 
                                  type="button" 
                                  onClick={() => handleRemoverLineItem(idx)}
                                  className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-all"
                                >
                                  <Trash className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={4} className="p-6 text-center text-slate-400 italic">
                            Insira itens no painel acima para faturar a solicitação...
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Observações/Notas Gerais</label>
                <textarea 
                  value={observacoes}
                  onChange={e => setObservacoes(e.target.value)}
                  placeholder="Insira notas explicativas operacionais para o motorista ou a equipe de separação física..."
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:border-[#0A1D37]"
                />
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4 shrink-0">
                <button 
                  type="button" 
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 font-semibold rounded text-sm hover:bg-slate-50 btn-operational cursor-pointer flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-4 h-4" /> Voltar à Lista
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2 bg-[#0A1D37] hover:bg-slate-800 text-white font-semibold rounded text-sm btn-operational shadow-sm cursor-pointer"
                >
                  Confirmar Lote e Disparar Demanda
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lista Histórica Geral das Solicitações */}
      <div className="bg-white rounded-lg border border-slate-100 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-400 text-[10px] uppercase font-mono border-b border-slate-100">
                  <th className="p-4">Pedido / Número</th>
                  <th className="p-4">Data Solicitada</th>
                  <th className="p-4">Quem requisitou</th>
                  <th className="p-4 text-center">Origem</th>
                  <th className="p-4">Destino</th>
                  <th className="p-4">Itens</th>
                  <th className="p-4 text-right">Fase Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {solicitacoes.length > 0 ? (
                  solicitacoes.map(s => {
                    // Badge color switch
                    let badgeClass = 'bg-slate-100 text-slate-600';
                    if (s.status === 'Liberada para separação') badgeClass = 'bg-blue-100 text-blue-800';
                    else if (s.status === 'Em separação') badgeClass = 'bg-indigo-100 text-indigo-800';
                    else if (s.status === 'Enviada') badgeClass = 'bg-purple-100 text-purple-800';
                    else if (s.status === 'Recebida' || s.status === 'Concluída') badgeClass = 'bg-green-100 text-green-800';
                    else if (s.status === 'Com divergência') badgeClass = 'bg-red-100 text-red-800';

                    return (
                      <tr 
                        key={s.id} 
                        onClick={() => setSelectedSolicitacaoForTimeline(s)}
                        className="hover:bg-indigo-50/40 cursor-pointer transition-colors"
                        title="Ver passo-a-passo e histórico de logs do pedido"
                      >
                        <td className="p-4 font-mono font-bold text-slate-800">
                          {s.numero}
                        </td>
                        <td className="p-4 text-slate-500">
                          <div className="font-medium">{new Date(s.dataSolicitacao).toLocaleDateString()}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            {new Date(s.dataSolicitacao).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="font-semibold text-slate-700">{s.solicitanteNome}</div>
                          {s.nomeMotorista && (
                            <div className="text-[10px] text-slate-500 mt-1 space-y-0.5">
                              <div><span className="text-slate-400 font-medium">Mot:</span> {s.nomeMotorista}</div>
                              {s.placaVeiculo && <div><span className="text-slate-400 font-medium">Placa:</span> <span className="bg-blue-50/70 text-blue-800 px-1 py-0.5 rounded font-mono font-bold text-[9px] border border-blue-100">{s.placaVeiculo}</span></div>}
                            </div>
                          )}
                        </td>
                        <td className="p-4 text-center">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase border bg-slate-50 text-slate-600 border-slate-100">
                            {s.lojaOrigem || 'CD'}
                          </span>
                        </td>
                        <td className="p-4 text-slate-600">
                          {s.lojasDestino.join(', ')}
                        </td>
                        <td className="p-4 leading-relaxed">
                          <span className="font-semibold block">{s.itens.length} amostras</span>
                          <span className="text-[10px] text-slate-400 block max-w-[150px] truncate">
                            {s.itens.map(i => i.codigoAdm).join(', ')}
                          </span>
                        </td>
                        <td className="p-4 text-right whitespace-nowrap">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold font-mono inline-block ${badgeClass}`}>
                            {s.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      <HelpCircle className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                      <p>Nenhuma solicitação comercial cadastrada no sistema.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {selectedSolicitacaoForTimeline && (
          <SolicitacaoTimeline 
            solicitacao={selectedSolicitacaoForTimeline}
            user={user}
            onClose={() => setSelectedSolicitacaoForTimeline(null)}
          />
        )}
      </div>
    );
  }
