import { useState } from 'react';
import { ArrowLeft, CalendarCheck, MapPin, Phone, User, Mail, Send } from 'lucide-react';
import PhoneCountrySelector from './PhoneCountrySelector';
import { ALL_COUNTRIES } from './PhoneCountrySelector';

interface ScheduleVisitFormProps {
  onBack: () => void;
}

export default function ScheduleVisitForm({ onBack }: ScheduleVisitFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    countryCode: '+57',
    phone: '',
    email: '',
    address: '',
    serviceType: 'Venta',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // MVP: Send via WhatsApp
    const textMsg = `Hola Gold Life Real Estate, soy ${formData.name} y me gustaría agendar una visita para mi propiedad.

📍 *Dirección/Zona:* ${formData.address}
💼 *Servicio de Interés:* ${formData.serviceType}
📞 *Celular:* ${formData.countryCode} ${formData.phone}
✉️ *Correo:* ${formData.email}

Quedo atento para coordinar la fecha y hora de la visita con un agente especializado.`;

    // Opens WhatsApp in a new tab
    window.open(`https://wa.me/573000000000?text=${encodeURIComponent(textMsg)}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-stone-50 py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Decorative background */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-gold/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-brand-dark-deep/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-2xl mx-auto relative z-10">
        <button
          onClick={onBack}
          className="inline-flex items-center space-x-2 text-stone-500 hover:text-stone-900 mb-8 transition-colors font-semibold"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Volver al inicio</span>
        </button>

        <div className="bg-white rounded-3xl shadow-xl border border-stone-200 overflow-hidden">
          <div className="bg-brand-dark-deep p-8 text-center border-b-4 border-brand-gold">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-brand-gold/20 rounded-full mb-4">
              <CalendarCheck className="w-8 h-8 text-brand-gold" />
            </div>
            <h2 className="text-3xl font-extrabold text-white font-serif italic mb-2">Agendar Visita</h2>
            <p className="text-stone-400 text-sm max-w-md mx-auto">
              Déjanos tus datos y un Agente Premium de Gold Life se comunicará contigo para coordinar una visita a tu propiedad.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">NOMBRES Y APELLIDOS</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Juan Pérez"
                    className="w-full pl-11 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:border-brand-gold focus:ring-1 focus:ring-brand-gold outline-none transition-all text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">CELULAR</label>
                  <div className="flex bg-stone-50 border border-stone-200 rounded-xl focus-within:border-brand-gold focus-within:ring-1 focus-within:ring-brand-gold transition-all">
                    <PhoneCountrySelector
                      value={formData.countryCode}
                      onChange={(code) => setFormData({ ...formData, countryCode: code })}
                    />
                    <input
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '') })}
                      placeholder="Número"
                      maxLength={ALL_COUNTRIES.find(c => c.code === formData.countryCode)?.maxLength || 10}
                      className="w-full bg-transparent py-3 px-3 text-sm font-mono outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">CORREO ELECTRÓNICO</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="correo@ejemplo.com"
                      className="w-full pl-11 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:border-brand-gold focus:ring-1 focus:ring-brand-gold outline-none transition-all text-sm"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">DIRECCIÓN O BARRIO DEL INMUEBLE</label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
                  <input
                    type="text"
                    required
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Ej. Barrio Chicó, Carrera 11..."
                    className="w-full pl-11 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:border-brand-gold focus:ring-1 focus:ring-brand-gold outline-none transition-all text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">SERVICIO DE INTERÉS</label>
                <select
                  value={formData.serviceType}
                  onChange={(e) => setFormData({ ...formData, serviceType: e.target.value })}
                  className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:border-brand-gold focus:ring-1 focus:ring-brand-gold outline-none transition-all text-sm cursor-pointer"
                >
                  <option value="Venta">Venta (Corretaje Inmobiliario)</option>
                  <option value="Arriendo">Arriendo (Corretaje Inmobiliario)</option>
                  <option value="Administración">Administración Integral de Inmuebles</option>
                  <option value="Vendi-Renta">Vendi-Renta (Doble promoción)</option>
                  <option value="Admi-Venta">Admi-Venta (Administración con opción de venta)</option>
                </select>
              </div>
            </div>

            <div className="pt-6 border-t border-stone-100">
              <button
                type="submit"
                className="w-full flex items-center justify-center space-x-2 bg-brand-gold hover:bg-brand-gold-dark text-stone-950 font-bold py-4 rounded-xl transition-all shadow-lg hover:shadow-brand-gold/20 active:scale-[0.98] cursor-pointer"
              >
                <span>Enviar Solicitud a WhatsApp</span>
                <Send className="w-5 h-5" />
              </button>
              <p className="text-center text-[10px] text-stone-400 mt-4 max-w-sm mx-auto">
                En la siguiente fase del desarrollo, este botón conectará automáticamente con Google Calendar y generará un enlace único para el agente.
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
