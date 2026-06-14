/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MapPin } from 'lucide-react';

interface CountryMapProps {
  countryCode: 'CO' | 'VE' | 'EC' | 'PA' | 'ES' | 'US';
}

export default function CountryMap({ countryCode }: CountryMapProps) {
  // Let's render high-fidelity, styled SVG outlines for each region with dynamic sparks
  const renderMap = () => {
    switch (countryCode) {
      case 'CO':
        return (
          <div className="relative w-full h-full flex flex-col items-center justify-center p-3 animate-fade-in bg-stone-50/50 rounded-xl border border-stone-200/60 shadow-inner">
            <svg viewBox="0 0 200 240" className="w-full h-[180px] text-brand-gold drop-shadow-[0_4px_12px_rgba(181,148,91,0.15)]">
              {/* Outer boundary of Colombia */}
              <path
                d="M100,20 C110,25 125,18 135,25 C145,32 140,45 155,50 C170,55 185,45 190,60 C195,75 175,90 185,110 C195,130 180,145 170,160 C160,175 145,190 135,210 C125,230 115,235 110,238 C105,230 95,210 90,195 C85,180 65,160 55,145 C45,130 35,115 30,105 C25,95 24,80 35,70 C46,60 50,55 58,45 C66,35 75,32 85,35 C95,38 95,20 100,20 Z"
                fill="url(#goldPattern)"
                stroke="#B5945B"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="animate-pulse"
              />
              {/* Regional Grid Reference Lines */}
              <line x1="10" y1="120" x2="190" y2="120" stroke="#B5945B" strokeWidth="0.5" strokeDasharray="4 4" opacity="0.3" />
              <line x1="100" y1="10" x2="100" y2="230" stroke="#B5945B" strokeWidth="0.5" strokeDasharray="4 4" opacity="0.3" />

              {/* Pulsing Capital Cities / Markets in Colombia */}
              {/* Bogotá, D.C. */}
              <g className="translate-x-[110px] translate-y-[115px]">
                <circle r="6" fill="#8A631F" className="animate-ping" opacity="0.75" />
                <circle r="4.5" fill="#B5945B" stroke="#ffffff" strokeWidth="1" />
              </g>
              {/* Medellín */}
              <g className="translate-x-[85px] translate-y-[90px]">
                <circle r="5" fill="#8A631F" className="animate-ping" opacity="0.5" />
                <circle r="3.5" fill="#8A631F" stroke="#ffffff" strokeWidth="0.75" />
              </g>
              {/* Cali */}
              <g className="translate-x-[70px] translate-y-[140px]">
                <circle r="5" fill="#8A631F" className="animate-ping" opacity="0.5" />
                <circle r="3.5" fill="#8A631F" stroke="#ffffff" strokeWidth="0.75" />
              </g>
              {/* Cartagena / Barranquilla */}
              <g className="translate-x-[90px] translate-y-[35px]">
                <circle r="5" fill="#8A631F" className="animate-ping" opacity="0.5" />
                <circle r="3.5" fill="#8A631F" stroke="#ffffff" strokeWidth="0.75" />
              </g>

              {/* Definitions for gradient fills */}
              <defs>
                <linearGradient id="goldPattern" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#FFFBEB" />
                  <stop offset="60%" stopColor="#FEF3C7" />
                  <stop offset="100%" stopColor="#FDE68A" stopOpacity="0.4" />
                </linearGradient>
              </defs>
            </svg>
            <div className="mt-2 text-center">
              <span className="text-[10px] font-mono uppercase bg-amber-100 text-[#8A631F] font-bold px-2 py-0.5 rounded-full select-none inline-flex items-center gap-1">
                <MapPin className="w-3 h-3 shrink-0" /> COLOMBIA ACTIVA • Bogotá, Medellín, Cali, Costa
              </span>
            </div>
          </div>
        );

      case 'VE':
        return (
          <div className="relative w-full h-full flex flex-col items-center justify-center p-3 animate-fade-in bg-stone-50/50 rounded-xl border border-stone-200/60 shadow-inner">
            <svg viewBox="0 0 240 180" className="w-full h-[180px] text-brand-gold drop-shadow-[0_4px_12px_rgba(181,148,91,0.15)]">
              {/* Outer boundary of Venezuela */}
              <path
                d="M10,80 C30,75 45,55 60,50 C80,45 105,48 115,55 C125,48 140,50 155,55 C170,60 180,50 200,60 C210,65 225,60 230,70 C235,80 220,100 225,115 C230,130 215,145 200,150 C185,155 170,140 160,155 C150,170 135,160 120,155 C105,150 90,135 80,140 C70,145 55,140 45,125 C35,110 25,110 20,105 C15,100 12,90 10,80 Z"
                fill="url(#goldPattern)"
                stroke="#B5945B"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <line x1="10" y1="90" x2="230" y2="90" stroke="#B5945B" strokeWidth="0.5" strokeDasharray="4 4" opacity="0.3" />

              {/* Caracas */}
              <g className="translate-x-[115px] translate-y-[53px]">
                <circle r="6" fill="#8A631F" className="animate-ping" opacity="0.75" />
                <circle r="4.5" fill="#B5945B" stroke="#ffffff" strokeWidth="1" />
              </g>
              <defs>
                <linearGradient id="goldPattern" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#FFFBEB" />
                  <stop offset="60%" stopColor="#FEF3C7" />
                  <stop offset="100%" stopColor="#FDE68A" stopOpacity="0.4" />
                </linearGradient>
              </defs>
            </svg>
            <div className="mt-2 text-center">
              <span className="text-[10px] font-mono uppercase bg-amber-100 text-[#8A631F] font-bold px-2 py-0.5 rounded-full select-none inline-flex items-center gap-1">
                <MapPin className="w-3 h-3 shrink-0" /> VENEZUELA • Caracas y Eje Central
              </span>
            </div>
          </div>
        );

      case 'EC':
        return (
          <div className="relative w-full h-full flex flex-col items-center justify-center p-3 animate-fade-in bg-stone-50/50 rounded-xl border border-stone-200/60 shadow-inner">
            <svg viewBox="0 0 200 200" className="w-full h-[180px] text-brand-gold drop-shadow-[0_4px_12px_rgba(181,148,91,0.15)]">
              {/* Outer boundary of Ecuador */}
              <path
                d="M40,50 C60,40 85,45 105,35 C125,25 145,45 160,50 C175,55 170,75 165,95 C160,115 145,135 135,150 C125,165 105,155 90,165 C75,175 60,165 50,150 C40,135 35,105 30,95 C25,85 20,60 40,50 Z"
                fill="url(#goldPattern)"
                stroke="#B5945B"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Equator Line Indicator */}
              <line x1="10" y1="75" x2="190" y2="75" stroke="#B5945B" strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />
              <text x="15" y="70" className="text-[7px] font-mono fill-brand-gold-dark font-bold uppercase tracking-wider">Línea del Ecuador 0°</text>

              {/* Quito */}
              <g className="translate-x-[105px] translate-y-[75px]">
                <circle r="6" fill="#8A631F" className="animate-ping" opacity="0.75" />
                <circle r="4.5" fill="#B5945B" stroke="#ffffff" strokeWidth="1" />
              </g>
              {/* Guayaquil */}
              <g className="translate-x-[80px] translate-y-[115px]">
                <circle r="5" fill="#8A631F" className="animate-ping" opacity="0.5" />
                <circle r="3.5" fill="#8A631F" stroke="#ffffff" strokeWidth="0.75" />
              </g>
              <defs>
                <linearGradient id="goldPattern" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#FFFBEB" />
                  <stop offset="60%" stopColor="#FEF3C7" />
                  <stop offset="100%" stopColor="#FDE68A" stopOpacity="0.4" />
                </linearGradient>
              </defs>
            </svg>
            <div className="mt-2 text-center">
              <span className="text-[10px] font-mono uppercase bg-amber-100 text-[#8A631F] font-bold px-2 py-0.5 rounded-full select-none inline-flex items-center gap-1">
                <MapPin className="w-3 h-3 shrink-0" /> ECUADOR • Quito y Guayaquil
              </span>
            </div>
          </div>
        );

      case 'PA':
        return (
          <div className="relative w-full h-full flex flex-col items-center justify-center p-3 animate-fade-in bg-stone-50/50 rounded-xl border border-stone-200/60 shadow-inner">
            <svg viewBox="0 0 240 140" className="w-full h-[180px] text-brand-gold drop-shadow-[0_4px_12px_rgba(181,148,91,0.15)]">
              {/* Outer boundary of Panama shape (Horizontal Bridge) */}
              <path
                d="M15,70 C30,60 45,75 60,65 C75,55 90,60 110,65 C130,70 145,50 165,55 C185,60 205,45 220,55 C230,60 225,80 215,85 C200,90 190,80 175,85 C160,90 145,100 130,90 C115,80 100,95 85,90 C70,85 55,95 40,85 C25,75 10,80 15,70 Z"
                fill="url(#goldPattern)"
                stroke="#B5945B"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Panama Canal dotted indicator */}
              <line x1="140" y1="35" x2="135" y2="105" stroke="#B5945B" strokeWidth="1" strokeDasharray="2 2" opacity="0.6" />
              <text x="145" y="42" className="text-[7.5px] font-mono fill-brand-gold-dark font-extrabold uppercase">Canal de Panamá</text>

              {/* Ciudad de Panamá */}
              <g className="translate-x-[150px] translate-y-[60px]">
                <circle r="6" fill="#8A631F" className="animate-ping" opacity="0.75" />
                <circle r="4.5" fill="#B5945B" stroke="#ffffff" strokeWidth="1" />
              </g>
              <defs>
                <linearGradient id="goldPattern" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#FFFBEB" />
                  <stop offset="60%" stopColor="#FEF3C7" />
                  <stop offset="100%" stopColor="#FDE68A" stopOpacity="0.4" />
                </linearGradient>
              </defs>
            </svg>
            <div className="mt-2 text-center">
              <span className="text-[10px] font-mono uppercase bg-amber-100 text-[#8A631F] font-bold px-2 py-0.5 rounded-full select-none inline-flex items-center gap-1">
                <MapPin className="w-3 h-3 shrink-0" /> PANAMÁ • Ciudad de Panamá y Zona Canal
              </span>
            </div>
          </div>
        );

      case 'ES':
        return (
          <div className="relative w-full h-full flex flex-col items-center justify-center p-3 animate-fade-in bg-stone-50/50 rounded-xl border border-stone-200/60 shadow-inner">
            <svg viewBox="0 0 220 200" className="w-full h-[180px] text-brand-gold drop-shadow-[0_4px_12px_rgba(181,148,91,0.15)]">
              {/* Outer boundary of Spain outline */}
              <path
                d="M30,30 C60,25 90,20 120,25 C140,28 170,15 185,25 C195,35 190,55 200,75 C210,95 205,115 195,130 C185,145 170,165 150,175 C130,185 110,180 90,175 C80,172 60,175 50,165 C35,150 45,130 40,115 C35,100 20,95 15,85 C10,75 15,50 30,30 Z"
                fill="url(#goldPattern)"
                stroke="#B5945B"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Madrid Capital */}
              <g className="translate-x-[110px] translate-y-[90px]">
                <circle r="6" fill="#8A631F" className="animate-ping" opacity="0.75" />
                <circle r="4.5" fill="#B5945B" stroke="#ffffff" strokeWidth="1" />
              </g>
              {/* Barcelona */}
              <g className="translate-x-[180px] translate-y-[65px]">
                <circle r="5" fill="#8A631F" className="animate-ping" opacity="0.5" />
                <circle r="3.5" fill="#8A631F" stroke="#ffffff" strokeWidth="0.75" />
              </g>
              <defs>
                <linearGradient id="goldPattern" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#FFFBEB" />
                  <stop offset="60%" stopColor="#FEF3C7" />
                  <stop offset="100%" stopColor="#FDE68A" stopOpacity="0.4" />
                </linearGradient>
              </defs>
            </svg>
            <div className="mt-2 text-center">
              <span className="text-[10px] font-mono uppercase bg-amber-100 text-[#8A631F] font-bold px-2 py-0.5 rounded-full select-none inline-flex items-center gap-1">
                <MapPin className="w-3 h-3 shrink-0" /> ESPAÑA • Madrid, Barcelona y Conexión Europa
              </span>
            </div>
          </div>
        );

      case 'US':
        return (
          <div className="relative w-full h-full flex flex-col items-center justify-center p-3 animate-fade-in bg-stone-50/50 rounded-xl border border-stone-200/60 shadow-inner">
            <svg viewBox="0 0 240 160" className="w-full h-[180px] text-brand-gold drop-shadow-[0_4px_12px_rgba(181,148,91,0.15)]">
              {/* Outline silhouette for United States */}
              <path
                d="M10,40 C30,35 60,35 80,42 C100,38 120,42 140,40 C160,35 180,30 200,32 C215,34 225,45 230,55 C232,70 220,80 225,95 C230,110 215,120 205,125 C195,122 180,128 170,120 C160,115 145,130 135,125 C120,120 100,125 80,120 C60,118 40,128 25,120 C15,115 12,95 20,85 C28,75 22,65 15,55 C10,50 8,45 10,40 Z"
                fill="url(#goldPattern)"
                stroke="#B5945B"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Miami Spark */}
              <g className="translate-x-[200px] translate-y-[115px]">
                <circle r="5" fill="#8A631F" className="animate-ping" opacity="0.6" />
                <circle r="3.5" fill="#B5945B" stroke="#ffffff" strokeWidth="0.75" />
              </g>
              {/* NY Spark */}
              <g className="translate-x-[215px] translate-y-[55px]">
                <circle r="6" fill="#8A631F" className="animate-ping" opacity="0.75" />
                <circle r="4" fill="#B5945B" stroke="#ffffff" strokeWidth="1" />
              </g>
              <defs>
                <linearGradient id="goldPattern" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#FFFBEB" />
                  <stop offset="60%" stopColor="#FEF3C7" />
                  <stop offset="100%" stopColor="#FDE68A" stopOpacity="0.4" />
                </linearGradient>
              </defs>
            </svg>
            <div className="mt-2 text-center">
              <span className="text-[10px] font-mono uppercase bg-amber-100 text-[#8A631F] font-bold px-2 py-0.5 rounded-full select-none inline-flex items-center gap-1">
                <MapPin className="w-3 h-3 shrink-0" /> ESTADOS UNIDOS • Inversionistas en Florida, NY y Texas
              </span>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="w-full relative overflow-hidden transition-all duration-300">
      {renderMap()}
    </div>
  );
}
