/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { DatabaseService } from '../services/db';
import { User, Amostra, Solicitacao, Avaria, Pendencia } from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend 
} from 'recharts';
import { 
  Layers, Package, AlertTriangle, CheckSquare, 
  Clock, CheckCircle, FileText, ArrowRightLeft, 
  TrendingUp, Sliders, ShieldAlert, Store 
} from 'lucide-react';

interface DashboardProps {
  user: User;
  onNavigateTo: (page: string) => void;
}

export default function Dashboard({ user, onNavigateTo }: DashboardProps) {
  const [amostras, setAmostras] = useState<Amostra[]>([]);
  const [solicitacoes, setSolicitacoes] = useState<Solicitacao[]>([]);
  const [avarias, setAvarias] = useState<Avaria[]>([]);
  const [pendencias, setPendencias] = useState<Pendencia[]>([]);

  useEffect(() => {
    const load = () => {
      setAmostras(DatabaseService.getAmostras());
      setSolicitacoes(DatabaseService.getSolicitacoes());
      setAvarias(DatabaseService.getAvarias());
      setPendencias(DatabaseService.getPendencias());
    };
    load();
    return DatabaseService.subscribe(load);
  }, []);

  // Filter based on role: Gerente sees only their own store data
  const isGerente = user.perfil === 'Gerente';
  const myStore = user.loja;
  
  const filteredSolicitacoes = isGerente 
    ? solicitacoes.filter(s => s.lojasDestino.includes(myStore)) 
    : solicitacoes;

  const filteredAvarias = isGerente
    ? avarias.filter(a => a.loja === myStore)
    : avarias;

  const filteredPendencias = isGerente
    ? pendencias.filter(p => p.loja === myStore)
    : pendencias;

  // Calculo de indicadores
  const totalAmostras = amostras.length;
  const totalEstoqueCD = amostras.reduce((sum, item) => sum + item.saldoAtual, 0);
  
  const solicitacoesPendentes = filteredSolicitacoes.filter(s => s.status === 'Aguardando liberação' || s.status === 'Liberada para separação').length;
  const solicitacoesEmSeparacao = filteredSolicitacoes.filter(s => s.status === 'Em separação' || s.status === 'Separada').length;
  const solicitacoesEnviadas = filteredSolicitacoes.filter(s => s.status === 'Enviada').length;
  const solicitacoesRecebidas = filteredSolicitacoes.filter(s => s.status === 'Recebida' || s.status === 'Recebida parcialmente').length;
  
  const expPendente = filteredSolicitacoes.filter(s => s.status === 'Exposição pendente').length;
  const expComprovada = filteredSolicitacoes.filter(s => s.status === 'Exposição comprovada' || s.status === 'Concluída').length;
  
  const avariasRegistradas = filteredAvarias.length;
  const divergenciasEmAberto = filteredPendencias.filter(p => p.status === 'Aberta' || p.status === 'Em análise').length;

  // Status de exposição por loja
  const lojasList = ['MATRIZ', 'CATEDRAL', 'MINEIROS', 'SAID ABDALA', 'RIO VERDE'];
  const exposicaoData = lojasList.map(loja => {
    const totalLoja = solicitacoes.filter(s => s.lojasDestino.includes(loja)).length;
    const comprovadasLoja = solicitacoes.filter(s => s.lojasDestino.includes(loja) && (s.status === 'Exposição comprovada' || s.status === 'Concluída')).length;
    const pct = totalLoja > 0 ? Math.round((comprovadasLoja / totalLoja) * 100) : 100;
    return { name: loja, porcentagem: pct };
  });

  // Amostras enviadas no mês (Últimos 30 dias)
  const enviosNoMes = filteredSolicitacoes.filter(s => {
    const data = new Date(s.dataSolicitacao);
    const trintaDiasAtras = new Date();
    trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);
    return data >= trintaDiasAtras && s.status !== 'Rascunho' && s.status !== 'Cancelada';
  }).length;

  // Low stock alert count
  const itemsLowStock = amostras.filter(a => a.saldoAtual <= a.estoqueMinimo).length;

  // Dummy Chart Data for overview
  const chartData = [
    { name: 'Cadastrados', qtd: totalAmostras },
    { name: 'Saldo Total CD', qtd: totalEstoqueCD },
    { name: 'Enviados Mês', qtd: enviosNoMes },
    { name: 'Avarias', qtd: avariasRegistradas },
    { name: 'Divergências', qtd: divergenciasEmAberto }
  ];

  const pieColors = ['#2563eb', '#fbbf24', '#f87171', '#34d399'];
  const pieData = [
    { name: 'Pendentes', value: solicitacoesPendentes },
    { name: 'Em Separação', value: solicitacoesEmSeparacao },
    { name: 'Enviadas', value: solicitacoesEnviadas },
    { name: 'Amostras Expostas', value: expComprovada }
  ].filter(p => p.value > 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-300" id="dashboard_panel">
      {/* Welcome Banner */}
      <div className="bg-slate-50 rounded-lg p-6 border border-slate-200 border-l-4 border-[#0A1D37] flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-display font-bold text-[#0A1D37]">
            Olá, {user.nome}!
          </h2>
          <p className="text-[#64748b] text-sm mt-1">
            Painel Operacional para controle de amostras da <span className="text-[#0A1D37] font-semibold">J. Cruzeiro Construção & Acabamento</span>.
          </p>
          <div className="mt-2 inline-flex items-center text-xs bg-slate-100 text-[#475569] px-3 py-1 rounded-full border border-slate-200">
            <span className="w-2 h-2 rounded-full bg-green-500 mr-2"></span>
            Perfil: <strong className="ml-1 text-[#0A1D37]">{user.perfil}</strong> {isGerente && ` • ${user.loja}`}
          </div>
        </div>
        <div className="flex gap-2">
          {user.perfil !== 'Gerente' && (
            <button 
              onClick={() => onNavigateTo('Cadastros')}
              className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold rounded-md border border-slate-200 transition-all btn-operational shadow-xs"
            >
              Consultar Giro
            </button>
          )}
          {user.perfil === 'Controlador' || user.perfil === 'Admin' ? (
            <button 
              onClick={() => onNavigateTo('Nova Solicitação')}
              className="px-4 py-2 bg-[#0A1D37] hover:bg-slate-800 text-white text-sm font-semibold rounded-md transition-all btn-operational shadow-sm"
            >
              Nova Demanda
            </button>
          ) : null}
          {user.perfil === 'Separador' && (
            <button 
              onClick={() => onNavigateTo('Separação Física')}
              className="px-4 py-2 bg-[#0A1D37] hover:bg-slate-800 text-white text-sm font-semibold rounded-md transition-all btn-operational shadow-sm"
            >
              Separandos Pendentes
            </button>
          )}
        </div>
      </div>

      {/* Grid Indicadores */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1 */}
        {user.perfil !== 'Gerente' ? (
          <div 
            onClick={() => onNavigateTo('Cadastros')} 
            className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 border-l-4 border-[#0A1D37] hover:shadow-md transition-all cursor-pointer flex items-center justify-between"
          >
            <div>
              <p className="text-[10px] font-bold text-[#64748b] uppercase tracking-wider">Amostras CD</p>
              <h3 className="text-2xl font-black text-[#0A1D37] mt-1">{totalAmostras}</h3>
              <p className="text-[10px] text-[#64748b] mt-1 font-semibold">Produtos cadastrados</p>
            </div>
            <div className="p-2.5 bg-slate-100 text-[#0A1D37] rounded-lg shrink-0">
              <Layers className="w-5 h-5" />
            </div>
          </div>
        ) : (
          <div 
            onClick={() => onNavigateTo('Recebimentos em Loja')} 
            className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 border-l-4 border-[#0A1D37] hover:shadow-md transition-all cursor-pointer flex items-center justify-between"
          >
            <div>
              <p className="text-[10px] font-bold text-[#64748b] uppercase tracking-wider">Minha Loja</p>
              <h3 className="text-2xl font-black text-[#0A1D37] mt-1">{filteredSolicitacoes.length}</h3>
              <p className="text-[10px] text-[#64748b] mt-1 font-semibold">Solicitações destinadas</p>
            </div>
            <div className="p-2.5 bg-slate-100 text-[#0A1D37] rounded-lg shrink-0">
              <Store className="w-5 h-5" />
            </div>
          </div>
        )}

        {/* KPI 2 */}
        {user.perfil !== 'Gerente' ? (
          <div 
            onClick={() => onNavigateTo('Entradas')} 
            className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 border-l-4 border-red-650 hover:shadow-md transition-all cursor-pointer flex items-center justify-between"
          >
            <div>
              <p className="text-[10px] font-bold text-[#64748b] uppercase tracking-wider">Saldo CD</p>
              <h3 className="text-2xl font-black text-[#0A1D37] mt-1">{totalEstoqueCD} <span className="text-xs font-normal text-slate-400">peças</span></h3>
              {itemsLowStock > 0 ? (
                <p className="text-[10px] text-red-650 font-bold flex items-center mt-1">
                  <ShieldAlert className="w-3 h-3 mr-1" /> {itemsLowStock} com saldo baixo
                </p>
              ) : (
                <p className="text-[10px] text-[#64748b] font-bold mt-1">Níveis normais</p>
              )}
            </div>
            <div className="p-2.5 bg-red-50 text-red-650 rounded-lg shrink-0">
              <Package className="w-5 h-5" />
            </div>
          </div>
        ) : (
          <div 
            onClick={() => onNavigateTo('Recebimentos em Loja')} 
            className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 border-l-4 border-red-650 hover:shadow-md transition-all cursor-pointer flex items-center justify-between"
          >
            <div>
              <p className="text-[10px] font-bold text-[#64748b] uppercase tracking-wider">Conf. Exposição</p>
              <h3 className="text-2xl font-black text-[#0A1D37] mt-1">{expPendente}</h3>
              <p className="text-[10px] text-[#64748b] mt-1 font-semibold">Pendentes de foto</p>
            </div>
            <div className="p-2.5 bg-red-50 text-red-650 rounded-lg shrink-0">
              <CheckSquare className="w-5 h-5" />
            </div>
          </div>
        )}

        {/* KPI 3 */}
        <div 
          onClick={() => onNavigateTo('Saídas (Solicitações)')} 
          className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 border-l-4 border-[#64748b] hover:shadow-md transition-all cursor-pointer flex items-center justify-between"
        >
          <div>
            <p className="text-[10px] font-bold text-[#64748b] uppercase tracking-wider">Trânsito & Envio</p>
            <h3 className="text-2xl font-black text-[#0A1D37] mt-1">{solicitacoesPendentes + solicitacoesEmSeparacao + solicitacoesEnviadas}</h3>
            <p className="text-[10px] text-red-650 mt-1 font-bold">{enviosNoMes} no mês</p>
          </div>
          <div className="p-2.5 bg-slate-100 text-[#64748b] rounded-lg shrink-0">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 4 */}
        <div 
          onClick={() => onNavigateTo('Pendências')} 
          className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 border-l-4 border-red-650 hover:shadow-md transition-all cursor-pointer flex items-center justify-between"
        >
          <div>
            <p className="text-[10px] font-bold text-[#64748b] uppercase tracking-wider">Divergências</p>
            <h3 className="text-2xl font-black text-red-650 mt-1">{divergenciasEmAberto}</h3>
            {avariasRegistradas > 0 ? (
              <p className="text-[10px] text-red-650 font-bold flex items-center mt-1">
                <AlertTriangle className="w-3 h-3 text-red-650 mr-1" /> {avariasRegistradas} avarias
              </p>
            ) : (
              <p className="text-[10px] text-green-600 font-bold mt-1">Nenhuma avaria</p>
            )}
          </div>
          <div className="p-2.5 bg-red-50 text-red-650 rounded-lg shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Visual Charts section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico 1 - Performance das Lojas */}
        <div className="bg-white p-5 rounded-lg border border-slate-150 shadow-xs lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="font-display font-bold text-[#0A1D37] flex items-center">
              <TrendingUp className="w-4 h-4 text-[#0A1D37] mr-2" />
              Percentual de Exposição Completa por Filial
            </h4>
            <span className="text-xs text-slate-400 font-mono">Dados Reais</span>
          </div>
          <hr className="border-slate-100" />
          <div className="h-64 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={exposicaoData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis unit="%" stroke="#64748b" fontSize={11} domain={[0, 100]} tickLine={false} />
                <Tooltip />
                <Bar dataKey="porcentagem" fill="#0a1d37" radius={[4, 4, 0, 0]}>
                  {exposicaoData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.porcentagem >= 80 ? '#10b981' : (entry.porcentagem >= 50 ? '#64748b' : '#dc2626')} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico 2 - Operações em Processo */}
        <div className="bg-white p-5 rounded-lg border border-slate-150 shadow-xs space-y-4">
          <h4 className="font-display font-bold text-[#0A1D37] flex items-center">
            <Sliders className="w-4 h-4 text-[#0A1D37] mr-2" />
            Distribuição de Demandas
          </h4>
          <hr className="border-slate-100" />
          {pieData.length > 0 ? (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={['#0a1d37', '#64748b', '#dc2626', '#475569'][index % 4]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap justify-center gap-2 mt-2">
                {pieData.map((entry, index) => (
                  <div key={entry.name} className="flex items-center text-[10px] text-slate-500">
                    <span className="w-2.5 h-2.5 rounded-full mr-1" style={{ backgroundColor: ['#0a1d37', '#64748b', '#dc2626', '#475569'][index % 4] }} />
                    {entry.name}: {entry.value}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-48 text-slate-400">
              <CheckCircle className="w-12 h-12 text-slate-200 mb-2" />
              <p className="text-xs">Nenhum transito de carga pendente hoje.</p>
            </div>
          )}
        </div>
      </div>

      {/* Operações Rápidas e Pendências Críticas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Atividades Recentes ou Direções Operacionais */}
        <div className="bg-white p-5 rounded-lg border border-slate-150 leading-relaxed">
          <h4 className="font-display font-bold text-[#0A1D37] flex items-center mb-4">
            <CheckSquare className="w-4 h-4 text-[#0A1D37] mr-2" />
            Fluxos de Trabalho Recomendados
          </h4>
          <div className="space-y-3">
            <div className="flex gap-3 text-sm">
              <span className="w-6 h-6 rounded-full bg-slate-100 text-[#0A1D37] flex items-center justify-center text-xs font-bold font-mono shrink-0">1</span>
              <div>
                <strong className="text-slate-800">Verba de Compra</strong>
                <p className="text-xs text-slate-500 mt-1 font-medium">Pedidos saindo do estoque físico da J. Cruzeiro precisam de verba associada pelo Controlador.</p>
              </div>
            </div>
            <div className="flex gap-3 text-sm">
              <span className="w-6 h-6 rounded-full bg-slate-100 text-[#0A1D37] flex items-center justify-center text-xs font-bold font-mono shrink-0">2</span>
              <div>
                <strong className="text-slate-800">Assinatura Digital de Protocolos</strong>
                <p className="text-xs text-slate-500 mt-1 font-medium">Separadores Juliano/Juliana dão saída faturando o código de trânsito em PDF/Impressão de Protocolo.</p>
              </div>
            </div>
            <div className="flex gap-3 text-sm">
              <span className="w-6 h-6 rounded-full bg-slate-100 text-[#0A1D37] flex items-center justify-center text-xs font-bold font-mono shrink-0">3</span>
              <div>
                <strong className="text-slate-800">Comprovação com Fotos Obrigatórias</strong>
                <p className="text-xs text-slate-500 mt-1 font-medium">Gerentes de loja usam a câmera do celular no painel de exposição para registrar a peça na gôndola.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Alertas de Pendências Urgentes */}
        <div className="bg-white p-5 rounded-lg border border-slate-150 shadow-xs">
          <div className="flex justify-between items-center mb-4">
            <h4 className="font-display font-bold text-[#0A1D37] flex items-center">
              <ShieldAlert className="w-4 h-4 text-red-650 mr-2" />
              Pendências e Alertas Críticos
            </h4>
            <button onClick={() => onNavigateTo('Pendências')} className="text-xs text-red-650 font-bold hover:underline">
              Ver Todas ({filteredPendencias.length})
            </button>
          </div>
          {filteredPendencias.length > 0 ? (
            <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
              {filteredPendencias.slice(0, 4).map(p => (
                <div key={p.id} className="p-3 bg-red-50/50 rounded border border-red-100 flex justify-between items-start gap-3">
                   <div className="text-xs space-y-1">
                    <span className="font-semibold text-slate-800 block capitalize">{p.tipo}</span>
                    <span className="text-slate-400 block">Origem: {p.origem} • {p.loja}</span>
                    <span className="text-red-650 font-semibold block">Prazo Limite: {p.prazo}</span>
                  </div>
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 bg-red-100 text-red-700 font-semibold rounded">
                    {p.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-40 text-slate-400 bg-slate-50 rounded border border-dashed border-slate-200">
              <CheckCircle className="w-8 h-8 text-green-500 mb-1" />
              <p className="text-xs text-slate-500 font-medium">Parabéns! Nenhuma divergência em aberto.</p>
              <p className="text-[10px] text-slate-400">Tudo operando conforme padrões de qualidade.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
