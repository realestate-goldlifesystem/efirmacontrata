import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CalendarDays, ChevronLeft, ChevronRight, RefreshCw, Loader2, AlertTriangle,
  X, Phone, MessageCircle, Mail, MapPin, Clock, Home, StickyNote, History, ExternalLink,
} from 'lucide-react';

const API_URL = 'https://script.google.com/macros/s/AKfycbxpJ8w_XR5dUhIv1VTuV3ZDjHm-vtz13B5RlyfiLqI9ypZnIuzuUL39_GDHpBisL2oW/exec';

interface Cita {
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
}

// Cómo se ve cada estado. Varios estados internos se agrupan en uno visible:
// para el agente "confirmada" y "confirmada ya avisada" son lo mismo.
type Grupo = 'pendiente' | 'confirmada' | 'reagendar' | 'reagendada' | 'cancelada' | 'asistio' | 'noasistio' | 'sinrespuesta';

// chip: sobre las tarjetas oscuras (calendario, lista, detalle).
// claro: sobre el fondo crema de la página (filtros), donde los tonos 300 no se leen.
const GRUPOS: Record<Grupo, { etiqueta: string; chip: string; claro: string; punto: string }> = {
  pendiente:    { etiqueta: 'Por confirmar',     chip: 'bg-amber-500/15 text-amber-300 border-amber-500/40', claro: 'bg-amber-50 text-amber-800 border-amber-300',       punto: 'bg-amber-400' },
  confirmada:   { etiqueta: 'Confirmada',        chip: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40', claro: 'bg-emerald-50 text-emerald-800 border-emerald-300', punto: 'bg-emerald-400' },
  reagendar:    { etiqueta: 'Quiere reagendar',  chip: 'bg-orange-500/20 text-orange-300 border-orange-500/50', claro: 'bg-orange-50 text-orange-800 border-orange-300',    punto: 'bg-orange-400' },
  reagendada:   { etiqueta: 'Reagendada',        chip: 'bg-sky-500/15 text-sky-300 border-sky-500/40', claro: 'bg-sky-50 text-sky-800 border-sky-300',             punto: 'bg-sky-400' },
  cancelada:    { etiqueta: 'Cancelada',         chip: 'bg-red-500/15 text-red-300 border-red-500/40', claro: 'bg-red-50 text-red-800 border-red-300',             punto: 'bg-red-400' },
  asistio:      { etiqueta: 'Asistió',           chip: 'bg-teal-500/15 text-teal-300 border-teal-500/40', claro: 'bg-teal-50 text-teal-800 border-teal-300',          punto: 'bg-teal-400' },
  noasistio:    { etiqueta: 'No asistió',        chip: 'bg-rose-500/15 text-rose-300 border-rose-500/40', claro: 'bg-rose-50 text-rose-800 border-rose-300',          punto: 'bg-rose-400' },
  sinrespuesta: { etiqueta: 'Sin respuesta',     chip: 'bg-stone-500/15 text-stone-400 border-stone-500/40', claro: 'bg-stone-100 text-stone-700 border-stone-300',       punto: 'bg-stone-500' },
};

function grupoDe(estado: string): Grupo {
  switch ((estado || '').trim().toUpperCase()) {
    case 'CONFIRMADA':
    case 'CONFIRMADA_NOTIFICADA': return 'confirmada';
    case 'QUIERE REAGENDAR': return 'reagendar';
    case 'REAGENDADA': return 'reagendada';
    case 'CANCELADA': return 'cancelada';
    case 'ASISTIDA': return 'asistio';
    case 'INASISTIDA': return 'noasistio';
    case 'SIN RESPUESTA': return 'sinrespuesta';
    default: return 'pendiente';
  }
}

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

const claveDia = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

/** Celular colombiano a formato internacional para WhatsApp / llamada. */
function internacional(celular: string) {
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
  const [diaSel, setDiaSel] = useState(() => new Date());
  const [filtro, setFiltro] = useState<Grupo | null>(null);
  const [detalle, setDetalle] = useState<Cita | null>(null);
  const listaRef = useRef<HTMLDivElement | null>(null);

  // En móvil la lista del día queda DEBAJO del calendario, fuera de la vista:
  // al tocar un día con citas se baja hasta ella. En escritorio está al lado.
  const elegirDia = (d: Date, hayCitas: boolean) => {
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

  const visibles = useMemo(() => (filtro ? citas.filter(c => grupoDe(c.estado) === filtro) : citas), [citas, filtro]);

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

  // Los que pidieron reagendar esperan una llamada: van arriba, bien visibles.
  const porLlamar = useMemo(() => citas.filter(c => grupoDe(c.estado) === 'reagendar'), [citas]);

  // Cuadrícula del mes, empezando en lunes.
  const celdas = useMemo(() => {
    const primero = new Date(mes.getFullYear(), mes.getMonth(), 1);
    const desfase = (primero.getDay() + 6) % 7;
    const inicio = new Date(primero); inicio.setDate(1 - desfase);
    return Array.from({ length: 42 }, (_, i) => { const d = new Date(inicio); d.setDate(inicio.getDate() + i); return d; });
  }, [mes]);

  const hoyClave = claveDia(new Date());
  const citasDelDia = porDia.get(claveDia(diaSel)) || [];

  const moverMes = (n: number) => setMes(m => new Date(m.getFullYear(), m.getMonth() + n, 1));
  const irAHoy = () => { const h = new Date(); setMes(new Date(h.getFullYear(), h.getMonth(), 1)); setDiaSel(h); };

  return (
    <div className="max-w-6xl mx-auto px-4 pt-20">
      {/* pt-20 en todas las pantallas: el botón fijo "Volver al Panel" del
          AgentDashboard ocupa esa franja y tapaba el título en escritorio. */}
      {/* Cabecera */}
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-light text-brand-gold flex items-center gap-3">
            <CalendarDays className="w-8 h-8" /> Agenda de Citas
          </h1>
          <p className="text-stone-600 mt-1 text-sm md:text-base">
            Citas agendadas por propietarios desde la página principal, con su estado en tiempo real.
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

      {/* Aviso: propietarios que esperan una llamada */}
      {porLlamar.length > 0 && (
        <div className="mb-6 p-4 rounded-2xl border border-orange-300 bg-orange-50">
          <p className="text-orange-900 font-semibold mb-3">
            📞 {porLlamar.length === 1 ? '1 propietario pidió' : `${porLlamar.length} propietarios pidieron`} reagendar: llámalos para acordar una nueva fecha.
          </p>
          <div className="flex flex-wrap gap-2">
            {porLlamar.map(c => (
              <button
                key={c.idCita}
                onClick={() => setDetalle(c)}
                className="px-3 py-1.5 rounded-full bg-white border border-orange-300 text-sm text-stone-800 hover:border-orange-500"
              >
                {c.nombre} · {c.fecha}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Filtros por estado (con conteo) */}
      {/* Móvil: una sola fila deslizable (en varias filas empujaban el calendario
          fuera de la pantalla). Escritorio: se reparten en varias filas. */}
      <div className="flex md:flex-wrap gap-2 mb-5 overflow-x-auto md:overflow-visible pb-1 -mx-4 px-4 md:mx-0 md:px-0">
        <button
          onClick={() => setFiltro(null)}
          className={`shrink-0 whitespace-nowrap px-3 py-1.5 rounded-full border text-xs md:text-sm transition-all ${filtro === null ? 'bg-brand-gold text-stone-950 border-brand-gold font-semibold' : 'bg-white text-stone-700 border-stone-300 hover:border-stone-400'}`}
        >
          Todas ({citas.length})
        </button>
        {(Object.keys(GRUPOS) as Grupo[]).filter(g => conteo[g]).map(g => (
          <button
            key={g}
            onClick={() => setFiltro(filtro === g ? null : g)}
            className={`shrink-0 whitespace-nowrap px-3 py-1.5 rounded-full border text-xs md:text-sm flex items-center gap-2 transition-all ${GRUPOS[g].claro} ${filtro === g ? 'ring-2 ring-brand-gold font-semibold' : 'hover:shadow-sm'}`}
          >
            <span className={`w-2 h-2 rounded-full ${GRUPOS[g].punto}`} />
            {GRUPOS[g].etiqueta} ({conteo[g]})
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Calendario del mes */}
        <div className="lg:col-span-2 bg-stone-900 border border-stone-800 rounded-3xl p-3 md:p-5">
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => moverMes(-1)} className="p-2 rounded-full text-stone-400 hover:text-brand-gold hover:bg-stone-800" aria-label="Mes anterior">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3">
              <h2 className="text-lg md:text-xl text-white font-semibold">{MESES[mes.getMonth()]} {mes.getFullYear()}</h2>
              <button onClick={irAHoy} className="text-xs px-2.5 py-1 rounded-full border border-stone-700 text-stone-300 hover:border-brand-gold hover:text-brand-gold">Hoy</button>
            </div>
            <button onClick={() => moverMes(1)} className="p-2 rounded-full text-stone-400 hover:text-brand-gold hover:bg-stone-800" aria-label="Mes siguiente">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-1">
            {DIAS.map(d => <div key={d} className="text-center text-[11px] md:text-xs uppercase tracking-wide text-stone-500 py-1">{d}</div>)}
          </div>

          {cargando && citas.length === 0 ? (
            <div className="flex items-center justify-center py-24 text-stone-400 gap-3">
              <Loader2 className="w-5 h-5 animate-spin" /> Cargando citas...
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-1">
              {celdas.map(d => {
                const k = claveDia(d);
                const del = porDia.get(k) || [];
                const fueraDeMes = d.getMonth() !== mes.getMonth();
                const seleccionado = k === claveDia(diaSel);
                const esHoy = k === hoyClave;
                return (
                  <button
                    key={k}
                    onClick={() => elegirDia(d, del.length > 0)}
                    className={`min-h-[56px] md:min-h-[92px] rounded-xl p-1 md:p-1.5 text-left border transition-all flex flex-col ${
                      seleccionado ? 'border-brand-gold bg-brand-gold/10' : 'border-stone-800 hover:border-stone-600 bg-stone-950/40'
                    } ${fueraDeMes ? 'opacity-40' : ''}`}
                  >
                    <span className={`text-xs md:text-sm mb-1 w-6 h-6 flex items-center justify-center rounded-full ${esHoy ? 'bg-brand-gold text-stone-950 font-bold' : 'text-stone-300'}`}>
                      {d.getDate()}
                    </span>
                    {/* Móvil: puntos. Escritorio: chips con hora y nombre. */}
                    <div className="flex flex-wrap gap-1 md:hidden">
                      {del.slice(0, 4).map(c => <span key={c.idCita} className={`w-1.5 h-1.5 rounded-full ${GRUPOS[grupoDe(c.estado)].punto}`} />)}
                    </div>
                    <div className="hidden md:flex flex-col gap-1 w-full">
                      {del.slice(0, 2).map(c => (
                        <span key={c.idCita} className={`truncate text-[10px] px-1.5 py-0.5 rounded border ${GRUPOS[grupoDe(c.estado)].chip}`}>
                          {c.hora} {c.nombre}
                        </span>
                      ))}
                      {del.length > 2 && <span className="text-[10px] text-stone-400 px-1">+{del.length - 2} más</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Citas del día seleccionado */}
        <div ref={listaRef} className="bg-stone-900 border border-stone-800 rounded-3xl p-4 md:p-5 scroll-mt-28">
          <h3 className="text-white font-semibold mb-1">
            {diaSel.getDate()} de {MESES[diaSel.getMonth()]} {diaSel.getFullYear()}
          </h3>
          <p className="text-stone-500 text-sm mb-4">
            {citasDelDia.length === 0 ? 'Sin citas este día.' : `${citasDelDia.length} cita${citasDelDia.length > 1 ? 's' : ''}`}
          </p>
          <div className="space-y-3">
            {citasDelDia.map(c => {
              const g = GRUPOS[grupoDe(c.estado)];
              return (
                <button
                  key={c.idCita}
                  onClick={() => setDetalle(c)}
                  className="w-full text-left p-3 rounded-2xl border border-stone-800 bg-stone-950/50 hover:border-brand-gold/60 transition-all"
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-brand-gold font-semibold flex items-center gap-1.5"><Clock className="w-4 h-4" /> {c.hora}</span>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full border ${g.chip}`}>{g.etiqueta}</span>
                  </div>
                  <p className="text-white font-medium">{c.nombre}</p>
                  <p className="text-stone-400 text-sm truncate">{c.servicio}{c.direccion ? ` · ${c.direccion}` : ''}</p>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Detalle de una cita */}
      {detalle && (
        <div className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4" onClick={() => setDetalle(null)}>
          <div
            className="w-full md:max-w-lg bg-stone-900 border border-stone-800 rounded-t-3xl md:rounded-3xl p-6 max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <span className={`inline-block text-xs px-2.5 py-1 rounded-full border mb-2 ${GRUPOS[grupoDe(detalle.estado)].chip}`}>
                  {GRUPOS[grupoDe(detalle.estado)].etiqueta}
                </span>
                <h3 className="text-2xl text-white font-semibold">{detalle.nombre}</h3>
                <p className="text-stone-500 text-xs mt-1">{detalle.idCita}</p>
              </div>
              <button onClick={() => setDetalle(null)} className="p-2 rounded-full bg-stone-800 text-stone-400 hover:text-white" aria-label="Cerrar">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-stone-300 text-sm">
              <p className="flex items-center gap-2"><Clock className="w-4 h-4 text-brand-gold" /> {detalle.fecha} · {detalle.hora}</p>
              <p className="flex items-center gap-2"><Home className="w-4 h-4 text-brand-gold" /> {detalle.servicio || '—'}</p>
              <p className="flex items-start gap-2"><MapPin className="w-4 h-4 text-brand-gold mt-0.5" /> {detalle.direccion || 'Sin dirección'}</p>
              {detalle.notas && <p className="flex items-start gap-2"><StickyNote className="w-4 h-4 text-brand-gold mt-0.5" /> {detalle.notas}</p>}
              {detalle.ultimoCambio && <p className="flex items-start gap-2 text-stone-500"><History className="w-4 h-4 mt-0.5" /> {detalle.ultimoCambio}</p>}
            </div>

            <div className="grid grid-cols-2 gap-2 mt-6">
              {detalle.celular && (
                <a href={`https://wa.me/${internacional(detalle.celular)}`} target="_blank" rel="noreferrer"
                   className="flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold">
                  <MessageCircle className="w-4 h-4" /> WhatsApp
                </a>
              )}
              {detalle.celular && (
                <a href={`tel:+${internacional(detalle.celular)}`}
                   className="flex items-center justify-center gap-2 py-3 rounded-xl bg-stone-800 hover:bg-stone-700 text-white font-semibold">
                  <Phone className="w-4 h-4" /> Llamar
                </a>
              )}
              {detalle.correo && (
                <a href={`mailto:${detalle.correo}`}
                   className="flex items-center justify-center gap-2 py-3 rounded-xl bg-stone-800 hover:bg-stone-700 text-white font-semibold">
                  <Mail className="w-4 h-4" /> Correo
                </a>
              )}
              <a
                href={(() => { const d = new Date(detalle.timestamp); return `https://calendar.google.com/calendar/r/day/${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`; })()}
                target="_blank" rel="noreferrer"
                className="flex items-center justify-center gap-2 py-3 rounded-xl border border-brand-gold/50 text-brand-gold hover:bg-brand-gold/10 font-semibold"
              >
                <ExternalLink className="w-4 h-4" /> Calendar
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
