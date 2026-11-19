import type React from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2, CheckCircle2, Video, MapPin, ChevronLeft } from 'lucide-react';
import { API_URL } from './CitasAgendaPanel';
import { llamarCRM, type Lead } from './CaptacionesPanel';

// Las dos ventanas del CRM de captaciones, las mismas del Sheet:
//   - Programar llamada  = MODAL_SEGUIMIENTO.html     → programarLlamada
//   - Agendar presentación = MODAL_AGENDA_CAPTACION.html → agendarDesdeCaptacion
// Mismas reglas: horario 7:00 a. m. a 8:00 p. m., cada 30 min, sin domingos, sin
// cruzarse con otras llamadas del CRM ni con el calendario, y la agenda del portal.

const DIAS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const DIAS_L = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const SLOT = 30 * 60000;
const H_INI = 7 * 60, H_FIN = 20 * 60;
const hhmm = (t: Date) => (t.getHours() % 12 || 12) + ':' + String(t.getMinutes()).padStart(2, '0') + (t.getHours() < 12 ? ' a. m.' : ' p. m.');
const textoLargo = (t: Date) => {
  const s = DIAS_L[t.getDay()] + ' ' + t.getDate() + ' de ' + MESES[t.getMonth()] + ' · ' + hhmm(t);
  return s.charAt(0).toUpperCase() + s.slice(1);
};

function Marco({ titulo, sub, onCerrar, children, pie }: { titulo: string; sub: string; onCerrar: () => void; children: React.ReactNode; pie?: React.ReactNode }) {
  // Portal al <body>: el panel del agente anima su contenedor, y eso dejaría la
  // ventana por debajo de la barra superior del sitio.
  return createPortal(
    <div className="fixed inset-0 z-[200] bg-stone-950/70 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4" onClick={onCerrar}>
      <div role="dialog" aria-modal="true" aria-label={titulo} onClick={e => e.stopPropagation()}
        className="w-full sm:max-w-lg max-h-[94vh] flex flex-col bg-stone-900 border border-stone-800 rounded-t-3xl sm:rounded-3xl text-stone-200 shadow-2xl animate-fade-in">
        <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3">
          <div className="min-w-0">
            <h3 className="text-lg font-semibold text-white">{titulo}</h3>
            <p className="text-xs text-stone-400 truncate">{sub}</p>
          </div>
          <button onClick={onCerrar} aria-label="Cerrar" className="w-11 h-11 flex items-center justify-center -mr-1.5 rounded-full bg-stone-800 text-stone-400 hover:text-white shrink-0"><X className="w-5 h-5" /></button>
        </div>
        <div className="px-5 pb-4 overflow-y-auto flex-1">{children}</div>
        {pie && <div className="px-5 py-4 border-t border-stone-800">{pie}</div>}
      </div>
    </div>,
    document.body
  );
}

/** Pantalla de "listo" con el conteo de 5 a 0, como en el Sheet. */
function Listo({ texto, onCerrar }: { texto: string; onCerrar: () => void }) {
  const [n, setN] = useState(5);
  const cerrar = useRef(onCerrar);
  cerrar.current = onCerrar;
  useEffect(() => {
    if (n <= 0) { cerrar.current(); return; }
    const t = setTimeout(() => setN(n - 1), 1000);
    return () => clearTimeout(t);
  }, [n]);
  return (
    <div className="py-8 flex flex-col items-center text-center gap-3">
      <CheckCircle2 className="w-12 h-12 text-emerald-400" />
      <p className="text-white font-semibold">{texto}</p>
      <p className="text-xs text-stone-500">Se cierra en {n} s</p>
    </div>
  );
}

// ==========================================
// Programar llamada de seguimiento
// ==========================================

interface Ocupado { inicio: number; fin: number; que: string; propia?: boolean; }

const RAPIDOS: { t: string; min?: number; d?: number }[] = [
  { t: 'En media hora', min: 30 }, { t: 'En 1 hora', min: 60 }, { t: 'En 2 horas', min: 120 }, { t: 'En 3 horas', min: 180 },
  { t: 'Mañana', d: 1 }, { t: 'En 2 días', d: 2 }, { t: 'En 3 días', d: 3 }, { t: 'En 1 semana', d: 7 }, { t: 'En 15 días', d: 15 },
];
const alSlot = (ms: number) => Math.ceil(ms / SLOT) * SLOT;
function destinoRapido(r: { min?: number; d?: number }) {
  // Horas: desde la media hora más próxima del reloj. Días: misma hora redondeada, N días después.
  if (r.min) return new Date(alSlot(Date.now() + 60000) + (r.min === 30 ? 0 : r.min) * 60000);
  const base = new Date(alSlot(Date.now()));
  return new Date(base.getFullYear(), base.getMonth(), base.getDate() + (r.d || 0), base.getHours(), base.getMinutes());
}
const HORAS: string[] = [];
for (let h = 7; h <= 20; h++) for (let m = 0; m < 60; m += 30) { if (h === 20 && m > 0) break; HORAS.push(h + ':' + m); }

export function ProgramarLlamadaModal({ lead, credential, onCerrar, onListo }: {
  lead: Lead; credential: string | null; onCerrar: () => void; onListo: (l: Lead) => void;
}) {
  const hoy = useMemo(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }, []);
  const dias = useMemo(() => Array.from({ length: 30 }, (_, i) => new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + i)), [hoy]);
  const [nota, setNota] = useState('');
  const [dia, setDia] = useState<number | null>(null);
  const [hora, setHora] = useState('10:0');
  const [rapido, setRapido] = useState<number | null>(null);
  const [ocupado, setOcupado] = useState<Ocupado[]>([]);
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const [listo, setListo] = useState('');
  const [, setReloj] = useState(0);

  useEffect(() => {
    const d0 = hoy.getTime();
    llamarCRM(credential, 'ocupado', { idLead: lead.idLead, desde: d0, hasta: d0 + 32 * 86400000 })
      .then(r => setOcupado(r.success ? r.ocupado || [] : []))
      .catch(() => setOcupado([]))
      .finally(() => setCargando(false));
    // El reloj avanza: los accesos rápidos se recalculan cada 30 s
    const t = setInterval(() => setReloj(x => x + 1), 30000);
    return () => clearInterval(t);
  }, [credential, lead.idLead, hoy]);

  const choca = (t: number) => ocupado.find(o => !o.propia && t >= o.inicio && t < o.fin);
  const motivoNo = (t: Date) => {
    const min = t.getHours() * 60 + t.getMinutes();
    if (t.getDay() === 0) return 'Cae domingo';
    if (min < H_INI || min > H_FIN) return 'Fuera del horario (7:00 a. m. a 8:00 p. m.)';
    const c = choca(t.getTime());
    return c ? 'Ocupado: ' + c.que : '';
  };
  const horaDe = (d: Date, v: string) => { const [h, m] = v.split(':').map(Number); return new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, m); };
  const estadoHora = (v: string) => {
    if (dia === null) return { off: true, etiqueta: '' };
    const t = horaDe(dias[dia], v).getTime();
    const c = choca(t);
    if (t <= Date.now()) return { off: true, etiqueta: 'ya pasó' };
    if (c) return { off: true, etiqueta: 'ocupado (' + c.que + ')' };
    if (ocupado.find(o => o.propia && o.inicio === t)) return { off: false, etiqueta: 'su llamada actual' };
    return { off: false, etiqueta: '' };
  };

  const elegirDia = (i: number) => {
    setRapido(null); setDia(i);
    // Si la hora elegida no sirve ese día, se pasa a la siguiente libre
    const libre = (v: string) => { const t = horaDe(dias[i], v).getTime(); return t > Date.now() && !choca(t); };
    if (!libre(hora)) { const otra = HORAS.find(libre); if (otra) setHora(otra); }
  };

  const momento = rapido != null ? new Date(rapido) : dia !== null ? horaDe(dias[dia], hora) : null;
  const choque = momento && choca(momento.getTime());
  const valido = !!momento && momento.getTime() > Date.now() && !choque;
  const resumen = !momento ? 'Elige un acceso rápido o el día' : choque ? 'Ocupado: ' + choque.que : !valido ? 'Esa hora ya pasó' : textoLargo(momento);

  const programar = async () => {
    if (!momento || !valido) return;
    setEnviando(true); setError('');
    try {
      const r = await llamarCRM(credential, 'programar', { idLead: lead.idLead, nota, timestamp: momento.getTime() });
      if (r.success) {
        if (r.lead) onListo(r.lead);
        setListo((r.texto || textoLargo(momento)) + '. Quedó en tu calendario y en el CRM; te recordaremos por correo.');
      } else setError(r.message || r.error || 'No se pudo programar.');
    } catch { setError('Error de red al programar.'); }
    finally { setEnviando(false); }
  };

  return (
    <Marco titulo="Programar llamada" sub={`${lead.nombre || 'Propietario'} · ${lead.idLead}`} onCerrar={onCerrar}
      pie={listo ? undefined : (
        <div className="flex flex-col gap-2">
          <div className={`text-sm ${valido ? 'text-brand-gold-light' : 'text-stone-400'}`}>{cargando ? 'Revisando tu agenda…' : resumen}</div>
          {error && <div className="text-sm text-red-300">{error}</div>}
          <div className="grid grid-cols-2 gap-2">
            <button onClick={onCerrar} className="min-h-[48px] rounded-xl border border-stone-700 text-stone-200 hover:border-stone-500">Cerrar</button>
            <button onClick={programar} disabled={!valido || cargando || enviando}
              className="min-h-[48px] rounded-xl bg-brand-gold text-stone-950 font-bold disabled:opacity-40 flex items-center justify-center gap-2">
              {enviando && <Loader2 className="w-4 h-4 animate-spin" />}{enviando ? 'Programando…' : 'Programar llamada'}
            </button>
          </div>
        </div>
      )}>
      {listo ? <Listo texto={listo} onCerrar={onCerrar} /> : (
        <div className="flex flex-col gap-4">
          <div>
            <label htmlFor="nota-llamada" className="text-xs text-stone-400">Detalle del seguimiento</label>
            <textarea id="nota-llamada" value={nota} onChange={e => setNota(e.target.value)} maxLength={500} rows={3}
              placeholder="¿Qué quedó hablado?"
              className="mt-1.5 w-full rounded-xl bg-stone-950 border border-stone-700 p-3 text-sm text-white placeholder:text-stone-500 resize-none focus:outline-none focus:border-brand-gold" />
          </div>
          <div>
            <div className="text-xs text-stone-400 mb-2">¿Cuándo lo llamas?</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {RAPIDOS.map(r => {
                const t = destinoRapido(r), no = cargando ? 'Revisando…' : motivoNo(t);
                const activo = rapido != null && rapido === t.getTime();
                return (
                  <button key={r.t} disabled={!!no} title={no || ''} onClick={() => { setRapido(t.getTime()); setDia(null); }}
                    className={`min-h-[52px] rounded-xl border px-2.5 py-1.5 text-left text-sm disabled:opacity-35 transition-colors ${activo ? 'border-brand-gold bg-brand-gold/15 text-white' : 'border-stone-700 bg-stone-950/40 hover:border-stone-500'}`}>
                    <div className="font-medium leading-tight">{r.t}</div>
                    <div className="text-[11px] text-stone-400">{(r.d ? DIAS[t.getDay()] + ' ' + t.getDate() + ' · ' : '') + hhmm(t)}</div>
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <div className="text-xs text-stone-400 mb-2">O elige el día</div>
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {dias.map((d, i) => (
                <button key={i} onClick={() => elegirDia(i)}
                  className={`shrink-0 w-14 py-1.5 rounded-xl border text-center ${dia === i ? 'border-brand-gold bg-brand-gold/15 text-white' : 'border-stone-700 bg-stone-950/40 text-stone-300'}`}>
                  <div className="text-[10px] uppercase">{i === 0 ? 'hoy' : DIAS[d.getDay()]}</div>
                  <div className="font-bold">{d.getDate()}</div>
                  <div className="text-[10px] text-stone-500">{MESES[d.getMonth()].slice(0, 3)}</div>
                </button>
              ))}
            </div>
          </div>
          <div>
            <label htmlFor="hora-llamada" className="text-xs text-stone-400">Hora</label>
            <select id="hora-llamada" value={hora} onChange={e => setHora(e.target.value)} disabled={dia === null}
              title={dia === null ? 'Primero elige el día' : ''}
              className="mt-1.5 w-full h-11 rounded-xl bg-stone-950 border border-stone-700 px-3 text-sm text-white disabled:opacity-40 focus:outline-none focus:border-brand-gold">
              {HORAS.map(v => {
                const [h, m] = v.split(':').map(Number);
                const e = estadoHora(v);
                return <option key={v} value={v} disabled={e.off}>{hhmm(new Date(2000, 0, 1, h, m))}{e.etiqueta ? ' — ' + e.etiqueta : ''}</option>;
              })}
            </select>
          </div>
        </div>
      )}
    </Marco>
  );
}

// ==========================================
// Agendar presentación al propietario
// ==========================================

interface Slot { horaAmPm: string; timestamp: number; }
const SERVICIOS = [
  { v: 'Venta', t: 'Venta (Corretaje)' }, { v: 'Arriendo', t: 'Arriendo (Corretaje)' },
  { v: 'Administración', t: 'Administración Integral' }, { v: 'Vendi-Renta', t: 'Vendi-Renta' }, { v: 'Admi-Venta', t: 'Admi-Venta' },
];
const iso = (d: Date) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');

export function AgendarPresentacionModal({ lead, operacion, credential, onCerrar, onListo }: {
  lead: Lead; operacion: 'A' | 'V'; credential: string | null; onCerrar: () => void; onListo: (l: Lead) => void;
}) {
  // Mismos datos de arranque que la ventana del Sheet (datosFilaCaptacion_)
  const inicial = useMemo(() => ({
    nombre: lead.nombre,
    celular: lead.celular,
    correo: lead.correo,
    servicio: operacion === 'V' ? 'Venta' : 'Arriendo',
    direccion: [lead.ubicacion, ({ U: 'Usaquén', S: 'Suba', C: 'Chapinero' } as Record<string, string>)[lead.localidad.toUpperCase()] || lead.localidad, 'Bogotá'].filter(Boolean).join(', '),
    notas: [
      [lead.tipo, lead.habitaciones ? lead.habitaciones + ' hab.' : ''].filter(Boolean).join(' · '),
      lead.valor ? 'Valor publicado: ' + lead.valor : '',
      lead.link,
    ].filter(Boolean).join('\n'),
  }), [lead, operacion]);
  const [f, setF] = useState(inicial);
  const [modalidad, setModalidad] = useState<'VIRTUAL' | 'PRESENCIAL' | null>(null);
  const [paso, setPaso] = useState(1);
  const [diaSel, setDiaSel] = useState<Date | null>(null);
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [motivo, setMotivo] = useState('');
  const [slot, setSlot] = useState<Slot | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const [listo, setListo] = useState('');
  const consulta = useRef(0);

  const dias = useMemo(() => { const h = new Date(); return Array.from({ length: 21 }, (_, i) => new Date(h.getFullYear(), h.getMonth(), h.getDate() + i)); }, []);
  const correoOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.correo.trim());
  const paso1Ok = !!f.nombre.trim() && !!f.celular.trim() && correoOk;
  const cambiar = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  const elegirDia = async (d: Date) => {
    setDiaSel(d); setSlot(null); setSlots(null); setMotivo('');
    const n = ++consulta.current;
    try {
      const r = await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ accion: 'obtenerDisponibilidad', fecha: iso(d) + 'T08:00:00' }) }).then(x => x.json());
      if (n !== consulta.current) return;
      if (!r || !r.success) { setSlots([]); setMotivo('No se pudo consultar la agenda.'); return; }
      if (!r.libre || !r.slots?.length) { setSlots([]); setMotivo(r.motivo || 'Sin horarios libres este día.'); return; }
      setSlots(r.slots);
    } catch { if (n === consulta.current) { setSlots([]); setMotivo('No se pudo consultar la agenda.'); } }
  };

  const textoCita = diaSel && slot
    ? (() => { const s = DIAS_L[diaSel.getDay()] + ' ' + diaSel.getDate() + ' de ' + MESES[diaSel.getMonth()] + ' · ' + slot.horaAmPm; return s.charAt(0).toUpperCase() + s.slice(1); })()
    : '';

  const agendar = async () => {
    if (!slot || !modalidad) return;
    setEnviando(true); setError('');
    try {
      const r = await llamarCRM(credential, 'agendar', {
        idLead: lead.idLead, nombre: f.nombre.trim(), celular: f.celular.trim(), correo: f.correo.trim(),
        servicio: f.servicio, direccion: f.direccion.trim(), notas: f.notas.trim(),
        timestamp: slot.timestamp, textoCita, modalidad,
      });
      if (r.success) {
        if (r.lead) onListo(r.lead);
        setListo(textoCita + '. Le llegó el correo a ' + f.correo.trim() + ' y quedó en tu calendario.');
      } else setError(r.message || r.error || 'No se pudo agendar.');
    } catch { setError('Error de red al agendar.'); }
    finally { setEnviando(false); }
  };

  const campo = 'mt-1 w-full h-11 rounded-xl bg-stone-950 border border-stone-700 px-3 text-sm text-white focus:outline-none focus:border-brand-gold';
  const etiquetaModo = modalidad === 'VIRTUAL' ? 'Presentación virtual · Google Meet' : 'Captación presencial';

  let pie: React.ReactNode = undefined;
  if (!listo && modalidad) {
    pie = (
      <div className="flex flex-col gap-2">
        {error && <div className="text-sm text-red-300">{error}</div>}
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => (paso === 1 ? setModalidad(null) : setPaso(paso - 1))}
            className="min-h-[48px] rounded-xl border border-stone-700 text-stone-200 hover:border-stone-500">Atrás</button>
          {paso < 3
            ? <button onClick={() => setPaso(paso + 1)} disabled={paso === 1 ? !paso1Ok : !slot}
                className="min-h-[48px] rounded-xl bg-brand-gold text-stone-950 font-bold disabled:opacity-40">Siguiente</button>
            : <button onClick={agendar} disabled={enviando}
                className="min-h-[48px] rounded-xl bg-brand-gold text-stone-950 font-bold disabled:opacity-40 flex items-center justify-center gap-2">
                {enviando && <Loader2 className="w-4 h-4 animate-spin" />}{enviando ? 'Agendando…' : 'Agendar cita'}
              </button>}
        </div>
      </div>
    );
  }

  return (
    <Marco titulo="Agendar presentación" sub={modalidad ? `${etiquetaModo} · Paso ${paso} de 3` : `${lead.nombre || 'Propietario'} · ${lead.idLead}`} onCerrar={onCerrar} pie={pie}>
      {listo ? <Listo texto={listo} onCerrar={onCerrar} /> : !modalidad ? (
        <div className="flex flex-col gap-3">
          <div className="text-sm text-stone-400">¿Cómo será la presentación?</div>
          <button onClick={() => { setModalidad('VIRTUAL'); setPaso(1); }}
            className="min-h-[76px] rounded-2xl border border-stone-700 bg-stone-950/40 p-4 text-left hover:border-brand-gold flex items-center gap-3">
            <Video className="w-6 h-6 text-brand-gold-light shrink-0" />
            <div><div className="font-semibold text-white">Presentación virtual</div><div className="text-xs text-stone-400">Por Google Meet: el link llega en el correo.</div></div>
          </button>
          <button onClick={() => { setModalidad('PRESENCIAL'); setPaso(1); }}
            className="min-h-[76px] rounded-2xl border border-stone-700 bg-stone-950/40 p-4 text-left hover:border-brand-gold flex items-center gap-3">
            <MapPin className="w-6 h-6 text-brand-gold-light shrink-0" />
            <div><div className="font-semibold text-white">Captación presencial</div><div className="text-xs text-stone-400">Visitas y evalúas el inmueble en persona.</div></div>
          </button>
        </div>
      ) : paso === 1 ? (
        <div className="grid gap-3">
          <div><label htmlFor="ag-nombre" className="text-xs text-stone-400">Nombre</label><input id="ag-nombre" className={campo} value={f.nombre} onChange={cambiar('nombre')} /></div>
          <div><label htmlFor="ag-celular" className="text-xs text-stone-400">Celular</label><input id="ag-celular" className={campo} value={f.celular} onChange={cambiar('celular')} inputMode="tel" /></div>
          <div>
            <label htmlFor="ag-correo" className="text-xs text-stone-400">Correo del propietario</label>
            <input id="ag-correo" type="email" className={campo} value={f.correo} onChange={cambiar('correo')} placeholder="Pídelo en la llamada" />
            {f.correo && !correoOk && <div className="text-xs text-red-300 mt-1">Revisa el correo.</div>}
          </div>
          <div>
            <label htmlFor="ag-servicio" className="text-xs text-stone-400">Servicio</label>
            <select id="ag-servicio" className={campo} value={f.servicio} onChange={cambiar('servicio')}>
              {SERVICIOS.map(s => <option key={s.v} value={s.v}>{s.t}</option>)}
            </select>
          </div>
          <div><label htmlFor="ag-dir" className="text-xs text-stone-400">Dirección del inmueble</label><input id="ag-dir" className={campo} value={f.direccion} onChange={cambiar('direccion')} /></div>
        </div>
      ) : paso === 2 ? (
        <div className="flex flex-col gap-3">
          <div className="text-xs text-stone-400">Día</div>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {dias.map((d, i) => (
              <button key={i} onClick={() => elegirDia(d)}
                className={`shrink-0 w-14 py-1.5 rounded-xl border text-center ${diaSel && iso(diaSel) === iso(d) ? 'border-brand-gold bg-brand-gold/15 text-white' : 'border-stone-700 bg-stone-950/40 text-stone-300'}`}>
                <div className="text-[10px] uppercase">{DIAS[d.getDay()]}</div>
                <div className="font-bold">{d.getDate()}</div>
                <div className="text-[10px] text-stone-500">{MESES[d.getMonth()].slice(0, 3)}</div>
              </button>
            ))}
          </div>
          <div className="text-xs text-stone-400">Hora</div>
          {!diaSel ? <div className="text-sm text-stone-500">Elige un día para ver los horarios libres.</div>
            : slots === null ? <div className="text-sm text-stone-400 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Buscando horarios…</div>
            : slots.length === 0 ? <div className="text-sm text-stone-400">{motivo}</div>
            : <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
                {slots.map(s => (
                  <button key={s.timestamp} onClick={() => setSlot(s)}
                    className={`min-h-[42px] rounded-xl border text-sm ${slot?.timestamp === s.timestamp ? 'border-brand-gold bg-brand-gold/15 text-white' : 'border-stone-700 bg-stone-950/40 text-stone-300'}`}>{s.horaAmPm}</button>
                ))}
              </div>}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="rounded-2xl bg-stone-950/50 border border-stone-800 p-4 text-sm">
            <div className="text-[11px] uppercase tracking-[0.12em] text-brand-gold-light mb-1">{etiquetaModo}</div>
            <div className="text-white font-semibold">{textoCita}</div>
            <div className="text-stone-400">{f.nombre} · {SERVICIOS.find(s => s.v === f.servicio)?.t}</div>
            {f.direccion && <div className="text-stone-400">{f.direccion}</div>}
          </div>
          <div>
            <label htmlFor="ag-notas" className="text-xs text-stone-400">Notas para la cita</label>
            <textarea id="ag-notas" rows={4} value={f.notas} onChange={cambiar('notas')}
              className="mt-1 w-full rounded-xl bg-stone-950 border border-stone-700 p-3 text-sm text-white resize-none focus:outline-none focus:border-brand-gold" />
          </div>
          <button onClick={() => setPaso(2)} className="self-start text-xs text-stone-400 hover:text-white flex items-center gap-1"><ChevronLeft className="w-3 h-3" />Cambiar día u hora</button>
        </div>
      )}
    </Marco>
  );
}
