/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserProfile = 'Admin' | 'Controlador' | 'Separador' | 'Gerente' | 'Gestor' | 'Conferente';

export interface User {
  id: string;
  nome: string;
  email: string;
  perfil: UserProfile;
  cargo: string;
  setor: string;
  loja: string;
  ativo: boolean;
  createdAt: string;
  updatedAt: string;
  lastLogin?: string;
}

export interface Amostra {
  id: string;
  codigoAdm: string;
  codigoOriginal?: string;
  descricao: string;
  marca: string;
  categoria: string;
  tamanho: string;
  colecao: string;
  unidade: string;
  saldoAtual: number;
  estoqueMinimo: number;
  localizacaoCd: string;
  status: 'ativo' | 'inativo' | 'pendente' | 'avariado';
  fotoUrl?: string;
  observacoes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MovimentacaoEstoque {
  id: string;
  amostraId: string;
  codigoAdm: string;
  produtoNome: string;
  marca: string;
  tipo: 'entrada' | 'saída' | 'ajuste' | 'avaria' | 'devolução';
  quantidade: number;
  saldoAnterior: number;
  saldoNovo: number;
  lojaDestino?: string;
  solicitacaoId?: string;
  protocoloId?: string;
  verbaCompra?: string;
  responsavelId: string;
  responsavelNome: string;
  observacoes?: string;
  createdAt: string;
}

export interface SolicitacaoItem {
  id: string;
  amostraId: string;
  codigoAdm: string;
  descricao: string;
  marca: string;
  quantidadeSolicitada: number;
  quantidadeSeparada: number;
  quantidadeRecebida: number;
  origem: 'Estoque da empresa' | 'Envio direto da fábrica sem custo';
  verbaCompra?: string;
  status: 'pendente' | 'separado' | 'recebido' | 'divergente' | 'avariado';
  observacoes?: string;
}

export interface Solicitacao {
  id: string;
  numero: string; // Automatic number (e.g., SOL-2026-001)
  dataSolicitacao: string;
  solicitanteId: string;
  solicitanteNome: string;
  prioridade: 'baixa' | 'normal' | 'alta' | 'urgente';
  lojaOrigem?: string;
  placaVeiculo?: string;
  nomeMotorista?: string;
  lojasDestino: string[]; // List of stores
  responsaveisRecebimento: Record<string, string>; // Store -> Responsável
  status: 
    | 'Rascunho'
    | 'Aguardando liberação'
    | 'Liberada para separação'
    | 'Em separação'
    | 'Separada'
    | 'Enviada'
    | 'Recebida parcialmente'
    | 'Recebida'
    | 'Exposição pendente'
    | 'Exposição comprovada'
    | 'Concluída'
    | 'Cancelada'
    | 'Com divergência';
  observacoes?: string;
  itens: SolicitacaoItem[];
  createdAt: string;
  updatedAt: string;
}

export interface ProtocoloEnvio {
  id: string;
  numero: string; // PRT-XXXX
  solicitacaoId: string;
  solicitacaoNumero: string;
  lojaDestino: string;
  responsavelSeparacao: string;
  responsavelRecebimento: string;
  nomeMotorista?: string;
  placaVeiculo?: string;
  dataEnvio: string;
  itens: {
    codigoAdm: string;
    descricao: string;
    marca: string;
    quantidade: number;
  }[];
  observacoes?: string;
  createdAt: string;
}

export interface Recebimento {
  id: string;
  solicitacaoId: string;
  solicitacaoNumero: string;
  loja: string;
  gerenteId: string;
  gerenteNome: string;
  status: 'Recebida' | 'Recebida parcialmente' | 'Com divergência';
  itens: {
    amostraId: string;
    codigoAdm: string;
    descricao: string;
    quantidadeSolicitada: number;
    quantidadeRecebida: number;
    divergencia?: boolean;
    avaria?: boolean;
    motivoDivergencia?: string;
  }[];
  fotos: string[]; // Base64 of photos taken
  observacoes?: string;
  createdAt: string;
}

export interface Exposicao {
  id: string;
  solicitacaoId: string;
  solicitacaoNumero: string;
  amostraId: string;
  codigoAdm: string;
  descricao: string;
  loja: string;
  produtoExposto: 'sim' | 'não';
  localExposicao: string;
  integridadeFisica: boolean;
  limpezaConservacao: boolean;
  identificacaoCorreta: boolean;
  localizacaoAdequada: boolean;
  fotos: string[]; // Base64 of physical proof photos
  status: 'Exposição pendente' | 'Exposição comprovada' | 'Exposição recusada' | 'Pendente de correção';
  observacoes?: string;
  validadoPor?: string;
  validatedAt?: string;
  createdAt: string;
}

export interface ConferenciaMensalItem {
  codigoAdm: string;
  descricao: string;
  marca: string;
  statusExposicao: 'Exposto corretamente' | 'Não exposto' | 'Avariado' | 'Pendente de reposição' | 'Produto inexistente' | 'Exposição inadequada';
  integridadeFisica: boolean;
  limpeza: boolean;
  conservacao: boolean;
  identificacaoCorreta: boolean;
  localizacaoAdequada: boolean;
  observacoes?: string;
  fotos: string[];
  codigoBarras?: string;
  verificado?: boolean;
  verificadoEm?: string;
  estoque?: number;
  naoEncontrado?: boolean;
  avariado?: boolean;
  fotoUrl?: string;
}

export interface ConferenciaMensal {
  id: string;
  competencia: string; // e.g. "05/2026"
  loja: string;
  gerenteLoja: string;
  gerenteOperacional: string;
  status: 'Pendente' | 'Respondida' | 'Analisada';
  prazoResposta: string; // Limit date
  itens: ConferenciaMensalItem[];
  fotos: string[];
  observacoes?: string;
  enviadoEm?: string; // date first opened/published
  respondidoEm?: string; // date store replied
  analisadoEm?: string; // date checked by admin
}

export interface Avaria {
  id: string;
  amostraId: string;
  codigoAdm: string;
  descricao: string;
  marca: string;
  quantidade: number;
  local: 'CD' | 'Loja';
  loja?: string;
  responsavelId: string;
  responsavelNome: string;
  descricaoAvaria: string;
  fotos: string[];
  status: 'Registrada' | 'Em análise' | 'Aprovada para baixa' | 'Reposição solicitada' | 'Resolvida';
  observacoes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Pendencia {
  id: string;
  tipo: 
    | 'Falta de amostra'
    | 'Divergência de quantidade'
    | 'Produto avariado'
    | 'Produto não exposto'
    | 'Exposição sem foto'
    | 'Exposição inadequada'
    | 'Produto recebido parcialmente'
    | 'Estoque insuficiente'
    | 'Ausência de verba de compra'
    | 'Produto sem identificação'
    | 'Divergência de conferência mensal';
  origem: string; // e.g. "Solicitação SOL-2026-001" or "Conferência 05/2026"
  loja: string;
  amostraId?: string;
  codigoAdm: string;
  responsavel: string;
  prazo: string;
  status: 'Aberta' | 'Em análise' | 'Aguardando loja' | 'Aguardando CD' | 'Aguardando compras' | 'Resolvida' | 'Cancelada';
  observacoes?: string;
  fotos: string[];
  historico: {
    data: string;
    usuario: string;
    comentario: string;
  }[];
  detalhes?: {
    produtoNome: string;
    codigoAdm: string;
    operadorResponsavel: string;
    quantidadeSolicitada: number;
    quantidadeSeparada: number;
    quantidadeRecebida: number;
    justificativaOperador: string;
  };
  timeline?: {
    responsavelNome: string;
    perfil: string;
    mensagem: string;
    dataInteracao: string;
  }[];
  createdAt: string;
  updatedAt: string;
}

export interface LogAuditoria {
  id: string;
  usuarioId: string;
  usuarioNome: string;
  acao: string; // e.g. "Criação de Amostra", "Confirmação de Baixa"
  modulo: string; // e.g., "Amostras", "Solicitações", "Estoque"
  registroId: string;
  valorAnterior?: string;
  valorNovo?: string;
  observacao?: string;
  createdAt: string;
}

export interface CustomPendingEntry {
  id: string;
  amostraId: string;
  codigoAdm: string;
  codigoOriginal: string;
  descricao: string;
  marca: string;
  tipoFluxo: string;
  quantidade: number;
  verbaCompra?: string;
  observacoes?: string;
  status: string;
  criadoEm: string;
  criadoPorId: string;
  criadoPorNome: string;
}

