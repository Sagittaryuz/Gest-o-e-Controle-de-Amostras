/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { DatabaseService } from './services/db';
import { User } from './types';

// Import our modular pages
import Dashboard from './components/Dashboard';
import AmostrasManager from './components/AmostrasManager';
import EstoqueCD from './components/EstoqueCD';
import SolicitacoesManager from './components/SolicitacoesManager';
import SeparacaoFisica from './components/SeparacaoFisica';
import RecebimentosExposicoes from './components/RecebimentosExposicoes';
import ConferenciaMensalScreen from './components/ConferenciaMensalScreen';
import AvariasPendencias from './components/AvariasPendencias';
import RelatoriosLogs from './components/RelatoriosLogs';
import SandboxSettings from './components/SandboxSettings';
import Tutorial from './components/Tutorial';

// Import Lucide icons
import { 
  Layers, Package, AlertTriangle, CheckSquare, 
  Clock, CheckCircle, FileText, ArrowRightLeft, 
  TrendingUp, Sliders, ShieldAlert, Store, LogOut,
  Settings, ClipboardList, BookOpen, Users, HelpCircle,
  Menu, X, Camera, Truck, Car, FileSpreadsheet
} from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  // Navigation
  const [activePage, setActivePage] = useState<string>('Painel Geral');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Gerenciamento settings
  const [gerenciamentoTab, setGerenciamentoTab] = useState<'usuarios' | 'motoristas' | 'veiculos' | 'planilhas'>('usuarios');
  const [gerenciamentoPopupOpen, setGerenciamentoPopupOpen] = useState(false);

  // Corporate Login inputs
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Auto boot checking
  useEffect(() => {
    // Check if user is already logged in
    const cached = localStorage.getItem('jc_logged_user');
    if (cached) {
      setCurrentUser(JSON.parse(cached));
    }
    // Auto seed raw tables if empty and start real-time Firestore listeners
    DatabaseService.initialize();
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    try {
      const result = DatabaseService.login(loginEmail);
      if (!result.success || !result.user) {
        setLoginError(result.error || 'Erro de autenticação.');
        return;
      }
      const userObj = result.user;
      setCurrentUser(userObj);
      localStorage.setItem('jc_logged_user', JSON.stringify(userObj));
      setActivePage('Painel Geral');
    } catch (err: any) {
      setLoginError(err.message || 'Erro ao realizar login corporativo.');
    }
  };

  const handleLogout = () => {
    DatabaseService.logout();
    setCurrentUser(null);
    localStorage.removeItem('jc_logged_user');
  };

  // Sandbox switched trigger
  const handleSandboxUserSwitch = (u: User) => {
    setCurrentUser(u);
    localStorage.setItem('jc_logged_user', JSON.stringify(u));
    // Reset page view if switching to a role that does not have permissions for the active page
    if (u.perfil === 'Separador') {
      setActivePage('Separação Física');
    } else if (u.perfil === 'Gerente') {
      setActivePage('Recebimentos em Loja');
    } else {
      setActivePage('Painel Geral');
    }
  };

  const handleResetDatabase = async () => {
    try {
      await DatabaseService.clearAndReseedDatabase();
      DatabaseService.initialize();
      
      alert('Banco de dados do Firebase e LocalStorage re-semeados com sucesso!');
      window.location.reload();
    } catch (err: any) {
      console.error(err);
      alert('Erro ao reiniciar banco de dados: ' + (err.message || err));
    }
  };

  // --- RENDERING ROUTER MATCH ---
  const renderActivePage = () => {
    if (!currentUser) return null;

    switch (activePage) {
      case 'Painel Geral':
        return <Dashboard user={currentUser} onNavigateTo={setActivePage} />;
      
      case 'Cadastros':
        return <AmostrasManager user={currentUser} />;
      
      case 'Entradas':
        return <EstoqueCD user={currentUser} />;
      
      case 'Saídas (Solicitações)':
        return <SolicitacoesManager user={currentUser} onNavigateTo={setActivePage} />;
      
      case 'Nova Solicitação':
        return <SolicitacoesManager user={currentUser} onNavigateTo={setActivePage} isNewFormRequested={true} />;
      
      case 'Separação Física':
        return <SeparacaoFisica user={currentUser} onNavigateTo={setActivePage} />;
      
      case 'Recebimentos em Loja':
        return <RecebimentosExposicoes user={currentUser} onNavigateTo={setActivePage} subView="recebimento" />;
      
      case 'Conferência Mensal':
        return (
          <ConferenciaMensalScreen 
            user={currentUser} 
            onNavigateTo={setActivePage}
            onChangeGerenciamentoTab={setGerenciamentoTab}
          />
        );
      
      case 'Avarias':
        return <AvariasPendencias user={currentUser} />;
      
      case 'Pendências':
        return <AvariasPendencias user={currentUser} />;
      
      case 'Relatórios':
        return <RelatoriosLogs user={currentUser} />;
      
      case 'Gerenciamento':
        return (
          <SandboxSettings 
            currentUser={currentUser} 
            onSwitchUser={handleSandboxUserSwitch} 
            onResetDatabase={handleResetDatabase} 
            activeSection={gerenciamentoTab}
            onChangeSection={(sec) => setGerenciamentoTab(sec)}
          />
        );

      case 'Tutorial':
        return <Tutorial />;

      default:
        return <Dashboard user={currentUser} onNavigateTo={setActivePage} />;
    }
  };

  // Safe checks for Sidebar Items based on role permissions
  const menuItems = [
    { title: 'Painel Geral', icon: TrendingUp, roles: ['Admin', 'Controlador', 'Gerente', 'Separador', 'Gestor', 'Conferente'] },
    { title: 'Cadastros', icon: Layers, roles: ['Admin', 'Controlador', 'Gerente'] },
    { title: 'Entradas', icon: Package, roles: ['Admin', 'Controlador', 'Separador'] },
    { title: 'Saídas (Solicitações)', icon: Clock, roles: ['Admin', 'Controlador', 'Gerente', 'Gestor'] },
    { title: 'Separação Física', icon: CheckSquare, roles: ['Admin', 'Separador'] },
    { title: 'Recebimentos em Loja', icon: Store, roles: ['Admin', 'Gestor'] },
    { title: 'Conferência Mensal', icon: ClipboardList, roles: ['Admin', 'Conferente'] },
    { title: 'Pendências', icon: ShieldAlert, roles: ['Admin', 'Controlador', 'Gerente', 'Gestor'] },
    { title: 'Relatórios', icon: FileText, roles: ['Admin', 'Controlador'] },
    { title: 'Gerenciamento', icon: Settings, roles: ['Admin', 'Controlador', 'Gerente', 'Separador', 'Gestor', 'Conferente'] },
    { title: 'Tutorial', icon: BookOpen, roles: ['Admin', 'Controlador', 'Gerente', 'Separador', 'Gestor', 'Conferente'] },
  ];

  const filteredMenuItems = menuItems.filter(item => item.roles.includes(currentUser?.perfil || ''));
  if (!currentUser) {
    const centralShortcuts = [
      { email: 'guilherme@jcruzeiro.com', desc: 'TI / Ops (Admin)' },
      { email: 'ivan@jcruzeiro.com', desc: 'Compras (Controlador)' },
      { email: 'juliana@jcruzeiro.com', desc: 'Logística (Separador)' }
    ];

    const operatorShortcuts = [
      { email: 'operador.matriz@jcruzeiro.com', desc: 'Op. Matriz' },
      { email: 'operador.catedral@jcruzeiro.com', desc: 'Op. Catedral' },
      { email: 'operador.mineiros@jcruzeiro.com', desc: 'Op. Mineiros' },
      { email: 'operador.rharo@jcruzeiro.com', desc: 'Op. Rharo' },
      { email: 'operador.said@jcruzeiro.com', desc: 'Op. Said' },
      { email: 'operador.rioverde@jcruzeiro.com', desc: 'Op. Rio Verde' }
    ];

    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 selection:bg-red-200 font-sans">
        <div className="w-full max-w-lg bg-white rounded-xl border border-slate-200 shadow-md overflow-hidden leading-relaxed">
          
          {/* Top Gold brand Bar */}
          <div className="bg-white p-6 text-center border-b border-slate-200 border-t-4 border-[#0A1D37] relative">
            <div className="absolute top-2 right-2 flex items-center gap-1.5 text-[9px] text-[#64748b] bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
              Operacional Live
            </div>
            
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="w-8 h-8 bg-[#0A1D37] text-white rounded-md flex items-center justify-center font-black text-sm">JC</div>
              <h1 className="text-xl font-bold tracking-tight text-[#0A1D37] font-sans">
                J. CRUZEIRO
              </h1>
            </div>
            <p className="text-[10px] text-red-650 uppercase font-sans tracking-widest mt-1 font-bold">
              Gestão e Controle de Amostras
            </p>
          </div>

          <div className="p-6 space-y-6 bg-white">
            {loginError && (
              <div id="login_error" className="p-3 bg-red-50 text-red-700 text-xs border border-red-100 rounded-md font-medium">
                {loginError}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4 text-xs font-semibold text-slate-500">
              <div>
                <label className="block uppercase tracking-wider mb-1 font-bold text-slate-500">E-mail Corporativo</label>
                <input 
                  type="email" 
                  placeholder="seu_nome@jcruzeiro.com"
                  value={loginEmail}
                  onChange={e => setLoginEmail(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm text-slate-900 focus:outline-none focus:border-[#0A1D37] focus:bg-white"
                  required
                />
                <span className="text-[10px] text-slate-400 font-normal block mt-1">Acesso exclusivo para contas oficiais da empresa.</span>
              </div>

              <div>
                <label className="block uppercase tracking-wider mb-1 font-bold text-slate-500">Senha de Acesso</label>
                <input 
                  type="password" 
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={e => setLoginPassword(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm text-slate-900 focus:outline-none focus:border-[#0A1D37] focus:bg-white"
                  required
                />
              </div>

              <button 
                type="submit"
                id="login_submit_btn"
                className="w-full btn-operational bg-[#0A1D37] hover:bg-slate-800 text-white font-bold rounded-lg transition-all uppercase cursor-pointer text-sm shadow-sm"
              >
                Autenticar E-mail & Senha
              </button>
            </form>

            <div className="relative border-t border-slate-100 py-2">
              <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-white px-3 text-[10px] font-sans text-slate-400">
                Atalhos Sandbox Preview
              </span>
            </div>

            <div className="space-y-4">
              <div>
                <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wide block mb-1.5 font-mono">
                  1. Central e Logística CD
                </span>
                <div className="grid grid-cols-3 gap-2 text-[10px]">
                  {centralShortcuts.map(su => (
                    <button 
                      type="button"
                      key={su.email}
                      onClick={() => {
                        setLoginEmail(su.email);
                        setLoginPassword('Senha123@jc');
                        setTimeout(() => {
                          const btn = document.getElementById('login_submit_btn');
                          btn?.click();
                        }, 100);
                      }}
                      className="p-2 border border-slate-205 hover:border-[#0A1D37] hover:bg-slate-50 rounded-lg text-left transition-all cursor-pointer"
                    >
                      <strong className="text-slate-750 block text-[10px] truncate">{su.desc}</strong>
                      <span className="text-slate-400 font-mono italic block mt-0.5 text-[8.5px] truncate">{su.email}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wide block mb-1.5 font-mono">
                  2. Operadores de Loja (Filiais)
                </span>
                <div className="grid grid-cols-3 gap-2 text-[9.5px]">
                  {operatorShortcuts.map(su => (
                    <button 
                      type="button"
                      key={su.email}
                      onClick={() => {
                        setLoginEmail(su.email);
                        setLoginPassword('Senha123@jc');
                        setTimeout(() => {
                          const btn = document.getElementById('login_submit_btn');
                          btn?.click();
                        }, 100);
                      }}
                      className="p-2 border border-slate-205 hover:border-[#0A1D37] hover:bg-slate-50 rounded-lg text-left transition-all cursor-pointer"
                    >
                      <strong className="text-slate-750 block text-[10px] truncate">{su.desc}</strong>
                      <span className="text-slate-400 font-mono italic block mt-0.5 text-[8.5px] truncate">{su.email}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 p-4 border-t border-slate-100 text-center text-[10px] text-slate-400">
            &copy; 2026 J. Cruzeiro Construção & Acabamento. Todos os direitos reservados.
          </div>
        </div>
      </div>
    );
  }

  // --- MAIN APP SHELL RENDER ---
  return (
    <div className="min-h-screen bg-white flex flex-col md:flex-row text-slate-800" id="main_shell">
      
      {/* 1. SIDEBAR (Desktop layout) */}
      <aside className="w-64 bg-[#010030] border-r border-[#000731] text-[#c8dded] flex flex-col justify-between shrink-0 hidden md:flex z-40 no-print">
        <div className="space-y-4 bg-[#010030]" style={{ backgroundColor: '#010030' }}>
          
          {/* Brand header */}
          <div className="p-6 border-b border-white/10 flex flex-col items-start bg-[#010030]">
            <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2 font-display">
              <div className="w-8 h-8 bg-[#dd0000] rounded-md flex items-center justify-center text-white font-black animate-pulse">JC</div>
              J. CRUZEIRO
            </h1>
            <p className="text-[10px] text-red-500 font-bold tracking-widest mt-1 uppercase font-sans">
              Gestão e Controle de Amostras
            </p>
          </div>

          {/* Quick Nav Header Label */}
          <div className="px-5 text-[10px] uppercase tracking-widest text-[#c8dded]/50 font-bold font-sans">MENU OPERACIONAL</div>

          {/* Link List */}
          <nav className="px-3 space-y-1 text-xs font-semibold relative" style={{ color: '#c8dded', backgroundColor: '#000731' }}>
            {filteredMenuItems.map((item, index) => {
              const Icon = item.icon;
              const isActive = activePage === item.title;

              if (item.title === 'Gerenciamento') {
                return (
                  <div key={item.title} className="relative">
                    <button 
                      type="button"
                      onClick={() => {
                        setActivePage('Gerenciamento');
                        setGerenciamentoPopupOpen(!gerenciamentoPopupOpen);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-none font-semibold text-left transition-colors cursor-pointer ${
                        isActive 
                          ? 'bg-[#dd0000] text-white font-bold border-l-4 border-white pl-2' 
                          : 'text-[#c8dded]/80 hover:text-white hover:bg-white/5 pl-3'
                      }`}
                    >
                      <span className="flex items-center gap-2.5">
                        <Icon className="w-4 h-4 opacity-80" /> {item.title}
                      </span>
                      <span className="text-[9px] bg-white/10 text-white/50 px-1 py-0.5 rounded uppercase">
                        Opções
                      </span>
                    </button>

                    {/* Popover right next to the title "Gerenciamento" */}
                    {gerenciamentoPopupOpen && (
                      <div className="absolute left-[245px] top-0 bg-[#0A1D37] border border-white/25 text-white rounded-lg shadow-2xl p-3.5 w-52 space-y-1 z-55 animate-in fade-in slide-in-from-left-2 no-print font-sans select-none">
                        <div className="text-[9px] uppercase tracking-wider text-slate-400 font-bold mb-2 border-b border-white/10 pb-1 flex justify-between items-center">
                          <span>Áreas de Gerenciamento</span>
                          <button 
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setGerenciamentoPopupOpen(false); }} 
                            className="text-white/40 hover:text-white font-bold text-[8px]"
                          >
                            Fechar [x]
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setGerenciamentoTab('usuarios');
                            setActivePage('Gerenciamento');
                            setGerenciamentoPopupOpen(false);
                          }}
                          className={`w-full text-left px-2.5 py-2 rounded hover:bg-white/10 flex items-center gap-2 text-xs font-semibold cursor-pointer transition-colors ${gerenciamentoTab === 'usuarios' && activePage === 'Gerenciamento' ? 'bg-[#dd0000] text-white font-bold' : 'text-slate-200'}`}
                        >
                          <Users className="w-3.5 h-3.5 shrink-0" /> Usuários (Perfis)
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setGerenciamentoTab('motoristas');
                            setActivePage('Gerenciamento');
                            setGerenciamentoPopupOpen(false);
                          }}
                          className={`w-full text-left px-2.5 py-2 rounded hover:bg-white/10 flex items-center gap-2 text-xs font-semibold cursor-pointer transition-colors ${gerenciamentoTab === 'motoristas' && activePage === 'Gerenciamento' ? 'bg-[#dd0000] text-white font-bold' : 'text-slate-200'}`}
                        >
                          <Truck className="w-3.5 h-3.5 shrink-0" /> Motoristas
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setGerenciamentoTab('veiculos');
                            setActivePage('Gerenciamento');
                            setGerenciamentoPopupOpen(false);
                          }}
                          className={`w-full text-left px-2.5 py-2 rounded hover:bg-white/10 flex items-center gap-2 text-xs font-semibold cursor-pointer transition-colors ${gerenciamentoTab === 'veiculos' && activePage === 'Gerenciamento' ? 'bg-[#dd0000] text-white font-bold' : 'text-slate-200'}`}
                        >
                          <Car className="w-3.5 h-3.5 shrink-0" /> Veículos
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setGerenciamentoTab('planilhas');
                            setActivePage('Gerenciamento');
                            setGerenciamentoPopupOpen(false);
                          }}
                          className={`w-full text-left px-2.5 py-2 rounded hover:bg-white/10 flex items-center gap-2 text-xs font-semibold cursor-pointer transition-colors ${gerenciamentoTab === 'planilhas' && activePage === 'Gerenciamento' ? 'bg-[#dd0000] text-white font-bold' : 'text-slate-200'}`}
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5 shrink-0" /> Importar Planilhas
                        </button>
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <button 
                  key={item.title}
                  type="button"
                  onClick={() => {
                    setGerenciamentoPopupOpen(false);
                    setActivePage(item.title);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-none font-semibold text-left transition-colors cursor-pointer ${
                    isActive 
                      ? 'bg-[#dd0000] text-white font-bold border-l-4 border-white pl-2' 
                      : 'text-[#c8dded]/80 hover:text-white hover:bg-white/5 pl-3'
                  }`}
                >
                  <Icon className="w-4 h-4 opacity-80" /> {item.title}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Quick profile indicators (Bottom of sidebar layout) */}
        <div className="p-4 bg-[#000731] border-t border-white/10 shrink-0">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-[#dd0000] text-white flex items-center justify-center font-bold text-xs uppercase shrink-0 font-sans">
              {currentUser.nome.charAt(0)}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold truncate text-white font-sans">{currentUser.nome}</p>
              <p className="text-[10px] text-[#c8dded]/60 truncate font-sans">{currentUser.email}</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-white/5 hover:bg-red-650 hover:text-white text-[#c8dded] rounded-lg text-xs font-semibold cursor-pointer transition-colors border border-white/10"
          >
            <LogOut className="w-3.5 h-3.5 animate-pulse" /> Sair do Sistema
          </button>
        </div>
      </aside>

      {/* 2. MOBILE TOP NAV */}
      <header className="md:hidden bg-white border-b border-slate-200 text-[#0A1D37] p-4 flex justify-between items-center z-50 sticky top-0 no-print">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-[#0A1D37] rounded flex items-center justify-center text-white font-black text-xs">JC</div>
          <div>
            <h1 className="text-xs font-bold tracking-tight text-[#0A1D37]">J. CRUZEIRO</h1>
            <span className="text-[9px] uppercase font-mono text-red-650 block">Gestão e Controle de Amostras</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Active profile bubble */}
          <span className="px-2 py-0.5 bg-slate-100 text-[10px] uppercase font-bold text-red-650 rounded border border-slate-200">
            {currentUser.perfil}
          </span>
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 text-slate-500 hover:text-[#0A1D37]"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* MOBILE POPUP MENU DRAWER */}
      {mobileMenuOpen && (
        <div className="absolute inset-x-0 top-14 bg-white border-b border-slate-200 p-4 text-xs font-medium space-y-2 z-50 md:hidden animate-in fade-in slide-in-from-top-2 no-print shadow-lg">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-slate-600 flex items-center gap-2.5">
            <div className="w-7 h-7 bg-[#0A1D37] text-white rounded-full flex items-center justify-center font-black text-xs uppercase shrink-0">
              {currentUser.nome.charAt(0)}
            </div>
            <div className="overflow-hidden">
              <strong className="text-[#0A1D37] text-xs block">{currentUser.nome}</strong>
              <span className="text-[10px] text-slate-500 block break-words">{currentUser.email}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1.5 pt-2">
            {filteredMenuItems.map(item => {
              const Icon = item.icon;
              const isActive = activePage === item.title;

              if (item.title === 'Gerenciamento') {
                return (
                  <div key={item.title} className="col-span-2 space-y-1">
                    <div className="flex items-center gap-2 p-2.5 rounded-lg border bg-slate-50 text-[#0A1D37] border-slate-200 justify-between">
                      <span className="flex items-center gap-2 font-bold">
                        <Icon className="w-3.5 h-3.5 shrink-0" /> {item.title}
                      </span>
                      <span className="text-[9px] uppercase font-bold text-slate-400">Ir para:</span>
                    </div>
                    <div className="grid grid-cols-4 gap-1 pl-1">
                      <button
                        type="button"
                        onClick={() => {
                          setGerenciamentoTab('usuarios');
                          setActivePage('Gerenciamento');
                          setMobileMenuOpen(false);
                        }}
                        className={`p-2 border rounded text-center text-[10px] font-bold flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors ${gerenciamentoTab === 'usuarios' && activePage === 'Gerenciamento' ? 'bg-[#0A1D37] border-[#0A1D37] text-white' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}
                      >
                        <Users className="w-4 h-4 shrink-0" />
                        <span>Usuários</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setGerenciamentoTab('motoristas');
                          setActivePage('Gerenciamento');
                          setMobileMenuOpen(false);
                        }}
                        className={`p-2 border rounded text-center text-[10px] font-bold flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors ${gerenciamentoTab === 'motoristas' && activePage === 'Gerenciamento' ? 'bg-[#0A1D37] border-[#0A1D37] text-white' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}
                      >
                        <Truck className="w-4 h-4 shrink-0" />
                        <span>Motoristas</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setGerenciamentoTab('veiculos');
                          setActivePage('Gerenciamento');
                          setMobileMenuOpen(false);
                        }}
                        className={`p-2 border rounded text-center text-[10px] font-bold flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors ${gerenciamentoTab === 'veiculos' && activePage === 'Gerenciamento' ? 'bg-[#0A1D37] border-[#0A1D37] text-white' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}
                      >
                        <Car className="w-4 h-4 shrink-0" />
                        <span>Veículos</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setGerenciamentoTab('planilhas');
                          setActivePage('Gerenciamento');
                          setMobileMenuOpen(false);
                        }}
                        className={`p-2 border rounded text-center text-[10px] font-bold flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors ${gerenciamentoTab === 'planilhas' && activePage === 'Gerenciamento' ? 'bg-[#0A1D37] border-[#0A1D37] text-white' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}
                      >
                        <FileSpreadsheet className="w-4 h-4 shrink-0" />
                        <span>Planilhas</span>
                      </button>
                    </div>
                  </div>
                );
              }

              return (
                <button 
                  key={item.title}
                  type="button"
                  onClick={() => {
                    setActivePage(item.title);
                    setMobileMenuOpen(false);
                  }}
                  className={`flex items-center gap-2 p-2.5 rounded-lg transition-colors border ${
                    isActive 
                      ? 'bg-slate-100 text-[#0A1D37] font-bold border-red-500' 
                      : 'bg-white text-slate-705 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" /> {item.title}
                </button>
              );
            })}
          </div>

          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 p-2.5 bg-red-50 text-red-650 border border-red-200 rounded-lg mt-3 text-xs font-bold"
          >
            <LogOut className="w-4 h-4" /> Desconectar
          </button>
        </div>
      )}

      {/* 3. MAIN CONTAINER & TOP HEADER & STAGE SCREEN */}
      <main className="flex-1 flex flex-col min-h-screen overflow-hidden">
        
        {/* Desktop Header */}
        <header className="h-14 bg-white border-b border-slate-200 hidden md:flex items-center justify-between px-6 shrink-0 no-print">
          <div className="flex items-center gap-4">
            <h2 className="text-sm font-bold text-[#0A1D37] uppercase tracking-wider">{activePage}</h2>
            <div className="h-4 w-px bg-slate-300"></div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
              J. CRUZEIRO GESTÃO E CONTROLE DE AMOSTRAS
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-[10px] bg-slate-100 text-[#64748b] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider border border-slate-200">
                Servidor Online
              </span>
            </div>
            <div className="h-4 w-px bg-slate-205"></div>
            <span className="text-[11px] text-[#64748b] font-bold uppercase tracking-wider bg-slate-100 px-2.5 py-1 rounded">
              Unidade CD-01
            </span>
          </div>
        </header>

        {/* Scrollable layout content stage */}
        <div className="flex-1 p-4 sm:p-5 lg:p-6 overflow-y-auto w-full transition-all bg-white">
          {renderActivePage()}
        </div>

        {/* Footer Info Area */}
        <footer className="h-10 bg-white border-t border-slate-200 flex items-center justify-between px-6 shrink-0 text-slate-500 text-[10px] font-bold uppercase tracking-widest no-print">
            <p className="">© 2026 J. Cruzeiro Construção & Acabamento • Unidade CD-01</p>
            <p className="text-slate-400">Versão 1.2.0 (Alpha)</p>
        </footer>
      </main>

    </div>
  );
}
