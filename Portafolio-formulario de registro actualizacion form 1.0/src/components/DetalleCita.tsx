import { useEffect, useState } from 'react';
import {
  X, Phone, MessageCircle, Mail, MapPin, Clock, Home, StickyNote, History, Pencil,
  CalendarClock, Ban, UserCheck, UserX, Save, Loader2, Users, KeyRound, DoorOpen,
} from 'lucide-react';
import { API_URL, GRUPOS, TIPOS, grupoDe, tipoDe, internacional, type Cita, type TipoAgenda } from './CitasAgendaPanel';

// Quién es la persona de la cita, según el tipo de agenda
const PERSONA_TIPO: Record<TipoAgenda, string> = {
  PROPIETARIO: 'Propietario', INTERESADO: 'Interesado', ENTREGA: 'Inquilino', DEVOLUCION: 'Inquilino',
};

const ICONO_TIPO: Record<TipoAgenda, typeof Home> = {
  PROPIETARIO: Home, INTERESADO: Users, ENTREGA: KeyRound, DEVOLUCION: DoorOpen,
};

/** Llama al backend con la sesión del agente. */
async function llamar(cuerpo: Record<string, unknown>) {
  const r = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(cuerpo),
  });
  return r.json();
}

const hoyIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/**
 * Ventana de una cita. Además de los datos y los atajos de contacto, el agente
 * la gestiona desde aquí: reagendar a un horario libre, cancelar con motivo,
 * marcar asistencia y guardar notas. Reagendar y cancelar le avisan al
 * propietario por correo (lo hace el servidor, GESTION_CITAS_PANEL.js).
 */
export default function DetalleCita({ cita, agentCredential, onCerrar, onCambio }: {
  cita: Cita; agentCredential: string | null; onCerrar: () => void; onCambio: () => void;
}) {
  const grupo = grupoDe(cita.estado);
  const tipo = TIPOS[tipoDe(cita)];
  const IconoTipo = ICONO_TIPO[tipoDe(cita)];
  const cerrada = grupo === 'cancelada' || grupo === 'asistio' || grupo === 'noasistio' || grupo === 'sinrespuesta';
  const yaEmpezo = cita.timestamp <= Date.now();
  const [modo, setModo] = useState<null | 'reagendar' | 'cancelar' | 'editar'>(null);
  const [campos, setCampos] = useState({
    nombre: cita.nombre, celular: cita.celular, correo: cita.correo, servicio: cita.servicio, direccion: cita.direccion,
  });
  const [fecha, setFecha] = useState(hoyIso());
  const [slots, setSlots] = useState<{ timestamp: number; horaAmPm: string }[] | null>(null);
  const [motivoSlots, setMotivoSlots] = useState('');
  const [slotSel, setSlotSel] = useState<number | null>(null);
  const [motivo, setMotivo] = useState('');
  const [notas, setNotas] = useState(cita.notasAgente || '');
  const [notasGuardadas, setNotasGuardadas] = useState(cita.notasAgente || '');
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null);

  useEffect(() => {
    if (modo !== 'reagendar') return;
    let vigente = true;
    setSlots(null); setSlotSel(null); setMotivoSlots('');
    llamar({ accion: 'disponibilidadReagendar', credential: agentCredential, idCita: cita.idCita, fecha })
      .then(d => {
        if (!vigente) return;
        if (d.success) { setSlots(d.slots || []); setMotivoSlots(d.libre ? '' : d.motivo || 'Sin horarios disponibles.'); }
        else { setSlots([]); setMotivoSlots(d.message || d.error || 'No se pudo consultar la disponibilidad.'); }
      })
      .catch(() => { if (vigente) { setSlots([]); setMotivoSlots('Error de red.'); } });
    return () => { vigente = false; };
  }, [modo, fecha, cita.idCita, agentCredential]);

  const ejecutar = async (cuerpo: Record<string, unknown>, recargar = true) => {
    setEnviando(true); setAviso(null);
    try {
      const d = await llamar({ accion: 'gestionarCita', credential: agentCredential, idCita: cita.idCita, ...cuerpo });
      if (d.success) {
        setAviso({ ok: true, texto: d.mensaje || 'Listo.' });
        if (cuerpo.tipo === 'notas') setNotasGuardadas(String(cuerpo.texto || ''));
        if (recargar) setTimeout(onCambio, 1600);
      } else setAviso({ ok: false, texto: d.message || 'No se pudo aplicar el cambio.' });
    } catch {
      setAviso({ ok: false, texto: 'Error de red al conectar con el servidor.' });
    } finally {
      setEnviando(false);
    }
  };

  const boton = 'flex items-center justify-center gap-2 py-3 rounded-xl font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed';

  return (
    <div className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4" onClick={onCerrar}>
      <div
        className="relative w-full md:max-w-lg bg-stone-900 border border-stone-800 rounded-t-3xl md:rounded-3xl p-6 pt-7 max-h-[90vh] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Franja del color del tipo de agenda */}
        <div className={`absolute top-0 left-0 right-0 h-1.5 ${tipo.franja}`} aria-hidden="true" />

        {/* Estado a la izquierda, tipo de cita al centro, cerrar a la derecha */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 mb-3">
          <span className={`justify-self-start text-xs px-2.5 py-1 rounded-full border ${GRUPOS[grupo].chip}`}>
            {GRUPOS[grupo].etiqueta}
          </span>
          <span className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full shadow-sm ${tipo.solido}`}>
            <IconoTipo className="w-3.5 h-3.5" /> {tipo.etiqueta}
          </span>
          <button onClick={onCerrar} className="justify-self-end p-2 rounded-full bg-stone-800 text-stone-400 hover:text-white" aria-label="Cerrar">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="mb-4">
          <p className="text-[11px] uppercase tracking-[0.16em] text-stone-500">{PERSONA_TIPO[tipoDe(cita)]}</p>
          <h3 className="text-2xl text-white font-semibold">{cita.nombre}</h3>
          <p className="text-stone-500 text-xs mt-1">{cita.idCita}</p>
        </div>

        <div className="space-y-3 text-stone-300 text-sm">
          <p className="flex items-center gap-2"><Clock className="w-4 h-4 text-brand-gold" /> {cita.fecha} · {cita.hora}</p>
          <p className="flex items-center gap-2"><Home className="w-4 h-4 text-brand-gold" /> {cita.servicio || '—'}</p>
          <p className="flex items-start gap-2"><MapPin className="w-4 h-4 text-brand-gold mt-0.5" /> {cita.direccion || 'Sin dirección'}</p>
          {cita.notas && <p className="flex items-start gap-2"><StickyNote className="w-4 h-4 text-brand-gold mt-0.5" /> {cita.notas}</p>}
          {cita.ultimoCambio && <p className="flex items-start gap-2 text-stone-500"><History className="w-4 h-4 mt-0.5" /> {cita.ultimoCambio}</p>}
        </div>

        <div className="grid grid-cols-2 gap-2 mt-6">
          {cita.celular && (
            <a href={`https://wa.me/${internacional(cita.celular)}`} target="_blank" rel="noreferrer"
               className={`${boton} bg-emerald-600 hover:bg-emerald-500 text-white`}>
              <MessageCircle className="w-4 h-4" /> WhatsApp
            </a>
          )}
          {cita.celular && (
            <a href={`tel:+${internacional(cita.celular)}`} className={`${boton} bg-stone-800 hover:bg-stone-700 text-white`}>
              <Phone className="w-4 h-4" /> Llamar
            </a>
          )}
          {cita.correo && (
            <a href={`mailto:${cita.correo}`} className={`${boton} bg-stone-800 hover:bg-stone-700 text-white`}>
              <Mail className="w-4 h-4" /> Correo
            </a>
          )}
          <button
            onClick={() => setModo(modo === 'editar' ? null : 'editar')}
            className={`${boton} border border-brand-gold/50 ${modo === 'editar' ? 'bg-brand-gold text-stone-950' : 'text-brand-gold hover:bg-brand-gold/10'}`}
          >
            <Pencil className="w-4 h-4" /> Editar
          </button>
        </div>

        {modo === 'editar' && (
          <div className="mt-4 p-4 rounded-2xl border border-stone-800 bg-stone-950/50 space-y-3">
            {([
              ['nombre', 'Nombre', 'text'], ['celular', 'Celular', 'tel'], ['correo', 'Correo', 'email'],
              ['servicio', 'Servicio', 'text'], ['direccion', 'Dirección del inmueble', 'text'],
            ] as const).map(([k, etiqueta, tipo]) => (
              <label key={k} className="block text-sm text-stone-300">
                {etiqueta}
                <input type={tipo} value={campos[k]} onChange={e => setCampos({ ...campos, [k]: e.target.value })}
                  className="mt-1 w-full rounded-xl bg-stone-900 border border-stone-700 px-3 py-2 text-white" />
              </label>
            ))}
            <button disabled={enviando || !campos.nombre.trim()} onClick={() => ejecutar({ tipo: 'editar', campos })}
              className={`${boton} w-full bg-brand-gold text-stone-950 hover:brightness-110`}>
              {enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Guardar cambios
            </button>
            <p className="text-xs text-stone-500">Actualiza la hoja y el evento de tu Calendar. Para cambiar la fecha o la hora usa "Reagendar".</p>
          </div>
        )}

        {/* Gestión de la cita */}
        <div className="mt-6 pt-5 border-t border-stone-800">
          <p className="text-[11px] uppercase tracking-[0.16em] text-stone-500 mb-3">Gestionar la cita</p>
          <div className="grid grid-cols-2 gap-2">
            <button disabled={enviando || grupo === 'asistio'} onClick={() => setModo(modo === 'reagendar' ? null : 'reagendar')}
              className={`${boton} ${modo === 'reagendar' ? 'bg-brand-gold text-stone-950' : 'bg-stone-800 hover:bg-stone-700 text-white'}`}>
              <CalendarClock className="w-4 h-4" /> Reagendar
            </button>
            <button disabled={enviando || cerrada} onClick={() => setModo(modo === 'cancelar' ? null : 'cancelar')}
              className={`${boton} ${modo === 'cancelar' ? 'bg-red-600 text-white' : 'bg-stone-800 hover:bg-stone-700 text-red-300'}`}>
              <Ban className="w-4 h-4" /> Cancelar
            </button>
            <button disabled={enviando || !yaEmpezo || grupo === 'cancelada' || grupo === 'asistio'} onClick={() => ejecutar({ tipo: 'asistio' })}
              title={yaEmpezo ? '' : 'Se marca cuando la cita ya empezó'}
              className={`${boton} bg-stone-800 hover:bg-stone-700 text-teal-300`}>
              <UserCheck className="w-4 h-4" /> Asistió
            </button>
            <button disabled={enviando || !yaEmpezo || grupo === 'cancelada' || grupo === 'noasistio'} onClick={() => ejecutar({ tipo: 'noasistio' })}
              title={yaEmpezo ? '' : 'Se marca cuando la cita ya empezó'}
              className={`${boton} bg-stone-800 hover:bg-stone-700 text-rose-300`}>
              <UserX className="w-4 h-4" /> No asistió
            </button>
          </div>

          {modo === 'reagendar' && (
            <div className="mt-4 p-4 rounded-2xl border border-stone-800 bg-stone-950/50 space-y-3">
              <label className="block text-sm text-stone-300">
                Nueva fecha
                <input type="date" value={fecha} min={hoyIso()} onChange={e => setFecha(e.target.value)}
                  className="mt-1 w-full rounded-xl bg-stone-900 border border-stone-700 px-3 py-2 text-white [color-scheme:dark]" />
              </label>
              {slots === null ? (
                <p className="text-stone-400 text-sm flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Buscando horarios libres...</p>
              ) : slots.length === 0 ? (
                <p className="text-stone-400 text-sm">{motivoSlots || 'Sin horarios disponibles.'}</p>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {slots.map(sl => (
                    <button key={sl.timestamp} onClick={() => setSlotSel(sl.timestamp)}
                      className={`py-2 rounded-lg text-sm border transition-all ${slotSel === sl.timestamp ? 'bg-brand-gold text-stone-950 border-brand-gold font-semibold' : 'border-stone-700 text-stone-200 hover:border-brand-gold'}`}>
                      {sl.horaAmPm}
                    </button>
                  ))}
                </div>
              )}
              <button disabled={enviando || slotSel === null} onClick={() => ejecutar({ tipo: 'reagendar', timestamp: slotSel })}
                className={`${boton} w-full bg-brand-gold text-stone-950 hover:brightness-110`}>
                {enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : <CalendarClock className="w-4 h-4" />} Confirmar nueva fecha
              </button>
              <p className="text-xs text-stone-500">Mueve el evento en tu Calendar, deja la cita confirmada y le avisa al propietario por correo.</p>
            </div>
          )}

          {modo === 'cancelar' && (
            <div className="mt-4 p-4 rounded-2xl border border-red-900/60 bg-red-950/20 space-y-3">
              <label className="block text-sm text-stone-300">
                Motivo
                <textarea value={motivo} onChange={e => setMotivo(e.target.value)} rows={2}
                  placeholder="Ej.: el propietario ya no quiere el servicio"
                  className="mt-1 w-full rounded-xl bg-stone-900 border border-stone-700 px-3 py-2 text-white" />
              </label>
              <button disabled={enviando || !motivo.trim()} onClick={() => ejecutar({ tipo: 'cancelar', motivo })}
                className={`${boton} w-full bg-red-600 hover:bg-red-500 text-white`}>
                {enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4" />} Sí, cancelar la cita
              </button>
              <p className="text-xs text-stone-500">Libera el horario en tu Calendar y le avisa al propietario por correo.</p>
            </div>
          )}

          <label className="block text-sm text-stone-300 mt-4">
            Mis notas
            <textarea value={notas} onChange={e => setNotas(e.target.value)} rows={3}
              placeholder="Lo que hablaste con el propietario, acuerdos, pendientes..."
              className="mt-1 w-full rounded-xl bg-stone-950/60 border border-stone-700 px-3 py-2 text-white" />
          </label>
          <button disabled={enviando || notas === notasGuardadas} onClick={() => ejecutar({ tipo: 'notas', texto: notas }, false)}
            className={`${boton} w-full mt-2 bg-stone-800 hover:bg-stone-700 text-white`}>
            <Save className="w-4 h-4" /> Guardar notas
          </button>

          {aviso && (
            <p className={`mt-4 text-sm p-3 rounded-xl border ${aviso.ok ? 'border-emerald-700 bg-emerald-950/40 text-emerald-300' : 'border-red-800 bg-red-950/40 text-red-300'}`}>
              {aviso.texto}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
