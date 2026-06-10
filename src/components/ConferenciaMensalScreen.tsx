import React, { useState, useEffect, useRef } from 'react';
import { 
  Camera, FileSpreadsheet, CheckCircle, AlertCircle, 
  Trash2, HelpCircle, Smartphone, Check, X,
  Zap, RotateCw, LogOut, Play, List, ShieldAlert, Monitor, Search,
  XCircle, Download
} from 'lucide-react';
import { User, ConferenciaMensal, ConferenciaMensalItem } from '../types';
import { DatabaseService } from '../services/db';
import { barcodeScannerService } from '../services/barcodeScannerService';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

interface ConferenciaMensalScreenProps {
  user: User;
  onNavigateTo?: (page: string) => void;
  onChangeGerenciamentoTab?: (tab: 'usuarios' | 'motoristas' | 'veiculos' | 'planilhas') => void;
}

export default function ConferenciaMensalScreen({ 
  user, 
  onNavigateTo, 
  onChangeGerenciamentoTab 
}: ConferenciaMensalScreenProps) {
  
  // --- Device & Simulator States ---
  const [isMobile, setIsMobile] = useState(false);
  const [deviceOverride, setDeviceOverride] = useState(false); // To test mobile inside browser frame
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'verified' | 'pending' | 'not_found' | 'damaged'>('all');
  
  // Checking active store (operador.loja or selectedLoja)
  const filterLojas = ['MATRIZ', 'CATEDRAL', 'MINEIROS', 'RHARO', 'SAID ABDALA', 'RIO VERDE'];
  const [selectedLoja, setSelectedLoja] = useState<string>(
    user.loja && filterLojas.includes(user.loja.toUpperCase()) 
      ? user.loja.toUpperCase() 
      : 'MATRIZ'
  );

  // States
  const [conferencias, setConferencias] = useState<ConferenciaMensal[]>([]);
  const [auditState, setAuditState] = useState<'landing' | 'scanning'>('landing');
  
  // Scan result overlays & audio feedbacks
  const [feedbackOverlay, setFeedbackOverlay] = useState<{
    visible: boolean;
    success: boolean;
    message: string;
    productName?: string;
    codigoAdm?: string;
    barcode: string;
  } | null>(null);

  const [pendingConfirmItem, setPendingConfirmItem] = useState<{
    codigoAdm: string;
    descricao: string;
    barcode: string;
  } | null>(null);

  // Photos of damaged products / Capture states
  const [avariaCaptureItem, setAvariaCaptureItem] = useState<{
    codigoAdm: string;
    descricao: string;
    barcode: string;
  } | null>(null);
  const [damageStream, setDamageStream] = useState<MediaStream | null>(null);
  const damageVideoRef = useRef<HTMLVideoElement | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  // Scanner references
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scannerId = "conferencia-barcode-reader-div-mobile-fullscreen";
  const feedbackTimeoutRef = useRef<any>(null);
  const isScannerRunningRef = useRef<boolean>(false);

  // Detect mobile or small screens
  useEffect(() => {
    const checkDevice = () => {
      const hasTouch = navigator.maxTouchPoints > 0 || 'ontouchstart' in window;
      const isUserAgentMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const isSmall = window.innerWidth < 1024;
      setIsMobile(isUserAgentMobile || (isSmall && hasTouch));
    };
    checkDevice();
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  // Fetch / Sync imported templates
  const loadData = () => {
    const list = DatabaseService.getConferenciasImportadas();
    setConferencias(list);
  };

  useEffect(() => {
    loadData();
    const unsub = DatabaseService.subscribe(() => {
      loadData();
    });
    return () => unsub();
  }, []);

  // List all available imported competencies
  const availableCompetencias = Array.from(
    new Set(conferencias.filter(c => c.loja.toUpperCase() === 'GLOBAL').map(c => c.competencia))
  ).filter(Boolean) as string[];

  const [selectedCompetencia, setSelectedCompetencia] = useState<string>('');
  const [exportMenuOpen, setExportMenuOpen] = useState(false);

  useEffect(() => {
    if (availableCompetencias.length > 0) {
      if (!selectedCompetencia || !availableCompetencias.includes(selectedCompetencia)) {
        setSelectedCompetencia(availableCompetencias[0]);
      }
    }
  }, [conferencias, availableCompetencias, selectedCompetencia]);

  // Ensure active store has its own copy of checklist instantiated from the GLOBAL sheet
  const globalConf = conferencias.find(
    c => c.loja.toUpperCase() === 'GLOBAL' && c.competencia === selectedCompetencia
  ) || null;

  const activeConf = conferencias.find(
    c => c.loja.toUpperCase() === selectedLoja.toUpperCase() && c.competencia === selectedCompetencia
  ) || null;

  useEffect(() => {
    // If global spreadsheet is imported but current store has no instance, instantiate it
    if (globalConf && !activeConf && selectedCompetencia) {
      const cleanLoja = selectedLoja.toLowerCase().replace(/\s+/g, '');
      const cleanComp = selectedCompetencia.replace(/\s+/g, '').replace('/', '_');
      const newStoreConf: ConferenciaMensal = {
        id: `conf_store_${cleanLoja}_${cleanComp}`,
        competencia: selectedCompetencia,
        loja: selectedLoja,
        gerenteLoja: user.nome,
        gerenteOperacional: 'Guilherme Admin',
        status: 'Pendente',
        prazoResposta: globalConf.prazoResposta || new Date(Date.now() + 86400000 * 15).toISOString().split('T')[0],
        itens: globalConf.itens.map(it => ({ ...it, verificado: false, verificadoEm: undefined })),
        fotos: [],
        enviadoEm: new Date().toISOString()
      };
      
      const updatedList = [...conferencias, newStoreConf];
      DatabaseService.setConferenciasImportadas(updatedList);
      setConferencias(updatedList);
    }
  }, [globalConf, activeConf, selectedLoja, selectedCompetencia, conferencias, user.nome]);

  // Clean scanner on unmount
  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  // Format competition PT-BR text helper
  const formatCompetencia = (compStr: string) => {
    if (!compStr) return "junho - 2026";
    const parts = compStr.split('/');
    if (parts.length === 2) {
      const monthIndex = parseInt(parts[0], 10);
      const months = [
        "janeiro", "fevereiro", "março", "abril", "maio", "junho", 
        "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"
      ];
      if (monthIndex >= 1 && monthIndex <= 12) {
        return `${months[monthIndex - 1]} - ${parts[1]}`;
      }
    }
    return compStr;
  };

  const currentMonthDisplay = formatCompetencia(globalConf?.competencia || "06/2026");

  // Helper to save checklist updates in state and Firestore
  const saveChecklist = (updatedItens: any[]) => {
    if (!activeConf) return;
    const hasUnfinished = updatedItens.some(i => !i.verificado);
    const updatedConf: ConferenciaMensal = {
      ...activeConf,
      itens: updatedItens,
      status: hasUnfinished ? 'Pendente' : 'Respondida',
      respondidoEm: new Date().toISOString()
    };

    const allConfs = DatabaseService.getConferenciasImportadas();
    const sIdx = allConfs.findIndex(c => c.id === activeConf.id);
    if (sIdx !== -1) {
      allConfs[sIdx] = updatedConf;
    } else {
      allConfs.push(updatedConf);
    }

    DatabaseService.setConferenciasImportadas(allConfs);
    setConferencias(allConfs);
  };

  const handleConfirmCondition = (isPerfect: boolean) => {
    if (!pendingConfirmItem || !activeConf) return;

    if (!isPerfect) {
      // Re-route to the avaria camera capture flow instead of instant verification
      handleAvariaInitiated();
      return;
    }

    const targetAdm = pendingConfirmItem.codigoAdm;

    // Update active checklist items as verified and in perfect condition
    const updatedItens = activeConf.itens.map(it => {
      if (it.codigoAdm === targetAdm) {
        return {
          ...it,
          verificado: true,
          verificadoEm: new Date().toISOString(),
          integridadeFisica: true,
          conservacao: true,
          avariado: false
        };
      }
      return it;
    });

    saveChecklist(updatedItens);

    // Reset confirmation state
    setPendingConfirmItem(null);
  };

  // Web Audio pleasant notification sounds (pleasant positive beep & disappointed low buzz)
  const playScreechingAudio = (success: boolean) => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      
      if (success) {
        // Ambient positive clean soft chord jump
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime); // A5 note
        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.16);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.18);
        
        setTimeout(() => {
          try {
            const osc2 = ctx.createOscillator();
            const gain2 = ctx.createGain();
            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(1108.73, ctx.currentTime); // C#6 note
            gain2.gain.setValueAtTime(0, ctx.currentTime);
            gain2.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 0.04);
            gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
            osc2.connect(gain2);
            gain2.connect(ctx.destination);
            osc2.start();
            osc2.stop(ctx.currentTime + 0.25);
          } catch(e){}
        }, 90);
      } else {
        // Low and quiet warm buzzer sound (singelo, gentle without harsh squeals)
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle'; // Smooth muffled wave
        osc.frequency.setValueAtTime(140, ctx.currentTime); // Low pitch
        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
      }
    } catch(e) {
      console.warn("Audio Context blocked or unsupported:", e);
    }
  };

  // Process Scanned Code against Active Store Checklist (instantiated from dynamic Excel global sheet)
  const handleBarcodeScanned = (rawCode: string) => {
    const cleanBar = rawCode.trim();
    if (!cleanBar) return;

    // Reset previous feedback timeout
    if (feedbackTimeoutRef.current) {
      clearTimeout(feedbackTimeoutRef.current);
    }

    if (!activeConf) {
      setFeedbackOverlay({
        visible: true,
        success: false,
        message: "Nenhuma lista importada encontrada. Peça para o Admin salvar a planilha global.",
        barcode: cleanBar
      });
      playScreechingAudio(false);
      
      feedbackTimeoutRef.current = setTimeout(() => {
        setFeedbackOverlay(null);
      }, 2500);
      return;
    }

    // Extract numeric digits for clean validation from left-to-right matching
    const cleanDigits = cleanBar.replace(/\D/g, '');

    const itemIndex = activeConf.itens.findIndex(it => {
      // Clean ADM from the checklist item if any points remain, and prepend "00"
      const expected00Adm = ("00" + it.codigoAdm).replace(/\./g, "").trim();
      const expectedDigits = expected00Adm.replace(/\D/g, '');

      // Check left-to-right (if extracted read numbers present the 00ADM code of the product)
      if (expectedDigits && cleanDigits.includes(expectedDigits)) {
        return true;
      }
      
      // Fallback to substring matching on raw barcode
      if (cleanBar.toLowerCase().includes(expected00Adm.toLowerCase())) {
        return true;
      }
      return false;
    });

    if (itemIndex !== -1) {
      const matchedItem = activeConf.itens[itemIndex];

      // Play success audio
      playScreechingAudio(true);

      // Trigger SUCCESS Feedback overlay
      setFeedbackOverlay({
        visible: true,
        success: true,
        message: "Produto encontrado! Confirme o estado.",
        productName: matchedItem.descricao,
        codigoAdm: matchedItem.codigoAdm,
        barcode: cleanBar
      });

      // Setup pop-up/prompt balloon for quality validation
      setPendingConfirmItem({
        codigoAdm: matchedItem.codigoAdm,
        descricao: matchedItem.descricao,
        barcode: cleanBar
      });
    } else {
      // Trigger MISMATCH Feedback
      setFeedbackOverlay({
        visible: true,
        success: false,
        message: "O produto não está presente nesse checklist",
        barcode: cleanBar
      });
      playScreechingAudio(false);
    }

    // Auto-dim / clear feedback layout after 2.8s for seamless continuous scanning
    feedbackTimeoutRef.current = setTimeout(() => {
      setFeedbackOverlay(null);
    }, 2800);
  };

  // Start Camera Stream
  const startScanner = async () => {
    setFeedbackOverlay(null);
    setAuditState('scanning');

    setTimeout(async () => {
      try {
        if (!videoRef.current) {
          console.error("Null videoElement reference.");
          return;
        }

        barcodeScannerService.onDetected((result) => {
          handleBarcodeScanned(result.value);
        });

        await barcodeScannerService.start(videoRef.current, {
          debug: true,
          formats: ['EAN13', 'EAN8', 'UPCA', 'UPCE', 'Code128', 'Code39', 'ITF', 'QRCode']
        });
        isScannerRunningRef.current = true;
      } catch (err) {
        console.error("Camera startup error", err);
        alert("Não foi possível acessar a câmera do dispositivo. Verifique as permissões de vídeo de seu navegador.");
        setAuditState('landing');
      }
    }, 250);
  };

  // Stop Camera Stream
  const stopScanner = async () => {
    try {
      await barcodeScannerService.stop();
      isScannerRunningRef.current = false;
    } catch (e) {
      console.error("Stopping scan error: ", e);
    }
  };

  const handleExitAudit = () => {
    stopScanner();
    setAuditState('landing');
  };

  // Photos of damaged products / Capture handlers
  const startDamageCamera = async (targetItem: { codigoAdm: string; descricao: string; barcode: string }) => {
    try {
      const constraints = {
        video: { facingMode: { ideal: "environment" } },
        audio: false
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setDamageStream(stream);
      setTimeout(async () => {
        if (damageVideoRef.current) {
          damageVideoRef.current.srcObject = stream;
          damageVideoRef.current.setAttribute("playsinline", "true");
          try {
            await damageVideoRef.current.play();
          } catch (e) {
            console.error("error playing video stream:", e);
          }
        }
      }, 300);
    } catch (err) {
      console.error("Error starting damage camera:", err);
      alert("Não foi possível acessar a câmera para fotos de avaria. Verifique as permissões de mídia.");
      setAvariaCaptureItem(null);
    }
  };

  const stopDamageCamera = () => {
    if (damageStream) {
      try {
        damageStream.getTracks().forEach(track => track.stop());
      } catch (e) {
        console.error("error stopping tracks:", e);
      }
      setDamageStream(null);
    }
  };

  const handleCaptureAvariaPhoto = () => {
    if (!avariaCaptureItem || !activeConf) return;

    let capturedBase64 = "";
    if (damageVideoRef.current) {
      try {
        const video = damageVideoRef.current;
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          capturedBase64 = canvas.toDataURL("image/jpeg", 0.75);
        }
      } catch (err) {
        console.error("Error drawing video frame to canvas:", err);
      }
    }

    const targetAdm = avariaCaptureItem.codigoAdm;

    const updatedItens = activeConf.itens.map(it => {
      if (it.codigoAdm === targetAdm) {
        return {
          ...it,
          verificado: true,
          verificadoEm: new Date().toISOString(),
          integridadeFisica: false,
          conservacao: false,
          avariado: true,
          fotoUrl: capturedBase64,
          statusExposicao: 'Avariado' as const
        };
      }
      return it;
    });

    saveChecklist(updatedItens);

    try {
      const titleOrigem = `Conferência ${activeConf.competencia} - ${activeConf.loja}`;
      DatabaseService.criarPendenciaAutomatica({
        tipo: 'Divergência de conferência mensal',
        origem: titleOrigem,
        loja: activeConf.loja,
        codigoAdm: targetAdm,
        responsavel: user.nome,
        prazo: new Date(Date.now() + 86400000 * 5).toISOString().split('T')[0], // 5 days
        observacoes: `Produto: ${avariaCaptureItem.descricao} (ADM: ${targetAdm}) relatado com avaria/danificado (NÃO está em perfeitas condições) pelo operador ${user.nome} durante conferência mensal de ${activeConf.competencia}.`
      }, user);
    } catch (err) {
      console.error("Erro ao gerar pendência automática de avaria:", err);
    }

    stopDamageCamera();
    setAvariaCaptureItem(null);
    setStatusFilter('damaged');

    // If scanner was previously running, resume it
    if (auditState === 'scanning') {
      startScanner();
    }
  };

  const handleAvariaInitiated = () => {
    if (!pendingConfirmItem) return;
    const itemToCapture = pendingConfirmItem;
    setPendingConfirmItem(null); // Clear confirmation balloon
    stopScanner(); // Stop barcode scanner camera
    setAvariaCaptureItem(itemToCapture);
    startDamageCamera(itemToCapture);
  };

  const handleResetChecklist = () => {
    if (!activeConf) return;
    if (confirm(`Deseja limpar as verificações e reiniciar o checklist para a loja ${selectedLoja}?`)) {
      const resetItens = activeConf.itens.map(it => ({
        ...it,
        verificado: false,
        verificadoEm: undefined,
        integridadeFisica: true,
        naoEncontrado: false,
        statusExposicao: 'Não exposto' as const
      }));

      const updated = {
        ...activeConf,
        itens: resetItens,
        status: 'Pendente' as const
      };

      const all = [...conferencias];
      const idx = all.findIndex(c => c.id === activeConf.id);
      if (idx !== -1) {
        all[idx] = updated;
      }
      DatabaseService.setConferenciasImportadas(all);
      setConferencias(all);
      setFeedbackOverlay(null);
      setPendingConfirmItem(null);
    }
  };

  // Render variables
  const isCurrentlyMobile = isMobile || deviceOverride;
  const itemsList = activeConf ? activeConf.itens : [];
  const totalItems = itemsList.length;
  const verifiedCount = itemsList.filter(i => i.verificado && !i.naoEncontrado && !i.avariado).length;
  const notFoundCount = itemsList.filter(i => i.naoEncontrado).length;
  const damagedCount = itemsList.filter(i => i.avariado).length;
  const pendingCount = itemsList.filter(i => !i.verificado && !i.naoEncontrado && !i.avariado).length;
  const progressPercent = totalItems > 0 ? Math.round((itemsList.filter(i => i.verificado).length / totalItems) * 100) : 0;

  // Manual Check toggle helper
  const handleManualVerify = (itemCodigoAdm: string, verify: boolean) => {
    if (!activeConf) return;
    const item = activeConf.itens.find(it => it.codigoAdm === itemCodigoAdm);
    if (!item) return;

    if (verify) {
      playScreechingAudio(true);
      setPendingConfirmItem({
        codigoAdm: item.codigoAdm,
        descricao: item.descricao,
        barcode: item.codigoBarras || `00${item.codigoAdm}`
      });
    } else {
      const updatedItens = activeConf.itens.map(it => {
        if (it.codigoAdm === itemCodigoAdm) {
          return {
            ...it,
            verificado: false,
            verificadoEm: undefined,
            integridadeFisica: true,
            naoEncontrado: false,
            avariado: false,
            fotoUrl: undefined
          };
        }
        return it;
      });
      saveChecklist(updatedItens);
    }
  };

  // Mark as not found helper
  const handleMarkAsNotFound = (itemCodigoAdm: string, notFound: boolean) => {
    if (!activeConf) return;
    const updatedItens = activeConf.itens.map(it => {
      if (it.codigoAdm === itemCodigoAdm) {
        return {
          ...it,
          verificado: notFound,
          naoEncontrado: notFound,
          avariado: false,
          fotoUrl: undefined,
          verificadoEm: notFound ? new Date().toISOString() : undefined,
          statusExposicao: notFound ? ('Produto inexistente' as const) : ('Não exposto' as const)
        };
      }
      return it;
    });
    saveChecklist(updatedItens);
  };

  // Export functions
  const exportToPDF = () => {
    try {
      const doc = new jsPDF() as any;
      
      // Title and meta info
      doc.setFontSize(16);
      doc.setTextColor(10, 29, 55); // #0A1D37
      doc.text(`J. Cruzeiro - Conferência Mensal`, 14, 20);
      
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text(`Filial: ${selectedLoja} | Status: ${statusFilter.toUpperCase()}`, 14, 26);
      doc.text(`Competência: ${formatCompetencia(selectedCompetencia)} (${selectedCompetencia})`, 14, 31);
      doc.text(`Data de Exportação: ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}`, 14, 36);
      
      const tableHeaders = [['Código ADM', 'Descrição do Produto', 'Código de Barras', 'Status']];
      const tableRows = filteredItems.map(item => {
        const status = item.avariado 
          ? 'AVARIADO' 
          : item.naoEncontrado 
            ? 'NÃO ENCONTRADO' 
            : item.verificado 
              ? 'AUDITADO' 
              : 'PENDENTE';
        return [
          item.codigoAdm,
          item.descricao,
          item.codigoBarras || 'Sem EAN',
          status
        ];
      });

      doc.autoTable({
        startY: 42,
        head: tableHeaders,
        body: tableRows,
        theme: 'striped',
        headStyles: { fillColor: [10, 29, 55] }, // J Cruzeiro corporate blue
        columnStyles: {
          0: { fontStyle: 'bold', width: 30 },
          1: { width: 90 },
          2: { width: 35 },
          3: { fontStyle: 'bold', width: 35 }
        },
        styles: { fontSize: 9 }
      });

      doc.save(`Conferencia_${selectedLoja}_${selectedCompetencia || 'Filtro'}_${statusFilter}.pdf`);
    } catch (err) {
      console.error(err);
      alert('Erro ao gerar relatório em PDF.');
    }
  };

  const exportToExcel = () => {
    try {
      // Prepare plain objects for XLSX conversion
      const dataToExport = filteredItems.map(item => {
        const status = item.avariado 
          ? 'AVARIADO' 
          : item.naoEncontrado 
            ? 'NÃO ENCONTRADO' 
            : item.verificado 
              ? 'AUDITADO' 
              : 'PENDENTE';
        return {
          'Código ADM': item.codigoAdm,
          'Descrição do Produto': item.descricao,
          'Marca/Categoria': item.marca || '',
          'Código de Barras (EAN)': item.codigoBarras || '',
          'Status': status,
          'Data da Verificação': item.verificadoEm ? new Date(item.verificadoEm).toLocaleString('pt-BR') : ''
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Checklist Auditado');
      
      // Auto-fit columns helper
      const max_cols = [
        { wch: 15 }, // Código ADM
        { wch: 45 }, // Descrição do Produto
        { wch: 18 }, // Marca
        { wch: 20 }, // EAN
        { wch: 15 }, // Status
        { wch: 22 }  // Data
      ];
      worksheet['!cols'] = max_cols;

      XLSX.writeFile(workbook, `Conferencia_${selectedLoja}_${selectedCompetencia || 'Filtro'}_${statusFilter}.xlsx`);
    } catch (err) {
      console.error(err);
      alert('Erro ao exportar planilha Excel.');
    }
  };

  // Filtered Checklist items
  const filteredItems = itemsList.filter(item => {
    const matchesSearch = 
      item.descricao.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.codigoAdm.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.codigoBarras || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    if (statusFilter === 'verified') return matchesSearch && item.verificado && !item.naoEncontrado && !item.avariado;
    if (statusFilter === 'pending') return matchesSearch && !item.verificado && !item.naoEncontrado && !item.avariado;
    if (statusFilter === 'not_found') return matchesSearch && item.naoEncontrado;
    if (statusFilter === 'damaged') return matchesSearch && item.avariado;
    return matchesSearch;
  });

  // 1. DESKTOP VIEW PANEL (Rich dashboard view instead of a boring hard lock)
  if (!isCurrentlyMobile) {
    return (
      <div className="flex flex-col space-y-6 max-w-6xl mx-auto p-4 animate-in fade-in duration-200">
        
        {/* Audit Status KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 font-sans">
          <div className="bg-white p-4.5 rounded-xl border border-slate-200/90 shadow-xs space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400">Total de Produtos Importados</span>
            <div className="flex items-baseline justify-between pt-1">
              <strong className="text-2xl font-black text-[#0A1D37]">{totalItems}</strong>
              <div className="p-1 px-2 bg-blue-50 border border-blue-100 rounded text-[9.5px] font-bold text-blue-700">Produtos</div>
            </div>
          </div>

          <div className="bg-white p-4.5 rounded-xl border border-slate-200/90 shadow-xs space-y-1 font-sans">
            <span className="text-[10px] uppercase font-bold text-slate-400">Produtos Conferidos / Auditados</span>
            <div className="flex items-baseline justify-between pt-1">
              <strong className="text-2xl font-black text-emerald-600">{verifiedCount}</strong>
              <div className="p-1 px-2 bg-emerald-50 border border-emerald-100 rounded text-[9.5px] font-bold text-emerald-700 font-sans">OK</div>
            </div>
          </div>

          <div className="bg-white p-4.5 rounded-xl border border-slate-200/90 shadow-xs space-y-1 font-sans">
            <span className="text-[10px] uppercase font-bold text-slate-400">Não Encontrados (Sumidos)</span>
            <div className="flex items-baseline justify-between pt-1">
              <strong className="text-2xl font-black text-red-500">{notFoundCount}</strong>
              <div className="p-1 px-2 bg-red-50 border border-red-100 rounded text-[9.5px] font-bold text-red-700 font-sans">Sumido</div>
            </div>
          </div>

          <div className="bg-white p-4.5 rounded-xl border border-slate-200/90 shadow-xs space-y-1 font-sans">
            <span className="text-[10px] uppercase font-bold text-slate-400">Produtos Avariados (Com Foto)</span>
            <div className="flex items-baseline justify-between pt-1">
              <strong className="text-2xl font-black text-amber-600">{damagedCount}</strong>
              <div className="p-1 px-2 bg-amber-50 border border-amber-100 rounded text-[9.5px] font-bold text-amber-700 font-sans">Avarias</div>
            </div>
          </div>

          <div className="bg-white p-4.5 rounded-xl border border-slate-200/90 shadow-xs space-y-1 font-sans">
            <span className="text-[10px] uppercase font-bold text-slate-400">Produtos Pendentes</span>
            <div className="flex items-baseline justify-between pt-1">
              <strong className="text-2xl font-black text-amber-500">{pendingCount}</strong>
              <div className="p-1 px-2 bg-amber-50 border border-amber-100 rounded text-[9.5px] font-bold text-amber-700 font-sans">Pendente</div>
            </div>
          </div>

          <div className="bg-white p-4.5 rounded-xl border border-slate-200/90 shadow-xs space-y-1 font-sans">
            <span className="text-[10px] uppercase font-bold text-slate-400">Status Geral do Checklist</span>
            <div className="pt-2 flex flex-col justify-center space-y-1.5">
              <div className="flex justify-between items-center text-[11px] font-bold text-slate-500">
                <span>Progresso:</span>
                <span className="text-[#0A1D37] font-extrabold">{progressPercent}%</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200/50">
                <div className="bg-emerald-500 h-full transition-all duration-500" style={{ width: `${progressPercent}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* Search, Filter selection line */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            
            {/* Store and Competency selection dropdowns */}
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500 uppercase">Filial de Análise:</span>
                <select
                  value={selectedLoja}
                  onChange={e => setSelectedLoja(e.target.value)}
                  className="px-3 py-1.5 bg-white border border-slate-250 rounded shadow-xs text-xs font-bold font-sans text-slate-800 focus:outline-[#0A1D37] cursor-pointer"
                >
                  {filterLojas.map(l => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </div>

              {availableCompetencias.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500 uppercase">Referência Mês/Ano:</span>
                  <select
                    value={selectedCompetencia}
                    onChange={e => setSelectedCompetencia(e.target.value)}
                    className="px-3 py-1.5 bg-emerald-50 border border-emerald-250 rounded shadow-xs text-xs font-bold font-sans text-emerald-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                  >
                    {availableCompetencias.map(c => (
                      <option key={c} value={c}>{formatCompetencia(c)} ({c})</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Middle actions: search */}
            <div className="flex-1 lg:max-w-md relative">
              <input
                type="text"
                placeholder="Pesquisar por código, descrição ou código de barras..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-250 text-xs rounded shadow-xs focus:outline-none focus:border-indigo-500 text-slate-800 font-medium"
              />
              <div className="absolute left-3 top-2.5 text-slate-400">
                <Search className="w-4 h-4" />
              </div>
            </div>

            {/* Status filtering switches */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg self-start">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
                  statusFilter === 'all' 
                    ? 'bg-white text-slate-900 shadow-xs' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Todos ({totalItems})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('verified')}
                className={`px-3 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
                  statusFilter === 'verified' 
                    ? 'bg-emerald-500 text-white shadow-xs' 
                    : 'text-emerald-555 hover:bg-emerald-50/55 hover:text-emerald-700'
                }`}
              >
                Verificados ({verifiedCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('pending')}
                className={`px-3 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
                  statusFilter === 'pending' 
                    ? 'bg-amber-500 text-white shadow-xs' 
                    : 'text-amber-555 hover:bg-amber-50/55 hover:text-amber-700'
                }`}
              >
                Pendentes ({pendingCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('not_found')}
                className={`px-3 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
                  statusFilter === 'not_found' 
                    ? 'bg-red-500 text-white shadow-xs' 
                    : 'text-red-555 hover:bg-red-55/55 hover:text-red-700'
                }`}
              >
                Não Encontrado ({notFoundCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('damaged')}
                className={`px-3 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
                  statusFilter === 'damaged' 
                    ? 'bg-purple-600 text-white shadow-xs' 
                    : 'text-purple-650 hover:bg-purple-50/50 hover:text-purple-800'
                }`}
              >
                Avariados ({damagedCount})
              </button>
            </div>

          </div>

          {/* Green Export button with dropdown */}
          <div className="flex justify-end relative">
            <div className="relative">
              <button
                type="button"
                onClick={() => setExportMenuOpen(!exportMenuOpen)}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-extrabold rounded-lg text-xs flex items-center gap-2 shadow-md transition-all cursor-pointer select-none border border-emerald-500/20"
              >
                <Download className="w-4 h-4" /> Exportar Dados Filtrados ({filteredItems.length})
              </button>
              
              {exportMenuOpen && (
                <div className="absolute right-0 bottom-full mb-2 bg-white border border-slate-200 rounded-lg shadow-xl py-1.5 w-52 z-30 animate-in fade-in slide-in-from-bottom-2 text-left">
                  <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold px-4 py-1.5 border-b border-slate-150">
                    Selecione o Formato
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      exportToPDF();
                      setExportMenuOpen(false);
                    }}
                    className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-emerald-650 flex items-center gap-2.5 cursor-pointer transition-colors border-none"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-red-500" /> Relatório em PDF
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      exportToExcel();
                      setExportMenuOpen(false);
                    }}
                    className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-emerald-650 flex items-center gap-2.5 cursor-pointer transition-colors border-none"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-650" /> Planilha Excel (.xlsx)
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Table displaying the products */}
          <div className="border border-slate-200 rounded-lg overflow-hidden shadow-xs bg-slate-50/10">
            <table className="w-full text-left border-collapse text-[11.5px]">
              <thead className="bg-[#0A1D37] text-white uppercase text-[10px] tracking-wider font-bold">
                <tr>
                  <th className="p-3">Código ADM</th>
                  <th className="p-3">Descrição do Produto (Amostra)</th>
                  <th className="p-3">Código de Barras (EAN)</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-right">Ação Manual</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150 bg-white">
                {totalItems === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400 italic">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <FileSpreadsheet className="w-8 h-8 text-slate-300" />
                        <p className="font-semibold text-xs text-slate-500 font-sans">Nenhuma planilha foi carregada pelo Administrador Guilherme para esta competência ainda.</p>
                        <p className="text-[10px] text-slate-400 font-sans">Por favor, acesse a aba "Gerenciamento" no menu superior e faça o carregamento do arquivo Excel (.xlsx).</p>
                      </div>
                    </td>
                  </tr>
                ) : filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-slate-400 italic font-sans">
                      Nenhum produto corresponde aos filtros aplicados.
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item, idx) => (
                    <tr key={`${item.codigoAdm}-${idx}`} className={`hover:bg-slate-50/70 transition-colors ${
                      item.avariado ? 'bg-amber-500/5' : item.verificado ? 'bg-emerald-500/5' : ''
                    }`}>
                      <td className="p-3 font-mono font-black text-slate-800 text-xs">{item.codigoAdm}</td>
                      <td className="p-3 font-semibold text-[#0A1D37] text-xs font-sans">
                        <div className="flex items-start gap-3">
                          {item.avariado && item.fotoUrl && (
                            <div className="relative group shrink-0">
                              <img 
                                src={item.fotoUrl} 
                                alt={item.descricao} 
                                className="w-12 h-12 object-cover rounded-lg border border-red-250 hover:border-red-400 shadow-sm cursor-pointer hover:scale-110 duration-200 transition-all"
                                referrerPolicy="no-referrer"
                                onClick={() => setSelectedPhoto(item.fotoUrl || null)}
                                title="Clique para ampliar a foto da avaria"
                              />
                            </div>
                          )}
                          <div className="flex-1">
                            <strong>{item.descricao}</strong>
                            <span className="block text-[9.5px] font-medium text-slate-400 mt-1 capitalize font-sans">Categoria: {item.marca || 'Importado'}</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-3 font-mono font-semibold text-slate-500">{item.codigoBarras || "Sem EAN"}</td>
                      <td className="p-3 text-center col-span-1">
                        {item.avariado ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[9.5px] font-bold bg-amber-100 text-amber-800 border border-amber-200 rounded-full font-sans animate-pulse">
                            <AlertCircle className="w-3 h-3 text-amber-600" /> Avariado
                          </span>
                        ) : item.naoEncontrado ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[9.5px] font-bold bg-red-105 text-red-700 border border-red-200 rounded-full font-sans">
                            <XCircle className="w-3 h-3 text-red-500 animate-pulse" /> Não Encontrado
                          </span>
                        ) : item.verificado ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[9.5px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-250 rounded-full font-sans">
                            <CheckCircle className="w-3 h-3 text-emerald-600" /> Auditado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[9.5px] font-bold bg-amber-50 text-amber-700 border border-amber-200 rounded-full font-sans">
                            <AlertCircle className="w-3 h-3 text-amber-500 shadow-sm animate-pulse" /> Pendente
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        {item.avariado ? (
                          <button
                            type="button"
                            onClick={() => {
                              const updatedItens = activeConf.itens.map(it => {
                                if (it.codigoAdm === item.codigoAdm) {
                                  return {
                                    ...it,
                                    verificado: false,
                                    verificadoEm: undefined,
                                    integridadeFisica: true,
                                    conservacao: true,
                                    avariado: false,
                                    fotoUrl: undefined,
                                    statusExposicao: 'Não exposto' as const
                                  };
                                }
                                return it;
                              });
                              saveChecklist(updatedItens);
                            }}
                            className="px-3 py-1.5 rounded text-[11px] font-bold tracking-wide transition-all border cursor-pointer font-sans bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200"
                          >
                            Remover Avaria
                          </button>
                        ) : item.naoEncontrado ? (
                          <button
                            type="button"
                            onClick={() => handleMarkAsNotFound(item.codigoAdm, false)}
                            className="px-3 py-1.5 rounded text-[11px] font-bold tracking-wide transition-all border cursor-pointer font-sans bg-amber-50 hover:bg-amber-100 text-[#0284c7] border-[#bae6fd]"
                          >
                            Voltar para Pendente
                          </button>
                        ) : item.verificado ? (
                          <button
                            type="button"
                            onClick={() => {
                              const updatedItens = activeConf.itens.map(it => {
                                if (it.codigoAdm === item.codigoAdm) {
                                  return {
                                    ...it,
                                    verificado: false,
                                    verificadoEm: undefined,
                                    integridadeFisica: true,
                                    conservacao: true,
                                    avariado: false,
                                    statusExposicao: 'Não exposto' as const
                                  };
                                }
                                return it;
                              });
                              saveChecklist(updatedItens);
                            }}
                            className="px-3 py-1.5 rounded text-[11px] font-bold tracking-wide transition-all border cursor-pointer font-sans bg-red-50 hover:bg-red-100 text-red-650 border-red-200"
                          >
                            Remover Verificação
                          </button>
                        ) : (
                          <div className="flex items-center gap-2 justify-end">
                            {/* Check-in manual is removed completely */}
                            <button
                              type="button"
                              onClick={() => handleMarkAsNotFound(item.codigoAdm, true)}
                              className="px-3 py-1.5 rounded text-[11px] font-bold tracking-wide transition-all border cursor-pointer font-sans bg-red-50 hover:bg-red-100 text-red-650 border-red-200"
                            >
                              Produto não encontrado
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>



        </div>

      </div>
    );
  }

  // 2. MOBILE SEAMLESS MAIN WORKFLOWS
  if (auditState === 'landing') {
    return (
      <div className="fixed inset-0 bg-[#070f1a] text-white z-50 flex flex-col p-6 leading-relaxed overflow-y-auto" id="audit-landing-mobile">
        
        {/* Upper Brand Info */}
        <div className="space-y-4 pt-4 flex-none">
          <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
            <div className="p-2 bg-indigo-650 rounded-lg text-white">
              <Smartphone className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest font-mono">
                Modo Coleta Campo J. Cruzeiro
              </span>
              <h1 className="text-sm font-bold text-slate-300 font-sans tracking-wide">
                Auditoria de Amostrador Físico
              </h1>
            </div>
          </div>

          <div className="bg-slate-900/40 border border-slate-800 p-4 rounded-xl space-y-3">
            <p className="text-xs leading-relaxed font-semibold text-slate-100 font-sans">
              Iniciar checklist de conferência mensal das amostras ({currentMonthDisplay})
            </p>

            <div className="flex items-center gap-2 bg-indigo-950/40 p-2.5 rounded-lg border border-indigo-900/50 text-[10.5px]">
              <RotateCw className="w-4 h-4 text-amber-400 shrink-0 stroke-[2] animate-spin duration-3000" />
              <p className="text-slate-300 font-medium font-sans">
                Use a câmera abaixo ou registre manualmente na lista integrada se necessário.
              </p>
            </div>
          </div>

          {/* Current Store Session Summary */}
          <div className="bg-slate-900/70 border border-slate-800 p-3.5 rounded-lg space-y-2.5 text-xs">
            <div className="flex justify-between items-center text-slate-400 font-sans">
              <span>Filial de Coleta:</span>
              <select
                value={selectedLoja}
                onChange={e => setSelectedLoja(e.target.value)}
                className="bg-[#0e1726] border border-slate-700 text-white text-[11px] font-bold rounded px-2 py-1 focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                {filterLojas.map(l => (
                  <option key={l} value={l}>{l.toUpperCase()}</option>
                ))}
              </select>
            </div>

            {availableCompetencias.length > 0 && (
              <div className="flex justify-between items-center text-slate-400 font-sans">
                <span>Referência Mês/Ano:</span>
                <select
                  value={selectedCompetencia}
                  onChange={e => setSelectedCompetencia(e.target.value)}
                  className="bg-emerald-950/40 border border-emerald-800 text-emerald-400 text-[11px] font-mono font-bold rounded px-2 py-1 focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  {availableCompetencias.map(c => (
                    <option key={c} value={c}>{formatCompetencia(c)} ({c})</option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex justify-between items-center text-slate-400 font-sans">
              <span>Operador Responsável:</span>
              <strong className="text-white">{user.nome}</strong>
            </div>

            {totalItems > 0 ? (
              <div className="pt-2 border-t border-slate-800 text-slate-350">
                <div className="flex justify-between font-bold mb-1 font-sans">
                  <span>Progresso do Lote:</span>
                  <span>{verifiedCount} de {totalItems} itens ({progressPercent}%)</span>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full transition-all" style={{ width: `${progressPercent}%` }} />
                </div>
              </div>
            ) : (
              <p className="text-slate-400 italic font-medium pt-2 border-t border-slate-800 text-[11px] font-sans">
                * Para iniciar, certifique-se de que o Administrador Guilherme carregou a planilha geral de conferência em {'Gerenciamento > Importar planilhas'}.
              </p>
            )}
          </div>
        </div>

        {/* Dynamic Search & Scrollable Items list */}
        {totalItems > 0 && (
          <div className="space-y-2 py-2 flex-grow flex flex-col min-h-[180px]">
            <div className="flex items-center justify-between border-b border-slate-800 pb-1 mt-1 font-sans">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                Lista de Amostras do Checklist
              </span>
              <span className="text-[9px] font-mono text-indigo-400 font-bold">
                {filteredItems.length} Produtos
              </span>
            </div>

            {/* Mobile Status Tabs switches to mirror desktop */}
            <div className="grid grid-cols-5 gap-1 bg-[#09111c] border border-slate-800 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`text-center py-1.5 text-[8.5px] font-extrabold rounded transition-all cursor-pointer truncate ${
                  statusFilter === 'all' 
                    ? 'bg-indigo-650 text-white font-sans font-bold shadow-xs' 
                    : 'text-slate-400 font-sans'
                }`}
              >
                Todos ({totalItems})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('verified')}
                className={`text-center py-1.5 text-[8.5px] font-extrabold rounded transition-all cursor-pointer truncate ${
                  statusFilter === 'verified' 
                    ? 'bg-emerald-600 text-white font-sans font-bold shadow-xs' 
                    : 'text-slate-400 font-sans'
                }`}
              >
                Aud ({verifiedCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('pending')}
                className={`text-center py-1.5 text-[8.5px] font-extrabold rounded transition-all cursor-pointer truncate ${
                  statusFilter === 'pending' 
                    ? 'bg-amber-600 text-white font-sans font-bold shadow-xs' 
                    : 'text-slate-400 font-sans'
                }`}
              >
                Pend ({pendingCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('not_found')}
                className={`text-center py-1.5 text-[8.5px] font-extrabold rounded transition-all cursor-pointer truncate ${
                  statusFilter === 'not_found' 
                    ? 'bg-red-650 text-white font-sans font-bold shadow-xs' 
                    : 'text-slate-400 font-sans'
                }`}
              >
                Sumidos ({notFoundCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('damaged')}
                className={`text-center py-1.5 text-[8.5px] font-extrabold rounded transition-all cursor-pointer truncate ${
                  statusFilter === 'damaged' 
                    ? 'bg-purple-600 text-white font-sans font-bold shadow-xs' 
                    : 'text-slate-400 font-sans'
                }`}
              >
                Avar ({damagedCount})
              </button>
            </div>

            {/* Mobile Search Input */}
            <div className="relative">
              <input
                type="text"
                placeholder="Pesquisar por nome ou código..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-[11px] text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 select-all font-medium font-sans"
              />
              <div className="absolute left-2.5 top-2.5 text-slate-500">
                <Search className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Mobile green export button */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setExportMenuOpen(!exportMenuOpen)}
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-lg text-xs flex items-center justify-center gap-2 shadow-md cursor-pointer select-none border border-emerald-500/10"
              >
                <Download className="w-4 h-4" /> Exportar Dados Filtrados ({filteredItems.length})
              </button>
              
              {exportMenuOpen && (
                <div className="absolute right-0 bottom-full mb-1 bg-[#111c2a] border border-slate-800 rounded-lg shadow-xl py-1.5 w-full z-35 animate-in fade-in slide-in-from-bottom-2 text-left">
                  <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold px-4 py-1.5 border-b border-slate-800">
                    Selecione o Formato
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      exportToPDF();
                      setExportMenuOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 text-xs font-bold text-slate-200 hover:bg-slate-800 flex items-center gap-2 cursor-pointer transition-colors border-none"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-red-500" /> Relatório em PDF
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      exportToExcel();
                      setExportMenuOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 text-xs font-bold text-slate-200 hover:bg-slate-800 flex items-center gap-2 cursor-pointer transition-colors border-none"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-400" /> Planilha Excel (.xlsx)
                  </button>
                </div>
              )}
            </div>

            {/* Scrollable list frame */}
            <div className="space-y-1.5 overflow-y-auto max-h-[220px] pr-1 flex-1">
              {filteredItems.length === 0 ? (
                <p className="text-[10px] text-slate-500 italic text-center py-4 bg-slate-900/10 rounded border border-slate-800/40 font-sans">
                  Nenhum produto correspondente encontrado.
                </p>
              ) : (
                filteredItems.map((item, idx) => (
                  <div 
                    key={`${item.codigoAdm}-${idx}`} 
                    className={`p-2.5 bg-slate-900/45 border rounded-lg flex items-center justify-between gap-3 text-[11px] leading-normal transition-colors ${
                      item.avariado
                        ? 'border-amber-500/30 bg-amber-950/10'
                        : item.naoEncontrado 
                          ? 'border-red-500/20 bg-red-950/10' 
                          : item.verificado 
                            ? 'border-emerald-500/20 bg-emerald-950/10' 
                            : 'border-slate-800/80 bg-[#09111c]'
                    }`}
                  >
                    <div className="flex-1 min-w-0 flex items-start gap-2">
                      {item.avariado && item.fotoUrl && (
                        <img 
                          src={item.fotoUrl} 
                          alt={item.descricao} 
                          className="w-10 h-10 object-cover rounded-md border border-red-900/30 shrink-0"
                          referrerPolicy="no-referrer"
                          onClick={() => setSelectedPhoto(item.fotoUrl || null)}
                        />
                      )}
                      <div className="flex-grow min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[8px] font-mono text-indigo-400 font-extrabold uppercase bg-indigo-950 px-1 py-0.2 rounded border border-indigo-900/30">
                            {item.codigoAdm}
                          </span>
                          {item.codigoBarras && (
                            <span className="text-[8px] font-mono text-slate-500">
                              EAN: {item.codigoBarras}
                            </span>
                          )}
                          {item.naoEncontrado && (
                            <span className="text-[7.5px] font-bold text-red-400 bg-red-950 px-1 py-0.2 rounded border border-red-900/30 animate-pulse">
                              NÃO LOCALIZADO
                            </span>
                          )}
                          {item.avariado && (
                            <span className="text-[7.5px] font-bold text-amber-400 bg-amber-950 px-1 py-0.2 rounded border border-amber-900/3s animate-pulse">
                              AVARIADO
                            </span>
                          )}
                        </div>
                        <strong className="block text-slate-200 mt-0.5 truncate font-sans font-semibold">
                          {item.descricao}
                        </strong>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0 font-sans">
                      {item.avariado ? (
                        <button
                          type="button"
                          onClick={() => {
                            const updatedItens = activeConf.itens.map(it => {
                              if (it.codigoAdm === item.codigoAdm) {
                                return {
                                  ...it,
                                  verificado: false,
                                  verificadoEm: undefined,
                                  integridadeFisica: true,
                                  conservacao: true,
                                  avariado: false,
                                  fotoUrl: undefined,
                                  statusExposicao: 'Não exposto' as const
                                };
                              }
                              return it;
                            });
                            saveChecklist(updatedItens);
                          }}
                          className="p-1 px-1.5 rounded-md border border-amber-500/30 bg-amber-500/10 text-amber-400 font-bold text-[8.5px] uppercase hover:bg-amber-500/20 transition-all cursor-pointer font-sans"
                        >
                          Limpar
                        </button>
                      ) : item.naoEncontrado ? (
                        <button
                          type="button"
                          onClick={() => handleMarkAsNotFound(item.codigoAdm, false)}
                          className="p-1 px-1.5 rounded-md border border-amber-500/30 bg-amber-500/10 text-amber-400 font-bold text-[8.5px] uppercase hover:bg-amber-500/20 transition-all cursor-pointer font-sans"
                        >
                          Voltar para Pendente
                        </button>
                      ) : item.verificado ? (
                        <button
                          type="button"
                          onClick={() => {
                            const updatedItens = activeConf.itens.map(it => {
                              if (it.codigoAdm === item.codigoAdm) {
                                return {
                                  ...it,
                                  verificado: false,
                                  verificadoEm: undefined,
                                  integridadeFisica: true,
                                  conservacao: true,
                                  avariado: false,
                                  statusExposicao: 'Não exposto' as const
                                };
                              }
                              return it;
                            });
                            saveChecklist(updatedItens);
                          }}
                          className="p-1 px-1.5 rounded-md border border-emerald-500/35 bg-emerald-500/10 text-emerald-400 font-bold text-[8.5px] uppercase hover:bg-emerald-500/25 transition-all cursor-pointer font-sans"
                        >
                          ✔ OK
                        </button>
                      ) : (
                        <div className="flex items-center gap-1 font-sans">
                          {/* Manual check-in removed completely as requested */}
                          <button
                            type="button"
                            onClick={() => handleMarkAsNotFound(item.codigoAdm, true)}
                            className="p-1 px-2 rounded-md border border-red-900 bg-red-950 text-red-400 font-bold text-[8.5px] uppercase hover:bg-red-900/40 transition-all cursor-pointer font-sans"
                            title="Sem Estoque / Não Encontrado"
                          >
                            X
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Huge Bottom Control Panel */}
        <div className="grid grid-cols-2 gap-3 pt-3 flex-none pb-4">
          <button
            type="button"
            onClick={() => {
              if (onNavigateTo) onNavigateTo('Dashboard');
            }}
            className="py-3 bg-red-650 hover:bg-red-750 text-white font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-md text-xs active:scale-95 transition-all uppercase tracking-wide font-sans"
          >
            <LogOut className="w-4 h-4" /> Sair
          </button>

          {totalItems === 0 ? (
            <button
              type="button"
              disabled
              className="py-3 bg-slate-800 text-slate-500 font-bold rounded-xl flex items-center justify-center gap-2 text-xs uppercase tracking-wide opacity-50 cursor-not-allowed font-sans"
            >
              Sem Planilha
            </button>
          ) : (
            <button
              type="button"
              onClick={startScanner}
              className="py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-md text-xs active:scale-95 transition-all uppercase tracking-wide font-sans animate-pulse"
            >
              <Play className="w-4 h-4" /> Começar
            </button>
          )}
        </div>

      </div>
    );
  }

  // 3. FULL-SCREEN MOBILE SCANNING VIEW PORTAL (100% Raw Camera Area)
  return (
    <div className="fixed inset-0 bg-black text-white z-50 flex flex-col overflow-hidden items-center justify-center" id="audit-fullscreen-mobile-camera-portal">
      
      {/* 100% VIEWPORT FILL CAMERA CONTAINER */}
      <div className="absolute inset-0 w-full h-full z-0 overflow-hidden bg-black flex items-center justify-center">
        <div 
          id={scannerId} 
          className="w-full h-full object-cover min-w-full min-h-full"
          style={{ objectFit: 'cover' }}
        >
          <video 
            ref={videoRef}
            playsInline
            muted
            className="w-full h-full object-cover min-w-full min-h-full"
            style={{ objectFit: 'cover' }}
          />
        </div>
        
        {/* Raw Invisible Video stretching styles to preserve raw frame viewport size */}
        <style dangerouslySetInnerHTML={{__html: `
          #${scannerId} {
            width: 100% !important;
            height: 100% !important;
            padding: 0 !important;
            border: none !important;
          }
          #${scannerId} p {
            display: none !important;
          }
          #${scannerId} button {
            display: none !important;
          }
          #${scannerId} select {
            display: none !important;
          }
          #${scannerId} div {
            border: none !important;
            background: transparent !important;
          }
          #${scannerId} video {
            width: 100% !important;
            height: 100% !important;
            object-fit: cover !important;
            transform: scale(1) !important;
          }
        `}} />
      </div>

      {/* FLOATING TOP LOGOUT CONTROLS OVER CAMERA */}
      <div className="absolute top-4 left-4 right-4 z-15 flex justify-between items-center pointer-events-none">
        
        {/* Floating Minimalist Unit Indicator */}
        <div className="bg-slate-950/80 p-2.5 px-4 rounded-xl border border-slate-800 text-white text-xs font-mono font-bold flex items-center gap-2 backdrop-blur-md">
          <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping" />
          <span>Auditando: {selectedLoja} ({verifiedCount}/{totalItems})</span>
        </div>

        {/* Minimal Float Exit Button */}
        <button
          type="button"
          onClick={handleExitAudit}
          className="p-3 bg-red-650/90 hover:bg-red-700 text-white rounded-full flex items-center justify-center cursor-pointer shadow-lg active:scale-95 transition-all pointer-events-auto hover:ring-2 hover:ring-red-300"
          title="Fechar Câmera"
        >
          <X className="w-5 h-5 stroke-[2.5]" />
        </button>

      </div>



      {/* DYNAMIC GLOWING FEEDBACK OVERLAYS (Flashing outline + feedback overlay text) */}
      {feedbackOverlay && (
        <div className={`absolute inset-0 z-30 flex items-center justify-center p-6 text-center leading-relaxed transition-all duration-200 pointer-events-none animate-in fade-in duration-150 ${
          feedbackOverlay.success 
            ? 'bg-emerald-950/85 ring-16 ring-inset ring-emerald-500 animate-pulse' 
            : 'bg-red-950/85 ring-16 ring-inset ring-red-650 animate-pulse'
        }`}>
          <div className="bg-slate-900/95 border border-slate-800 p-6 rounded-2xl max-w-sm w-full space-y-4 shadow-2xl pointer-events-auto relative">
            
            {/* Outline Glow visual support */}
            <div className={`absolute -inset-1 rounded-2xl opacity-40 blur-xl ${
              feedbackOverlay.success ? 'bg-emerald-500' : 'bg-red-500'
            }`} />

            <div className="relative space-y-3 z-10 flex flex-col items-center">
              
              {feedbackOverlay.success ? (
                <div className="p-3 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full animate-bounce">
                  <CheckCircle className="w-8 h-8" />
                </div>
              ) : (
                <div className="p-3 bg-red-650/20 text-red-500 border border-red-650/30 rounded-full animate-shake">
                  <X className="w-8 h-8 stroke-[3]" />
                </div>
              )}

              <h2 className={`text-sm font-extrabold uppercase tracking-wide ${
                feedbackOverlay.success ? 'text-emerald-400' : 'text-red-400'
              }`}>
                {feedbackOverlay.message}
              </h2>

              {feedbackOverlay.productName && (
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 w-full">
                  <p className="text-xs font-bold text-white leading-normal font-sans">
                    {feedbackOverlay.productName}
                  </p>
                  {feedbackOverlay.codigoAdm && (
                    <span className="block text-[10px] font-mono text-slate-400 font-extrabold tracking-wider uppercase mt-1 bg-slate-900 py-0.5 rounded border border-slate-800/50">
                      ADM: {feedbackOverlay.codigoAdm}
                    </span>
                  )}
                </div>
              )}

              <div className="text-[9.5px] font-mono font-bold text-slate-500">
                Código Lido: <span className="text-white bg-slate-950 px-2 py-0.5 rounded border border-slate-800">{feedbackOverlay.barcode}</span>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* BALÃOZINHO SINGELO DE CONFIRMAÇÃO DE INTEGRIDADE */}
      {pendingConfirmItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 transition-all duration-150 animate-in fade-in duration-200 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 p-6 rounded-2xl max-w-sm w-full shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            
            {/* Header / Balloon Title */}
            <div className="text-center font-display border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider flex items-center justify-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-red-500" /> Confirmação de Produto
              </h3>
              <p className="text-[10px] text-slate-500 font-mono mt-0.5 font-bold">Código Lido: {pendingConfirmItem.barcode}</p>
            </div>

            {/* Product description balloon */}
            <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2 text-center pointer-events-auto">
              <div className="text-[11px] font-mono font-bold text-slate-800 tracking-wider uppercase">
                ADM: <span className="bg-slate-100 text-slate-705 px-2 py-0.5 rounded text-xs font-semibold font-mono">{pendingConfirmItem.codigoAdm}</span>
              </div>
              <div className="text-xs font-extrabold text-slate-900 leading-relaxed font-sans px-1">
                {pendingConfirmItem.descricao}
              </div>
            </div>

            {/* Question */}
            <div className="text-center py-2">
              <p className="text-xs font-black text-slate-700 font-sans tracking-tight">
                O produto está em perfeitas condições?
              </p>
            </div>

            {/* Response buttons (SIM Verde, NÃO Vermelho) */}
            <div className="grid grid-cols-2 gap-3 pt-1 pointer-events-auto">
              <button
                type="button"
                onClick={() => handleConfirmCondition(true)}
                className="py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-lg text-xs tracking-wide cursor-pointer transition-all active:scale-95 shadow-md flex items-center justify-center gap-1.5 border border-emerald-500/20"
              >
                <span className="text-sm">✔</span> SIM
              </button>
              <button
                type="button"
                onClick={() => handleConfirmCondition(false)}
                className="py-3 bg-red-600 hover:bg-red-700 text-white font-extrabold rounded-lg text-xs tracking-wide cursor-pointer transition-all active:scale-95 shadow-md flex items-center justify-center gap-1.5 border border-red-500/20"
              >
                <span className="text-sm">✖</span> NÃO
              </button>
            </div>

          </div>
        </div>
      )}

      {/* OVERLAY DE CAPTURA DE FOTO DE AVARIA */}
      {avariaCaptureItem && (
        <div className="fixed inset-0 z-50 flex flex-col bg-slate-950 font-sans">
          
          {/* Header Bar */}
          <div className="p-4 bg-slate-900/95 border-b border-slate-800 text-center relative z-20 shrink-0">
            <span className="text-[10px] tracking-[0.1em] font-black uppercase text-amber-500 block mb-1 font-sans">
              Registro Fotográfico de Avaria
            </span>
            <p className="text-slate-350 text-xs font-bold font-sans">
              "Fotografe a avaria ou inconformidade da peça"
            </p>
          </div>

          {/* Camera Frame Viewport */}
          <div className="flex-grow flex items-center justify-center relative overflow-hidden bg-black select-none">
            <video
              ref={damageVideoRef}
              className="w-full h-full object-cover"
              playsInline
              autoPlay
              muted
            />

            {/* Subtle Crosshair overlays */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-48 h-48 border border-white/20 rounded-2xl relative">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-4 h-[1px] bg-white/40" />
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-[1px] bg-white/40" />
                <div className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-[1px] bg-white/40" />
                <div className="absolute right-0 top-1/2 -translate-y-1/2 h-4 w-[1px] bg-white/40" />
              </div>
            </div>

            {/* Bottom info banner */}
            <div className="absolute bottom-4 left-4 right-4 bg-slate-950/80 p-3 rounded-xl border border-slate-800/65 text-center text-white backdrop-blur-md">
              <span className="block text-[9px] font-mono text-indigo-400 font-extrabold uppercase">
                ADM: {avariaCaptureItem.codigoAdm}
              </span>
              <p className="text-[11px] font-extrabold truncate mt-0.5">{avariaCaptureItem.descricao}</p>
            </div>
          </div>

          {/* Camera Action Deck Controls */}
          <div className="p-6 bg-slate-900/95 border-t border-slate-800 flex items-center justify-between gap-4 shrink-0 relative z-20">
            {/* Left slot placeholder */}
            <button
              type="button"
              onClick={() => {
                stopDamageCamera();
                setAvariaCaptureItem(null);
                // Resume normal barcode scanner if audit is active
                if (auditState === 'scanning') {
                  startScanner();
                }
              }}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-black rounded-lg border border-slate-700/60 transition-all cursor-pointer"
            >
              Cancelar
            </button>

            {/* Camera Shutter Trigger Center */}
            <button
              type="button"
              onClick={handleCaptureAvariaPhoto}
              className="w-16 h-16 bg-white rounded-full flex items-center justify-center p-1 cursor-pointer transition-all active:scale-90 hover:scale-105 shadow-xl border-4 border-slate-800 group outline-none"
              title="Obturador"
            >
              <div className="w-full h-full bg-red-650 rounded-full group-hover:bg-red-700 transition-colors" />
            </button>

            {/* Right slot placeholder */}
            <div className="w-16 shrink-0" />
          </div>
        </div>
      )}

      {/* REGISTRO AMPLIADO LIGHTBOX MODAL */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/95 p-4 transition-all duration-250 animate-in fade-in duration-200">
          <button 
            type="button"
            className="absolute top-4 right-4 bg-slate-900 hover:bg-slate-800 text-white rounded-full p-2.5 border border-slate-750 cursor-pointer outline-none z-10"
            onClick={() => setSelectedPhoto(null)}
          >
            <X className="w-6 h-6" />
          </button>
          
          <div className="max-w-3xl w-full flex flex-col items-center justify-center space-y-4">
            <img 
              src={selectedPhoto} 
              alt="Ampliação da Avaria" 
              className="max-h-[85vh] max-w-full rounded-2xl border border-slate-800 shadow-2xl object-contain animate-in zoom-in-95 duration-200"
              referrerPolicy="no-referrer"
            />
            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider font-sans">
              Foto da Avaria Registrada em Campo
            </p>
          </div>
        </div>
      )}

    </div>
  );
}
