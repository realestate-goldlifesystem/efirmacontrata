import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft, CalendarCheck, MapPin, User, Mail, Send, Clock, Loader2, CheckCircle2,
  ChevronLeft, ChevronRight, Check, Sun, Sunset, CalendarDays, Pencil,
} from 'lucide-react';
import PhoneCountrySelector, { ALL_COUNTRIES } from './PhoneCountrySelector';

const API_URL = 'https://script.google.com/macros/s/AKfycbxpJ8w_XR5dUhIv1VTuV3ZDjHm-vtz13B5RlyfiLqI9ypZnIuzuUL39_GDHpBisL2oW/exec';

interface ScheduleVisitFormProps {
  onBack: () => void;
}

interface TimeSlot {
  horaString: string;
  horaAmPm: string;
  timestamp: number;
}

type Paso = 1 | 2 | 3;

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const DIAS_CORTOS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const DIAS_LARGOS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

const SERVICIOS = [
  { valor: 'Venta', texto: 'Venta (Corretaje Inmobiliario)' },
  { valor: 'Arriendo', texto: 'Arriendo (Corretaje Inmobiliario)' },
  { valor: 'Administración', texto: 'Administración Integral de Inmuebles' },
  { valor: 'Vendi-Renta', texto: 'Vendi-Renta (Doble promoción)' },
  { valor: 'Admi-Venta', texto: 'Admi-Venta (Administración con opción de venta)' },
];

const PASOS: { n: Paso; titulo: string; sub: string }[] = [
  { n: 1, titulo: 'Fecha', sub: 'Elige el día' },
  { n: 2, titulo: 'Hora', sub: 'Elige el horario' },
  { n: 3, titulo: 'Tus datos', sub: 'Para confirmarte' },
];

const isoDe = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const fechaLarga = (d: Date) => `${DIAS_LARGOS[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()]}`;
const capital = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

/**
 * Fondo y marco de la página. Va FUERA del formulario: si se definiera dentro,
 * React lo trataría como un componente nuevo en cada tecla y los campos
 * perderían lo escrito y el foco.
 */
function Marco({ onBack, children }: { onBack: () => void; children: React.ReactNode }) {
  return (
    // Empieza debajo de la barra de navegación, que queda sobre su franja clara
    <div className="min-h-[calc(100vh-6rem)] bg-stone-950 relative overflow-hidden pt-16 pb-16 px-4 sm:px-6">
      {/* Luz dorada muy tenue y retícula fina: profundidad sin ruido */}
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-brand-gold/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute inset-0 opacity-[0.04] pointer-events-none [background-image:linear-gradient(to_right,white_1px,transparent_1px),linear-gradient(to_bottom,white_1px,transparent_1px)] [background-size:56px_56px]" />
      <button
        onClick={onBack}
        className="fixed top-24 left-4 sm:left-8 z-50 inline-flex items-center gap-2 bg-stone-900/80 backdrop-blur border border-stone-700 text-stone-200 hover:text-white hover:border-brand-gold/60 px-4 py-2 rounded-full transition-all text-sm font-medium"
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="hidden sm:inline">Volver al inicio</span>
        <span className="sm:hidden">Volver</span>
      </button>
      <div className="relative z-10 max-w-5xl mx-auto">{children}</div>
    </div>
  );
}

/**
 * Agendar visita, como asistente de 3 pasos: fecha (calendario propio) → hora →
 * datos. Cada paso aparece cuando se completa el anterior; los pasos hechos se
 * pueden tocar para volver. Estética de inmobiliaria premium: grafito, blanco y
 * el dorado de la marca solo en lo activo.
 */
export default function ScheduleVisitForm({ onBack }: ScheduleVisitFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    countryCode: 'CO',
    phone: '',
    email: '',
    address: '',
    serviceType: 'Venta',
    detalles: '',
  });

  const [paso, setPaso] = useState<Paso>(1);
  const [fecha, setFecha] = useState<Date | null>(null);
  const [mesVisible, setMesVisible] = useState(() => { const h = new Date(); return new Date(h.getFullYear(), h.getMonth(), 1); });
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [slotMessage, setSlotMessage] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // La agenda pide 12 h de anticipación: el primer día posible es mañana.
  const manana = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + 1); return d; }, []);
  const mesMinimo = new Date(manana.getFullYear(), manana.getMonth(), 1);
  // Se ofrecen los próximos 3 meses
  const mesMaximo = new Date(manana.getFullYear(), manana.getMonth() + 3, 1);

  const celdas = useMemo(() => {
    const primero = new Date(mesVisible.getFullYear(), mesVisible.getMonth(), 1);
    const desfase = (primero.getDay() + 6) % 7;
    const dias: (Date | null)[] = Array.from({ length: desfase }, () => null);
    const total = new Date(mesVisible.getFullYear(), mesVisible.getMonth() + 1, 0).getDate();
    for (let d = 1; d <= total; d++) dias.push(new Date(mesVisible.getFullYear(), mesVisible.getMonth(), d));
    return dias;
  }, [mesVisible]);

  // Domingos y días pasados no se pueden elegir. Festivos y días llenos los
  // dice el servidor en el paso 2.
  const diaDisponible = (d: Date) => d.getTime() >= manana.getTime() && d.getDay() !== 0;

  useEffect(() => {
    if (!fecha) return;
    let vigente = true;
    (async () => {
      setIsLoadingSlots(true);
      setAvailableSlots([]);
      setSelectedSlot(null);
      setSlotMessage('');
      try {
        const response = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ accion: 'obtenerDisponibilidad', fecha: `${isoDe(fecha)}T08:00:00` }),
        });
        const data = await response.json();
        if (!vigente) return;
        if (data.success) {
          if (data.libre && data.slots.length > 0) setAvailableSlots(data.slots);
          else setSlotMessage(data.motivo || 'No hay horarios disponibles para esta fecha.');
        } else {
          setSlotMessage('No pudimos consultar la disponibilidad. Intenta de nuevo.');
        }
      } catch {
        if (vigente) setSlotMessage('Error de red al conectar con el servidor.');
      } finally {
        if (vigente) setIsLoadingSlots(false);
      }
    })();
    return () => { vigente = false; };
  }, [fecha]);

  const elegirDia = (d: Date) => {
    setFecha(d);
    setPaso(2);
  };

  const elegirHora = (s: TimeSlot) => {
    setSelectedSlot(s);
    setPaso(3);
  };

  const irAPaso = (n: Paso) => {
    if (n === 1 || (n === 2 && fecha) || (n === 3 && selectedSlot)) setPaso(n);
  };

  const manananaTarde = useMemo(() => ({
    manana: availableSlots.filter(s => new Date(s.timestamp).getHours() < 12),
    tarde: availableSlots.filter(s => new Date(s.timestamp).getHours() >= 12),
  }), [availableSlots]);

  const largoTel = ALL_COUNTRIES.find(c => c.code === formData.countryCode)?.maxLength || 10;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    if (!selectedSlot) { setPaso(2); return; }
    if (formData.phone.length !== largoTel) {
      setErrorMessage(`El celular debe tener ${largoTel} dígitos.`);
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          accion: 'agendarCita',
          nombreCliente: formData.name,
          // Se guarda con el indicativo (+57), no con la sigla del país (CO)
          celular: `${ALL_COUNTRIES.find(c => c.code === formData.countryCode)?.prefix || '+57'} ${formData.phone}`,
          correo: formData.email,
          tipoServicio: formData.serviceType,
          direccion: formData.address,
          detalles: formData.detalles,
          fechaTimestamp: selectedSlot.timestamp,
        }),
      });
      const data = await response.json();
      if (data.success) {
        setIsSuccess(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        setErrorMessage(data.error || 'Ocurrió un error al agendar la cita. Por favor intenta más tarde.');
        // Si alguien tomó el horario mientras llenaba los datos, vuelve a elegir hora
        if (/ocupado/i.test(data.error || '') && fecha) { setFecha(new Date(fecha)); setPaso(2); }
      }
    } catch {
      setErrorMessage('Error de red. No pudimos conectar con el servidor de agendamiento.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const entrada = 'w-full bg-white border border-stone-200 rounded-xl px-4 py-3 text-sm text-stone-900 placeholder:text-stone-400 outline-none transition-all focus:border-stone-900 focus:ring-4 focus:ring-stone-900/5';
  const rotulo = 'text-[11px] font-semibold tracking-[0.14em] uppercase text-stone-500 block mb-2';

  if (isSuccess && selectedSlot && fecha) {
    return (
      <Marco onBack={onBack}>
        <div className="max-w-lg mx-auto bg-white rounded-[28px] shadow-2xl shadow-black/40 p-8 sm:p-10 text-center animate-fade-in">
          <div className="w-16 h-16 rounded-full bg-stone-950 flex items-center justify-center mx-auto mb-6 ring-8 ring-brand-gold/15">
            <CheckCircle2 className="w-8 h-8 text-brand-gold" />
          </div>
          {/* No decir "confirmada": queda PENDIENTE hasta que el propietario pulse
              Confirmar en el correo, y si no lo hace se libera 2 h antes. */}
          <h2 className="text-3xl font-semibold text-stone-950 tracking-tight mb-2">¡Cita agendada!</h2>
          <p className="text-stone-500 mb-6">Te esperamos, {formData.name.split(' ')[0]}.</p>
          <div className="rounded-2xl border border-stone-200 bg-stone-50 px-5 py-4 mb-6 text-left">
            <p className="text-sm text-stone-500">Tu visita</p>
            <p className="text-lg font-semibold text-stone-950">{capital(fechaLarga(fecha))}</p>
            <p className="text-stone-700">{selectedSlot.horaAmPm} · {formData.serviceType}</p>
          </div>
          <p className="text-sm text-stone-600 mb-8 leading-relaxed">
            Te enviamos un correo a <strong className="text-stone-900">{formData.email}</strong>.
            <strong className="text-stone-900"> Confirma tu asistencia desde ahí</strong>; también puedes cambiar la fecha o cancelar desde el mismo correo.
          </p>
          <button onClick={onBack}
            className="w-full bg-stone-950 hover:bg-stone-800 text-white font-semibold py-4 rounded-xl transition-all active:scale-[0.98]">
            Volver al inicio
          </button>
        </div>
      </Marco>
    );
  }

  return (
    <Marco onBack={onBack}>
      <div className="grid md:grid-cols-[300px_minmax(0,1fr)] rounded-[28px] overflow-hidden shadow-2xl shadow-black/50 ring-1 ring-white/10">

        {/* ===== Lateral: marca, pasos y resumen ===== */}
        <aside className="bg-stone-900 text-white p-6 sm:p-8 flex flex-col gap-8">
          <div>
            <div className="w-12 h-12 rounded-2xl bg-brand-gold/10 ring-1 ring-brand-gold/30 flex items-center justify-center mb-5">
              <CalendarCheck className="w-6 h-6 text-brand-gold" />
            </div>
            <p className="text-[11px] tracking-[0.2em] uppercase text-brand-gold mb-2">Gold Life Real Estate</p>
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">Agenda tu visita</h2>
            <p className="text-stone-400 text-sm mt-2 leading-relaxed">
              Un asesor evaluará tu inmueble en persona y te presentará la mejor estrategia.
            </p>
          </div>

          {/* Pasos: en celular en fila, en PC en columna */}
          <ol className="flex md:flex-col gap-2 md:gap-1">
            {PASOS.map(p => {
              const hecho = p.n < paso;
              const actual = p.n === paso;
              const tocable = p.n === 1 || (p.n === 2 && !!fecha) || (p.n === 3 && !!selectedSlot);
              return (
                <li key={p.n} className="flex-1 md:flex-none">
                  <button type="button" onClick={() => irAPaso(p.n)} disabled={!tocable}
                    className={`w-full flex items-center gap-3 rounded-2xl p-2 md:p-3 text-left transition-all ${actual ? 'bg-white/5' : tocable ? 'hover:bg-white/5' : 'opacity-50 cursor-default'}`}>
                    <span className={`w-9 h-9 shrink-0 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                      hecho ? 'bg-brand-gold text-stone-950' : actual ? 'bg-white text-stone-950 ring-4 ring-brand-gold/30' : 'border border-stone-600 text-stone-400'}`}>
                      {hecho ? <Check className="w-4 h-4" /> : p.n}
                    </span>
                    <span className="hidden sm:block">
                      <span className={`block text-sm font-medium ${actual ? 'text-white' : 'text-stone-300'}`}>{p.titulo}</span>
                      <span className="block text-xs text-stone-500">
                        {p.n === 1 && fecha ? capital(fechaLarga(fecha)) : p.n === 2 && selectedSlot ? selectedSlot.horaAmPm : p.sub}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>

          <p className="hidden md:block mt-auto text-xs text-stone-500 leading-relaxed">
            Lunes a viernes de 8:00 a. m. a 6:00 p. m. · Sábados de 8:00 a. m. a 1:00 p. m.
          </p>
        </aside>

        {/* ===== Contenido del paso ===== */}
        <section className="bg-white p-6 sm:p-10 min-h-[520px]">
          {paso === 1 && (
            <div key="p1" className="animate-fade-in">
              <p className={rotulo}>Paso 1 de 3</p>
              <h3 className="text-2xl font-semibold text-stone-950 tracking-tight mb-6">¿Qué día te queda bien?</h3>

              <div className="max-w-md">
                <div className="flex items-center justify-between mb-4">
                  <button type="button" aria-label="Mes anterior"
                    disabled={mesVisible <= mesMinimo}
                    onClick={() => setMesVisible(new Date(mesVisible.getFullYear(), mesVisible.getMonth() - 1, 1))}
                    className="w-10 h-10 rounded-full border border-stone-200 flex items-center justify-center text-stone-700 hover:border-stone-900 disabled:opacity-30 disabled:hover:border-stone-200 transition-all">
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <p className="text-lg font-semibold text-stone-950 capitalize">{MESES[mesVisible.getMonth()]} {mesVisible.getFullYear()}</p>
                  <button type="button" aria-label="Mes siguiente"
                    disabled={mesVisible >= mesMaximo}
                    onClick={() => setMesVisible(new Date(mesVisible.getFullYear(), mesVisible.getMonth() + 1, 1))}
                    className="w-10 h-10 rounded-full border border-stone-200 flex items-center justify-center text-stone-700 hover:border-stone-900 disabled:opacity-30 disabled:hover:border-stone-200 transition-all">
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>

                <div className="grid grid-cols-7 gap-1 mb-2">
                  {DIAS_CORTOS.map((d, i) => (
                    <div key={i} className="text-center text-[11px] font-semibold tracking-wider text-stone-400 py-1">{d}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {celdas.map((d, i) => {
                    if (!d) return <div key={`v${i}`} />;
                    const ok = diaDisponible(d);
                    const elegido = !!fecha && isoDe(d) === isoDe(fecha);
                    return (
                      <button key={isoDe(d)} type="button" disabled={!ok} onClick={() => elegirDia(d)}
                        className={`aspect-square rounded-xl text-sm font-medium transition-all ${
                          elegido ? 'bg-stone-950 text-white ring-2 ring-brand-gold ring-offset-2'
                          : ok ? 'text-stone-900 hover:bg-stone-100 hover:ring-1 hover:ring-stone-300'
                          : 'text-stone-300 cursor-not-allowed line-through decoration-stone-200'}`}>
                        {d.getDate()}
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-stone-400 mt-4">Los domingos no hay visitas. Si un día es festivo o está lleno, te lo diremos en el siguiente paso.</p>
              </div>
            </div>
          )}

          {paso === 2 && fecha && (
            <div key="p2" className="animate-fade-in">
              <p className={rotulo}>Paso 2 de 3</p>
              <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
                <h3 className="text-2xl font-semibold text-stone-950 tracking-tight">Elige la hora</h3>
                <button type="button" onClick={() => setPaso(1)}
                  className="inline-flex items-center gap-2 text-sm text-stone-600 hover:text-stone-950 border border-stone-200 hover:border-stone-900 rounded-full px-3 py-1.5 transition-all">
                  <CalendarDays className="w-4 h-4" /> {capital(fechaLarga(fecha))} <Pencil className="w-3.5 h-3.5" />
                </button>
              </div>

              {isLoadingSlots ? (
                <div className="flex items-center gap-3 text-stone-500 py-16 justify-center">
                  <Loader2 className="w-5 h-5 animate-spin" /> Buscando horarios libres...
                </div>
              ) : slotMessage ? (
                <div className="rounded-2xl border border-stone-200 bg-stone-50 p-6 text-center">
                  <p className="text-stone-700 mb-4">{slotMessage}</p>
                  <button type="button" onClick={() => setPaso(1)}
                    className="bg-stone-950 hover:bg-stone-800 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-all">
                    Elegir otro día
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {([['Mañana', Sun, manananaTarde.manana], ['Tarde', Sunset, manananaTarde.tarde]] as const).map(([titulo, Icono, lista]) =>
                    lista.length > 0 && (
                      <div key={titulo}>
                        <p className="flex items-center gap-2 text-sm font-medium text-stone-500 mb-3"><Icono className="w-4 h-4" /> {titulo}</p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {lista.map(s => {
                            const elegido = selectedSlot?.timestamp === s.timestamp;
                            return (
                              <button key={s.timestamp} type="button" onClick={() => elegirHora(s)}
                                className={`py-3 rounded-xl text-sm font-semibold border transition-all ${
                                  elegido ? 'bg-stone-950 text-white border-stone-950 ring-2 ring-brand-gold ring-offset-2'
                                  : 'bg-white text-stone-800 border-stone-200 hover:border-stone-900'}`}>
                                {s.horaAmPm}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}

          {paso === 3 && fecha && selectedSlot && (
            <form key="p3" onSubmit={handleSubmit} className="animate-fade-in">
              <p className={rotulo}>Paso 3 de 3</p>
              <h3 className="text-2xl font-semibold text-stone-950 tracking-tight mb-5">Tus datos</h3>

              {/* Resumen de la cita */}
              <div className="flex items-center justify-between gap-3 rounded-2xl bg-stone-950 text-white px-5 py-4 mb-7">
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-brand-gold shrink-0" />
                  <div>
                    <p className="font-semibold">{capital(fechaLarga(fecha))}</p>
                    <p className="text-sm text-stone-400">{selectedSlot.horaAmPm} · duración aproximada 1 hora</p>
                  </div>
                </div>
                <button type="button" onClick={() => setPaso(2)} className="text-sm text-brand-gold hover:text-white transition-colors">Cambiar</button>
              </div>

              <div className="space-y-5">
                <div>
                  <label className={rotulo}>Nombres y apellidos</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                    <input type="text" required value={formData.name} placeholder="Juan Pérez"
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      className={`${entrada} pl-11`} />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className={rotulo}>Celular</label>
                    <div className="flex bg-white border border-stone-200 rounded-xl transition-all focus-within:border-stone-900 focus-within:ring-4 focus-within:ring-stone-900/5">
                      <PhoneCountrySelector value={formData.countryCode}
                        onChange={code => setFormData({ ...formData, countryCode: code, phone: formData.phone.slice(0, ALL_COUNTRIES.find(c => c.code === code)?.maxLength || 10) })} />
                      <input type="tel" inputMode="numeric" required value={formData.phone} placeholder="Número" maxLength={largoTel}
                        onChange={e => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '').slice(0, largoTel) })}
                        className="w-full bg-transparent py-3 px-3 text-sm font-mono text-stone-900 outline-none" />
                    </div>
                  </div>
                  <div>
                    <label className={rotulo}>Correo electrónico</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                      <input type="email" required value={formData.email} placeholder="correo@ejemplo.com"
                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                        className={`${entrada} pl-11`} />
                    </div>
                  </div>
                </div>

                <div>
                  <label className={rotulo}>Servicio de interés</label>
                  <select value={formData.serviceType} onChange={e => setFormData({ ...formData, serviceType: e.target.value })}
                    className={`${entrada} cursor-pointer`}>
                    {SERVICIOS.map(s => <option key={s.valor} value={s.valor}>{s.texto}</option>)}
                  </select>
                </div>

                <div>
                  <label className={rotulo}>Dirección o barrio <span className="normal-case tracking-normal font-normal text-stone-400">(opcional)</span></label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                    <input type="text" value={formData.address} placeholder="Ej. Barrio Chicó, Carrera 11..."
                      onChange={e => setFormData({ ...formData, address: e.target.value })}
                      className={`${entrada} pl-11`} />
                  </div>
                </div>

                <div>
                  <label className={rotulo}>Notas <span className="normal-case tracking-normal font-normal text-stone-400">(opcional)</span></label>
                  <textarea value={formData.detalles} placeholder="Ej. Favor tocar el timbre 2..."
                    onChange={e => setFormData({ ...formData, detalles: e.target.value })}
                    className={`${entrada} resize-none h-24`} />
                </div>
              </div>

              {errorMessage && (
                <div className="mt-5 p-4 bg-red-50 text-red-700 text-sm rounded-xl border border-red-100">{errorMessage}</div>
              )}

              <button type="submit" disabled={isSubmitting}
                className="mt-7 w-full flex items-center justify-center gap-2 py-4 rounded-xl font-semibold text-sm transition-all bg-stone-950 hover:bg-stone-800 text-white active:scale-[0.98] disabled:opacity-60 disabled:cursor-wait">
                {isSubmitting
                  ? <><Loader2 className="w-5 h-5 animate-spin" /> Agendando tu cita...</>
                  : <>Confirmar cita <Send className="w-4 h-4 text-brand-gold" /></>}
              </button>
            </form>
          )}
        </section>
      </div>
    </Marco>
  );
}
