/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { DatabaseService } from '../services/db';
import { User, ConferenciaMensal, ConferenciaMensalItem } from '../types';
import { 
  Users, RefreshCw, AlertTriangle, ShieldCheck, 
  Database, HardDrive, Cpu, Terminal, Truck, Car,
  FileSpreadsheet, Upload, Download, Trash2, CheckCircle2, AlertCircle
} from 'lucide-react';

interface SandboxSettingsProps {
  currentUser: User;
  onSwitchUser: (user: User) => void;
  onResetDatabase: () => void;
  activeSection?: 'usuarios' | 'motoristas' | 'veiculos' | 'planilhas';
  onChangeSection?: (sec: 'usuarios' | 'motoristas' | 'veiculos' | 'planilhas') => void;
}

export default function SandboxSettings({ 
  currentUser, 
  onSwitchUser, 
  onResetDatabase,
  activeSection = 'usuarios',
  onChangeSection
}: SandboxSettingsProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [veiculos, setVeiculos] = useState<{ id: string; placa: string; modelo: string }[]>([]);
  const [motoristas, setMotoristas] = useState<{ id: string; nome: string; cnh: string }[]>([]);

  // Spreadsheet import states
  const [competencia, setCompetencia] = useState('06/2026');
  const [csvError, setCsvError] = useState('');
  const [csvSuccess, setCsvSuccess] = useState('');
  const [conferenciasImportadas, setConferenciasImportadas] = useState<ConferenciaMensal[]>([]);

  const [newPlaca, setNewPlaca] = useState('');
  const [newModelo, setNewModelo] = useState('');
  const [newNome, setNewNome] = useState('');
  const [newCnh, setNewCnh] = useState('');

  useEffect(() => {
    const load = () => {
      setUsers(DatabaseService.getUsers());
      setVeiculos(DatabaseService.getVeiculos());
      setMotoristas(DatabaseService.getMotoristas());
      setConferenciasImportadas(DatabaseService.getConferenciasImportadas());
    };
    load();
    return DatabaseService.subscribe(load);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Direct support for ODS format validation as requested
    if (!file.name.toLowerCase().endsWith('.ods')) {
      setCsvError('Apenas arquivos de planilha no formato (.ods) são suportados para importação da conferência mensal.');
      setCsvSuccess('');
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const ab = evt.target?.result as ArrayBuffer;
        const workbook = XLSX.read(ab, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert sheet data to raw array of arrays with default empty values
        const entries = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1, defval: "" });
        
        if (entries.length < 7) {
          throw new Error("A planilha fornecida possui menos de 7 linhas. Os dados de produtos devem começar na linha 7.");
        }

        const parsedItems: ConferenciaMensalItem[] = [];
        let stopRowLine = 7;
        let totalScanned = 0;

        // Start reading from index 6 (Row 7)
        for (let i = 6; i < entries.length; i++) {
          const row = entries[i];
          if (!row) {
            stopRowLine = i + 1;
            break;
          }

          const val0 = row[0] !== undefined && row[0] !== null ? String(row[0]).trim() : '';
          
          // Condition of parada: blank cell in Column A (ADM)
          if (val0 === '') {
            stopRowLine = i + 1; // actual 1-based row number registered as X
            break;
          }

          totalScanned++;
          const admRaw = val0;
          // Clean ADM by removing all point characters "."
          const cleanAdm = admRaw.replace(/\./g, "").trim();

          const descRaw = row[1] !== undefined && row[1] !== null ? String(row[1]).trim() : '';
          const marcaRaw = row[2] !== undefined && row[2] !== null ? String(row[2]).trim() : '';

          // Stock columns: Column P (index 15), Column W (index 22)
          const parseStockVal = (val: any): number => {
            if (val === undefined || val === null || val === '') return 0;
            if (typeof val === 'number') return val;
            const cleanStr = String(val).replace(/\s/g, '').replace(',', '.');
            const parsed = parseFloat(cleanStr);
            return isNaN(parsed) ? 0 : parsed;
          };

          const stockP = parseStockVal(row[15]);
          const stockW = parseStockVal(row[22]);
          const stockTotal = stockP + stockW;

          // Process only items where CD Stock (Column P) + Filial Stock (Column W) is >= 30
          if (stockTotal >= 30) {
            parsedItems.push({
              codigoAdm: cleanAdm,
              descricao: descRaw || `Produto ADM ${cleanAdm}`,
              marca: marcaRaw || 'Importado',
              statusExposicao: 'Não exposto',
              integridadeFisica: true,
              limpeza: true,
              conservacao: true,
              identificacaoCorreta: true,
              localizacaoAdequada: true,
              fotos: [],
              codigoBarras: "00" + cleanAdm, // Verification target barcode code: 00ADM
              verificado: false,
              estoque: stockTotal
            });
          }
        }

        if (totalScanned === 0) {
          throw new Error(`Nenhum produto válido foi identificado entre a linha 7 e a linha ${stopRowLine}.`);
        }

        const cleanComp = competencia.replace(/\s+/g, '').replace('/', '_');
        const globalId = `conf_import_global_${cleanComp}`;

        const updatedConf: ConferenciaMensal = {
          id: globalId,
          competencia,
          loja: 'GLOBAL',
          gerenteLoja: currentUser.nome,
          gerenteOperacional: 'Guilherme Admin',
          status: 'Pendente',
          prazoResposta: new Date(Date.now() + 86400000 * 15).toISOString().split('T')[0],
          itens: parsedItems,
          fotos: [],
          enviadoEm: new Date().toISOString()
        };

        // Load any existing imported checklists, and retain all those except the global template we are replacing
        const existing = DatabaseService.getConferenciasImportadas();
        const otherConfs = existing.filter(c => c.id !== globalId);

        // For any existing store copies of this specific competency, update their items list but carry over existing validations!
        const mergedConfs = otherConfs.map(conf => {
          if (conf.loja.toUpperCase() !== 'GLOBAL' && conf.competencia === competencia) {
            const mergedItens = parsedItems.map(newItem => {
              const existingItem = conf.itens.find(it => it.codigoAdm === newItem.codigoAdm);
              if (existingItem && existingItem.verificado) {
                return {
                  ...newItem,
                  verificado: true,
                  verificadoEm: existingItem.verificadoEm,
                  integridadeFisica: existingItem.integridadeFisica,
                  limpeza: existingItem.limpeza,
                  conservacao: existingItem.conservacao,
                  identificacaoCorreta: existingItem.identificacaoCorreta,
                  localizacaoAdequada: existingItem.localizacaoAdequada,
                  fotos: existingItem.fotos || [],
                  statusExposicao: existingItem.statusExposicao || 'Não exposto'
                };
              }
              return newItem;
            });

            const hasUnfinished = mergedItens.some(i => !i.verificado);

            return {
              ...conf,
              itens: mergedItens,
              status: hasUnfinished ? 'Pendente' as const : 'Respondida' as const
            };
          }
          return conf;
        });

        const newConfs = [...mergedConfs, updatedConf];
        DatabaseService.setConferenciasImportadas(newConfs);
        setConferenciasImportadas(newConfs);
        
        // Show success summary explicitly documenting Stop Row X and numbers
        setCsvSuccess(
          `Importação concluída com sucesso!
          - Intervalo de leitura registrado: A7 a A${stopRowLine - 1}.
          - Linha de parada (X) identificada na linha: ${stopRowLine} (onde o ADM estava em branco).
          - Total de produtos lidos no intervalo: ${totalScanned} registros.
          - Produtos adicionados (Filtro Estoque CD + Filial ≥ 30): ${parsedItems.length} itens.`
        );
        setCsvError('');
      } catch (err: any) {
        setCsvError(err.message || 'Erro ao processar o arquivo de planilha ODS. Verifique o layout.');
        setCsvSuccess('');
      }
    };
    reader.onerror = () => {
      setCsvError('Não foi possível ler o arquivo de dados selecionado.');
    };
    reader.readAsArrayBuffer(file);
  };

  const handleDeleteChecklist = (id: string, loja: string) => {
    if (confirm(`Atenção: deseja remover completamente o checklist de auditoria importado para a loja ${loja}?`)) {
      const allConfs = DatabaseService.getConferenciasImportadas();
      const updated = allConfs.filter(c => c.id !== id);
      DatabaseService.setConferenciasImportadas(updated);
      setConferenciasImportadas(updated);
    }
  };

  const handleAddVeiculo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlaca.trim() || !newModelo.trim()) return;
    DatabaseService.addVeiculo(newPlaca.trim().toUpperCase(), newModelo.trim());
    setNewPlaca('');
    setNewModelo('');
  };

  const handleAddMotorista = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNome.trim() || !newCnh.trim()) return;
    DatabaseService.addMotorista(newNome.trim(), newCnh.trim().toUpperCase());
    setNewNome('');
    setNewCnh('');
  };

  const [localTab, setLocalTab] = useState<'usuarios' | 'motoristas' | 'veiculos' | 'planilhas'>(activeSection);

  useEffect(() => {
    setLocalTab(activeSection);
  }, [activeSection]);

  const currentTab = onChangeSection ? activeSection : localTab;

  const handleTabClick = (tab: 'usuarios' | 'motoristas' | 'veiculos' | 'planilhas') => {
    if (onChangeSection) {
      onChangeSection(tab);
    } else {
      setLocalTab(tab);
    }
  };

  return (
    <div className="space-y-6" id="sandbox_panel">
      {/* Simulation Info */}
      <div className="bg-slate-50 text-slate-700 p-6 rounded-lg border border-slate-200 border-l-4 border-[#0A1D37] space-y-2">
        <h3 className="font-display font-bold text-lg text-[#0A1D37] flex items-center gap-1.5">
          <Terminal className="w-5 h-5 text-red-650" />
          Gerenciamento Operacional & Sandbox J. Cruzeiro
        </h3>
        <p className="text-[#64748b] text-xs leading-relaxed font-semibold">
          Interface administrativa e operacional para gerenciamento de perfis de usuários, cadastro de frotas de veículos e controle prévio de motoristas parceiros logísticos.
        </p>
      </div>

      {/* Tabs bar */}
      <div className="flex border-b border-slate-200 font-sans gap-1 bg-slate-50 p-1.5 rounded-lg border">
        <button 
          type="button"
          onClick={() => handleTabClick('usuarios')}
          className={`flex-1 sm:flex-initial px-4 py-2 rounded-md font-bold text-xs cursor-pointer transition-all flex items-center justify-center gap-1.5 ${
            currentTab === 'usuarios' 
              ? 'bg-[#0A1D37] text-white shadow-xs' 
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
          }`}
        >
          <Users className="w-4 h-4" /> Usuários (Mudar Perfil)
        </button>
        <button 
          type="button"
          onClick={() => handleTabClick('motoristas')}
          className={`flex-1 sm:flex-initial px-4 py-2 rounded-md font-bold text-xs cursor-pointer transition-all flex items-center justify-center gap-1.5 ${
            currentTab === 'motoristas' 
              ? 'bg-[#0A1D37] text-white shadow-xs' 
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
          }`}
        >
          <Truck className="w-4 h-4" /> Cadastro de Motoristas
        </button>
        <button 
          type="button"
          onClick={() => handleTabClick('veiculos')}
          className={`flex-1 sm:flex-initial px-4 py-2 rounded-md font-bold text-xs cursor-pointer transition-all flex items-center justify-center gap-1.5 ${
            currentTab === 'veiculos' 
              ? 'bg-[#0A1D37] text-white shadow-xs' 
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
          }`}
        >
          <Car className="w-4 h-4" /> Cadastro de Veículos
        </button>
        <button 
          type="button"
          onClick={() => handleTabClick('planilhas')}
          className={`flex-1 sm:flex-initial px-4 py-2 rounded-md font-bold text-xs cursor-pointer transition-all flex items-center justify-center gap-1.5 ${
            currentTab === 'planilhas' 
              ? 'bg-[#0A1D37] text-white shadow-xs' 
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" /> Importar Planilhas (Excel)
        </button>
      </div>

      {/* --- Tab Content --- */}
      {currentTab === 'usuarios' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 leading-relaxed animate-in fade-in duration-200">
          {/* Swapper */}
          <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs space-y-4 text-xs font-semibold">
            <h4 className="font-display text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-1">
              <Users className="w-4 h-4 text-[#0A1D37]" />
              Clique para mudar de Perfil / Usuário:
            </h4>

            <div className="space-y-2">
              {users.map(u => {
                const isActive = u.id === currentUser.id;
                return (
                  <button 
                    key={u.id}
                    onClick={() => {
                      onSwitchUser(u);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className={`w-full p-3 border rounded-lg text-left flex justify-between items-center transition-all cursor-pointer ${
                      isActive 
                        ? 'bg-[#0A1D37] border-[#0A1D37] text-white shadow-sm' 
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div>
                      <strong className={`block ${isActive ? 'text-white font-bold' : 'text-slate-800'}`}>{u.nome}</strong>
                      <span className={`text-[10px] block font-mono font-medium ${isActive ? 'text-slate-300' : 'text-slate-500'}`}>{u.email}</span>
                    </div>
                    
                    <div className="text-right">
                      <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                        u.perfil === 'Admin' ? 'bg-red-100 text-red-700' :
                        u.perfil === 'Controlador' ? 'bg-blue-100 text-blue-700' :
                        u.perfil === 'Separador' ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {u.perfil}
                      </span>
                      {u.loja && <span className={`block text-[9px] mt-0.5 ${isActive ? 'text-slate-300' : 'text-slate-400'}`}>{u.loja}</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Database diagnostic / resets */}
          <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs space-y-4 text-xs">
            <h4 className="font-display text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-1">
              <Database className="w-4 h-4 text-[#0A1D37]" />
              Diagnósticos e Controle de Banco de Dados:
            </h4>

            <div className="space-y-4">
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded text-slate-600 flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-red-650 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-slate-800">Mapeado via LocalStorage</p>
                  <p className="text-[11px] mt-0.5 font-medium">Todas as inclusões comerciais, exclusões, quebras físicas e faturamento de verbas são persistidos na sessão de seu navegador.</p>
                </div>
              </div>

              <div className="space-y-2">
                <button 
                  onClick={() => {
                    if (confirm('Atenção: deseja reiniciar todas as tabelas aos dados originais fábrica? Todas as customizações feitas serão limpas.')) {
                      onResetDatabase();
                    }
                  }}
                  className="w-full btn-operational bg-slate-100 hover:bg-slate-200 text-[#0a1d37] font-bold rounded-md flex items-center justify-center gap-1 border border-slate-200 cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4 text-red-650" /> Reiniciar e Re-semear Banco de Dados
                </button>
              </div>

              <hr className="border-slate-150" />

              <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-400 font-mono">
                <div className="p-2 border border-[#eaecef] rounded bg-slate-50 text-center">
                  <span className="block font-bold">PortInbound</span>
                  <span className="text-slate-700 font-bold block mt-0.5">3000 (Proxy Active)</span>
                </div>
                <div className="p-2 border border-[#eaecef] rounded bg-slate-50 text-center">
                  <span className="block font-bold">NodeEngine</span>
                  <span className="text-slate-700 font-bold block mt-0.5">v22.x LTS</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {currentTab === 'motoristas' && (
        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-xs space-y-4 text-xs font-semibold animate-in fade-in duration-200 max-w-3xl mx-auto">
          <h4 className="font-display text-base font-bold text-[#0A1D37] border-b border-slate-100 pb-2">
            Cadastro Prévio de Motoristas Parceiros
          </h4>
          <form onSubmit={handleAddMotorista} className="space-y-3 bg-slate-50/50 p-4 rounded-lg border border-slate-200">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] text-slate-500 uppercase mb-1 font-bold">Nome Completo</label>
                <input 
                  type="text" 
                  placeholder="Ex: Marcos Santos"
                  value={newNome}
                  onChange={e => setNewNome(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-250 rounded shadow-xs text-xs focus:outline-none focus:border-[#0A1D37] text-slate-800"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 uppercase mb-1 font-bold">CNH/Documento</label>
                <input 
                  type="text" 
                  placeholder="Ex: AD-490321"
                  value={newCnh}
                  onChange={e => setNewCnh(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-250 rounded shadow-xs text-xs focus:outline-none focus:border-[#0A1D37] text-slate-800"
                  required
                />
              </div>
            </div>
            <div className="flex justify-end pt-1">
              <button 
                type="submit"
                className="px-5 py-2 bg-[#0A1D37] hover:bg-slate-800 text-white rounded font-bold font-display cursor-pointer transition-colors"
              >
                Cadastrar Novo Motorista
              </button>
            </div>
          </form>

          <div className="border border-slate-150 rounded-lg overflow-hidden mt-2 shadow-xs bg-white">
            <table className="w-full text-left text-[11px]">
              <thead className="bg-[#0A1D37] text-white font-sans text-[10px] uppercase border-b border-slate-200">
                <tr>
                  <th className="p-3">Nome do Motorista</th>
                  <th className="p-3">Registro CNH</th>
                  <th className="p-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150">
                {motoristas.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="p-4 text-center text-slate-400 italic font-medium">Nenhum motorista cadastrado.</td>
                  </tr>
                ) : (
                  motoristas.map(m => (
                    <tr key={m.id} className="hover:bg-slate-50/70">
                      <td className="p-3 font-semibold text-slate-800">{m.nome}</td>
                      <td className="p-3 font-mono text-slate-650 font-bold">{m.cnh}</td>
                      <td className="p-3 text-right">
                        <button 
                          type="button" 
                          onClick={() => DatabaseService.deleteMotorista(m.id)}
                          className="text-red-500 hover:text-red-700 font-bold hover:underline cursor-pointer"
                        >
                          Remover
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {currentTab === 'veiculos' && (
        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-xs space-y-4 text-xs font-semibold animate-in fade-in duration-200 max-w-3xl mx-auto">
          <h4 className="font-display text-base font-bold text-[#0A1D37] border-b border-slate-100 pb-2">
            Cadastro Prévio de Veículos de Frota (Placas)
          </h4>
          <form onSubmit={handleAddVeiculo} className="space-y-3 bg-slate-50/50 p-4 rounded-lg border border-slate-200">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] text-slate-500 uppercase mb-1 font-bold">Placa do Veículo</label>
                <input 
                  type="text" 
                  placeholder="Ex: BRA2E19"
                  value={newPlaca}
                  onChange={e => setNewPlaca(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-250 rounded shadow-xs text-xs focus:outline-none focus:border-[#0A1D37] text-slate-800"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 uppercase mb-1 font-bold">Modelo/Descrição</label>
                <input 
                  type="text" 
                  placeholder="Ex: Mercedes Atego"
                  value={newModelo}
                  onChange={e => setNewModelo(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-250 rounded shadow-xs text-xs focus:outline-none focus:border-[#0A1D37] text-slate-800"
                  required
                />
              </div>
            </div>
            <div className="flex justify-end pt-1">
              <button 
                type="submit"
                className="px-5 py-2 bg-[#0A1D37] hover:bg-slate-800 text-white rounded font-bold font-display cursor-pointer transition-colors"
              >
                Cadastrar Novo Veículo
              </button>
            </div>
          </form>

          <div className="border border-slate-150 rounded-lg overflow-hidden mt-2 shadow-xs bg-white">
            <table className="w-full text-left text-[11px]">
              <thead className="bg-[#0A1D37] text-white font-sans text-[10px] uppercase border-b border-slate-200">
                <tr>
                  <th className="p-3">Placa Identificadora</th>
                  <th className="p-3">Modelo / Fabricante</th>
                  <th className="p-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150">
                {veiculos.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="p-4 text-center text-slate-400 italic font-medium">Nenhum veículo cadastrado.</td>
                  </tr>
                ) : (
                  veiculos.map(v => (
                    <tr key={v.id} className="hover:bg-slate-50/70">
                      <td className="p-3 font-mono font-black text-blue-900 text-xs">{v.placa}</td>
                      <td className="p-3 text-slate-700 font-medium">{v.modelo}</td>
                      <td className="p-3 text-right">
                        <button 
                          type="button" 
                          onClick={() => DatabaseService.deleteVeiculo(v.id)}
                          className="text-red-500 hover:text-red-700 font-bold hover:underline cursor-pointer"
                        >
                          Remover
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {currentTab === 'planilhas' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-xs space-y-4 text-xs font-semibold max-w-4xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-100 pb-3 gap-2">
              <div>
                <h4 className="font-display text-base font-bold text-[#0A1D37]">
                  Importar Planilha de Auditoria Mensal (.ODS)
                </h4>
                <p className="text-[#64748b] text-[11px] mt-0.5 font-medium leading-relaxed">
                  Carregue a planilha oficial para gerar a conferência de produtos obrigatórios de todas as filiais.
                </p>
              </div>
            </div>

            {currentUser.perfil !== 'Admin' ? (
              <div className="p-4 bg-amber-50 border border-amber-200 text-amber-805 rounded-lg text-xs leading-relaxed">
                <p className="font-bold flex items-center gap-1.5 text-amber-900">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  Privilégios Administrativos Necessários
                </p>
                <p className="mt-1 text-[11px] text-amber-700 font-medium">
                  Sua conta com perfil <span className="font-bold text-red-700">"{currentUser.perfil}"</span> possui permissão apenas de consulta. Apenas Administradores podem gerar ou substituir checklists de auditoria via planilha .ods.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-200/60">
                  <div>
                    <label className="block text-[10px] text-slate-500 uppercase mb-1 font-bold">Mês / Competência Geral</label>
                    <input
                      type="text"
                      placeholder="Ex: 06/2026"
                      value={competencia}
                      onChange={e => setCompetencia(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-250 rounded shadow-xs text-xs focus:outline-none focus:border-indigo-500 font-mono text-slate-800 font-bold"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 uppercase mb-1 font-bold">Subir Arquivo de Auditoria (.ODS)</label>
                    <div className="relative">
                      <input
                        type="file"
                        accept=".ods"
                        onChange={handleFileChange}
                        className="opacity-0 absolute inset-0 w-full h-full cursor-pointer z-10"
                      />
                      <div className="w-full px-3 py-1.5 bg-white border border-dashed border-slate-300 rounded text-center text-[10.5px] font-bold text-slate-650 hover:bg-slate-50 flex items-center justify-center gap-1.5 cursor-pointer">
                        <Upload className="w-3.5 h-3.5 text-slate-500" />
                        <span>Selecionar arquivo .ODS para Processamento</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Elegant Instruction Card for ODS Layout */}
                <div className="bg-indigo-50/45 p-4 rounded-xl border border-indigo-100/70 space-y-3">
                  <h5 className="text-[11px] font-bold text-[#0A1D37] uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-indigo-650 shrink-0" />
                    Regras de Extração e Estrutura do Arquivo .ODS:
                  </h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[11px] text-slate-650 font-medium leading-relaxed">
                    <div className="space-y-2">
                      <p>
                        <strong className="text-slate-800">1. Ponto de Início:</strong> Os dados dos produtos começam estritamente na <span className="bg-indigo-200/40 text-indigo-850 px-1 py-0.5 rounded font-mono">Linha 7</span> (Células A7, B7, C7, P7, W7).
                      </p>
                      <p>
                        <strong className="text-slate-800">2. Condição de Parada (X):</strong> O leitor percorre as linhas sucessivamente até encontrar uma célula <span className="bg-amber-100 text-amber-800 px-1 py-0.5 rounded font-bold">em branco na Coluna A (ADM)</span>. Essa linha em branco será definida como X e marcará a parada.
                      </p>
                      <p>
                        <strong className="text-slate-800">3. Colunas Coletadas:</strong>
                      </p>
                      <ul className="list-disc pl-4 space-y-0.5 text-[10.5px]">
                        <li>Coluna <strong className="text-slate-800">A (ADM)</strong>: Código ADM (removerá pontos internos).</li>
                        <li>Coluna <strong className="text-slate-800">B (Descrição)</strong>: Nome/descrição do item.</li>
                        <li>Coluna <strong className="text-slate-800">C (Marca)</strong>: Fabricante/marca.</li>
                      </ul>
                    </div>
                    <div className="space-y-2 font-medium">
                      <p>
                        <strong className="text-slate-800">4. Filtro de Estoque Mínimo:</strong> 
                        <br />
                        O sistema soma as colunas <span className="bg-slate-200/50 text-slate-800 px-1 rounded font-mono">P (Estoque CD)</span> e <span className="bg-slate-200/50 text-slate-800 px-1 rounded font-mono">W (Estoque Filial)</span> para cada produto.
                      </p>
                      <div className="p-2.5 bg-white border border-indigo-100/50 rounded-lg text-[10px] font-mono leading-normal text-slate-600">
                        <span className="font-bold text-indigo-750">Fórmula de Validação:</span>
                        <br />
                        Estoque CD [Coluna P] + Estoque Filial [Coluna W] <strong className="text-indigo-850">≥ 30</strong>
                        <br />
                        <span className="text-slate-450 font-sans italic">Produtos abaixo de 30 unidades de estoque serão descartados.</span>
                      </div>
                      <p>
                        <strong className="text-slate-800">5. Código de Barra:</strong> 
                        <br />
                        Gerado automaticamente no formato <span className="font-mono bg-emerald-50 text-emerald-800 px-1 py-0.5 rounded font-bold border border-emerald-200/40">00 + ADM</span>.
                      </p>
                    </div>
                  </div>
                </div>

                {csvError && (
                  <div className="p-3 bg-red-50 border border-red-155 text-red-700 rounded text-[11px] leading-relaxed flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span className="whitespace-pre-line font-bold">{csvError}</span>
                  </div>
                )}

                {csvSuccess && (
                  <div className="p-4 bg-emerald-50 border border-emerald-150 text-emerald-800 rounded-lg text-xs leading-relaxed flex items-start gap-2.5">
                    <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-bold text-emerald-950">Sucesso na Processamento!</p>
                      <p className="whitespace-pre-line text-[11px] font-medium font-sans leading-relaxed text-emerald-800">{csvSuccess}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* List of active spreadsheet checklists */}
          <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-xs space-y-4 text-xs font-semibold max-w-4xl mx-auto">
            <h4 className="font-display text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-1.5">
              <FileSpreadsheet className="w-4 h-4 text-[#0A1D37]" />
              Checklists Mensais de Auditoria Importados ({conferenciasImportadas.length})
            </h4>

            {conferenciasImportadas.length === 0 ? (
              <p className="text-center italic text-slate-400 py-4 font-medium">Nenhuma planilha de auditoria carregada no momento.</p>
            ) : (
              <div className="border border-slate-150 rounded-lg overflow-hidden bg-white">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-[#0A1D37] text-white font-sans text-[10px] uppercase border-b border-slate-200">
                    <tr>
                      <th className="p-3">Mês/Ano</th>
                      <th className="p-3">Filial / Loja</th>
                      <th className="p-3 text-center">Itens Planilha</th>
                      <th className="p-3 text-center">Progresso Conf.</th>
                      <th className="p-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150">
                    {conferenciasImportadas.map(c => {
                      const total = c.itens.length;
                      const verif = c.itens.filter(it => it.verificado).length;
                      const pct = total > 0 ? Math.round((verif / total) * 100) : 0;
                      return (
                        <tr key={c.id} className="hover:bg-slate-50/70">
                          <td className="p-3 font-mono font-bold text-slate-700">{c.competencia}</td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold text-[9.5px]">
                              {c.loja === 'GLOBAL' ? 'TODAS AS LOJAS (GERAL)' : c.loja}
                            </span>
                          </td>
                          <td className="p-3 text-center font-bold text-slate-900">{total} produtos</td>
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <span className="font-mono text-[10px] font-bold text-slate-650">{verif}/{total} ({pct}%)</span>
                              <div className="w-20 bg-slate-100 h-1.5 rounded-full overflow-hidden inline-block shrink-0">
                                <div className="bg-emerald-500 h-full" style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                          </td>
                          <td className="p-3 text-right">
                            {currentUser.perfil === 'Admin' ? (
                              <button
                                type="button"
                                onClick={() => handleDeleteChecklist(c.id, c.loja)}
                                className="text-red-500 hover:text-red-700 font-bold hover:underline cursor-pointer inline-flex items-center gap-1"
                              >
                                <Trash2 className="w-3.5 h-3.5" /> Excluir
                              </button>
                            ) : (
                              <span className="text-slate-400 font-medium italic">Somente Admin</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
