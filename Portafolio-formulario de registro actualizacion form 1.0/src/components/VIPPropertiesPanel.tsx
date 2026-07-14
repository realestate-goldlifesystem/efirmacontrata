import React, { useState, useEffect } from 'react';
import { 
  Building2, Search, Filter, Loader2, MapPin, Bed, Bath, Car, 
  Youtube, Facebook, FileText, Share2, Download, Copy, Check, Lock, ChevronDown, CheckSquare, Square,
  LayoutGrid, List
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import logoImg from '../assets/logo.png';
import coverBgImg from '../assets/cover-bg.png';

interface VIPProperty {
  idRegistro: string;
  direccion: string;
  ciudad: string;
  upz: string;
  barrio: string;
  habitaciones: string;
  banos: string;
  garajes: string;
  tipoNegocio: string;
  precioVenta: string;
  precioGeneral: string;
  precioAdmin: string;
  youtube: string;
  facebook: string;
  documentoFirmado: string;
  imageUrl: string;
  estado: string;
  area: string;
}

// Helper: descarga una imagen como base64 data URL via proxy weserv.nl
async function fetchImageAsBase64(originalUrl: string): Promise<string | null> {
  try {
    let url = originalUrl;
    if (url.includes('thumbnail?id=')) {
      url = url.replace('thumbnail?id=', 'uc?export=view&id=').replace('&sz=w800', '');
    }
    const proxyUrl = `https://images.weserv.nl/?url=${encodeURIComponent(url)}&w=600&output=jpg&q=85`;
    const resp = await fetch(proxyUrl);
    if (!resp.ok) return null;
    const blob = await resp.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export default function VIPPropertiesPanel() {
  const [properties, setProperties] = useState<VIPProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // Debug panel para diagnosticar PDF
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const [showDebug, setShowDebug] = useState(false);
  
  // Filtros
  const [tipoFiltro, setTipoFiltro] = useState<'Todos' | 'Venta' | 'Arriendo' | 'Mixto'>('Todos');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filtros Avanzados
  const [showFilters, setShowFilters] = useState(false);
  const [filtrosAvanzados, setFiltrosAvanzados] = useState({
    habitaciones: '',
    banos: '',
    garajes: '',
    ciudad: '',
    barrio: '',
    precioMin: '',
    precioMax: ''
  });
  
  // Estado para la generacion de PDF
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  useEffect(() => {
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    setLoading(true);
    try {
      const response = await fetch("https://script.google.com/macros/s/AKfycbxpJ8w_XR5dUhIv1VTuV3ZDjHm-vtz13B5RlyfiLqI9ypZnIuzuUL39_GDHpBisL2oW/exec", {
        method: "POST",
        body: JSON.stringify({ action: "obtenerInmueblesVip" }),
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        }
      });
      
      const result = await response.json();
      if (result.success) {
        setProperties(result.inmuebles || []);
      } else {
        setError(result.error || 'Error desconocido al cargar inmuebles');
      }
    } catch (err) {
      console.error(err);
      setError('No se pudo conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const filteredProperties = properties.filter(p => {
    // Filtro por tipo
    if (tipoFiltro !== 'Todos') {
      const isVenta = p.estado.includes('VENTA') && !p.estado.includes('RENTA');
      const isArriendo = p.estado.includes('ARRIENDO');
      const isMixto = p.estado.includes('VENTA/RENTA');
      
      if (tipoFiltro === 'Venta' && !isVenta) return false;
      if (tipoFiltro === 'Arriendo' && !isArriendo) return false;
      if (tipoFiltro === 'Mixto' && !isMixto) return false;
    }
    
    // Búsqueda por texto libre
    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase();
      const matchDir = p.direccion.toLowerCase().includes(term);
      const matchBarrio = p.barrio.toLowerCase().includes(term);
      const matchId = p.idRegistro.toLowerCase().includes(term);
      if (!matchDir && !matchBarrio && !matchId) return false;
    }
    
    // Filtros Avanzados
    if (filtrosAvanzados.habitaciones && parseInt(p.habitaciones || '0') < parseInt(filtrosAvanzados.habitaciones)) return false;
    if (filtrosAvanzados.banos && parseInt(p.banos || '0') < parseInt(filtrosAvanzados.banos)) return false;
    if (filtrosAvanzados.garajes && parseInt(p.garajes || '0') < parseInt(filtrosAvanzados.garajes)) return false;
    if (filtrosAvanzados.ciudad && !p.ciudad.toLowerCase().includes(filtrosAvanzados.ciudad.toLowerCase())) return false;
    if (filtrosAvanzados.barrio && !p.barrio.toLowerCase().includes(filtrosAvanzados.barrio.toLowerCase())) return false;
    
    if (filtrosAvanzados.precioMin || filtrosAvanzados.precioMax) {
      // Determinar qué precio evaluar basado en si es venta o renta
      let precioVal = 0;
      if (p.estado.includes('VENTA')) {
        precioVal = parseInt(String(p.precioVenta || '0').replace(/\D/g, ''));
      } else {
        precioVal = parseInt(String(p.precioGeneral || '0').replace(/\D/g, ''));
      }
      
      const min = parseInt(filtrosAvanzados.precioMin.replace(/\D/g, ''));
      const max = parseInt(filtrosAvanzados.precioMax.replace(/\D/g, ''));
      
      if (!isNaN(min) && min > 0 && precioVal < min) return false;
      if (!isNaN(max) && max > 0 && precioVal > max) return false;
    }

    return true;
  });

  const formatMoney = (val: string) => {
      const num = parseInt(String(val).replace(/\D/g, ''), 10);
      if (isNaN(num)) return val;
      return '$' + num.toLocaleString('es-CO');
  };

  const getPriceDisplay = (p: VIPProperty) => {
    const isVenta = p.estado.includes('VENTA') && !p.estado.includes('RENTA');
    const isArriendo = p.estado.includes('ARRIENDO');
    const isMixto = p.estado.includes('VENTA/RENTA');

    if (isMixto) {
      return (
        <div className="space-y-2">
          <div className="bg-brand-gold/10 p-2 rounded-lg border border-brand-gold/20">
            <span className="text-[10px] text-brand-gold uppercase tracking-wider font-bold block">Total Arriendo</span>
            <span className="text-xl text-white font-black">{formatMoney(p.precioGeneral)}</span>
            {p.precioAdmin && <span className="block text-[10px] text-stone-400 mt-1">Incluye Admin: {formatMoney(p.precioAdmin)}</span>}
          </div>
          <div className="bg-stone-800 p-2 rounded-lg border border-stone-700">
            <span className="text-[10px] text-stone-400 uppercase tracking-wider font-bold block">Valor Venta</span>
            <span className="text-xl text-white font-black">{formatMoney(p.precioVenta)}</span>
          </div>
        </div>
      );
    } else if (isArriendo) {
      return (
        <div className="bg-brand-gold/10 p-3 rounded-lg border border-brand-gold/20 flex flex-col justify-center">
          <span className="text-xs text-brand-gold uppercase tracking-wider font-bold block mb-1">Total Arriendo</span>
          <span className="text-2xl text-white font-black">{formatMoney(p.precioGeneral)}</span>
          {p.precioAdmin && <span className="block text-xs text-stone-400 mt-2">Incluye Admin: {formatMoney(p.precioAdmin)}</span>}
        </div>
      );
    } else {
      return (
        <div className="bg-stone-800 p-3 rounded-lg border border-stone-700 flex flex-col justify-center">
          <span className="text-xs text-stone-400 uppercase tracking-wider font-bold block mb-1">Valor Venta</span>
          <span className="text-2xl text-white font-black">{formatMoney(p.precioVenta)}</span>
        </div>
      );
    }
  };

  const copyToClipboard = (p: VIPProperty) => {
    const txt = `🏡 *${p.tipoNegocio.toUpperCase()} - ${p.barrio || p.ciudad}*\n📍 ${p.direccion}\n🛏️ Hab: ${p.habitaciones} | 🛁 Baños: ${p.banos} | 🚗 Garajes: ${p.garajes}\n\n🎬 *Video Tour:* ${p.youtube || 'Pronto'}\n\n🆔 ID: ${p.idRegistro}`;
    navigator.clipboard.writeText(txt);
    setCopiedId(p.idRegistro);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // ============================================================
  // GENERADOR PDF PREMIUM CON jsPDF DIRECTO
  // ============================================================
  const generatePDF = async (singleProperty?: VIPProperty, forceDownload = false) => {
    setIsGeneratingPdf(true);
    setDebugLogs(["[PDF] Iniciando generacion premium..."]);
    setShowDebug(true);

    const propsToRender = singleProperty ? [singleProperty] : properties.filter(p => selectedIds.has(p.idRegistro));
    const filename = propsToRender.length === 1 ? `GoldLife-${propsToRender[0].idRegistro}.pdf` : 'GoldLife-Portafolio-VIP.pdf';
    
    const fmt = (val: string) => {
      const num = parseInt(String(val).replace(/\D/g, ''), 10);
      if (isNaN(num) || num === 0) return null;
      return '$' + num.toLocaleString('es-CO');
    };

    // Helper: recorta imagen a proporción destino usando canvas (sin distorsión)
    const cropImageToRatio = (base64: string, destW: number, destH: number): Promise<string> => {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          // Escala px para buena resolución (factor 3)
          canvas.width = destW * 3;
          canvas.height = destH * 3;
          const ctx = canvas.getContext('2d')!;
          const srcRatio = img.width / img.height;
          const dstRatio = destW / destH;
          let sx = 0, sy = 0, sw = img.width, sh = img.height;
          if (srcRatio > dstRatio) {
            // imagen más ancha → recortar lados
            sw = img.height * dstRatio;
            sx = (img.width - sw) / 2;
          } else {
            // imagen más alta → recortar arriba/abajo
            sh = img.width / dstRatio;
            sy = (img.height - sh) / 2;
          }
          ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.92));
        };
        img.onerror = () => resolve(base64);
        img.src = base64;
      });
    };

    try {
      const pageW = 210;
      const pageH = 297; // A4 estándar — imagen cuadrada 210mm + 87mm info panel
      const mg = 14; // margen
      const cw = pageW - mg * 2; // content width

      // Colores brand
      const DARK    = [18, 18, 18] as [number,number,number];
      const CARD    = [28, 28, 28] as [number,number,number];
      const GOLD    = [212, 175, 55] as [number,number,number];
      const GOLD2   = [180, 145, 30] as [number,number,number];
      const WHITE   = [245, 245, 245] as [number,number,number];
      const GRAY    = [140, 140, 140] as [number,number,number];
      const GRAY2   = [80, 80, 80] as [number,number,number];
      const ACCENT  = [45, 45, 45] as [number,number,number];

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [pageW, pageH] });

      // ---- Descargar imágenes ----
      setDebugLogs(prev => [...prev, `[PDF] Descargando ${propsToRender.length} img...`]);
      const rawImages = await Promise.all(
        propsToRender.map(p => p.imageUrl ? fetchImageAsBase64(p.imageUrl) : Promise.resolve(null))
      );
      // Recortar a proporción exacta cuadrada (1:1) para la ficha
      const imgDestW = pageW;
      const imgDestH = pageW; // Cuadrado perfecto 1080x1080
      const images = await Promise.all(
        rawImages.map(b64 => b64 ? cropImageToRatio(b64, imgDestW * 4, imgDestH * 4) : Promise.resolve(null))
      );
      setDebugLogs(prev => [...prev, `[PDF] ${images.filter(Boolean).length}/${propsToRender.length} imagenes ok`]);

      const loadLocalImage = async (url: string) => {
        try {
          const resp = await fetch(url);
          const blob = await resp.blob();
          return await new Promise<{b64: string, w: number, h: number} | null>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => {
               const b64 = reader.result as string;
               const img = new Image();
               img.onload = () => resolve({ b64, w: img.width, h: img.height });
               img.onerror = () => resolve(null);
               img.src = b64;
            };
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(blob);
          });
        } catch { return null; }
      };

      // Descargar logo y fondo de portada locales
      let logoBase64: string | null = null;
      let logoW = 0, logoH = 0;
      const logoData = await loadLocalImage(logoImg);
      if (logoData) { logoBase64 = logoData.b64; logoW = logoData.w; logoH = logoData.h; }

      let coverBgBase64: string | null = null;
      const coverData = await loadLocalImage(coverBgImg);
      if (coverData) { coverBgBase64 = coverData.b64; }

      // ========== PORTADA PREMIUM ==========
      // Fondo oscuro (base)
      doc.setFillColor(18, 18, 20); 
      doc.rect(0, 0, pageW, pageH, 'F');
      
      // Imagen de fondo fotográfica
      if (coverBgBase64) {
        doc.addImage(coverBgBase64, 'PNG', 0, 0, pageW, pageH);
        // Oscurecemos la imagen un 65% para que resalten los textos y dorados
        doc.setFillColor(10, 10, 12);
        doc.setGState(new (doc as any).GState({ opacity: 0.65 }));
        doc.rect(0, 0, pageW, pageH, 'F');
        doc.setGState(new (doc as any).GState({ opacity: 1 }));
      }

      // Marco dorado fino
      doc.setDrawColor(...GOLD);
      doc.setLineWidth(0.4);
      doc.rect(6, 6, pageW - 12, pageH - 12, 'S');

      // Línea diagonal decorativa en la esquina superior izquierda
      doc.setLineWidth(1.5);
      doc.line(0, 40, 40, 0);
      doc.setLineWidth(0.4); // restaurar

      // ---- Tarjeta logo (fondo blanco redondeado, centrado) ----
      const logoCardW = 100;
      const logoCardH = 45;
      const logoCardX = (pageW - logoCardW) / 2;
      const logoCardY = 30;
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(logoCardX, logoCardY, logoCardW, logoCardH, 5, 5, 'F');
      // Borde dorado sutil (como brillo)
      doc.setDrawColor(...GOLD);
      doc.setLineWidth(0.8);
      doc.roundedRect(logoCardX, logoCardY, logoCardW, logoCardH, 5, 5, 'S');

      if (logoBase64 && logoW > 0) {
        const maxLogoW = logoCardW - 16;
        const maxLogoH = logoCardH - 10;
        const ratio = logoW / logoH;
        let drawW = maxLogoW;
        let drawH = drawW / ratio;
        if (drawH > maxLogoH) { drawH = maxLogoH; drawW = drawH * ratio; }
        const drawX = logoCardX + (logoCardW - drawW) / 2;
        const drawY = logoCardY + (logoCardH - drawH) / 2;
        doc.addImage(logoBase64, 'PNG', drawX, drawY, drawW, drawH);
      }

      // ---- Subtitulo portada ----
      const textStartY = logoCardY + logoCardH + 25;
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'normal'); 
      doc.text('SELECCIÓN EXCLUSIVA', pageW / 2, textStartY, { align: 'center' });
      
      // DE INMUEBLES (con líneas a los lados)
      doc.setFontSize(14);
      doc.setTextColor(...GOLD);
      const textVip = 'DE INMUEBLES';
      const textVipW = doc.getTextWidth(textVip);
      doc.text(textVip, pageW / 2, textStartY + 8, { align: 'center' });
      
      doc.setDrawColor(...GOLD);
      doc.setLineWidth(0.3);
      doc.line(pageW / 2 - textVipW / 2 - 12, textStartY + 6.5, pageW / 2 - textVipW / 2 - 4, textStartY + 6.5);
      doc.line(pageW / 2 + textVipW / 2 + 4, textStartY + 6.5, pageW / 2 + textVipW / 2 + 12, textStartY + 6.5);

      doc.setTextColor(180, 180, 180);
      doc.setFontSize(8);
      doc.text('Portafolio preparado exclusivamente para usted', pageW / 2, textStartY + 18, { align: 'center' });

      // ---- Separador con Icono Central ----
      const sepY = textStartY + 35;
      doc.setDrawColor(...GOLD);
      doc.setLineWidth(0.3);
      doc.line(40, sepY, pageW / 2 - 9, sepY);
      doc.line(pageW / 2 + 9, sepY, pageW - 40, sepY);
      
      // Círculo dorado central
      doc.circle(pageW / 2, sepY, 8, 'S');
      // Icono de edificio simplificado dentro del círculo
      const bX = pageW / 2;
      const bY = sepY;
      doc.setDrawColor(...GOLD);
      doc.setLineWidth(0.3);
      // Base
      doc.line(bX - 3.5, bY + 4, bX + 3.5, bY + 4);
      // Edificio centro
      doc.rect(bX - 1.5, bY - 4, 3, 8, 'S');
      // Edificio izq
      doc.rect(bX - 3.5, bY - 1, 2, 5, 'S');
      // Edificio der
      doc.rect(bX + 1.5, bY - 2, 2, 6, 'S');
      // Puerta
      doc.rect(bX - 0.5, bY + 2, 1, 2, 'S');

      // ---- Contador de inmuebles ----
      const cntY = sepY + 20;
      doc.setTextColor(...GOLD);
      doc.setFontSize(40);
      doc.setFont('helvetica', 'bold');
      doc.text(`${propsToRender.length}`, pageW / 2, cntY, { align: 'center' });
      
      doc.setTextColor(200, 200, 200);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(`INMUEBLE${propsToRender.length > 1 ? 'S' : ''} SELECCIONADO${propsToRender.length > 1 ? 'S' : ''}`, pageW / 2, cntY + 8, { align: 'center' });

      // Fecha
      doc.setTextColor(140, 140, 140);
      doc.setFontSize(8);
      const dateText = new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });
      doc.text(dateText, pageW / 2, cntY + 18, { align: 'center' });

      // ---- Iconos inferiores (Exclusividad, Seguridad, Calidad, Confianza) ----
      const iconY = pageH - 45;
      const iconSpacing = (pageW - 40) / 4;
      const startX = 20 + iconSpacing / 2;
      
      const drawDiamond = (x: number, y: number) => {
        doc.line(x - 4, y - 2, x + 4, y - 2); 
        doc.line(x - 4, y - 2, x - 6, y);     
        doc.line(x + 4, y - 2, x + 6, y);     
        doc.line(x - 6, y, x, y + 5);         
        doc.line(x + 6, y, x, y + 5);         
        doc.line(x - 4, y - 2, x, y + 5);     
        doc.line(x + 4, y - 2, x, y + 5);     
        doc.line(x - 6, y, x + 6, y);         
      };
      
      const drawShield = (x: number, y: number) => {
        doc.line(x - 5, y - 4, x + 5, y - 4);
        doc.line(x - 5, y - 4, x - 5, y);
        doc.line(x + 5, y - 4, x + 5, y);
        doc.line(x - 5, y, x, y + 5);
        doc.line(x + 5, y, x, y + 5);
        doc.line(x - 2, y, x - 0.5, y + 1.5);
        doc.line(x - 0.5, y + 1.5, x + 3, y - 2);
      };
      
      const drawCrown = (x: number, y: number) => {
        doc.line(x - 5, y + 3, x + 5, y + 3); 
        doc.line(x - 5, y + 3, x - 6, y - 3); 
        doc.line(x + 5, y + 3, x + 6, y - 3); 
        doc.line(x - 6, y - 3, x - 2, y);     
        doc.line(x + 6, y - 3, x + 2, y);     
        doc.line(x - 2, y, x, y - 4);         
        doc.line(x + 2, y, x, y - 4);         
        doc.circle(x - 6, y - 4, 0.5, 'S');
        doc.circle(x + 6, y - 4, 0.5, 'S');
        doc.circle(x, y - 5, 0.5, 'S');
      };
      
      const drawHandshake = (x: number, y: number) => {
        doc.line(x - 6, y + 1, x - 2, y - 1);
        doc.line(x + 6, y + 1, x + 2, y - 1);
        doc.ellipse(x, y - 1, 3, 2, 'S'); 
        doc.line(x - 1, y, x + 1, y + 2); 
      };

      const bottomIcons = [
        { label: 'EXCLUSIVIDAD', draw: drawDiamond },
        { label: 'SEGURIDAD', draw: drawShield },
        { label: 'CALIDAD', draw: drawCrown },
        { label: 'CONFIANZA', draw: drawHandshake }
      ];

      doc.setDrawColor(...GOLD);
      doc.setLineWidth(0.3);
      bottomIcons.forEach((item, idx) => {
        const x = startX + idx * iconSpacing;
        item.draw(x, iconY);
        doc.setTextColor(200, 200, 200);
        doc.setFontSize(6);
        doc.text(item.label, x, iconY + 12, { align: 'center' });
      });

      // ---- Pie portada ----
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(6.5);
      doc.text('DOCUMENTO CONFIDENCIAL   •   GOLD LIFE REAL ESTATE   •   VIDA DE ORO', pageW / 2, pageH - 12, { align: 'center' });

      // ========== FICHAS DE INMUEBLES ==========
      for (let i = 0; i < propsToRender.length; i++) {
        const p = propsToRender[i];
        const imgData = images[i];

        setDebugLogs(prev => [...prev, `[PDF] Ficha ${i + 1}: ${p.idRegistro}`]);
        doc.addPage();

        // ===== DISEÑO ÉLITE (SOTHEBY'S / CHRISTIE'S) =====
        const MARGIN = 8;
        const contentW = pageW - MARGIN * 2;
        const imgH = contentW; // Cuadrado perfecto 1:1 (ej. 1080x1080)

        // Fondo global (Gris muy oscuro / Negro)
        doc.setFillColor(28, 29, 31);
        doc.rect(0, 0, pageW, pageH, 'F');

        // Marco Dorado (Golden Frame)
        doc.setDrawColor(...GOLD); // 212, 175, 55
        doc.setLineWidth(0.8);
        doc.rect(MARGIN - 0.4, MARGIN - 0.4, contentW + 0.8, pageH - MARGIN * 2 + 0.8, 'S');

        // ===== IMAGEN 1:1 =====
        if (imgData) {
          try {
            doc.addImage(imgData, 'JPEG', MARGIN, MARGIN, contentW, imgH);
          } catch {
            doc.setFillColor(40, 40, 40);
            doc.rect(MARGIN, MARGIN, contentW, imgH, 'F');
          }
        } else {
          doc.setFillColor(40, 40, 40);
          doc.rect(MARGIN, MARGIN, contentW, imgH, 'F');
          doc.setTextColor(100, 100, 100);
          doc.setFontSize(10);
          doc.text('Fotografía no disponible', pageW / 2, MARGIN + imgH / 2, { align: 'center' });
        }

        // ===== PANEL INFERIOR =====
        const panelY = MARGIN + imgH;
        const panelH = pageH - panelY - MARGIN;

        // Fondo del panel (Ligeramente más oscuro o textura)
        doc.setFillColor(24, 25, 26);
        doc.rect(MARGIN, panelY, contentW, panelH, 'F');

        // Línea divisoria gruesa dorada entre foto y panel
        doc.setFillColor(...GOLD);
        doc.rect(MARGIN, panelY, contentW, 1.5, 'F');

        // --- SECCIÓN 1: TÍTULO Y PRECIO ---
        const sec1Y = panelY + 9; // Subimos más la primera sección

        const isVenta = p.estado.includes('VENTA') || p.tipoNegocio.includes('VENTA');
        const isArriendo = p.estado.includes('ARRIENDO') || p.estado.includes('RENTA') || p.tipoNegocio.includes('ARRIENDO') || p.tipoNegocio.includes('ADMI-');
        const isMixto = (isVenta && isArriendo) || p.tipoNegocio.includes('VENDI') || p.tipoNegocio.includes('ADMI-VENTA');

        // TIPO (Tracking simulado con espacios)
        doc.setTextColor(...GOLD);
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'normal');
        const tipoText = (isMixto ? 'APARTAMENTO VENTA/ARRIENDO' : isVenta ? 'APARTAMENTO EN VENTA' : 'APARTAMENTO EN ARRIENDO').split('').join(' ');
        doc.text(tipoText, MARGIN + 8, sec1Y);

        // CODIGO DE INMUEBLE (Esquina superior derecha del panel)
        doc.setTextColor(150, 150, 150);
        doc.setFontSize(6.5);
        doc.text(`Cod Inm: ${p.idRegistro || ''}`.toUpperCase(), MARGIN + contentW - 8, sec1Y, { align: 'right' });

        // TÍTULO (Barrio) - Fuente SERIF gigante y elegante
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(38);
        doc.setFont('times', 'normal'); // Serif
        const barrio = (p.barrio || p.ciudad || 'UBICACIÓN').toUpperCase();
        doc.text(barrio, MARGIN + 7, sec1Y + 11);

        // UBICACIÓN (Pin + Dirección)
        const pinX = MARGIN + 10;
        const pinY = sec1Y + 18;
        doc.setFillColor(255, 255, 255);
        doc.circle(pinX, pinY - 1.5, 1.2, 'F');
        doc.triangle(pinX - 1.2, pinY - 1.2, pinX + 1.2, pinY - 1.2, pinX, pinY + 1.5, 'F');
        doc.setFillColor(24, 25, 26); // hueco del pin
        doc.circle(pinX, pinY - 1.5, 0.5, 'F');

        doc.setTextColor(220, 220, 220);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(String(p.direccion || 'Sin dirección'), MARGIN + 14, sec1Y + 19);

        // Ciudad (Gris)
        if (p.ciudad) {
          doc.setTextColor(140, 140, 140);
          doc.setFontSize(7);
          doc.text(`${p.ciudad.toUpperCase()}  •  ${(p.upz || 'ZONA').toUpperCase()}`, MARGIN + 14, sec1Y + 24);
        }

        // Línea dorada sutil bajo la ubicación
        doc.setDrawColor(...GOLD);
        doc.setLineWidth(0.3);
        doc.line(MARGIN + 12, sec1Y + 29, MARGIN + 40, sec1Y + 29);

        // SEPARADOR VERTICAL MEDIO
        const midX = MARGIN + contentW * 0.53;
        doc.setDrawColor(60, 60, 60);
        doc.setLineWidth(0.3);
        doc.line(midX, sec1Y, midX, sec1Y + 24);

        // PRECIO (Derecha)
        doc.setTextColor(...GOLD);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        const priceLabel = isMixto ? 'PRECIO DE VENTA/ARRIENDO' : isArriendo ? 'PRECIO DE ARRIENDO' : 'PRECIO DE VENTA';
        doc.text(priceLabel, midX + 8, sec1Y + 4);

        const mainPrice = (isArriendo || isMixto) ? fmt(p.precioGeneral) : fmt(p.precioVenta);
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(26);
        doc.setFont('times', 'bold'); // Serif para números elegantes
        doc.text(mainPrice || '-', midX + 8, sec1Y + 14);

        // Admin (opcional si es renta)
        if ((isArriendo || isMixto) && fmt(p.precioAdmin)) {
          doc.setTextColor(150, 150, 150);
          doc.setFontSize(7);
          doc.setFont('helvetica', 'normal');
          doc.text(`Incl. Admin: ${fmt(p.precioAdmin)}`, midX + 8, sec1Y + 20);
        }


        // --- SECCIÓN 2: MÉTRICAS (Líneas finas) ---
        const sec2Y = sec1Y + 41; // Espacio generoso desde arriba
        const numMetrics = 4; // Añadimos Área
        const metricW = contentW / numMetrics;

        const drawLineIcon = (type: string, cx: number, cy: number, sz: number) => {
          doc.setDrawColor(...GOLD);
          doc.setLineWidth(0.4);
          if (type === 'BED') {
            doc.roundedRect(cx - sz, cy - sz*0.5, sz*2, sz, 0.5, 0.5, 'S'); 
            doc.line(cx - sz, cy, cx + sz, cy); 
            doc.rect(cx - sz*0.8, cy - sz*0.4, sz*0.7, sz*0.3, 'S'); 
            doc.rect(cx + sz*0.1, cy - sz*0.4, sz*0.7, sz*0.3, 'S'); 
            doc.line(cx - sz*0.8, cy + sz*0.5, cx - sz*0.8, cy + sz*0.8); 
            doc.line(cx + sz*0.8, cy + sz*0.5, cx + sz*0.8, cy + sz*0.8); 
          } else if (type === 'BATH') {
            doc.line(cx - sz*0.9, cy, cx + sz*0.9, cy); 
            doc.line(cx - sz*0.8, cy + sz*0.6, cx + sz*0.8, cy + sz*0.6); 
            doc.line(cx - sz*0.9, cy, cx - sz*0.8, cy + sz*0.6); 
            doc.line(cx + sz*0.9, cy, cx + sz*0.8, cy + sz*0.6); 
            doc.line(cx - sz*0.7, cy, cx - sz*0.7, cy - sz*0.8); 
            doc.line(cx - sz*0.7, cy - sz*0.8, cx - sz*0.2, cy - sz*0.8); 
            doc.line(cx - sz*0.2, cy - sz*0.8, cx - sz*0.2, cy - sz*0.6); 
            doc.circle(cx - sz*0.2, cy - sz*0.5, sz*0.15, 'S'); 
          } else if (type === 'CAR') {
            doc.roundedRect(cx - sz*0.8, cy - sz*0.1, sz*1.6, sz*0.5, 0.5, 0.5, 'S'); 
            doc.line(cx - sz*0.6, cy - sz*0.1, cx - sz*0.4, cy - sz*0.6); 
            doc.line(cx + sz*0.6, cy - sz*0.1, cx + sz*0.4, cy - sz*0.6); 
            doc.line(cx - sz*0.4, cy - sz*0.6, cx + sz*0.4, cy - sz*0.6); 
            doc.circle(cx - sz*0.5, cy + sz*0.4, sz*0.25, 'S'); 
            doc.circle(cx + sz*0.5, cy + sz*0.4, sz*0.25, 'S'); 
          } else if (type === 'AREA') {
            const d = sz * 1.1; // Rombo
            doc.line(cx, cy - d, cx + d, cy);
            doc.line(cx + d, cy, cx, cy + d);
            doc.line(cx, cy + d, cx - d, cy);
            doc.line(cx - d, cy, cx, cy - d);
            doc.setFontSize(4.5);
            doc.setTextColor(255, 255, 255);
            doc.setFont('helvetica', 'bold');
            doc.text("m2", cx, cy + 1.5, { align: 'center' });
          }
        };

        const metrics = [
          { value: String(p.habitaciones || '0'), label: 'HABITACIONES', type: 'BED' },
          { value: String(p.banos || '0'), label: 'BAÑOS', type: 'BATH' },
          { value: String(p.area || '0'), label: 'ÁREA', type: 'AREA' },
          { value: String(p.garajes || '0'), label: 'GARAJES', type: 'CAR' },
        ];

        metrics.forEach((m, idx) => {
          const colX = MARGIN + metricW * idx;
          
          // Círculo del icono (Ajustado para 4 columnas)
          const circleX = colX + 15;
          const circleY = sec2Y;
          doc.setDrawColor(...GOLD);
          doc.setLineWidth(0.4);
          doc.circle(circleX, circleY, 7, 'S');
          
          drawLineIcon(m.type, circleX, circleY, 3.5);

          // Normalizar valores comunes
          let val = String(m.value || '0').trim();
          if (/ning/i.test(val)) val = '0'; // Ninguno, Ningun -> 0

          // Número (Derecha del icono) con Auto-scaling
          doc.setTextColor(255, 255, 255);
          doc.setFont('times', 'normal'); 
          let fSize = 26;
          doc.setFontSize(fSize);
          
          // Ancho máximo disponible dentro de la columna
          const maxTextW = 20; 
          while (doc.getTextWidth(val) > maxTextW && fSize > 8) {
            fSize -= 2;
            doc.setFontSize(fSize);
          }
          
          // Ajustar la posición Y ligeramente si la fuente se redujo mucho para que quede centrado
          const yOffset = fSize < 20 ? 1 : 3;
          doc.text(val, circleX + 13, sec2Y + yOffset);
          
          // Etiqueta (Debajo del número)
          doc.setTextColor(180, 180, 180);
          doc.setFontSize(6);
          doc.setFont('helvetica', 'normal');
          doc.text(m.label, circleX + 13, sec2Y + 8);
          
          // Separador Vertical
          if (idx < metrics.length - 1) {
            doc.setDrawColor(60, 60, 60);
            doc.setLineWidth(0.3);
            doc.line(colX + metricW, sec2Y - 6, colX + metricW, sec2Y + 8);
          }
        });

        // --- SECCIÓN 3: BOTONES ---
        const btnY = sec2Y + 18; // Botones con buen margen inferior
        const btnW = (contentW - 10) / 2;
        const btnH = 13;

        // BOTÓN 1: VIDEO TOUR (Fondo dorado)
        doc.setFillColor(212, 175, 55); 
        doc.roundedRect(MARGIN + 2, btnY, btnW - 2, btnH, 1.5, 1.5, 'F');
        doc.setTextColor(24, 25, 26);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text("VER VIDEO TOUR", MARGIN + btnW / 2 + 5, btnY + 8, { align: 'center' });
        
        // Icono Play
        const playX = MARGIN + btnW / 2 - 25;
        const playY = btnY + btnH / 2;
        doc.setDrawColor(24, 25, 26);
        doc.setLineWidth(0.4);
        doc.circle(playX, playY, 3.5, 'S');
        doc.setFillColor(24, 25, 26);
        doc.triangle(playX - 1, playY - 1.5, playX - 1, playY + 1.5, playX + 1.5, playY, 'F');
        if (p.youtube) doc.link(MARGIN + 2, btnY, btnW - 2, btnH, { url: p.youtube });

        // BOTÓN 2: FOTOGRAFÍAS (Fondo oscuro, borde dorado)
        const btn2X = MARGIN + btnW + 8;
        doc.setFillColor(32, 33, 35);
        doc.roundedRect(btn2X, btnY, btnW - 2, btnH, 1.5, 1.5, 'F');
        doc.setDrawColor(212, 175, 55);
        doc.setLineWidth(0.4);
        doc.roundedRect(btn2X, btnY, btnW - 2, btnH, 1.5, 1.5, 'S');
        doc.setTextColor(255, 255, 255);
        doc.text("VER FOTOGRAFÍAS", btn2X + btnW / 2 + 4, btnY + 8, { align: 'center' });
        
        // Icono Cámara
        const fbX = btn2X + btnW / 2 - 27;
        const fbY = btnY + btnH / 2;
        doc.setFillColor(255, 255, 255);
        doc.circle(fbX, fbY, 3.5, 'F');
        doc.setDrawColor(32, 33, 35);
        doc.setLineWidth(0.4);
        doc.roundedRect(fbX - 1.5, fbY - 1, 3, 2.2, 0.3, 0.3, 'S'); // body
        doc.circle(fbX, fbY + 0.1, 0.7, 'S'); // lens
        doc.line(fbX - 0.5, fbY - 1.5, fbX + 0.5, fbY - 1.5); // flash
        
        if (p.facebook) doc.link(btn2X, btnY, btnW - 2, btnH, { url: p.facebook });
      }

      // ---- Blob ----
      setDebugLogs(prev => [...prev, `[PDF] Generando blob...`]);
      const pdfBlob = doc.output('blob');
      setDebugLogs(prev => [...prev, `[PDF] OK! ${(pdfBlob.size / 1024).toFixed(0)} KB`]);

      // ---- Compartir o Descargar ----
      try {
        const pdfFileObj = new File([pdfBlob], filename, { type: 'application/pdf' });
        if (!forceDownload && navigator.share && navigator.canShare && navigator.canShare({ files: [pdfFileObj] })) {
          await navigator.share({ files: [pdfFileObj], title: 'Portafolio Gold Life', text: 'Seleccion exclusiva de inmuebles Gold Life Real Estate.' });
          setDebugLogs(prev => [...prev, `[PDF] Compartido!`]);
        } else throw new Error("no share or forced download");
      } catch {
        const url = URL.createObjectURL(pdfBlob);
        const a = document.createElement('a');
        a.href = url; a.download = filename; a.click();
        URL.revokeObjectURL(url);
        setDebugLogs(prev => [...prev, `[PDF] Descargado!`]);
      }

      setDebugLogs(prev => [...prev, `[PDF] EXITOSO!`]);
      setSelectedIds(new Set()); // Limpiar selección automáticamente
      setTimeout(() => setShowDebug(false), 6000);
    } catch (err: any) {
      setDebugLogs(prev => [...prev, `[PDF] ERROR: ${err?.message}`]);
      console.error("PDF error", err);
      alert("Error al generar el PDF. Revisa la consola.");
    } finally {
      setIsGeneratingPdf(false);
    }
  };


  return (
    <div className="pt-24 px-4 md:px-8 max-w-7xl mx-auto w-full relative">
      
      {/* Panel de Debug Flotante */}
      {showDebug && (
        <div style={{ position: 'fixed', bottom: '20px', right: '20px', width: '400px', maxHeight: '300px', overflowY: 'auto', backgroundColor: 'rgba(0,0,0,0.9)', color: '#0f0', padding: '15px', zIndex: 999999, border: '1px solid #333', borderRadius: '8px', fontFamily: 'monospace', fontSize: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }}>
          <div className="flex justify-between items-center mb-2 border-b border-gray-700 pb-2">
            <h3 className="font-bold text-white">Consola de Generación PDF</h3>
            <button onClick={() => setShowDebug(false)} className="text-red-500 font-bold hover:text-red-400">Cerrar</button>
          </div>
          {debugLogs.map((log, i) => (
            <div key={i} className={`mb-1 ${log.includes('ERROR') || log.includes('EXCEPCIÓN') ? 'text-red-500' : log.includes('WARN') ? 'text-yellow-500' : 'text-green-400'}`}>
              {log}
            </div>
          ))}
        </div>
      )}

      {/* Overlay de Carga Full Screen para enmascarar la renderización del PDF */}
      {isGeneratingPdf && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(10, 10, 10, 0.95)', zIndex: 99999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)' }}>
          <Loader2 className="w-16 h-16 animate-spin text-brand-gold mb-6" />
          <h2 className="text-3xl text-white font-black tracking-wider uppercase mb-2">Generando Portafolio VIP</h2>
          <p className="text-stone-300 text-lg">Procesando fotografías de alta calidad y formateando documento...</p>
        </div>
      )}

      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6 mb-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-stone-900 flex items-center gap-3">
            <Building2 className="w-8 h-8 text-brand-gold" />
            Portafolio de Inmuebles
          </h1>
          <p className="text-stone-600 mt-2 text-sm max-w-xl">
            Catálogo global de inmuebles publicados. Selecciona propiedades para generar un portafolio PDF elegante y enviarlo al instante.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex bg-stone-900 border border-stone-800 rounded-xl p-1 shrink-0 overflow-x-auto w-full sm:w-auto">
            {(['Todos', 'Venta', 'Arriendo', 'Mixto'] as const).map(tipo => (
              <button
                key={tipo}
                onClick={() => setTipoFiltro(tipo)}
                className={`px-4 md:px-6 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-all flex-1 sm:flex-none ${tipoFiltro === tipo ? 'bg-brand-gold text-stone-950 shadow-lg' : 'text-stone-400 hover:text-white hover:bg-stone-800'}`}
              >
                {tipo}
              </button>
            ))}
          </div>
          
          <div className="flex bg-stone-900 border border-stone-800 rounded-xl p-1 shrink-0 w-full sm:w-auto justify-center sm:justify-start">
            <button 
              onClick={() => setViewMode('grid')}
              className={`p-3 px-6 sm:px-3 rounded-lg transition-colors flex items-center justify-center ${viewMode === 'grid' ? 'bg-brand-gold shadow text-stone-950' : 'text-stone-500 hover:text-white'}`}
            >
              <LayoutGrid className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={`p-3 px-6 sm:px-3 rounded-lg transition-colors flex items-center justify-center ${viewMode === 'list' ? 'bg-brand-gold shadow text-stone-950' : 'text-stone-500 hover:text-white'}`}
            >
              <List className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-4 mb-4">
        <div className="relative flex-1 w-full">
          <Search className="w-5 h-5 text-stone-500 absolute left-4 top-1/2 -translate-y-1/2" />
          <input 
            type="text" 
            placeholder="Buscar por Dirección, Barrio o ID de Registro..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-stone-900 border border-stone-700 text-white pl-12 pr-4 py-4 rounded-2xl focus:outline-none focus:border-brand-gold transition-colors placeholder:text-stone-600 shadow-inner"
          />
        </div>
        <button 
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center justify-center gap-2 px-6 py-4 rounded-2xl font-bold transition-all w-full sm:w-auto shrink-0 ${showFilters ? 'bg-brand-gold text-stone-950' : 'bg-stone-900 border border-stone-800 text-white hover:border-brand-gold'}`}
        >
          <Filter className="w-5 h-5" />
          {showFilters ? 'Ocultar Filtros' : 'Filtros Avanzados'}
        </button>
      </div>

      {/* Panel de Filtros Avanzados */}
      {showFilters && (
        <div className="bg-white border border-stone-200 rounded-2xl p-6 mb-8 shadow-sm animate-fade-in grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-bold text-stone-500 uppercase mb-2">Habitaciones (Min)</label>
            <input 
              type="number" min="0"
              className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2 focus:border-brand-gold focus:outline-none" 
              placeholder="Ej. 2"
              value={filtrosAvanzados.habitaciones} onChange={(e) => setFiltrosAvanzados({...filtrosAvanzados, habitaciones: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-stone-500 uppercase mb-2">Baños (Min)</label>
            <input 
              type="number" min="0"
              className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2 focus:border-brand-gold focus:outline-none" 
              placeholder="Ej. 1"
              value={filtrosAvanzados.banos} onChange={(e) => setFiltrosAvanzados({...filtrosAvanzados, banos: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-stone-500 uppercase mb-2">Garajes (Min)</label>
            <input 
              type="number" min="0"
              className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2 focus:border-brand-gold focus:outline-none" 
              placeholder="Ej. 1"
              value={filtrosAvanzados.garajes} onChange={(e) => setFiltrosAvanzados({...filtrosAvanzados, garajes: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-stone-500 uppercase mb-2">Ciudad</label>
            <input 
              type="text"
              className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2 focus:border-brand-gold focus:outline-none" 
              placeholder="Ej. Bogotá"
              value={filtrosAvanzados.ciudad} onChange={(e) => setFiltrosAvanzados({...filtrosAvanzados, ciudad: e.target.value})}
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-stone-500 uppercase mb-2">Barrio / Localidad</label>
            <input 
              type="text"
              className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2 focus:border-brand-gold focus:outline-none" 
              placeholder="Ej. Usaquén, Chapinero..."
              value={filtrosAvanzados.barrio} onChange={(e) => setFiltrosAvanzados({...filtrosAvanzados, barrio: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-stone-500 uppercase mb-2">Precio Mínimo</label>
            <input 
              type="text"
              className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2 focus:border-brand-gold focus:outline-none" 
              placeholder="$0"
              value={filtrosAvanzados.precioMin} 
              onChange={(e) => setFiltrosAvanzados({...filtrosAvanzados, precioMin: formatMoney(e.target.value)})}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-stone-500 uppercase mb-2">Precio Máximo</label>
            <input 
              type="text"
              className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2 focus:border-brand-gold focus:outline-none" 
              placeholder="Sin límite"
              value={filtrosAvanzados.precioMax} 
              onChange={(e) => setFiltrosAvanzados({...filtrosAvanzados, precioMax: formatMoney(e.target.value)})}
            />
          </div>
          <div className="sm:col-span-2 md:col-span-4 flex justify-end">
            <button 
              onClick={() => setFiltrosAvanzados({habitaciones: '', banos: '', garajes: '', ciudad: '', barrio: '', precioMin: '', precioMax: ''})}
              className="text-stone-500 hover:text-red-500 text-sm font-bold transition-colors"
            >
              Limpiar Filtros
            </button>
          </div>
        </div>
      )}

      {selectedIds.size > 0 && (
        <div className="bg-brand-gold/10 border border-brand-gold/30 rounded-2xl p-4 mb-8 flex flex-col sm:flex-row items-center justify-between gap-4 animate-fade-in shadow-xl shadow-brand-gold/5 sticky top-24 z-40 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-brand-gold flex items-center justify-center text-stone-950 font-black text-lg">
              {selectedIds.size}
            </div>
            <span className="text-stone-900 font-bold">Inmuebles seleccionados para el Portafolio</span>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            <button 
              onClick={() => generatePDF()}
              disabled={isGeneratingPdf}
              className="w-full sm:w-auto bg-brand-gold text-stone-950 px-6 py-3 rounded-xl font-bold hover:bg-yellow-500 hover:scale-105 transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand-gold/20 disabled:opacity-50 disabled:hover:scale-100"
            >
              {isGeneratingPdf ? <Loader2 className="w-5 h-5 animate-spin" /> : <span className="text-xl leading-none">📤</span>}
              {isGeneratingPdf ? 'Generando PDF...' : 'Generar PDF y Compartir'}
            </button>
            <button 
              onClick={() => generatePDF(undefined, true)}
              disabled={isGeneratingPdf}
              className="w-full sm:w-auto bg-stone-900 text-brand-gold border border-stone-700 px-6 py-3 rounded-xl font-bold hover:bg-stone-800 hover:scale-105 transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 disabled:hover:scale-100"
            >
              {isGeneratingPdf ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
              {isGeneratingPdf ? 'Generando...' : 'Descargar Solo'}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-brand-gold">
          <Loader2 className="w-12 h-12 animate-spin mb-4" />
          <p className="text-stone-400 font-medium">Conectando con Google Drive y CRM...</p>
        </div>
      ) : error ? (
        <div className="bg-red-900/20 border border-red-500/50 rounded-2xl p-6 text-center">
          <p className="text-red-400 font-bold mb-2">Error de conexión</p>
          <p className="text-stone-300 text-sm">{error}</p>
          <button onClick={fetchProperties} className="mt-4 px-6 py-2 bg-stone-800 text-white rounded-lg border border-stone-700 hover:border-red-500 transition-colors">
            Reintentar
          </button>
        </div>
      ) : filteredProperties.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-stone-800 rounded-3xl">
          <p className="text-stone-500 text-lg">No se encontraron inmuebles que coincidan con la búsqueda.</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProperties.map(prop => (
            <div 
              key={prop.idRegistro} 
              className={`bg-stone-900 rounded-3xl overflow-hidden border flex flex-col h-full transition-all duration-300 group ${selectedIds.has(prop.idRegistro) ? 'border-brand-gold ring-1 ring-brand-gold shadow-[0_0_20px_rgba(212,175,55,0.15)]' : 'border-stone-800 hover:border-stone-600'}`}
            >
              {/* Imagen y Selector */}
              <div className="relative aspect-[16/10] bg-stone-950 overflow-hidden cursor-pointer" onClick={() => toggleSelection(prop.idRegistro)}>
                {prop.imageUrl ? (
                  <img src={prop.imageUrl} alt={prop.direccion} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90 group-hover:opacity-100" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-stone-700 bg-stone-900">
                    <Building2 className="w-12 h-12 mb-2 opacity-50" />
                    <span className="text-xs uppercase tracking-widest font-bold">Sin Foto</span>
                  </div>
                )}
                
                {/* Checkbox */}
                <div className={`absolute top-4 left-4 w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors ${selectedIds.has(prop.idRegistro) ? 'bg-brand-gold border-brand-gold text-stone-950' : 'bg-black/50 border-white/50 text-transparent hover:border-white'}`}>
                  <Check className="w-5 h-5" strokeWidth={3} />
                </div>

                {/* ID Badge */}
                <div className="absolute top-4 right-4 bg-black/70 backdrop-blur-md border border-stone-700/50 px-3 py-1 rounded-full text-xs font-mono font-bold text-white shadow-lg">
                  {prop.idRegistro}
                </div>

                {/* Estado Overlay */}
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 to-transparent p-4 pt-12">
                  <span className="inline-block px-2 py-1 rounded bg-stone-800/80 backdrop-blur text-[10px] font-black tracking-widest uppercase text-brand-gold border border-brand-gold/30">
                    {prop.tipoNegocio}
                  </span>
                </div>
              </div>

              {/* Info Container */}
              <div className="p-5 flex flex-col flex-1">
                
                <h3 className="text-white font-bold text-lg mb-1 line-clamp-1 flex items-center gap-2">
                  {prop.barrio || prop.ciudad || 'Ubicación Pendiente'}
                </h3>
                <p className="text-stone-500 text-xs mb-4 line-clamp-1 flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> {prop.direccion}
                </p>

                {/* Características Píldoras */}
                <div className="flex flex-wrap gap-2 mb-4">
                  <div className="bg-stone-950 border border-stone-800 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 text-xs text-stone-300 font-medium">
                    <Bed className="w-3.5 h-3.5 text-stone-500" /> {prop.habitaciones}
                  </div>
                  <div className="bg-stone-950 border border-stone-800 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 text-xs text-stone-300 font-medium">
                    <Bath className="w-3.5 h-3.5 text-stone-500" /> {prop.banos}
                  </div>
                  <div className="bg-stone-950 border border-stone-800 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 text-xs text-stone-300 font-medium">
                    <Car className="w-3.5 h-3.5 text-stone-500" /> {prop.garajes}
                  </div>
                </div>

                {/* Precios */}
                <div className="mb-6">
                  {getPriceDisplay(prop)}
                </div>

                {/* Botones de Acción Individuales */}
                <div className="grid grid-cols-4 gap-2 pt-4 border-t border-stone-800/50 mt-auto">
                  <button 
                    onClick={() => copyToClipboard(prop)}
                    title="Copiar Resumen WhatsApp"
                    className="col-span-1 bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-white rounded-xl h-10 flex items-center justify-center transition-colors"
                  >
                    {copiedId === prop.idRegistro ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                  <button 
                    onClick={() => generatePDF(prop)}
                    title="Generar PDF Individual"
                    className="col-span-1 bg-stone-800 hover:bg-brand-gold hover:text-stone-950 text-stone-400 rounded-xl h-10 flex items-center justify-center transition-colors"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  {prop.youtube && (
                    <a 
                      href={prop.youtube} target="_blank" rel="noreferrer" title="Ver YouTube"
                      className="col-span-1 bg-red-900/20 hover:bg-red-600 text-red-500 hover:text-white rounded-xl h-10 flex items-center justify-center transition-colors"
                    >
                      <Youtube className="w-4 h-4" />
                    </a>
                  )}
                  {prop.documentoFirmado && (
                    <a 
                      href={prop.documentoFirmado} target="_blank" rel="noreferrer" title="Ver Documento Firmado (Solo Agente)"
                      className="col-span-1 bg-stone-950 hover:bg-stone-800 border border-stone-800 text-stone-500 hover:text-white rounded-xl h-10 flex items-center justify-center transition-colors relative group/doc"
                    >
                      <Lock className="w-3 h-3 absolute top-1 right-1 opacity-50" />
                      <FileText className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>

            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="hidden md:flex items-center px-4 py-3 bg-stone-900 rounded-xl text-xs font-bold text-stone-500 uppercase tracking-wider border border-stone-800">
            <div className="w-12 text-center">Sel</div>
            <div className="w-24 px-2">ID</div>
            <div className="w-1/4 px-2">Ubicación</div>
            <div className="w-1/5 px-2">Características</div>
            <div className="w-28 px-2">Negocio</div>
            <div className="flex-1 px-2 text-right">Precio General</div>
            <div className="w-28 text-center px-2">Acciones</div>
          </div>

          {filteredProperties.map(prop => (
            <div 
              key={prop.idRegistro} 
              className={`bg-stone-900 rounded-2xl overflow-hidden border transition-all duration-200 flex flex-col md:flex-row items-center p-3 gap-2 ${selectedIds.has(prop.idRegistro) ? 'border-brand-gold ring-1 ring-brand-gold shadow-[0_0_15px_rgba(212,175,55,0.15)]' : 'border-stone-800 hover:border-stone-600'}`}
            >
              <div className="w-full md:w-12 flex items-center justify-between md:justify-center mb-2 md:mb-0 px-2 md:px-0">
                <span className="md:hidden text-stone-500 text-xs font-bold uppercase">Seleccionar</span>
                <button 
                  onClick={() => toggleSelection(prop.idRegistro)}
                  className={`w-7 h-7 shrink-0 rounded-md flex items-center justify-center border-2 transition-colors ${selectedIds.has(prop.idRegistro) ? 'bg-brand-gold border-brand-gold text-stone-950' : 'bg-stone-950 border-stone-700 text-transparent hover:border-stone-500'}`}
                >
                  <Check className="w-4 h-4" strokeWidth={3} />
                </button>
              </div>

              <div className="w-full md:w-24 px-2 shrink-0 font-mono text-xs font-bold text-stone-400 flex items-center justify-between md:block">
                <span className="md:hidden text-stone-500 text-xs font-bold uppercase">ID</span>
                {prop.idRegistro}
              </div>

              <div className="w-full md:w-1/4 px-2 shrink-0 flex items-center gap-3">
                <div className="w-12 h-12 rounded bg-stone-950 overflow-hidden shrink-0 border border-stone-800 hidden md:block">
                  {prop.imageUrl ? (
                    <img src={prop.imageUrl} alt="thmb" className="w-full h-full object-cover opacity-80" />
                  ) : (
                    <Building2 className="w-full h-full p-3 text-stone-700 opacity-50" />
                  )}
                </div>
                <div>
                  <h3 className="text-white font-bold text-sm line-clamp-1">{prop.barrio || prop.ciudad || 'Pendiente'}</h3>
                  <p className="text-stone-500 text-[10px] line-clamp-1 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-2.5 h-2.5" /> {prop.direccion}
                  </p>
                </div>
              </div>

              <div className="w-full md:w-1/5 px-2 shrink-0 flex items-center gap-2 mt-2 md:mt-0">
                <div className="flex items-center gap-1.5 text-[11px] text-stone-300 font-medium bg-stone-950 border border-stone-800 px-2 py-1 rounded-md">
                  <Bed className="w-3 h-3 text-stone-500" /> {prop.habitaciones}
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-stone-300 font-medium bg-stone-950 border border-stone-800 px-2 py-1 rounded-md">
                  <Bath className="w-3 h-3 text-stone-500" /> {prop.banos}
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-stone-300 font-medium bg-stone-950 border border-stone-800 px-2 py-1 rounded-md">
                  <Car className="w-3 h-3 text-stone-500" /> {prop.garajes}
                </div>
              </div>

              <div className="w-full md:w-28 px-2 shrink-0 flex items-center justify-between md:block mt-2 md:mt-0">
                <span className="md:hidden text-stone-500 text-xs font-bold uppercase">Negocio</span>
                <span className="inline-block px-2 py-1 rounded bg-stone-800/80 text-[9px] font-black tracking-widest uppercase text-brand-gold border border-brand-gold/30">
                  {prop.tipoNegocio}
                </span>
              </div>

              <div className="w-full md:flex-1 px-2 flex items-center justify-between md:justify-end mt-2 md:mt-0">
                <span className="md:hidden text-stone-500 text-xs font-bold uppercase">Precio</span>
                <div className="text-right">
                  {prop.estado.includes('VENTA/RENTA') ? (
                    <>
                      <div className="text-sm font-black text-brand-gold">
                        Arriendo: {formatMoney(prop.precioGeneral)}
                      </div>
                      <div className="text-[11px] font-bold text-stone-400">
                        Venta: {formatMoney(prop.precioVenta)}
                      </div>
                    </>
                  ) : prop.estado.includes('ARRIENDO') ? (
                    <div className="text-base font-black text-brand-gold">
                      {formatMoney(prop.precioGeneral)}
                    </div>
                  ) : (
                    <div className="text-base font-black text-white">
                      {formatMoney(prop.precioVenta)}
                    </div>
                  )}
                </div>
              </div>

              <div className="w-full md:w-28 px-2 flex items-center gap-2 justify-center shrink-0 mt-3 md:mt-0 border-t border-stone-800 pt-3 md:border-0 md:pt-0">
                <button 
                  onClick={() => copyToClipboard(prop)}
                  title="Copiar Resumen WhatsApp"
                  className="bg-stone-800 hover:bg-stone-700 text-stone-400 rounded-lg w-9 h-9 flex items-center justify-center transition-colors"
                >
                  {copiedId === prop.idRegistro ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
                <button 
                  onClick={() => generatePDF(prop)}
                  title="Generar PDF Individual"
                  className="bg-stone-800 hover:bg-brand-gold hover:text-stone-950 text-stone-400 rounded-lg w-9 h-9 flex items-center justify-center transition-colors"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>

            </div>
          ))}
        </div>
      )}
    </div>
  );
}
