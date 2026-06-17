/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ShieldCheck, MessageSquare, Phone, Mail, Award, Clock } from 'lucide-react';
import { INSURANCE_PARTNERS } from '../data';

interface PartnersAndContactProps {
  onOpenRegisterForm?: () => void;
}

export default function PartnersAndContact({ onOpenRegisterForm }: PartnersAndContactProps) {
  return (
    <section id="contacto" className="py-20 bg-brand-dark text-stone-800 relative overflow-hidden">
      <div className="absolute top-1/4 right-1/4 w-72 h-72 bg-brand-gold/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Insurance Partners Panel */}
        <div className="bg-white p-8 sm:p-12 rounded-2xl border border-stone-200 mb-16 text-center space-y-8 shadow-sm">
          <div className="max-w-2xl mx-auto space-y-2">
            <span className="text-xs uppercase font-mono tracking-widest text-brand-gold-dark font-bold block">COBERTURA JURÍDICA RESPALDADA</span>
            <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-900 font-sans">
              Seguridad garantizada por las mejores aseguradoras
            </h3>
            <p className="text-stone-600 text-sm font-light leading-relaxed">
              No estás solo. Tus contratos de arrendamiento e inventarios cuentan con el blindaje legal, financiero y comercial de los gigantes del sector asegurador en Colombia.
            </p>
          </div>

          {/* Insurance badges grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 pt-4 max-w-5xl mx-auto">
            {INSURANCE_PARTNERS.map((partner) => (
              <div
                key={partner.name}
                id={`partner-badge-${partner.logoType}`}
                className={`p-6 border border-stone-200 rounded-xl flex flex-col items-center justify-center text-center transition-all duration-300 hover:scale-103 bg-white hover:shadow-xs`}
              >
                <div className="p-2 bg-brand-dark rounded-full mb-3 shrink-0 border border-stone-200">
                  <ShieldCheck className="w-5 h-5 text-brand-gold-dark" />
                </div>
                <span className="text-xs font-bold tracking-tight leading-tight uppercase font-mono text-stone-800">
                  {partner.name}
                </span>
                <span className="text-[9px] text-stone-500 mt-1 uppercase font-mono tracking-widest block">aliado certificado</span>
              </div>
            ))}
          </div>

          <p className="text-xs text-stone-500 italic max-w-xl mx-auto mt-4 font-sans font-light">
            *Las pólizas y coberturas de hasta 36 meses se tramitan en co-alianza directa con las entidades seleccionadas según la zona del inmueble registrado.
          </p>
        </div>

        {/* Contact info cards row */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          
          {/* Quick connection left info columns */}
          <div className="md:col-span-12 lg:col-span-5 text-left space-y-6">
            <div>
              <span className="text-xs uppercase font-mono tracking-widest text-brand-gold-dark font-bold block">COMUNICACIÓN DIRECTA</span>
              <h3 className="text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight">Atención 100% personalizada</h3>
              <p className="text-stone-605 text-sm font-light leading-relaxed mt-3">
                ¿Prefieres hablar directamente con un consultor comercial del equipo de Gold Life? 
                Escríbenos, llámanos o programa una videollamada. Resolveremos todas tus dudas de honorarios en minutos.
              </p>
            </div>

            <div className="space-y-4 font-mono text-xs">
              <div className="flex items-center space-x-3 text-stone-700">
                <Clock className="w-4 h-4 text-brand-gold-dark shrink-0" />
                <span>Lunes a Sábado: 8:00 AM - 6:00 PM (Hora Colombia)</span>
              </div>
              <div className="flex items-center space-x-3 text-stone-700">
                <ShieldCheck className="w-4 h-4 text-brand-gold-dark shrink-0" />
                <span>Certificados por la Lonja de Propiedad Raíz de Colombia</span>
              </div>
            </div>
          </div>

          {/* Premium contact button grid columns */}
          <div className="md:col-span-12 lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* WhatsApp Box */}
            <a
              id="contact-whatsapp-block"
              href="https://wa.me/573000000000?text=Hola%20Gold%20Life,%20quiero%20conocer%2520las%2520coberturas%2520de%2520sus%2520p%C3%B3lizas%2520de%22arrendamientos."
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white hover:bg-stone-50 border border-stone-200 p-6 sm:p-8 rounded-xl text-left transition-all hover:scale-102 flex flex-col justify-between group cursor-pointer shadow-sm hover:shadow-md"
            >
              <div className="space-y-4">
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 rounded-lg w-fit">
                  <MessageSquare className="w-6 h-6 shrink-0" />
                </div>
                <div>
                  <h4 className="font-bold text-stone-900 text-base group-hover:text-brand-gold-dark transition-colors">Escríbenos por WhatsApp</h4>
                  <p className="text-stone-600 text-xs mt-1 leading-relaxed font-light font-sans">
                    Solución de dudas directa, rápida y sin esperas. Te conectamos con un asesor comercial asignado de inmediato.
                  </p>
                </div>
              </div>
              <span className="text-xs text-brand-gold-dark font-bold mt-4 flex items-center space-x-1 font-mono">
                <span>Chatear ahora</span>
                <span>→</span>
              </span>
            </a>

            {/* Telephone Call Box */}
            <a
              id="contact-phone-block"
              href="tel:+573000000000"
              className="bg-white hover:bg-stone-50 border border-stone-200 p-6 sm:p-8 rounded-xl text-left transition-all hover:scale-102 flex flex-col justify-between group cursor-pointer shadow-sm hover:shadow-md"
            >
              <div className="space-y-4">
                <div className="p-3 bg-brand-gold/10 border border-brand-gold/30 text-brand-gold-dark rounded-lg w-fit">
                  <Phone className="w-6 h-6 shrink-0" />
                </div>
                <div>
                  <h4 className="font-bold text-stone-900 text-base group-hover:text-brand-gold-dark transition-colors">Llamada Telefónica</h4>
                  <p className="text-stone-600 text-xs mt-1 leading-relaxed font-light font-sans">
                    Habla directamente con nuestro consultor comercial principal para la colocación de un inmueble prémium.
                  </p>
                </div>
              </div>
              <span className="text-xs text-brand-gold-dark font-bold mt-4 flex items-center space-x-1 font-mono">
                <span>Llamar ahora</span>
                <span>→</span>
              </span>
            </a>

          </div>

        </div>

        {/* High-impact Property Registration CTA Banner requested by user */}
        <div className="mt-16 bg-white border border-stone-200/90 p-8 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm hover:shadow-md transition-all text-left">
          <div className="space-y-1 max-w-xl">
            <span className="text-[10px] uppercase font-mono tracking-widest text-[#8A631F] font-bold block">¿LISTO PARA COMENZAR?</span>
            <h4 className="text-xl font-bold text-stone-900">¿Listo para el verdadero respaldo en tu arrendamiento?</h4>
            <p className="text-stone-605 text-xs font-light leading-relaxed">
              Calcula tus honorarios contables en tiempo real, proyecta tus comisiones y registra tu propiedad de forma 100% digital en nuestro portal independiente gamificado.
            </p>
          </div>
          <button
            id="partners-cta-register"
            onClick={onOpenRegisterForm}
            className="w-full md:w-auto bg-brand-gold hover:bg-brand-gold-dark text-stone-950 font-bold px-8 py-4 rounded-xl transition-all shadow-md text-nowrap text-center cursor-pointer active:scale-98 text-sm"
          >
            Acceder al Portal
          </button>
        </div>

      </div>
    </section>
  );
}
