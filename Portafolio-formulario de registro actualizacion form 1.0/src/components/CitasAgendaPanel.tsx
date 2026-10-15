import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CalendarDays, ChevronLeft, ChevronRight, RefreshCw, Loader2, AlertTriangle,
  Clock,
} from 'lucide-react';
import DetalleCita from './DetalleCita';

export const API_URL = 'https://script.google.com/macros/s/AKfycbxpJ8w_XR5dUhIv1VTuV3ZDjHm-vtz13B5RlyfiLqI9ypZnIuzuUL39_GDHpBisL2oW/exec';

export interface Cita {
  idCita: string;
  estado: string;
  timestamp: number;
  fecha: string;
  hora: string;
  nombre: string;
  celular: string;
  correo: string;
  servicio: string;
  direccion: string;
  notas: string;
  ultimoCambio: string;
  notasAgente?: string;
  idInmueble?: string;
  tipoAgenda?: string;
}

// Tipo de agenda: QUÉ es la cita (el estado dice en qué va). Etiqueta sólida con
// ícono y franja de color, en tonos que no usan los estados para no confundirlos.
export type TipoAgenda = 'PROPIETARIO' | 'INTERESADO' | 'ENTREGA' | 'DEVOLUCION';
export const TIPOS: Record<TipoAgenda, { etiqueta: string; solido: string; franja: string; borde: string }> = {
  PROPIETARIO: { etiqueta: 'Presentación al propietario', solido: 'bg-brand-gold text-stone-950',  franja: 'bg-brand-gold',  borde: 'border-l-brand-gold' },
  INTERESADO:  { etiqueta: 'Visita de interesado',        solido: 'bg-indigo-500 text-white',      franja: 'bg-indigo-500',  borde: 'border-l-indigo-500' },
  ENTREGA:     { etiqueta: 'Entrega del inmueble',        solido: 'bg-cyan-500 text-stone-950',    franja: 'bg-cyan-500',    borde: 'border-l-cyan-500' },
  DEVOLUCION:  { etiqueta: 'Recibo del inmueble',         solido: 'bg-fuchsia-500 text-white',     franja: 'bg-fuchsia-500', borde: 'border-l-fuchsia-500' },
};
export const tipoDe = (c: Cita): TipoAgenda =>
  (c.tipoAgenda && c.tipoAgenda in TIPOS ? c.tipoAgenda : 'PROPIETARIO') as TipoAgenda;

// Cómo se ve cada estado. Varios estados internos se agrupan en uno visible:
// para el agente "confirmada" y "confirmada ya avisada" son lo mismo.
export type Grupo = 'porcoordinar' | 'pendiente' | 'confirmada' | 'reagendar' | 'reagendada' | 'cancelada' | 'asistio' | 'noasistio' | 'sinrespuesta';

// chip: sobre las tarjetas oscuras (calendario, lista, detalle).
// claro: sobre el fondo crema de la página (filtros), donde los tonos 300 no se leen.
export const GRUPOS: Record<Grupo, { etiqueta: string; chip: string; claro: string; punto: string }> = {
  // Visita de interesado a un inmueble con acompañamiento del propietario: espera
  // que el agente (y, en el bloque 2, el propietario) coordine la hora
  porcoordinar: { etiqueta: 'Por coordinar',     chip: 'bg-orange-500/20 text-orange-300 border-orange-500/50', claro: 'bg-orange-50 text-orange-800 border-orange-300',    punto: 'bg-orange-400' },
  pendiente:    { etiqueta: 'Por confirmar',     chip: 'bg-amber-500/15 text-amber-300 border-amber-500/40', claro: 'bg-amber-50 text-amber-800 border-amber-300',       punto: 'bg-amber-400' },
  confirmada:   { etiqueta: 'Confirmada',        chip: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40', claro: 'bg-emerald-50 text-emerald-800 border-emerald-300', punto: 'bg-emerald-400' },
  reagendar:    { etiqueta: 'Quiere reagendar',  chip: 'bg-orange-500/20 text-orange-300 border-orange-500/50', claro: 'bg-orange-50 text-orange-800 border-orange-300',    punto: 'bg-orange-400' },
  reagendada:   { etiqueta: 'Reagendada',        chip: 'bg-sky-500/15 text-sky-300 border-sky-500/40', claro: 'bg-sky-50 text-sky-800 border-sky-300',             punto: 'bg-sky-400' },
  cancelada:    { etiqueta: 'Cancelada',         chip: 'bg-red-500/15 text-red-300 border-red-500/40', claro: 'bg-red-50 text-red-800 border-red-300',             punto: 'bg-red-400' },
  asistio:      { etiqueta: 'Asistió',           chip: 'bg-teal-500/15 text-teal-300 border-teal-500/40', claro: 'bg-teal-50 text-teal-800 border-teal-300',          punto: 'bg-teal-400' },
  noasistio:    { etiqueta: 'No asistió',        chip: 'bg-rose-500/15 text-rose-300 border-rose-500/40', claro: 'bg-rose-50 text-rose-800 border-rose-300',          punto: 'bg-rose-400' },
  sinrespuesta: { etiqueta: 'Sin respuesta',     chip: 'bg-stone-500/15 text-stone-400 border-stone-500/40', claro: 'bg-stone-100 text-stone-700 border-stone-300',       punto: 'bg-stone-500' },
};

/** Por qué se canceló una cita, leído de su estado y su último cambio. '' si no está cancelada. */
export function motivoCancelacion(c: Cita): { corto: string; largo: string } | null {
  const estado = (c.estado || '').trim().toUpperCase();
  const cambio = c.ultimoCambio || '';
  if (estado === 'SIN RESPUESTA' || /cancelada automáticamente/i.test(cambio)) {
    return { corto: 'Sin respuesta', largo: 'Sin respuesta: no confirmó a tiempo.' };
  }
  if (estado !== 'CANCELADA') return null;
  const delAgente = cambio.match(/agente canceló desde el panel:\s*(.+)$/i);
  if (delAgente) return { corto: 'Por ti', largo: 'La cancelaste tú: ' + delAgente[1].trim() };
  if (/propietario/i.test(cambio)) return { corto: 'Por el propietario', largo: 'La canceló el propietario desde su correo.' };
  return { corto: 'Cancelada', largo: 'Sin motivo registrado.' };
}

export function grupoDe(estado: string): Grupo {
  switch ((estado || '').trim().toUpperCase()) {
    case 'CONFIRMADA':
    case 'CONFIRMADA_NOTIFICADA': return 'confirmada';
    case 'QUIERE REAGENDAR': return 'reagendar';
    case 'POR COORDINAR': return 'porcoordinar';
    case 'REAGENDADA': return 'reagendada';
    case 'CANCELADA': return 'cancelada';
    case 'ASISTIDA': return 'asistio';
    case 'INASISTIDA': return 'noasistio';
    // Sin respuesta es una forma de cancelada (Leonardo, 14-oct-2026): un solo
    // filtro; el motivo se ve en la tarjeta y en la ventana (motivoCancelacion).
    case 'SIN RESPUESTA': return 'cancelada';
    default: return 'pendiente';
  }
}

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

const claveDia = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

/** Celular colombiano a formato internacional para WhatsApp / llamada. */
export function internacional(celular: string) {
  const d = (celular || '').replace(/\D/g, '');
  return d.length === 10 ? '57' + d : d;
}

interface Props {
  agentCredential: string | null;
}

export default function CitasAgendaPanel({ agentCredential }: Props) {
  const [citas, setCitas] = useState<Cita[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mes, setMes] = useState(() => { const h = new Date(); return new Date(h.getFullYear(), h.getMonth(), 1); });
  // null = sin día elegido: la lista de la derecha muestra todas las citas del mes.
  const [diaSel, setDiaSel] = useState<Date | null>(null);
  const [filtro, setFiltro] = useState<Grupo | null>(null);
  const [detalle, setDetalle] = useState<Cita | null>(null);
  const listaRef = useRef<HTMLDivElement | null>(null);
  const cuadriculaRef = useRef<HTMLDivElement | null>(null);
  const [altoCelda, setAltoCelda] = useState<number | null>(null);

  // En PC la agenda cabe entera en la pantalla, sin deslizar: el alto de cada
  // casilla sale del espacio que queda debajo de donde empieza la cuadrícula
  // (cambia si hay avisos arriba). En celular las casillas tienen su alto fijo.
  useEffect(() => {
    const medir = () => {
      const g = cuadriculaRef.current;
      if (!g || !window.matchMedia('(min-width: 1024px)').matches) { setAltoCelda(null); return; }
      const gap = parseFloat(getComputedStyle(g).rowGap) || 0;
      const libre = window.innerHeight - (g.getBoundingClientRect().top + window.scrollY) - 40;
      setAltoCelda(Math.max(48, Math.min(150, (libre - 5 * gap) / 6)));
    };
    medir();
    const t = setTimeout(medir, 300);
    window.addEventListener('resize', medir);
    return () => { clearTimeout(t); window.removeEventListener('resize', medir); };
  });

  // En móvil la lista va ARRIBA del calendario: al tocar un día con citas se sube
  // hasta ella para ver el detalle. En escritorio está al lado.
  const elegirDia = (d: Date, hayCitas: boolean) => {
    // Tocar otra vez el día elegido vuelve a la lista de todas
    if (diaSel && claveDia(d) === claveDia(diaSel)) { setDiaSel(null); return; }
    setDiaSel(d);
    if (hayCitas && window.matchMedia('(max-width: 1023px)').matches) {
      setTimeout(() => listaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
    }
  };

  const cargar = async () => {
    if (!agentCredential) {
      setError('Tu sesión de Google ya no está disponible. Cierra sesión y vuelve a entrar para ver las citas.');
      setCargando(false);
      return;
    }
    setCargando(true);
    setError(null);
    try {
      const r = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ accion: 'obtenerCitas', credential: agentCredential }),
      });
      const data = await r.json();
      if (data.success) setCitas(data.citas || []);
      else setError(data.message || 'No se pudieron cargar las citas.');
    } catch {
      setError('Error de red al conectar con el servidor.');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { cargar(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  // Sin filtro se ven las ACTIVAS: lo que tengo por delante. Canceladas, sin
  // respuesta y "quiere reagendar" no ocupan espacio; se ven con su propio filtro.
  // (Desde oct-2026 el propietario se reagenda solo y la cita queda confirmada:
  // "quiere reagendar" solo puede quedar en citas de correos viejos.)
  const esActiva = (c: Cita) => ['porcoordinar', 'pendiente', 'confirmada', 'reagendada'].includes(grupoDe(c.estado));
  const visibles = useMemo(() => (filtro ? citas.filter(c => grupoDe(c.estado) === filtro) : citas.filter(esActiva)), [citas, filtro]);

  const porDia = useMemo(() => {
    const m = new Map<string, Cita[]>();
    visibles.forEach(c => {
      const k = claveDia(new Date(c.timestamp));
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(c);
    });
    return m;
  }, [visibles]);

  const conteo = useMemo(() => {
    const n = {} as Record<Grupo, number>;
    citas.forEach(c => { const g = grupoDe(c.estado); n[g] = (n[g] || 0) + 1; });
    return n;
  }, [citas]);


  // Cuadrícula del mes, empezando en lunes.
  const celdas = useMemo(() => {
    const primero = new Date(mes.getFullYear(), mes.getMonth(), 1);
    const desfase = (primero.getDay() + 6) % 7;
    const inicio = new Date(primero); inicio.setDate(1 - desfase);
    return Array.from({ length: 42 }, (_, i) => { const d = new Date(inicio); d.setDate(inicio.getDate() + i); return d; });
  }, [mes]);

  const hoyClave = claveDia(new Date());
  const citasDelDia = diaSel ? porDia.get(claveDia(diaSel)) || [] : [];

  // Sin día elegido: todas las citas del mes que se ve, agrupadas por día.
  // Primero las que vienen (de la más cercana a la más lejana) y al final las
  // que ya pasaron, atenuadas.
  const gruposDelMes = useMemo(() => {
    // "Activas": solo el mes que se ve. Con un filtro: TODAS las citas de ese estado,
    // de cualquier mes, para que el número del filtro y la lista coincidan.
    const delMes = filtro ? visibles : visibles.filter(c => { const d = new Date(c.timestamp); return d.getFullYear() === mes.getFullYear() && d.getMonth() === mes.getMonth(); });
    const inicioHoy = new Date(); inicioHoy.setHours(0, 0, 0, 0);
    const proximas = delMes.filter(c => c.timestamp >= inicioHoy.getTime()).sort((a, b) => a.timestamp - b.timestamp);
    const pasadas = delMes.filter(c => c.timestamp < inicioHoy.getTime()).sort((a, b) => b.timestamp - a.timestamp);
    const agrupar = (lista: Cita[], pasada: boolean) => {
      const out: { clave: string; dia: Date; citas: Cita[]; pasada: boolean }[] = [];
      lista.forEach(c => {
        const d = new Date(c.timestamp); const k = claveDia(d);
        const ult = out[out.length - 1];
        if (ult && ult.clave === k) ult.citas.push(c); else out.push({ clave: k, dia: d, citas: [c], pasada });
      });
      return out;
    };
    // En "Activas" solo lo que viene; con un filtro, lo que viene y luego el historial (lo más reciente primero)
    const grupos = filtro ? [...agrupar(proximas, false), ...agrupar(pasadas, true)] : agrupar(proximas, false);
    return { grupos, total: grupos.reduce((n, g) => n + g.citas.length, 0) };
  }, [visibles, mes, filtro]);

  const moverMes = (n: number) => setMes(m => new Date(m.getFullYear(), m.getMonth() + n, 1));
  const irAHoy = () => { const h = new Date(); setMes(new Date(h.getFullYear(), h.getMonth(), 1)); setDiaSel(h); };
  const DIAS_LARGOS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  return (
    <div className="w-full max-w-[1760px] mx-auto px-[clamp(1rem,2.5vw,3rem)] pt-20 xl:pt-0 xl:pl-[15rem]">
      {/* El botón fijo "Volver al Panel" del AgentDashboard ocupa la esquina
          izquierda. Hasta xl se deja la franja de arriba (pt-20); desde xl el
          contenido arranca a su derecha (pl-15rem), el título sube a su altura y el
          calendario crece con el ancho de la pantalla (medidas con clamp). */}
      {/* Cabecera */}
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-light text-brand-gold flex items-center gap-3">
            <CalendarDays className="w-8 h-8" /> Agenda de Citas
          </h1>
          <p className="text-stone-600 mt-1 text-sm md:text-base">
            Presentaciones a propietarios y visitas de interesados, con su estado en tiempo real.
          </p>
        </div>
        <button
          onClick={cargar}
          disabled={cargando}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-stone-300 rounded-full text-stone-700 hover:text-brand-gold-dark hover:border-brand-gold transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${cargando ? 'animate-spin' : ''}`} /> Actualizar
        </button>
      </div>

      {error && (
        <div className="mb-6 flex items-start gap-3 p-4 rounded-2xl border border-red-300 bg-red-50 text-red-800">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Filtros por estado (con conteo) */}
      {/* Móvil: cuadrícula de botones grandes, fáciles de tocar con el pulgar.
          Escritorio: chips en varias filas. */}
      <div className="grid grid-cols-2 md:flex md:flex-wrap gap-2 mb-5">
        <button
          onClick={() => setFiltro(null)}
          aria-pressed={filtro === null}
          className={`col-span-2 md:col-span-1 min-h-[48px] md:min-h-0 px-4 md:px-3 py-3 md:py-1.5 rounded-xl md:rounded-full border text-sm flex items-center justify-between md:justify-start gap-2 transition-all active:scale-[0.98] ${filtro === null ? "bg-brand-gold text-stone-950 border-brand-gold font-semibold" : "bg-white text-stone-700 border-stone-300 hover:border-stone-400"}`}
        >
          <span>Activas</span>
          <span className="text-xs md:text-sm opacity-80 bg-black/5 md:bg-transparent rounded-full px-2 md:px-0">{citas.filter(esActiva).length}</span>
        </button>
        {(Object.keys(GRUPOS) as Grupo[]).filter(g => conteo[g]).map(g => (
          <button
            key={g}
            onClick={() => setFiltro(filtro === g ? null : g)}
            aria-pressed={filtro === g}
            className={`min-h-[48px] md:min-h-0 px-3 py-2.5 md:py-1.5 rounded-xl md:rounded-full border text-sm flex items-center gap-2 text-left transition-all active:scale-[0.98] ${GRUPOS[g].claro} ${filtro === g ? "ring-2 ring-brand-gold font-semibold" : "hover:shadow-sm"}`}
          >
            <span className={`w-2.5 h-2.5 md:w-2 md:h-2 shrink-0 rounded-full ${GRUPOS[g].punto}`} />
            <span className="flex-1 leading-tight">{GRUPOS[g].etiqueta}</span>
            <span className="text-xs font-semibold">{conteo[g]}</span>
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_clamp(280px,26vw,420px)] gap-[clamp(1rem,1.6vw,2rem)]">
        {/* Calendario del mes */}
        {/* En celular el calendario va DEBAJO de la lista (order-2): primero lo próximo */}
        <div className="order-2 lg:order-1 min-w-0 bg-stone-900 border border-stone-800 rounded-3xl p-[clamp(0.75rem,1.4vw,1.75rem)]">
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => moverMes(-1)} className="p-2 rounded-full text-stone-400 hover:text-brand-gold hover:bg-stone-800" aria-label="Mes anterior">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3">
              <h2 className="text-[clamp(1.125rem,1.5vw,1.75rem)] text-white font-semibold">{MESES[mes.getMonth()]} {mes.getFullYear()}</h2>
              <button onClick={irAHoy} className="text-xs px-2.5 py-1 rounded-full border border-stone-700 text-stone-300 hover:border-brand-gold hover:text-brand-gold">Hoy</button>
            </div>
            <button onClick={() => moverMes(1)} className="p-2 rounded-full text-stone-400 hover:text-brand-gold hover:bg-stone-800" aria-label="Mes siguiente">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-[clamp(0.25rem,0.5vw,0.625rem)] mb-1">
            {DIAS.map(d => <div key={d} className="text-center text-[clamp(0.6875rem,0.8vw,0.875rem)] uppercase tracking-wide text-stone-500 py-1">{d}</div>)}
          </div>

          {cargando && citas.length === 0 ? (
            <div className="flex items-center justify-center py-24 text-stone-400 gap-3">
              <Loader2 className="w-5 h-5 animate-spin" /> Cargando citas...
            </div>
          ) : (
            <div ref={cuadriculaRef} className="grid grid-cols-7 gap-[clamp(0.25rem,0.5vw,0.625rem)]">
              {celdas.map(d => {
                const k = claveDia(d);
                const del = porDia.get(k) || [];
                const fueraDeMes = d.getMonth() !== mes.getMonth();
                const seleccionado = !!diaSel && k === claveDia(diaSel);
                const esHoy = k === hoyClave;
                return (
                  <button
                    key={k}
                    onClick={() => elegirDia(d, del.length > 0)}
                    className={`relative min-h-[56px] lg:min-h-0 overflow-hidden rounded-xl p-[clamp(0.25rem,0.6vw,0.75rem)] text-left border transition-all flex flex-col ${
                      // Seleccionado: dorado. Hoy (si no está seleccionado): blanco suave, para ubicarse de un vistazo
                      seleccionado ? 'border-brand-gold bg-brand-gold/10' : esHoy ? 'border-stone-300/70 bg-white/[0.07]' : 'border-stone-800 hover:border-stone-600 bg-stone-950/40'
                    } ${fueraDeMes ? 'opacity-40' : ''}`}
                    style={altoCelda ? { height: altoCelda } : undefined}
                  >
                    <span className={`text-[clamp(0.75rem,0.9vw,1rem)] mb-1 w-[clamp(1.5rem,1.8vw,2rem)] h-[clamp(1.5rem,1.8vw,2rem)] flex items-center justify-center rounded-full ${esHoy ? 'bg-brand-gold text-stone-950 font-bold' : 'text-stone-300'}`}>
                      {d.getDate()}
                    </span>
                    {esHoy && <span className="absolute top-[clamp(0.3rem,0.6vw,0.6rem)] right-[clamp(0.35rem,0.6vw,0.7rem)] text-[clamp(9px,0.65vw,11px)] font-semibold uppercase tracking-wider text-brand-gold">Hoy</span>}
                    {/* Contadores por estado: el calendario dice qué tan ocupado está
                        cada día; el detalle (hora, nombre) está en la lista. */}
                    {del.length > 0 && (
                      <div className="mt-auto flex flex-wrap gap-1">
                        {(Object.keys(GRUPOS) as Grupo[]).map(g => {
                          const n = del.filter(c => grupoDe(c.estado) === g).length;
                          return n ? (
                            <span key={g} title={`${n} ${GRUPOS[g].etiqueta.toLowerCase()}`}
                              className={`min-w-[clamp(1.25rem,1.5vw,1.6rem)] h-[clamp(1.25rem,1.5vw,1.6rem)] px-1 rounded-full flex items-center justify-center text-[clamp(10px,0.75vw,13px)] font-bold text-stone-950 ${GRUPOS[g].punto}`}>
                              {n}
                            </span>
                          ) : null;
                        })}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Citas del día seleccionado */}
        {/* En PC la lista mide lo mismo que el calendario (el contenedor no
            aporta alto a la fila: va en absolute) y se desplaza por dentro. */}
        <div ref={listaRef} className="order-1 lg:order-2 min-w-0 relative scroll-mt-28">
        <div className="max-h-[60vh] overflow-y-auto lg:max-h-none lg:absolute lg:inset-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden bg-stone-900 border border-stone-800 rounded-3xl p-[clamp(1rem,1.4vw,1.75rem)]">
          {diaSel ? (
            <>
              <div className="flex items-start justify-between gap-3 mb-1">
                <h3 className="text-white font-semibold">
                  {diaSel.getDate()} de {MESES[diaSel.getMonth()]} {diaSel.getFullYear()}
                </h3>
                <button onClick={() => setDiaSel(null)} className="shrink-0 text-xs px-2.5 py-1 rounded-full border border-stone-700 text-stone-300 hover:border-brand-gold hover:text-brand-gold">
                  Ver todas
                </button>
              </div>
              <p className="text-stone-500 text-sm mb-4">
                {citasDelDia.length === 0 ? 'Sin citas este día.' : `${citasDelDia.length} cita${citasDelDia.length > 1 ? 's' : ''}`}
              </p>
              <div className="space-y-3">
                {citasDelDia.map(c => <TarjetaCita key={c.idCita} c={c} onAbrir={() => setDetalle(c)} />)}
              </div>
            </>
          ) : (
            <>
              <h3 className="text-white font-semibold mb-1">
                {filtro ? `${GRUPOS[filtro].etiqueta} · todas` : `Próximas citas · ${MESES[mes.getMonth()]}`}
              </h3>
              <p className="text-stone-500 text-sm mb-4">
                {gruposDelMes.total === 0 ? (filtro ? 'No hay citas en este estado.' : 'No tienes citas próximas este mes.') : `${gruposDelMes.total} cita${gruposDelMes.total > 1 ? 's' : ''}` + (filtro ? '' : ' · toca un día para ver solo ese')}
              </p>
              <div className="space-y-5">
                {gruposDelMes.grupos.map((g, i) => (
                  <div key={g.clave + (g.pasada ? 'p' : '')} className={g.pasada ? 'opacity-55' : ''}>
                    {g.pasada && (i === 0 || !gruposDelMes.grupos[i - 1].pasada) && (
                      <p className="text-[11px] uppercase tracking-[0.16em] text-stone-500 mb-3 pt-2 border-t border-stone-800">Ya pasaron</p>
                    )}
                    <button
                      onClick={() => { setDiaSel(g.dia); setMes(new Date(g.dia.getFullYear(), g.dia.getMonth(), 1)); }}
                      className="text-xs uppercase tracking-wide text-stone-400 hover:text-brand-gold mb-2"
                    >
                      {DIAS_LARGOS[g.dia.getDay()]} {g.dia.getDate()} de {MESES[g.dia.getMonth()].toLowerCase()}{g.dia.getFullYear() !== new Date().getFullYear() ? ` de ${g.dia.getFullYear()}` : ''}
                    </button>
                    <div className="space-y-3">
                      {g.citas.map(c => <TarjetaCita key={c.idCita} c={c} onAbrir={() => setDetalle(c)} />)}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
        </div>
      </div>

      {/* Detalle de una cita, con las acciones del agente (DetalleCita.tsx) */}
      {detalle && (
        <DetalleCita
          cita={detalle}
          agentCredential={agentCredential}
          onCerrar={() => setDetalle(null)}
          onCambio={() => { setDetalle(null); cargar(); }}
        />
      )}
    </div>
  );
}

/** Tarjeta de una cita en la lista de la derecha. */
function TarjetaCita({ c, onAbrir }: { c: Cita; onAbrir: () => void; key?: string }) {
  const g = GRUPOS[grupoDe(c.estado)];
  return (
    <button
      onClick={onAbrir}
      className={`w-full text-left p-3 rounded-2xl border border-stone-800 border-l-4 ${TIPOS[tipoDe(c)].borde} bg-stone-950/50 hover:border-brand-gold/60 transition-all`}
      title={TIPOS[tipoDe(c)].etiqueta}
    >
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="text-brand-gold font-semibold flex items-center gap-1.5"><Clock className="w-4 h-4" /> {c.hora}</span>
        <span className="flex flex-col items-end gap-0.5">
          <span className={`text-[11px] px-2 py-0.5 rounded-full border ${g.chip}`}>{g.etiqueta}</span>
          {motivoCancelacion(c) && <span className="text-[10px] text-stone-500">{motivoCancelacion(c)!.corto}</span>}
        </span>
      </div>
      <p className="text-white font-medium">{c.nombre}</p>
      <p className="text-stone-400 text-sm truncate">{c.servicio}{c.direccion ? ` · ${c.direccion}` : ''}</p>
    </button>
  );
}
