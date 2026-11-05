import { useEffect, useState } from 'react';
import { X, Handshake, UserSearch, Video, ChevronRight, Loader2, Search, ArrowLeft, ExternalLink, MapPin } from 'lucide-react';
import ScheduleVisitForm from './ScheduleVisitForm';
import { API_URL } from './CitasAgendaPanel';

const URL_VISITA = 'https://realestate-goldlifesystem.github.io/efirmacontrata/frontend/visita.html';

interface Inmueble { id: string; titulo: string; descripcion?: string; foto?: string; direccion?: string }

/**
 * "Crear cita" desde la agenda del agente (5-nov-2026). Reutiliza los mismos flujos que
 * usa el público, para que los horarios, el calendario, los correos y los recordatorios
 * sean idénticos:
 *  - Presentación al propietario (captación): la agenda del botón "Propietario" del portal.
 *  - Visita de interesado: la página del inmueble (visita.html), en otra pestaña.
 */
export default function CrearCitaModal({ onCerrar }: { onCerrar: () => void }) {
  const [vista, setVista] = useState<'elegir' | 'propietario' | 'interesado'>('elegir');
  const [modalidad, setModalidad] = useState<'PRESENCIAL' | 'VIRTUAL'>('PRESENCIAL');
  const [inmuebles, setInmuebles] = useState<Inmueble[] | null>(null);
  const [error, setError] = useState('');
  const [buscar, setBuscar] = useState('');
  const [negocio, setNegocio] = useState<'TODOS' | 'ARRIENDO' | 'VENTA' | 'MIXTO'>('TODOS');

  useEffect(() => {
    if (vista !== 'interesado' || inmuebles) return;
    fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ accion: 'listarVistasPrevias' }) })
      .then(r => r.json())
      .then(r => {
        const lista: Inmueble[] = (r.inmuebles || r.lista || r.data || (Array.isArray(r) ? r : [])) as Inmueble[];
        if (!lista.length) setError('No hay inmuebles publicados para agendar visitas.');
        setInmuebles(lista);
      })
      .catch(() => setError('No pudimos cargar los inmuebles. Intenta de nuevo.'));
  }, [vista, inmuebles]);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onCerrar(); };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [onCerrar]);

  // La agenda del propietario ocupa toda la pantalla, igual que en el portal
  if (vista === 'propietario') {
    return (
      <div className="fixed inset-0 z-[80] overflow-y-auto bg-stone-950">
        <ScheduleVisitForm onBack={onCerrar} modalidadInicial={modalidad} />
      </div>
    );
  }

  // El título dice "en arriendo", "en venta" o "en arriendo o venta"
  const negocioDe = (i: Inmueble) => /arriendo o venta/i.test(i.titulo) ? 'MIXTO' : / en venta/i.test(i.titulo) ? 'VENTA' : 'ARRIENDO';
  const filtrados = (inmuebles || [])
    .filter(i => negocio === 'TODOS' || negocioDe(i) === negocio)
    .filter(i => (i.id + ' ' + i.titulo + ' ' + (i.direccion || '')).toLowerCase().includes(buscar.trim().toLowerCase()));
  const cuenta = (n: string) => (inmuebles || []).filter(i => n === 'TODOS' || negocioDe(i) === n).length;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-[fadeIn_.25s_ease]" onClick={onCerrar}>
      <div className="w-full max-w-lg rounded-3xl border border-stone-800 bg-stone-900 shadow-2xl p-6 max-h-[88vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 mb-5">
          <div>
            {vista === 'interesado' && (
              <button onClick={() => setVista('elegir')} className="text-xs text-stone-400 hover:text-brand-gold flex items-center gap-1 mb-2">
                <ArrowLeft className="w-3.5 h-3.5" /> Tipo de cita
              </button>
            )}
            <p className="text-[11px] uppercase tracking-[0.2em] text-brand-gold font-semibold">Crear cita</p>
            <h2 className="text-white text-xl font-semibold mt-1">{vista === 'elegir' ? '¿Qué tipo de cita vas a agendar?' : 'Elige el inmueble'}</h2>
          </div>
          <button onClick={onCerrar} className="p-2 rounded-full text-stone-400 hover:text-white hover:bg-stone-800" aria-label="Cerrar"><X className="w-5 h-5" /></button>
        </div>

        {vista === 'elegir' ? (
          <div className="space-y-3">
            <Opcion Icono={Handshake} color="bg-brand-gold text-stone-950" titulo="Captación presencial"
              texto="Presentación al propietario en su inmueble." onClick={() => { setModalidad('PRESENCIAL'); setVista('propietario'); }} />
            <Opcion Icono={Video} color="bg-sky-500 text-white" titulo="Presentación virtual"
              texto="Presentación al propietario por Google Meet." onClick={() => { setModalidad('VIRTUAL'); setVista('propietario'); }} />
            <Opcion Icono={UserSearch} color="bg-indigo-500 text-white" titulo="Visita de interesado"
              texto="Un interesado visita uno de los inmuebles publicados." onClick={() => setVista('interesado')} />
            <p className="text-stone-500 text-xs pt-2">Se usan los mismos horarios, correos y recordatorios que cuando agenda la persona.</p>
          </div>
        ) : (
          <>
            <div className="relative mb-3">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-500" />
              <input value={buscar} onChange={e => setBuscar(e.target.value)} placeholder="Buscar por código o barrio"
                className="w-full bg-stone-950 border border-stone-800 rounded-xl pl-10 pr-3 py-2.5 text-sm text-white placeholder:text-stone-500 outline-none focus:border-brand-gold/60" />
            </div>
            <div className="flex gap-1.5 mb-3 p-1 rounded-xl bg-stone-950 border border-stone-800">
              {(['TODOS', 'ARRIENDO', 'VENTA', 'MIXTO'] as const).map(n => (
                <button key={n} onClick={() => setNegocio(n)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${negocio === n ? 'bg-indigo-500 text-white shadow' : 'text-stone-400 hover:text-white'}`}>
                  {{ TODOS: 'Todos', ARRIENDO: 'Arriendo', VENTA: 'Venta', MIXTO: 'Mixto' }[n]}
                  {inmuebles && <span className="ml-1 opacity-60 font-normal">{cuenta(n)}</span>}
                </button>
              ))}
            </div>
            <div className="overflow-y-auto -mx-1 px-1 space-y-2 min-h-[120px]">
              {inmuebles && !error && !filtrados.length && <p className="text-stone-500 text-sm py-6 text-center">No hay inmuebles con ese filtro.</p>}
              {!inmuebles && !error && <p className="text-stone-400 text-sm flex items-center gap-2 py-6 justify-center"><Loader2 className="w-4 h-4 animate-spin" /> Cargando inmuebles…</p>}
              {error && <p className="text-red-300 text-sm py-4">{error}</p>}
              {filtrados.map(i => (
                <a key={i.id} href={`${URL_VISITA}?i=${encodeURIComponent(i.id)}`} target="_blank" rel="noopener"
                  className="flex items-stretch gap-3 p-2.5 rounded-2xl border border-stone-800 bg-stone-950/60 hover:border-indigo-400/60 transition-all group">
                  <span className="w-20 h-20 shrink-0 rounded-xl overflow-hidden bg-stone-800">
                    {i.foto
                      ? <img src={i.foto.replace('sz=w1200', 'sz=w300')} alt="" loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      : <span className="w-full h-full grid place-items-center text-stone-600"><UserSearch className="w-6 h-6" /></span>}
                  </span>
                  <span className="flex-1 min-w-0 flex flex-col justify-center gap-1">
                    <span className="flex items-center gap-2">
                      <span className="text-[10.5px] font-mono text-indigo-300 bg-indigo-500/10 border border-indigo-500/30 rounded-md px-1.5 py-0.5 shrink-0">{i.id}</span>
                      <span className="text-white text-sm font-medium truncate">{i.titulo.replace(/ · .*$/, '')}</span>
                    </span>
                    {i.descripcion && <span className="text-brand-gold text-xs font-semibold truncate">{i.descripcion.replace(/.? ?Agenda tu visita.*$/, '')}</span>}
                    {i.direccion && <span className="text-stone-400 text-xs truncate flex items-center gap-1"><MapPin className="w-3 h-3 shrink-0" />{i.direccion}</span>}
                  </span>
                  <ExternalLink className="w-4 h-4 text-stone-500 group-hover:text-indigo-300 shrink-0 self-center" />
                </a>
              ))}
            </div>
            <p className="text-stone-500 text-xs pt-3">Se abre la página del inmueble en otra pestaña: llena los datos del interesado y elige la hora. Luego toca "Actualizar" en la agenda.</p>
          </>
        )}
      </div>
    </div>
  );
}

function Opcion({ Icono, color, titulo, texto, onClick }: { Icono: typeof X; color: string; titulo: string; texto: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-4 p-4 rounded-2xl border border-stone-800 bg-stone-950/60 hover:border-brand-gold/60 transition-all text-left group">
      <span className={`w-11 h-11 rounded-xl grid place-items-center shrink-0 ${color}`}><Icono className="w-5 h-5" /></span>
      <span className="flex-1">
        <span className="block text-white font-medium">{titulo}</span>
        <span className="block text-stone-400 text-sm">{texto}</span>
      </span>
      <ChevronRight className="w-5 h-5 text-stone-500 group-hover:text-brand-gold transition-transform group-hover:translate-x-0.5" />
    </button>
  );
}
