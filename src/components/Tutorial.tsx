/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  BookOpen, Users, ClipboardList, CheckCircle, Package, ArrowRight,
  ShieldCheck, HelpCircle, Store, AlertTriangle, Truck, Eye, Camera, CheckSquare
} from 'lucide-react';

export default function Tutorial() {
  const [activeTab, setActiveTab] = useState<'flow' | 'roles' | 'quick'>('flow');
  const [activeStep, setActiveStep] = useState<number>(0);

  const stepsList = [
    {
      title: "1. Cadastro e Monitoria de Saldos",
      executor: "Ivan (Controlador) ou Guilherme (Admin)",
      icon: ClipboardList,
      color: "bg-[#0A1D37] text-white",
      borderColor: "border-[#0A1D37]",
      desc: "Tudo começa no cadastro unificado de amostras no banco de dados. Cada tipo de porcelanato, metal, revestimento e louça possui um código administrativo único (ex: ADM-POR-8001), localização física correta no Centro de Distribuição (CD-01) e níveis de estoque mínimo definidos.",
      actions: [
        "Definir saldos iniciais de amostra no lote físico.",
        "Fixar uma prateleira ou rua de endereçamento para que os separadores saibam onde encontrar o item no CD.",
        "Monitorar o Painel Geral para checar avisos automáticos de estoque baixo das amostras."
      ]
    },
    {
      title: "2. Solicitação de Amostra de Showroom",
      executor: "Gerente de Loja (Filiais)",
      icon: Store,
      color: "bg-[#dd0000] text-white",
      borderColor: "border-[#dd0000]",
      desc: "Quando uma filial precisa de novas peças para seus painéis expositores ou reposição de quebras do showroom, o Gerente de Loja abre uma 'Solicitação de Amostra'.",
      actions: [
        "Selecionar as amostras desejadas do catálogo ativo do sistema.",
        "Definir o nível de prioridade (Normal, Alta ou Urgente).",
        "Justificar o motivo da remessa (ex: Novo Painel de Porcelanato, Amostra Avulsa para Vendas, etc.)."
      ]
    },
    {
      title: "3. Liberação de Demanda e Estoque",
      executor: "Ivan (Controlador)",
      icon: ShieldCheck,
      color: "bg-[#0A1D37] text-white",
      borderColor: "border-[#0A1D37]",
      desc: "Nenhuma peça é separada sem aprovação prévia. O Controlador de CD confere as solicitações enviadas pelas filiais para garantir coerência operacional e proteger o saldo do CD de saídas não autorizadas.",
      actions: [
        "Verificar pendências ou falta de material antes da liberação física.",
        "Aprovar a solicitação para que ela entre em estado de 'Aguardando Liberação' ou 'Liberada para Separação'.",
        "Ajustar prioridades com base nos limites físicos da frota J. Cruzeiro."
      ]
    },
    {
      title: "4. Separação Física no CD-01",
      executor: "Juliano ou Juliana (Separadores)",
      icon: Package,
      color: "bg-red-600 text-white",
      borderColor: "border-red-600",
      desc: "Os separadores acessam a triagem operacional J. Cruzeiro. Com o pedido ativo, eles retiram fisicamente as mostras das prateleiras especificadas.",
      actions: [
        "Conferir visualmente se os porcelanatos estão íntegros e se o código impresso bate com o do robô.",
        "Digitar a quantidade real que foi coletada do pavilhão físico.",
        "Gerar e imprimir o 'Protocolo J. Cruzeiro de Despacho e Rastreabilidade'.",
        "O sistema desconta automaticamente o saldo de amostras no estoque do CD (baixa fatiada)."
      ]
    },
    {
      title: "5. Recebimento e Conferência na Loja",
      executor: "Gerente de Loja (Filiais)",
      icon: Truck,
      color: "bg-[#0A1D37] text-white",
      borderColor: "border-[#0A1D37]",
      desc: "O caminhão J. Cruzeiro chega na unidade. O Gerente ou conferente deve registrar o recebimento dos volumes antes de encaminhá-los para o showroom.",
      actions: [
        "Marcar os itens recebidos como 'Concluído' ou 'Recebido'.",
        "Em caso de falta física do material despachado ou peças quebradas no trajeto, o gerente marca 'Recebido Parcialmente'.",
        "Isso dispara uma notificação automática na aba de 'Pendências' para que a equipe do CD proceda com a reposição do romaneio."
      ]
    },
    {
      title: "6. Montagem de Exposição & Comprovação por Foto",
      executor: "Gerente de Loja (Filiais)",
      icon: Camera,
      color: "bg-[#dd0000] text-white",
      borderColor: "border-[#dd0000]",
      desc: "Uma regra de ouro da J. Cruzeiro: a amostra enviada precisa obrigatoriamente estar exposta para gerar valor ao cliente. O sistema rastreia as obrigações pendentes de imagem.",
      actions: [
        "Montar as peças nos nichos, vitrines, gaveteiros ou painéis principais.",
        "Acessar o módulo 'Exposição com Fotos', anexar a comprovação visual correspondente.",
        "Mudar o status para 'Exposição Comprovada'. O sistema fecha o ciclo de controle do lote."
      ]
    },
    {
      title: "7. Auditoria Periódica / Conferência Mensal",
      executor: "Gerente de Loja (Filiais) e Controladora",
      icon: CheckSquare,
      color: "bg-[#0A1D37] text-white",
      borderColor: "border-[#0A1D37]",
      desc: "Uma vez por mês, cada filial J. Cruzeiro passa por uma auditoria geral das amostras em exibição para evitar furos no sistema e sumiço de peças de teste.",
      actions: [
        "Iniciar a Conferência Mensal da loja.",
        "Validar item a item: integridade física, limpeza/conservação e rotulagem correta das marcas.",
        "Submeter um relatório final de conformidades para análise da diretoria e inteligência de vendas."
      ]
    },
    {
      title: "8. Avarias e Casos de Exceção",
      executor: "Ivan (Controlador) ou Guilherme (Admin)",
      icon: AlertTriangle,
      color: "bg-red-700 text-white",
      borderColor: "border-red-700",
      desc: "Desvios e peças danificadas no showroom do varejo ou no Centro de Distribuição são reportados imediatamente por canais blindados.",
      actions: [
        "Registo imediato de Avarias e Quebras com anexos de fotos do material fraturado.",
        "Análise das divergências e investigações automáticas registradas na Trilha de Segurança.",
        "Se a avaria for em loja, o sistema abre uma reposição prioritária sob cuidados de Ivan Controlador."
      ]
    }
  ];

  const rolesList = [
    {
      title: "Administrador (Admin)",
      role: "Guilherme Admin e Equipe Diretiva",
      profileName: "Admin",
      color: "border-[#dd0000]",
      badge: "bg-red-50 text-red-700 border border-red-100",
      desc: "Supervisiona a cadeia logística e sistêmica de ponta a ponta. Tem acesso irrestrito de controle a todas as abas, relatórios estruturados, auditoria geral de conformidade, permissões de usuários e diagnóstico do banco de dados.",
      responsibilities: [
        "Controla tudo na plataforma",
        "Acesso total a relatórios e configurações do sistema",
        "Modificar e auditar status críticos das amostras"
      ]
    },
    {
      title: "Controlador",
      role: "Ivan Controlador e Compras/CD",
      profileName: "Controlador",
      color: "border-indigo-200",
      badge: "bg-indigo-50 text-indigo-700 border border-indigo-100",
      desc: "Analisa a operação logística geral e faz a retaguarda burocrática dos produtos. Determina o cadastro das amostras no CD-01 e aprova ou gera as demandas de saída de materiais para os showrooms.",
      responsibilities: [
        "Analisa o fluxo completo da operação de entrada e saída",
        "Gera as demandas de saída (solicitações de amostras)",
        "Controla devoluções e pendências com motoristas"
      ]
    },
    {
      title: "Separador",
      role: "Juliano e Juliana (Equipe CD)",
      profileName: "Separador",
      color: "border-amber-200",
      badge: "bg-amber-50 text-amber-700 border border-amber-100",
      desc: "Opera o recolhimento físico dos itens de amostra de acordo com as aprovações. Viabiliza o processo logístico de entradas (recebimento dos lotes industriais) e separa fisicamente para a expedição para as lojas de destino.",
      responsibilities: [
        "Viabiliza o processo logístico das entradas no estoque do CD",
        "Reconhece e separa fisicamente as amostras solicitadas",
        "Garante a embalagem, proteção e geração do protocolo de transporte"
      ]
    },
    {
      title: "Gerente de Loja",
      role: "Catedral, Mineiros, Said Abdala, etc.",
      profileName: "Gerente",
      color: "border-teal-200",
      badge: "bg-teal-50 text-teal-700 border border-teal-100",
      desc: "Líder e tomador de decisões na unidade física do varejo. Solicita novas amostras requisitadas pelos consultores e gerencia o status da vitrine local para maximizar os resultados do ponto de venda.",
      responsibilities: [
        "Gera diretamente as demandas de saída (solicitações)",
        "Controla os registros de avarias e substituições locais",
        "Gerencia os layouts expostos nas gôndolas"
      ]
    },
    {
      title: "Gestor Operacional",
      role: "Líder de Recepção / Operador de PDV local",
      profileName: "Gestor",
      color: "border-sky-200",
      badge: "bg-sky-50 text-sky-700 border border-sky-105",
      desc: "O responsável tático que recebe as cargas transportadas na filial. Garante a integridade na descarga, registra e confirma os recebimentos e também tem autonomia de frente de loja para iniciar novas demandas de reposição.",
      responsibilities: [
        "Recebe fisicamente a carga enviada em cada filial/loja",
        "Gera demandas de saída (solicitações adicionais de reposição)",
        "Preenche relatos de desconformidades no recebimento"
      ]
    },
    {
      title: "Conferente",
      role: "Validador e Auditor Físico de Showrooms",
      profileName: "Conferente",
      color: "border-emerald-200",
      badge: "bg-emerald-50 text-emerald-700 border border-emerald-100",
      desc: "Responsável exclusivo pela integridade e auditoria periódica. Visita as exposições para registrar e comprovar a conformidade, realizando a leitura física do código de barras de cada amostra em exposição.",
      responsibilities: [
        "Faz a leitura minuciosa via código de barras na loja física",
        "Realiza o checklist eletrônico de conformidade de exposição",
        "Exporta relatórios (PDF/XLSX) das conformidades atestadas"
      ]
    }
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto font-display animate-in fade-in duration-200" id="tutorial_wrapper">
      
      {/* Banner Principal de Boas-vindas ao Manual */}
      <div className="bg-gradient-to-r from-[#010030] to-[#0A1D37] text-white p-6 sm:p-8 rounded-xl border border-white/5 relative overflow-hidden shadow-md">
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-600 rounded-full text-[10px] font-bold uppercase tracking-wider">
            <BookOpen className="w-3.5 h-3.5" /> Manual de Instruções e Procedimentos
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight uppercase">
            Fluxo Unificado de Gestão e Controle de Amostras J. Cruzeiro
          </h1>
          <p className="text-slate-350 text-xs sm:text-sm max-w-2xl leading-relaxed">
            Bem-vindo ao centro de treinamento operacional integrado. Abaixo se encontra detalhado o comportamento padrão J. Cruzeiro que conecta as lojas físicas dos showrooms ao estoque de distribuição (CD-01).
          </p>
        </div>
        <div className="absolute right-4 bottom-4 opacity-5 pointer-events-none">
          <BookOpen className="w-56 h-56 text-white" />
        </div>
      </div>

      {/* Tabs Selector */}
      <div className="flex border-b border-slate-200 bg-white shadow-xs p-1 rounded-lg gap-2 overflow-x-auto shrink-0">
        <button 
          onClick={() => setActiveTab('flow')}
          className={`px-4 py-2 rounded-md text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'flow' ? 'bg-[#0A1D37] text-white' : 'text-slate-500 hover:text-slate-850'
          }`}
        >
          <ClipboardList className="w-4 h-4" /> Procedimento Operacional Passo a Passo
        </button>
        <button 
          onClick={() => setActiveTab('roles')}
          className={`px-4 py-2 rounded-md text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'roles' ? 'bg-[#0A1D37] text-white' : 'text-slate-500 hover:text-slate-850'
          }`}
        >
          <Users className="w-4 h-4" /> Funções dos Usuários & Responsabilidades
        </button>
        <button 
          onClick={() => setActiveTab('quick')}
          className={`px-4 py-2 rounded-md text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'quick' ? 'bg-[#0A1D37] text-white' : 'text-slate-500 hover:text-slate-850'
          }`}
        >
          <HelpCircle className="w-4 h-4" /> Perguntas Frequentes & Resolução de Problemas
        </button>
      </div>

      {/* Content Panels */}
      {activeTab === 'flow' && (
        <div className="space-y-6">
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-lg flex items-start gap-3">
            <HelpCircle className="w-5 h-5 text-red-650 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h3 className="font-bold text-slate-800 text-sm">Entenda como funciona o fluxo cronológico das amostras</h3>
              <p className="text-slate-500 text-xs">Utilize o painel interativo abaixo para navegar através das 8 etapas sequenciais que regulam o envio dos porcelanatos e louças das prateleiras do CD até a comprovação final nos nichos de showroom.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            
            {/* Timeline sidebar picker */}
            <div className="md:col-span-4 space-y-2">
              <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-slate-400 block mb-1">Índice de Etapas Sequenciais</span>
              <div className="space-y-1.5">
                {stepsList.map((step, idx) => {
                  const S_Icon = step.icon;
                  const isCurrent = activeStep === idx;
                  return (
                    <button
                      key={step.title}
                      onClick={() => setActiveStep(idx)}
                      className={`w-full group text-left p-3 rounded-lg flex items-center gap-3 transition-all border text-xs cursor-pointer ${
                        isCurrent 
                          ? 'bg-[#010030] text-white border-[#010030] shadow-sm font-semibold' 
                          : 'bg-white text-slate-655 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className={`p-1.5 rounded-full shrink-0 ${
                        isCurrent ? 'bg-[#dd0000] text-white' : 'bg-slate-100 group-hover:bg-slate-200'
                      }`}>
                        <S_Icon className="w-3.5 h-3.5" />
                      </div>
                      <span className="truncate">{step.title}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* active step detail card */}
            <div className="md:col-span-8 bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col justify-between">
              
              <div className="p-6 space-y-4">
                
                {/* step card header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b pb-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${stepsList[activeStep].color}`}>
                      {React.createElement(stepsList[activeStep].icon, { className: "w-6 h-6" })}
                    </div>
                    <div>
                      <span className="text-[9px] uppercase font-mono font-bold tracking-wider text-red-500 block">Fase Operacional nº {activeStep + 1} de 8</span>
                      <h2 className="font-bold text-[#0A1D37] text-base">{stepsList[activeStep].title}</h2>
                    </div>
                  </div>

                  <span className="px-3 py-1 bg-slate-100 border border-slate-200 text-[#0A1D37] rounded-md font-mono font-bold text-[10px] uppercase">
                    Executor: {stepsList[activeStep].executor}
                  </span>
                </div>

                {/* step explanation body */}
                <div className="space-y-3 font-normal text-xs leading-relaxed text-slate-600">
                  <p>{stepsList[activeStep].desc}</p>
                  
                  <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 space-y-2 mt-2">
                    <strong className="text-slate-800 text-[11px] uppercase font-bold tracking-widest block font-sans">Ações Obrigatórias Nesta Etapa:</strong>
                    <ul className="space-y-2.5">
                      {stepsList[activeStep].actions.map((act, actIdx) => (
                        <li key={actIdx} className="flex items-start gap-2 text-slate-705">
                          <CheckCircle className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                          <span>{act}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

              </div>

              {/* Back / Next actions */}
              <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
                <button
                  disabled={activeStep === 0}
                  onClick={() => setActiveStep(prev => prev - 1)}
                  className={`px-4 py-1.5 rounded text-xs font-bold border cursor-pointer transition ${
                    activeStep === 0 
                      ? 'text-slate-300 bg-slate-50 border-slate-200 cursor-not-allowed' 
                      : 'text-slate-600 bg-white border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  Anterior
                </button>

                <div className="text-slate-400 font-mono text-[10px] font-bold">
                  PROCESSO LOGÍSTICO J. CRUZEIRO
                </div>

                <button
                  disabled={activeStep === stepsList.length - 1}
                  onClick={() => setActiveStep(prev => prev + 1)}
                  className={`px-4 py-1.5 rounded text-xs font-bold border cursor-pointer transition flex items-center gap-1 ${
                    activeStep === stepsList.length - 1 
                      ? 'text-slate-300 bg-slate-50 border-slate-200 cursor-not-allowed' 
                      : 'bg-[#dd0000] text-white border-[#dd0000] hover:bg-red-700'
                  }`}
                >
                  Próxima Etapa <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

            </div>

          </div>

          {/* Quick visual pipeline layout */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3 shadow-xs">
            <h3 className="font-bold text-xs uppercase text-slate-450 tracking-wider">Representação Gráfica do Trâmite Logístico</h3>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-center text-xs">
              
              <div className="p-3 bg-[#0A1D37]/5 rounded-lg border border-[#0A1D37]/10 flex flex-col items-center justify-between">
                <div className="w-7 h-7 bg-[#0A1D37] rounded-full flex items-center justify-center text-white shrink-0 mb-1.5 font-bold">1</div>
                <strong className="text-slate-800 text-[11px] block">Criação & Liberação</strong>
                <p className="text-[9px] text-slate-400 mt-1">Gerente/Controlador solicita os materiais no sistema; CD analisa limites operacionais.</p>
              </div>

              <div className="p-3 bg-red-500/5 rounded-lg border border-red-500/10 flex flex-col items-center justify-between">
                <div className="w-7 h-7 bg-red-650 rounded-full flex items-center justify-center text-white shrink-0 mb-1.5 font-bold">2</div>
                <strong className="text-slate-800 text-[11px] block">Expedição Física</strong>
                <p className="text-[9px] text-slate-400 mt-1">Os separadores recolhem as peças, emitem etiqueta unificada e protocolam transporte.</p>
              </div>

              <div className="p-3 bg-[#0A1D37]/5 rounded-lg border border-[#0A1D37]/10 flex flex-col items-center justify-between">
                <div className="w-7 h-7 bg-[#0A1D37] rounded-full flex items-center justify-center text-white shrink-0 mb-1.5 font-bold">3</div>
                <strong className="text-slate-800 text-[11px] block">Recebimento de Carga</strong>
                <p className="text-[9px] text-slate-400 mt-1">Filial confere integridade visual física. Repõe quebras abrindo incidentes de rastro.</p>
              </div>

              <div className="p-3 bg-red-500/5 rounded-lg border border-red-500/10 flex flex-col items-center justify-between">
                <div className="w-7 h-7 bg-red-650 rounded-full flex items-center justify-center text-white shrink-0 mb-1.5 font-bold">4</div>
                <strong className="text-slate-800 text-[11px] block">Montagem e Fotos</strong>
                <p className="text-[9px] text-slate-400 mt-1">Amostra é exposta em gôndola ativa. Imagem é submetida sob controle mensal.</p>
              </div>

            </div>
          </div>

        </div>
      )}

      {activeTab === 'roles' && (
        <div className="space-y-6">
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-lg flex items-start gap-3">
            <Users className="w-5 h-5 text-red-650 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h3 className="font-bold text-slate-800 text-sm">Cada colaborador possui uma atribuição específica</h3>
              <p className="text-slate-500 text-xs">Existem permissões e visões restritas para garantir a governança e proteção do estoque J. Cruzeiro. Verifique abaixo as responsabilidades e ferramentas disponíveis para cada perfil.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {rolesList.map(item => (
              <div key={item.title} className={`bg-white p-5 rounded-lg border-2 ${item.color} shadow-xs flex flex-col justify-between space-y-4 hover:shadow-sm transition-all`}>
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">{item.title}</h3>
                      <span className="text-[10px] text-slate-400 block mt-0.5">{item.role}</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[9px] uppercase font-bold ${item.badge}`}>
                      {item.profileName}
                    </span>
                  </div>

                  <p className="text-slate-500 text-xs font-normal leading-relaxed">
                    {item.desc}
                  </p>
                </div>

                <div className="border-t pt-3 space-y-1.5">
                  <span className="text-[9px] uppercase font-mono font-bold tracking-widest text-[#0A1D37] block mb-1">Rotinas do Perfil:</span>
                  <div className="space-y-1">
                    {item.responsibilities.map((r, rIdx) => (
                      <div key={rIdx} className="flex items-center gap-1.5 text-xs text-slate-705">
                        <div className="w-1.5 h-1.5 bg-red-500 rounded-full shrink-0" />
                        <span>{r}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Tips for preview testing */}
          <div className="bg-gradient-to-r from-red-600 to-red-700 text-white p-5 rounded-xl border border-red-500/20 shadow-xs">
            <h4 className="font-bold text-xs uppercase tracking-widest font-sans mb-1 text-red-100">Teste do Desenvolvedor</h4>
            <p className="text-xs text-white/90 leading-relaxed">
              Você pode simular cada uma dessas pessoas usando o botão <strong>"Sandbox Swapper"</strong> no canto esquerdo da barra lateral de navegação. Alterne entre <strong>Juliano Separador</strong> para expedir cargas, ou <strong>Gerente da Loja</strong> para registrar exposições e auditorias de varejo!
            </p>
          </div>
        </div>
      )}

      {activeTab === 'quick' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          
          <div className="p-6 border-b">
            <h2 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Perguntas Frequentes & Protocolos de Incidentes</h2>
            <p className="text-slate-400 text-xs mt-0.5">Procedimentos para os erros e comportamentos imprevistos do cotidiano logístico.</p>
          </div>

          <div className="divide-y divide-slate-100 p-4 sm:p-6 space-y-4">
            
            <div className="space-y-1 py-1">
              <strong className="text-[#0A1D37] text-xs font-bold block">1. A quantidade separada no CD-01 veio menor ou diferente da solicitada. O que fazer?</strong>
              <p className="text-slate-505 text-xs leading-relaxed font-normal">
                O Gerente da Loja, no momento do Recebimento, não deve recusar a carga. Ele deve registrar a quantidade exata que de fato chegou e marcar o item. O status passará para "Recebida parcialmente" automaticamente e uma "Pendência Operacional" será criada para o Controlador de CD avaliar a complementação do saldo.
              </p>
            </div>

            <div className="space-y-1 pt-3">
              <strong className="text-[#0A1D37] text-xs font-bold block">2. Uma peça quebrou ou rachou no showroom, como corrigir o estoque?</strong>
              <p className="text-slate-505 text-xs leading-relaxed font-normal">
                Clique em "Avarias" e selecione "Registrar Avaria Manual". Descreva o defeito (trincado, lascado, arranhão profundo) e insira uma imagem de conferência. Amostras avariadas em showroom são consideradas perdas, e seu saldo é deduzido do estoque total para não poluir os dados.
              </p>
            </div>

            <div className="space-y-1 pt-3">
              <strong className="text-[#0A1D37] text-xs font-bold block">3. O que são os indicadores circulares verdes, azuis e amarelos na listagem de auditoria de showroom?</strong>
              <p className="text-slate-505 text-xs leading-relaxed font-normal flex items-center gap-1.5 flex-wrap">
                Representam a validação sanitária dos displays na Conferência Mensal:
                <span className="flex items-center gap-1 shrink-0"><span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block"></span> Íntegro</span>
                <span className="flex items-center gap-1 shrink-0"><span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block"></span> Limpo / Conservado</span>
                <span className="flex items-center gap-1 shrink-0"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span> Código Identificado</span>
                <span className="flex items-center gap-1 shrink-0"><span className="w-2.5 h-2.5 rounded-full bg-teal-500 inline-block"></span> Posição Correta</span>
              </p>
            </div>

            <div className="space-y-1 pt-3">
              <strong className="text-[#0A1D37] text-xs font-bold block">4. Como comprovar uma exposição se a minha câmera não está funcionando no momento?</strong>
              <p className="text-slate-505 text-xs leading-relaxed font-normal">
                O sistema possui um recurso simulado de captação de imagem para fins de testes rápidos chamado ("Simular Câmera"). Em ambiente de produção real, use seu celular corporativo J. Cruzeiro para tirar a foto de ângulo amplo mostrando a etiqueta do produto e as gôndolas vizinhas organizadas.
              </p>
            </div>

          </div>

        </div>
      )}

      {/* Corporate signature */}
      <div className="text-center text-slate-400 text-[10px] uppercase tracking-widest py-3">
        Manual de Conformidade Técnica J. Cruzeiro • 2026
      </div>

    </div>
  );
}
