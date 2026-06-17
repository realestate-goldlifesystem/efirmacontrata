/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { Home, Calculator, Phone, Menu, X, Landmark, Layers, User } from 'lucide-react';

interface NavbarProps {
  onScrollTo: (sectionId: string) => void;
  onOpenRegisterForm: () => void;
}

export default function Navbar({ onScrollTo, onOpenRegisterForm }: NavbarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems = [
    { label: 'Inicio', icon: Home, targetId: 'inicio' },
    { label: 'Servicios', icon: Layers, targetId: 'servicios' },
    { label: 'Estadísticas del Sector', icon: Landmark, targetId: 'estadisticas' },
    { label: 'Calculadora de Rentabilidad', icon: Calculator, targetId: 'calculadora' },
    { label: 'Catálogo de Venta', icon: Home, targetId: 'catalogo' },
  ];

  const handleNavClick = (id: string) => {
    onScrollTo(id);
    setIsOpen(false);
  };

  return (
    <nav
      id="main-nav"
      className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-brand-dark-deep/95 backdrop-blur-md shadow-md border-b border-stone-200 py-3'
          : 'bg-transparent py-5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo Brand */}
          <div className="flex-shrink-0 cursor-pointer flex items-center space-x-2" onClick={() => handleNavClick('inicio')}>
            <div className="relative">
              <span className="text-2xl font-bold tracking-wider text-brand-gold font-sans">
                GOLD<span className="text-stone-900 font-light text-xl">Life</span>
              </span>
              <span className="absolute -bottom-2.5 left-0 text-[8px] tracking-[0.4em] text-brand-gold-dark uppercase font-mono font-medium">
                Real Estate
              </span>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center space-x-8">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  id={`nav-link-${item.targetId}`}
                  onClick={() => handleNavClick(item.targetId)}
                  className="text-stone-700 hover:text-brand-gold text-sm font-medium transition-colors duration-200 cursor-pointer flex items-center space-x-1"
                >
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Action buttons */}
          <div className="hidden lg:flex items-center space-x-4">
            <a
              id="cta-navbar-whatsapp"
              href="https://wa.me/573000000000?text=Hola%20Gold%20Life,%20quiero%20conocer%20más%20sobre%20el%20portafolio%20de%20servicios."
              target="_blank"
              rel="noopener noreferrer"
              className="border border-stone-300 text-stone-700 hover:text-brand-gold hover:border-brand-gold hover:bg-brand-dark px-4 py-2 rounded-md text-sm transition-all cursor-pointer flex items-center space-x-1"
            >
              <Phone className="w-4 h-4 text-brand-gold" />
              <span>WhatsApp</span>
            </a>
            <button
              id="cta-navbar-login"
              onClick={onOpenRegisterForm}
              className="bg-brand-gold hover:bg-brand-gold-dark text-stone-950 font-semibold px-4 py-2 rounded-md text-sm transition-all shadow-md active:scale-95 cursor-pointer flex items-center space-x-1.5"
            >
              <User className="w-4 h-4" />
              <span>Acceso Portal</span>
            </button>
          </div>

          {/* Mobile menu button */}
          <div className="flex md:hidden">
            <button
              id="mobile-menu-toggle"
              onClick={() => setIsOpen(!isOpen)}
              className="text-stone-700 hover:text-brand-gold p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-inset focus:ring-brand-gold cursor-pointer"
            >
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Panel */}
      {isOpen && (
        <div id="mobile-menu-panel" className="md:hidden bg-brand-dark-deep border-b border-stone-200 px-4 pt-2 pb-6 space-y-3 transition-all">
          <div className="space-y-1">
            {navItems.map((item) => (
              <button
                key={item.label}
                id={`mobile-nav-link-${item.targetId}`}
                onClick={() => handleNavClick(item.targetId)}
                className="w-full text-left block text-stone-700 hover:text-brand-gold py-2.5 px-3 rounded-md text-base font-medium hover:bg-stone-100 cursor-pointer"
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="pt-4 border-t border-stone-200 space-y-2.5">
            <button
              id="mobile-cta-register"
              onClick={() => {
                onOpenRegisterForm();
                setIsOpen(false);
              }}
              className="w-full bg-brand-gold hover:bg-brand-gold-dark text-stone-950 font-semibold py-3 px-4 rounded-md flex items-center justify-center space-x-2 text-sm transition-all cursor-pointer"
            >
              <User className="w-4 h-4" />
              <span>Acceso Portal</span>
            </button>
            <a
              id="mobile-cta-whatsapp"
              href="https://wa.me/573000000000?text=Hola%20Gold%20Life,%20quiero%20conocer%20más%20sobre%20el%20portafolio%20de%20servicios."
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-stone-100 border border-stone-250 text-stone-700 hover:text-stone-900 py-3 px-4 rounded-md flex items-center justify-center space-x-2 text-sm transition-all cursor-pointer"
            >
              <Phone className="w-4 h-4 text-brand-gold" />
              <span>Contactar por WhatsApp</span>
            </a>
          </div>
        </div>
      )}
    </nav>
  );
}
