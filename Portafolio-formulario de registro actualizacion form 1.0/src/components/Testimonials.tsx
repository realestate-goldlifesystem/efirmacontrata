/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { Star, Quote, ChevronLeft, ChevronRight, MessageSquare } from 'lucide-react';
import { TESTIMONIALS_DATA } from '../data';

export default function Testimonials() {
  const [activeIndex, setActiveIndex] = useState(0);

  const handlePrev = () => {
    setActiveIndex((prev) => (prev === 0 ? TESTIMONIALS_DATA.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setActiveIndex((prev) => (prev === TESTIMONIALS_DATA.length - 1 ? 0 : prev + 1));
  };

  const active = TESTIMONIALS_DATA[activeIndex];

  return (
    <section id="testimonios" className="py-20 bg-brand-dark border-t border-b border-stone-200 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/3 w-80 h-80 bg-brand-gold/5 rounded-full blur-[110px] pointer-events-none" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="text-xs uppercase font-mono tracking-widest text-brand-gold-dark font-bold flex items-center justify-center gap-1.5">
            <MessageSquare className="w-4 h-4" /> TESTIMONIOS REALES BACKED
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-stone-900 mt-2 font-sans">
            Historias de Copropietarios Satisfechos
          </h2>
          <p className="text-stone-600 mt-3 text-sm font-light">
            Conoce cómo inversionistas y pensionados simplificaron la administración de sus arriendos en Colombia con nuestra alianza.
          </p>
        </div>

        {/* Testimonial Active Display Card with sliders */}
        <div className="relative bg-white rounded-2xl border border-stone-200 p-8 sm:p-12 shadow-sm flex flex-col md:flex-row gap-8 items-center">
          
          {/* Quote watermark icon */}
          <div className="absolute top-6 right-8 text-stone-100">
            <Quote className="w-20 h-20 -scale-x-100 opacity-60 text-stone-200" />
          </div>

          {/* User Face Avatar */}
          <div className="shrink-0 relative">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden border border-brand-gold/45 bg-stone-100">
              <img
                referrerPolicy="no-referrer"
                src={active.imageUrl}
                alt={active.name}
                className="w-full h-full object-cover"
              />
            </div>
            {/* Visual accent ring */}
            <div className="absolute -inset-1.5 border border-dashed border-brand-gold/20 rounded-full animate-spin-slow pointer-events-none" />
          </div>

          {/* User Text Commentary */}
          <div className="space-y-4 flex-1 text-left relative z-10">
            
            {/* Elegant review star lines */}
            <div className="flex items-center space-x-1">
              {[...Array(active.rating)].map((_, i) => (
                <Star key={i} className="w-4 h-4 fill-brand-gold text-brand-gold" />
              ))}
            </div>

            <p className="text-stone-800 text-base sm:text-lg font-light leading-relaxed font-serif italic">
              "{active.text}"
            </p>

            <div>
              <h4 className="font-bold text-stone-900 text-base">{active.name}</h4>
              <p className="text-stone-600 text-xs mt-0.5 font-mono uppercase tracking-widest">{active.role} • {active.location}</p>
            </div>

          </div>

        </div>

        {/* Carousel controls bar */}
        <div className="flex items-center justify-center space-x-6 mt-8">
          <button
            id="prev-testimonial-btn"
            onClick={handlePrev}
            className="p-3 rounded-full border border-stone-200 bg-white text-stone-600 hover:text-brand-gold-dark hover:border-brand-gold/50 hover:bg-stone-50 transition-all cursor-pointer shadow-xs"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          {/* Progress Bullets Indicator */}
          <div className="flex space-x-2">
            {TESTIMONIALS_DATA.map((_, idx) => (
              <button
                key={idx}
                id={`bullet-testimonial-${idx}`}
                onClick={() => setActiveIndex(idx)}
                className={`h-2 rounded-full transition-all cursor-pointer ${
                  activeIndex === idx ? 'w-6 bg-brand-gold' : 'w-2 bg-stone-200'
                }`}
              />
            ))}
          </div>

          <button
            id="next-testimonial-btn"
            onClick={handleNext}
            className="p-3 rounded-full border border-stone-200 bg-white text-stone-600 hover:text-brand-gold-dark hover:border-brand-gold/50 hover:bg-stone-50 transition-all cursor-pointer shadow-xs"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

      </div>
    </section>
  );
}
