/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { DatabaseService } from '../services/db';
import { MovimentacaoEstoque, Amostra, User } from '../types';
import { 
  ArrowUpRight, ArrowDownLeft, AlertCircle, HelpCircle, Search, 
  Trash2, CheckCircle, ShieldCheck, Lock, ShoppingCart, Clock, 
  CheckSquare, Sparkles, Filter, ChevronRight, UserCheck
} from 'lucide-react';

interface EstoqueCDProps {
  user: User;
}

export interface CustomPendingEntry {
  id: string;
  amostraId: string;
  codigoAdm: string;
  codigoOriginal: string;
  descricao: string;
  marca: string;
  tipoFluxo: 'ENTRADA DE PRODUTOS BONIFICADOS' | 'ENTRADA DE PRODUTOS BAIXADOS DO ESTOQUE';
  quantidade: number; // Always in PEÇA
  verbaCompra?: string;
  observacoes?: string;
  status: 'BLOQUEADO' | 'AGUARDANDO CONSOLIDAÇÃO DE ESTOQUE' | 'CONSOLIDADO';
  criadoEm: string;
  criadoPorId: string;
  criadoPorNome: string;
  liberadoGestorGeralPor?: string;
  liberadoGestorGeralEm?: string;
  consolidadoPor?: string;
  consolidadoEm?: string;
}

export default function EstoqueCD({ user }: EstoqueCDProps) {
  // Navigation tabs
  const [activeSubTab, setActiveSubTab] = useState<'lancamento' | 'pendencias' | 'historico'>('lancamento');

  // General lists
  const [movimentacoes, setMovimentacoes] = useState<MovimentacaoEstoque[]>([]);
  const [amostras, setAmostras] = useState<Amostra[]>([]);
  const [entradasPendentes, setEntradasPendentes] = useState<CustomPendingEntry[]>([]);

  // Search autocomplete / open search fields
  const [productSearchText, setProductSearchText] = useState('');
  const [selectedAmostra, setSelectedAmostra] = useState<Amostra | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);

  // Form states
  const [tipoFluxo, setTipoFluxo] = useState<'ENTRADA DE PRODUTOS BONIFICADOS' | 'ENTRADA DE PRODUTOS BAIXADOS DO ESTOQUE'>('ENTRADA DE PRODUTOS BONIFICADOS');
  const [quantidade, setQuantidade] = useState<number>(1);
  const [verbaCompra, setVerbaCompra] = useState('');
  const [observacoes, setObservacoes] = useState('');

  // Cart queue states
  interface CartItem {
    id: string;
    amostra: Amostra;
    codigoOriginal: string;
    tipoFluxo: 'ENTRADA DE PRODUTOS BONIFICADOS' | 'ENTRADA DE PRODUTOS BAIXADOS DO ESTOQUE';
    quantidade: number;
    verbaCompra?: string;
    observacoes?: string;
  }
  const [cart, setCart] = useState<CartItem[]>([]);

  // Status message
  const [statusMessage, setStatusMessage] = useState<{ text: string; success: boolean } | null>(null);

  // Load and subscribe
  useEffect(() => {
    loadData();
    return DatabaseService.subscribe(loadData);
  }, []);

  const loadData = () => {
    const rawMov = DatabaseService.getMovimentacoes();
    const sortedMov = [...rawMov].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    setMovimentacoes(sortedMov);
    setAmostras(DatabaseService.getAmostras().filter(a => a.status === 'ativo'));
    
    // Load pending entries from DatabaseService (synced with Firestore)
    const finalPendentes = DatabaseService.getEntradasPendentes();

    const sortedPendentes = [...finalPendentes].sort((a, b) => new Date(b.criadoEm || 0).getTime() - new Date(a.criadoEm || 0).getTime());
    setEntradasPendentes(sortedPendentes);
  };

  // Helper dictionary matching simulated factory codes ("Código Original")
  const getCodigoOriginal = (a: Amostra): string => {
    if (a.codigoAdm === 'ADM-POR-8001') return 'ELIZ-84-POL-CALACATA';
    if (a.codigoAdm === 'ADM-POR-8002') return 'ELIZ-60-MATT-PORTORO';
    if (a.codigoAdm === 'ADM-POR-8003') return 'ELIZ-120-PNT';
    if (a.codigoAdm === 'ADM-LOU-5001') return 'DECA-MTCRL-W';
    if (a.codigoAdm === 'ADM-MET-4002') return 'DOCOL-MONO-400';
    return `ORIG-FAC-${a.codigoAdm.split('-')[2] || a.id.slice(-4).toUpperCase()}`;
  };

  // Autocomplete suggestions
  const filteredSuggestions = productSearchText.trim().length > 0
    ? amostras.filter(a => {
        const query = productSearchText.toLowerCase();
        const origCode = getCodigoOriginal(a).toLowerCase();
        return (
          a.codigoAdm.toLowerCase().includes(query) ||
          origCode.includes(query) ||
          a.descricao.toLowerCase().includes(query) ||
          a.marca.toLowerCase().includes(query)
        );
      })
    : [];

  // Add Item to local cart
  const handleAddToCard = (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);

    if (!selectedAmostra) {
      setStatusMessage({ text: 'Por favor, digite e selecione um produto válido através do menu de pesquisa aberta.', success: false });
      return;
    }

    if (quantidade <= 0) {
      setStatusMessage({ text: 'A quantidade de peças deve ser superior a zero.', success: false });
      return;
    }

    if (tipoFluxo === 'ENTRADA DE PRODUTOS BAIXADOS DO ESTOQUE' && !verbaCompra.trim()) {
      setStatusMessage({ text: 'Para o tipo de fluxo "Baixados do Estoque", o preenchimento do campo Verba de Compra é obrigatório.', success: false });
      return;
    }

    // Add to cart queue
    const origCode = getCodigoOriginal(selectedAmostra);
    const newCartItem: CartItem = {
      id: `cart_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      amostra: selectedAmostra,
      codigoOriginal: origCode,
      tipoFluxo,
      quantidade,
      verbaCompra: tipoFluxo === 'ENTRADA DE PRODUTOS BAIXADOS DO ESTOQUE' ? verbaCompra : undefined,
      observacoes
    };

    setCart(prev => [...prev, newCartItem]);
    setStatusMessage({ text: `Item "${selectedAmostra.codigoAdm}" adicionado ao lote com sucesso! Continue inserindo ou confirme o lote abaixo.`, success: true });

    // Reset form fields except Flow Type to speed up repetitive entries
    setSelectedAmostra(null);
    setProductSearchText('');
    setQuantidade(1);
    setObservacoes('');
    setVerbaCompra('');
    setShowDropdown(false);
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(c => c.id !== id));
  };

  // Finalize batch launcher
  const handleFinalizarEntradaInteira = () => {
    if (cart.length === 0) {
      setStatusMessage({ text: 'Seu lote de lançamento está vazio. Adicione pelo menos 1 item.', success: false });
      return;
    }

    try {
      // Process each item in cart and turn them into entries with respective statuses
      const updatedPending = [...entradasPendentes];

      cart.forEach(item => {
        const initialStatus = item.tipoFluxo === 'ENTRADA DE PRODUTOS BONIFICADOS' 
          ? 'AGUARDANDO CONSOLIDAÇÃO DE ESTOQUE' 
          : 'BLOQUEADO';

        const newEntry: CustomPendingEntry = {
          id: `pend_${Date.now()}_${Math.floor(Math.random() * 1000)}_${item.amostra.id}`,
          amostraId: item.amostra.id,
          codigoAdm: item.amostra.codigoAdm,
          codigoOriginal: item.codigoOriginal,
          descricao: item.amostra.descricao,
          marca: item.amostra.marca,
          tipoFluxo: item.tipoFluxo,
          quantidade: item.quantidade,
          verbaCompra: item.verbaCompra,
          observacoes: item.observacoes,
          status: initialStatus,
          criadoEm: new Date().toISOString(),
          criadoPorId: user.id,
          criadoPorNome: user.nome
        };

        updatedPending.unshift(newEntry);
      });

      // Saving
      DatabaseService.setEntradasPendentes(updatedPending);
      setEntradasPendentes(updatedPending);
      
      // Toast / Message
      setStatusMessage({ text: `Lote com ${cart.length} item(ns) lançado. Consulte os status de liberação na aba "Pendências (Status)"!`, success: true });
      setCart([]); // Clear cart
      setActiveSubTab('pendencias'); // Auto navigate
    } catch (err: any) {
      setStatusMessage({ text: err.message || 'Erro ao lançar o lote na entrada.', success: false });
    }
  };

  // Actions for validation tab (Aba 2)
  const handleLiberarGestorGeral = (entryId: string) => {
    // Only General Operations Manager (Admin / Guilherme) can perform first liberation
    if (user.perfil !== 'Admin') {
      alert('Operação negada! Apenas o GESTOR DE OPERAÇÕES GERAL (Guilherme - Admin) pode realizar a 1ª liberação desta entrada.');
      return;
    }

    const updated = entradasPendentes.map(item => {
      if (item.id === entryId && item.status === 'BLOQUEADO') {
        return {
          ...item,
          status: 'AGUARDANDO CONSOLIDAÇÃO DE ESTOQUE' as const,
          liberadoGestorGeralPor: user.nome,
          liberadoGestorGeralEm: new Date().toISOString()
        };
      }
      return item;
    });

    DatabaseService.setEntradasPendentes(updated);
    setEntradasPendentes(updated);
    alert('Sucesso! Entrada de produtos baixados liberada pelo Gestor Geral. Agora aguarda a consolidação do Gestor de Amostras para creditar no estoque!');
  };

  const handleConsolidarEstoque = (entry: CustomPendingEntry) => {
    // Gestor de Amostras (Admin, Controlador, or Gerente) only
    const isGestorAmostras = user.perfil === 'Admin' || user.perfil === 'Controlador' || user.perfil === 'Gerente';
    if (!isGestorAmostras) {
      alert('Operação negada! Esta ação exige perfil administrativo de GESTOR DE AMOSTRAS (Admin, Controlador ou Gerente).');
      return;
    }

    try {
      // 1. Credit actual stock calling DatabaseService
      DatabaseService.realizarMovimentacaoEstoqueCompleta({
        amostraId: entry.amostraId,
        tipo: 'entrada',
        quantidade: entry.quantidade,
        verbaCompra: entry.verbaCompra,
        observacoes: `[Consolidado via Pendências por ${user.nome}] Fluxo: ${entry.tipoFluxo}. Obs: ${entry.observacoes || 'Sem obs'}`
      }, user);

      // 2. Change status of entry to CONSOLIDADO
      const updated = entradasPendentes.map(item => {
        if (item.id === entry.id) {
          return {
            ...item,
            status: 'CONSOLIDADO' as const,
            consolidadoPor: user.nome,
            consolidadoEm: new Date().toISOString()
          };
        }
        return item;
      });

      DatabaseService.setEntradasPendentes(updated);
      setEntradasPendentes(updated);
      
      // Reload Database list
      loadData();
      alert(`Consolidação efetuada! Mais ${entry.quantidade} peças do produto ${entry.codigoAdm} agora encontram-se creditadas e prontas no CD.`);
    } catch (err: any) {
      alert(`Falha ao consolidar estoque: ${err.message || 'Erro operacional.'}`);
    }
  };

  const limparTodasPendencias = () => {
    if (window.confirm('Deseja realmente limpar e resetar todas as pendências e simulações?')) {
      DatabaseService.clearEntradasPendentes();
      loadData();
    }
  };

  // Helper flags for permissions
  const isGestorAmostrasActive = user.perfil === 'Admin' || user.perfil === 'Controlador' || user.perfil === 'Gerente';
  const isGestorGeralActive = user.perfil === 'Admin';

  return (
    <div className="space-y-6" id="entradas_amostras_panel">
      
      {/* Dynamic Upper Title Header with Metadata */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-display font-bold text-[#0A1D37] uppercase tracking-wide flex items-center gap-2">
            <ArrowUpRight className="w-5 h-5 text-red-650 animate-bounce" />
            Entradas de Amostras
          </h2>
          <p className="text-xs text-slate-500 font-sans">
            Módulo integrado de recebimento de material, controle de bonificações, baixas e rastreabilidade fatiada.
          </p>
        </div>

        {/* Current Sandbox User Context Header */}
        <div className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg flex items-center gap-2 text-xs font-sans">
          <UserCheck className="w-4 h-4 text-red-650" />
          <div>
            <span className="text-[10px] text-slate-400 font-mono uppercase block leading-none">Perfil Logado</span>
            <span className="font-bold text-[#0A1D37]">{user.nome}</span> 
            <span className="ml-1 bg-red-50 text-red-700 text-[9px] font-bold px-1.5 py-0.2 rounded border border-red-100 uppercase">
              {user.perfil}
            </span>
          </div>
        </div>
      </div>

      {/* Corporate Instruction Note */}
      <div className="bg-[#0A1D37] text-white rounded-lg p-3 text-xs leading-relaxed flex items-center gap-3">
        <Sparkles className="w-5 h-5 text-red-500 shrink-0" />
        <p>
          <strong>Simulação de Níveis do Fluxo:</strong> Para testar cada uma das aprovações e o ciclo de consolidação de estoque, use o painel <strong>"Sandbox Swapper"</strong> no menu lateral para alternar entre <strong>Guilherme Admin</strong> (Gestor Geral) ou <strong>Ivan Controlador</strong> / <strong>Gerente</strong> (Gestor de Unidade).
        </p>
      </div>

      {/* Sub-Tabs Nav Bar */}
      <div className="flex border-b border-slate-200 bg-white shadow-xs p-1 rounded-lg gap-2 overflow-x-auto shrink-0">
        <button 
          onClick={() => setActiveSubTab('lancamento')}
          className={`px-4 py-2 rounded-md text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
            activeSubTab === 'lancamento' ? 'bg-[#0A1D37] text-white' : 'text-slate-500 hover:text-[#0A1D37] hover:bg-slate-50'
          }`}
        >
          <ShoppingCart className="w-4 h-4" /> Lançamento de Itens na Entrada
        </button>
        <button 
          onClick={() => setActiveSubTab('pendencias')}
          className={`px-4 py-2 rounded-md text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 relative ${
            activeSubTab === 'pendencias' ? 'bg-[#0A1D37] text-white' : 'text-slate-500 hover:text-[#0A1D37] hover:bg-slate-50'
          }`}
        >
          <Clock className="w-4 h-4" /> Pendências (Status)
          {entradasPendentes.filter(e => e.status !== 'CONSOLIDADO').length > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-650 text-white rounded-full w-4 h-4 text-[9px] flex items-center justify-center font-black animate-pulse">
              {entradasPendentes.filter(e => e.status !== 'CONSOLIDADO').length}
            </span>
          )}
        </button>
        <button 
          onClick={() => setActiveSubTab('historico')}
          className={`px-4 py-2 rounded-md text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
            activeSubTab === 'historico' ? 'bg-[#0A1D37] text-white' : 'text-slate-500 hover:text-[#0A1D37] hover:bg-slate-50'
          }`}
        >
          <CheckSquare className="w-4 h-4" /> Histórico de Lançamentos de Entradas
        </button>
      </div>

      {/* --- SUB-TAB CONTENT PANELS --- */}

      {/* 1. LANÇAMENTO DE ITENS NA ENTRADA */}
      {activeSubTab === 'lancamento' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Main Launch Form */}
          <div className="lg:col-span-5 bg-white p-5 rounded-lg border border-slate-200 shadow-xs space-y-4">
            <h3 className="font-display font-bold text-slate-800 border-b border-slate-100 pb-2 flex items-center text-sm uppercase">
              <Sparkles className="w-4 h-4 text-red-650 mr-2" />
              Lançamento de Itens na Entrada
            </h3>

            {statusMessage && (
              <div className={`p-3 rounded text-xs border ${
                statusMessage.success ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'
              }`}>
                {statusMessage.text}
              </div>
            )}

            <form onSubmit={handleAddToCard} className="space-y-4">
              
              {/* Product selection (open search based on typing) */}
              <div className="relative">
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                  Passo 1: Selecionar Produto (Pesquisa Aberta)
                </label>
                <p className="text-[10px] text-slate-400 mb-2 font-medium">Digite ADM, Código Original ou Nome do Porcelanato/Louça</p>
                
                <div className="relative">
                  <input 
                    type="text"
                    placeholder="Ex: Elizabeth Calacata, ADM-POR-8001 or DECA..."
                    value={productSearchText}
                    onChange={e => {
                      setProductSearchText(e.target.value);
                      setShowDropdown(true);
                      if (selectedAmostra && e.target.value !== `${selectedAmostra.codigoAdm} - ${selectedAmostra.descricao}`) {
                        setSelectedAmostra(null);
                      }
                    }}
                    onFocus={() => setShowDropdown(true)}
                    className="w-full px-3 py-2 pl-9 border border-slate-200 text-slate-803 rounded-md text-sm focus:outline-none focus:border-[#0A1D37]"
                  />
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  
                  {selectedAmostra && (
                    <button 
                      type="button"
                      onClick={() => {
                        setSelectedAmostra(null);
                        setProductSearchText('');
                      }}
                      className="absolute right-3 top-2 text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] px-2 py-0.5 rounded font-bold"
                    >
                      Alterar
                    </button>
                  )}
                </div>

                {/* Autocomplete Suggestion Dropdown */}
                {showDropdown && productSearchText.trim().length > 0 && !selectedAmostra && (
                  <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-56 overflow-y-auto divide-y divide-slate-50">
                    {filteredSuggestions.length > 0 ? (
                      filteredSuggestions.map(a => {
                        const origCode = getCodigoOriginal(a);
                        return (
                          <button
                            type="button"
                            key={a.id}
                            onClick={() => {
                              setSelectedAmostra(a);
                              setProductSearchText(`${a.codigoAdm} - ${a.descricao}`);
                              setShowDropdown(false);
                            }}
                            className="w-full text-left p-3 hover:bg-slate-50 transition-colors block text-xs"
                          >
                            <div className="flex justify-between items-center font-bold mb-1">
                              <span className="text-[#0A1D37] text-[11px] bg-slate-100 px-1.5 py-0.5 rounded font-mono">
                                {a.codigoAdm}
                              </span>
                              <span className="text-red-650 text-[10px] font-mono">
                                COD. ORIGINAL: {origCode}
                              </span>
                            </div>
                            <p className="text-slate-800 font-medium">{a.descricao}</p>
                            <p className="text-slate-400 text-[10px] mt-0.5 font-sans">Marca: {a.marca} — Linha: {a.colecao}</p>
                          </button>
                        );
                      })
                    ) : (
                      <div className="p-4 text-center text-slate-400 text-xs">
                        Nenhum produto encontrado com "{productSearchText}".
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Show selected item confirmation badge */}
              {selectedAmostra && (
                <div className="p-3 bg-red-50/50 rounded-lg border border-red-500/10 flex flex-col space-y-1 animate-in zoom-in-95">
                  <span className="text-[9px] uppercase font-bold text-red-650 tracking-widest block font-sans">Produto Selecionado</span>
                  <strong className="text-slate-800 text-xs block">{selectedAmostra.descricao}</strong>
                  <div className="flex gap-2 text-[10px] text-slate-500 font-mono">
                    <span>ADM: {selectedAmostra.codigoAdm}</span>
                    <span>•</span>
                    <span>ORIGINAL: {getCodigoOriginal(selectedAmostra)}</span>
                  </div>
                </div>
              )}

              {/* Flow selection (2 custom options strictly) */}
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Tipo de Fluxo de Entrada</label>
                <select 
                  value={tipoFluxo}
                  onChange={e => {
                    setTipoFluxo(e.target.value as any);
                    setVerbaCompra('');
                  }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:border-[#0A1D37] font-semibold text-slate-700 bg-white"
                >
                  <option value="ENTRADA DE PRODUTOS BONIFICADOS">
                    Opção 1: ENTRADA DE PRODUTOS BONIFICADOS
                  </option>
                  <option value="ENTRADA DE PRODUTOS BAIXADOS DO ESTOQUE">
                    Opção 2: ENTRADA DE PRODUTOS BAIXADOS DO ESTOQUE
                  </option>
                </select>
                <p className="text-[10px] text-slate-400 mt-1">
                  {tipoFluxo === 'ENTRADA DE PRODUTOS BONIFICADOS' 
                    ? 'Peças cedidas gentilmente pelo parceiro fabril sem ônus de verba.'
                    : 'Amostra cobrada da verba comercial e faturamento de estoque corporativo.'
                  }
                </p>
              </div>

              {/* Fixed quantity in PEÇA and Verba conditional input */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                    Quantidade <span className="text-red-650 font-bold font-mono">(PEÇA)</span>
                  </label>
                  <div className="relative">
                    <input 
                      type="number" 
                      value={quantidade}
                      onChange={e => setQuantidade(Math.max(1, Number(e.target.value)))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:border-[#0A1D37] font-semibold text-slate-800"
                      min={1}
                      required
                    />
                    <span className="absolute right-3 top-2.5 text-[10px] font-bold text-slate-400 uppercase">
                      PEÇAS
                    </span>
                  </div>
                </div>

                {/* Conditional and Mandatory Verba de Compra for Option 2 */}
                {tipoFluxo === 'ENTRADA DE PRODUTOS BAIXADOS DO ESTOQUE' && (
                  <div className="animate-in slide-in-from-top-2 duration-150">
                    <label className="block text-xs font-bold text-red-650 uppercase mb-1 flex items-center">
                      Verba de Compra <span className="text-red-500 font-black ml-1">*</span>
                    </label>
                    <input 
                      type="text" 
                      placeholder="Ex: VB-COBRANÇA-602" 
                      value={verbaCompra}
                      onChange={e => setVerbaCompra(e.target.value)}
                      className="w-full px-3 py-2 border border-red-200 text-slate-803 rounded-md text-sm focus:outline-none focus:border-red-500 bg-red-50/10 placeholder-red-300 font-semibold"
                      required={tipoFluxo === 'ENTRADA DE PRODUTOS BAIXADOS DO ESTOQUE'}
                    />
                  </div>
                )}

              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">
                  Observações de Entrada
                </label>
                <textarea 
                  value={observacoes}
                  onChange={e => setObservacoes(e.target.value)}
                  placeholder="Justificativa física, romaneio, lote industrial ou notas técnicas adicionais..."
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-md text-sm focus:outline-none focus:border-[#0A1D37]"
                  rows={2}
                />
              </div>

              <button 
                type="submit" 
                className="w-full btn-operational bg-red-650 hover:bg-red-700 text-white font-bold rounded-md text-xs cursor-pointer shadow-sm transition-all py-2.5 uppercase tracking-wide flex items-center justify-center gap-1.5"
              >
                <ShoppingCart className="w-4 h-4" /> Adicionar ao Lote (Carrinho)
              </button>
            </form>
          </div>

          {/* Carrinho Batch Queue (Lote de Lançamento) */}
          <div className="lg:col-span-7 space-y-4">
            
            <div className="bg-white p-5 rounded-lg border border-slate-100 shadow-xs space-y-4">
              
              <div className="flex justify-between items-center border-b border-slate-100 pb-3 flex-wrap">
                <div>
                  <h3 className="font-display font-medium text-[#0A1D37] text-sm uppercase flex items-center gap-2">
                    <ShoppingCart className="w-4 h-4 text-red-650" />
                    Carrinho de Entrada de Amostras
                  </h3>
                  <p className="text-[10px] text-slate-400 font-sans">
                    Guarde os itens na fila abaixo e confirme o lote completo para encaminhar para aprovação integrada.
                  </p>
                </div>
                {cart.length > 0 && (
                  <button 
                    onClick={() => setCart([])}
                    className="text-slate-400 hover:text-red-650 text-xs font-semibold transition"
                  >
                    Esvaziar Fila
                  </button>
                )}
              </div>

              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                {cart.length > 0 ? (
                  cart.map((item, idx) => (
                    <div key={item.id} className="p-3 bg-slate-50 rounded-lg border border-slate-150 flex items-start justify-between gap-3 text-xs animate-in slide-in-from-right-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded text-[10px] font-bold">
                            {item.amostra.codigoAdm}
                          </span>
                          <strong className="text-slate-800">{item.amostra.descricao}</strong>
                        </div>
                        
                        <p className="text-slate-500 text-[11px] leading-tight font-medium">
                          Marca: {item.amostra.marca} • Original: <span className="font-mono text-[10px] font-semibold text-[#0A1D37]">{item.codigoOriginal}</span>
                        </p>

                        <div className="flex items-center gap-2 mt-1">
                          <span className={`px-2 py-0.5 rounded-[3px] text-[9px] uppercase font-bold border ${
                            item.tipoFluxo === 'ENTRADA DE PRODUTOS BONIFICADOS'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                              : 'bg-indigo-50 text-indigo-700 border-indigo-100'
                          }`}>
                            {item.tipoFluxo.replace('ENTRADA DE ', '')}
                          </span>
                          {item.verbaCompra && (
                            <span className="font-mono text-[10px] font-bold text-red-650 bg-red-50 px-1.5 py-0.5 rounded border border-red-100">
                              Verba: {item.verbaCompra}
                            </span>
                          )}
                        </div>

                        {item.observacoes && (
                          <p className="text-slate-400 italic text-[11px] bg-white px-2 py-0.5 border border-slate-100 rounded inline-block mt-1">
                            "{item.observacoes}"
                          </p>
                        )}
                      </div>

                      <div className="flex flex-col items-end justify-between self-stretch shrink-0">
                        <strong className="text-slate-900 font-display text-sm">
                          {item.quantidade} <span className="text-[10px] font-normal text-slate-400">PEÇAS</span>
                        </strong>
                        <button 
                          onClick={() => removeFromCart(item.id)}
                          className="text-slate-400 hover:text-red-700 transition duration-150 p-1"
                          title="Remover este item do carrinho"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-10 text-slate-400 space-y-2 border-2 border-dashed border-slate-100 rounded-xl">
                    <ShoppingCart className="w-10 h-10 text-slate-200 mx-auto" />
                    <strong className="text-xs text-slate-500 block">Nenhum item na fila do CD</strong>
                    <p className="text-[11px] max-w-xs mx-auto text-slate-400 leading-normal">
                      Insira o produto no painel esquerdo, configure o fluxo de entrada J. Cruzeiro e clique em "Adicionar ao Lote" para preencher seu romaneio.
                    </p>
                  </div>
                )}
              </div>

              {/* Confirm entire lot launcher button */}
              {cart.length > 0 && (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 animate-in fade-in">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-slate-600">Total de Linhas no Lote:</span>
                    <strong className="text-slate-900 bg-white px-2 py-0.5 rounded font-bold border">
                      {cart.length} item(ns)
                    </strong>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-slate-600">Total Acumulado de Amostras:</span>
                    <strong className="text-lg text-emerald-600 font-display font-black">
                      {cart.reduce((sum, item) => sum + item.quantidade, 0)} PEÇAS
                    </strong>
                  </div>

                  <button 
                    onClick={handleFinalizarEntradaInteira}
                    className="w-full btn-operational bg-[#0A1D37] hover:bg-slate-812 text-white font-bold rounded-lg text-xs py-2.5 flex items-center justify-center gap-2 cursor-pointer uppercase shadow-md transition"
                  >
                    <CheckCircle className="w-4 h-4" /> Confirmar Lançamento de Lote na Entrada
                  </button>
                </div>
              )}

            </div>

            {/* Catalog Info list card for rapid lookups */}
            <div className="bg-white p-4 rounded-lg border border-slate-200 text-xs text-slate-500 leading-relaxed">
              <strong className="text-slate-800 uppercase text-[10px] block mb-1">Relação de Códigos do Sistema:</strong>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                {amostras.slice(0, 4).map(a => (
                  <div key={a.id} className="p-2 bg-slate-50 rounded border border-slate-100 flex items-center justify-between font-mono text-[10.5px]">
                    <span className="font-bold text-[#0A1D37]">{a.codigoAdm}</span>
                    <span className="text-slate-400 font-semibold">{getCodigoOriginal(a)}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* 2. PENDÊNCIAS (STATUS) */}
      {activeSubTab === 'pendencias' && (
        <div className="space-y-6">
          


          {/* Pending / Validation table list */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center flex-wrap gap-2">
              <div>
                <h3 className="font-display font-bold text-slate-800 text-xs uppercase">Relação de Pendências e Aprovações de Fluxo</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Gestão de autorização de entradas no armazém central.</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/50 text-slate-450 uppercase tracking-wider font-mono text-[9px] border-b border-slate-200">
                    <th className="p-4 font-bold">Produto</th>
                    <th className="p-4 font-bold">Detalhes do Fluxo</th>
                    <th className="p-4 font-bold text-center">Quant (PEÇA)</th>
                    <th className="p-4 font-bold">Início & Usuário</th>
                    <th className="p-4 font-bold text-center">Status / Local</th>
                    <th className="p-4 font-bold text-right">Ação Requerida</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans">
                  {entradasPendentes.length > 0 ? (
                    entradasPendentes.map(item => {
                      const isOption1 = item.tipoFluxo === 'ENTRADA DE PRODUTOS BONIFICADOS';
                      const isBloqueado = item.status === 'BLOQUEADO';
                      const isAguardando = item.status === 'AGUARDANDO CONSOLIDAÇÃO DE ESTOQUE';
                      const isConsolidado = item.status === 'CONSOLIDADO';

                      return (
                        <tr key={item.id} className={`hover:bg-slate-50/50 transition-colors ${isConsolidado ? 'bg-green-50/10' : ''}`}>
                          
                          {/* Product codes */}
                          <td className="p-4 space-y-1">
                            <span className="font-mono bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-[10px] font-bold">
                              {item.codigoAdm}
                            </span>
                            <div className="font-mono text-[9.5px] text-[#0A1D37] font-semibold">
                              ORIGINAL: {item.codigoOriginal}
                            </div>
                            <p className="font-medium text-slate-800 text-[11.5px] max-w-[200px] truncate" title={item.descricao}>
                              {item.descricao}
                            </p>
                          </td>

                          {/* Flow and verba details */}
                          <td className="p-4 space-y-1">
                            <span className={`inline-block px-2 py-0.5 rounded-[4px] text-[9px] uppercase font-bold border ${
                              isOption1 
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                : 'bg-indigo-50 text-indigo-700 border-indigo-100'
                            }`}>
                              {item.tipoFluxo.replace('ENTRADA DE ', '')}
                            </span>
                            {item.verbaCompra && (
                              <div className="text-[10px] font-mono text-red-655 font-bold">
                                Verba: {item.verbaCompra}
                              </div>
                            )}
                            {item.observacoes && (
                              <p className="text-[10px] text-slate-400 italic max-w-[150px] truncate" title={item.observacoes}>
                                "{item.observacoes}"
                              </p>
                            )}
                          </td>

                          {/* Quantity */}
                          <td className="p-4 text-center">
                            <strong className="text-slate-900 font-display text-sm font-black">
                              {item.quantidade}
                            </strong>
                            <span className="text-[10px] text-slate-400 block font-normal font-sans">PEÇA</span>
                          </td>

                          {/* Date and Requestor */}
                          <td className="p-4 space-y-0.5 text-slate-500 text-[11px]">
                            <p className="font-medium text-slate-700">{item.criadoPorNome}</p>
                            <p className="text-[10px] font-sans text-slate-400">
                              {new Date(item.criadoEm).toLocaleDateString()} {new Date(item.criadoEm).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </p>
                          </td>

                          {/* Current Status badges */}
                          <td className="p-4 text-center">
                            <div className="flex flex-col items-center gap-1">
                              {isConsolidado && (
                                <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-green-50 text-green-700 border border-green-200 flex items-center gap-0.5 shadow-xs">
                                  <CheckCircle className="w-3 h-3 text-green-600" /> CONSOLIDADO
                                </span>
                              )}
                              {isAguardando && (
                                <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-blue-50 text-blue-700 border border-blue-200 animate-pulse">
                                  AGUARDANDO CONSOLIDAÇÃO
                                </span>
                              )}
                              {isBloqueado && (
                                <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-red-50 text-red-700 border border-red-150 flex items-center gap-0.5">
                                  <Lock className="w-2.5 h-2.5 text-red-600" /> BLOQUEADO
                                </span>
                              )}

                              {isConsolidado && item.consolidadoPor && (
                                <span className="text-[9px] text-slate-400">
                                  Por {item.consolidadoPor}
                                </span>
                              )}
                              {isAguardando && item.liberadoGestorGeralPor && (
                                <span className="text-[9px] text-emerald-600 font-semibold px-1 bg-emerald-50 rounded">
                                  Lib. 1ª por {item.liberadoGestorGeralPor}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Operations and decision buttons */}
                          <td className="p-4 text-right">
                            <div className="flex justify-end gap-1.5">
                              
                              {/* Scenario 2: 1st Liberaçao (Apenas Admin / Guilherme) */}
                              {isBloqueado && (
                                <button
                                  onClick={() => handleLiberarGestorGeral(item.id)}
                                  className={`px-2.5 py-1.5 rounded text-[10.5px] font-bold border transition cursor-pointer flex items-center gap-1 ${
                                    isGestorGeralActive
                                      ? 'bg-red-650 hover:bg-red-700 text-white border-red-600 shadow-xs'
                                      : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                                  }`}
                                  title={isGestorGeralActive ? 'Efetuar a 1ª liberação Geral' : 'Ação restrita para Guilherme Admin (Sandbox)'}
                                >
                                  Liberar Entrada
                                  {!isGestorGeralActive && <Lock className="w-3 h-3 ml-0.5 text-slate-400" />}
                                </button>
                              )}

                              {/* Consolidaçao Final (Gestor de Amostras de Origem - Admin, Controlador ou Gerente) */}
                              {isAguardando && (
                                <button
                                  onClick={() => handleConsolidarEstoque(item)}
                                  className={`px-2.5 py-1.5 rounded text-[10px] font-bold uppercase transition flex items-center gap-1 shadow-xs border ${
                                    isGestorAmostrasActive
                                      ? 'bg-emerald-600 text-white hover:bg-emerald-700 border-emerald-500 cursor-pointer'
                                      : 'bg-slate-100 text-slate-450 border-slate-200 cursor-not-allowed'
                                  }`}
                                  title={isGestorAmostrasActive ? 'Efetivar entrada e creditar saldo de amostra' : 'Restrito para Gestor de Amostras (Sandbox)'}
                                >
                                  Consolidar Estoque
                                  {!isGestorAmostrasActive && <Lock className="w-3 h-3 text-slate-400" />}
                                </button>
                              )}

                              {isConsolidado && (
                                <span className="text-slate-400 text-[10px] italic flex items-center font-medium gap-1 text-slate-500">
                                  <CheckSquare className="w-3.5 h-3.5 text-green-500" /> Saldo Creditado CD
                                </span>
                              )}

                            </div>
                          </td>

                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} className="text-center p-10 text-slate-400">
                        Nenhuma pendência operacional cadastrada.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* 3. HISTÓRICO DE LANÇAMENTOS DE ENTRADAS */}
      {activeSubTab === 'historico' && (
        <div className="bg-white p-5 rounded-lg border border-slate-100 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3 flex justify-between items-center flex-wrap gap-2">
            <div>
              <h3 className="font-display font-bold text-[#0A1D37] text-xs uppercase">
                Histórico de Lançamentos de Entradas
              </h3>
              <p className="text-[11px] text-slate-400">Rastreabilidade completa de todas as operações consolidadas nas planilhas de estoque.</p>
            </div>
            <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-mono font-bold tracking-widest">
              LOTE FÍSICO CD
            </span>
          </div>

          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
            {/* Filter to show only inputs "entrada" to respect strictly the requested history name */}
            {movimentacoes.length > 0 ? (
              movimentacoes.map(m => {
                const isPositive = m.tipo === 'entrada' || m.tipo === 'devolução';
                return (
                  <div key={m.id} className="p-3 bg-slate-50 border border-slate-100 rounded-lg flex items-start justify-between gap-3 text-xs leading-relaxed hover:bg-slate-100/50 transition">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded text-[10px] font-bold">
                          {m.codigoAdm}
                        </span>
                        <strong className="text-slate-800">{m.produtoNome}</strong>
                      </div>
                      
                      <p className="text-slate-500 text-[11px]">
                        Responsável: <span className="font-semibold text-slate-700">{m.responsavelNome}</span> • 
                        Fluxo Logístico: <strong className="text-slate-800 uppercase font-mono text-[10px]">{m.tipo}</strong>
                        {m.lojaDestino && ` • Destino: ${m.lojaDestino}`}
                        {m.verbaCompra && <span className="text-indigo-600 font-bold block">Faturado em Verba: {m.verbaCompra}</span>}
                      </p>

                      {m.observacoes && (
                        <p className="text-slate-405 bg-white px-2 py-1 rounded border border-slate-150 italic max-w-xl">
                          "{m.observacoes}"
                        </p>
                      )}

                      <span className="text-[10px] text-slate-400 block mt-1">
                        Sincronismo CD: {new Date(m.createdAt).toLocaleString()}
                      </span>
                    </div>

                    <div className="whitespace-nowrap flex flex-col items-end shrink-0">
                      <span className={`inline-flex items-center font-display font-black text-sm px-2 py-0.5 rounded ${
                        isPositive ? 'bg-green-100 text-green-800' : 'bg-red-50 text-red-700'
                      }`}>
                        {isPositive ? '+' : '-'}{m.quantidade} PEÇAS
                      </span>
                      <span className="text-[10px] text-slate-400 mt-1 font-mono">
                        {m.saldoAnterior} &rarr; {m.saldoNovo} estoque
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center p-8 text-slate-400">
                <HelpCircle className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                <p>Nenhum lançamento consolidado no histórico geral.</p>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
