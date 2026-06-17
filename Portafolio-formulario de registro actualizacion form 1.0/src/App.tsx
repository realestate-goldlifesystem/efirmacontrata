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

export default function App() {
  const [selectedServiceType, setSelectedServiceType] = useState<'corretaje' | 'administracion' | 'venta' | 'vendi-renta' | 'admi-venta' | null>(null);
  const [showRegisterPage, setShowRegisterPage] = useState(false);
  const [initialCalculatorState, setInitialCalculatorState] = useState<{
    rentPrice: number;
    isMultiProperty: boolean;
    includesHoa: boolean;
    hoaPrice: number;
    isUpsellActive: boolean;
  } | null>(null);

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
    setShowRegisterPage(true);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const handleOpenRegisterForm = () => {
    setSelectedServiceType('administracion');
    setInitialCalculatorState(null);
    setShowRegisterPage(true);
    window.scrollTo({ top: 0, behavior: 'instant' });
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
        {showRegisterPage ? (
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

    </div>
  );
}
