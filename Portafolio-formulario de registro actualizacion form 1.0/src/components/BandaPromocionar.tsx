import { CalendarCheck, ArrowRight } from 'lucide-react';

/** Franja después de la calculadora: del número a la acción, con la agenda del asesor. */
export default function BandaPromocionar({ onAgendar }: { onAgendar: () => void }) {
  return (
    <section className="bg-brand-dark">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="relative overflow-hidden rounded-3xl bg-stone-900 px-6 py-8 md:px-12 md:py-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-2xl">
          <div className="absolute inset-0 bg-radial-[circle_at_top_right] from-brand-gold/20 via-transparent to-transparent pointer-events-none" />
          <div className="relative">
            <p className="text-[11px] uppercase tracking-[0.22em] text-brand-gold font-mono">Presentación sin costo</p>
            <h3 className="mt-2 text-2xl md:text-3xl font-bold text-white font-sans">¿Listo para que tu inmueble trabaje por ti?</h3>
            <p className="mt-2 text-stone-300 text-sm md:text-base max-w-xl font-light">Agenda una cita con tu asesor: evaluamos tu inmueble y te presentamos la mejor estrategia para arrendarlo o venderlo.</p>
          </div>
          <button
            onClick={onAgendar}
            className="relative shrink-0 bg-brand-gold hover:bg-brand-gold-dark text-stone-950 font-bold px-7 py-4 rounded-xl shadow-xl shadow-brand-gold/20 transition-all hover:-translate-y-px flex items-center gap-2 cursor-pointer"
          >
            <CalendarCheck className="w-5 h-5" /> Deseo promocionar mi inmueble <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </section>
  );
}
