import type React from 'react';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Users, RefreshCw, Search, X, Loader2, AlertTriangle, Phone, ExternalLink,
  Bot, CalendarClock, PhoneCall, Flame, Inbox, ChevronDown, Send, Clock, MessageSquareText, Pencil,
} from 'lucide-react';

/** Logo de WhatsApp (el mismo glifo de la app), en el color del texto. */
function IconoWhatsApp({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

import { API_URL } from './CitasAgendaPanel';
import MiguelCaptadorModal from './MiguelCaptadorModal';
import { ProgramarLlamadaModal, AgendarPresentacionModal, ElegirSeguimientoModal, EditarDatosModal } from './CaptacionesModales';

// ==========================================
// CRM DE CAPTACIONES (18-nov-2026)
// ==========================================
// Ventana sobre las pestañas "1 - CAPTACIONES A / V" del Sheet: todo lo que se
// lee y se escribe vive allá (API_CRM_CAPTACIONES.js). Las columnas se buscan
// por su nombre en el backend, nunca por su posición.

export interface Lead {
  idLead: string;
  fila: number;
  n: string;
  nombre: string;
  celular: string;
  link: string;
  estado: string;
  tipo: string;
  habitaciones: string;
  valor: string;
  ubicacion: string;
  localidad: string;
  detalles: string;
  fechaSeguimiento: string;
  horaSeguimiento: string;
  seguimientoMs: number | null;
  fechaContacto: string;
  fechaCaptacion: string;
  captacionMs: number | null;
  proximaLlamadaMs: number | null;
  llamadaEstado: string;
  /** LLAMADA | MENSAJE: qué seguimiento está programado (uno reemplaza al otro) */
  llamadaTipo?: string;
  correo: string;
  idCita: string;
  /** % de oferta negociado, en puntos (70, 2.5); '' si no hay. Solo lo ve el agente. */
  ofertaA?: number | '';
  ofertaV?: number | '';
}

/** "70 % arriendo · 2,5 % venta" con los % que tenga el propietario; '' si ninguno. */
export function textoOferta(lead: Pick<Lead, 'ofertaA' | 'ofertaV'>): string {
  const f = (v: number | '' | undefined, que: string) => v === '' || v == null ? '' : String(v).replace('.', ',') + ' % ' + que;
  return [f(lead.ofertaA, 'arriendo'), f(lead.ofertaV, 'venta')].filter(Boolean).join(' · ');
}

export interface EstadoInfo { nombre: string; fondo: string; texto: string; }

type Operacion = 'A' | 'V';
type Vista = 'hoy' | 'todos';

const LOCALIDADES: Record<string, string> = { U: 'Usaquén', S: 'Suba', C: 'Chapinero' };
const DIA = 86400000;
// Mismos días que el correo diario de "propietarios por retomar" (SEGUIMIENTO_CRM.js)
const DIAS_RETOMAR: Record<string, number> = { 'CITA CANCELADA': 2, 'SEGUIMIENTO': 3 };
const LLAMADA_PENDIENTE = ['PROGRAMADA', 'CONFIRMADA'];

/** Llamada al backend del CRM con la sesión de Google del agente. */
export async function llamarCRM(credential: string | null, op: string, extra: Record<string, unknown> = {}) {
  const r = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ accion: 'crmCaptaciones', op, credential, ...extra }),
  });
  return r.json();
}

/** Colores del estado tal cual el Sheet; si la regla no trae color de letra, se elige por contraste. */
export function estiloEstado(estados: EstadoInfo[], nombre: string): React.CSSProperties {
  const e = estados.find(x => x.nombre.toUpperCase() === (nombre || '').toUpperCase());
  const fondo = e?.fondo || '#e7e5e4';
  let texto = e?.texto || '';
  if (!texto || texto.toLowerCase() === fondo.toLowerCase()) {
    const h = fondo.replace('#', '');
    const [r, g, b] = [0, 2, 4].map(i => parseInt(h.substr(i, 2), 16) || 0);
    texto = (0.299 * r + 0.587 * g + 0.114 * b) > 150 ? '#1c1917' : '#ffffff';
  }
  return { background: fondo, color: texto };
}

export const celularInternacional = (c: string) => (c.length === 10 ? '57' + c : c);

const inicioHoy = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); };
const textoHora = (ms: number) => {
  const d = new Date(ms);
  return (d.getHours() % 12 || 12) + ':' + String(d.getMinutes()).padStart(2, '0') + (d.getHours() < 12 ? ' AM' : ' PM');
};
const textoFechaCorta = (ms: number) => {
  const d = new Date(ms);
  const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  return d.getDate() + ' ' + MES[d.getMonth()] + ' · ' + textoHora(ms);
};
const haceDias = (ms: number | null) => (ms == null ? null : Math.floor((inicioHoy() - new Date(ms).setHours(0, 0, 0, 0)) / DIA));

interface Props { agentCredential: string | null; }

export default function CaptacionesPanel({ agentCredential }: Props) {
  const [operacion, setOperacion] = useState<Operacion>('A');
  const [vista, setVista] = useState<Vista>('hoy');
  const [datos, setDatos] = useState<Record<Operacion, { leads: Lead[]; estados: EstadoInfo[] } | null>>({ A: null, V: null });
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<string | null>(null);
  const [filtroLocalidad, setFiltroLocalidad] = useState<string | null>(null);
  const [filtroHab, setFiltroHab] = useState<string | null>(null);
  const [limite, setLimite] = useState(40);
  const [selId, setSelId] = useState<string | null>(null);
  const [miguel, setMiguel] = useState(false);

  const actual = datos[operacion];
  const leads = actual?.leads || [];
  const estados = actual?.estados || [];

  const cargar = async (op: Operacion = operacion) => {
    if (!agentCredential) {
      setError('Tu sesión de Google ya no está disponible. Cierra sesión y vuelve a entrar.');
      return;
    }
    setCargando(true);
    setError(null);
    try {
      const r = await llamarCRM(agentCredential, 'listar', { operacion: op });
      if (r.success) setDatos(d => ({ ...d, [op]: { leads: r.leads || [], estados: r.estados || [] } }));
      else setError(r.message || 'No se pudieron cargar las captaciones.');
    } catch {
      setError('Error de red al conectar con el servidor.');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { if (!datos[operacion]) cargar(operacion); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [operacion]);
  useEffect(() => { setLimite(40); }, [operacion, vista, busqueda, filtroEstado, filtroLocalidad, filtroHab]);

  /** Reemplaza un propietario con lo que devolvió el servidor tras un cambio. */
  const actualizarLead = (lead: Lead | null | undefined) => {
    if (!lead) return;
    setDatos(d => {
      const act = d[operacion];
      if (!act) return d;
      return { ...d, [operacion]: { ...act, leads: act.leads.map(l => (l.idLead === lead.idLead ? lead : l)) } };
    });
  };

  // ---------- Grupos de la vista "Hoy" ----------
  const hoy = useMemo(() => {
    const h0 = inicioHoy(), h1 = h0 + DIA;
    const llamadas = leads
      .filter(l => l.proximaLlamadaMs != null && LLAMADA_PENDIENTE.includes(l.llamadaEstado.toUpperCase()) && l.proximaLlamadaMs < h1)
      .sort((a, b) => (a.proximaLlamadaMs! - b.proximaLlamadaMs!));
    const retomar = leads
      .filter(l => DIAS_RETOMAR[l.estado] != null && (haceDias(l.seguimientoMs) ?? 0) >= DIAS_RETOMAR[l.estado])
      .sort((a, b) => (a.seguimientoMs ?? 0) - (b.seguimientoMs ?? 0));
    const nuevos = leads.filter(l => l.estado === 'NUEVO').sort((a, b) => a.fila - b.fila);
    return { llamadas, retomar, nuevos };
  }, [leads]);

  const conteoEstados = useMemo(() => {
    const m: Record<string, number> = {};
    leads.forEach(l => { m[l.estado] = (m[l.estado] || 0) + 1; });
    return m;
  }, [leads]);

  // ---------- Vista "Todos" con filtros ----------
  // Cada filtro cuenta con los demás aplicados, para que los números de los
  // botones digan cuántos quedarían al tocarlos.
  const coincide = (l: Lead, sin: 'localidad' | 'hab' | 'estado' | null = null) => {
    const q = busqueda.trim().toLowerCase();
    const qDig = q.replace(/\D/g, '');
    if (sin !== 'estado' && filtroEstado && l.estado !== filtroEstado) return false;
    if (sin !== 'localidad' && filtroLocalidad && l.localidad.toUpperCase() !== filtroLocalidad) return false;
    if (sin !== 'hab' && filtroHab && l.habitaciones !== filtroHab) return false;
    if (q && !(l.nombre.toLowerCase().includes(q) || l.ubicacion.toLowerCase().includes(q)
      || (qDig.length >= 3 && l.celular.includes(qDig)) || l.idLead.toLowerCase().includes(q))) return false;
    return true;
  };

  // Primero los NUEVO (los que se van a llamar) y, dentro de cada grupo, el
  // mismo orden de filas del Sheet.
  const filtrados = useMemo(() => leads
    .filter(l => coincide(l))
    .sort((a, b) => (Number(b.estado === 'NUEVO') - Number(a.estado === 'NUEVO')) || (a.fila - b.fila)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [leads, busqueda, filtroEstado, filtroLocalidad, filtroHab]);
  const nuevosFiltrados = filtrados.filter(l => l.estado === 'NUEVO').length;

  const habitacionesDisponibles = useMemo(
    () => Array.from(new Set(leads.map(l => l.habitaciones).filter(Boolean))).sort((a, b) => Number(a) - Number(b)),
    [leads]);
  const cuenta = (sin: 'localidad' | 'hab', valor: string | null) =>
    leads.filter(l => coincide(l, sin) && (valor === null || (sin === 'localidad' ? l.localidad.toUpperCase() === valor : l.habitaciones === valor))).length;

  const seleccionado = leads.find(l => l.idLead === selId) || null;
  const totalHoy = hoy.llamadas.length;

  // iPhone: al abrir el teclado la pantalla no se encoge, el teclado tapa lo de
  // abajo. visualViewport dice el alto que de verdad queda visible: la hoja de la
  // ficha se ajusta a ese alto para que el campo de la nota quede sobre el teclado.
  const [vista_, setVista_] = useState<{ top: number; alto: number; teclado: boolean } | null>(null);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv || !selId) { setVista_(null); return; }
    const ajustar = () => setVista_({ top: vv.offsetTop, alto: vv.height, teclado: vv.height < window.innerHeight * 0.8 });
    ajustar();
    vv.addEventListener('resize', ajustar);
    vv.addEventListener('scroll', ajustar);
    return () => { vv.removeEventListener('resize', ajustar); vv.removeEventListener('scroll', ajustar); };
  }, [selId]);

  // Celular: la franja de selectores e indicadores tapa la barra transparente de
  // arriba SOLO cuando ya quedó fija; antes, taparía los botones Miguel y Actualizar.
  const franjaRef = useRef<HTMLDivElement>(null);
  const [franjaFija, setFranjaFija] = useState(false);
  useEffect(() => {
    const revisar = () => { const el = franjaRef.current; if (el) setFranjaFija(el.getBoundingClientRect().top <= 81 && window.scrollY > 0); };
    revisar();
    window.addEventListener('scroll', revisar, { passive: true });
    window.addEventListener('resize', revisar);
    return () => { window.removeEventListener('scroll', revisar); window.removeEventListener('resize', revisar); };
  }, []);

  // Ficha de PC: su alto es siempre lo que queda visible de la pantalla, para que
  // no haya que bajar la página para ver el resto de la ficha (un solo scroll).
  const fichaPcRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = fichaPcRef.current;
    if (!el) return;
    const ajustar = () => {
      const arriba = Math.max(el.getBoundingClientRect().top, 96);
      el.style.height = Math.max(360, window.innerHeight - arriba - 16) + 'px';
    };
    ajustar();
    window.addEventListener('scroll', ajustar, { passive: true });
    window.addEventListener('resize', ajustar);
    return () => { window.removeEventListener('scroll', ajustar); window.removeEventListener('resize', ajustar); };
  }, [actual, vista, selId]);

  return (
    <div className="w-full max-w-[1760px] mx-auto px-[clamp(1rem,2.5vw,3rem)] pt-2 md:pt-20 xl:pt-0 xl:pl-[15rem]">
      {/* Cabecera */}
      <div className="flex flex-wrap items-end justify-between gap-4 mb-5">
        <div>
          <h1 className="text-3xl md:text-4xl font-light text-brand-gold flex items-center gap-3">
            <Users className="w-8 h-8" /> Captaciones
          </h1>
          <p className="hidden sm:block text-stone-600 mt-1 text-sm md:text-base">
            Los propietarios que captó Miguel, con su seguimiento. Todo queda en el CRM del Sheet.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setMiguel(true)}
            className="flex items-center gap-2 min-h-[44px] px-5 py-2 bg-brand-gold text-stone-950 font-semibold rounded-full shadow-[0_6px_18px_rgba(212,175,55,.3)] hover:brightness-105 hover:-translate-y-px transition-all">
            <Bot className="w-4 h-4" /> Miguel
          </button>
          <button onClick={() => cargar()} disabled={cargando}
            className="flex items-center gap-2 min-h-[44px] min-w-[44px] justify-center px-4 py-2 bg-white border border-stone-300 rounded-full text-stone-700 hover:text-brand-gold-dark hover:border-brand-gold transition-all disabled:opacity-50">
            <RefreshCw className={`w-4 h-4 ${cargando ? 'animate-spin' : ''}`} /> <span className="hidden sm:inline">Actualizar</span>
          </button>
        </div>
      </div>

      {/* En el celular, los selectores y los indicadores quedan fijos arriba y
          solo se deslizan las tarjetas. El ::before tapa la franja de la barra
          superior (transparente) para que las tarjetas no se vean pasar por detrás. */}
      <div ref={franjaRef} className={`max-md:sticky max-md:top-20 max-md:z-30 max-md:-mx-4 max-md:px-4 max-md:pt-1 max-md:pb-2.5 max-md:mb-4 max-md:bg-[#faf8f5]
        ${franjaFija ? `max-md:shadow-[0_8px_16px_-12px_rgba(28,25,23,.25)]
        max-md:before:content-[''] max-md:before:absolute max-md:before:inset-x-0 max-md:before:bottom-full max-md:before:h-20 max-md:before:bg-[#faf8f5]` : ''}`}>
      {/* Arriendo / Venta y vista */}
      <div className="flex items-center gap-2 sm:gap-3 mb-2 md:mb-5">
        <div className="grid grid-cols-2 p-1 rounded-full bg-stone-900 border border-stone-800 flex-[1.4] min-w-0 sm:flex-none">
          {(['A', 'V'] as Operacion[]).map(op => (
            <button key={op} onClick={() => { setOperacion(op); setSelId(null); setFiltroEstado(null); }}
              aria-pressed={operacion === op}
              className={`min-h-[44px] px-2 sm:px-6 rounded-full text-[13px] sm:text-sm font-semibold whitespace-nowrap transition-all ${operacion === op ? 'bg-brand-gold text-stone-950 shadow' : 'text-stone-400 hover:text-white'}`}>
              {op === 'A' ? 'Arriendo' : 'Venta'}
              {datos[op] && <span className="ml-1 sm:ml-1.5 text-[11px] sm:text-sm opacity-70 font-normal tabular-nums">{datos[op]!.leads.length}</span>}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 p-1 rounded-full bg-white border border-stone-300 flex-1 min-w-0 sm:flex-none">
          {(['hoy', 'todos'] as Vista[]).map(v => (
            <button key={v} onClick={() => setVista(v)} aria-pressed={vista === v}
              className={`min-h-[44px] px-2 sm:px-5 rounded-full text-[13px] sm:text-sm font-medium whitespace-nowrap transition-all ${vista === v ? 'bg-stone-900 text-white' : 'text-stone-600 hover:text-stone-900'}`}>
              {v === 'hoy' ? 'Mi día' : 'Todos'}
            </button>
          ))}
        </div>
      </div>

      {/* Indicadores */}
      <div className="flex md:grid md:grid-cols-5 gap-2 md:gap-3 md:mb-6 overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 pb-1 [scrollbar-width:none]">
        <Indicador titulo="Nuevos por llamar" valor={conteoEstados['NUEVO'] || 0} onClick={() => { setVista('todos'); setFiltroEstado('NUEVO'); }} />
        <Indicador titulo="Llamadas de hoy" valor={totalHoy} dorado onClick={() => setVista('hoy')} />
        <Indicador titulo="En seguimiento" valor={conteoEstados['SEGUIMIENTO'] || 0} onClick={() => { setVista('todos'); setFiltroEstado('SEGUIMIENTO'); }} />
        <Indicador titulo="Pre-registro" valor={conteoEstados['PRE-R CAPTACION'] || 0} onClick={() => { setVista('todos'); setFiltroEstado('PRE-R CAPTACION'); }} />
        <Indicador titulo="Captados" valor={conteoEstados['CAPTADO'] || 0} onClick={() => { setVista('todos'); setFiltroEstado('CAPTADO'); }} />
      </div>

      </div>

      {error && (
        <div className="mb-5 flex items-start gap-3 p-4 rounded-2xl border border-red-300 bg-red-50 text-red-800">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" /><span>{error}</span>
        </div>
      )}

      {cargando && !actual && (
        <div className="flex items-center justify-center gap-3 py-20 text-stone-500">
          <Loader2 className="w-6 h-6 animate-spin text-brand-gold" /> Leyendo el CRM…
        </div>
      )}

      {actual && (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_clamp(340px,30vw,460px)] gap-[clamp(1rem,1.6vw,2rem)] items-start">
          <div className="min-w-0">
            {vista === 'hoy' ? (
              <div className="flex flex-col gap-6">
                <Seccion icono={PhoneCall} titulo="Llamadas de hoy" vacio="No tienes llamadas programadas para hoy." n={hoy.llamadas.length}>
                  {hoy.llamadas.map(l => (
                    <TarjetaLead key={l.idLead} lead={l} estados={estados} activo={selId === l.idLead} onClick={() => setSelId(l.idLead)}
                      aviso={l.proximaLlamadaMs! < Date.now() ? `Era a las ${textoHora(l.proximaLlamadaMs!)}` : `${l.llamadaTipo === 'MENSAJE' ? 'Escribir' : 'Llamar'} a las ${textoHora(l.proximaLlamadaMs!)}`}
                      tonoAviso={l.proximaLlamadaMs! < Date.now() ? 'tarde' : 'oro'} />
                  ))}
                </Seccion>
                <Seccion icono={Flame} titulo="Se están enfriando" vacio="Nadie lleva días sin gestión." n={hoy.retomar.length}>
                  {hoy.retomar.map(l => (
                    <TarjetaLead key={l.idLead} lead={l} estados={estados} activo={selId === l.idLead} onClick={() => setSelId(l.idLead)}
                      aviso={`Sin gestión hace ${haceDias(l.seguimientoMs)} días`} tonoAviso="tarde" />
                  ))}
                </Seccion>
                <Seccion icono={Inbox} titulo="Nuevos por llamar" vacio="No hay propietarios en NUEVO." n={hoy.nuevos.length}>
                  {hoy.nuevos.slice(0, limite).map(l => (
                    <TarjetaLead key={l.idLead} lead={l} estados={estados} activo={selId === l.idLead} onClick={() => setSelId(l.idLead)}
                      aviso={l.fechaCaptacion ? `Captado ${l.fechaCaptacion}` : ''} />
                  ))}
                  {hoy.nuevos.length > limite && <MasBoton onClick={() => setLimite(x => x + 40)} faltan={hoy.nuevos.length - limite} />}
                </Seccion>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" />
                  <label htmlFor="buscar-captacion" className="sr-only">Buscar propietario</label>
                  <input id="buscar-captacion" value={busqueda} onChange={e => setBusqueda(e.target.value)}
                    placeholder="Buscar por nombre, celular, barrio o ID"
                    className="w-full h-12 pl-11 pr-10 rounded-2xl bg-white border border-stone-300 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20" />
                  {busqueda && <button onClick={() => setBusqueda('')} aria-label="Limpiar búsqueda" className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-stone-400 hover:text-stone-700"><X className="w-4 h-4" /></button>}
                </div>
                {/* 1. Ubicación y 2. Habitaciones: los dos filtros para empezar a llamar */}
                <div>
                  <div className="text-[11px] uppercase tracking-[0.14em] text-stone-500 mb-1.5">1 · Ubicación</div>
                  <div className="grid grid-cols-4 gap-1.5">
                    <Opcion activo={filtroLocalidad === null} onClick={() => setFiltroLocalidad(null)} titulo="Todas" n={cuenta('localidad', null)} />
                    {Object.entries(LOCALIDADES).map(([k, v]) => (
                      <Opcion key={k} activo={filtroLocalidad === k} onClick={() => setFiltroLocalidad(filtroLocalidad === k ? null : k)} titulo={v} n={cuenta('localidad', k)} />
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-[0.14em] text-stone-500 mb-1.5">2 · Habitaciones</div>
                  <div className="grid grid-cols-6 gap-1.5">
                    <Opcion activo={filtroHab === null} onClick={() => setFiltroHab(null)} titulo="Todas" n={cuenta('hab', null)} />
                    {habitacionesDisponibles.map(h => (
                      <Opcion key={h} activo={filtroHab === h} onClick={() => setFiltroHab(filtroHab === h ? null : h)} titulo={h} n={cuenta('hab', h)} />
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-[0.14em] text-stone-500 mb-1.5">Estado</div>
                  <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 min-w-0 [scrollbar-width:thin]">
                    <Chip activo={filtroEstado === null} onClick={() => setFiltroEstado(null)}>Todos <b className="font-semibold">{leads.length}</b></Chip>
                    {estados.filter(e => conteoEstados[e.nombre.toUpperCase()]).map(e => (
                      <Chip key={e.nombre} activo={filtroEstado === e.nombre.toUpperCase()} onClick={() => setFiltroEstado(filtroEstado === e.nombre.toUpperCase() ? null : e.nombre.toUpperCase())}>
                        <span className="w-2.5 h-2.5 rounded-full border border-black/10" style={{ background: estiloEstado(estados, e.nombre).background }} />
                        {e.nombre} <b className="font-semibold">{conteoEstados[e.nombre.toUpperCase()]}</b>
                      </Chip>
                    ))}
                  </div>
                </div>
                <div className="text-xs text-stone-500">{filtrados.length} propietarios · primero los NUEVO, en el orden del Sheet</div>
                <div className="grid grid-cols-1 gap-2.5">
                  {filtrados.slice(0, limite).map((l, i) => (
                    <div key={l.idLead} className="contents">
                      {i === 0 && nuevosFiltrados > 0 && <Separador titulo="Nuevos por llamar" n={nuevosFiltrados} />}
                      {i === nuevosFiltrados && filtrados.length > nuevosFiltrados && <Separador titulo="Ya gestionados" n={filtrados.length - nuevosFiltrados} />}
                      <TarjetaLead lead={l} estados={estados} activo={selId === l.idLead} onClick={() => setSelId(l.idLead)}
                        aviso={l.estado === 'NUEVO'
                          ? (l.fechaCaptacion ? `Captado ${l.fechaCaptacion}` : '')
                          : (l.fechaSeguimiento ? `Última gestión ${l.fechaSeguimiento}` : '')} />
                    </div>
                  ))}
                  {filtrados.length > limite && <MasBoton onClick={() => setLimite(x => x + 40)} faltan={filtrados.length - limite} />}
                </div>
              </div>
            )}
          </div>

          {/* Ficha: columna fija en PC, pantalla completa en el celular */}
          <div ref={fichaPcRef} className="hidden lg:flex flex-col sticky top-24 h-[calc(100vh-7rem)]">
            {seleccionado
              ? <FichaLead lead={seleccionado} estados={estados} operacion={operacion} credential={agentCredential} onCambio={actualizarLead} onCerrar={() => setSelId(null)} />
              : <div className="rounded-3xl border border-dashed border-stone-300 p-10 text-center text-stone-500 text-sm">Elige un propietario para ver su ficha, cambiar su estado o programarle la llamada.</div>}
          </div>
        </div>
      )}

      {seleccionado && createPortal(
        <div className="lg:hidden fixed inset-x-0 top-0 h-[100dvh] z-[150] overflow-hidden overscroll-none bg-stone-950/60 backdrop-blur-sm flex items-end" onClick={() => setSelId(null)}
          style={vista_ ? { top: vista_.top, height: vista_.alto } : undefined}>
          <div className="w-full max-h-[92dvh] flex flex-col rounded-t-3xl animate-fade-in" onClick={e => e.stopPropagation()}
            style={vista_ ? { maxHeight: vista_.teclado ? vista_.alto - 8 : Math.round(vista_.alto * 0.92) } : undefined}>
            <FichaLead lead={seleccionado} estados={estados} operacion={operacion} credential={agentCredential} onCambio={actualizarLead} onCerrar={() => setSelId(null)} movil />
          </div>
        </div>,
        document.body
      )}

      {miguel && <MiguelCaptadorModal agentCredential={agentCredential} onClose={() => { setMiguel(false); }} />}
    </div>
  );
}

// ---------- Piezas ----------

function Indicador({ titulo, valor, onClick, dorado = false }: { titulo: string; valor: number; onClick: () => void; dorado?: boolean }) {
  return (
    <button onClick={onClick}
      className={`shrink-0 min-w-[118px] md:min-w-0 text-left rounded-2xl bg-stone-900 border ${dorado ? 'border-brand-gold/50' : 'border-stone-800'} px-3.5 py-2.5 md:px-4 md:py-3 hover:border-brand-gold transition-colors`}>
      <div className="text-[10px] md:text-[11px] uppercase tracking-[0.12em] text-stone-400 whitespace-nowrap">{titulo}</div>
      <div className={`text-2xl md:text-3xl font-semibold tabular-nums ${dorado ? 'text-brand-gold-light' : 'text-white'}`}>{valor}</div>
    </button>
  );
}

function Seccion({ icono: Icono, titulo, n, vacio, children }: { icono: React.ComponentType<{ className?: string }>; titulo: string; n: number; vacio: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="flex items-center justify-between mb-2.5">
        <h2 className="flex items-center gap-2 text-stone-800 font-semibold"><Icono className="w-4 h-4 text-brand-gold" /> {titulo}</h2>
        <span className="text-xs text-stone-500 tabular-nums">{n}</span>
      </div>
      {n === 0 ? <div className="rounded-2xl border border-dashed border-stone-300 px-4 py-5 text-sm text-stone-500">{vacio}</div> : <div className="grid grid-cols-1 gap-2.5">{children}</div>}
    </section>
  );
}

function Chip({ activo, onClick, children }: { key?: string; activo: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} aria-pressed={activo}
      className={`shrink-0 min-h-[44px] px-4 rounded-full border text-sm flex items-center gap-1.5 whitespace-nowrap transition-all ${activo ? 'bg-stone-900 text-white border-stone-900' : 'bg-white text-stone-700 border-stone-300 hover:border-stone-400'}`}>
      {children}
    </button>
  );
}

function Opcion({ activo, onClick, titulo, n }: { key?: string; activo: boolean; onClick: () => void; titulo: string; n: number }) {
  return (
    <button onClick={onClick} aria-pressed={activo}
      className={`min-h-[52px] min-w-0 rounded-xl border px-0.5 flex flex-col items-center justify-center leading-tight transition-all active:scale-[0.97] ${activo ? 'bg-stone-900 border-stone-900 text-white' : 'bg-white border-stone-300 text-stone-800 hover:border-stone-400'}`}>
      <span className="text-[12px] tracking-tight min-[360px]:text-[13px] min-[360px]:tracking-normal font-semibold truncate max-w-full">{titulo}</span>
      <span className={`text-[11px] tabular-nums ${activo ? 'text-brand-gold-light' : 'text-stone-500'}`}>{n}</span>
    </button>
  );
}

function Separador({ titulo, n }: { titulo: string; n: number }) {
  return (
    <div className="flex items-center gap-3 pt-2 first:pt-0">
      <span className="text-sm font-semibold text-stone-800">{titulo}</span>
      <span className="text-xs text-stone-500 tabular-nums">{n}</span>
      <span className="flex-1 h-px bg-stone-300" />
    </div>
  );
}

function MasBoton({ onClick, faltan }: { onClick: () => void; faltan: number }) {
  return (
    <button onClick={onClick} className="min-h-[44px] rounded-2xl border border-stone-300 bg-white text-stone-700 text-sm hover:border-brand-gold">
      Mostrar más ({faltan})
    </button>
  );
}

function TarjetaLead({ lead, estados, onClick, activo, aviso, tonoAviso }: {
  key?: string; lead: Lead; estados: EstadoInfo[]; onClick: () => void; activo: boolean; aviso?: string; tonoAviso?: 'oro' | 'tarde';
}) {
  const colorAviso = tonoAviso === 'oro' ? 'text-brand-gold-light' : tonoAviso === 'tarde' ? 'text-orange-300' : 'text-stone-400';
  return (
    <div className={`group min-w-0 rounded-2xl bg-stone-900 border ${activo ? 'border-brand-gold' : 'border-stone-800 hover:border-stone-600'} transition-colors`}>
      <button onClick={onClick} className="w-full text-left px-4 pt-3.5 pb-2 focus-visible:outline-none">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-white font-semibold truncate">{lead.nombre || 'Sin nombre'}</div>
            <div className="text-stone-400 text-[13px] truncate">
              {[lead.ubicacion, lead.habitaciones && lead.habitaciones + ' hab', lead.valor].filter(Boolean).join(' · ')}
            </div>
          </div>
          <span className="shrink-0 text-[11px] font-semibold px-2.5 py-1 rounded-full" style={estiloEstado(estados, lead.estado)}>{lead.estado || 'SIN ESTADO'}</span>
        </div>
      </button>
      <div className="flex items-center justify-between gap-2 px-4 pb-3">
        <div className="min-w-0 flex flex-col items-start gap-1">
          {textoOferta(lead) && <span className="max-w-full truncate text-[11px] font-semibold px-2 py-0.5 rounded-full bg-brand-gold/15 text-brand-gold-light">Oferta {textoOferta(lead)}</span>}
          <span className={`max-w-full text-xs ${colorAviso} truncate`}>{aviso}</span>
        </div>
        <div className="flex gap-1.5 shrink-0">
          <a href={`https://wa.me/${celularInternacional(lead.celular)}`} target="_blank" rel="noopener noreferrer" aria-label={`WhatsApp a ${lead.nombre}`}
            className="w-11 h-11 rounded-xl bg-emerald-500/15 text-emerald-300 flex items-center justify-center hover:bg-emerald-500/25"><IconoWhatsApp className="w-5 h-5" /></a>
          {/^https?:\/\//i.test(lead.link) && (
            <a href={lead.link} target="_blank" rel="noopener noreferrer" aria-label={`Ver la publicación de ${lead.nombre}`} title="Ver publicación"
              className="w-11 h-11 rounded-xl border border-stone-600 text-stone-200 flex items-center justify-center hover:border-brand-gold hover:text-brand-gold-light"><ExternalLink className="w-5 h-5" /></a>
          )}
          <a href={`tel:+${celularInternacional(lead.celular)}`} aria-label={`Llamar a ${lead.nombre}`}
            className="w-11 h-11 rounded-xl bg-brand-gold/15 text-brand-gold-light flex items-center justify-center hover:bg-brand-gold/25"><Phone className="w-5 h-5" /></a>
        </div>
      </div>
    </div>
  );
}

// ---------- Ficha del propietario ----------

function FichaLead({ lead, estados, operacion, credential, onCambio, onCerrar, movil = false }: {
  lead: Lead; estados: EstadoInfo[]; operacion: Operacion; credential: string | null;
  onCambio: (l: Lead) => void; onCerrar: () => void; movil?: boolean;
}) {
  const [eligiendo, setEligiendo] = useState(false);
  const [guardando, setGuardando] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nota, setNota] = useState('');
  const [modal, setModal] = useState<'elegir' | 'editar' | 'llamada' | 'mensaje' | 'agenda' | 'reagendar' | null>(null);
  const [verInfo, setVerInfo] = useState(false);
  const [escribiendo, setEscribiendo] = useState(false);
  const recogido = movil && escribiendo;

  useEffect(() => { setEligiendo(false); setError(null); setNota(''); setModal(null); }, [lead.idLead]);

  const guardar = async (cambios: { estado?: string; nota?: string }, que: string) => {
    setGuardando(que); setError(null);
    try {
      const r = await llamarCRM(credential, 'actualizar', { idLead: lead.idLead, ...cambios });
      if (!r.success) { setError(r.message || 'No se pudo guardar.'); return false; }
      onCambio(r.lead);
      return true;
    } catch {
      setError('Error de red al guardar.');
      return false;
    } finally {
      setGuardando(null);
    }
  };

  const cambiarEstado = async (nombre: string) => {
    setEligiendo(false);
    const nuevo = nombre.toUpperCase();
    if (nuevo === lead.estado) return;
    // Al instante (21-nov-2026): se pinta ya y se guarda por detrás; si falla, vuelve al anterior
    const antes = lead;
    onCambio({ ...lead, estado: nuevo });
    // Igual que en el Sheet: SEGUIMIENTO abre la llamada y PRE-R CAPTACION la agenda
    // SEGUIMIENTO: primero se elige si es llamada, mensaje o presentación
    if (nuevo === 'SEGUIMIENTO') setModal('elegir');
    if (nuevo === 'PRE-R CAPTACION') setModal('agenda');
    // REAGENDAR: cita nueva; la anterior queda cancelada como historial
    if (nuevo === 'REAGENDAR') setModal('reagendar');
    setError(null);
    try {
      const r = await llamarCRM(credential, 'actualizar', { idLead: lead.idLead, estado: nombre });
      if (!r.success) throw new Error(r.message || 'No se pudo guardar el estado.');
      onCambio(r.lead);
    } catch (e) {
      onCambio(antes); setModal(null);
      setError((e instanceof Error && e.message !== 'Failed to fetch' ? e.message : 'Error de red al guardar') + '. Se dejó el estado anterior.');
    }
  };

  const enviarNota = async () => {
    if (!nota.trim()) return;
    if (await guardar({ nota: nota.trim() }, 'nota')) setNota('');
  };

  const notas = notasDeDetalles(lead.detalles);
  const seguimientoPendiente = lead.proximaLlamadaMs != null && LLAMADA_PENDIENTE.includes(lead.llamadaEstado.toUpperCase());
  // Llamada y mensaje comparten el motor: hay uno solo pendiente a la vez
  const mensajePendiente = seguimientoPendiente && lead.llamadaTipo === 'MENSAJE';
  const llamadaPendiente = seguimientoPendiente && !mensajePendiente;
  // La tarjeta de mensaje solo aparece en SEGUIMIENTO (o si ya hay uno programado)
  const verMensaje = lead.estado === 'SEGUIMIENTO' || mensajePendiente;
  // La fecha de la presentación sale de su nota "Cita agendada: … (CIT-…)"
  const textoCita = lead.idCita
    ? (notas.flatMap(n => n.ids.includes(lead.idCita.toUpperCase()) ? n.textos : [])
        .map(t => t.match(/Cita agendada:\s*(.+)$/i)?.[1]).filter(Boolean).pop() || lead.idCita)
    : '';
  const resumen = [lead.ubicacion, lead.habitaciones && lead.habitaciones + ' hab', lead.valor].filter(Boolean).join(' · ');

  // Las notas van como un chat: la más nueva abajo, junto al campo de escribir
  // y el scroll pegado abajo: al abrir, al llegar una nota nueva y si la ficha
  // cambia de alto. Si el agente sube a leer lo viejo, no se le mueve.
  const notasRef = useRef<HTMLDivElement>(null);
  const pegadoAbajo = useRef(true);
  const bajarNotas = () => { const el = notasRef.current; if (el) el.scrollTop = el.scrollHeight; };
  useLayoutEffect(() => { pegadoAbajo.current = true; bajarNotas(); }, [lead.idLead, lead.detalles]);
  useEffect(() => {
    const el = notasRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => { if (pegadoAbajo.current) bajarNotas(); });
    ro.observe(el);
    if (el.firstElementChild) ro.observe(el.firstElementChild);
    return () => ro.disconnect();
  }, []);

  return (
    <div className={`flex-1 min-h-0 flex flex-col bg-stone-900 border border-stone-800 ${movil ? 'rounded-t-3xl' : 'rounded-3xl'} text-stone-200 relative overflow-hidden`}>
      {/* Fijo arriba: quién es, el inmueble, contacto, estado y lo programado */}
      <div className="shrink-0 px-4 pt-3 pb-3 border-b border-stone-800 bg-stone-900">
        {movil && <div className="w-10 h-1 rounded-full bg-stone-700 mx-auto mb-2.5" />}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[11px] text-stone-500 truncate">{operacion === 'A' ? 'Arriendo' : 'Venta'} · {lead.idLead}{lead.localidad && ' · ' + (LOCALIDADES[lead.localidad.toUpperCase()] || lead.localidad)}</div>
            <div className="flex items-center gap-1 min-w-0">
              <h3 className="text-lg font-semibold text-white leading-tight truncate">{lead.nombre || 'Sin nombre'}</h3>
              <button onClick={() => setModal('editar')} aria-label="Editar datos del propietario y del inmueble" title="Editar datos"
                className="w-11 h-11 -my-2.5 -ml-1 shrink-0 flex items-center justify-center rounded-full text-stone-400 hover:text-brand-gold-light hover:bg-stone-800 transition-colors"><Pencil className="w-4 h-4" /></button>
            </div>
          </div>
          <button onClick={onCerrar} aria-label="Cerrar ficha" className="w-11 h-11 -mt-1 -mr-1.5 flex items-center justify-center rounded-full bg-stone-800 text-stone-400 hover:text-white shrink-0"><X className="w-5 h-5" /></button>
        </div>

        {/* En el celular, mientras se escribe la nota (teclado abierto), esto se
            recoge para que se vean las notas y el campo de escribir. */}
        <div className={recogido ? 'hidden' : ''}>
        {/* Información del inmueble: una línea, se despliega al tocarla */}
        <button onClick={() => setVerInfo(v => !v)} aria-expanded={verInfo}
          className="w-full min-h-[36px] -mt-0.5 mb-1.5 flex items-center gap-1.5 text-left text-[13px] text-stone-400 hover:text-stone-200 transition-colors">
          {textoOferta(lead) && <span className="shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-brand-gold/15 text-brand-gold-light" title="% de oferta negociado (solo lo ves tú)">{textoOferta(lead)}</span>}
          <span className="truncate">{resumen || 'Ver información del inmueble'}</span>
          <ChevronDown className={`w-4 h-4 shrink-0 transition-transform duration-300 ${verInfo ? 'rotate-180' : ''}`} />
        </button>
        <div className={`grid transition-[grid-template-rows] duration-300 ease-out ${verInfo ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
          <div className="overflow-hidden">
            <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm rounded-2xl bg-stone-950/50 border border-stone-800 p-3 mb-2.5">
              <Dato t="Barrio" v={lead.ubicacion} />
              <Dato t="Localidad" v={LOCALIDADES[lead.localidad.toUpperCase()] || lead.localidad} />
              <Dato t="Habitaciones" v={lead.habitaciones} />
              <Dato t="Valor publicado" v={lead.valor} />
              <Dato t="Tipo" v={lead.tipo} />
              <Dato t="Celular" v={lead.celular} />
              <Dato t="Fecha de captación" v={lead.fechaCaptacion} />
              <Dato t="Fecha de contacto" v={lead.fechaContacto} />
              <Dato t="% oferta arriendo" v={lead.ofertaA === '' || lead.ofertaA == null ? '' : String(lead.ofertaA).replace('.', ',') + ' %'} />
              <Dato t="% oferta venta" v={lead.ofertaV === '' || lead.ofertaV == null ? '' : String(lead.ofertaV).replace('.', ',') + ' %'} />
              <div className="col-span-2 min-w-0"><Dato t="Correo" v={lead.correo} /></div>
            </dl>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-1.5 mb-2">
          <a href={`https://wa.me/${celularInternacional(lead.celular)}`} target="_blank" rel="noopener noreferrer"
            className="h-11 rounded-xl bg-emerald-500/15 text-emerald-300 font-semibold text-[13px] flex items-center justify-center gap-1.5 hover:bg-emerald-500/25"><IconoWhatsApp className="w-4 h-4" />WhatsApp</a>
          {/^https?:\/\//i.test(lead.link)
            ? <a href={lead.link} target="_blank" rel="noopener noreferrer"
                className="h-11 rounded-xl border border-stone-700 text-stone-200 text-[13px] flex items-center justify-center gap-1.5 hover:border-stone-500"><ExternalLink className="w-4 h-4" />Anuncio</a>
            : <span className="h-11 rounded-xl border border-stone-800 text-stone-600 text-[13px] flex items-center justify-center">Sin anuncio</span>}
          <a href={`tel:+${celularInternacional(lead.celular)}`}
            className="h-11 rounded-xl bg-brand-gold/15 text-brand-gold-light font-semibold text-[13px] flex items-center justify-center gap-1.5 hover:bg-brand-gold/25"><Phone className="w-4 h-4" />Llamar</a>
        </div>

        <button onClick={() => setEligiendo(v => !v)} disabled={!!guardando} aria-expanded={eligiendo}
          className="w-full h-11 rounded-xl px-3.5 flex items-center justify-between gap-2 font-bold text-sm disabled:opacity-70" style={estiloEstado(estados, lead.estado)}>
          <span className="flex items-center gap-2 min-w-0">
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] opacity-70 shrink-0">Estado</span>
            <span className="truncate">{lead.estado || 'SIN ESTADO'}</span>
          </span>
          {guardando === 'estado' ? <Loader2 className="w-4 h-4 animate-spin shrink-0" /> : <ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${eligiendo ? 'rotate-180' : ''}`} />}
        </button>
        {eligiendo && (
          <div className="grid grid-cols-2 gap-1.5 mt-2">
            {estados.map(e => (
              <button key={e.nombre} onClick={() => cambiarEstado(e.nombre)}
                className={`min-h-[44px] rounded-lg px-2 text-xs font-semibold ${e.nombre.toUpperCase() === lead.estado ? 'ring-2 ring-brand-gold' : ''}`}
                style={estiloEstado(estados, e.nombre)}>{e.nombre}</button>
            ))}
          </div>
        )}

        {/* Lo programado: cada tarjeta muestra el dato y es el botón para programarlo */}
        <div className={`grid ${verMensaje ? 'grid-cols-3' : 'grid-cols-2'} gap-1.5 mt-2`}>
          <Programado icono={CalendarClock} titulo="Llamada" onClick={() => setModal('llamada')} compacto={verMensaje}
            valor={llamadaPendiente ? textoFechaCorta(lead.proximaLlamadaMs!) : ''} vacio="Programar" />
          {verMensaje && <Programado icono={MessageSquareText} titulo="Mensaje" onClick={() => setModal('mensaje')} compacto
            valor={mensajePendiente ? textoFechaCorta(lead.proximaLlamadaMs!) : ''} vacio="Programar" />}
          <Programado icono={Clock} titulo="Presentación" onClick={() => setModal('agenda')} compacto={verMensaje}
            valor={textoCita} vacio="Agendar" />
        </div>
        </div>
      </div>

      {/* Fijo: título de las notas y última gestión */}
      <div className="shrink-0 flex items-center justify-between gap-2 px-4 pt-2.5 pb-2 border-b border-stone-800/60">
        <span className="text-[11px] uppercase tracking-[0.12em] text-stone-500">Detalles de seguimiento</span>
        <span className="text-[11px] text-stone-500 truncate">
          {lead.fechaSeguimiento ? <>Última gestión {lead.fechaSeguimiento}{lead.horaSeguimiento && ' · ' + lead.horaSeguimiento}</> : 'Sin gestión todavía'}
        </span>
      </div>

      {/* Lo único que se desplaza: las notas, como un chat */}
      <div ref={notasRef}
        onScroll={e => { const el = e.currentTarget; pegadoAbajo.current = el.scrollHeight - el.scrollTop - el.clientHeight < 24; }}
        className="flex-1 min-h-0 flex flex-col overflow-y-auto overflow-x-hidden overscroll-contain px-4 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {/* mt-auto: con pocas notas, quedan abajo junto al campo, como en un chat */}
        <div className="mt-auto">
        {notas.length === 0
          ? <div className="py-4 text-sm text-stone-500 text-center px-4">Aún no hay notas. Escribe la primera abajo.</div>
          : <ol className="flex flex-col gap-2">{notas.map((n, i) => (
              <li key={i} className="rounded-xl bg-stone-950/60 border border-stone-800 px-3 py-2.5">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-[11px] text-stone-400 tabular-nums">{n.fecha ? `${n.fecha} · ${n.hora}` : 'Sin fecha'}</span>
                  {n.ids.length > 0 && <span className="flex gap-1">{n.ids.map(id => (
                    <span key={id} className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${id.startsWith('LL') ? 'bg-amber-500/10 text-amber-300 border-amber-500/30' : id.startsWith('MS') ? 'bg-sky-500/10 text-sky-300 border-sky-500/30' : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'}`}>{id}</span>
                  ))}</span>}
                </div>
                {n.textos.map((t, j) => <p key={j} className="text-sm text-stone-200 leading-snug">{t}</p>)}
              </li>
            ))}</ol>}
        </div>
      </div>

      {/* Fijo abajo: escribir la nota */}
      <div className={`shrink-0 border-t border-stone-800 bg-stone-900 px-4 pt-2.5 ${movil ? 'pb-[max(0.75rem,env(safe-area-inset-bottom))]' : 'pb-3'}`}>
        {error && <div className="mb-2 text-sm text-red-300 flex items-start gap-2"><AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />{error}</div>}
        <div className="flex gap-2">
          <label htmlFor={`nota-${lead.idLead}`} className="sr-only">Nueva nota</label>
          <input id={`nota-${lead.idLead}`} value={nota} onChange={e => setNota(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') enviarNota(); }}
            onFocus={() => setEscribiendo(true)} onBlur={() => setEscribiendo(false)} enterKeyHint="send"
            placeholder="Escribe una nota…" maxLength={1000}
            className="flex-1 min-w-0 h-11 rounded-xl bg-stone-950 border border-stone-700 px-3 text-sm text-white placeholder:text-stone-500 focus:outline-none focus:border-brand-gold" />
          <button onClick={enviarNota} onMouseDown={e => e.preventDefault()} onTouchStart={e => { if (escribiendo) { e.preventDefault(); enviarNota(); } }}
            disabled={!nota.trim() || !!guardando} aria-label="Guardar nota"
            className="h-11 w-11 rounded-xl bg-brand-gold text-stone-950 flex items-center justify-center disabled:opacity-40">
            {guardando === 'nota' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {modal === 'editar' && (
        <EditarDatosModal lead={lead} credential={credential} onCerrar={() => setModal(null)} onListo={l => onCambio(l)} />
      )}
      {modal === 'elegir' && (
        <ElegirSeguimientoModal lead={lead} onElegir={que => setModal(que)} onCerrar={() => setModal(null)} />
      )}
      {(modal === 'llamada' || modal === 'mensaje') && (
        <ProgramarLlamadaModal lead={lead} credential={credential} tipo={modal === 'mensaje' ? 'MENSAJE' : 'LLAMADA'}
          onCerrar={() => setModal(null)} onListo={l => onCambio(l)} />
      )}
      {(modal === 'agenda' || modal === 'reagendar') && (
        <AgendarPresentacionModal lead={lead} operacion={operacion} credential={credential} reagendar={modal === 'reagendar'}
          onCerrar={() => setModal(null)} onListo={l => onCambio(l)} />
      )}
    </div>
  );
}

/** Tarjeta de lo programado: con dato muestra la fecha; sin dato invita a programarlo. */
// compacto: con tres tarjetas, la fecha y la hora van en dos líneas para que quepan
function Programado({ icono: Icono, titulo, valor, vacio, onClick, compacto = false }: {
  icono: React.ComponentType<{ className?: string }>; titulo: string; valor: string; vacio: string; onClick: () => void; compacto?: boolean;
}) {
  const [linea1, linea2] = compacto && valor.includes(' · ') ? valor.split(' · ') : [valor, ''];
  return (
    <button onClick={onClick}
      className={`min-w-0 min-h-[52px] rounded-xl border ${compacto ? 'px-2.5' : 'px-3'} py-2 text-left transition-colors ${valor ? 'border-brand-gold/50 bg-brand-gold/10 hover:bg-brand-gold/15' : 'border-dashed border-stone-700 hover:border-brand-gold/60'}`}>
      <div className={`flex items-center gap-1 text-[10px] uppercase ${compacto ? 'tracking-[0.04em]' : 'tracking-[0.12em] gap-1.5'} text-stone-400 min-w-0`}>{!compacto && <Icono className="w-3.5 h-3.5 shrink-0 text-brand-gold-light" />}<span className="truncate">{titulo}</span></div>
      <div className={`${compacto ? 'text-[12px]' : 'text-[13px]'} font-semibold truncate ${valor ? 'text-white' : 'text-brand-gold-light'}`}>{linea1 || '+ ' + vacio}</div>
      {linea2 && <div className="text-[11px] text-stone-300 truncate tabular-nums">{linea2}</div>}
    </button>
  );
}

/**
 * Convierte DETALLES DE SEGUIMIENTO en notas. Desde 19-nov-2026 cada línea se
 * guarda como "19/11/2026 3:47 PM · texto"; las líneas seguidas con la misma
 * marca son una sola nota (p. ej. la nota y su "Llamada programada … (LL-…)").
 * Las líneas viejas sin marca se muestran como "Sin fecha". Van en orden: la más nueva al final.
 */
type Nota = { fecha: string; hora: string; textos: string[]; ids: string[] };
function notasDeDetalles(detalles: string): Nota[] {
  const notas: Nota[] = [];
  (detalles || '').split('\n').map(s => s.trim()).filter(Boolean).forEach(linea => {
    const m = linea.match(/^(\d{1,2}\/\d{1,2}\/\d{4})\s+(\d{1,2}:\d{2}\s*[AP]M)\s*·\s*(.*)$/i);
    const fecha = m ? m[1] : '', hora = m ? m[2] : '';
    let texto = m ? m[3] : linea;
    const ids: string[] = [];
    texto = texto.replace(/\s*\(((?:LL|MS|CIT)-\d{4,})\)\s*$/i, (_, id) => { ids.push(id.toUpperCase()); return ''; });
    const ultima = notas[notas.length - 1];
    if (fecha && ultima && ultima.fecha === fecha && ultima.hora === hora) {
      if (texto) ultima.textos.push(texto);
      ultima.ids.push(...ids);
    } else {
      notas.push({ fecha, hora, textos: texto ? [texto] : [], ids });
    }
  });
  return notas;
}

function Dato({ t, v }: { t: string; v: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] text-stone-500">{t}</dt>
      <dd className="text-stone-200 truncate">{v || '—'}</dd>
    </div>
  );
}
