/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ShieldCheck } from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer id="main-footer" className="bg-brand-dark-deep border-t border-stone-200 py-12 text-stone-600 text-xs text-center font-mono">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
        
        <div className="flex items-center justify-center space-x-2 text-stone-750 tracking-widest uppercase font-bold">
          <span className="text-brand-gold-dark font-extrabold text-sm">GOLD</span>
          <span className="text-stone-800 font-light text-sm">Life</span>
          <span className="text-[10px] text-stone-500 font-mono tracking-widest font-normal">REAL ESTATE</span>
        </div>

        <p className="max-w-md mx-auto text-stone-600 leading-relaxed font-light font-sans text-xs">
          Gold Life Real Estate S.A.S. - Especialistas en Administración Inmobiliaria de Arrendamientos &amp; Ventas de Propiedades con Respaldo Jurídico de Vanguardia en Colombia.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 text-[10px] text-stone-500 pt-2 font-mono">
          <span className="hover:text-brand-gold-dark transition-colors cursor-pointer">POLÍTICAS DE PRIVACIDAD</span>
          <span>•</span>
          <span className="hover:text-brand-gold-dark transition-colors cursor-pointer">TÉRMINOS DE SERVICIO</span>
          <span>•</span>
          <span className="hover:text-brand-gold-dark transition-colors cursor-pointer">LEY HABEAS DATA</span>
          <span>•</span>
          <span className="hover:text-brand-gold-dark transition-colors cursor-pointer">REGISTRO DE OPERADOR</span>
        </div>

        <div className="pt-6 border-t border-stone-200 text-[10.5px] text-stone-600 space-y-1">
          <p>© {currentYear} GOLD LIFE REAL ESTATE. Todos los derechos reservados.</p>
          <p className="font-light">Experiencia inmobiliaria personalizada, sofisticada y ágil.</p>
        </div>

      </div>
    </footer>
  );
}
