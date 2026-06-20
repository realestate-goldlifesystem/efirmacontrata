import React, { useState, useEffect } from 'react';
import { ArrowLeft, CalendarCheck, MapPin, Phone, User, Mail, Send, Calendar, Clock, Loader2, CheckCircle } from 'lucide-react';
import PhoneCountrySelector from './PhoneCountrySelector';
import { ALL_COUNTRIES } from './PhoneCountrySelector';

const API_URL = 'https://script.google.com/macros/s/AKfycbxpJ8w_XR5dUhIv1VTuV3ZDjHm-vtz13B5RlyfiLqI9ypZnIuzuUL39_GDHpBisL2oW/exec';

interface ScheduleVisitFormProps {
  onBack: () => void;
}

interface TimeSlot {
  horaString: string;
  horaAmPm: string;
  timestamp: number;
}

export default function ScheduleVisitForm({ onBack }: ScheduleVisitFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    countryCode: '+57',
    phone: '',
    email: '',
    address: '',
    serviceType: 'Venta',
    detalles: '',
  });

  // Calendar State
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [slotMessage, setSlotMessage] = useState('');

  // Form State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Config dates
  const today = new Date();
  // Set minimum date to tomorrow
  const minDate = new Date();
  minDate.setDate(today.getDate() + 1);
  const minDateString = minDate.toISOString().split('T')[0];

  useEffect(() => {
    if (selectedDate) {
      fetchSlots(selectedDate);
    } else {
      setAvailableSlots([]);
      setSelectedSlot(null);
      setSlotMessage('');
    }
  }, [selectedDate]);

  const fetchSlots = async (dateStr: string) => {
    setIsLoadingSlots(true);
    setAvailableSlots([]);
    setSelectedSlot(null);
    setErrorMessage('');
    
    // Asumiendo que la hora debe ser interpretada localmente, pasamos T08:00:00 para la solicitud
    const fechaAEnviar = `${dateStr}T08:00:00`;

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          accion: 'obtenerDisponibilidad',
          fecha: fechaAEnviar
        })
      });

      const data = await response.json();
      if (data.success) {
        if (data.libre && data.slots.length > 0) {
          setAvailableSlots(data.slots);
          setSlotMessage('');
        } else {
          setSlotMessage(data.motivo || 'No hay horarios disponibles para esta fecha.');
        }
      } else {
        setSlotMessage('Error al consultar disponibilidad: ' + (data.error || 'Intente de nuevo.'));
      }
    } catch (err) {
      setSlotMessage('Error de red al conectar con el servidor.');
    } finally {
      setIsLoadingSlots(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!selectedSlot) {
      setErrorMessage('Por favor, selecciona un horario para tu cita.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          accion: 'agendarCita',
          nombreCliente: formData.name,
          celular: `${formData.countryCode} ${formData.phone}`,
          correo: formData.email,
          tipoServicio: formData.serviceType,
          direccion: formData.address,
          detalles: formData.detalles,
          fechaTimestamp: selectedSlot.timestamp
        })
      });

      const data = await response.json();

      if (data.success) {
        setIsSuccess(true);
      } else {
        setErrorMessage(data.error || 'Ocurrió un error al agendar la cita. Por favor intenta más tarde.');
      }
    } catch (error) {
      setErrorMessage('Error de red. No pudimos conectar con el servidor de agendamiento.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-stone-50 py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden flex items-center justify-center">
        <div className="bg-white rounded-3xl shadow-xl border border-stone-200 overflow-hidden max-w-md w-full p-8 text-center relative z-10 animate-fade-in">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-3xl font-extrabold text-stone-900 font-serif italic mb-4">¡Cita Confirmada!</h2>
          <p className="text-stone-600 mb-8">
            Hemos reservado tu espacio en nuestra agenda oficial de Google Calendar. Recibirás una invitación formal en tu correo electrónico con todos los detalles.
          </p>
          <button
            onClick={onBack}
            className="w-full bg-brand-gold hover:bg-brand-gold-dark text-stone-950 font-bold py-4 rounded-xl transition-all shadow-md active:scale-95"
          >
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Decorative background */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-gold/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-brand-dark-deep/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-4xl mx-auto relative z-10">
        <button
          onClick={onBack}
          className="fixed top-24 left-4 sm:left-8 z-50 inline-flex items-center space-x-2 bg-white/90 backdrop-blur-sm text-stone-700 hover:text-brand-gold hover:bg-white border border-stone-200 px-4 py-2 rounded-full shadow-md transition-all font-semibold text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Volver al inicio</span>
          <span className="sm:hidden">Volver</span>
        </button>

        <div className="bg-white rounded-3xl shadow-xl border border-stone-200 overflow-hidden flex flex-col md:flex-row">
          
          {/* LADO IZQUIERDO: DETALLES Y HORARIO */}
          <div className="bg-brand-dark-deep p-8 md:w-5/12 text-white relative">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20"></div>
            
            <div className="relative z-10">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-brand-gold/20 rounded-full mb-6">
                <CalendarCheck className="w-7 h-7 text-brand-gold" />
              </div>
              <h2 className="text-3xl font-extrabold font-serif italic mb-2">Agendar Visita</h2>
              <p className="text-stone-300 text-sm mb-10 leading-relaxed">
                Elige el momento perfecto para que uno de nuestros Agentes Premium evalúe tu propiedad de manera presencial o atienda tu requerimiento.
              </p>

              <div className="space-y-6">
                <div>
                  <label className="text-xs font-bold text-brand-gold block mb-2 tracking-wider">1. SELECCIONA LA FECHA</label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
                    <input
                      type="date"
                      min={minDateString}
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 bg-stone-800/50 border border-stone-600 rounded-xl focus:border-brand-gold focus:ring-1 focus:ring-brand-gold outline-none transition-all text-white text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-brand-gold block mb-2 tracking-wider">2. HORARIOS DISPONIBLES</label>
                  
                  {isLoadingSlots ? (
                    <div className="flex items-center justify-center py-6 text-stone-400 bg-stone-800/30 rounded-xl border border-stone-700 border-dashed">
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                      <span className="text-sm">Buscando en agenda...</span>
                    </div>
                  ) : slotMessage ? (
                    <div className="text-center py-6 text-stone-400 bg-stone-800/30 rounded-xl border border-stone-700 border-dashed px-4 text-sm">
                      {slotMessage}
                    </div>
                  ) : availableSlots.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                      {availableSlots.map((slot) => (
                        <button
                          key={slot.timestamp}
                          type="button"
                          onClick={() => setSelectedSlot(slot)}
                          className={`py-2 px-3 rounded-lg text-sm font-semibold border transition-all flex items-center justify-center ${
                            selectedSlot?.timestamp === slot.timestamp
                              ? 'bg-brand-gold text-stone-900 border-brand-gold shadow-md scale-[1.02]'
                              : 'bg-stone-800/50 text-stone-300 border-stone-600 hover:border-brand-gold/50 hover:bg-stone-800'
                          }`}
                        >
                          <Clock className="w-3 h-3 mr-2 opacity-70" />
                          {slot.horaAmPm}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-stone-500 bg-stone-800/30 rounded-xl border border-stone-700 border-dashed text-sm italic">
                      Selecciona una fecha primero
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* LADO DERECHO: FORMULARIO */}
          <form onSubmit={handleSubmit} className="p-8 md:w-7/12 space-y-6 bg-white relative">
            <h3 className="text-lg font-bold text-stone-800 mb-4 border-b border-stone-100 pb-2">3. TUS DATOS</h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-stone-500 block mb-1">NOMBRES Y APELLIDOS</label>
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
                  <label className="text-xs font-bold text-stone-500 block mb-1">CELULAR</label>
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
                  <label className="text-xs font-bold text-stone-500 block mb-1">CORREO ELECTRÓNICO</label>
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
                <label className="text-xs font-bold text-stone-500 block mb-1">SERVICIO DE INTERÉS</label>
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

              <div>
                <label className="text-xs font-bold text-stone-500 block mb-1">DIRECCIÓN O BARRIO (OPCIONAL)</label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Ej. Barrio Chicó, Carrera 11..."
                    className="w-full pl-11 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:border-brand-gold focus:ring-1 focus:ring-brand-gold outline-none transition-all text-sm"
                  />
                </div>
              </div>
              
              <div>
                <label className="text-xs font-bold text-stone-500 block mb-1">NOTAS / DETALLES ADICIONALES (OPCIONAL)</label>
                <textarea
                  value={formData.detalles}
                  onChange={(e) => setFormData({ ...formData, detalles: e.target.value })}
                  placeholder="Ej. Favor tocar el timbre 2, o preferiblemente llegar por la avenida..."
                  className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:border-brand-gold focus:ring-1 focus:ring-brand-gold outline-none transition-all text-sm resize-none h-20 custom-scrollbar"
                />
              </div>

            </div>

            {errorMessage && (
              <div className="p-4 bg-red-50 text-red-700 text-sm rounded-xl border border-red-100 flex items-start">
                <span className="block mt-0.5 mr-2">⚠️</span>
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="pt-4 border-t border-stone-100">
              <button
                type="submit"
                disabled={isSubmitting || !selectedSlot}
                className={`w-full flex items-center justify-center space-x-2 py-4 rounded-xl transition-all shadow-lg font-bold text-sm ${
                  isSubmitting || !selectedSlot
                    ? 'bg-stone-200 text-stone-400 cursor-not-allowed shadow-none'
                    : 'bg-brand-gold hover:bg-brand-gold-dark text-stone-950 hover:shadow-brand-gold/20 active:scale-[0.98] cursor-pointer'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Agendando y sincronizando Calendar...</span>
                  </>
                ) : (
                  <>
                    <span>Confirmar Cita Oficial</span>
                    <Send className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: rgba(212, 175, 55, 0.3);
          border-radius: 10px;
        }
        .custom-scrollbar:hover::-webkit-scrollbar-thumb {
          background-color: rgba(212, 175, 55, 0.6);
        }
      `}</style>
    </div>
  );
}
