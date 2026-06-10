/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { DatabaseService } from '../services/db';
import { Amostra, User } from '../types';
import { 
  Plus, Search, Edit2, Trash2, Filter, 
  ChevronDown, AlertCircle, RefreshCw, X, Eye 
} from 'lucide-react';

interface AmostrasManagerProps {
  user: User;
}

export default function AmostrasManager({ user }: AmostrasManagerProps) {
  const [amostras, setAmostras] = useState<Amostra[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAmostra, setEditingAmostra] = useState<Amostra | null>(null);

  // Filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMarca, setFilterMarca] = useState('');
  const [filterCategoria, setFilterCategoria] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterLocalizacao, setFilterLocalizacao] = useState('');

  // Form Felder
  const [formData, setFormData] = useState({
    codigoAdm: '',
    codigoOriginal: '',
    descricao: '',
    marca: '',
    categoria: '',
    tamanho: '',
    colecao: '',
    unidade: 'Peça',
    saldoAtual: 5,
    estoqueMinimo: 3,
    localizacaoCd: '',
    status: 'ativo' as Amostra['status'],
    observacoes: '',
    fotoUrl: ''
  });

  const [formError, setFormError] = useState('');

  const canEdit = user.perfil === 'Admin' || user.perfil === 'Controlador';

  useEffect(() => {
    loadAmostras();
    return DatabaseService.subscribe(loadAmostras);
  }, []);

  const loadAmostras = () => {
    setAmostras(DatabaseService.getAmostras());
  };

  const handleOpenCreate = () => {
    setEditingAmostra(null);
    setFormData({
      codigoAdm: '',
      codigoOriginal: '',
      descricao: '',
      marca: '',
      categoria: 'Porcelanatos',
      tamanho: '',
      colecao: '',
      unidade: 'Peça',
      saldoAtual: 0,
      estoqueMinimo: 0,
      localizacaoCd: '',
      status: 'ativo',
      observacoes: '',
      fotoUrl: ''
    });
    setFormError('');
    setIsFormOpen(true);
  };

  const handleOpenEdit = (am: Amostra) => {
    setEditingAmostra(am);
    setFormData({
      codigoAdm: am.codigoAdm,
      codigoOriginal: am.codigoOriginal || '',
      descricao: am.descricao,
      marca: am.marca,
      categoria: am.categoria || 'Porcelanatos',
      tamanho: am.tamanho || '',
      colecao: am.colecao || '',
      unidade: 'Peça',
      saldoAtual: am.saldoAtual,
      estoqueMinimo: am.estoqueMinimo || 0,
      localizacaoCd: am.localizacaoCd || '',
      status: am.status || 'ativo',
      observacoes: am.observacoes || '',
      fotoUrl: am.fotoUrl || ''
    });
    setFormError('');
    setIsFormOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza de que deseja excluir permanentemente este cadastro de amostra? Essa ação é gravada nos logs de auditoria.')) {
      DatabaseService.deleteAmostra(id, user);
      loadAmostras();
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.codigoAdm || !formData.descricao || !formData.marca) {
      setFormError('Código ADM, Descrição do Produto e Marca são campos obrigatórios.');
      return;
    }

    try {
      if (editingAmostra) {
        DatabaseService.updateAmostra({
          ...editingAmostra,
          ...formData,
          unidade: 'Peça'
        }, user);
      } else {
        DatabaseService.createAmostra({
          ...formData,
          unidade: 'Peça',
          categoria: 'Porcelanatos',
          tamanho: '',
          colecao: '',
          estoqueMinimo: 0,
          saldoAtual: 0,
          localizacaoCd: '',
          status: 'ativo'
        }, user);
      }
      setIsFormOpen(false);
      loadAmostras();
    } catch (err: any) {
      setFormError(err.message || 'Erro ao gravar os dados.');
    }
  };

  // Filter logic
  const filteredAmostras = amostras.filter(a => {
    const matchesSearch = 
      a.codigoAdm.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.descricao.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesMarca = filterMarca ? a.marca === filterMarca : true;
    const matchesCategoria = filterCategoria ? a.categoria === filterCategoria : true;
    const matchesStatus = filterStatus ? a.status === filterStatus : true;
    const matchesLocalizacao = filterLocalizacao ? a.localizacaoCd.toLowerCase().includes(filterLocalizacao.toLowerCase()) : true;

    return matchesSearch && matchesMarca && matchesCategoria && matchesStatus && matchesLocalizacao;
  });

  // Unique values for filters select
  const uniqueMarcas = Array.from(new Set(amostras.map(a => a.marca)));
  const uniqueCategorias = Array.from(new Set(amostras.map(a => a.categoria)));

  return (
    <div className="space-y-6" id="amostras_panel">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-display font-bold text-slate-900">
            Cadastro de Amostras
          </h2>
          <p className="text-sm text-slate-500">
            Gerenciamento e controle do catálogo de amostras cadastradas no CD.
          </p>
        </div>
        
        {canEdit && (
          <button 
            onClick={handleOpenCreate} 
            className="btn-operational px-4 py-2 bg-[#0A1D37] hover:bg-slate-800 text-white font-semibold rounded-md flex items-center gap-2 cursor-pointer shadow-sm text-sm"
          >
            <Plus className="w-4 h-4" /> Novo Cadastro (ADM)
          </button>
        )}
      </div>

      {/* Grid de Busca & Filtros */}
      <div className="bg-white p-4 rounded-lg border border-slate-100 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
            <input 
              type="text" 
              placeholder="Buscar por código ADM ou descrição..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm focus:outline-none focus:border-[#0A1D37] focus:bg-white"
            />
          </div>

          <div className="shrink-0 min-w-[200px]">
            <select 
              value={filterMarca} 
              onChange={e => setFilterMarca(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm focus:outline-none focus:border-[#0A1D37]"
            >
              <option value="">Todas as Marcas</option>
              {uniqueMarcas.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>

        {/* Linha secundária de filtros */}
        <div className="flex flex-wrap items-center justify-end gap-4 pt-2 border-t border-slate-100">
          <button 
            onClick={() => {
              setSearchTerm(''); setFilterMarca(''); setFilterCategoria('');
              setFilterStatus(''); setFilterLocalizacao('');
            }}
            className="text-slate-400 hover:text-[#0A1D37] text-xs font-semibold flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" /> Limpar filtros
          </button>
        </div>
      </div>

      {/* Grid de Amostras */}
      <div className="bg-white rounded-lg border border-slate-100 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-400 text-[10px] uppercase font-mono tracking-wider border-b border-slate-100">
                <th className="p-4 font-bold">Código ADM</th>
                <th className="p-4 font-bold">Descrição / Marca</th>
                {canEdit && <th className="p-4 font-bold text-right">Ação</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredAmostras.length > 0 ? (
                filteredAmostras.map(a => {
                  return (
                    <tr key={a.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 font-mono font-bold text-slate-800">{a.codigoAdm}</td>
                      <td className="p-4 leading-relaxed">
                        <span className="font-semibold text-slate-800 block text-xs">{a.descricao}</span>
                        <span className="text-slate-400 text-[11px] block mt-0.5">{a.marca} • {a.categoria}</span>
                      </td>
                      {canEdit && (
                        <td className="p-4 text-right whitespace-nowrap">
                          <div className="flex justify-end gap-1">
                            <button 
                              onClick={() => handleOpenEdit(a)} 
                              className="p-1.5 text-slate-500 hover:text-[#0A1D37] hover:bg-slate-100 rounded transition-all cursor-pointer"
                              title="Editar"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleDelete(a.id)} 
                              className="p-1.5 text-slate-500 hover:text-red-500 hover:bg-red-50 rounded transition-all"
                              title="Excluir"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={canEdit ? 3 : 2} className="p-8 text-center text-slate-400">
                    <AlertCircle className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                    <p className="text-sm">Nenhuma amostra localizada com os filtros selecionados.</p>
                    <p className="text-xs text-slate-400">Dica: remova os filtros de status ou saldo para expandir a busca.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Cadastro / Edição */}
      {isFormOpen && (
        <div 
          onClick={() => setIsFormOpen(false)}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 cursor-pointer"
        >
          <div 
            onClick={e => e.stopPropagation()}
            className="bg-white rounded-lg border border-slate-200 shadow-xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 cursor-default"
          >
            <div className="bg-slate-50 text-[#0A1D37] p-4 flex justify-between items-center border-b border-slate-200">
              <h3 className="font-display font-bold text-[#0A1D37]">
                {editingAmostra ? `Editar Amostra - ${formData.codigoAdm}` : 'Cadastrar Nova Amostra'}
              </h3>
              <button 
                onClick={() => setIsFormOpen(false)} 
                className="text-slate-500 hover:text-[#0A1D37] flex items-center gap-1 text-xs font-semibold px-2.5 py-1 hover:bg-slate-100 rounded transition cursor-pointer"
              >
                <X className="w-4 h-4" /> Voltar
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-md">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Código ADM</label>
                  <input 
                    type="text" 
                    value={formData.codigoAdm}
                    onChange={e => setFormData({...formData, codigoAdm: e.target.value})}
                    placeholder="Ex: ADM-POR-8001"
                    className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:border-[#0A1D37]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Código Original</label>
                  <input 
                    type="text" 
                    value={formData.codigoOriginal}
                    onChange={e => setFormData({...formData, codigoOriginal: e.target.value})}
                    placeholder="Ex: ELIZ-84-POL-CALACATA"
                    className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:border-[#0A1D37]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Marca / Fornecedor</label>
                  <input 
                    type="text" 
                    value={formData.marca}
                    onChange={e => setFormData({...formData, marca: e.target.value})}
                    placeholder="Inserir o nome exatamente igual ao cadastro do ADM (Você pode copiar no ADM e colar aqui)."
                    className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:border-[#0A1D37]"
                    required
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Descrição do Produto</label>
                  <input 
                    type="text" 
                    value={formData.descricao}
                    onChange={e => setFormData({...formData, descricao: e.target.value})}
                    placeholder="Inserir o nome exatamente igual ao cadastro do ADM (Você pode copiar no ADM e colar aqui)."
                    className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:border-[#0A1D37]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Unidade</label>
                  <input 
                    type="text" 
                    value="Peça" 
                    disabled 
                    className="w-full px-3 py-2 border border-slate-200 bg-slate-100 rounded-md text-sm text-slate-500 font-semibold cursor-not-allowed"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Observações adicionais</label>
                  <textarea 
                    value={formData.observacoes}
                    onChange={e => setFormData({...formData, observacoes: e.target.value})}
                    placeholder="Informações adicionais para a equipe de separação física ou gerência..."
                    rows={2}
                    className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:border-[#0A1D37]"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
                <button 
                  type="button" 
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-md text-sm hover:bg-slate-50 font-medium btn-operational cursor-pointer"
                >
                  Voltar / Cancelar
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-[#0A1D37] hover:bg-slate-800 text-white font-semibold rounded-md text-sm btn-operational cursor-pointer"
                >
                  Salvar Informações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
