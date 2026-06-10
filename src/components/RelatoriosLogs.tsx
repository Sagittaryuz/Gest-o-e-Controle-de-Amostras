/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { DatabaseService } from '../services/db';
import { 
  LogAuditoria, User, Amostra, Solicitacao, MovimentacaoEstoque,
  ProtocoloEnvio, Recebimento, Exposicao, ConferenciaMensal, Avaria, Pendencia 
} from '../types';
import { 
  Printer, ShieldAlert, CheckCircle, FileText, 
  HelpCircle, RefreshCw, Layers, Sparkles, Download,
  FileSpreadsheet, Calendar, UserCheck, MapPin, Tag, Filter,
  Activity, Truck, Inbox, Eye, ClipboardCheck, Trash2, 
  AlertCircle, ShieldCheck, Search, X, BarChart3, AlertTriangle, 
  ChevronRight, ArrowDownToLine, Info, FileDown, ChevronDown, Check
} from 'lucide-react';

interface RelatoriosLogsProps {
  user: User;
}

type FlowId = 
  | 'amostras'
  | 'movimentacoes'
  | 'solicitacoes'
  | 'protocolos'
  | 'recebimentos'
  | 'exposicoes'
  | 'conferencias'
  | 'avarias'
  | 'pendencias'
  | 'logs';

function getStatusOptions(flowId: FlowId) {
  switch (flowId) {
    case 'amostras':
      return [
        { value: 'ativo', label: 'Ativo' },
        { value: 'inativo', label: 'Inativo' },
        { value: 'pendente', label: 'Pendente' },
        { value: 'avariado', label: 'Avariado' }
      ];
    case 'movimentacoes':
      return [
        { value: 'entrada', label: 'Entrada' },
        { value: 'saída', label: 'Saída' },
        { value: 'ajuste', label: 'Ajuste' },
        { value: 'avaria', label: 'Avaria' },
        { value: 'devolução', label: 'Devolução' }
      ];
    case 'solicitacoes':
      return [
        { value: 'Rascunho', label: 'Rascunho' },
        { value: 'Aguardando liberação', label: 'Aguardando Liberação' },
        { value: 'Liberada para separação', label: 'Liberada para Separação' },
        { value: 'Em separação', label: 'Em Separação' },
        { value: 'Separada', label: 'Separada' },
        { value: 'Enviada', label: 'Enviada' },
        { value: 'Recebida parcialmente', label: 'Recebida Parcialmente' },
        { value: 'Recebida', label: 'Recebida' },
        { value: 'Exposição pendente', label: 'Exposição Pendente' },
        { value: 'Exposição comprovada', label: 'Exposição Comprovada' },
        { value: 'Concluída', label: 'Concluída' },
        { value: 'Cancelada', label: 'Cancelada' },
        { value: 'Com divergência', label: 'Com Divergência' }
      ];
    case 'recebimentos':
      return [
        { value: 'Recebida', label: 'Recebida' },
        { value: 'Recebida parcialmente', label: 'Recebida Parcialmente' },
        { value: 'Com divergência', label: 'Com Divergência' }
      ];
    case 'exposicoes':
      return [
        { value: 'Exposição pendente', label: 'Exposição Pendente' },
        { value: 'Exposição comprovada', label: 'Exposição Comprovada' },
        { value: 'Exposição recusada', label: 'Exposição Recusada' },
        { value: 'Pendente de correção', label: 'Pendente de Correção' }
      ];
    case 'conferencias':
      return [
        { value: 'Pendente', label: 'Pendente' },
        { value: 'Respondida', label: 'Respondida' },
        { value: 'Analisada', label: 'Analisada' }
      ];
    case 'avarias':
      return [
        { value: 'Registrada', label: 'Registrada' },
        { value: 'Em análise', label: 'Em Análise' },
        { value: 'Aprovada para baixa', label: 'Aprovada para Baixa' },
        { value: 'Reposição solicitada', label: 'Reposição Solicitada' },
        { value: 'Resolvida', label: 'Resolvida' }
      ];
    case 'pendencias':
      return [
        { value: 'Aberta', label: 'Aberta' },
        { value: 'Em análise', label: 'Em Análise' },
        { value: 'Aguardando loja', label: 'Aguardando Loja' },
        { value: 'Aguardando CD', label: 'Aguardando CD' },
        { value: 'Aguardando compras', label: 'Aguardando Compras' },
        { value: 'Resolvida', label: 'Resolvida' },
        { value: 'Cancelada', label: 'Cancelada' }
      ];
    default:
      return [];
  }
}

export default function RelatoriosLogs({ user }: RelatoriosLogsProps) {
  // General view tabs
  const [activeTab, setActiveTab] = useState<'relatorios' | 'logs' | 'usuarios'>('relatorios');
  const [selectedFlow, setSelectedFlow] = useState<FlowId>('amostras');

  // Core database lists
  const [amostrasLst, setAmostrasLst] = useState<Amostra[]>([]);
  const [movimentacoesLst, setMovimentacoesLst] = useState<MovimentacaoEstoque[]>([]);
  const [solicitacoesLst, setSolicitacoesLst] = useState<Solicitacao[]>([]);
  const [protocolosLst, setProtocolosLst] = useState<ProtocoloEnvio[]>([]);
  const [recebimentosLst, setRecebimentosLst] = useState<Recebimento[]>([]);
  const [exposicoesLst, setExposicoesLst] = useState<Exposicao[]>([]);
  const [conferenciasLst, setConferenciasLst] = useState<ConferenciaMensal[]>([]);
  const [avariasLst, setAvariasLst] = useState<Avaria[]>([]);
  const [pendenciasLst, setPendenciasLst] = useState<Pendencia[]>([]);
  const [logsLst, setLogsLst] = useState<LogAuditoria[]>([]);
  const [usersList, setUsersList] = useState<User[]>([]);

  // Expanded row state (for checking transaction details, items, photos)
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  // Filters State
  const [filterPeriodo, setFilterPeriodo] = useState<string>('este_mes');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [filterLoja, setFilterLoja] = useState<string>('');
  const [filterMarca, setFilterMarca] = useState<string>('');
  const [filterCategoria, setFilterCategoria] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterResponsavel, setFilterResponsavel] = useState<string>('');
  const [globalSearch, setGlobalSearch] = useState<string>('');

  const isAdmin = user.perfil === 'Admin';

  // Load and refresh
  useEffect(() => {
    loadData();
    return DatabaseService.subscribe(loadData);
  }, []);

  const loadData = () => {
    setAmostrasLst(DatabaseService.getAmostras());
    setMovimentacoesLst(DatabaseService.getMovimentacoes());
    setSolicitacoesLst(DatabaseService.getSolicitacoes());
    setProtocolosLst(DatabaseService.getProtocolos());
    setRecebimentosLst(DatabaseService.getRecebimentos());
    setExposicoesLst(DatabaseService.getExposicoes());
    setConferenciasLst(DatabaseService.getConferencias());
    setAvariasLst(DatabaseService.getAvarias());
    setPendenciasLst(DatabaseService.getPendencias());
    setLogsLst(DatabaseService.getLogs());
    setUsersList(DatabaseService.getUsers());
  };

  const handleResetFilters = () => {
    setFilterPeriodo('este_mes');
    setStartDate('');
    setEndDate('');
    setFilterLoja('');
    setFilterMarca('');
    setFilterCategoria('');
    setFilterStatus('');
    setFilterResponsavel('');
    setGlobalSearch('');
  };

  // Helper dictionary lookup for amostras (improves brand/category mapping performance)
  const getAmostraMap = (): Record<string, Amostra> => {
    const map: Record<string, Amostra> = {};
    amostrasLst.forEach(a => {
      map[a.id] = a;
    });
    return map;
  };

  // Check if dates match custom constraints
  const isWithinDateRange = (itemDateStr: string): boolean => {
    if (!itemDateStr) return false;
    const itemDate = new Date(itemDateStr);
    if (isNaN(itemDate.getTime())) return false;
    
    let start: Date | null = null;
    let end: Date | null = null;

    if (filterPeriodo === 'custom') {
      start = startDate ? new Date(startDate + 'T00:00:00') : null;
      end = endDate ? new Date(endDate + 'T23:59:59') : null;
    } else {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (filterPeriodo === 'hoje') {
        start = today;
        end = new Date();
        end.setHours(23, 59, 59, 999);
      } else if (filterPeriodo === 'esta_semana') {
        const currentDay = today.getDay(); // 0 Sunday, 1 Monday...
        const prevMonday = new Date(today);
        prevMonday.setDate(today.getDate() - (currentDay === 0 ? 6 : currentDay - 1));
        start = prevMonday;
        end = new Date();
        end.setHours(23, 59, 59, 999);
      } else if (filterPeriodo === 'este_mes') {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        thirtyDaysAgo.setHours(0, 0, 0, 0);
        start = thirtyDaysAgo;
        end = new Date();
        end.setHours(23, 59, 59, 999);
      }
    }

    if (start && itemDate < start) return false;
    if (end && itemDate > end) return false;
    return true;
  };

  // Mappers and filters for each collection type
  const getFilteredAmostras = () => {
    return amostrasLst.filter(x => {
      if (!isWithinDateRange(x.createdAt)) return false;
      if (filterLoja && filterLoja !== 'CD' && filterLoja !== 'Centro de Distribuição') return false;
      if (filterMarca && x.marca !== filterMarca) return false;
      if (filterCategoria && x.categoria !== filterCategoria) return false;
      if (filterStatus && x.status !== filterStatus) return false;
      if (globalSearch) {
        const s = globalSearch.toLowerCase();
        const match = x.codigoAdm.toLowerCase().includes(s) || 
                      x.descricao.toLowerCase().includes(s) || 
                      x.marca.toLowerCase().includes(s) || 
                      (x.observacoes && x.observacoes.toLowerCase().includes(s));
        if (!match) return false;
      }
      return true;
    });
  };

  const getFilteredMovimentacoes = () => {
    const amMap = getAmostraMap();
    return movimentacoesLst.filter(x => {
      if (!isWithinDateRange(x.createdAt)) return false;
      if (filterLoja) {
        const matchLoja = x.lojaDestino === filterLoja || 
                          (filterLoja === 'CD' && !x.lojaDestino) || 
                          (filterLoja === 'Centro de Distribuição' && !x.lojaDestino);
        if (!matchLoja) return false;
      }
      if (filterMarca && x.marca !== filterMarca) return false;
      if (filterCategoria) {
        const am = amMap[x.amostraId];
        if (!am || am.categoria !== filterCategoria) return false;
      }
      if (filterStatus && x.tipo !== filterStatus) return false;
      if (filterResponsavel && x.responsavelNome !== filterResponsavel) return false;
      if (globalSearch) {
        const s = globalSearch.toLowerCase();
        const match = x.codigoAdm.toLowerCase().includes(s) || 
                      x.produtoNome.toLowerCase().includes(s) || 
                      x.responsavelNome.toLowerCase().includes(s) || 
                      (x.observacoes && x.observacoes.toLowerCase().includes(s));
        if (!match) return false;
      }
      return true;
    });
  };

  const getFilteredSolicitacoes = () => {
    const amMap = getAmostraMap();
    return solicitacoesLst.filter(x => {
      const dateToCheck = x.dataSolicitacao || x.createdAt;
      if (!isWithinDateRange(dateToCheck)) return false;
      if (filterLoja && !x.lojasDestino.includes(filterLoja)) return false;
      if (filterMarca) {
        const hasBrand = x.itens.some(it => it.marca === filterMarca);
        if (!hasBrand) return false;
      }
      if (filterCategoria) {
        const hasCat = x.itens.some(it => {
          const am = amMap[it.amostraId];
          return am ? am.categoria === filterCategoria : false;
        });
        if (!hasCat) return false;
      }
      if (filterStatus && x.status !== filterStatus) return false;
      if (filterResponsavel && x.solicitanteNome !== filterResponsavel) return false;
      if (globalSearch) {
        const s = globalSearch.toLowerCase();
        const match = x.numero.toLowerCase().includes(s) || 
                      x.solicitanteNome.toLowerCase().includes(s) || 
                      x.itens.some(it => it.descricao.toLowerCase().includes(s) || it.codigoAdm.toLowerCase().includes(s));
        if (!match) return false;
      }
      return true;
    });
  };

  const getFilteredProtocolos = () => {
    const amMap = getAmostraMap();
    return  protocolosLst.filter(x => {
      const dateToCheck = x.dataEnvio || x.createdAt;
      if (!isWithinDateRange(dateToCheck)) return false;
      if (filterLoja && x.lojaDestino !== filterLoja) return false;
      if (filterMarca) {
        const hasBrand = x.itens.some(it => it.marca === filterMarca);
        if (!hasBrand) return false;
      }
      if (filterCategoria) {
        const hasCat = x.itens.some(it => {
          const am = Object.values(amMap).find(a => a.codigoAdm === it.codigoAdm);
          return am ? am.categoria === filterCategoria : false;
        });
        if (!hasCat) return false;
      }
      if (filterResponsavel && x.responsavelSeparacao !== filterResponsavel && x.responsavelRecebimento !== filterResponsavel) return false;
      if (globalSearch) {
        const s = globalSearch.toLowerCase();
        const match = x.numero.toLowerCase().includes(s) || 
                      x.solicitacaoNumero.toLowerCase().includes(s) || 
                      x.responsavelSeparacao.toLowerCase().includes(s) || 
                      x.responsavelRecebimento.toLowerCase().includes(s);
        if (!match) return false;
      }
      return true;
    });
  };

  const getFilteredRecebimentos = () => {
    const amMap = getAmostraMap();
    return recebimentosLst.filter(x => {
      if (!isWithinDateRange(x.createdAt)) return false;
      if (filterLoja && x.loja !== filterLoja) return false;
      if (filterMarca) {
        const hasBrand = x.itens.some(it => {
          const am = amMap[it.amostraId];
          return am ? am.marca === filterMarca : false;
        });
        if (!hasBrand) return false;
      }
      if (filterCategoria) {
        const hasCat = x.itens.some(it => {
          const am = amMap[it.amostraId];
          return am ? am.categoria === filterCategoria : false;
        });
        if (!hasCat) return false;
      }
      if (filterStatus && x.status !== filterStatus) return false;
      if (filterResponsavel && x.gerenteNome !== filterResponsavel) return false;
      if (globalSearch) {
        const s = globalSearch.toLowerCase();
        const match = x.solicitacaoNumero.toLowerCase().includes(s) || 
                      x.gerenteNome.toLowerCase().includes(s) || 
                      x.itens.some(it => it.descricao.toLowerCase().includes(s) || it.codigoAdm.toLowerCase().includes(s));
        if (!match) return false;
      }
      return true;
    });
  };

  const getFilteredExposicoes = () => {
    const amMap = getAmostraMap();
    return exposicoesLst.filter(x => {
      if (!isWithinDateRange(x.createdAt)) return false;
      if (filterLoja && x.loja !== filterLoja) return false;
      if (filterMarca) {
        const am = amMap[x.amostraId];
        if (!am || am.marca !== filterMarca) return false;
      }
      if (filterCategoria) {
        const am = amMap[x.amostraId];
        if (!am || am.categoria !== filterCategoria) return false;
      }
      if (filterStatus && x.status !== filterStatus) return false;
      if (filterResponsavel && x.validadoPor !== filterResponsavel) return false;
      if (globalSearch) {
        const s = globalSearch.toLowerCase();
        const match = x.solicitacaoNumero.toLowerCase().includes(s) || 
                      x.codigoAdm.toLowerCase().includes(s) || 
                      x.descricao.toLowerCase().includes(s) || 
                      x.localExposicao.toLowerCase().includes(s) || 
                      (x.validadoPor && x.validadoPor.toLowerCase().includes(s));
        if (!match) return false;
      }
      return true;
    });
  };

  const getFilteredConferencias = () => {
    return conferenciasLst.filter(x => {
      const dateToCheck = x.respondidoEm || x.createdAt;
      if (!isWithinDateRange(dateToCheck)) return false;
      if (filterLoja && x.loja !== filterLoja) return false;
      if (filterMarca) {
        const hasBrand = x.itens.some(it => it.marca === filterMarca);
        if (!hasBrand) return false;
      }
      if (filterCategoria) {
        const amMap = getAmostraMap();
        const hasCat = x.itens.some(it => {
          const am = Object.values(amMap).find(a => a.codigoAdm === it.codigoAdm);
          return am ? am.categoria === filterCategoria : false;
        });
        if (!hasCat) return false;
      }
      if (filterStatus && x.status !== filterStatus) return false;
      if (filterResponsavel && x.gerenteLoja !== filterResponsavel && x.gerenteOperacional !== filterResponsavel) return false;
      if (globalSearch) {
        const s = globalSearch.toLowerCase();
        const match = x.competencia.toLowerCase().includes(s) || 
                      x.gerenteLoja.toLowerCase().includes(s) || 
                      x.itens.some(it => it.descricao.toLowerCase().includes(s) || it.codigoAdm.toLowerCase().includes(s));
        if (!match) return false;
      }
      return true;
    });
  };

  const getFilteredAvarias = () => {
    const amMap = getAmostraMap();
    return avariasLst.filter(x => {
      if (!isWithinDateRange(x.createdAt)) return false;
      if (filterLoja) {
        const matchLoja = x.loja === filterLoja || 
                          (filterLoja === 'CD' && x.local === 'CD') || 
                          (filterLoja === 'Centro de Distribuição' && x.local === 'CD');
        if (!matchLoja) return false;
      }
      if (filterMarca && x.marca !== filterMarca) return false;
      if (filterCategoria) {
        const am = amMap[x.amostraId];
        if (!am || am.categoria !== filterCategoria) return false;
      }
      if (filterStatus && x.status !== filterStatus) return false;
      if (filterResponsavel && x.responsavelNome !== filterResponsavel) return false;
      if (globalSearch) {
        const s = globalSearch.toLowerCase();
        const match = x.codigoAdm.toLowerCase().includes(s) || 
                      x.descricao.toLowerCase().includes(s) || 
                      x.responsavelNome.toLowerCase().includes(s) || 
                      x.descricaoAvaria.toLowerCase().includes(s);
        if (!match) return false;
      }
      return true;
    });
  };

  const getFilteredPendencias = () => {
    const amMap = getAmostraMap();
    return pendenciasLst.filter(x => {
      if (!isWithinDateRange(x.createdAt)) return false;
      if (filterLoja && x.loja !== filterLoja) return false;
      if (filterMarca) {
        const am = x.amostraId ? amMap[x.amostraId] : Object.values(amMap).find(a => a.codigoAdm === x.codigoAdm);
        if (!am || am.marca !== filterMarca) return false;
      }
      if (filterCategoria) {
        const am = x.amostraId ? amMap[x.amostraId] : Object.values(amMap).find(a => a.codigoAdm === x.codigoAdm);
        if (!am || am.categoria !== filterCategoria) return false;
      }
      if (filterStatus && x.status !== filterStatus) return false;
      if (filterResponsavel && x.responsavel !== filterResponsavel) return false;
      if (globalSearch) {
        const s = globalSearch.toLowerCase();
        const match = x.codigoAdm.toLowerCase().includes(s) || 
                      x.tipo.toLowerCase().includes(s) || 
                      x.origem.toLowerCase().includes(s) || 
                      x.responsavel.toLowerCase().includes(s);
        if (!match) return false;
      }
      return true;
    });
  };

  const getFilteredLogs = () => {
    return logsLst.filter(x => {
      if (!isWithinDateRange(x.createdAt)) return false;
      if (filterLoja) {
        const u = usersList.find(usr => usr.id === x.usuarioId || usr.nome === x.usuarioNome);
        const userLoja = u ? u.loja : '';
        if (!userLoja || userLoja !== filterLoja) return false;
      }
      if (filterStatus && !x.acao.toLowerCase().includes(filterStatus.toLowerCase()) && !x.modulo.toLowerCase().includes(filterStatus.toLowerCase())) return false;
      if (filterResponsavel && x.usuarioNome !== filterResponsavel) return false;
      if (globalSearch) {
        const s = globalSearch.toLowerCase();
        const match = x.usuarioNome.toLowerCase().includes(s) || 
                      x.acao.toLowerCase().includes(s) || 
                      x.modulo.toLowerCase().includes(s) || 
                      (x.observacao && x.observacao.toLowerCase().includes(s));
        if (!match) return false;
      }
      return true;
    });
  };

  // Switch selector returning active filtered array
  const getActiveFilteredList = (): any[] => {
    switch (selectedFlow) {
      case 'amostras': return getFilteredAmostras();
      case 'movimentacoes': return getFilteredMovimentacoes();
      case 'solicitacoes': return getFilteredSolicitacoes();
      case 'protocolos': return getFilteredProtocolos();
      case 'recebimentos': return getFilteredRecebimentos();
      case 'exposicoes': return getFilteredExposicoes();
      case 'conferencias': return getFilteredConferencias();
      case 'avarias': return getFilteredAvarias();
      case 'pendencias': return getFilteredPendencias();
      case 'logs': return getFilteredLogs();
      default: return [];
    }
  };

  const toggleRowExpanded = (rowId: string) => {
    setExpandedRows(prev => ({ ...prev, [rowId]: !prev[rowId] }));
  };

  // Extract unique filter properties from database dynamically
  const uniqueMarcas = Array.from(new Set(amostrasLst.map(a => a.marca).filter(Boolean)));
  const uniqueCategorias = Array.from(new Set(amostrasLst.map(a => a.categoria).filter(Boolean)));
  const uniqueResponsaveis = Array.from(new Set([
    ...movimentacoesLst.map(m => m.responsavelNome),
    ...solicitacoesLst.map(s => s.solicitanteNome),
    ...protocolosLst.map(p => p.responsavelSeparacao),
    ...protocolosLst.map(p => p.responsavelRecebimento),
    ...recebimentosLst.map(r => r.gerenteNome),
    ...exposicoesLst.map(e => e.validadoPor),
    ...conferenciasLst.map(c => c.gerenteLoja),
    ...conferenciasLst.map(c => c.gerenteOperacional),
    ...avariasLst.map(a => a.responsavelNome),
    ...pendenciasLst.map(p => p.responsavel),
    ...logsLst.map(l => l.usuarioNome)
  ].filter(Boolean)));

  const handlePrint = () => {
    window.print();
  };

  // CSV Generation Routine with Delimiters & UTF-8 BOM
  const handleExportCSV = () => {
    const filteredList = getActiveFilteredList();
    if (filteredList.length === 0) {
      alert('Nenhum registro encontrado para exportação com os filtros atuais.');
      return;
    }

    let headers: string[] = [];
    let rows: string[][] = [];

    switch (selectedFlow) {
      case 'amostras':
        headers = ['ID', 'Código ADM', 'Descrição', 'Marca', 'Categoria', 'Tamanho', 'Estoque', 'Estoque Mínimo', 'Status', 'Data Cadastro'];
        rows = filteredList.map((x: Amostra) => [
          x.id, x.codigoAdm, x.descricao, x.marca, x.categoria, x.tamanho || '', x.saldoAtual.toString(), x.estoqueMinimo.toString(), x.status, new Date(x.createdAt).toLocaleDateString()
        ]);
        break;
      case 'movimentacoes':
        headers = ['ID', 'Cód ADM', 'Produto', 'Marca', 'Tipo Movimento', 'Quantidade', 'Anterior', 'Novo', 'Loja Destino', 'Responsável', 'Data'];
        rows = filteredList.map((x: MovimentacaoEstoque) => [
          x.id, x.codigoAdm, x.produtoNome, x.marca, x.tipo, x.quantidade.toString(), x.saldoAnterior.toString(), x.saldoNovo.toString(), x.lojaDestino || 'CD', x.responsavelNome, new Date(x.createdAt).toLocaleDateString()
        ]);
        break;
      case 'solicitacoes':
        headers = ['ID', 'Número Remessa', 'Data', 'Solicitante', 'Prioridade', 'Filial Destino', 'Itens Solicitados', 'Status Geral'];
        rows = filteredList.map((x: Solicitacao) => [
          x.id, x.numero, new Date(x.dataSolicitacao || x.createdAt).toLocaleDateString(), x.solicitanteNome, x.prioridade, x.lojasDestino.join(', '), x.itens.length.toString(), x.status
        ]);
        break;
      case 'protocolos':
        headers = ['ID', 'Número Romaneio', 'Número Solicitação', 'Filial Destino', 'Separador CD', 'Gerente Recebedor', 'Data Envio', 'Total De Itens'];
        rows = filteredList.map((x: ProtocoloEnvio) => [
          x.id, x.numero, x.solicitacaoNumero, x.lojaDestino, x.responsavelSeparacao, x.responsavelRecebimento, new Date(x.dataEnvio || x.createdAt).toLocaleDateString(), x.itens.length.toString()
        ]);
        break;
      case 'recebimentos':
        headers = ['ID', 'Solicitação', 'Filial', 'Gerente Recebedor', 'Status Recebimento', 'Itens', 'Observações', 'Registrado Em'];
        rows = filteredList.map((x: Recebimento) => [
          x.id, x.solicitacaoNumero, x.loja, x.gerenteNome, x.status, x.itens.length.toString(), x.observacoes || '', new Date(x.createdAt).toLocaleDateString()
        ]);
        break;
      case 'exposicoes':
        headers = ['ID', 'Código ADM', 'Descrição', 'Filial', 'Setor Showroom', 'Exposta', 'Integra', 'Limpa', 'Identificada', 'Padronizada', 'Status', 'Validador', 'Criado Em'];
        rows = filteredList.map((x: Exposicao) => [
          x.id, x.codigoAdm, x.descricao, x.loja, x.localExposicao, x.produtoExposto, x.integridadeFisica ? 'Sim' : 'Não', x.limpezaConservacao ? 'Sim' : 'Não', x.identificacaoCorreta ? 'Sim' : 'Não', x.localizacaoAdequada ? 'Sim' : 'Não', x.status, x.validadoPor || '', new Date(x.createdAt).toLocaleDateString()
        ]);
        break;
      case 'conferencias':
        headers = ['ID', 'Competência', 'Filial', 'Gerente Geral', 'Gerente Operacional', 'Status Conferencia', 'Prazo Resposta', 'Fatores Avaliados'];
        rows = filteredList.map((x: ConferenciaMensal) => [
          x.id, x.competencia, x.loja, x.gerenteLoja, x.gerenteOperacional, x.status, new Date(x.prazoResposta).toLocaleDateString(), x.itens.length.toString()
        ]);
        break;
      case 'avarias':
        headers = ['ID', 'ADM Code', 'Produto', 'Fornecedor', 'Quantidade Quebrada', 'Localização Físico', 'Filial Comercial', 'Funcionário', 'Defeito Técnico', 'Status Baixa', 'Ocorrido Em'];
        rows = filteredList.map((x: Avaria) => [
          x.id, x.codigoAdm, x.descricao, x.marca, x.quantidade.toString(), x.local, x.loja || 'CD', x.responsavelNome, x.descricaoAvaria, x.status, new Date(x.createdAt).toLocaleDateString()
        ]);
        break;
      case 'pendencias':
        headers = ['ID', 'Tipo Ocorrência', 'Origem Operação', 'Filial', 'Código ADM', 'Responsável Atendimento', 'Data Prazo', 'Status Pendencia', 'Aberto Em'];
        rows = filteredList.map((x: Pendencia) => [
          x.id, x.tipo, x.origem, x.loja, x.codigoAdm, x.responsavel, new Date(x.prazo).toLocaleDateString(), x.status, new Date(x.createdAt).toLocaleDateString()
        ]);
        break;
      case 'logs':
        headers = ['ID', 'Funcionário', 'Módulo', 'Ação', 'Registro ID', 'Modificado', 'Timestamp'];
        rows = filteredList.map((x: LogAuditoria) => [
          x.id, x.usuarioNome, x.modulo, x.acao, x.registroId, x.valorNovo || '', new Date(x.createdAt).toLocaleString()
        ]);
        break;
      default:
        return;
    }

    // Map each row value securely and escape quoting
    const csvContent = [
      headers.join(';'),
      ...rows.map(row => row.map(val => {
        if (val === null || val === undefined) return '""';
        const cleanVal = val.toString().replace(/"/g, '""').replace(/;/g, ' ');
        return `"${cleanVal}"`;
      }).join(';'))
    ].join('\n');

    // Blob creation with UTF-8 BOM indicator (\uFEFF)
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `relatorio_audit_${selectedFlow}_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getFluxoTitle = (id: FlowId): string => {
    switch (id) {
      case 'amostras': return 'Cadastro Geral de Amostras';
      case 'movimentacoes': return 'Fluxos de Movimentações de Gôndola';
      case 'solicitacoes': return 'Solicitações de Distribuição de Remessas';
      case 'protocolos': return 'Romaneios de Despacho Logístico';
      case 'recebimentos': return 'Conferências de Descargas em Loja';
      case 'exposicoes': return 'Evidências Físicas de Exposição';
      case 'conferencias': return 'Relatórios de Conferência Mensal';
      case 'avarias': return 'Perdas, Avarias e descartes';
      case 'pendencias': return 'Registro Operacional de Pendências';
      case 'logs': return 'Histórico e Logs de Auditoria';
    }
  };

  // Core visual status layout config for each status state
  const renderStatusBadge = (status: string, flow: FlowId) => {
    let bg = 'bg-slate-100 text-slate-800';
    if (['ativo', 'sim', 'Recebida', 'Exposição comprovada', 'Concluída', 'Respondida', 'Analisada', 'Resolvida', 'Resolvido'].includes(status)) {
      bg = 'bg-green-50 text-green-700 border border-green-200';
    } else if (['pendente', 'ajuste', 'Aguardando liberação', 'Em separação', 'Separada', 'Enviada', 'Exposição pendente', 'Pendente de reposição', 'Registrada', 'Em análise', 'Aguardando loja', 'Aguardando CD', 'Aguardando compras', 'Recebida parcialmente'].includes(status)) {
      bg = 'bg-slate-50 text-[#0A1D37] border border-slate-200';
    } else if (['inativo', 'não', 'Exposição recusada', 'Pendente de correção', 'Avariado', 'Baixado', 'Reposição solicitada', 'Cancelada', 'Aprovada para baixa', 'Com divergência', 'Produto inexistente', 'Exposição inadequada', 'Falta de amostra', 'Divergência de quantidade', 'Produto avariado', 'Produto não exposto', 'Exposição sem foto', 'Produto recebido parcialmente', 'Estoque insuficiente', 'Ausência de verba de compra', 'Produto sem identificação', 'Divergência de conferência mensal', 'Aberta'].includes(status)) {
      bg = 'bg-rose-50 text-rose-700 border border-rose-200';
    }
    return <span className={`px-2 py-0.5 rounded font-bold uppercase font-mono text-[9px] ${bg}`}>{status}</span>;
  };

  // Sub tab config lists
  const flowsList = [
    { id: 'amostras' as FlowId, name: 'Amostras de Showroom', icon: Layers, desc: 'Catálogo de amostras físicas cadastradas', count: amostrasLst.length },
    { id: 'movimentacoes' as FlowId, name: 'Movimentações de CD', icon: Activity, desc: 'Entrada, Saída e Ajustes do Estoque Central', count: movimentacoesLst.length },
    { id: 'solicitacoes' as FlowId, name: 'Solicitações Comerciais', icon: FileText, desc: 'Remessas comerciais autorizadas', count: solicitacoesLst.length },
    { id: 'protocolos' as FlowId, name: 'Protocolos de Envio', icon: Truck, desc: 'Romaneios de expedição logística', count:  protocolosLst.length },
    { id: 'recebimentos' as FlowId, name: 'Recepções na Loja', icon: Inbox, desc: 'Conferência física na descarga', count: recebimentosLst.length },
    { id: 'exposicoes' as FlowId, name: 'Evidências de Exposição', icon: Eye, desc: 'Validações fotográficas dos painéis', count: exposicoesLst.length },
    { id: 'conferencias' as FlowId, name: 'Conferências Periódicas', icon: ClipboardCheck, desc: 'Auditorias mensais enviadas por gerentes', count: conferenciasLst.length },
    { id: 'avarias' as FlowId, name: 'Avarias e Quebras', icon: Trash2, desc: 'Descartes de showrooms danificados', count: avariasLst.length },
    { id: 'pendencias' as FlowId, name: 'Pendências Operacionais', icon: AlertCircle, desc: 'Chamados abertos em averiguação', count: pendenciasLst.length },
    { id: 'logs' as FlowId, name: 'Segurança e Auditoria', icon: ShieldCheck, desc: 'Histórico de transações sistêmicas', count: logsLst.length },
  ];

  const activeFilteredList = getActiveFilteredList();

  // Dynamic values of KPI statistics cards
  const getFlowKPIs = () => {
    const list = activeFilteredList;
    const totalCount = list.length;
    
    let label1 = 'Registros';
    let val1 = totalCount;
    
    let label2 = 'Divergentes';
    let val2 = 0;
    
    let label3 = 'Volume Itens';
    let val3 = 0;

    let label4 = 'Status Concluído';
    let val4 = 0;

    switch (selectedFlow) {
      case 'amostras':
        label1 = 'Amostras Ativas';
        val1 = list.filter(x => x.status === 'ativo').length;
        label2 = 'Avariadas / Inativas';
        val2 = list.filter(x => x.status === 'avariado' || x.status === 'inativo').length;
        label3 = 'Total de Modelos';
        val3 = totalCount;
        label4 = 'Abaixo Mínimo';
        val4 = list.filter(x => x.saldoAtual < x.estoqueMinimo).length;
        break;
      case 'movimentacoes':
        label1 = 'Entradas';
        val1 = list.filter(x => ['entrada', 'devolução'].includes(x.tipo)).length;
        label2 = 'Saídas';
        val2 = list.filter(x => ['saída', 'avaria'].includes(x.tipo)).length;
        label3 = 'Previsão Peças';
        val3 = list.reduce((sum, x) => sum + x.quantidade, 0);
        label4 = 'Movimentações';
        val4 = totalCount;
        break;
      case 'solicitacoes':
        label1 = 'Não Iniciadas';
        val1 = list.filter(x => ['Rascunho', 'Aguardando liberação', 'Liberada para separação'].includes(x.status)).length;
        label2 = 'Em Trânsito';
        val2 = list.filter(x => ['Em separação', 'Separada', 'Enviada'].includes(x.status)).length;
        label3 = 'Confirmadas Loja';
        val3 = list.filter(x => ['Recebida', 'Exposição comprovada', 'Concluída'].includes(x.status)).length;
        label4 = 'Erros / Pendências';
        val4 = list.filter(x => ['Com divergência', 'Cancelada'].includes(x.status)).length;
        break;
      case 'recebimentos':
        label1 = 'Concluídas OK';
        val1 = list.filter(x => x.status === 'Recebida').length;
        label2 = 'Com Divergência';
        val2 = list.filter(x => x.status === 'Com divergência' || x.status === 'Recebida parcialmente').length;
        label3 = 'Peças Solicitadas';
        val3 = list.reduce((pSum, curr) => pSum + curr.itens.reduce((iSum: number, it: any) => iSum + it.quantidadeSolicitada, 0), 0);
        label4 = 'Peças Recebidas';
        val4 = list.reduce((pSum, curr) => pSum + curr.itens.reduce((iSum: number, it: any) => iSum + it.quantidadeRecebida, 0), 0);
        break;
      case 'exposicoes':
        label1 = 'Expostas de Fato';
        val1 = list.filter(x => x.produtoExposto === 'sim').length;
        label2 = 'Validadas OK';
        val2 = list.filter(x => x.status === 'Exposição comprovada').length;
        label3 = 'Pendentes / Correção';
        val3 = list.filter(x => x.status === 'Exposição pendente' || x.status === 'Pendente de correção').length;
        label4 = 'Checklist Perfeito';
        val4 = list.filter(x => x.integridadeFisica && x.limpezaConservacao && x.identificacaoCorreta && x.localizacaoAdequada).length;
        break;
      case 'conferencias':
        label1 = 'Respondidas';
        val1 = list.filter(x => x.status === 'Respondida' || x.status === 'Analisada').length;
        label2 = 'Sem Resposta';
        val2 = list.filter(x => x.status === 'Pendente').length;
        label3 = 'Fatores Críticos';
        val3 = list.reduce((sSum, conf) => sSum + conf.itens.filter((it: any) => it.statusExposicao !== 'Exposto corretamente').length, 0);
        label4 = 'Total Inspeções';
        val4 = totalCount;
        break;
      case 'avarias':
        label1 = 'Aprovadas / Baixadas';
        val1 = list.filter(x => x.status === 'Resolvida' || x.status === 'Aprovada para baixa').length;
        label2 = 'Sob Investigação';
        val2 = list.filter(x => x.status === 'Registrada' || x.status === 'Em análise').length;
        label3 = 'Peças Jogadas Fora';
        val3 = list.reduce((sum, x) => sum + x.quantidade, 0);
        label4 = 'Reposição Acionada';
        val4 = list.filter(x => x.status === 'Reposição solicitada').length;
        break;
      case 'pendencias':
        label1 = 'Resolvido CD/Loja';
        val1 = list.filter(x => x.status === 'Resolvida').length;
        label2 = 'Incidentes Em Aberto';
        val2 = list.filter(x => x.status !== 'Resolvida' && x.status !== 'Cancelada').length;
        label3 = 'Total Ocorrências';
        val3 = totalCount;
        label4 = 'Fora Prazo';
        val4 = list.filter(x => x.status !== 'Resolvida' && new Date(x.prazo) < new Date()).length;
        break;
      case 'logs':
        label1 = 'Segurança / Login';
        val1 = list.filter(x => x.acao.includes('Login')).length;
        label2 = 'Modificações Críticas';
        val2 = list.filter(x => x.acao.includes('Exclusão') || x.acao.includes('Modificação') || x.acao.includes('Baixa')).length;
        label3 = 'Modulo Amostras';
        val3 = list.filter(x => x.modulo === 'Amostras').length;
        label4 = 'Modulo Solicitacoes';
        val4 = list.filter(x => x.modulo === 'Solicitações').length;
        break;
    }

    return { label1, val1, label2, val2, label3, val3, label4, val4 };
  };

  const kpis = getFlowKPIs();

  return (
    <div className="space-y-6" id="relatorios_logs_master">
      {/* Sub tabs nav */}
      <div className="flex border-b border-slate-200 bg-white shadow-xs p-1 rounded-lg gap-2 overflow-x-auto no-print shrink-0">
        <button 
          onClick={() => { setActiveTab('relatorios'); }}
          className={`btn-operational px-4 py-2 rounded-md text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 ${
            activeTab === 'relatorios' ? 'bg-[#0A1D37] text-white' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <BarChart3 className="w-4 h-4" /> Relatórios Operacionais e Avançados
        </button>
        {isAdmin && (
          <>
            <button 
              onClick={() => { setActiveTab('logs'); }}
              className={`btn-operational px-4 py-2 rounded-md text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 ${
                activeTab === 'logs' ? 'bg-[#0A1D37] text-white' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <ShieldCheck className="w-4 h-4" /> Trilha de Segurança Básica
            </button>
            <button 
              onClick={() => { setActiveTab('usuarios'); }}
              className={`btn-operational px-4 py-2 rounded-md text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 ${
                activeTab === 'usuarios' ? 'bg-[#0A1D37] text-white' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <UserCheck className="w-4 h-4" /> Listagem de Funcionários
            </button>
          </>
        )}
      </div>

      {activeTab === 'relatorios' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT COLUMN: Sidebar Flows Selector */}
          <div className="lg:col-span-3 space-y-3 no-print">
            <div className="bg-[#0A1D37] text-white rounded-lg p-4 border border-[#0A1D37]/15 shadow-sm leading-relaxed">
              <Sparkles className="w-5 h-5 text-red-500 mb-1 animate-pulse" />
              <h3 className="font-bold text-sm">Estruturação de Auditoria</h3>
              <p className="text-slate-400 text-[10px] mt-0.5">Selecione o fluxo corporativo para carregar e filtrar os dados integrados das gôndolas e armazéns.</p>
            </div>
            
            <nav className="bg-white rounded-lg border border-slate-150 p-2 space-y-1 block max-h-[580px] overflow-y-auto shadow-xs">
              {flowsList.map((f) => {
                const IconComp = f.icon;
                const isSelected = selectedFlow === f.id;
                return (
                  <button
                    key={f.id}
                    onClick={() => {
                      setSelectedFlow(f.id);
                      setFilterStatus(''); // clear target status when flow changes to avoid invalid combinations
                      setExpandedRows({});
                    }}
                    className={`w-full group text-left p-2.5 rounded-md flex items-center gap-3 transition-all relative ${
                      isSelected ? 'bg-[#0A1D37] text-white' : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div className={`p-1.5 rounded ${isSelected ? 'bg-red-500 text-white' : 'bg-slate-100 group-hover:bg-slate-200'}`}>
                      <IconComp className="w-4 h-4 shrink-0" />
                    </div>
                    <div className="flex-1 min-w-0 pr-6">
                      <p className="text-xs font-bold truncate leading-tight">{f.name}</p>
                      <p className={`text-[9px] truncate mt-0.5 ${isSelected ? 'text-slate-350' : 'text-slate-400'}`}>{f.desc}</p>
                    </div>
                    <span className={`text-[10px] font-bold font-mono px-1.5 py-0.5 rounded absolute right-2.5 top-3.5 ${
                      isSelected ? 'bg-white/10 text-white' : 'bg-slate-150 text-slate-600'
                    }`}>
                      {f.count}
                    </span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* RIGHT COLUMN: Interactive Report Console */}
          <div className="lg:col-span-9 space-y-6">
            
            {/* CONTROLS & FILTER SYSTEM CARD */}
            <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs space-y-4 no-print font-display">
              <div className="flex items-center justify-between border-b pb-3">
                <div className="flex items-center gap-2">
                  <Filter className="w-5 h-5 text-red-650 shrink-0" />
                  <h4 className="font-bold text-sm text-slate-800">Filtros Avançados de Cobertura</h4>
                </div>
                <button
                  onClick={handleResetFilters}
                  className="text-xs font-bold text-red-650 hover:text-red-750 flex items-center gap-1 bg-red-50 px-2.5 py-1 rounded transition-all cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Limpar Filtros
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs font-semibold">
                
                {/* Filter: Period Selection */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold uppercase text-slate-500 font-mono">Período de Referência</label>
                  <select
                    value={filterPeriodo}
                    onChange={e => setFilterPeriodo(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md bg-white select-custom text-slate-800 font-medium"
                  >
                    <option value="hoje">Hoje (Registros nas últimas 24h)</option>
                    <option value="esta_semana">Esta Semana (Segunda a hoje)</option>
                    <option value="este_mes">Últimos 30 Dias (Padrão)</option>
                    <option value="custom">Período Customizado (Escolher datas)</option>
                  </select>
                </div>

                {/* Filter: Shop Unit Selection */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold uppercase text-slate-500 font-mono">Filial Comercial / CD</label>
                  <select
                    value={filterLoja}
                    onChange={e => setFilterLoja(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md bg-white select-custom text-slate-800 font-medium"
                  >
                    <option value="">Todas as Filiais (Geral)</option>
                    <option value="CD">Centro de Distribuição (Logística)</option>
                    <option value="MATRIZ">MATRIZ (Gôndola central)</option>
                    <option value="CATEDRAL">CATEDRAL (Boutique acabamentos)</option>
                    <option value="MINEIROS">MINEIROS (Outlet)</option>
                    <option value="SAID ABDALA">SAID ABDALA (Homecenter)</option>
                    <option value="RIO VERDE">RIO VERDE (Parceria)</option>
                  </select>
                </div>

                {/* Filter: Manufacturer Brand */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold uppercase text-slate-500 font-mono">Marca / Fornecedor</label>
                  <select
                    value={filterMarca}
                    onChange={e => setFilterMarca(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md bg-white select-custom text-slate-800 font-medium"
                  >
                    <option value="">Todos Fornecedores</option>
                    {uniqueMarcas.map(brand => (
                      <option key={brand} value={brand}>{brand}</option>
                    ))}
                  </select>
                </div>

                {/* Filter: Finishing Category */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold uppercase text-slate-500 font-mono">Categoria de Acabamento</label>
                  <select
                    value={filterCategoria}
                    onChange={e => setFilterCategoria(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md bg-white select-custom text-slate-800 font-medium"
                  >
                    <option value="">Todas as Categorias</option>
                    {uniqueCategorias.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                {/* Custom Period Input Controls (Rendered conditionally) */}
                {filterPeriodo === 'custom' && (
                  <div className="sm:col-span-2 grid grid-cols-2 gap-3 transition-opacity duration-350 shrink-0">
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold uppercase text-slate-500 font-mono">Data Inicial</label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={e => setStartDate(e.target.value)}
                        className="w-full px-3 py-2 border rounded-md text-slate-800 font-semibold focus:outline-none focus:border-[#0A1D37]"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold uppercase text-slate-500 font-mono">Data Final</label>
                      <input
                        type="date"
                        value={endDate}
                        onChange={e => setEndDate(e.target.value)}
                        className="w-full px-3 py-2 border rounded-md text-slate-800 font-semibold focus:outline-none focus:border-[#0A1D37]"
                        required
                      />
                    </div>
                  </div>
                )}

                {/* Filter: Flow Status Dropdown */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold uppercase text-slate-500 font-mono">Fatores de Status</label>
                  <select
                    value={filterStatus}
                    onChange={e => setFilterStatus(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md bg-white select-custom text-slate-800 font-medium"
                  >
                    <option value="">Todos os Statuses</option>
                    {getStatusOptions(selectedFlow).map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                {/* Filter: Supervisor Responsável */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold uppercase text-slate-500 font-mono">Responsável Operacional</label>
                  <select
                    value={filterResponsavel}
                    onChange={e => setFilterResponsavel(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md bg-white select-custom text-slate-800 font-medium font-display"
                  >
                    <option value="">Qualquer Pessoa</option>
                    {uniqueResponsaveis.map(resp => (
                      <option key={resp} value={resp}>{resp}</option>
                    ))}
                  </select>
                </div>

                {/* Dynamic Global Keyword Search */}
                <div className="sm:col-span-2 md:col-span-2 space-y-1">
                  <label className="block text-[10px] font-bold uppercase text-slate-500 font-mono">Pesquisa Textual Integrada (Código/Nome)</label>
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 shrink-0" />
                    <input
                      type="text"
                      placeholder="Pesquise por código adm, descrição, etc..."
                      value={globalSearch}
                      onChange={e => setGlobalSearch(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 border rounded-md text-slate-800 font-semibold focus:outline-none focus:border-[#0A1D37]"
                    />
                  </div>
                </div>

              </div>
            </div>

            {/* DYNAMIC METRIC KPI CARDS FOR FILTERED DATASET */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 no-print text-xs font-semibold leading-relaxed">
              <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                <span className="text-slate-450 uppercase font-mono text-[9px] block font-bold leading-none mb-1">{kpis.label1}</span>
                <strong className="text-slate-900 text-lg sm:text-xl block leading-tight font-display">{kpis.val1}</strong>
              </div>
              <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                <span className="text-slate-450 uppercase font-mono text-[9px] block font-bold leading-none mb-1">{kpis.label2}</span>
                <strong className={`text-lg sm:text-xl block leading-tight font-display ${kpis.val2 > 0 ? 'text-rose-600' : 'text-slate-900'}`}>{kpis.val2}</strong>
              </div>
              <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                <span className="text-slate-450 uppercase font-mono text-[9px] block font-bold leading-none mb-1">{kpis.label3}</span>
                <strong className="text-slate-900 text-lg sm:text-xl block leading-tight font-display">{kpis.val3}</strong>
              </div>
              <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                <span className="text-slate-450 uppercase font-mono text-[9px] block font-bold leading-none mb-1">{kpis.label4}</span>
                <strong className={`text-lg sm:text-xl block leading-tight font-display ${kpis.val4 > 0 && selectedFlow === 'amostras' ? 'text-red-650' : 'text-slate-900'}`}>{kpis.val4}</strong>
              </div>
            </div>

            {/* TOOLBAR FOR PRINTING/EXPORTING */}
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex justify-between items-center flex-wrap gap-2 no-print font-display">
              <span className="text-slate-500 text-xs font-semibold flex items-center gap-1.5 ml-1">
                <Info className="w-4 h-4 text-[#0A1D37] shrink-0" />
                <span>Mostrando <strong>{activeFilteredList.length}</strong> registros filtrados</span>
              </span>

              <div className="flex gap-2 shrink-0">
                <button
                  onClick={handleExportCSV}
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 text-xs font-bold rounded-md flex items-center gap-2 transition"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> Exportar para CSV
                </button>
                <button
                  onClick={handlePrint}
                  className="px-3.5 py-1.5 bg-[#0A1D37] hover:bg-slate-805 text-white text-xs font-bold rounded-md flex items-center gap-2 transition cursor-pointer"
                >
                  <Printer className="w-4 h-4" /> Exportar / Imprimir PDF
                </button>
              </div>
            </div>

            {/* PRINT VIEW SHEETS CANVAS */}
            <div className="bg-white p-6 sm:p-8 rounded-lg border border-slate-200 shadow-sm print:border-none print:shadow-none print:p-0 space-y-6">
              
              {/* Formal Report Header (Printers only on paper, preview on screen) */}
              <div className="border-b-2 border-slate-900 pb-4 flex justify-between items-start">
                <div>
                  <h2 className="text-base sm:text-lg font-bold uppercase text-slate-900 tracking-tight">J. Cruzeiro Construção & Acabamento</h2>
                  <h1 className="text-xs sm:text-sm font-semibold text-slate-500 uppercase">{getFluxoTitle(selectedFlow)}</h1>
                </div>
                <div className="text-right text-[10px] leading-relaxed font-semibold">
                  <span className="text-slate-400 uppercase font-bold block">Assinatura Digital Auditoria:</span>
                  <strong className="text-slate-800 block uppercase">{user.nome} ({user.perfil})</strong>
                  <span className="text-slate-500 font-mono block mt-0.5">{new Date().toLocaleString('pt-BR')}</span>
                </div>
              </div>

              {/* Dynamic Applied Active Filters indicator box for auditors */}
              <div className="bg-slate-50 p-3 rounded border border-slate-150 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-slate-600 font-semibold font-mono">
                <div><strong>Período:</strong> {filterPeriodo === 'custom' ? `${startDate || 'Início'} a ${endDate || 'Fim'}` : filterPeriodo.replace('_', ' ')}</div>
                {filterLoja && <div><strong>Filial:</strong> {filterLoja}</div>}
                {filterMarca && <div><strong>Marca:</strong> {filterMarca}</div>}
                {filterCategoria && <div><strong>Categoria:</strong> {filterCategoria}</div>}
                {filterStatus && <div><strong>Status:</strong> {filterStatus}</div>}
                {filterResponsavel && <div><strong>Resp.:</strong> {filterResponsavel}</div>}
                {globalSearch && <div><strong>Busca:</strong> "{globalSearch}"</div>}
              </div>

              {/* HIGH FIDELITY ACTIONABLE DATA TABLE */}
              <div className="overflow-x-auto select-none border border-slate-150 rounded-lg">
                <table className="w-full text-left text-xs border-collapse">
                  
                  {/* DYNAMIC HEADER CORRESPONDING TO ACTIVE OPERATIONAL FLOW */}
                  <thead>
                    <tr className="bg-slate-50 text-slate-450 uppercase font-mono font-bold text-[9px] border-b border-slate-150">
                      
                      {selectedFlow === 'amostras' && (
                        <>
                          <th className="p-3">Código ADM</th>
                          <th className="p-3">Descrição do Acabamento</th>
                          <th className="p-3">Marca</th>
                          <th className="p-3">Categoria</th>
                          <th className="p-3">Tamanho</th>
                          <th className="p-3 text-right">Físico</th>
                          <th className="p-3 text-right">Mínimo</th>
                          <th className="p-3 text-center">Status</th>
                          <th className="p-3 text-right no-print">Ações</th>
                        </>
                      )}

                      {selectedFlow === 'movimentacoes' && (
                        <>
                          <th className="p-3">Código</th>
                          <th className="p-3">Amostra / Acabamento</th>
                          <th className="p-3">Fluxo</th>
                          <th className="p-3 text-right">Qtd</th>
                          <th className="p-3 text-right">S. Ant.</th>
                          <th className="p-3 text-right">S. Novo</th>
                          <th className="p-3">Destino</th>
                          <th className="p-3">Responsável</th>
                          <th className="p-3 text-right">Data</th>
                          <th className="p-3 text-right no-print">Ações</th>
                        </>
                      )}

                      {selectedFlow === 'solicitacoes' && (
                        <>
                          <th className="p-3">Código Lote</th>
                          <th className="p-3">Requisitante</th>
                          <th className="p-3">Lojas Destino</th>
                          <th className="p-3 text-center">Prioridade</th>
                          <th className="p-3 text-right">Qtd Itens</th>
                          <th className="p-3 text-center">Ciclo Geral</th>
                          <th className="p-3 text-right no-print">Ações</th>
                        </>
                      )}

                      {selectedFlow === 'protocolos' && (
                        <>
                          <th className="p-3">N° Romaneio</th>
                          <th className="p-3">Remessa Comercial</th>
                          <th className="p-3">Filial Destino</th>
                          <th className="p-3">Separador CD</th>
                          <th className="p-3">Gerente Receptor</th>
                          <th className="p-3 text-right">Qtd Itens</th>
                          <th className="p-3 text-right">Data Despacho</th>
                          <th className="p-3 text-right no-print">Ações</th>
                        </>
                      )}

                      {selectedFlow === 'recebimentos' && (
                        <>
                          <th className="p-3">Solicitação</th>
                          <th className="p-3">Filial Atendimento</th>
                          <th className="p-3">Receptor Loja</th>
                          <th className="p-3 text-center">Integridade</th>
                          <th className="p-3 text-right">Itens Recebidos</th>
                          <th className="p-3 text-right">Data Evento</th>
                          <th className="p-3 text-right no-print">Ações</th>
                        </>
                      )}

                      {selectedFlow === 'exposicoes' && (
                        <>
                          <th className="p-3">Remessa</th>
                          <th className="p-3">Código ADM</th>
                          <th className="p-3">Produto</th>
                          <th className="p-3">Filial</th>
                          <th className="p-3">Local Showroom</th>
                          <th className="p-3 text-center">Checklist Qualidade</th>
                          <th className="p-3 text-center">Status</th>
                          <th className="p-3">Supervisor</th>
                          <th className="p-3 text-right">Data</th>
                          <th className="p-3 text-right no-print">Ações</th>
                        </>
                      )}

                      {selectedFlow === 'conferencias' && (
                        <>
                          <th className="p-3">Competência</th>
                          <th className="p-3">Filial Avaliada</th>
                          <th className="p-3">Gerência Geral</th>
                          <th className="p-3">Gerência CD</th>
                          <th className="p-3 text-center">Status</th>
                          <th className="p-3 text-right">Prazo</th>
                          <th className="p-3 text-right">Itens</th>
                          <th className="p-3 text-right no-print">Ações</th>
                        </>
                      )}

                      {selectedFlow === 'avarias' && (
                        <>
                          <th className="p-3">Identificação</th>
                          <th className="p-3">Especificação Acabamento</th>
                          <th className="p-3">Fornecedor</th>
                          <th className="p-3 text-right">Quebradas</th>
                          <th className="p-3">Ocorrência</th>
                          <th className="p-3">Registrado Por</th>
                          <th className="p-3 text-center">Status Baixa</th>
                          <th className="p-3 text-right">Data Ocorrido</th>
                          <th className="p-3 text-right no-print">Ações</th>
                        </>
                      )}

                      {selectedFlow === 'pendencias' && (
                        <>
                          <th className="p-3">Categoria Falha</th>
                          <th className="p-3">N° Solicitação / Origem</th>
                          <th className="p-3">Filial</th>
                          <th className="p-3">Código</th>
                          <th className="p-3">Alocado Atendimento</th>
                          <th className="p-3 text-center">Status</th>
                          <th className="p-3 text-right">Data Prazo</th>
                          <th className="p-3 text-right no-print">Ações</th>
                        </>
                      )}

                      {selectedFlow === 'logs' && (
                        <>
                          <th className="p-3 col-span-2">Funcionário</th>
                          <th className="p-3">Transação / Ação</th>
                          <th className="p-3">Módulo</th>
                          <th className="p-3">Registro Relacionado</th>
                          <th className="p-3 text-right">Data / Hora</th>
                          <th className="p-3 text-right no-print">Ações</th>
                        </>
                      )}

                    </tr>
                  </thead>

                  {/* DYNAMIC ROWS POPULATION */}
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-600">
                    {activeFilteredList.length > 0 ? (
                      activeFilteredList.map((row: any) => {
                        const isExpanded = !!expandedRows[row.id];
                        return (
                          <React.Fragment key={row.id}>
                            <tr className={`hover:bg-slate-50/50 transition-colors ${isExpanded ? 'bg-slate-50' : ''}`}>
                              
                              {selectedFlow === 'amostras' && (
                                <>
                                  <td className="p-3 font-bold font-mono text-slate-800">{row.codigoAdm}</td>
                                  <td className="p-3 text-xs leading-none max-w-xs truncate">{row.descricao}</td>
                                  <td className="p-3">{row.marca}</td>
                                  <td className="p-3">{row.categoria}</td>
                                  <td className="p-3 font-mono">{row.tamanho || 'N/D'}</td>
                                  <td className="p-3 text-right font-bold text-slate-900">{row.saldoAtual}</td>
                                  <td className="p-3 text-right font-mono text-slate-400">{row.estoqueMinimo}</td>
                                  <td className="p-3 text-center">{renderStatusBadge(row.status, 'amostras')}</td>
                                </>
                              )}

                              {selectedFlow === 'movimentacoes' && (
                                <>
                                  <td className="p-3 font-bold font-mono text-slate-800">{row.codigoAdm}</td>
                                  <td className="p-3 text-xs leading-none max-w-xs truncate">{row.produtoNome}</td>
                                  <td className="p-3">
                                    <span className={`px-2 py-0.5 rounded font-bold uppercase font-mono text-[9px] ${
                                      row.tipo === 'entrada' ? 'bg-emerald-50 text-emerald-700' :
                                      row.tipo === 'saída' ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-100'
                                    }`}>{row.tipo}</span>
                                  </td>
                                  <td className="p-3 text-right font-bold text-slate-900">{row.quantidade}</td>
                                  <td className="p-3 text-right font-mono text-slate-400">{row.saldoAnterior}</td>
                                  <td className="p-3 text-right font-mono text-slate-800 font-bold">{row.saldoNovo}</td>
                                  <td className="p-3 font-semibold text-slate-700">{row.lojaDestino || 'Central CD'}</td>
                                  <td className="p-3 text-slate-500 font-display text-[11px]">{row.responsavelNome}</td>
                                  <td className="p-3 text-right font-mono text-slate-400">{new Date(row.createdAt).toLocaleDateString()}</td>
                                </>
                              )}

                              {selectedFlow === 'solicitacoes' && (
                                <>
                                  <td className="p-3 font-bold font-mono text-slate-800">{row.numero}</td>
                                  <td className="p-3 text-slate-700">{row.solicitanteNome}</td>
                                  <td className="p-3 font-bold text-slate-700">{row.lojasDestino.join(', ')}</td>
                                  <td className="p-3 text-center">
                                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                                      row.prioridade === 'urgente' ? 'bg-red-50 text-red-700 ring-1 ring-red-200' : 'bg-slate-105'
                                    }`}>{row.prioridade}</span>
                                  </td>
                                  <td className="p-3 text-right font-bold text-slate-800">{row.itens.length}</td>
                                  <td className="p-3 text-center">{renderStatusBadge(row.status, 'solicitacoes')}</td>
                                </>
                              )}

                              {selectedFlow === 'protocolos' && (
                                <>
                                  <td className="p-3 font-bold font-mono text-slate-850">{row.numero}</td>
                                  <td className="p-3 font-mono text-slate-550">{row.solicitacaoNumero}</td>
                                  <td className="p-3 font-bold text-slate-800 text-[11px]">{row.lojaDestino}</td>
                                  <td className="p-3 text-slate-600">{row.responsavelSeparacao}</td>
                                  <td className="p-3 text-slate-600">{row.responsavelRecebimento}</td>
                                  <td className="p-3 text-right font-bold text-slate-800">{row.itens.length}</td>
                                  <td className="p-3 text-right font-mono text-slate-400">{new Date(row.dataEnvio || row.createdAt).toLocaleDateString()}</td>
                                </>
                              )}

                              {selectedFlow === 'recebimentos' && (
                                <>
                                  <td className="p-3 font-bold font-mono text-slate-850">{row.solicitacaoNumero}</td>
                                  <td className="p-3 font-bold text-slate-700">{row.loja}</td>
                                  <td className="p-3 font-medium text-slate-600">{row.gerenteNome}</td>
                                  <td className="p-3 text-center">
                                    <span className={`px-2 py-0.5 rounded font-bold uppercase font-mono text-[9px] ${
                                      row.status === 'Recebida' ? 'bg-green-50 text-green-700' : 'bg-rose-50 text-rose-700'
                                    }`}>{row.status}</span>
                                  </td>
                                  <td className="p-3 text-right font-bold text-slate-800">{row.itens.length}</td>
                                  <td className="p-3 text-right font-mono text-slate-400">{new Date(row.createdAt).toLocaleDateString()}</td>
                                </>
                              )}

                              {selectedFlow === 'exposicoes' && (
                                <>
                                  <td className="p-3 font-mono text-slate-500 text-[10px]">{row.solicitacaoNumero}</td>
                                  <td className="p-3 font-bold font-mono text-slate-850">{row.codigoAdm}</td>
                                  <td className="p-3 font-semibold text-slate-800 truncate max-w-[150px]">{row.descricao}</td>
                                  <td className="p-3 font-bold text-slate-700">{row.loja}</td>
                                  <td className="p-3 text-slate-500 italic max-w-[125px] truncate">{row.localExposicao}</td>
                                  <td className="p-3 text-center">
                                    <div className="flex justify-center gap-1">
                                      <span title="Íntegro" className={`w-2.5 h-2.5 rounded-full inline-block ${row.integridadeFisica ? 'bg-red-500' : 'bg-slate-200'}`} />
                                      <span title="Limpo" className={`w-2.5 h-2.5 rounded-full inline-block ${row.limpezaConservacao ? 'bg-indigo-500' : 'bg-slate-200'}`} />
                                      <span title="Código Identificado" className={`w-2.5 h-2.5 rounded-full inline-block ${row.identificacaoCorreta ? 'bg-emerald-500' : 'bg-slate-200'}`} />
                                      <span title="Posição correta" className={`w-2.5 h-2.5 rounded-full inline-block ${row.localizacaoAdequada ? 'bg-teal-500' : 'bg-slate-200'}`} />
                                    </div>
                                  </td>
                                  <td className="p-3 text-center">{renderStatusBadge(row.status, 'exposicoes')}</td>
                                  <td className="p-3 pl-4 text-slate-500 text-[11px]">{row.validadoPor || 'Em averiguação'}</td>
                                  <td className="p-3 text-right font-mono text-slate-400">{new Date(row.createdAt).toLocaleDateString()}</td>
                                </>
                              )}

                              {selectedFlow === 'conferencias' && (
                                <>
                                  <td className="p-3 font-bold font-mono text-slate-850">{row.competencia}</td>
                                  <td className="p-3 font-bold text-slate-800">{row.loja}</td>
                                  <td className="p-3 text-slate-600">{row.gerenteLoja}</td>
                                  <td className="p-3 text-slate-500 text-[11px]">{row.gerenteOperacional}</td>
                                  <td className="p-3 text-center">{renderStatusBadge(row.status, 'conferencias')}</td>
                                  <td className="p-3 text-right font-mono text-rose-600 font-bold">{new Date(row.prazoResposta).toLocaleDateString()}</td>
                                  <td className="p-3 text-right font-bold text-slate-800">{row.itens.length}</td>
                                </>
                              )}

                              {selectedFlow === 'avarias' && (
                                <>
                                  <td className="p-3 font-bold font-mono text-slate-800">{row.codigoAdm}</td>
                                  <td className="p-3 font-medium text-slate-800 truncate max-w-[150px]">{row.descricao}</td>
                                  <td className="p-3 text-slate-500">{row.marca}</td>
                                  <td className="p-3 text-right font-extrabold text-red-650 font-mono">{row.quantidade}</td>
                                  <td className="p-3 font-bold text-slate-700">{row.loja ? `Loja (${row.loja})` : 'Arrumação CD'}</td>
                                  <td className="p-3 text-slate-600 text-[11px]">{row.responsavelNome}</td>
                                  <td className="p-3 text-center">{renderStatusBadge(row.status, 'avarias')}</td>
                                  <td className="p-3 text-right font-mono text-slate-400">{new Date(row.createdAt).toLocaleDateString()}</td>
                                </>
                              )}

                              {selectedFlow === 'pendencias' && (
                                <>
                                  <td className="p-3">
                                    <span className="text-slate-850 truncate max-w-[160px] block font-bold" title={row.tipo}>{row.tipo}</span>
                                  </td>
                                  <td className="p-3 font-mono text-slate-500 text-[11px]">{row.origem}</td>
                                  <td className="p-3 font-bold text-slate-700 text-[11px]">{row.loja}</td>
                                  <td className="p-3 font-bold font-mono text-slate-800">{row.codigoAdm}</td>
                                  <td className="p-3 text-slate-500 text-[11px] font-semibold">{row.responsavel}</td>
                                  <td className="p-3 text-center">{renderStatusBadge(row.status, 'pendencias')}</td>
                                  <td className="p-3 text-right font-mono font-bold text-slate-900">{new Date(row.prazo).toLocaleDateString()}</td>
                                </>
                              )}

                              {selectedFlow === 'logs' && (
                                <>
                                  <td className="p-3 font-bold text-slate-800 font-display text-[11px]">{row.usuarioNome}</td>
                                  <td className="p-3 text-slate-700 font-bold">{row.acao}</td>
                                  <td className="p-3">
                                    <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[9px] font-bold uppercase font-mono">{row.modulo}</span>
                                  </td>
                                  <td className="p-3 font-mono text-slate-400 text-[10px] truncate max-w-[100px]">{row.registroId}</td>
                                  <td className="p-3 text-right font-mono text-indigo-600 text-[11px]">{new Date(row.createdAt).toLocaleString('pt-BR')}</td>
                                </>
                              )}

                              {/* TOGGLE ROW DETAILS BUTTON */}
                              <td className="p-3 text-right no-print">
                                <button
                                  onClick={() => toggleRowExpanded(row.id)}
                                  className="p-1 text-slate-400 hover:text-slate-750 hover:bg-slate-100 rounded transition-all focus:ring-0 focus:outline-none"
                                >
                                  <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180 text-red-650 font-bold' : ''}`} />
                                </button>
                              </td>
                            </tr>

                            {/* REVEAL DETAIL SUBROW */}
                            {isExpanded && (
                              <tr className="bg-slate-50/70 border-l-4 border-l-[#0A1D37] transition-all font-display">
                                <td colSpan={11} className="p-4 space-y-4">
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    
                                    {/* Column: Text data */}
                                    <div className="space-y-2 text-xs leading-relaxed text-slate-700">
                                      <h5 className="font-bold text-slate-900 uppercase font-mono text-[9px] tracking-wider border-b pb-1">Metadados e Análise Operacional</h5>
                                      <div><strong>ID do Registro:</strong> <span className="font-mono bg-white p-0.5 px-1 border rounded">{row.id}</span></div>
                                      {row.observacoes && <div><strong>Observações Gerais:</strong> <p className="bg-white p-2.5 rounded border border-slate-150 mt-1 italic">{row.observacoes}</p></div>}
                                      {row.observacao && <div><strong>Modificação Registrada:</strong> <p className="bg-white p-2.5 rounded border border-slate-150 mt-1 text-slate-650">{row.observacao}</p></div>}
                                      {row.descricaoAvaria && <div><strong>Defeito Descrito pelo Controlador:</strong> <p className="bg-red-50/50 p-2 text-rose-800 rounded border border-rose-100 mt-1">{row.descricaoAvaria}</p></div>}
                                      
                                      {/* Sub-items in transactions (requests, dispatchs, receipts) */}
                                      {row.itens && row.itens.length > 0 && (
                                        <div className="space-y-1.5 pt-2">
                                          <strong className="block text-[9px] font-bold uppercase font-mono text-slate-500">Composição dos Itens Vinculados:</strong>
                                          <div className="bg-white border rounded divide-y overflow-hidden max-h-[160px] overflow-y-auto">
                                            {row.itens.map((sub: any, sIdx: number) => (
                                              <div key={sub.id || sIdx} className="p-2 flex justify-between items-center bg-slate-50/40 text-[11px] font-semibold">
                                                <div>
                                                  <span className="font-mono bg-slate-100 p-0.5 px-1 rounded text-slate-600 text-[9px] pr-1">{sub.codigoAdm}</span>
                                                  <span className="text-slate-850 pl-1">{sub.descricao}</span>
                                                  {sub.marca && <span className="text-slate-400 block text-[9px]">Marca: {sub.marca}</span>}
                                                </div>
                                                <div className="text-right text-slate-800">
                                                  {sub.quantidadeSolicitada !== undefined && <span>Solicitado/CD: <strong>{sub.quantidadeSolicitada}</strong></span>}
                                                  {sub.quantidadeSeparada !== undefined && <span className="ml-2">Separado: <strong>{sub.quantidadeSeparada}</strong></span>}
                                                  {sub.quantidadeRecebida !== undefined && <span className="ml-2">Recebido Fr.: <strong className="underline">{sub.quantidadeRecebida}</strong></span>}
                                                  {sub.quantidade !== undefined && <span>Despachadas: <strong>{sub.quantidade}</strong></span>}
                                                  {sub.statusExposicao && <span className="block text-[10px]">{renderStatusBadge(sub.statusExposicao, 'exposicoes')}</span>}
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    </div>

                                    {/* Column: Base64 evidence pictures */}
                                    {row.fotos && row.fotos.length > 0 && (
                                      <div className="space-y-2">
                                        <h5 className="font-bold text-slate-900 uppercase font-mono text-[9px] tracking-wider border-b pb-1">Evidências Físicas de Verificação (Showroom)</h5>
                                        <div className="flex gap-2 flex-wrap">
                                          {row.fotos.map((img: string, imgIdx: number) => (
                                            <div key={imgIdx} className="relative group/photo overflow-hidden rounded-lg border bg-slate-100 shadow-xs h-28 w-28 shrink-0">
                                              <img
                                                src={img}
                                                alt="Evidence Upload"
                                                referrerPolicy="no-referrer"
                                                className="w-full h-full object-cover"
                                              />
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={11} className="p-12 text-center text-slate-400 font-semibold italic">
                          <Activity className="w-8 h-8 text-slate-300 block mx-auto mb-2 animate-pulse shrink-0" />
                          Nenhum registro encontrado correspondente aos parâmetros de auditoria definidos.
                        </td>
                      </tr>
                    )}
                  </tbody>

                </table>
              </div>

              {/* Printable compliance footer stamp */}
              <div className="hidden print:block pt-16 border-t border-dashed border-slate-350 text-center text-[10px] leading-relaxed text-slate-400 max-w-xl mx-auto font-mono">
                <div className="grid grid-cols-2 gap-12 mb-12">
                  <div className="border-t border-slate-300 pt-3">
                    <p className="font-bold text-slate-700">Controle e Auditoria Operacional J. Cruzeiro</p>
                    <p className="text-[8px]">Carimbo Assinatura Controlador de Showroom</p>
                  </div>
                  <div className="border-t border-slate-300 pt-3">
                    <p className="font-bold text-slate-700">Responsável Unidade Comercial</p>
                    <p className="text-[8px]">Assinatura e carimbo de recebimento da filial</p>
                  </div>
                </div>
                <p className="font-bold text-slate-700">J. Cruzeiro Construção & Acabamento @ 2026</p>
                <p>Relatório oficial emitido eletronicamente pela trilha integrada sobre conformidade de layouts e amostras físicas de showrooms.</p>
              </div>

            </div>

          </div>

        </div>
      )}

      {/* ADMIN LOGS TAB CONTAINER */}
      {activeTab === 'logs' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded border">
            <h3 className="font-display font-semibold text-slate-800 text-base">Trilha de Segurança e Logs de Auditoria (Sistêmicos)</h3>
            <p className="text-slate-400 text-xs mt-0.5">Visão geral imutável gravada para cada ação realizada pelos usuários no banco de dados.</p>
          </div>

          <div className="bg-slate-50 p-4 rounded-lg font-mono text-[11px] text-slate-700 space-y-2 max-h-[500px] overflow-y-auto border border-slate-205 shadow-inner">
            {logsLst.length > 0 ? (
              logsLst.slice().reverse().map(l => (
                <div key={l.id} className="p-2 bg-white rounded border border-slate-150 border-l-4 border-l-[#0A1D37] flex flex-col md:flex-row justify-between gap-2 shadow-xs transition-colors hover:border-slate-300">
                  <div>
                    <span className="text-[#0A1D37] font-bold">[{new Date(l.createdAt).toLocaleTimeString()}]</span>
                    <span className="text-slate-500 font-semibold uppercase mr-2 ml-1">[{l.acao.replace('_', ' ')}]</span>
                    <strong className="text-slate-800">{l.usuarioNome}</strong> (Módulo: <span className="text-red-650 font-bold">{l.modulo}</span>): {l.valorNovo || l.observacao || 'Nenhum detalhe adicional'}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center p-8 text-slate-500">
                A trilha de auditoria está imutável e vazia neste momento.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ADMIN USERS TAB CONTAINER */}
      {activeTab === 'usuarios' && (
        <div className="bg-white rounded border overflow-hidden">
          <table className="w-full text-left border-collapse text-xs font-semibold text-slate-700">
            <thead>
              <tr className="bg-slate-50 text-slate-450 font-mono text-[10px] uppercase border-b border-slate-100">
                <th className="p-4">Nome Coorporativo</th>
                <th className="p-4">E-mail Corporativo</th>
                <th className="p-4">Perfil Permissão</th>
                <th className="p-4">Cargo Operacional</th>
                <th className="p-4">Ponto Comercial Alocado</th>
                <th className="p-4 text-right">Status Cadastro</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {usersList.map(u => (
                <tr key={u.id} className="hover:bg-slate-50/50">
                  <td className="p-4 font-bold text-slate-800">{u.nome}</td>
                  <td className="p-4 font-mono text-slate-500">{u.email}</td>
                  <td className="p-4">
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-800 font-bold rounded block w-fit text-[9px] uppercase">
                      {u.perfil}
                    </span>
                  </td>
                  <td className="p-4 text-slate-600">{u.cargo}</td>
                  <td className="p-4 text-slate-600">{u.loja || 'Centro de Distribuição (Logístico)'}</td>
                  <td className="p-4 text-right flex justify-end items-center">
                    <span className="w-2 h-2 rounded-full bg-green-500 inline-block mr-1.5"></span>
                    Ativo
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
}
