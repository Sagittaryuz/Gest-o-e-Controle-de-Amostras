/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  User, 
  Amostra, 
  MovimentacaoEstoque, 
  Solicitacao, 
  SolicitacaoItem,
  ProtocoloEnvio, 
  Recebimento, 
  Exposicao, 
  ConferenciaMensal, 
  ConferenciaMensalItem,
  Avaria, 
  Pendencia, 
  LogAuditoria,
  UserProfile,
  CustomPendingEntry
} from '../types';

import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  getDocFromServer,
  getDocs
} from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';
import { db, auth, OperationType, handleFirestoreError } from './firebase';

// Seeding Initial Realistic Data

const INITIAL_USERS: User[] = [
  {
    id: 'user_guilherme',
    nome: 'Guilherme Admin',
    email: 'guilherme@jcruzeiro.com',
    perfil: 'Admin',
    cargo: 'Gerente Geral de Operações',
    setor: 'Administração',
    loja: 'MATRIZ',
    ativo: true,
    createdAt: '2026-01-10T08:00:00Z',
    updatedAt: '2026-05-29T10:00:00Z',
    lastLogin: '2026-05-29T11:00:00Z'
  },
  {
    id: 'user_ivan',
    nome: 'Ivan Controlador',
    email: 'ivan@jcruzeiro.com',
    perfil: 'Controlador',
    cargo: 'Coordenador de Compras/Demandas',
    setor: 'Compras / CD',
    loja: 'CD',
    ativo: true,
    createdAt: '2026-01-11T08:00:00Z',
    updatedAt: '2026-05-29T09:00:00Z',
    lastLogin: '2026-05-29T09:30:00Z'
  },
  {
    id: 'user_juliano',
    nome: 'Juliano Separador',
    email: 'juliano@jcruzeiro.com',
    perfil: 'Separador',
    cargo: 'Auxiliar de Logística (CD)',
    setor: 'Expedição / CD',
    loja: 'CD',
    ativo: true,
    createdAt: '2026-01-12T08:00:00Z',
    updatedAt: '2026-05-29T07:15:00Z',
    lastLogin: '2026-05-29T08:00:00Z'
  },
  {
    id: 'user_juliana',
    nome: 'Juliana Separadora',
    email: 'juliana@jcruzeiro.com',
    perfil: 'Separador',
    cargo: 'Auxiliar de Operações (CD)',
    setor: 'Expedição / CD',
    loja: 'CD',
    ativo: true,
    createdAt: '2026-01-12T09:00:00Z',
    updatedAt: '2026-05-28T17:00:00Z',
    lastLogin: '2026-05-28T17:30:00Z'
  },
  {
    id: 'user_gestor_catedral',
    nome: 'Gestor Catedral',
    email: 'gestor.catedral@jcruzeiro.com',
    perfil: 'Gestor',
    cargo: 'Gestor Operacional',
    setor: 'Recepção / PDV',
    loja: 'CATEDRAL',
    ativo: true,
    createdAt: '2026-06-09T08:00:00Z',
    updatedAt: '2026-06-09T08:00:00Z'
  },
  {
    id: 'user_roberto_conferente',
    nome: 'Roberto Conferente',
    email: 'roberto.conferente@jcruzeiro.com',
    perfil: 'Conferente',
    cargo: 'Conferente de Showroom',
    setor: 'Auditoria Física',
    loja: 'MATRIZ',
    ativo: true,
    createdAt: '2026-06-09T08:00:00Z',
    updatedAt: '2026-06-09T08:00:00Z'
  },
  {
    id: 'user_gerente_op',
    nome: 'Gerente Matriz',
    email: 'gerente.op@jcruzeiro.com',
    perfil: 'Gerente',
    cargo: 'OPERADOR DE LOJA',
    setor: 'Varejo',
    loja: 'MATRIZ',
    ativo: true,
    createdAt: '2026-01-15T08:00:00Z',
    updatedAt: '2026-05-29T08:30:00Z',
    lastLogin: '2026-05-29T08:45:00Z'
  },
  {
    id: 'user_gerente_loja',
    nome: 'Gerente Catedral',
    email: 'gerente.loja@jcruzeiro.com',
    perfil: 'Gerente',
    cargo: 'OPERADOR DE LOJA',
    setor: 'Varejo',
    loja: 'CATEDRAL',
    ativo: true,
    createdAt: '2026-01-16T08:00:00Z',
    updatedAt: '2026-05-29T09:15:00Z',
    lastLogin: '2026-05-29T09:20:00Z'
  },
  {
    id: 'user_gerente_cd',
    nome: 'Gerente CD',
    email: 'gerente.cd@jcruzeiro.com',
    perfil: 'Gerente',
    cargo: 'OPERADOR DE LOJA',
    setor: 'Varejo',
    loja: 'CD',
    ativo: true,
    createdAt: '2026-01-17T08:00:00Z',
    updatedAt: '2026-05-29T09:15:00Z',
    lastLogin: '2026-05-29T09:20:00Z'
  },
  {
    id: 'user_gerente_mineiros',
    nome: 'Gerente Mineiros',
    email: 'gerente.mineiros@jcruzeiro.com',
    perfil: 'Gerente',
    cargo: 'OPERADOR DE LOJA',
    setor: 'Varejo',
    loja: 'MINEIROS',
    ativo: true,
    createdAt: '2026-01-18T08:00:00Z',
    updatedAt: '2026-05-29T09:15:00Z',
    lastLogin: '2026-05-29T09:20:00Z'
  },
  {
    id: 'user_gerente_rharo',
    nome: 'Gerente Rharo',
    email: 'gerente.rharo@jcruzeiro.com',
    perfil: 'Gerente',
    cargo: 'OPERADOR DE LOJA',
    setor: 'Varejo',
    loja: 'RHARO',
    ativo: true,
    createdAt: '2026-01-19T08:00:00Z',
    updatedAt: '2026-05-29T09:15:00Z',
    lastLogin: '2026-05-29T09:20:00Z'
  },
  {
    id: 'user_gerente_said',
    nome: 'Gerente Said Abdala',
    email: 'gerente.said@jcruzeiro.com',
    perfil: 'Gerente',
    cargo: 'OPERADOR DE LOJA',
    setor: 'Varejo',
    loja: 'SAID ABDALA',
    ativo: true,
    createdAt: '2026-01-20T08:00:00Z',
    updatedAt: '2026-05-29T09:15:00Z',
    lastLogin: '2026-05-29T09:20:00Z'
  },
  {
    id: 'user_op_matriz',
    nome: 'Operador Matriz',
    email: 'operador.matriz@jcruzeiro.com',
    perfil: 'Gerente',
    cargo: 'OPERADOR DE LOJA',
    setor: 'Varejo',
    loja: 'MATRIZ',
    ativo: true,
    createdAt: '2026-06-04T18:00:00Z',
    updatedAt: '2026-06-04T18:00:00Z'
  },
  {
    id: 'user_op_catedral',
    nome: 'Operador Catedral',
    email: 'operador.catedral@jcruzeiro.com',
    perfil: 'Gerente',
    cargo: 'OPERADOR DE LOJA',
    setor: 'Varejo',
    loja: 'CATEDRAL',
    ativo: true,
    createdAt: '2026-06-04T18:00:00Z',
    updatedAt: '2026-06-04T18:00:00Z'
  },
  {
    id: 'user_op_mineiros',
    nome: 'Operador Mineiros',
    email: 'operador.mineiros@jcruzeiro.com',
    perfil: 'Gerente',
    cargo: 'OPERADOR DE LOJA',
    setor: 'Varejo',
    loja: 'MINEIROS',
    ativo: true,
    createdAt: '2026-06-04T18:00:00Z',
    updatedAt: '2026-06-04T18:00:00Z'
  },
  {
    id: 'user_op_rharo',
    nome: 'Operador Rharo',
    email: 'operador.rharo@jcruzeiro.com',
    perfil: 'Gerente',
    cargo: 'OPERADOR DE LOJA',
    setor: 'Varejo',
    loja: 'RHARO',
    ativo: true,
    createdAt: '2026-06-04T18:00:00Z',
    updatedAt: '2026-06-04T18:00:00Z'
  },
  {
    id: 'user_op_said',
    nome: 'Operador Said Abdala',
    email: 'operador.said@jcruzeiro.com',
    perfil: 'Gerente',
    cargo: 'OPERADOR DE LOJA',
    setor: 'Varejo',
    loja: 'SAID ABDALA',
    ativo: true,
    createdAt: '2026-06-04T18:00:00Z',
    updatedAt: '2026-06-04T18:00:00Z'
  },
  {
    id: 'user_op_rioverde',
    nome: 'Operador Rio Verde',
    email: 'operador.rioverde@jcruzeiro.com',
    perfil: 'Gerente',
    cargo: 'OPERADOR DE LOJA',
    setor: 'Varejo',
    loja: 'RIO VERDE',
    ativo: true,
    createdAt: '2026-06-04T18:00:00Z',
    updatedAt: '2026-06-04T18:00:00Z'
  }
];

const INITIAL_AMOSTRAS: Amostra[] = [
  {
    id: 'amo_001',
    codigoAdm: 'ADM-POR-8001',
    descricao: 'Porcelanato Elizabeth 84x84 Retificado Calacata Polido',
    marca: 'Elizabeth',
    categoria: 'Porcelanatos',
    tamanho: '84x84 cm',
    colecao: 'Mármores Clássicos',
    unidade: 'M²',
    saldoAtual: 45,
    estoqueMinimo: 10,
    localizacaoCd: 'Rua A - Prateleira 3 - Nível B',
    status: 'ativo',
    fotoUrl: '',
    observacoes: 'Amostra padrão de alto tráfego com brilho intenso.',
    createdAt: '2026-02-01T10:00:00Z',
    updatedAt: '2026-05-29T08:00:00Z'
  },
  {
    id: 'amo_002',
    codigoAdm: 'ADM-POR-8002',
    descricao: 'Revestimento Ceusa 32x100 Retificado Escama Antico',
    marca: 'Ceusa',
    categoria: 'Revestimentos de Parede',
    tamanho: '32x100 cm',
    colecao: 'Retrô Escama',
    unidade: 'Peça',
    saldoAtual: 3, // Low inventory warning
    estoqueMinimo: 8,
    localizacaoCd: 'Rua B - Prateleira 1 - Nível A',
    status: 'ativo',
    fotoUrl: '',
    observacoes: 'Amostras individuais para painéis expositores.',
    createdAt: '2026-02-05T10:00:00Z',
    updatedAt: '2026-05-28T10:00:00Z'
  },
  {
    id: 'amo_003',
    codigoAdm: 'ADM-POR-8003',
    descricao: 'Porcelanato Portinari 60x120 Retificado Downtown Matte',
    marca: 'Portinari',
    categoria: 'Porcelanatos',
    tamanho: '60x120 cm',
    colecao: 'Downtown Urban',
    unidade: 'M²',
    saldoAtual: 18,
    estoqueMinimo: 5,
    localizacaoCd: 'Rua A - Prateleira 4 - Nível C',
    status: 'ativo',
    fotoUrl: '',
    observacoes: 'Estilo cimento queimado fosco.',
    createdAt: '2026-02-10T11:00:00Z',
    updatedAt: '2026-05-20T14:30:00Z'
  },
  {
    id: 'amo_004',
    codigoAdm: 'ADM-LOU-5001',
    descricao: 'Cuba de Apoio Deca Redonda L.105 Soft Branco',
    marca: 'Deca',
    categoria: 'Louças Sanitárias',
    tamanho: 'Ø 40 cm',
    colecao: 'Deca Soft',
    unidade: 'Peça',
    saldoAtual: 12,
    estoqueMinimo: 4,
    localizacaoCd: 'Rua E - Prateleira 2 - Nível A',
    status: 'ativo',
    fotoUrl: '',
    observacoes: 'Embalagem reforçada de amostra para show-room.',
    createdAt: '2026-03-01T08:30:00Z',
    updatedAt: '2026-05-15T09:00:00Z'
  },
  {
    id: 'amo_005',
    codigoAdm: 'ADM-MET-4002',
    descricao: 'Torneira Monocomando Gourmet Docol Chroma Bronze Brushed',
    marca: 'Docol',
    categoria: 'Metais Sanitários',
    tamanho: 'Padrão Gourmet',
    colecao: 'Chroma Gourmet',
    unidade: 'Peça',
    saldoAtual: 6,
    estoqueMinimo: 3,
    localizacaoCd: 'Rua D - Prateleira A - Nível B',
    status: 'ativo',
    fotoUrl: '',
    observacoes: 'Material de exposição de alto giro.',
    createdAt: '2026-03-12T15:00:00Z',
    updatedAt: '2026-05-29T11:20:00Z'
  }
];

const INITIAL_SOLICITACOES: Solicitacao[] = [
  {
    id: 'sol_1001',
    numero: 'SOL-2026-001',
    dataSolicitacao: '2026-05-20T10:00:00Z',
    solicitanteId: 'user_ivan',
    solicitanteNome: 'Ivan Controlador',
    prioridade: 'normal',
    lojasDestino: ['MATRIZ'],
    responsaveisRecebimento: {
      'MATRIZ': 'Gerente Operacional'
    },
    status: 'Exposição comprovada',
    observacoes: 'Projeto de renovação da ala leste da MATRIZ.',
    itens: [
      {
        id: 'sol_item_1',
        amostraId: 'amo_001',
        codigoAdm: 'ADM-POR-8001',
        descricao: 'Porcelanato Elizabeth 84x84 Retificado Calacata Polido',
        marca: 'Elizabeth',
        quantidadeSolicitada: 4,
        quantidadeSeparada: 4,
        quantidadeRecebida: 4,
        origem: 'Estoque da empresa',
        verbaCompra: 'VB-CC-2026-45A',
        status: 'recebido'
      }
    ],
    createdAt: '2026-05-20T10:00:00Z',
    updatedAt: '2026-05-22T14:30:00Z'
  },
  {
    id: 'sol_1002',
    numero: 'SOL-2026-002',
    dataSolicitacao: '2026-05-27T14:00:00Z',
    solicitanteId: 'user_ivan',
    solicitanteNome: 'Ivan Controlador',
    prioridade: 'urgente',
    lojasDestino: ['CATEDRAL'],
    responsaveisRecebimento: {
      'CATEDRAL': 'Gerente da Loja'
    },
    status: 'Liberada para separação',
    observacoes: 'Amostras urgentes para montagem de showroom de porcelanatos nobres.',
    itens: [
      {
        id: 'sol_item_2',
        amostraId: 'amo_003',
        codigoAdm: 'ADM-POR-8003',
        descricao: 'Porcelanato Portinari 60x120 Retificado Downtown Matte',
        marca: 'Portinari',
        quantidadeSolicitada: 6,
        quantidadeSeparada: 0,
        quantidadeRecebida: 0,
        origem: 'Estoque da empresa',
        verbaCompra: 'VB-CC-2026-90B',
        status: 'pendente'
      },
      {
        id: 'sol_item_3',
        amostraId: 'amo_002',
        codigoAdm: 'ADM-POR-8002',
        descricao: 'Revestimento Ceusa 32x100 Retificado Escama Antico',
        marca: 'Ceusa',
        quantidadeSolicitada: 2,
        quantidadeSeparada: 0,
        quantidadeRecebida: 0,
        origem: 'Envio direto da fábrica sem custo',
        status: 'pendente'
      }
    ],
    createdAt: '2026-05-27T14:00:00Z',
    updatedAt: '2026-05-27T14:15:00Z'
  }
];

const INITIAL_MOVIMENTACOES: MovimentacaoEstoque[] = [
  {
    id: 'mov_101',
    amostraId: 'amo_001',
    codigoAdm: 'ADM-POR-8001',
    produtoNome: 'Porcelanato Elizabeth 84x84 Retificado Calacata Polido',
    marca: 'Elizabeth',
    tipo: 'entrada',
    quantidade: 50,
    saldoAnterior: 0,
    saldoNovo: 50,
    responsavelId: 'user_ivan',
    responsavelNome: 'Ivan Controlador',
    observacoes: 'Lote inicial recebido do fabricante Ceusa.',
    createdAt: '2026-05-10T08:30:00Z'
  },
  {
    id: 'mov_102',
    amostraId: 'amo_001',
    codigoAdm: 'ADM-POR-8001',
    produtoNome: 'Porcelanato Elizabeth 84x84 Retificado Calacata Polido',
    marca: 'Elizabeth',
    tipo: 'saída',
    quantidade: 4,
    saldoAnterior: 50,
    saldoNovo: 46,
    lojaDestino: 'MATRIZ',
    solicitacaoId: 'sol_1001',
    protocoloId: 'prt_2001',
    verbaCompra: 'VB-CC-2026-45A',
    responsavelId: 'user_juliano',
    responsavelNome: 'Juliano Separador',
    observacoes: 'Separado corretamente e enviado conforme solicitação SOL-2026-001.',
    createdAt: '2026-05-21T09:12:00Z'
  }
];

const INITIAL_PROTOCOLOS: ProtocoloEnvio[] = [
  {
    id: 'prt_2001',
    numero: 'PRT-2026-0001',
    solicitacaoId: 'sol_1001',
    solicitacaoNumero: 'SOL-2026-001',
    lojaDestino: 'MATRIZ',
    responsavelSeparacao: 'Juliano Separador',
    responsavelRecebimento: 'Gerente Operacional',
    dataEnvio: '2026-05-21T10:00:00Z',
    itens: [
      {
        codigoAdm: 'ADM-POR-8001',
        descricao: 'Porcelanato Elizabeth 84x84 Retificado Calacata Polido',
        marca: 'Elizabeth',
        quantidade: 4
      }
    ],
    observacoes: 'Palete embalado e adesivado. Motorista: Marcos Santos.',
    createdAt: '2026-05-21T10:00:00Z'
  }
];

const INITIAL_RECEBIMENTOS: Recebimento[] = [
  {
    id: 'rec_2001',
    solicitacaoId: 'sol_1001',
    solicitacaoNumero: 'SOL-2026-001',
    loja: 'MATRIZ',
    gerenteId: 'user_gerente_op',
    gerenteNome: 'Gerente Operacional',
    status: 'Recebida',
    itens: [
      {
        amostraId: 'amo_001',
        codigoAdm: 'ADM-POR-8001',
        descricao: 'Porcelanato Elizabeth 84x84 Retificado Calacata Polido',
        quantidadeSolicitada: 4,
        quantidadeRecebida: 4
      }
    ],
    fotos: [],
    observacoes: 'Peças recebidas in perfeito estado faturadas sob verba.',
    createdAt: '2026-05-21T16:45:00Z'
  }
];

const INITIAL_EXPOSICOES: Exposicao[] = [
  {
    id: 'exp_2001',
    solicitacaoId: 'sol_1001',
    solicitacaoNumero: 'SOL-2026-001',
    amostraId: 'amo_001',
    codigoAdm: 'ADM-POR-8001',
    descricao: 'Porcelanato Elizabeth 84x84 Retificado Calacata Polido',
    loja: 'MATRIZ',
    produtoExposto: 'sim',
    localExposicao: 'Painel Primário Ala 4 Porcelanatos Polidos',
    integridadeFisica: true,
    limpezaConservacao: true,
    identificacaoCorreta: true,
    localizacaoAdequada: true,
    fotos: ['data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" fill="%231e293b"/><text x="50" y="55" font-size="10" fill="%23fbbf24" font-family="sans-serif" text-anchor="middle">Exposto Elizabeth</text></svg>'],
    status: 'Exposição comprovada',
    observacoes: 'Amostra limpa diariamente, precificada e com identificação ADM colada.',
    validadoPor: 'Guilherme Admin',
    validatedAt: '2026-05-22T14:30:00Z',
    createdAt: '2026-05-22T10:00:00Z'
  }
];

const INITIAL_CONFERENCIAS: ConferenciaMensal[] = [
  {
    id: 'conf_1',
    competencia: '05/2026',
    loja: 'MATRIZ',
    gerenteLoja: 'Gerente da Matriz',
    gerenteOperacional: 'Gerente Operacional',
    status: 'Pendente',
    prazoResposta: '2026-06-05',
    itens: [
      {
        codigoAdm: 'ADM-POR-8001',
        descricao: 'Porcelanato Elizabeth 84x84 Retificado Calacata Polido',
        marca: 'Elizabeth',
        statusExposicao: 'Exposto corretamente',
        integridadeFisica: true,
        limpeza: true,
        conservacao: true,
        identificacaoCorreta: true,
        localizacaoAdequada: true,
        fotos: []
      }
    ],
    fotos: [],
    observacoes: 'Primeiro ciclo do novo controle de amostras.'
  }
];

const INITIAL_AVARIAS: Avaria[] = [];
const INITIAL_PENDENCIAS: Pendencia[] = [];
const INITIAL_LOGS: LogAuditoria[] = [
  {
    id: 'log_001',
    usuarioId: 'user_guilherme',
    usuarioNome: 'Guilherme Admin',
    acao: 'Inicialização do Sistema',
    modulo: 'Configurações',
    registroId: 'sys',
    observacao: 'O sistema GESTÃO E CONTROLE DE AMOSTRAS foi ativo com os perfis padrão.',
    createdAt: '2026-05-29T11:56:00Z'
  }
];

const INITIAL_VEICULOS = [
  { id: 'veic_1', placa: 'BRA2E19', modelo: 'Mercedes Atego CD' },
  { id: 'veic_2', placa: 'JKI4509', modelo: 'Fiat Fiorino Matriz' },
  { id: 'veic_3', placa: 'MLP8873', modelo: 'VW Delivery Catedral' },
  { id: 'veic_4', placa: 'JCR2026', modelo: 'Ford Cargo Geral' }
];

const INITIAL_MOTORISTAS = [
  { id: 'mot_1', nome: 'Marcos Santos', cnh: 'AD-490321' },
  { id: 'mot_2', nome: 'Cláudio Ramos', cnh: 'D-593021' },
  { id: 'mot_3', nome: 'José de Alencar', cnh: 'C-390218' },
  { id: 'mot_4', nome: 'Maurício Cruz', cnh: 'B-774092' }
];

const INITIAL_ENTRADAS_PENDENTES: CustomPendingEntry[] = [
  {
    id: `pend_seed_001`,
    amostraId: 'amo_001',
    codigoAdm: 'ADM-POR-8001',
    codigoOriginal: 'ELIZ-84-POL-CALACATA',
    descricao: 'Porcelanato Elizabeth 84x84 Retificado Calacata Polido',
    marca: 'Elizabeth',
    tipoFluxo: 'ENTRADA DE PRODUTOS BONIFICADOS',
    quantidade: 15,
    observacoes: 'Inserção de bonificados recebidos em lote especial da fábrica.',
    status: 'AGUARDANDO CONSOLIDAÇÃO DE ESTOQUE',
    criadoEm: '2026-06-06T06:00:00Z',
    criadoPorId: 'user_ivan',
    criadoPorNome: 'Ivan Controlador'
  },
  {
    id: `pend_seed_002`,
    amostraId: 'amo_002',
    codigoAdm: 'ADM-POR-8002',
    codigoOriginal: 'ELIZ-60-MATT-PORTORO',
    descricao: 'Porcelanato Elizabeth 60x60 Retificado Portoro Gold',
    marca: 'Elizabeth',
    tipoFluxo: 'ENTRADA DE PRODUTOS BAIXADOS DO ESTOQUE',
    quantidade: 8,
    verbaCompra: 'VB-2026-PORCELANATO',
    observacoes: 'Amostra solicitada p/ reposição de display danificado por tráfego.',
    status: 'BLOQUEADO',
    criadoEm: '2026-06-06T08:00:00Z',
    criadoPorId: 'user_ivan',
    criadoPorNome: 'Ivan Controlador'
  }
];

type DBChangeListener = () => void;

function cleanUndefined(obj: any): any {
  if (obj === null || obj === undefined) return null;
  if (typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(cleanUndefined);
  }
  const clean: any = {};
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (val !== undefined) {
      clean[key] = cleanUndefined(val);
    }
  }
  return clean;
}

function safeSetDoc(docRef: any, data: any): Promise<void> {
  return setDoc(docRef, cleanUndefined(data));
}

export class DatabaseService {
  private static listeners: DBChangeListener[] = [];
  private static memoryCache: Record<string, any> = {};
  private static firebaseInitialized = false;

  static subscribe(listener: DBChangeListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private static notify(): void {
    this.listeners.forEach(l => {
      try {
        l();
      } catch (e) {
        console.error('Error executing DB listener:', e);
      }
    });
  }

  static initialize(): void {
    this.getUsers();
    this.getAmostras();
    this.getMovimentacoes();
    this.getProtocolos();
    this.getExposicoes();
    this.getConferencias();
    this.getAvarias();
    this.getPendencias();
    this.getLogs();
    this.getVeiculos();
    this.getMotoristas();

    // Connect to Firebase in the background
    this.initializeFirebase();
  }

  static async clearAndReseedDatabase(): Promise<void> {
    console.log('Iniciando limpeza e re-semeadura completa do banco de dados no Firestore...');
    
    // Reset the internal memory cache
    this.memoryCache = {};

    // Lista de coleções para limpar e re-semear
    const collectionsToClear = [
      { name: 'users', seed: INITIAL_USERS },
      { name: 'amostras', seed: INITIAL_AMOSTRAS },
      { name: 'solicitacoes', seed: INITIAL_SOLICITACOES },
      { name: 'movimentacoes', seed: INITIAL_MOVIMENTACOES },
      { name: 'protocolos', seed: INITIAL_PROTOCOLOS },
      { name: 'recebimentos', seed: INITIAL_RECEBIMENTOS },
      { name: 'exposicoes', seed: INITIAL_EXPOSICOES },
      { name: 'conferencias', seed: INITIAL_CONFERENCIAS },
      { name: 'avarias', seed: INITIAL_AVARIAS },
      { name: 'pendencias', seed: INITIAL_PENDENCIAS },
      { name: 'logs', seed: INITIAL_LOGS },
      { name: 'veiculos', seed: INITIAL_VEICULOS },
      { name: 'motoristas', seed: INITIAL_MOTORISTAS },
      { name: 'entradas_pendentes', seed: INITIAL_ENTRADAS_PENDENTES },
      { name: 'conferencias_importadas', seed: [] as any[] }
    ];

    // Limpar chaves locais do LocalStorage para evitar conflitos
    const keysToWipe = [
      'logged_user', 'users', 'amostras', 'solicitacoes', 'movimentacoes',
      'protocolos', 'recebimentos', 'exposicoes', 'conferencias',
      'conferencias_importadas', 'avarias', 'pendencias', 'logs',
      'veiculos', 'motoristas', 'logged_in_user', 'entradas_pendentes'
    ];
    
    keysToWipe.forEach(k => {
      localStorage.removeItem(`jc_amostras_${k}`);
    });
    localStorage.removeItem('jc_logged_user');

    // 1. Limpar cada coleção no Firestore
    for (const coll of collectionsToClear) {
      try {
        const querySnapshot = await getDocs(collection(db, coll.name));
        const deletePromises: Promise<void>[] = [];
        querySnapshot.forEach(docSnap => {
          deletePromises.push(deleteDoc(doc(db, coll.name, docSnap.id)));
        });
        await Promise.all(deletePromises);
        console.log(`Coleção limpa no Firestore: ${coll.name}`);
      } catch (err) {
        console.error(`Erro ao limpar coleção ${coll.name} no Firestore:`, err);
      }
    }

    // 2. Semear os dados iniciais originais no Firestore
    for (const coll of collectionsToClear) {
      if (coll.seed && coll.seed.length > 0) {
        try {
          const writePromises = coll.seed.map((item: any) => {
            return safeSetDoc(doc(db, coll.name, item.id), item);
          });
          await Promise.all(writePromises);
          console.log(`Semeado Coleção ${coll.name} no Firestore com ${coll.seed.length} itens.`);
        } catch (err) {
          console.error(`Erro ao semear coleção ${coll.name} no Firestore:`, err);
        }
      }
    }

    console.log('Banco de dados limpo e re-semeado com sucesso no Firebase!');
  }

  static async initializeFirebase(): Promise<void> {
    if (this.firebaseInitialized) return;
    this.firebaseInitialized = true;
    try {
      // Authenticate anonymously
      await signInAnonymously(auth);
      
      // Test connection
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (e) {
        // Safe to ignore or handle offline
      }

      // --- 1. Users sync ---
      onSnapshot(collection(db, 'users'), (snapshot) => {
        if (snapshot.empty) {
          INITIAL_USERS.forEach(user => {
            safeSetDoc(doc(db, 'users', user.id), user).catch(err => handleFirestoreError(err, OperationType.WRITE, `users/${user.id}`));
          });
        } else {
          const items: User[] = [];
          snapshot.forEach(docSnap => {
            items.push(docSnap.data() as User);
          });
          this.memoryCache['users'] = items;
          this.notify();
        }
      }, (err) => handleFirestoreError(err, OperationType.GET, 'users'));

      // --- 2. Amostras sync ---
      onSnapshot(collection(db, 'amostras'), (snapshot) => {
        if (snapshot.empty) {
          INITIAL_AMOSTRAS.forEach(x => {
            safeSetDoc(doc(db, 'amostras', x.id), x).catch(err => handleFirestoreError(err, OperationType.WRITE, `amostras/${x.id}`));
          });
        } else {
          const items: Amostra[] = [];
          snapshot.forEach(docSnap => {
            items.push(docSnap.data() as Amostra);
          });
          this.memoryCache['amostras'] = items;
          this.notify();
        }
      }, (err) => handleFirestoreError(err, OperationType.GET, 'amostras'));

      // --- 3. Movimentacoes sync ---
      onSnapshot(collection(db, 'movimentacoes'), (snapshot) => {
        if (snapshot.empty) {
          INITIAL_MOVIMENTACOES.forEach(x => {
            safeSetDoc(doc(db, 'movimentacoes', x.id), x).catch(err => handleFirestoreError(err, OperationType.WRITE, `movimentacoes/${x.id}`));
          });
        } else {
          const items: MovimentacaoEstoque[] = [];
          snapshot.forEach(docSnap => {
            items.push(docSnap.data() as MovimentacaoEstoque);
          });
          items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          this.memoryCache['movimentacoes'] = items;
          this.notify();
        }
      }, (err) => handleFirestoreError(err, OperationType.GET, 'movimentacoes'));

      // --- 4. Solicitacoes sync ---
      onSnapshot(collection(db, 'solicitacoes'), (snapshot) => {
        if (snapshot.empty) {
          INITIAL_SOLICITACOES.forEach(x => {
            safeSetDoc(doc(db, 'solicitacoes', x.id), x).catch(err => handleFirestoreError(err, OperationType.WRITE, `solicitacoes/${x.id}`));
          });
        } else {
          const items: Solicitacao[] = [];
          snapshot.forEach(docSnap => {
            items.push(docSnap.data() as Solicitacao);
          });
          this.memoryCache['solicitacoes'] = items;
          this.notify();
        }
      }, (err) => handleFirestoreError(err, OperationType.GET, 'solicitacoes'));

      // --- 5. Protocolos sync ---
      onSnapshot(collection(db, 'protocolos'), (snapshot) => {
        if (snapshot.empty) {
          INITIAL_PROTOCOLOS.forEach(x => {
            safeSetDoc(doc(db, 'protocolos', x.id), x).catch(err => handleFirestoreError(err, OperationType.WRITE, `protocolos/${x.id}`));
          });
        } else {
          const items: ProtocoloEnvio[] = [];
          snapshot.forEach(docSnap => {
            items.push(docSnap.data() as ProtocoloEnvio);
          });
          this.memoryCache['protocolos'] = items;
          this.notify();
        }
      }, (err) => handleFirestoreError(err, OperationType.GET, 'protocolos'));

      // --- 6. Recebimentos sync ---
      onSnapshot(collection(db, 'recebimentos'), (snapshot) => {
        if (snapshot.empty) {
          INITIAL_RECEBIMENTOS.forEach(x => {
            safeSetDoc(doc(db, 'recebimentos', x.id), x).catch(err => handleFirestoreError(err, OperationType.WRITE, `recebimentos/${x.id}`));
          });
        } else {
          const items: Recebimento[] = [];
          snapshot.forEach(docSnap => {
            items.push(docSnap.data() as Recebimento);
          });
          this.memoryCache['recebimentos'] = items;
          this.notify();
        }
      }, (err) => handleFirestoreError(err, OperationType.GET, 'recebimentos'));

      // --- 7. Exposicoes sync ---
      onSnapshot(collection(db, 'exposicoes'), (snapshot) => {
        if (snapshot.empty) {
          INITIAL_EXPOSICOES.forEach(x => {
            safeSetDoc(doc(db, 'exposicoes', x.id), x).catch(err => handleFirestoreError(err, OperationType.WRITE, `exposicoes/${x.id}`));
          });
        } else {
          const items: Exposicao[] = [];
          snapshot.forEach(docSnap => {
            items.push(docSnap.data() as Exposicao);
          });
          this.memoryCache['exposicoes'] = items;
          this.notify();
        }
      }, (err) => handleFirestoreError(err, OperationType.GET, 'exposicoes'));

      // --- 8. Conferencias sync ---
      onSnapshot(collection(db, 'conferencias'), (snapshot) => {
        if (snapshot.empty) {
          INITIAL_CONFERENCIAS.forEach(x => {
            safeSetDoc(doc(db, 'conferencias', x.id), x).catch(err => handleFirestoreError(err, OperationType.WRITE, `conferencias/${x.id}`));
          });
        } else {
          const items: ConferenciaMensal[] = [];
          snapshot.forEach(docSnap => {
            items.push(docSnap.data() as ConferenciaMensal);
          });
          this.memoryCache['conferencias'] = items;
          this.notify();
        }
      }, (err) => handleFirestoreError(err, OperationType.GET, 'conferencias'));

      // --- 9. Avarias sync ---
      onSnapshot(collection(db, 'avarias'), (snapshot) => {
        if (snapshot.empty) {
          INITIAL_AVARIAS.forEach(x => {
            safeSetDoc(doc(db, 'avarias', x.id), x).catch(err => handleFirestoreError(err, OperationType.WRITE, `avarias/${x.id}`));
          });
        } else {
          const items: Avaria[] = [];
          snapshot.forEach(docSnap => {
            items.push(docSnap.data() as Avaria);
          });
          this.memoryCache['avarias'] = items;
          this.notify();
        }
      }, (err) => handleFirestoreError(err, OperationType.GET, 'avarias'));

      // --- 10. Pendencias sync ---
      onSnapshot(collection(db, 'pendencias'), (snapshot) => {
        if (snapshot.empty) {
          INITIAL_PENDENCIAS.forEach(x => {
            safeSetDoc(doc(db, 'pendencias', x.id), x).catch(err => handleFirestoreError(err, OperationType.WRITE, `pendencias/${x.id}`));
          });
        } else {
          const items: Pendencia[] = [];
          snapshot.forEach(docSnap => {
            items.push(docSnap.data() as Pendencia);
          });
          this.memoryCache['pendencias'] = items;
          this.notify();
        }
      }, (err) => handleFirestoreError(err, OperationType.GET, 'pendencias'));

      // --- 11. Logs sync ---
      onSnapshot(collection(db, 'logs'), (snapshot) => {
        if (snapshot.empty) {
          INITIAL_LOGS.forEach(x => {
            safeSetDoc(doc(db, 'logs', x.id), x).catch(err => handleFirestoreError(err, OperationType.WRITE, `logs/${x.id}`));
          });
        } else {
          const items: LogAuditoria[] = [];
          snapshot.forEach(docSnap => {
            items.push(docSnap.data() as LogAuditoria);
          });
          this.memoryCache['logs'] = items;
          this.notify();
        }
      }, (err) => handleFirestoreError(err, OperationType.GET, 'logs'));

      // --- 12. Conferencias Importadas sync ---
      onSnapshot(collection(db, 'conferencias_importadas'), (snapshot) => {
        const items: ConferenciaMensal[] = [];
        snapshot.forEach(docSnap => {
          items.push(docSnap.data() as ConferenciaMensal);
        });
        this.memoryCache['conferencias_importadas'] = items;
        try {
          localStorage.setItem('jc_amostras_sync_conferencias_importadas', JSON.stringify(items));
        } catch (e) {
          console.warn('Error saving synchronized conferencias_importadas to localStorage:', e);
        }
        this.notify();
      }, (err) => handleFirestoreError(err, OperationType.GET, 'conferencias_importadas'));

      // --- 13. Veiculos sync ---
      onSnapshot(collection(db, 'veiculos'), (snapshot) => {
        if (snapshot.empty) {
          INITIAL_VEICULOS.forEach(x => {
            safeSetDoc(doc(db, 'veiculos', x.id), x).catch(err => handleFirestoreError(err, OperationType.WRITE, `veiculos/${x.id}`));
          });
        } else {
          const items: any[] = [];
          snapshot.forEach(docSnap => {
            items.push(docSnap.data());
          });
          this.memoryCache['veiculos'] = items;
          this.notify();
        }
      }, (err) => handleFirestoreError(err, OperationType.GET, 'veiculos'));

      // --- 14. Motoristas sync ---
      onSnapshot(collection(db, 'motoristas'), (snapshot) => {
        if (snapshot.empty) {
          INITIAL_MOTORISTAS.forEach(x => {
            safeSetDoc(doc(db, 'motoristas', x.id), x).catch(err => handleFirestoreError(err, OperationType.WRITE, `motoristas/${x.id}`));
          });
        } else {
          const items: any[] = [];
          snapshot.forEach(docSnap => {
            items.push(docSnap.data());
          });
          this.memoryCache['motoristas'] = items;
          this.notify();
        }
      }, (err) => handleFirestoreError(err, OperationType.GET, 'motoristas'));

      // --- 15. Entradas Pendentes sync ---
      onSnapshot(collection(db, 'entradas_pendentes'), (snapshot) => {
        if (snapshot.empty) {
          INITIAL_ENTRADAS_PENDENTES.forEach(x => {
            safeSetDoc(doc(db, 'entradas_pendentes', x.id), x).catch(err => handleFirestoreError(err, OperationType.WRITE, `entradas_pendentes/${x.id}`));
          });
        } else {
          const items: CustomPendingEntry[] = [];
          snapshot.forEach(docSnap => {
            items.push(docSnap.data() as CustomPendingEntry);
          });
          this.memoryCache['entradas_pendentes'] = items;
          this.notify();
        }
      }, (err) => handleFirestoreError(err, OperationType.GET, 'entradas_pendentes'));

    } catch (err) {
      console.error('Failed to initialize Firebase snapshot loops: ', err);
    }
  }

  private static getStored<T>(key: string, initial: T): T {
    if (this.memoryCache[key] === undefined) {
      const cached = localStorage.getItem(`jc_amostras_sync_${key}`);
      if (cached) {
        try {
          this.memoryCache[key] = JSON.parse(cached);
        } catch (e) {
          console.warn(`Error parsing localStorage cache for ${key}:`, e);
          this.memoryCache[key] = initial;
        }
      } else {
        this.memoryCache[key] = initial;
      }
    }
    return this.memoryCache[key];
  }

  private static setStored<T>(key: string, value: T): void {
    this.memoryCache[key] = value;

    try {
      localStorage.setItem(`jc_amostras_sync_${key}`, JSON.stringify(value));
    } catch (e) {
      console.warn(`Error writing localStorage cache for ${key}:`, e);
    }

    // Auto sync array entries to Firestore
    if (Array.isArray(value)) {
      const collectionMap: Record<string, string> = {
        'users': 'users',
        'amostras': 'amostras',
        'movimentacoes': 'movimentacoes',
        'solicitacoes': 'solicitacoes',
        'protocolos': 'protocolos',
        'recebimentos': 'recebimentos',
        'exposicoes': 'exposicoes',
        'conferencias': 'conferencias',
        'conferencias_importadas': 'conferencias_importadas',
        'avarias': 'avarias',
        'pendencias': 'pendencias',
        'logs': 'logs',
        'veiculos': 'veiculos',
        'motoristas': 'motoristas',
        'entradas_pendentes': 'entradas_pendentes'
      };
      const collName = collectionMap[key];
      if (collName) {
        value.forEach((item: any) => {
          if (item && item.id) {
            safeSetDoc(doc(db, collName, item.id), item).catch(err => {
              console.warn(`Firestore sync write error for ${collName}/${item.id}:`, err);
            });
          }
        });
      }
    }
  }

  // --- Auth Session State ---
  static getLoggedInUser(): User | null {
    const user = localStorage.getItem('jc_amostras_logged_in_user');
    return user ? JSON.parse(user) : null;
  }

  static login(email: string, userToLogin?: User): { success: boolean; error?: string; user?: User } {
    const cleanEmail = email.trim().toLowerCase();
    
    // Regra de Login: e-mail deve terminar com @jcruzeiro.com
    if (!cleanEmail.endsWith('@jcruzeiro.com')) {
      return { 
        success: false, 
        error: 'Acesso permitido somente para usuários com e-mail corporativo @jcruzeiro.com.' 
      };
    }

    const users = this.getUsers();
    
    // Find matching user or auto-register standard user
    let user = users.find(u => u.email.toLowerCase() === cleanEmail);
    if (!user) {
      // Auto-register default admin if matching Guilherme or generic registration
      const nome = userToLogin?.nome || email.split('@')[0].toUpperCase();
      const cargo = userToLogin?.cargo || 'Colaborador';
      const perfil: UserProfile = userToLogin?.perfil || (cleanEmail.startsWith('guilherme') ? 'Admin' : 'Gerente');
      const loja = userToLogin?.loja || 'Matriz';
      
      user = {
        id: `user_${Date.now()}`,
        nome,
        email: cleanEmail,
        perfil,
        cargo,
        setor: 'Geral',
        loja,
        ativo: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastLogin: new Date().toISOString()
      };
      
      users.push(user);
      this.setUsers(users);
    }

    if (!user.ativo) {
      return {
        success: false,
        error: 'Sua conta de usuário foi inativada. Entre em contato com o Admin Guilherme.'
      };
    }

    user.lastLogin = new Date().toISOString();
    this.updateUser(user);
    
    localStorage.setItem('jc_amostras_logged_in_user', JSON.stringify(user));
    
    this.logAuditoria(
      user.id, 
      user.nome, 
      'Login efetuado', 
      'Autenticação', 
      user.id, 
      '', 
      '', 
      `Usuário ${user.nome} acessou via perfil de ${user.perfil}`
    );

    return { success: true, user };
  }

  static logout(): void {
    const current = this.getLoggedInUser();
    if (current) {
      this.logAuditoria(current.id, current.nome, 'Logout efetuado', 'Autenticação', current.id);
    }
    localStorage.removeItem('jc_amostras_logged_in_user');
  }

  // --- Users CRUD ---
  static getUsers(): User[] {
    const list = this.getStored<User[]>('users', INITIAL_USERS);
    // Para garantir que novos usuários pré-definidos em INITIAL_USERS que não estejam no localStorage sejam incorporados:
    let updated = false;
    INITIAL_USERS.forEach(iu => {
      if (!list.some(u => u.email.toLowerCase() === iu.email.toLowerCase())) {
        list.push(iu);
        updated = true;
      }
    });
    if (updated) {
      this.setStored<User[]>('users', list);
    }
    return list;
  }

  static setUsers(users: User[]): void {
    this.setStored<User[]>('users', users);
  }

  static createUser(user: Omit<User, 'id' | 'createdAt' | 'updatedAt'>, operator: User): User {
    const users = this.getUsers();
    const newUser: User = {
      ...user,
      id: `user_${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    users.push(newUser);
    this.setUsers(users);
    
    this.logAuditoria(
      operator.id, 
      operator.nome, 
      'Usuário Criado', 
      'Usuários', 
      newUser.id, 
      '', 
      JSON.stringify(newUser),
      `Criado usuário ${newUser.nome} com perfil ${newUser.perfil}`
    );
    return newUser;
  }

  static updateUser(user: User, operator?: User): void {
    const users = this.getUsers();
    const index = users.findIndex(u => u.id === user.id);
    if (index !== -1) {
      const old = users[index];
      user.updatedAt = new Date().toISOString();
      users[index] = user;
      this.setUsers(users);

      if (operator) {
        this.logAuditoria(
          operator.id, 
          operator.nome, 
          'Usuário Atualizado', 
          'Usuários', 
          user.id, 
          JSON.stringify(old), 
          JSON.stringify(user),
          `Perfil ou dados de ${user.nome} alterados.`
        );
      }
    }
  }

  // --- Amostras CRUD ---
  static getAmostras(): Amostra[] {
    return this.getStored<Amostra[]>('amostras', INITIAL_AMOSTRAS);
  }

  static setAmostras(amostras: Amostra[]): void {
    this.setStored<Amostra[]>('amostras', amostras);
  }

  static createAmostra(amostra: Omit<Amostra, 'id' | 'createdAt' | 'updatedAt'>, operator: User): Amostra {
    const amostras = this.getAmostras();
    const newAmostra: Amostra = {
      ...amostra,
      id: `amo_${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    amostras.push(newAmostra);
    this.setAmostras(amostras);
    
    // Log do audit do estoque
    this.logAuditoria(
      operator.id,
      operator.nome,
      'Cadastro de Amostra',
      'Cadastro',
      newAmostra.id,
      '',
      JSON.stringify(newAmostra),
      `Nova amostra código ADM ${newAmostra.codigoAdm} cadastrada com estoque inicial (${newAmostra.saldoAtual})`
    );

    // Registra movimentação de entrada inicial se houver estoque inicial maior que 0
    if (newAmostra.saldoAtual > 0) {
      this.registrarMovimentacaoEstoque({
        amostraId: newAmostra.id,
        codigoAdm: newAmostra.codigoAdm,
        produtoNome: newAmostra.descricao,
        marca: newAmostra.marca,
        tipo: 'entrada',
        quantidade: newAmostra.saldoAtual,
        saldoAnterior: 0,
        saldoNovo: newAmostra.saldoAtual,
        responsavelId: operator.id,
        responsavelNome: operator.nome,
        observacoes: 'Amostra cadastrada com saldo inicial.'
      }, operator);
    }
    
    return newAmostra;
  }

  static updateAmostra(amostra: Amostra, operator: User): void {
    const amostras = this.getAmostras();
    const index = amostras.findIndex(a => a.id === amostra.id);
    if (index !== -1) {
      const old = amostras[index];
      
      // Prevent negative inventories
      if (amostra.saldoAtual < 0) {
        throw new Error('A operação causaria saldo de estoque negativo no CD!');
      }

      amostra.updatedAt = new Date().toISOString();
      amostras[index] = amostra;
      this.setAmostras(amostras);

      this.logAuditoria(
        operator.id,
        operator.nome,
        'Atualização de Amostra',
        'Cadastro',
        amostra.id,
        JSON.stringify(old),
        JSON.stringify(amostra),
        `Amostra ${amostra.codigoAdm} atualizada pelo operador.`
      );
    }
  }

  static deleteAmostra(id: string, operator: User): void {
    const amostras = this.getAmostras();
    const index = amostras.findIndex(a => a.id === id);
    if (index !== -1) {
      const old = amostras[index];
      amostras.splice(index, 1);
      this.setAmostras(amostras);

      // Deletar do firestore
      deleteDoc(doc(db, 'amostras', id)).catch(err => handleFirestoreError(err, OperationType.DELETE, `amostras/${id}`));

      this.logAuditoria(
        operator.id,
        operator.nome,
        'Exclusão de Amostra',
        'Cadastro',
        id,
        JSON.stringify(old),
        '',
        `Amostra código ADM ${old.codigoAdm} excluída do sistema.`
      );
    }
  }

  // --- CD Stock Control (Movimentações) ---
  static getMovimentacoes(): MovimentacaoEstoque[] {
    return this.getStored<MovimentacaoEstoque[]>('movimentacoes', INITIAL_MOVIMENTACOES);
  }

  static setMovimentacoes(movs: MovimentacaoEstoque[]): void {
    this.setStored<MovimentacaoEstoque[]>('movimentacoes', movs);
  }

  // Adds raw movement without direct UI validations
  private static registrarMovimentacaoEstoque(mov: Omit<MovimentacaoEstoque, 'id' | 'createdAt'>, operator: User): MovimentacaoEstoque {
    const movs = this.getMovimentacoes();
    const newMov: MovimentacaoEstoque = {
      ...mov,
      id: `mov_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      createdAt: new Date().toISOString()
    };
    movs.unshift(newMov); // newest first
    this.setMovimentacoes(movs);
    return newMov;
  }

  // Perform operational stock change (Entry, Exit, Manual Adjustment, Damaged Return, etc.)
  static realizarMovimentacaoEstoqueCompleta(params: {
    amostraId: string;
    tipo: 'entrada' | 'saída' | 'ajuste' | 'avaria' | 'devolução';
    quantidade: number;
    lojaDestino?: string;
    solicitacaoId?: string;
    protocoloId?: string;
    verbaCompra?: string;
    observacoes?: string;
  }, operator: User): void {
    const amostras = this.getAmostras();
    const amostra = amostras.find(a => a.id === params.amostraId);
    if (!amostra) {
      throw new Error('Amostra selecionada não foi encontrada no estoque!');
    }

    if (params.quantidade <= 0) {
      throw new Error('A quantidade de movimentação deve ser maior do que 0.');
    }

    const saldoAnterior = amostra.saldoAtual;
    let saldoNovo = saldoAnterior;

    if (params.tipo === 'entrada' || params.tipo === 'devolução') {
      saldoNovo += params.quantidade;
    } else {
      saldoNovo -= params.quantidade;
    }

    if (saldoNovo < 0) {
      throw new Error(`Estoque insuficiente! O CD possui apenas ${saldoAnterior} unidades deste item. Não é permitido saldo negativo.`);
    }

    // Exige justificativa para ajustes manuais
    if (params.tipo === 'ajuste' && (!params.observacoes || params.observacoes.trim().length < 5)) {
      throw new Error('Ajustes manuais exigem uma justificativa detalhada (mínimo de 5 caracteres) para auditoria.');
    }

    // Update real samples
    amostra.saldoAtual = saldoNovo;
    amostra.updatedAt = new Date().toISOString();
    
    // Check if status is updated based on new metrics
    if (saldoNovo === 0) {
      amostra.status = 'pendente';
    } else if (amostra.status === 'pendente' && saldoNovo > 0) {
      amostra.status = 'ativo';
    }

    this.updateAmostra(amostra, operator);

    // Save movement transaction log
    this.registrarMovimentacaoEstoque({
      amostraId: amostra.id,
      codigoAdm: amostra.codigoAdm,
      produtoNome: amostra.descricao,
      marca: amostra.marca,
      tipo: params.tipo,
      quantidade: params.quantidade,
      saldoAnterior,
      saldoNovo,
      lojaDestino: params.lojaDestino,
      solicitacaoId: params.solicitacaoId,
      protocoloId: params.protocoloId,
      verbaCompra: params.verbaCompra,
      responsavelId: operator.id,
      responsavelNome: operator.nome,
      observacoes: params.observacoes
    }, operator);
    
    // Create automatic low-stock notice if below minimum
    if (saldoNovo < amostra.estoqueMinimo && params.tipo !== 'entrada') {
      this.criarPendenciaAutomatica({
        tipo: 'Estoque insuficiente',
        origem: `Rastreabilidade Código ${amostra.codigoAdm}`,
        loja: 'Centro de Distribuição',
        amostraId: amostra.id,
        codigoAdm: amostra.codigoAdm,
        responsavel: 'Ivan Controlador',
        prazo: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0], // 3 days
        observacoes: `Estoques de amostra em patamar de atenção: Saldo Atual (${saldoNovo}) abaixo do mínimo especificado (${amostra.estoqueMinimo}). Solicitar reabastecimento junto ao fornecedor.`
      }, operator);
    }
  }

  // --- Solicitacoes de Envio de Amostras ---
  static getSolicitacoes(): Solicitacao[] {
    return this.getStored<Solicitacao[]>('solicitacoes', INITIAL_SOLICITACOES);
  }

  static setSolicitacoes(sols: Solicitacao[]): void {
    this.setStored<Solicitacao[]>('solicitacoes', sols);
  }

  static createSolicitacao(params: {
    prioridade?: 'baixa' | 'normal' | 'alta' | 'urgente';
    lojaOrigem?: string;
    placaVeiculo?: string;
    nomeMotorista?: string;
    lojasDestino: string[];
    responsaveisRecebimento: Record<string, string>;
    observacoes?: string;
    itens: {
      amostraId: string;
      quantidadeSolicitada: number;
      origem?: 'Estoque da empresa' | 'Envio direto da fábrica sem custo';
      verbaCompra?: string;
      observacoes?: string;
    }[];
  }, operator: User): Solicitacao {
    const sols = this.getSolicitacoes();
    const amostras = this.getAmostras();

    const solicitationNumber = `SOL-2026-${String(sols.length + 1).padStart(3, '0')}`;
    
    // Map items
    const itensMap: SolicitacaoItem[] = params.itens.map((it, idx) => {
      const am = amostras.find(a => a.id === it.amostraId);
      if (!am) {
        throw new Error(`Amostra selecionada para o item #${idx+1} não existe.`);
      }

      return {
        id: `sol_it_${Date.now()}_${idx}`,
        amostraId: am.id,
        codigoAdm: am.codigoAdm,
        descricao: am.descricao,
        marca: am.marca,
        quantidadeSolicitada: it.quantidadeSolicitada,
        quantidadeSeparada: 0,
        quantidadeRecebida: 0,
        origem: it.origem || 'Estoque da empresa',
        verbaCompra: it.verbaCompra,
        status: 'pendente',
        observacoes: it.observacoes
      };
    });

    const newSol: Solicitacao = {
      id: `sol_${Date.now()}`,
      numero: solicitationNumber,
      dataSolicitacao: new Date().toISOString(),
      solicitanteId: operator.id,
      solicitanteNome: operator.nome,
      prioridade: params.prioridade || 'normal',
      lojaOrigem: params.lojaOrigem,
      placaVeiculo: params.placaVeiculo,
      nomeMotorista: params.nomeMotorista,
      lojasDestino: params.lojasDestino,
      responsaveisRecebimento: params.responsaveisRecebimento,
      status: 'Liberada para separação', // goes directly for action as approved by demand Coordinator
      observacoes: params.observacoes,
      itens: itensMap,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    sols.push(newSol);
    this.setSolicitacoes(sols);

    this.logAuditoria(
      operator.id,
      operator.nome,
      'Solicitação Criada',
      'Solicitações',
      newSol.id,
      '',
      JSON.stringify(newSol),
      `Solicitação ${newSol.numero} de remessa de amostras gerada para as lojas: ${newSol.lojasDestino.join(', ')}`
    );

    return newSol;
  }

  // Update complete solicitation metadata or status
  static updateSolicitacaoStatus(id: string, status: Solicitacao['status'], operator: User, comment?: string): void {
    const sols = this.getSolicitacoes();
    const index = sols.findIndex(s => s.id === id);
    if (index !== -1) {
      const old = sols[index];
      const oldStatus = old.status;
      
      old.status = status;
      old.updatedAt = new Date().toISOString();
      sols[index] = old;
      this.setSolicitacoes(sols);

      this.logAuditoria(
        operator.id,
        operator.nome,
        'Atualização do Status',
        'Solicitações',
        id,
        oldStatus,
        status,
        `Status da Solicitação ${old.numero} alterada para ${status}. ${comment || ''}`
      );
    }
  }

  // --- Separação e Baixa de Estoque ---
  static processarSeparacaoFisica(id: string, params: {
    itensSeparados: {
      amostraId: string;
      quantidadeSeparada: number;
      divergente: boolean;
      avariaId?: string; // register if damaged during pick
      avariaCD?: boolean;
      avariaTexto?: string;
      observacao?: string;
    }[];
    fotoSeparacaoUrl?: string;
    observacaoGeral?: string;
    nomeMotorista?: string;
    placaVeiculo?: string;
  }, operator: User): void {
    const sols = this.getSolicitacoes();
    const solInst = sols.find(s => s.id === id);
    if (!solInst) {
      throw new Error('Solicitação de envio não localizada.');
    }

    if (params.nomeMotorista) {
      solInst.nomeMotorista = params.nomeMotorista;
    }
    if (params.placaVeiculo) {
      solInst.placaVeiculo = params.placaVeiculo;
    }

    let possessesDivergence = false;
    let totalItemsSelected = 0;

    // Process every item
    solInst.itens = solInst.itens.map(item => {
      const matchParam = params.itensSeparados.find(p => p.amostraId === item.amostraId);
      if (matchParam) {
        totalItemsSelected++;
        const pQty = matchParam.quantidadeSeparada;
        item.quantidadeSeparada = pQty;
        item.observacoes = matchParam.observacao || item.observacoes;

        if (matchParam.divergente || pQty !== item.quantidadeSolicitada) {
          possessesDivergence = true;
          item.status = 'divergente';

          // automatic creation of a physical discrepancy log
          this.criarPendenciaAutomatica({
            tipo: 'Divergência de quantidade',
            origem: `Pedido ${solInst.numero}`,
            loja: solInst.lojasDestino[0] || 'CD',
            amostraId: item.amostraId,
            codigoAdm: item.codigoAdm,
            responsavel: 'Ivan Controlador',
            prazo: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
            observacoes: `Erro físico de separação no CD para o item ${item.codigoAdm}. Solicitado: ${item.quantidadeSolicitada}, separado de fato: ${pQty}.`
          }, operator);
        } else {
          item.status = 'separado';
        }

        // Low stock of the company actually stored inside the CD!
        // Direct factory orders do NOT affect CD stock
        if (item.origem === 'Estoque da empresa') {
          try {
            // Debit separated quantity first
            if (pQty > 0) {
              this.realizarMovimentacaoEstoqueCompleta({
                amostraId: item.amostraId,
                tipo: 'saída',
                quantidade: pQty,
                lojaDestino: solInst.lojasDestino[0],
                solicitacaoId: solInst.id,
                verbaCompra: item.verbaCompra,
                observacoes: `Baixa automática de separação da Solicitação ${solInst.numero}.`
              }, operator);
            }

            // Always when in physical picking breakage ("quebra") or stock shortage ("falta de estoque") is checked -> debit from origin stock
            const diffQty = item.quantidadeSolicitada - pQty;
            if (diffQty > 0) {
              this.realizarMovimentacaoEstoqueCompleta({
                amostraId: item.amostraId,
                tipo: 'ajuste',
                quantidade: diffQty,
                lojaDestino: solInst.lojasDestino[0],
                solicitacaoId: solInst.id,
                verbaCompra: item.verbaCompra,
                observacoes: `Débito por falta de estoque/quebra detectada na separação física da Solicitação ${solInst.numero}.`
              }, operator);
            }
          } catch (err: any) {
            // Re-throw and do not register
            throw new Error(`Impossível concluir baixa automática: ${err.message}`);
          }
        }

        // Handle picking damage registered
        if (matchParam.avariaCD && matchParam.avariaTexto) {
          this.registrarAvaria({
            amostraId: item.amostraId,
            codigoAdm: item.codigoAdm,
            descricao: item.descricao,
            marca: item.marca,
            quantidade: 1, // unit damage on shelf
            local: 'CD',
            descricaoAvaria: matchParam.avariaTexto,
            fotos: [params.fotoSeparacaoUrl || ''],
            observacoes: `Detecção de quebra física de material durante separação para remessa ${solInst.numero}.`
          }, operator);

          // If the broken unit wasn't already debited as part of diffQty, debit it as 'avaria'
          const diffQty = item.quantidadeSolicitada - pQty;
          if (diffQty <= 0 && item.origem === 'Estoque da empresa') {
            try {
              this.realizarMovimentacaoEstoqueCompleta({
                amostraId: item.amostraId,
                tipo: 'avaria',
                quantidade: 1,
                lojaDestino: solInst.lojasDestino[0],
                solicitacaoId: solInst.id,
                observacoes: `Débito por quebra/avaria na separação física da Solicitação ${solInst.numero}.`
              }, operator);
            } catch (err: any) {
              console.warn(`Débito por avaria falhou: ${err.message}`);
            }
          }
        }
      }
      return item;
    });

    // Auto generate Protocolo de Envio (PRT)
    const protocols = this.getProtocolos();
    const prtNum = `PRT-2026-${String(protocols.length + 1).padStart(4, '0')}`;
    const newProtocol: ProtocoloEnvio = {
      id: `prt_${Date.now()}`,
      numero: prtNum,
      solicitacaoId: solInst.id,
      solicitacaoNumero: solInst.numero,
      lojaDestino: solInst.lojasDestino[0] || 'Matriz',
      responsavelSeparacao: operator.nome,
      responsavelRecebimento: solInst.responsaveisRecebimento[solInst.lojasDestino[0]] || 'Gerente',
      nomeMotorista: solInst.nomeMotorista,
      placaVeiculo: solInst.placaVeiculo,
      dataEnvio: new Date().toISOString(),
      itens: solInst.itens.map(it => ({
        codigoAdm: it.codigoAdm,
        descricao: it.descricao,
        marca: it.marca,
        quantidade: it.quantidadeSeparada
      })),
      observacoes: params.observacaoGeral || 'Remessa preparada e despachada.',
      createdAt: new Date().toISOString()
    };

    protocols.push(newProtocol);
    this.setProtocolos(protocols);

    // Update status based on divergence presence
    solInst.status = possessesDivergence ? 'Com divergência' : 'Enviada';
    solInst.updatedAt = new Date().toISOString();
    
    this.setSolicitacoes(sols);

    this.logAuditoria(
      operator.id,
      operator.nome,
      'Separação e Baixa Concluída',
      'Expedição',
      solInst.id,
      'Liberada para separação',
      solInst.status,
      `Remessa separada por ${operator.nome}. Gerado protocolo ${newProtocol.numero}.`
    );
  }

  // --- Protocolos Envios List ---
  static getProtocolos(): ProtocoloEnvio[] {
    return this.getStored<ProtocoloEnvio[]>('protocolos', INITIAL_PROTOCOLOS);
  }

  static setProtocolos(prts: ProtocoloEnvio[]): void {
    this.setStored<ProtocoloEnvio[]>('protocolos', prts);
  }

  // --- Recebimentos na Loja ---
  static registrarRecebimentoLoja(params: {
    solicitacaoId: string;
    itensRecebidos: {
      amostraId: string;
      quantidadeRecebida: number;
      divergencia: boolean;
      avaria: boolean;
      motivoDivergencia?: string;
    }[];
    fotos: string[];
    observacao?: string;
  }, operator: User): void {
    const sols = this.getSolicitacoes();
    const solInst = sols.find(s => s.id === params.solicitacaoId);
    if (!solInst) {
      throw new Error('Solicitação comercial vinculada não existe.');
    }

    let hasDifferences = false;
    let correctCompleteReceipt = true;

    solInst.itens = solInst.itens.map(it => {
      const resp = params.itensRecebidos.find(r => r.amostraId === it.amostraId);
      if (resp) {
        it.quantidadeRecebida = resp.quantidadeRecebida;
        if (resp.divergencia || resp.quantidadeRecebida !== it.quantidadeSeparada) {
          hasDifferences = true;
          it.status = 'divergente';
          correctCompleteReceipt = false;
          
          // auto pending case
          this.criarPendenciaAutomatica({
            tipo: 'Divergência de quantidade',
            origem: `Recepção Loja ${solInst.numero}`,
            loja: solInst.lojasDestino[0],
            amostraId: it.amostraId,
            codigoAdm: it.codigoAdm,
            responsavel: 'Guilherme Admin',
            prazo: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
            observacoes: `Divergência fatal no recebimento física da loja. Enviado do CD: ${it.quantidadeSeparada}, registrado recebido de fato: ${resp.quantidadeRecebida}. Justificativa da loja: ${resp.motivoDivergencia || 'Não informada'}`
          }, operator);
        } else if (resp.avaria) {
          hasDifferences = true;
          it.status = 'avariado';
          correctCompleteReceipt = false;

          // register damages
          this.registrarAvaria({
            amostraId: it.amostraId,
            codigoAdm: it.codigoAdm,
            descricao: it.descricao,
            marca: it.marca,
            quantidade: 1,
            local: 'Loja',
            loja: solInst.lojasDestino[0],
            descricaoAvaria: `Recebida com defeitos, riscos, avarias ou quebras físicas. Relatado por ${operator.nome}.`,
            fotos: params.fotos
          }, operator);
        } else {
          it.status = 'recebido';
        }
      }
      return it;
    });

    // Create Recebimento registry
    const receipts = this.getRecebimentos();
    const newRec: Recebimento = {
      id: `rec_${Date.now()}`,
      solicitacaoId: solInst.id,
      solicitacaoNumero: solInst.numero,
      loja: solInst.lojasDestino[0],
      gerenteId: operator.id,
      gerenteNome: operator.nome,
      status: correctCompleteReceipt ? 'Recebida' : (hasDifferences ? 'Com divergência' : 'Recebida parcialmente'),
      itens: params.itensRecebidos.map(r => {
        const matchingIt = solInst.itens.find(i => i.amostraId === r.amostraId);
        return {
          amostraId: r.amostraId,
          codigoAdm: matchingIt?.codigoAdm || '',
          descricao: matchingIt?.descricao || '',
          quantidadeSolicitada: matchingIt?.quantidadeSolicitada || 0,
          quantidadeRecebida: r.quantidadeRecebida,
          divergencia: r.divergencia,
          avaria: r.avaria,
          motivoDivergencia: r.motivoDivergencia
        };
      }),
      fotos: params.fotos,
      observacoes: params.observacao,
      createdAt: new Date().toISOString()
    };

    receipts.push(newRec);
    this.setRecebimentos(receipts);

    // Update solicitation status: Goes next to Exhibitions phase
    solInst.status = correctCompleteReceipt ? 'Exposição pendente' : (hasDifferences ? 'Com divergência' : 'Recebida parcialmente');
    solInst.updatedAt = new Date().toISOString();
    
    this.setSolicitacoes(sols);

    this.logAuditoria(
      operator.id,
      operator.nome,
      'Recebimento Registrado',
      'Lojas_Recepcao',
      solInst.id,
      'Enviada',
      solInst.status,
      `Recebimento de carga registrado por Gerente ${operator.nome}. Itens íntegros recolhidos.`
    );
  }

  static getRecebimentos(): Recebimento[] {
    return this.getStored<Recebimento[]>('recebimentos', INITIAL_RECEBIMENTOS);
  }

  static setRecebimentos(recs: Recebimento[]): void {
    this.setStored<Recebimento[]>('recebimentos', recs);
  }

  // --- Exposição e Comprovação por Fotos ---
  static getExposicoes(): Exposicao[] {
    return this.getStored<Exposicao[]>('exposicoes', INITIAL_EXPOSICOES);
  }

  static setExposicoes(exps: Exposicao[]): void {
    this.setStored<Exposicao[]>('exposicoes', exps);
  }

  static registrarComprovacaoExposicao(params: {
    solicitacaoId: string;
    amostraId: string;
    produtoExposto: 'sim' | 'não';
    localExposicao: string;
    integridadeFisica: boolean;
    limpezaConservacao: boolean;
    identificacaoCorreta: boolean;
    localizacaoAdequada: boolean;
    fotos: string[]; // required
    observacoes?: string;
  }, operator: User): void {
    if (params.fotos.length === 0) {
      throw new Error('Comprovante Obrigatório: Você deve anexar ao menos uma foto física comprovando a exposição correta na loja!');
    }

    const exps = this.getExposicoes();
    const sols = this.getSolicitacoes();
    const sol = sols.find(s => s.id === params.solicitacaoId);
    if (!sol) {
      throw new Error('Solicitação associada não foi encontrada.');
    }

    const item = sol.itens.find(i => i.amostraId === params.amostraId);
    if (!item) {
      throw new Error('Amostra solicitada não pertence a este lote.');
    }

    const newExp: Exposicao = {
      id: `exp_${Date.now()}`,
      solicitacaoId: sol.id,
      solicitacaoNumero: sol.numero,
      amostraId: item.amostraId,
      codigoAdm: item.codigoAdm,
      descricao: item.descricao,
      loja: sol.lojasDestino[0],
      produtoExposto: params.produtoExposto,
      localExposicao: params.localExposicao,
      integridadeFisica: params.integridadeFisica,
      limpezaConservacao: params.limpezaConservacao,
      identificacaoCorreta: params.identificacaoCorreta,
      localizacaoAdequada: params.localizacaoAdequada,
      fotos: params.fotos,
      status: 'Exposição comprovada', // Gerente registers it
      observacoes: params.observacoes,
      createdAt: new Date().toISOString()
    };

    exps.push(newExp);
    this.setExposicoes(exps);

    // Update general status of solicitation to 'Exposição comprovada' as completed!
    sol.status = 'Exposição comprovada';
    sol.updatedAt = new Date().toISOString();
    this.setSolicitacoes(sols);

    this.logAuditoria(
      operator.id,
      operator.nome,
      'Provação de Exposição',
      'Exposição',
      newExp.id,
      'Exposição pendente',
      'Exposição comprovada',
      `Exposição física da amostra ${item.codigoAdm} cadastrada sob fotos na loja.`
    );
  }

  static registrarComprovacoesExposicaoLote(params: {
    solicitacaoId: string;
    itens: {
      amostraId: string;
      integridadeFisica: boolean;
      limpezaConservacao: boolean;
      identificacaoCorreta: boolean;
      localizacaoAdequada: boolean;
      fotos: string[];
      observacoes: string;
    }[];
  }, operator: User): void {
    const exps = this.getExposicoes();
    const sols = this.getSolicitacoes();
    const sol = sols.find(s => s.id === params.solicitacaoId);
    if (!sol) {
      throw new Error('Solicitação associada não foi encontrada.');
    }

    params.itens.forEach((it, idx) => {
      const item = sol.itens.find(i => i.amostraId === it.amostraId);
      if (!item) {
        throw new Error(`Amostra ${it.amostraId} não pertence a este lote.`);
      }

      if (it.fotos.length === 0) {
        throw new Error(`Comprovante Obrigatório: Você deve anexar ao menos uma foto física do produto "${item.descricao}" exposto.`);
      }

      const newExp: Exposicao = {
        id: `exp_${Date.now()}_${idx}_${Math.floor(Math.random() * 1000)}`,
        solicitacaoId: sol.id,
        solicitacaoNumero: sol.numero,
        amostraId: item.amostraId,
        codigoAdm: item.codigoAdm,
        descricao: item.descricao,
        loja: sol.lojasDestino[0],
        produtoExposto: 'sim',
        localExposicao: 'Visual Merchandising da Filial',
        integridadeFisica: it.integridadeFisica,
        limpezaConservacao: it.limpezaConservacao,
        identificacaoCorreta: it.identificacaoCorreta,
        localizacaoAdequada: it.localizacaoAdequada,
        fotos: it.fotos,
        status: 'Exposição comprovada',
        observacoes: it.observacoes,
        createdAt: new Date().toISOString()
      };

      exps.push(newExp);

      this.logAuditoria(
        operator.id,
        operator.nome,
        'Provação de Exposição',
        'Exposição',
        newExp.id,
        'Exposição pendente',
        'Exposição comprovada',
        `Exposição física da amostra ${item.codigoAdm} cadastrada sob fotos na loja.`
      );
    });

    this.setExposicoes(exps);

    // Update general status of solicitation to 'Exposição comprovada' as completed!
    sol.status = 'Exposição comprovada';
    sol.updatedAt = new Date().toISOString();
    this.setSolicitacoes(sols);
  }

  static avaliarExposicao(expId: string, status: 'Exposição comprovada' | 'Exposição recusada' | 'Pendente de correção', auditor: User, feedback?: string): void {
    const exps = this.getExposicoes();
    const idx = exps.findIndex(e => e.id === expId);
    if (idx !== -1) {
      const exp = exps[idx];
      exp.status = status;
      exp.validadoPor = auditor.nome;
      exp.validatedAt = new Date().toISOString();
      if (feedback) {
        exp.observacoes = `${exp.observacoes || ''} | Auditoria: ${feedback}`;
      }
      exps[idx] = exp;
      this.setExposicoes(exps);

      if (status === 'Exposição recusada' || status === 'Pendente de correção') {
        this.criarPendenciaAutomatica({
          tipo: 'Exposição inadequada',
          origem: `Auditoria Exposição ${exp.solicitacaoNumero}`,
          loja: exp.loja,
          amostraId: exp.amostraId,
          codigoAdm: exp.codigoAdm,
          responsavel: exp.loja,
          prazo: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
          observacoes: `A exposição física da amostra ${exp.codigoAdm} foi rejeitada por ${auditor.nome}. Motivo: ${feedback || 'Não detalhado'}.`
        }, auditor);
      }
    }
  }

  // --- Conferência Mensal de Amostras ---
  static getConferencias(): ConferenciaMensal[] {
    const list = this.getStored<ConferenciaMensal[]>('conferencias', INITIAL_CONFERENCIAS);
    
    // Merge conferencias_importadas info so that templates imported via Spreadsheet
    // also display in the gestor validation, dashboard records and logs screen
    const importadas = this.getConferenciasImportadas().filter(c => c.loja.toUpperCase() !== 'GLOBAL');
    
    const merged = [...list];
    importadas.forEach(imp => {
      const idx = merged.findIndex(c => c.id === imp.id);
      if (idx !== -1) {
        merged[idx] = imp;
      } else {
        merged.push(imp);
      }
    });
    
    return merged;
  }

  static setConferencias(confs: ConferenciaMensal[]): void {
    // Keep only non-imported ones in the standard 'conferencias' storage
    const standardOnly = confs.filter(c => !c.id.startsWith('conf_store_') && c.id !== 'conf_import_global');
    this.setStored<ConferenciaMensal[]>('conferencias', standardOnly);

    // If there were any imported checklists in that array, save them to their own storage
    const importedOnly = confs.filter(c => c.id.startsWith('conf_store_') || c.id === 'conf_import_global');
    if (importedOnly.length > 0) {
      const currentImportadas = this.getConferenciasImportadas();
      const updatedImportadas = [...currentImportadas];
      importedOnly.forEach(imp => {
        const idx = updatedImportadas.findIndex(c => c.id === imp.id);
        if (idx !== -1) {
          updatedImportadas[idx] = imp;
        } else {
          updatedImportadas.push(imp);
        }
      });
      this.setConferenciasImportadas(updatedImportadas);
    }
  }

  static gerarCompetenciaMensal(competencia: string, operator: User): void {
    const list = this.getConferencias();
    // Check if duplicate
    const exists = list.some(c => c.competencia === competencia);
    if (exists) {
      throw new Error(`A conferência mensal para a competência ${competencia} já foi gerada.`);
    }

    const amostras = this.getAmostras().filter(a => a.status === 'ativo');
    const lojas = ['MATRIZ', 'CATEDRAL', 'MINEIROS', 'SAID ABDALA', 'RIO VERDE'];

    const firstBusinessDay = new Date();
    // 5th working day simulation
    const limitDate = new Date();
    limitDate.setDate(limitDate.getDate() + 7);

    lojas.forEach(loja => {
      const itemsConferencia: ConferenciaMensalItem[] = amostras.map(am => ({
        codigoAdm: am.codigoAdm,
        descricao: am.descricao,
        marca: am.marca,
        statusExposicao: 'Não exposto',
        integridadeFisica: true,
        limpeza: true,
        conservacao: true,
        identificacaoCorreta: true,
        localizacaoAdequada: true,
        fotos: []
      }));

      const newC: ConferenciaMensal = {
        id: `conf_${Date.now()}_${loja.replace(/\s+/g, '')}`,
        competencia,
        loja,
        gerenteLoja: 'Gerente da Loja',
        gerenteOperacional: 'Gerente Operacional',
        status: 'Pendente',
        prazoResposta: limitDate.toISOString().split('T')[0],
        itens: itemsConferencia,
        fotos: [],
        enviadoEm: new Date().toISOString()
      };

      list.push(newC);
    });

    this.setConferencias(list);

    this.logAuditoria(
      operator.id,
      operator.nome,
      'Conferência Mensal Lançada',
      'Auditoria_Mensal',
      competencia,
      '',
      '',
      `Gerada e disparada a conferência nacional de amostras obrigatórias para o mês ${competencia}`
    );
  }

  static responderConferenciaMensal(confId: string, params: {
    itensResult: ConferenciaMensalItem[];
    fotosComplementares: string[];
    observacao?: string;
  }, operator: User): void {
    const confs = this.getConferencias();
    const idx = confs.findIndex(c => c.id === confId);
    if (idx === -1) {
      throw new Error('Conferência mensal solicitada não foi encontrada.');
    }

    const conf = confs[idx];
    conf.itens = params.itensResult;
    conf.fotos = params.fotosComplementares;
    conf.observacoes = params.observacao;
    conf.status = 'Respondida';
    conf.respondidoEm = new Date().toISOString();
    
    // Auto generate pendencies for bad statuses
    params.itensResult.forEach(it => {
      if (it.statusExposicao === 'Não exposto' || it.statusExposicao === 'Avariado' || it.statusExposicao === 'Exposição inadequada') {
        this.criarPendenciaAutomatica({
          tipo: it.statusExposicao === 'Avariado' ? 'Produto avariado' : 'Produto não exposto',
          origem: `Conferência Mensal ${conf.competencia}`,
          loja: conf.loja,
          codigoAdm: it.codigoAdm,
          responsavel: 'Ivan Controlador',
          prazo: new Date(Date.now() + 86400000 * 5).toISOString().split('T')[0],
          observacoes: `Conferência Mensal ${conf.competencia}: Item obrigatório ${it.descricao} com status crítico de exposição registrado como [${it.statusExposicao}] pela Loja.`
        }, operator);
      }
    });

    confs[idx] = conf;
    this.setConferencias(confs);

    this.logAuditoria(
      operator.id,
      operator.nome,
      'Resposta de Conferência',
      'Auditoria_Mensal',
      confId,
      'Pendente',
      'Respondida',
      `Resposta de inventário de gôndola para competência ${conf.competencia} submetida pela filial.`
    );
  }

  // --- Controle de Avarias ---
  static getAvarias(): Avaria[] {
    return this.getStored<Avaria[]>('avarias', INITIAL_AVARIAS);
  }

  static setAvarias(avs: Avaria[]): void {
    this.setStored<Avaria[]>('avarias', avs);
  }

  static registrarAvaria(params: Omit<Avaria, 'id' | 'status' | 'createdAt' | 'updatedAt' | 'responsavelId' | 'responsavelNome'>, operator: User): Avaria {
    const avs = this.getAvarias();
    const newAv: Avaria = {
      ...params,
      id: `av_${Date.now()}`,
      responsavelId: operator.id,
      responsavelNome: operator.nome,
      status: 'Registrada',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    avs.unshift(newAv);
    this.setAvarias(avs);

    this.logAuditoria(
      operator.id,
      operator.nome,
      'Registro de Avaria',
      'Sinistro',
      newAv.id,
      '',
      JSON.stringify(newAv),
      `Avaria física catalogada para o produto ${newAv.codigoAdm} no setor ${newAv.local}`
    );

    // auto pending ticket for avaria
    this.criarPendenciaAutomatica({
      tipo: 'Produto avariado',
      origem: `Ficha Avaria ${newAv.id}`,
      loja: newAv.loja || 'CD Principal',
      amostraId: newAv.amostraId,
      codigoAdm: newAv.codigoAdm,
      responsavel: 'Ivan Controlador',
      prazo: new Date(Date.now() + 86400000 * 4).toISOString().split('T')[0],
      observacoes: `Defeito / Quebra física sob fiscalização: ${newAv.descricaoAvaria}.`
    }, operator);

    return newAv;
  }

  static validarAvaria(avId: string, acao: 'Aprovada para baixa' | 'Reposição solicitada' | 'Resolvida', auditor: User): void {
    const avs = this.getAvarias();
    const idx = avs.findIndex(a => a.id === avId);
    if (idx !== -1) {
      const old = avs[idx];
      old.status = acao;
      old.updatedAt = new Date().toISOString();
      avs[idx] = old;
      this.setAvarias(avs);

      this.logAuditoria(
        auditor.id,
        auditor.nome,
        'Validação de Avaria',
        'Sinistro',
        avId,
        'Registrada',
        acao,
        `Ficha de perda validada para status [${acao}].`
      );

      // Regra: "Quando aprovada para baixa, gerar movimentação de avaria no estoque"
      if (acao === 'Aprovada para baixa') {
        try {
          this.realizarMovimentacaoEstoqueCompleta({
            amostraId: old.amostraId,
            tipo: 'avaria',
            quantidade: old.quantidade,
            lojaDestino: old.loja,
            observacoes: `Avaria validada e expurgada do saldo pelo auditor. Registro #${old.id}`
          }, auditor);
        } catch (err) {
          console.warn('Silent fallback for stock clearance when index is isolated: ', err);
        }
      }
    }
  }

  // --- Pendências ---
  static getPendencias(): Pendencia[] {
    const list = this.getStored<Pendencia[]>('pendencias', INITIAL_PENDENCIAS);
    let healed = false;
    const result = list.map(p => {
      let changed = false;
      if (!p.detalhes) {
        const amostras = this.getAmostras();
        const amostra = amostras.find(a => a.id === p.amostraId || a.codigoAdm === p.codigoAdm);
        const prodName = amostra ? amostra.descricao : 'Amostra J. Cruzeiro';

        p.detalhes = {
          produtoNome: prodName,
          codigoAdm: p.codigoAdm || '',
          operadorResponsavel: p.responsavel || 'Operador',
          quantidadeSolicitada: 1,
          quantidadeSeparada: 1,
          quantidadeRecebida: 1,
          justificativaOperador: p.observacoes || 'Sem justificativa detalhada.'
        };
        changed = true;
      }
      if (!p.timeline) {
        p.timeline = p.historico ? p.historico.map(h => ({
          responsavelNome: h.usuario,
          perfil: 'Colaborador',
          mensagem: h.comentario,
          dataInteracao: h.data
        })) : [];
        changed = true;
      }
      if (changed) healed = true;
      return p;
    });
    if (healed) {
      this.setStored<Pendencia[]>('pendencias', result);
    }
    return result;
  }

  static setPendencias(pends: Pendencia[]): void {
    this.setStored<Pendencia[]>('pendencias', pends);
  }

  static criarPendenciaAutomatica(params: {
    tipo: Pendencia['tipo'];
    origem: string;
    loja: string;
    amostraId?: string;
    codigoAdm: string;
    responsavel: string;
    prazo: string;
    observacoes: string;
  }, operator: User): Pendencia {
    const pends = this.getPendencias();
    const amostras = this.getAmostras();
    const amostra = amostras.find(a => a.id === params.amostraId || a.codigoAdm === params.codigoAdm);
    const produtoNome = amostra ? amostra.descricao : 'Amostra J. Cruzeiro';

    let qtySolicitada = 1;
    let qtySeparada = 1;
    let qtyRecebida = 1;
    
    const matches = params.origem.match(/SOL-\d{4}-\d+/);
    if (matches) {
      const solNum = matches[0];
      const sol = this.getSolicitacoes().find(s => s.numero === solNum);
      if (sol) {
        const item = sol.itens.find(it => it.codigoAdm === params.codigoAdm || it.amostraId === params.amostraId);
        if (item) {
          qtySolicitada = item.quantidadeSolicitada || 1;
          qtySeparada = item.quantidadeSeparada !== undefined ? item.quantidadeSeparada : qtySolicitada;
          qtyRecebida = item.quantidadeRecebida !== undefined ? item.quantidadeRecebida : qtySeparada;
        }
      }
    }

    const newPend: Pendencia = {
      id: `pend_${Date.now()}_${Math.floor(Math.random()*100)}`,
      tipo: params.tipo,
      origem: params.origem,
      loja: params.loja,
      amostraId: params.amostraId,
      codigoAdm: params.codigoAdm,
      responsavel: params.responsavel,
      prazo: params.prazo,
      status: 'Aberta',
      observacoes: params.observacoes,
      fotos: [],
      historico: [
        {
          data: new Date().toISOString(),
          usuario: operator.nome,
          comentario: `Pendência originada automaticamente. Motivo: ${params.observacoes}`
        }
      ],
      detalhes: {
        produtoNome,
        codigoAdm: params.codigoAdm,
        operadorResponsavel: params.responsavel,
        quantidadeSolicitada: qtySolicitada,
        quantidadeSeparada: qtySeparada,
        quantidadeRecebida: qtyRecebida,
        justificativaOperador: params.observacoes
      },
      timeline: [
        {
          responsavelNome: operator.nome,
          perfil: operator.perfil,
          mensagem: `Pendência originada automaticamente. Motivo: ${params.observacoes}`,
          dataInteracao: new Date().toISOString()
        }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    pends.unshift(newPend);
    this.setPendencias(pends);
    return newPend;
  }

  static interagirPendencia(id: string, comentario: string, status: Pendencia['status'], operator: User): void {
    const pends = this.getPendencias();
    const idx = pends.findIndex(p => p.id === id);
    if (idx !== -1) {
      const p = pends[idx];
      p.status = status;
      p.historico.push({
        data: new Date().toISOString(),
        usuario: operator.nome,
        comentario
      });
      if (!p.timeline) {
        p.timeline = [];
      }
      p.timeline.push({
        responsavelNome: operator.nome,
        perfil: operator.perfil,
        mensagem: comentario,
        dataInteracao: new Date().toISOString()
      });
      p.updatedAt = new Date().toISOString();
      pends[idx] = p;
      this.setPendencias(pends);

      this.logAuditoria(
        operator.id,
        operator.nome,
        'Acompanhamento de Pendência',
        'Pendências',
        id,
        '',
        status,
        `Novo comentário e status [${status}] para pendência correlacionada.`
      );
    }
  }

  // --- Logs e Auditoria ---
  static getLogs(): LogAuditoria[] {
    return this.getStored<LogAuditoria[]>('logs', INITIAL_LOGS);
  }

  static setLogs(logs: LogAuditoria[]): void {
    this.setStored<LogAuditoria[]>('logs', logs);
  }

  static logAuditoria(
    usuarioId: string, 
    usuarioNome: string, 
    acao: string, 
    modulo: string, 
    registroId: string, 
    prevValue?: string, 
    newValue?: string, 
    observacao?: string
  ): void {
    const logs = this.getLogs();
    const newLog: LogAuditoria = {
      id: `log_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      usuarioId,
      usuarioNome,
      acao,
      modulo,
      registroId,
      valorAnterior: prevValue,
      valorNovo: newValue,
      observacao,
      createdAt: new Date().toISOString()
    };
    
    logs.unshift(newLog); // latest on top
    
    // limit logs to 500 for local storage quota limits safety
    if (logs.length > 500) {
      logs.splice(500);
    }
    
    this.setLogs(logs);
  }

  // --- Veículos ---
  static getVeiculos(): { id: string; placa: string; modelo: string }[] {
    return this.getStored<{ id: string; placa: string; modelo: string }[]>('veiculos', INITIAL_VEICULOS);
  }

  static setVeiculos(veiculos: { id: string; placa: string; modelo: string }[]): void {
    this.setStored<{ id: string; placa: string; modelo: string }[]>('veiculos', veiculos);
  }

  static addVeiculo(placa: string, modelo: string): void {
    const list = this.getVeiculos();
    list.push({ id: `veic_${Date.now()}`, placa, modelo });
    this.setVeiculos(list);
    this.notify();
  }

  static deleteVeiculo(id: string): void {
    const list = this.getVeiculos();
    const filtered = list.filter(v => v.id !== id);
    this.setVeiculos(filtered);
    this.notify();
  }

  // --- Motoristas ---
  static getMotoristas(): { id: string; nome: string; cnh: string }[] {
    return this.getStored<{ id: string; nome: string; cnh: string }[]>('motoristas', INITIAL_MOTORISTAS);
  }

  static setMotoristas(motoristas: { id: string; nome: string; cnh: string }[]): void {
    this.setStored<{ id: string; nome: string; cnh: string }[]>('motoristas', motoristas);
  }

  static addMotorista(nome: string, cnh: string): void {
    const list = this.getMotoristas();
    list.push({ id: `mot_${Date.now()}`, nome, cnh });
    this.setMotoristas(list);
    this.notify();
  }

  static deleteMotorista(id: string): void {
    const list = this.getMotoristas();
    const filtered = list.filter(m => m.id !== id);
    this.setMotoristas(filtered);
    this.notify();
  }

  // --- Conferências de Checklist Importadas por Planilha ---
  static getConferenciasImportadas(): ConferenciaMensal[] {
    return this.getStored<ConferenciaMensal[]>('conferencias_importadas', []);
  }

  static setConferenciasImportadas(confs: ConferenciaMensal[]): void {
    const oldConfs = this.getConferenciasImportadas();
    this.setStored<ConferenciaMensal[]>('conferencias_importadas', confs);
    
    // Deletar do firestore caso tenha sido excluído da lista
    const newIds = new Set(confs.map(c => c.id));
    oldConfs.forEach(c => {
      if (!newIds.has(c.id)) {
        deleteDoc(doc(db, 'conferencias_importadas', c.id)).catch(err => {
          console.warn(`Erro enviando delete para Firestore em conferencias_importadas/${c.id}:`, err);
        });
      }
    });

    this.notify();
  }

  // --- Entradas Pendentes ---
  static getEntradasPendentes(): CustomPendingEntry[] {
    return this.getStored<CustomPendingEntry[]>('entradas_pendentes', INITIAL_ENTRADAS_PENDENTES);
  }

  static setEntradasPendentes(items: CustomPendingEntry[]): void {
    const oldItems = this.getEntradasPendentes();
    this.setStored<CustomPendingEntry[]>('entradas_pendentes', items);

    // Deletar do firestore caso tenha sido excluído da lista
    const newIds = new Set(items.map(it => it.id));
    oldItems.forEach(it => {
      if (!newIds.has(it.id)) {
        deleteDoc(doc(db, 'entradas_pendentes', it.id)).catch(err => {
          console.warn(`Erro enviando delete para Firestore em entradas_pendentes/${it.id}:`, err);
        });
      }
    });

    this.notify();
  }

  static clearEntradasPendentes(): void {
    const items = this.getEntradasPendentes();
    items.forEach(it => {
      deleteDoc(doc(db, 'entradas_pendentes', it.id)).catch(err => {
        console.warn(`Erro limpando entradas_pendentes/${it.id}:`, err);
      });
    });
    this.setStored<CustomPendingEntry[]>('entradas_pendentes', []);
    this.notify();
  }
}
