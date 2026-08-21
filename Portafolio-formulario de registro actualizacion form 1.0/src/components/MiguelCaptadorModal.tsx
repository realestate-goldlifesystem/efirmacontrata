import { useEffect, useState } from 'react';
import { X, Bot, Loader2, CheckCircle2, AlertTriangle, Rocket } from 'lucide-react';

const SEGUNDOS_CIERRE = 5;

const API_URL = 'https://script.google.com/macros/s/AKfycbxpJ8w_XR5dUhIv1VTuV3ZDjHm-vtz13B5RlyfiLqI9ypZnIuzuUL39_GDHpBisL2oW/exec';

const CUOTA_POR_BARRIDO = 30;

const SECTORES = ['usaquen', 'suba', 'chapinero'] as const;
const NOMBRE_SECTOR: Record<string, string> = {
  usaquen: 'Usaquén',
  suba: 'Suba',
  chapinero: 'Chapinero',
};
const HABS = ['1', '2', '3', '4', '5'] as const;

interface MiguelCaptadorModalProps {
  onClose: () => void;
  /** Token de Google del agente; el backend revalida el correo con él. */
  agentCredential: string | null;
}

/**
 * Mantiene el orden canónico y nunca deja la lista vacía: sin sector o sin
 * habitación no hay barrido posible, así que el último seleccionado ignora
 * el clic en vez de dejar el formulario en un estado inválido.
 */
function alternar(seleccion: string[], val: string, canonico: readonly string[]): string[] {
  const yaEsta = seleccion.includes(val);
  if (yaEsta && seleccion.length === 1) return seleccion;
  const siguiente = yaEsta ? seleccion.filter((s) => s !== val) : [...seleccion, val];
  return canonico.filter((c) => siguiente.includes(c));
}

/** Une nombres en lenguaje natural: "Usaquén y Chapinero". */
function listar(nombres: string[]): string {
  if (nombres.length === 1) return nombres[0];
  return nombres.slice(0, -1).join(', ') + ' y ' + nombres[nombres.length - 1];
}

export default function MiguelCaptadorModal({ onClose, agentCredential }: MiguelCaptadorModalProps) {
  const [modo, setModo] = useState<'arriendo' | 'venta'>('arriendo');
  const [selSector, setSelSector] = useState<string[]>([...SECTORES]);
  const [selHab, setSelHab] = useState<string[]>(['1']);
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<{ ok: boolean; mensaje: string } | null>(null);
  // Cuenta regresiva: solo corre cuando el barrido SÍ arrancó. Si falló, el
  // modal se queda abierto para poder leer el motivo.
  const [restan, setRestan] = useState<number | null>(null);

  useEffect(() => {
    if (restan === null) return;
    if (restan <= 0) {
      onClose();
      return;
    }
    const t = setTimeout(() => setRestan(restan - 1), 1000);
    return () => clearTimeout(t);
  }, [restan, onClose]);

  const barridos = selSector.length * selHab.length;
  const techo = barridos * CUOTA_POR_BARRIDO;

  const textoSector =
    selSector.length === SECTORES.length
      ? 'las 3 localidades'
      : listar(selSector.map((s) => NOMBRE_SECTOR[s]));
  const textoHab =
    selHab.length === HABS.length ? 'las 5 habitaciones' : listar(selHab) + ' habitación(es)';

  // Se manda 'all' cuando está todo marcado y la lista separada por coma en
  // cualquier otro caso: el backend entiende ambas formas.
  const valorDe = (seleccion: string[], canonico: readonly string[]) =>
    seleccion.length === canonico.length ? 'all' : seleccion.join(',');

  const lanzar = async () => {
    if (!agentCredential) {
      setResultado({
        ok: false,
        mensaje: 'Tu sesión de Google ya no está disponible. Cierra sesión y vuelve a entrar para lanzar a Miguel.',
      });
      return;
    }

    setEnviando(true);
    setResultado(null);
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          accion: 'lanzarMiguel',
          credential: agentCredential,
          modo,
          bedrooms: valorDe(selHab, HABS),
          sector: valorDe(selSector, SECTORES),
        }),
      });
      const data = await response.json();
      setResultado({
        ok: !!data.success,
        mensaje: data.message || (data.success ? 'Barrido iniciado.' : 'No se pudo iniciar el barrido.'),
      });
      if (data.success) setRestan(SEGUNDOS_CIERRE);
    } catch {
      setResultado({ ok: false, mensaje: 'Error de red al conectar con el servidor.' });
    } finally {
      setEnviando(false);
    }
  };

  const pill = (activo: boolean) =>
    `px-3 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
      activo
        ? 'bg-brand-gold/20 border-brand-gold text-brand-gold shadow-[0_0_18px_rgba(212,175,55,0.12)]'
        : 'bg-stone-950/50 border-stone-800 text-stone-400 hover:border-stone-600 hover:text-stone-200'
    }`;

  const chip = (activo: boolean) =>
    `text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full border transition-all ${
      activo
        ? 'bg-brand-gold text-stone-950 border-brand-gold'
        : 'bg-stone-950/50 border-stone-800 text-stone-500 hover:border-stone-600 hover:text-stone-300'
    }`;

  return (
    <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-stone-900 border border-stone-700 w-full max-w-lg rounded-2xl p-6 md:p-7 relative max-h-[90vh] overflow-y-auto text-left">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-stone-500 hover:text-white bg-stone-800 p-2 rounded-full transition-colors"
          aria-label="Cerrar"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-2xl font-bold text-white mb-1 flex items-center gap-3">
          <Bot className="w-7 h-7 text-brand-gold" /> Miguel · Agente Captador
        </h2>
        <p className="text-stone-400 text-sm mb-6 border-b border-stone-800 pb-4">
          Busca propietarios directos en Fincaraiz y Metrocuadrado. Puedes elegir varios sectores y
          varias habitaciones a la vez.
        </p>

        {/* Modo */}
        <div className="text-[11px] font-bold uppercase tracking-wider text-stone-400 mb-2">
          Modo
        </div>
        <div className="grid grid-cols-2 gap-2 mb-5">
          <button onClick={() => setModo('arriendo')} className={pill(modo === 'arriendo')}>
            Arriendo
          </button>
          <button onClick={() => setModo('venta')} className={pill(modo === 'venta')}>
            Venta
          </button>
        </div>

        {/* Sector */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400">
            Sector
          </span>
          <button
            onClick={() => setSelSector([...SECTORES])}
            className={chip(selSector.length === SECTORES.length)}
          >
            Todos
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2 mb-5">
          {SECTORES.map((s) => (
            <button
              key={s}
              onClick={() => setSelSector(alternar(selSector, s, SECTORES))}
              className={pill(selSector.includes(s))}
            >
              {NOMBRE_SECTOR[s]}
            </button>
          ))}
        </div>

        {/* Habitaciones */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400">
            Habitaciones
          </span>
          <button
            onClick={() => setSelHab([...HABS])}
            className={chip(selHab.length === HABS.length)}
          >
            Todas
          </button>
        </div>
        <div className="grid grid-cols-5 gap-2 mb-5">
          {HABS.map((h) => (
            <button
              key={h}
              onClick={() => setSelHab(alternar(selHab, h, HABS))}
              className={pill(selHab.includes(h))}
            >
              {h}
            </button>
          ))}
        </div>

        {/* Resumen del plan */}
        <div className="bg-stone-950/60 border border-stone-800 rounded-xl px-4 py-3 mb-5 text-sm text-stone-400 leading-relaxed">
          Se harán <b className="text-white">{barridos}</b> barrido{barridos === 1 ? '' : 's'} de{' '}
          {CUOTA_POR_BARRIDO}: <b className="text-white">{textoSector}</b> ×{' '}
          <b className="text-white">{textoHab}</b>. Máximo{' '}
          <b className="text-brand-gold">{techo}</b> captaciones.
          {barridos >= 10 && (
            <span className="block mt-1 text-stone-500">
              Puede tardar <b className="text-stone-300">1 a 3 horas</b>; corre en la nube, puedes
              cerrar esta ventana.
            </span>
          )}
        </div>

        {/* Resultado */}
        {resultado && (
          <div
            className={`flex items-start gap-2 rounded-xl px-4 py-3 mb-5 text-sm border ${
              resultado.ok
                ? 'bg-emerald-900/20 border-emerald-800/40 text-emerald-300'
                : 'bg-red-900/20 border-red-800/40 text-red-300'
            }`}
          >
            {resultado.ok ? (
              <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            )}
            <span>{resultado.mensaje}</span>
          </div>
        )}

        <div className="flex items-center justify-end gap-3">
          {restan !== null ? (
            /* Barrido lanzado: se cierra solo con la cuenta regresiva */
            <>
              <span className="text-xs text-stone-500">Se cierra solo</span>
              <div className="relative w-11 h-11 shrink-0">
                <svg className="w-11 h-11 -rotate-90" viewBox="0 0 42 42">
                  <circle cx="21" cy="21" r="18" fill="none" strokeWidth="4" className="stroke-stone-800" />
                  <circle
                    cx="21" cy="21" r="18" fill="none" strokeWidth="4" strokeLinecap="round"
                    className="stroke-brand-gold transition-[stroke-dashoffset] duration-1000 ease-linear"
                    strokeDasharray={2 * Math.PI * 18}
                    strokeDashoffset={2 * Math.PI * 18 * (1 - restan / SEGUNDOS_CIERRE)}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center text-sm font-bold text-brand-gold">
                  {restan}
                </div>
              </div>
            </>
          ) : (
            <>
              <button
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl bg-stone-800 text-stone-300 text-sm font-semibold hover:bg-stone-700 transition-colors"
              >
                {resultado ? 'Cerrar' : 'Cancelar'}
              </button>
              <button
                onClick={lanzar}
                disabled={enviando}
                className="px-5 py-2.5 rounded-xl bg-brand-gold text-stone-950 text-sm font-bold hover:brightness-110 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {enviando ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Activando...
                  </>
                ) : (
                  <>
                    <Rocket className="w-4 h-4" /> Iniciar Barrido
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
