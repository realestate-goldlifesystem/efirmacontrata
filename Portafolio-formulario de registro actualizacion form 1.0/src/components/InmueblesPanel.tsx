import type React from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Building2, RefreshCw, Search, X, Loader2, AlertTriangle, Phone, MessageCircle, ExternalLink,
  ChevronDown, Plus, Mail, FolderOpen, FileText, Video, Check,
} from 'lucide-react';
import { API_URL } from './CitasAgendaPanel';
import { celularInternacional } from './CaptacionesPanel';
import { Marco, Listo } from './CaptacionesModales';

// ==========================================
// CRM DE INMUEBLES (19-nov-2026)
// ==========================================
// Ventana sobre la pestaña "1.1 - INMUEBLES REGISTRADOS" (API_CRM_INMUEBLES.js).
// Las columnas se buscan por su nombre en el backend; el inmueble se ubica por su
// CODIGO DE REGISTRO. Cambiar el estado aquí hace lo mismo que en el Sheet, y
// ESTUDIO APROBADO abre la ventana para enviarle el formulario al inquilino.

export interface Inmueble {
  fila: number; id: string; cdr: string; registroMs: number | null; fechaRegistro: string;
  estado: string; etapa: number | null; detalleEstado: string; estadoDocumental: string; detalleDocumental: string;
  negocio: string; tipo: string; localidad: string; barrio: string; edificio: string; direccion: string; ciudad: string;
  area: string; habitaciones: string; banos: string; estrato: string; antiguedad: string; piso: string; garajes: string;
  deposito: string; depositoSi: boolean; mascotas: string; vigilancia: string; zonas: string[];
  precio: string; precioVenta: string; administracion: string; canonFinal: string;
  propietario: string; celular: string; paisCelular: string; correo: string;
  inquilino: string; celularInquilino: string; correoInquilino: string;
  inicioContrato: string; finContrato: string; entrega: string; autorizacion: string;
  video: boolean; multimedia: boolean; firmado: boolean;
  links: Record<string, string>;
}

type Grupo = 'activos' | 'inactivos' | 'todos';
type Pestana = 'inmueble' | 'personas' | 'contrato' | 'archivos';

async function llamarInm(credential: string | null, op: string, extra: Record<string, unknown> = {}) {
  const r = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ accion: 'crmInmuebles', op, credential, ...extra }),
  });
  return r.json();
}

// Color por etapa: claro para la lista, oscuro para la ficha
const COLOR_ETAPA: Record<string, { claro: [string, string]; oscuro: [string, string, string]; punto: string }> = {
  '-1': { claro: ['#f5f5f4', '#57534e'], oscuro: ['#292524', '#a8a29e', '#d6d3d1'], punto: '#a8a29e' },
  '0': { claro: ['#f5f5f4', '#44403c'], oscuro: ['#292524', '#a8a29e', '#e7e5e4'], punto: '#a8a29e' },
  '1': { claro: ['#dbeafe', '#1e40af'], oscuro: ['#1e3a5f', '#93c5fd', '#dbeafe'], punto: '#60a5fa' },
  '2': { claro: ['#ede9fe', '#5b21b6'], oscuro: ['#3b2a63', '#c4b5fd', '#ede9fe'], punto: '#a78bfa' },
  '3': { claro: ['#fef3c7', '#92400e'], oscuro: ['#4a3712', '#f3d27a', '#fef3c7'], punto: '#f3d27a' },
  '4': { claro: ['#ccfbf1', '#115e59'], oscuro: ['#134e4a', '#5eead4', '#ccfbf1'], punto: '#5eead4' },
  '5': { claro: ['#ffedd5', '#9a3412'], oscuro: ['#4c2a12', '#fdba74', '#ffedd5'], punto: '#fb923c' },
  '6': { claro: ['#dcfce7', '#166534'], oscuro: ['#14402c', '#86efac', '#dcfce7'], punto: '#86efac' },
};
const colorDe = (etapa: number | null) => COLOR_ETAPA[String(etapa ?? 0)] || COLOR_ETAPA['0'];

// Pasos de E-FirmaContrata (columna ESTADO DOCUMENTAL)
const PASOS_DOC = ['Propietario envió', 'Propietario validado', 'Inquilino envió', 'Inquilino validado', 'Completo'];
const PASO_DOC: Record<string, number> = {
  PROP_SUBMITTED: 0, PROP_CORRECTION: 0, PROP_VALIDATED: 1, INQ_SUBMITTED: 2, INQ_CORRECTION: 2, INQ_VALIDATED: 3, COMPLETED: 4,
};

const tituloDe = (i: Inmueble) => [i.tipo || 'Inmueble', i.barrio || i.edificio].filter(Boolean).join(' · ');
const precioDe = (i: Inmueble) => (i.negocio.toLowerCase() === 'venta' ? i.precioVenta || i.precio : i.precio || i.precioVenta);
const datosDe = (i: Inmueble) => [i.habitaciones && i.habitaciones + ' hab', i.banos && i.banos + ' baños', i.area && i.area + ' m²', i.estrato && 'E' + i.estrato].filter(Boolean).join(' · ');
const activo = (i: Inmueble) => i.etapa !== -1;

export default function InmueblesPanel({ agentCredential, onRegistrar }: { agentCredential: string | null; onRegistrar: () => void }) {
  const [inmuebles, setInmuebles] = useState<Inmueble[] | null>(null);
  const [etapas, setEtapas] = useState<string[]>([]);
  const [estados, setEstados] = useState<string[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [grupo, setGrupo] = useState<Grupo>('activos');
  const [filtroEtapa, setFiltroEtapa] = useState<number | null>(null);
  const [filtroNegocio, setFiltroNegocio] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [limite, setLimite] = useState(40);
  const [selCdr, setSelCdr] = useState<string | null>(null);
  const [emailPara, setEmailPara] = useState<string | null>(null);

  const aplicar = (r: { inmuebles?: Inmueble[]; etapas?: string[]; estados?: string[] }) => {
    if (r.inmuebles) setInmuebles(r.inmuebles);
    if (r.etapas) setEtapas(r.etapas);
    if (r.estados) setEstados(r.estados);
  };

  const cargar = async () => {
    if (!agentCredential) { setError('Tu sesión de Google ya no está disponible. Cierra sesión y vuelve a entrar.'); return; }
    setCargando(true); setError(null);
    try {
      const r = await llamarInm(agentCredential, 'listar');
      if (r.success) aplicar(r); else setError(r.message || 'No se pudieron cargar los inmuebles.');
    } catch { setError('Error de red al conectar con el servidor.'); }
    finally { setCargando(false); }
  };
  useEffect(() => { cargar(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);
  useEffect(() => { setLimite(40); }, [grupo, filtroEtapa, filtroNegocio, busqueda]);

  const todos = inmuebles || [];
  const delGrupo = useMemo(() => todos.filter(i => grupo === 'todos' ? true : grupo === 'activos' ? activo(i) : !activo(i)), [todos, grupo]);
  const conteoEtapa = useMemo(() => {
    const m: Record<number, number> = {};
    todos.filter(activo).forEach(i => { const e = i.etapa ?? 0; m[e] = (m[e] || 0) + 1; });
    return m;
  }, [todos]);
  const negocios = useMemo(() => Array.from(new Set(todos.map(i => i.negocio).filter(Boolean))), [todos]);

  const coincide = (i: Inmueble, sin: 'negocio' | null = null) => {
    if (filtroEtapa !== null && (i.etapa ?? 0) !== filtroEtapa) return false;
    if (sin !== 'negocio' && filtroNegocio && i.negocio !== filtroNegocio) return false;
    const q = busqueda.trim().toLowerCase();
    if (q && ![i.id, i.cdr, i.barrio, i.edificio, i.direccion, i.propietario, i.inquilino, i.localidad].some(x => (x || '').toLowerCase().includes(q))) return false;
    return true;
  };
  const filtrados = useMemo(() => delGrupo.filter(i => coincide(i)).sort((a, b) => (b.registroMs ?? 0) - (a.registroMs ?? 0)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [delGrupo, filtroEtapa, filtroNegocio, busqueda]);
  const cuentaNegocio = (n: string | null) => delGrupo.filter(i => coincide(i, 'negocio') && (n === null || i.negocio === n)).length;

  const seleccionado = todos.find(i => i.cdr === selCdr) || null;
  const nActivos = todos.filter(activo).length;

  // Celular: la franja tapa la barra transparente de arriba solo cuando ya quedó fija
  const franjaRef = useRef<HTMLDivElement>(null);
  const [franjaFija, setFranjaFija] = useState(false);
  useEffect(() => {
    const revisar = () => { const el = franjaRef.current; if (el) setFranjaFija(el.getBoundingClientRect().top <= 81 && window.scrollY > 0); };
    revisar();
    window.addEventListener('scroll', revisar, { passive: true });
    window.addEventListener('resize', revisar);
    return () => { window.removeEventListener('scroll', revisar); window.removeEventListener('resize', revisar); };
  }, []);

  // PC: la ficha mide lo que queda visible de la pantalla (un solo scroll)
  const fichaPcRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = fichaPcRef.current;
    if (!el) return;
    const ajustar = () => { const arriba = Math.max(el.getBoundingClientRect().top, 96); el.style.height = Math.max(360, window.innerHeight - arriba - 16) + 'px'; };
    ajustar();
    window.addEventListener('scroll', ajustar, { passive: true });
    window.addEventListener('resize', ajustar);
    return () => { window.removeEventListener('scroll', ajustar); window.removeEventListener('resize', ajustar); };
  }, [inmuebles, selCdr]);

  const ficha = (movil: boolean) => seleccionado && (
    <FichaInmueble i={seleccionado} etapas={etapas} estados={estados} credential={agentCredential} movil={movil}
      onCerrar={() => setSelCdr(null)}
      onLista={(r) => { aplicar(r); if (r.abrir === 'emailInquilino') setEmailPara(seleccionado.cdr); }} />
  );

  return (
    <div className="w-full max-w-[1760px] mx-auto px-[clamp(1rem,2.5vw,3rem)] pt-2 md:pt-20 xl:pt-0 xl:pl-[15rem]">
      {/* Cabecera */}
      <div className="flex flex-wrap items-end justify-between gap-4 mb-5">
        <div>
          <h1 className="text-3xl md:text-4xl font-light text-brand-gold flex items-center gap-3"><Building2 className="w-8 h-8" /> Inmuebles</h1>
          <p className="text-stone-600 mt-1 text-sm md:text-base">
            {inmuebles ? `${todos.length} registrados · ${nActivos} activos` : 'Los inmuebles registrados, su estado y su trámite.'}
            <span className="hidden sm:inline"> Todo queda en el Sheet.</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onRegistrar}
            className="flex items-center gap-2 min-h-[44px] px-5 py-2 bg-brand-gold text-stone-950 font-semibold rounded-full shadow-[0_6px_18px_rgba(212,175,55,.3)] hover:brightness-105 transition-all">
            <Plus className="w-4 h-4" /> Registrar
          </button>
          <button onClick={cargar} disabled={cargando} aria-label="Actualizar"
            className="flex items-center gap-2 min-h-[44px] min-w-[44px] justify-center px-4 py-2 bg-white border border-stone-300 rounded-full text-stone-700 hover:border-brand-gold transition-all disabled:opacity-50">
            <RefreshCw className={`w-4 h-4 ${cargando ? 'animate-spin' : ''}`} /> <span className="hidden sm:inline">Actualizar</span>
          </button>
        </div>
      </div>

      {/* Franja: activos/inactivos y embudo por etapa (fija en el celular) */}
      <div ref={franjaRef} className={`max-md:sticky max-md:top-20 max-md:z-30 max-md:-mx-4 max-md:px-4 max-md:pt-1 max-md:pb-2.5 max-md:mb-4 max-md:bg-[#faf8f5]
        ${franjaFija ? `max-md:shadow-[0_8px_16px_-12px_rgba(28,25,23,.25)] max-md:before:content-[''] max-md:before:absolute max-md:before:inset-x-0 max-md:before:bottom-full max-md:before:h-20 max-md:before:bg-[#faf8f5]` : ''}`}>
        <div className="grid grid-cols-3 p-1 rounded-full bg-stone-900 border border-stone-800 w-full sm:w-auto sm:inline-grid mb-2 md:mb-4">
          {(['activos', 'inactivos', 'todos'] as Grupo[]).map(g => (
            <button key={g} onClick={() => { setGrupo(g); setFiltroEtapa(null); }} aria-pressed={grupo === g}
              className={`min-h-[44px] px-3 sm:px-6 rounded-full text-[13px] sm:text-sm font-semibold whitespace-nowrap transition-all ${grupo === g ? 'bg-brand-gold text-stone-950 shadow' : 'text-stone-400 hover:text-white'}`}>
              {g === 'activos' ? 'Activos' : g === 'inactivos' ? 'Inactivos' : 'Todos'}
              {inmuebles && g !== 'todos' && <span className="ml-1 text-[11px] sm:text-sm opacity-70 font-normal tabular-nums">{g === 'activos' ? nActivos : todos.length - nActivos}</span>}
            </button>
          ))}
        </div>
        {grupo !== 'inactivos' && etapas.length > 0 && (
          <div className="flex md:grid md:grid-cols-7 gap-2 md:gap-3 md:mb-6 overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 pb-1 [scrollbar-width:none]">
            {etapas.map((t, k) => {
              const sel = filtroEtapa === k;
              return (
                <button key={t} onClick={() => setFiltroEtapa(sel ? null : k)} aria-pressed={sel}
                  className={`shrink-0 min-w-[108px] md:min-w-0 text-left rounded-2xl bg-stone-900 border px-3.5 py-2.5 md:px-4 md:py-3 transition-colors ${sel ? 'border-brand-gold ring-1 ring-brand-gold' : 'border-stone-800 hover:border-stone-600'}`}>
                  <div className="flex items-center gap-1.5 text-[10px] md:text-[11px] uppercase tracking-[0.1em] text-stone-400 whitespace-nowrap">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: colorDe(k).punto }} />{t}
                  </div>
                  <div className="text-2xl md:text-3xl font-semibold tabular-nums text-white">{conteoEtapa[k] || 0}</div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {error && (
        <div className="mb-5 flex items-start gap-3 p-4 rounded-2xl border border-red-300 bg-red-50 text-red-800">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" /><span>{error}</span>
        </div>
      )}
      {cargando && !inmuebles && (
        <div className="flex items-center justify-center gap-3 py-20 text-stone-500"><Loader2 className="w-6 h-6 animate-spin text-brand-gold" /> Leyendo el Sheet…</div>
      )}

      {inmuebles && (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_clamp(360px,30vw,460px)] gap-[clamp(1rem,1.6vw,2rem)] items-start">
          <div className="min-w-0 flex flex-col gap-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" />
              <label htmlFor="buscar-inmueble" className="sr-only">Buscar inmueble</label>
              <input id="buscar-inmueble" value={busqueda} onChange={e => setBusqueda(e.target.value)}
                placeholder="Buscar por ID, barrio, dirección o propietario"
                className="w-full h-12 pl-11 pr-10 rounded-2xl bg-white border border-stone-300 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20" />
              {busqueda && <button onClick={() => setBusqueda('')} aria-label="Limpiar búsqueda" className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center text-stone-400"><X className="w-4 h-4" /></button>}
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 min-w-0 [scrollbar-width:none]">
              {[null, ...negocios].map(n => (
                <button key={n || 'todos'} onClick={() => setFiltroNegocio(n)} aria-pressed={filtroNegocio === n}
                  className={`shrink-0 min-h-[44px] px-4 rounded-full border text-sm flex items-center gap-1.5 whitespace-nowrap transition-all ${filtroNegocio === n ? 'bg-stone-900 text-white border-stone-900' : 'bg-white text-stone-700 border-stone-300 hover:border-stone-400'}`}>
                  {n || 'Todos'} <b className="font-semibold">{cuentaNegocio(n)}</b>
                </button>
              ))}
            </div>
            <div className="text-xs text-stone-500">{filtrados.length} inmuebles · los más recientes primero</div>

            {filtrados.length === 0 && <div className="rounded-2xl border border-dashed border-stone-300 px-4 py-6 text-sm text-stone-500 text-center">No hay inmuebles con estos filtros.</div>}

            {/* Celular y tablet: tarjetas */}
            <div className="grid grid-cols-1 gap-2.5 lg:hidden">
              {filtrados.slice(0, limite).map(i => <TarjetaInmueble key={i.cdr} i={i} activo={selCdr === i.cdr} onClick={() => setSelCdr(i.cdr)} />)}
            </div>

            {/* PC: tabla */}
            {filtrados.length > 0 && (
              <div className="hidden lg:block rounded-2xl bg-white border border-stone-200 overflow-x-auto">
                <table className="w-full min-w-[760px] border-collapse text-sm">
                  <thead>
                    <tr className="text-left text-stone-500 text-[11px] uppercase tracking-[0.1em]">
                      <th className="px-4 py-3 font-semibold">Inmueble</th>
                      <th className="px-2 py-3 font-semibold">Negocio</th>
                      <th className="px-2 py-3 font-semibold">Precio</th>
                      <th className="px-2 py-3 font-semibold">Estado</th>
                      <th className="px-4 py-3 font-semibold">Detalle</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtrados.slice(0, limite).map(i => {
                      const c = colorDe(i.etapa).claro;
                      return (
                        <tr key={i.cdr} onClick={() => setSelCdr(i.cdr)} tabIndex={0} onKeyDown={e => { if (e.key === 'Enter') setSelCdr(i.cdr); }}
                          className={`border-t border-stone-100 cursor-pointer transition-colors ${selCdr === i.cdr ? 'bg-amber-50' : 'hover:bg-stone-50'}`}>
                          <td className="px-4 py-3 min-w-[230px]">
                            <div className="font-semibold text-stone-900 whitespace-nowrap">{tituloDe(i)}</div>
                            <div className="text-xs text-stone-500 whitespace-nowrap">{i.id} · {datosDe(i)}</div>
                          </td>
                          <td className="px-2 py-3 text-stone-700">{i.negocio}</td>
                          <td className="px-2 py-3 font-semibold text-[#8a6d1c] whitespace-nowrap">{precioDe(i) || '—'}</td>
                          <td className="px-2 py-3"><span className="text-[11px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap" style={{ background: c[0], color: c[1] }}>{i.estado || 'SIN ESTADO'}</span></td>
                          <td className="px-4 py-3 text-xs text-stone-600 max-w-[260px] truncate">{i.detalleEstado}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {filtrados.length > limite && (
              <button onClick={() => setLimite(x => x + 40)} className="min-h-[44px] rounded-2xl border border-stone-300 bg-white text-stone-700 text-sm hover:border-brand-gold">
                Mostrar más ({filtrados.length - limite})
              </button>
            )}
          </div>

          {/* Ficha: columna fija en PC */}
          <div ref={fichaPcRef} className="hidden lg:flex flex-col sticky top-24 h-[calc(100vh-7rem)]">
            {seleccionado ? ficha(false)
              : <div className="rounded-3xl border border-dashed border-stone-300 p-10 text-center text-stone-500 text-sm">Elige un inmueble para ver su ficha, su trámite y sus documentos.</div>}
          </div>
        </div>
      )}

      {/* Ficha en el celular: hoja desde abajo */}
      {seleccionado && createPortal(
        <div className="lg:hidden fixed inset-0 ajusta-teclado z-[150] bg-stone-950/60 backdrop-blur-sm flex items-end overflow-hidden overscroll-none" onClick={() => setSelCdr(null)}>
          <div className="w-full max-h-[92dvh] flex flex-col rounded-t-3xl animate-fade-in" onClick={e => e.stopPropagation()}>
            {ficha(true)}
          </div>
        </div>,
        document.body
      )}

      {emailPara && (() => {
        const i = todos.find(x => x.cdr === emailPara);
        return i ? <EmailInquilinoModal i={i} credential={agentCredential} onCerrar={() => setEmailPara(null)} onLista={aplicar} /> : null;
      })()}
    </div>
  );
}

// ---------- Piezas ----------

function TarjetaInmueble({ i, activo: sel, onClick }: { key?: string; i: Inmueble; activo: boolean; onClick: () => void }) {
  const c = colorDe(i.etapa).oscuro;
  return (
    <button onClick={onClick}
      className={`w-full min-w-0 text-left rounded-2xl bg-stone-900 border ${sel ? 'border-brand-gold' : 'border-stone-800 hover:border-stone-600'} px-4 pt-3.5 pb-3 transition-colors`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] text-stone-400 truncate">{i.id} · {i.negocio}</div>
          <div className="text-white font-semibold truncate">{tituloDe(i)}</div>
          <div className="text-stone-400 text-[13px] truncate">{datosDe(i)}</div>
        </div>
        <span className="shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-full" style={{ background: c[0], color: c[1] }}>{i.estado || 'SIN ESTADO'}</span>
      </div>
      <div className="mt-2.5 flex items-center justify-between gap-2">
        <span className="text-[15px] font-semibold text-brand-gold-light truncate">{precioDe(i) || '—'}</span>
        <span className="flex gap-1.5 shrink-0">
          {i.video && <Sello>Video</Sello>}
          {i.firmado && <Sello>Firmado</Sello>}
        </span>
      </div>
      {i.detalleEstado && <div className="mt-1.5 text-xs text-stone-300 truncate">{i.detalleEstado}</div>}
    </button>
  );
}

function Sello({ children }: { children: React.ReactNode }) {
  return <span className="text-[11px] text-stone-400 px-2 py-0.5 rounded-full border border-stone-700 inline-flex items-center gap-1"><Check className="w-3 h-3" />{children}</span>;
}

function FichaInmueble({ i, etapas, estados, credential, movil, onCerrar, onLista }: {
  i: Inmueble; etapas: string[]; estados: string[]; credential: string | null; movil: boolean;
  onCerrar: () => void; onLista: (r: { inmuebles?: Inmueble[]; etapas?: string[]; estados?: string[]; abrir?: string }) => void;
}) {
  const [pestana, setPestana] = useState<Pestana>('inmueble');
  const [eligiendo, setEligiendo] = useState(false);
  const [porConfirmar, setPorConfirmar] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { setEligiendo(false); setPorConfirmar(null); setError(null); }, [i.cdr]);

  const c = colorDe(i.etapa).oscuro;
  const cel = celularInternacional(i.celular);

  const cambiar = async () => {
    if (!porConfirmar) return;
    setGuardando(true); setError(null);
    try {
      const r = await llamarInm(credential, 'cambiarEstado', { cdr: i.cdr, estado: porConfirmar });
      if (r.success) { onLista(r); setEligiendo(false); setPorConfirmar(null); }
      else setError(r.message || 'No se pudo cambiar el estado.');
    } catch { setError('Error de red al cambiar el estado.'); }
    finally { setGuardando(false); }
  };

  return (
    <div className={`flex-1 min-h-0 flex flex-col bg-stone-900 border border-stone-800 ${movil ? 'rounded-t-3xl' : 'rounded-3xl'} text-stone-200 overflow-hidden`}>
      {/* Fijo arriba */}
      <div className="shrink-0 px-4 pt-3 pb-3 border-b border-stone-800">
        {movil && <div className="w-10 h-1 rounded-full bg-stone-700 mx-auto mb-2.5" />}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[11px] text-stone-500 truncate">{i.id} · {i.negocio}</div>
            <h3 className="text-lg font-semibold text-white leading-tight truncate">{tituloDe(i)}</h3>
            <div className="text-[13px] text-stone-400 truncate">{[i.direccion, i.localidad, i.estrato && 'Estrato ' + i.estrato].filter(Boolean).join(' · ')}</div>
          </div>
          <button onClick={onCerrar} aria-label="Cerrar ficha" className="w-11 h-11 -mt-1 -mr-1.5 flex items-center justify-center rounded-full bg-stone-800 text-stone-400 hover:text-white shrink-0"><X className="w-5 h-5" /></button>
        </div>

        {/* Estado: se cambia como en el Sheet */}
        <button onClick={() => { setEligiendo(v => !v); setPorConfirmar(null); }} disabled={guardando} aria-expanded={eligiendo}
          className="mt-2.5 w-full rounded-xl px-3.5 py-2.5 text-left disabled:opacity-70" style={{ background: c[0] }}>
          <span className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ color: c[1] }}>Estado</span>
            <span className="flex items-center gap-1.5 text-[13px] font-bold" style={{ color: c[2] }}>
              {i.estado || 'SIN ESTADO'}
              {guardando ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronDown className={`w-4 h-4 transition-transform ${eligiendo ? 'rotate-180' : ''}`} />}
            </span>
          </span>
          {i.detalleEstado && <span className="block text-[12.5px] mt-0.5" style={{ color: c[1] }}>{i.detalleEstado}</span>}
        </button>
        {eligiendo && (
          <div className="mt-2 rounded-xl bg-stone-950/60 border border-stone-800 p-2">
            {porConfirmar ? (
              <div className="flex flex-col gap-2">
                <div className="text-sm text-stone-200">¿Cambiar a <b className="text-white">{porConfirmar}</b>? Se aplica en el Sheet igual que si lo cambiaras allá.</div>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setPorConfirmar(null)} className="min-h-[44px] rounded-lg border border-stone-700 text-stone-200">Volver</button>
                  <button onClick={cambiar} disabled={guardando} className="min-h-[44px] rounded-lg bg-brand-gold text-stone-950 font-semibold disabled:opacity-50">Confirmar</button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-1.5 max-h-[42vh] overflow-y-auto overscroll-contain [scrollbar-width:none]">
                {estados.map(e => (
                  <button key={e} onClick={() => setPorConfirmar(e)} disabled={e === i.estado}
                    className={`min-h-[44px] rounded-lg px-2 text-[11.5px] font-semibold text-left border ${e === i.estado ? 'border-brand-gold text-brand-gold-light' : 'border-stone-800 text-stone-200 hover:border-stone-600'}`}>{e}</button>
                ))}
              </div>
            )}
          </div>
        )}
        {error && <div className="mt-2 text-sm text-red-300 flex items-start gap-2"><AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />{error}</div>}

        {/* Avance del trámite */}
        {i.etapa !== -1 && (
          <div className="mt-2.5 flex gap-1">
            {etapas.map((t, k) => {
              const hecho = (i.etapa ?? 0) > k, va = (i.etapa ?? 0) === k;
              return (
                <div key={t} className="flex-1 min-w-0">
                  <div className="h-1 rounded-full" style={{ background: hecho ? '#d4af37' : va ? colorDe(k).punto : '#292524' }} />
                  <div className="text-[9.5px] mt-1 truncate" style={{ color: hecho ? '#e3cc6c' : va ? '#e7e5e4' : '#57534e' }}>{t}</div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-2.5 grid grid-cols-3 gap-1.5">
          <a href={cel ? `https://wa.me/${cel}` : undefined} target="_blank" rel="noopener noreferrer" aria-disabled={!cel}
            className={`h-11 rounded-xl bg-emerald-500/15 text-emerald-300 font-semibold text-[13px] flex items-center justify-center gap-1.5 ${cel ? 'hover:bg-emerald-500/25' : 'opacity-40 pointer-events-none'}`}><MessageCircle className="w-4 h-4" />WhatsApp</a>
          <a href={cel ? `tel:+${cel}` : undefined} aria-disabled={!cel}
            className={`h-11 rounded-xl bg-brand-gold/15 text-brand-gold-light font-semibold text-[13px] flex items-center justify-center gap-1.5 ${cel ? 'hover:bg-brand-gold/25' : 'opacity-40 pointer-events-none'}`}><Phone className="w-4 h-4" />Llamar</a>
          {/^https?:\/\//i.test(i.links.anuncio || '')
            ? <a href={i.links.anuncio} target="_blank" rel="noopener noreferrer" className="h-11 rounded-xl border border-stone-700 text-stone-200 text-[13px] flex items-center justify-center gap-1.5 hover:border-stone-500"><ExternalLink className="w-4 h-4" />Anuncio</a>
            : <span className="h-11 rounded-xl border border-stone-800 text-stone-600 text-[13px] flex items-center justify-center">Sin anuncio</span>}
        </div>

        <div className="mt-2.5 grid grid-cols-4 p-[3px] rounded-xl bg-stone-950" role="tablist">
          {(['inmueble', 'personas', 'contrato', 'archivos'] as Pestana[]).map(p => (
            <button key={p} role="tab" aria-selected={pestana === p} onClick={() => setPestana(p)}
              className={`min-h-[40px] rounded-[9px] text-[12.5px] font-semibold capitalize ${pestana === p ? 'bg-brand-gold text-stone-950' : 'text-stone-400 hover:text-stone-200'}`}>{p}</button>
          ))}
        </div>
      </div>

      {/* Lo que se desliza */}
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain px-4 py-3 flex flex-col gap-2.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {pestana === 'inmueble' && <>
          <div className="grid grid-cols-2 gap-2">
            <Cifra t={i.negocio.toLowerCase() === 'venta' ? 'Precio de venta' : 'Precio de promoción'} v={precioDe(i)} dorado />
            <Cifra t="Administración" v={i.administracion} />
          </div>
          <div className="rounded-2xl bg-stone-950/60 border border-stone-800 p-3 grid grid-cols-4 gap-x-1.5 gap-y-2.5">
            {[[i.area, 'm²'], [i.habitaciones, 'Habitaciones'], [i.banos, 'Baños'], [i.piso, 'Piso'],
              [i.garajes, 'Garajes'], [i.depositoSi ? 'Sí' : 'No', 'Depósito'], [i.mascotas ? (i.mascotas.toUpperCase() === 'SI' ? 'Sí' : 'No') : '—', 'Mascotas'], [i.antiguedad, 'Antigüedad']]
              .map(([v, t]) => (
                <div key={t} className="text-center min-w-0">
                  <div className="text-[15px] font-semibold text-white truncate">{v || '—'}</div>
                  <div className="text-[10.5px] text-stone-500 truncate">{t}</div>
                </div>
              ))}
          </div>
          {i.zonas.length > 0 && (
            <Caja t="Zonas">
              <div className="flex flex-wrap gap-1.5">{i.zonas.map(z => <span key={z} className="text-xs px-2.5 py-1 rounded-full bg-stone-900 border border-stone-700 text-stone-300">{z}</span>)}</div>
            </Caja>
          )}
          <Caja t="Publicación">
            <Fila t="Video en YouTube" v={i.video ? 'Listo' : 'Pendiente'} ok={i.video} />
            <Fila t="Fotos y multimedia" v={i.multimedia ? 'Listo' : 'Pendiente'} ok={i.multimedia} />
            <Fila t="Autorización de ingreso" v={i.autorizacion || '—'} />
            <Fila t="Registrado" v={i.fechaRegistro || '—'} />
          </Caja>
        </>}

        {pestana === 'personas' && <>
          <Persona rol="Propietario" nombre={i.propietario} celular={i.celular} correo={i.correo} />
          <Persona rol="Inquilino" nombre={i.inquilino} celular={i.celularInquilino} correo={i.correoInquilino} vacio="Aún sin inquilino" />
        </>}

        {pestana === 'contrato' && <>
          <Caja t="E-FirmaContrata">
            {(() => {
              const paso = PASO_DOC[(i.estadoDocumental || '').toUpperCase()];
              const correccion = /CORRECTION/i.test(i.estadoDocumental);
              return <>
                <div className="flex gap-1">
                  {PASOS_DOC.map((t, k) => (
                    <div key={t} className="flex-1 min-w-0">
                      <div className="h-1 rounded-full" style={{ background: paso !== undefined && k <= paso ? '#d4af37' : '#292524' }} />
                      <div className="text-[9.5px] mt-1 leading-tight" style={{ color: paso !== undefined && k <= paso ? '#e3cc6c' : '#57534e' }}>{t}</div>
                    </div>
                  ))}
                </div>
                <div className="text-xs text-stone-400 mt-2">
                  {paso === undefined ? 'Aún no ha empezado el trámite documental.' : correccion ? 'Hay documentos devueltos para corrección.' : i.detalleDocumental || ''}
                </div>
              </>;
            })()}
          </Caja>
          <Caja t="Contrato">
            <Fila t="Acuerdo de promoción" v={i.firmado ? 'Firmado' : 'Sin firmar'} ok={i.firmado} />
            <Fila t="Inicio del contrato" v={i.inicioContrato || '—'} />
            <Fila t="Fin del contrato" v={i.finContrato || '—'} />
            <Fila t="Entrega del inmueble" v={i.entrega || '—'} />
            <Fila t="Canon final" v={i.canonFinal || '—'} />
          </Caja>
        </>}

        {pestana === 'archivos' && (
          <Caja t="Carpetas y documentos">
            {[
              ['Carpeta del registro', i.links.carpeta, FolderOpen], ['Contenido (fotos y video)', i.links.contenido, FolderOpen],
              ['Carpeta del propietario', i.links.propietario, FolderOpen], ['Carpeta del inquilino', i.links.inquilino, FolderOpen],
              ['Video', i.links.video, Video], ['Acuerdo de corretaje', i.links.acuerdoCorretaje, FileText],
              ['Acuerdo de administración', i.links.acuerdoAdministracion, FileText], ['Acuerdo de venta', i.links.acuerdoVenta, FileText],
              ['Autorización de ingreso', i.links.autorizacionIngreso, FileText],
            ].filter(([, u]) => /^https?:\/\//i.test(String(u || ''))).map(([t, u, Icono]) => {
              const I = Icono as React.ComponentType<{ className?: string }>;
              return (
                <a key={String(t)} href={String(u)} target="_blank" rel="noopener noreferrer"
                  className="min-h-[44px] flex items-center gap-2.5 border-b border-stone-800 last:border-0 text-sm text-stone-200 hover:text-brand-gold-light">
                  <I className="w-4 h-4 text-brand-gold-light shrink-0" /><span className="flex-1 truncate">{String(t)}</span><ExternalLink className="w-3.5 h-3.5 text-stone-500" />
                </a>
              );
            })}
          </Caja>
        )}
      </div>
    </div>
  );
}

function Cifra({ t, v, dorado = false }: { t: string; v: string; dorado?: boolean }) {
  return (
    <div className="rounded-2xl bg-stone-950/60 border border-stone-800 px-3 py-2.5 min-w-0">
      <div className="text-[10px] uppercase tracking-[0.12em] text-stone-500">{t}</div>
      <div className={`text-base font-semibold truncate ${dorado ? 'text-brand-gold-light' : 'text-white'}`}>{v || '—'}</div>
    </div>
  );
}

function Caja({ t, children }: { t: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-stone-950/60 border border-stone-800 px-3 py-2.5">
      <div className="text-[10px] uppercase tracking-[0.12em] text-stone-500 mb-2">{t}</div>
      {children}
    </div>
  );
}

function Fila({ t, v, ok }: { t: string; v: string; ok?: boolean }) {
  return (
    <div className="min-h-[38px] flex items-center justify-between gap-3 border-b border-stone-800/70 last:border-0">
      <span className="text-[13px] text-stone-300">{t}</span>
      <span className={`text-xs font-semibold text-right ${ok === undefined ? 'text-stone-200' : ok ? 'text-emerald-300' : 'text-amber-300'}`}>{v}</span>
    </div>
  );
}

function Persona({ rol, nombre, celular, correo, vacio = 'Sin datos' }: { rol: string; nombre: string; celular: string; correo: string; vacio?: string }) {
  const cel = celularInternacional(celular);
  return (
    <div className={`rounded-2xl bg-stone-950/60 border ${nombre ? 'border-stone-800' : 'border-dashed border-stone-700'} px-3 py-2.5`}>
      <div className="text-[10px] uppercase tracking-[0.12em] text-stone-500">{rol}</div>
      <div className={`font-semibold ${nombre ? 'text-white' : 'text-stone-500'}`}>{nombre || vacio}</div>
      {nombre && <>
        <div className="text-xs text-stone-400 mt-0.5 truncate">{[celular, correo].filter(Boolean).join(' · ')}</div>
        <div className="mt-2 grid grid-cols-3 gap-1.5">
          <a href={cel ? `https://wa.me/${cel}` : undefined} target="_blank" rel="noopener noreferrer" className={`h-10 rounded-lg bg-emerald-500/15 text-emerald-300 text-xs font-semibold flex items-center justify-center gap-1 ${cel ? '' : 'opacity-40 pointer-events-none'}`}><MessageCircle className="w-3.5 h-3.5" />WhatsApp</a>
          <a href={cel ? `tel:+${cel}` : undefined} className={`h-10 rounded-lg bg-brand-gold/15 text-brand-gold-light text-xs font-semibold flex items-center justify-center gap-1 ${cel ? '' : 'opacity-40 pointer-events-none'}`}><Phone className="w-3.5 h-3.5" />Llamar</a>
          <a href={correo ? `mailto:${correo}` : undefined} className={`h-10 rounded-lg border border-stone-700 text-stone-200 text-xs flex items-center justify-center gap-1 ${correo ? '' : 'opacity-40 pointer-events-none'}`}><Mail className="w-3.5 h-3.5" />Correo</a>
        </div>
      </>}
    </div>
  );
}

/**
 * ESTUDIO APROBADO: la misma ventana del Sheet ("Enviar formulario al inquilino").
 * El envío lo hace el backend con procesarEmailInquilinoEnFila_, igual que el Sheet.
 */
function EmailInquilinoModal({ i, credential, onCerrar, onLista }: {
  i: Inmueble; credential: string | null; onCerrar: () => void; onLista: (r: { inmuebles?: Inmueble[] }) => void;
}) {
  const [nombre, setNombre] = useState(i.inquilino || '');
  const [email, setEmail] = useState(i.correoInquilino || '');
  const [confirmado, setConfirmado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const [listo, setListo] = useState('');
  const yaEnviado = !!i.correoInquilino || /ENVIADO/i.test(i.estado) || /Formulario enviado/i.test(i.detalleEstado);
  const correoOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const valido = nombre.trim().length >= 3 && correoOk && confirmado;

  const enviar = async () => {
    if (!valido) return;
    setEnviando(true); setError('');
    try {
      const r = await llamarInm(credential, 'emailInquilino', { cdr: i.cdr, nombre: nombre.trim(), email: email.trim() });
      if (r.success) { onLista(r); setListo('Le enviamos al inquilino el link del formulario de E-FirmaContrata. El inmueble quedó en FORMULARIO ENVIADO, esperando su respuesta.'); }
      else setError(r.message || 'No se pudo enviar.');
    } catch { setError('Error de red al enviar.'); }
    finally { setEnviando(false); }
  };

  const campo = 'mt-1 w-full h-11 rounded-xl bg-stone-950 border border-stone-700 px-3 text-sm text-white placeholder:text-stone-500 focus:outline-none focus:border-brand-gold';
  return (
    <Marco titulo="Enviar formulario al inquilino" sub={`${i.id} · E-FirmaContrata`} onCerrar={onCerrar}
      pie={listo ? undefined : (
        <div className="flex flex-col gap-2">
          {error && <div className="text-sm text-red-300">{error}</div>}
          <div className="grid grid-cols-2 gap-2">
            <button onClick={onCerrar} className="min-h-[48px] rounded-xl border border-stone-700 text-stone-200 hover:border-stone-500">Ahora no</button>
            <button onClick={enviar} disabled={!valido || enviando}
              className="min-h-[48px] rounded-xl bg-brand-gold text-stone-950 font-bold disabled:opacity-40 flex items-center justify-center gap-2">
              {enviando && <Loader2 className="w-4 h-4 animate-spin" />}{enviando ? 'Enviando…' : 'Enviar formulario'}
            </button>
          </div>
        </div>
      )}>
      {listo ? <Listo texto={listo} onCerrar={onCerrar} /> : (
        <div className="flex flex-col gap-4 pt-1">
          <div className="rounded-2xl bg-stone-950/60 border border-stone-800 px-3 py-2.5 text-sm">
            <div className="flex justify-between gap-3"><span className="text-stone-500">Estado</span><span className="font-semibold text-violet-300">ESTUDIO APROBADO</span></div>
            <div className="flex justify-between gap-3 mt-1"><span className="text-stone-500">Dirección</span><span className="text-stone-200 text-right truncate">{i.direccion || '—'}</span></div>
            <div className="flex justify-between gap-3 mt-1"><span className="text-stone-500">Negocio</span><span className="text-stone-200">{i.negocio}</span></div>
          </div>
          {yaEnviado && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[13px] text-amber-200">
              Ya se le había enviado el formulario a un inquilino. Si lo envías de nuevo, le llega un link nuevo.
            </div>
          )}
          <div>
            <label htmlFor="inq-nombre" className="text-xs text-stone-400">Nombre completo del inquilino</label>
            <input id="inq-nombre" className={campo} value={nombre} onChange={e => setNombre(e.target.value.trimStart())} placeholder="Ej: Juan Carlos Pérez García" />
          </div>
          <div>
            <label htmlFor="inq-correo" className="text-xs text-stone-400">Correo del inquilino</label>
            <input id="inq-correo" type="email" className={campo} value={email} onChange={e => setEmail(e.target.value.trim())} placeholder="ejemplo@correo.com" />
            {email && !correoOk && <div className="text-xs text-amber-300 mt-1">Revisa el correo.</div>}
          </div>
          <label className="flex items-start gap-3 min-h-[44px] text-sm text-stone-300 cursor-pointer">
            <input type="checkbox" checked={confirmado} onChange={e => setConfirmado(e.target.checked)} className="mt-1 w-5 h-5 accent-[#d4af37]" />
            Confirmo que el nombre y el correo del inquilino son correctos.
          </label>
        </div>
      )}
    </Marco>
  );
}
