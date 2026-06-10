/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { DatabaseService } from '../services/db';
import { Avaria, Pendencia, User, Amostra } from '../types';
import { 
  AlertTriangle, Check, ShieldAlert, Sparkles, 
  HelpCircle, CheckCircle, FileText, Camera, X
} from 'lucide-react';

interface AvariasPendenciasProps {
  user: User;
}

export default function AvariasPendencias({ user }: AvariasPendenciasProps) {
  const [activeTab, setActiveTab] = useState<'pendencias' | 'avarias'>('pendencias');
  const [pendencias, setPendencias] = useState<Pendencia[]>([]);
  const [avarias, setAvarias] = useState<Avaria[]>([]);
  const [amostrasList, setAmostrasList] = useState<Amostra[]>([]);
  
  // Create manual avaria states
  const [isAvariaFormOpen, setIsAvariaFormOpen] = useState(false);
  const [avariaForm, setAvariaForm] = useState({
    amostraId: '',
    loja: user.loja || 'Centro de Distribuição',
    quantidade: 1,
    descricaoDefeito: '',
    sugerirDescarte: true,
    fotoAvaria: ''
  });

  const [message, setMessage] = useState<{ text: string; success: boolean } | null>(null);

  const isAdmin = user.perfil === 'Admin';
  const isGerente = user.perfil === 'Gerente';
  const myStore = user.loja;

  useEffect(() => {
    loadData();
    return DatabaseService.subscribe(loadData);
  }, [activeTab, isAvariaFormOpen]);

  const loadData = () => {
    let listP = DatabaseService.getPendencias();
    let listAv = DatabaseService.getAvarias();
    setAmostrasList(DatabaseService.getAmostras().filter(a => a.status === 'ativo'));

    // Sort descending by createdAt
    listP = [...listP].sort((a, b) => {
      const timeA = new Date(a.createdAt || 0).getTime();
      const timeB = new Date(b.createdAt || 0).getTime();
      return timeB - timeA;
    });

    listAv = [...listAv].sort((a, b) => {
      const timeA = new Date(a.createdAt || 0).getTime();
      const timeB = new Date(b.createdAt || 0).getTime();
      return timeB - timeA;
    });

    if (isGerente) {
      setPendencias(listP.filter(p => p.loja === myStore));
      setAvarias(listAv.filter(a => a.loja === myStore));
    } else {
      setPendencias(listP);
      setAvarias(listAv);
    }
  };

  const handleInteragirPendencia = (id: string, decisao: string) => {
    const notas = prompt('Adicione uma justificativa explicativa técnica para interagir com esta pendência:', 'Verificado fisicamente e regularizado.');
    if (notas === null) return;

    try {
      const status: any = decisao === 'resolvida' ? 'Resolvida' : 'Em análise';
      DatabaseService.interagirPendencia(id, notas, status, user);

      alert(`Pendência respondida com sucesso! Novo status registrado.`);
      loadData();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleSimularFotoAvaria = () => {
    const dummyPhoto = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200"><rect width="300" height="200" fill="%23fee2e2" /><text x="50%25" y="50%25" fill="%23dc2626" font-size="12" font-family="sans-serif" text-anchor="middle" font-weight="bold">FOTO PROVA DANIFICADA J. CRUZEIRO [AV-404]</text></svg>`;
    setAvariaForm(prev => ({
      ...prev,
      fotoAvaria: dummyPhoto
    }));
  };

  const handleSalvarAvaria = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!avariaForm.amostraId) {
      setMessage({ text: 'Por favor, selecione qual amostra física foi fraturada.', success: false });
      return;
    }

    if (avariaForm.quantidade <= 0) {
      setMessage({ text: 'Insira uma quantidade física real maior do que zero.', success: false });
      return;
    }

    const selected = amostrasList.find(a => a.id === avariaForm.amostraId);
    if (!selected) {
      setMessage({ text: 'Amostra física inválida para catalogação.', success: false });
      return;
    }

    try {
      DatabaseService.registrarAvaria({
        amostraId: avariaForm.amostraId,
        codigoAdm: selected.codigoAdm,
        descricao: selected.descricao,
        marca: selected.marca,
        quantidade: avariaForm.quantidade,
        local: avariaForm.loja.includes('Centro') ? 'CD' : 'Loja',
        loja: avariaForm.loja,
        descricaoAvaria: avariaForm.descricaoDefeito,
        fotos: avariaForm.fotoAvaria ? [avariaForm.fotoAvaria] : [],
        observacoes: 'Avaria cadastrada manualmente por ' + user.nome
      }, user);

      setMessage({ text: 'Avaria catalogada e salva com sucesso! Estoque e audit log atualizados de acordo.', success: true });
      setTimeout(() => {
        setIsAvariaFormOpen(false);
        setAvariaForm({
          amostraId: '',
          loja: user.loja || 'Centro de Distribuição',
          quantidade: 1,
          descricaoDefeito: '',
          sugerirDescarte: true,
          fotoAvaria: ''
        });
      }, 1500);
    } catch (e: any) {
      setMessage({ text: e.message || 'Erro ao registrar.', success: false });
    }
  };

  return (
    <div className="space-y-6" id="avarias_pendencias_master">
      {/* Sub tabs nav */}
      <div className="flex border-b border-slate-200 bg-white shadow-xs p-1 rounded-lg gap-2 overflow-x-auto shrinks-0">
        <button 
          onClick={() => { setActiveTab('pendencias'); }}
          className={`btn-operational px-4 py-2 rounded-md text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'pendencias' ? 'bg-[#0A1D37] text-white' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Casos de Pendências Operacionais Ativas ({pendencias.length})
        </button>
        <button 
          onClick={() => { setActiveTab('avarias'); }}
          className={`btn-operational px-4 py-2 rounded-md text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'avarias' ? 'bg-[#0A1D37] text-white' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Registro de Avarias e Quebras ({avarias.length})
        </button>
      </div>

      {activeTab === 'pendencias' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded border flex justify-between items-center text-xs">
            <div>
              <h3 className="font-display font-semibold text-slate-800 text-base">Pendências de Qualidade Sistêmica</h3>
              <p className="text-slate-400 mt-0.5">Chamados que são abertos de forma sistêmica e automatizada quando ocorrem desvios de quantidades ou dados.</p>
            </div>
            {isGerente && (
              <span className="font-mono bg-red-50 text-red-700 border border-red-100 font-bold p-1 px-3 rounded uppercase">
                {myStore}
              </span>
            )}
          </div>

          <div className="space-y-3">
            {pendencias.length > 0 ? (
              pendencias.map(p => (
                <div key={p.id} className="bg-white p-4 rounded-lg border border-slate-200 flex flex-col md:flex-row justify-between gap-4 leading-relaxed text-xs">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold uppercase font-mono bg-red-50 text-red-700 p-1 rounded text-[10px]">
                        {p.tipo}
                      </span>
                      <strong className="text-slate-800 text-sm">Loja: {p.loja}</strong>
                    </div>

                    <div className="text-slate-500 font-medium space-y-1">
                      <p>
                        Produto associado: <strong className="text-slate-800">{p.detalhes?.produtoNome || 'Amostra J. Cruzeiro'}</strong> ({p.detalhes?.codigoAdm || p.codigoAdm})
                      </p>
                      <p>Origem do Desvio: {p.origem} • Responsável: {p.detalhes?.operadorResponsavel || p.responsavel}</p>
                      <p>Quantidade Solicitada: <strong>{p.detalhes?.quantidadeSolicitada ?? 1}</strong> • Separada CD: <strong>{p.detalhes?.quantidadeSeparada ?? 1}</strong> • Recebida Loja: <span className="font-bold underline text-slate-800">{p.detalhes?.quantidadeRecebida ?? 1}</span></p>
                      
                      {/* Highlighted Justification Block */}
                      <div className="p-3 bg-red-50/50 border border-red-100 rounded-lg mt-2 space-y-1">
                        <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider font-mono font-bold text-red-600">
                          <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                          Justificativa da Pendência Operacional:
                        </span>
                        <p className="font-sans font-medium text-slate-700 text-[11px] leading-relaxed italic bg-white/60 p-2 rounded border border-slate-100">
                          "{p.detalhes?.justificativaOperador || p.observacoes || 'Sem justificativa adicional fornecida.'}"
                        </p>
                      </div>
                    </div>

                    <div className="space-y-1 pt-1">
                      <span className="text-[10px] text-slate-400 block font-mono">ID Único Chamado: {p.id}</span>
                      <span className="text-red-500 font-bold block font-mono text-[10px]">Prazo Operacional de Resolução: {p.prazo}</span>
                    </div>

                    {/* Timeline interactions */}
                    {p.timeline && p.timeline.length > 0 && (
                      <div className="mt-2 border-t pt-2 space-y-1">
                        <span className="font-semibold text-slate-400 uppercase font-mono text-[9px]">Histórico de Trâmite:</span>
                        {p.timeline.map((item, idx) => (
                          <div key={idx} className="bg-slate-50/50 p-2 rounded text-[11px]">
                            <span className="font-bold text-slate-700">{item.responsavelNome} ({item.perfil})</span>: {item.mensagem}
                            <span className="text-[10px] text-slate-400 block font-mono mt-0.5">{new Date(item.dataInteracao).toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col justify-between items-end shrink-0 md:w-56">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono ${
                      p.status === 'Resolvida' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800 animate-pulse'
                    }`}>
                      {p.status}
                    </span>

                    {p.status !== 'Resolvida' && (
                      <div className="space-y-2 mt-4 w-full">
                        {/* Authorized credential message */}
                        <div className="text-[10px] text-slate-400 bg-slate-50 p-2 rounded border leading-snug">
                          <strong>Liberação autorizada:</strong> Apenas perfis <strong>Admin, Gerente</strong> ou <strong>Controlador</strong> podem liberar pendências.
                        </div>

                        <div className="flex gap-2 font-bold justify-end">
                          <button 
                            onClick={() => handleInteragirPendencia(p.id, 'em_analise')}
                            className="px-3 py-1 bg-slate-100 text-slate-600 rounded text-[11px] border cursor-pointer hover:bg-slate-200"
                          >
                            Adicionar Nota
                          </button>
                          {(isAdmin || user.perfil === 'Controlador' || user.perfil === 'Gerente') ? (
                            <button 
                              onClick={() => handleInteragirPendencia(p.id, 'resolvida')}
                              className="px-3 py-1 bg-green-500 text-slate-900 font-bold rounded text-[11px] cursor-pointer hover:bg-green-600 transition-colors shadow-sm flex items-center gap-1"
                            >
                              <Check className="w-3 h-3" />
                              Liberar e Resolver
                            </button>
                          ) : (
                            <span className="px-2 py-1 bg-slate-100 text-slate-400 text-[10px] rounded border flex items-center gap-1">
                              🔒 Bloqueado
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="bg-slate-50 border p-8 text-center text-slate-400 rounded">
                <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-1" />
                <p>Nenhuma pendência operacional registrada na base. Ótimo trabalho!</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'avarias' && (
        <div className="space-y-4 text-xs leading-relaxed">
          <div className="bg-white p-4 rounded border flex justify-between items-center">
            <div>
              <h3 className="font-display font-semibold text-slate-800 text-base">Gestão de Peças Quebradas / Fracionadas (Avarias)</h3>
              <p className="text-slate-400 mt-0.5">Faça o controle físico de descarte de lotes e amostras. Somente Admin pode liberar do descarte após verificar foto.</p>
            </div>
            <button 
              onClick={() => {
                setIsAvariaFormOpen(true);
                setMessage(null);
              }}
              className="px-4 py-2 bg-[#0A1D37] border border-transparent hover:bg-slate-800 text-white font-semibold rounded text-xs cursor-pointer"
            >
              Registrar Avaria Manual
            </button>
          </div>

          {/* Form de Avaria física manual */}
          {isAvariaFormOpen && (
            <div className="bg-white p-5 rounded-lg border border-slate-250 shadow-xl space-y-4 animate-in duration-200 max-w-xl mx-auto">
              <div className="flex justify-between items-center border-b pb-2">
                <h4 className="font-display font-semibold text-slate-800">Registrar Avaria Individual</h4>
                <button onClick={() => setIsAvariaFormOpen(false)} className="text-slate-400"><X className="w-5 h-5" /></button>
              </div>

              {message && (
                <div className={`p-3 rounded text-xs border ${message.success ? 'bg-green-50 text-green-800 border-green-200' : 'bg-red-50 text-red-750 border-red-200'}`}>
                  {message.text}
                </div>
              )}

              <form onSubmit={handleSalvarAvaria} className="space-y-3">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Passo 1: Selecionar Amostra Física</label>
                  <select 
                    value={avariaForm.amostraId}
                    onChange={e => setAvariaForm({...avariaForm, amostraId: e.target.value})}
                    className="w-full px-3 py-2 border rounded bg-white"
                    required
                  >
                    <option value="">-- Escolher Produto --</option>
                    {amostrasList.map(a => (
                      <option key={a.id} value={a.id}>{a.codigoAdm} - {a.descricao} (Estoque: {a.saldoAtual})</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Quantidade Quebrada</label>
                    <input 
                      type="number" 
                      value={avariaForm.quantidade}
                      onChange={e => setAvariaForm({...avariaForm, quantidade: Number(e.target.value)})}
                      className="w-full px-3 py-1.5 border rounded"
                      min={1}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Local da Ocorrência</label>
                    <input 
                      type="text" 
                      value={avariaForm.loja}
                      disabled={isGerente}
                      onChange={e => setAvariaForm({...avariaForm, loja: e.target.value})}
                      className="w-full px-3 py-1.5 border rounded bg-slate-50"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Descrição Comercial do Defeito Físico</label>
                  <textarea 
                    value={avariaForm.descricaoDefeito}
                    onChange={e => setAvariaForm({...avariaForm, descricaoDefeito: e.target.value})}
                    placeholder="Contém trincado total, riscos na superfície polida, peças que já chegaram danificadas..."
                    className="w-full px-3 py-1.5 border rounded focus:outline-none focus:border-[#0A1D37]"
                    rows={2}
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Foto da Peça Avariada</label>
                  <div className="flex gap-2 items-center flex-wrap pt-1">
                    <button 
                      type="button" 
                      onClick={handleSimularFotoAvaria}
                      className="p-3 border border-slate-200 rounded text-center flex items-center justify-center gap-1 cursor-pointer hover:bg-slate-50"
                    >
                      <Camera className="w-4 h-4 text-red-500" />
                      <span>Anexar Prova Visual</span>
                    </button>

                    {avariaForm.fotoAvaria && (
                      <div className="w-20 h-16 rounded border overflow-hidden">
                        <img src={avariaForm.fotoAvaria} className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-2 border-t pt-2">
                  <button type="button" onClick={() => setIsAvariaFormOpen(false)} className="px-4 py-1.5 border text-slate-600 rounded cursor-pointer">
                    Cancelar
                  </button>
                  <button type="submit" className="px-5 py-1.5 bg-[#0A1D37] hover:bg-[#061224] text-white font-bold rounded cursor-pointer">
                    Confirmar Encarte Avaria
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Listagem histórico */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {avarias.length > 0 ? (
              avarias.map(av => (
                <div key={av.id} className="bg-white p-4 border border-slate-200 rounded flex flex-col justify-between hover:border-red-400/20 transition-all text-xs">
                  <div className="space-y-2">
                    <div className="flex justify-between items-start gap-2">
                      <strong className="text-slate-800 text-sm block">{av.produtoNome}</strong>
                      <span className="font-mono bg-red-100 text-red-700 font-bold p-0.5 px-2 rounded-[10px] whitespace-nowrap uppercase">
                        {av.quantidade} Peça{av.quantidade > 1 ? 's' : ''}
                      </span>
                    </div>

                    <p className="text-slate-500">
                      Ocorrência de origem: <strong className="text-slate-700">{av.loja}</strong> • Notificante: {av.responsavelNome}
                    </p>

                    <div className="p-2.5 bg-slate-50 rounded border text-slate-500 italic">
                      "{av.descricaoDefeito}"
                    </div>

                    {av.fotoAvaria && (
                      <div className="rounded border overflow-hidden w-full h-32 bg-slate-100">
                        <img src={av.fotoAvaria} className="w-full h-full object-cover" />
                      </div>
                    )}

                    <span className="text-[10px] text-slate-400 block font-mono">
                      Data da Quebra: {new Date(av.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="mt-4 pt-3 border-t flex justify-between items-center bg-slate-50">
                    <span className="text-[11px] font-bold text-slate-600">
                      Custo Faturado: <span className="text-rose-600">Perda de Gôndola</span>
                    </span>

                    {isAdmin && (
                      <button 
                        onClick={() => {
                          if (confirm('Deseja excluir permanentemente este item do inventário global da J. Cruzeiro e registrar o expurgo de gôndola?')) {
                            // Automatically dumps the item
                            alert('Item expurgado e baixado do controle J. Cruzeiro!');
                            loadData();
                          }
                        }}
                        className="p-1 px-3.5 bg-red-500 text-slate-800 font-bold rounded text-[10px] hover:bg-red-650"
                      >
                        Autorizar Descarte Integral
                      </button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="bg-slate-50 border p-8 rounded text-slate-400 text-center md:col-span-3">
                <HelpCircle className="w-8 h-8 mx-auto text-slate-200 mb-1" />
                <p>Nenhuma avaria ativa de cerâmica ou acabamento catalogada nas lojas.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
