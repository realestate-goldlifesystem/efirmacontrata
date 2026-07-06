/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import ColombiaStats from './components/ColombiaStats';
import ServicesDetailed from './components/ServicesDetailed';
import LandlordCalculator from './components/LandlordCalculator';
import PropertyListings from './components/PropertyListings';
import RegisterPropertyForm from './components/RegisterPropertyForm';
import Testimonials from './components/Testimonials';
import PartnersAndContact from './components/PartnersAndContact';
import Footer from './components/Footer';
import LoginRolesModal from './components/LoginRolesModal';
import ScheduleVisitForm from './components/ScheduleVisitForm';
import AgentDashboard from './components/AgentDashboard';

export default function App() {
  const [selectedServiceType, setSelectedServiceType] = useState<'corretaje' | 'administracion' | 'venta' | 'vendi-renta' | 'admi-venta' | null>(null);
  const [showRegisterPage, setShowRegisterPage] = useState(() => {
    try {
      return !!localStorage.getItem('registerPropertyCurrentStep');
    } catch {
      return false;
    }
  });
  const [initialCalculatorState, setInitialCalculatorState] = useState<{
    rentPrice: number;
    isMultiProperty: boolean;
    includesHoa: boolean;
    hoaPrice: number;
    isUpsellActive: boolean;
  } | null>(null);

  const [showRolesModal, setShowRolesModal] = useState(false);
  const [showScheduleVisit, setShowScheduleVisit] = useState(false);
  const [showCalculatorPage, setShowCalculatorPage] = useState(false);
  const [isAgentLoggedIn, setIsAgentLoggedIn] = useState(() => {
    try {
      return !!localStorage.getItem('registerPropertyCurrentStep');
    } catch {
      return false;
    }
  }); 

  const scrollToSection = (sectionId: string) => {
    if (showRegisterPage) {
      setShowRegisterPage(false);
      // Wait for React to re-mount other sections before scrolling
      setTimeout(() => {
        const el = document.getElementById(sectionId);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 150);
    } else {
      const el = document.getElementById(sectionId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  const handleSelectServiceType = (
    service: 'corretaje' | 'administracion' | 'venta' | 'vendi-renta' | 'admi-venta',
    details?: {
      rentPrice: number;
      isMultiProperty: boolean;
      includesHoa: boolean;
      hoaPrice: number;
      isUpsellActive: boolean;
    }
  ) => {
    setSelectedServiceType(service);
    if (details) {
      setInitialCalculatorState(details);
    } else {
      setInitialCalculatorState(null);
    }
    
    if (isAgentLoggedIn) {
      setShowRegisterPage(true); // Direct to form if they clicked a specific package
      window.scrollTo({ top: 0, behavior: 'instant' });
    } else {
      setShowRolesModal(true);
    }
  };

  const handleOpenRegisterForm = () => {
    setSelectedServiceType('administracion');
    setInitialCalculatorState(null);
    
    if (isAgentLoggedIn) {
      // Just let them see the dashboard instead of forcing the form
      setShowRegisterPage(false);
      setShowCalculatorPage(false);
      window.scrollTo({ top: 0, behavior: 'instant' });
    } else {
      setShowRolesModal(true);
    }
  };

  return (
    <div className="bg-brand-dark text-stone-800 min-h-screen selection:bg-amber-400 selection:text-stone-950">
      
      {/* Premium Navigation Header */}
      <Navbar 
        onScrollTo={scrollToSection} 
        onOpenRegisterForm={handleOpenRegisterForm} 
      />

      {/* Main Sections */}
      <main>
        {showScheduleVisit ? (
          <div className="pt-24 animate-fade-in">
            <ScheduleVisitForm 
              onBack={() => {
                setShowScheduleVisit(false);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
          </div>
        ) : showCalculatorPage ? (
          <div className="pt-24 animate-fade-in flex items-center justify-center min-h-[60vh]">
            {/* TODO: Implementar InversorCalculator */}
            <div className="text-center text-white bg-stone-900 p-12 rounded-3xl border border-brand-gold">
              <h2 className="text-3xl font-light text-brand-gold mb-4">Calculadora en Construcción 🚧</h2>
              <p className="text-stone-400 mb-8">Estamos forjando la herramienta de cálculo más potente del mercado PropTech.</p>
              <button 
                onClick={() => setShowCalculatorPage(false)}
                className="px-6 py-2 bg-brand-gold text-stone-950 font-semibold rounded-full hover:bg-amber-400 transition"
              >
                Volver al Panel
              </button>
            </div>
          </div>
        ) : showRegisterPage ? (
          /* Independent, gamified property registration view with live accounting/yield computations */
          <div className="pt-24 animate-fade-in">
            <RegisterPropertyForm 
              selectedServiceType={selectedServiceType} 
              initialCalculatorState={initialCalculatorState}
              onBack={() => {
                setShowRegisterPage(false);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
          </div>
        ) : isAgentLoggedIn ? (
          <div className="pt-24 animate-fade-in">
            <AgentDashboard 
              onOpenForm={() => {
                setShowRegisterPage(true);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onOpenCalculator={() => {
                setShowCalculatorPage(true);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onLogout={() => {
                setIsAgentLoggedIn(false);
                setShowRegisterPage(false);
                setShowCalculatorPage(false);
              }}
            />
          </div>
        ) : (
          /* Normal Landing Page Sections */
          <>
            {/* Modern Hero Showcase */}
            <Hero 
              onScrollTo={scrollToSection} 
              onOpenRegisterForm={handleOpenRegisterForm} 
            />

            {/* Detailed Services Tab Comparative Structure */}
            <ServicesDetailed 
              onScrollTo={scrollToSection}
              onSelectServiceType={handleSelectServiceType}
            />

            {/* Interactive Stats Dashboard comparing risks vs solutions */}
            <ColombiaStats />

            {/* Dynamic Calculator for rent yields in Colombia */}
            <LandlordCalculator 
              onScrollTo={scrollToSection}
              onSelectServiceType={handleSelectServiceType}
            />

            {/* Sales & Rentals Catalog Portfolio */}
            <PropertyListings />

            {/* Copropietarios Reviews and ratings slider */}
            <Testimonials />

            {/* Partners Assurances Badges and Direct Contacts */}
            <PartnersAndContact 
              onOpenRegisterForm={handleOpenRegisterForm}
            />
          </>
        )}
      </main>

      {/* Footer Branded Layout */}
      <Footer />

      {/* Modals & Portals */}
      {showRolesModal && (
        <LoginRolesModal 
          onClose={() => setShowRolesModal(false)}
          onSelectAgent={() => {
            setIsAgentLoggedIn(true);
            setShowRolesModal(false);
            // Ya no forzamos showRegisterPage(true), dejamos que caiga en el Dashboard
            setShowRegisterPage(false);
            setShowCalculatorPage(false);
            window.scrollTo({ top: 0, behavior: 'instant' });
          }}
          onSelectOwner={() => {
            setShowRolesModal(false);
            setShowScheduleVisit(true);
            window.scrollTo({ top: 0, behavior: 'instant' });
          }}
        />
      )}

    </div>
  );
}
