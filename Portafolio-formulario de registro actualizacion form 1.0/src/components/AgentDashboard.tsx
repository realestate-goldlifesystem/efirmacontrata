import React, { useState } from 'react';
import { Calculator, ClipboardList, LogOut, Landmark, X, Building2, ArrowLeft, Bot, Route, CheckCircle2 } from 'lucide-react';
import VIPPropertiesPanel from './VIPPropertiesPanel';
import MiguelCaptadorModal from './MiguelCaptadorModal';

interface AgentDashboardProps {
  onOpenForm: () => void;
  onOpenCalculator: () => void;
  onLogout: () => void;
  /** Token de Google del agente; Miguel lo reenvía para que el backend
   *  confirme el correo del lado del servidor. */
  agentCredential?: string | null;
}

export default function AgentDashboard({ onOpenForm, onOpenCalculator, onLogout, agentCredential = null }: AgentDashboardProps) {
  const [showSasModal, setShowSasModal] = useState(false);
  const [showMiguelModal, setShowMiguelModal] = useState(false);
  const [showGuiaCierreModal, setShowGuiaCierreModal] = useState(false);
  const [activeView, setActiveView] = useState<'menu' | 'portafolio'>('menu');

  if (activeView === 'portafolio') {
    return (
      <div className="min-h-screen bg-brand-dark animate-fade-in pb-20 relative">
        <button 
          onClick={() => setActiveView('menu')}
          className="fixed top-24 left-4 md:left-8 z-50 flex items-center gap-2 px-4 py-2 bg-stone-900 border border-stone-800 rounded-full text-stone-400 hover:text-brand-gold hover:border-brand-gold transition-all shadow-md"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="font-medium hidden md:inline">Volver al Panel</span>
        </button>
        <VIPPropertiesPanel />
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 bg-brand-dark animate-fade-in relative">
      
      {showSasModal && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-stone-700 w-full max-w-4xl rounded-2xl p-6 md:p-8 relative max-h-[90vh] overflow-y-auto animate-fade-in text-left">
            <button onClick={() => setShowSasModal(false)} className="absolute top-4 right-4 text-stone-500 hover:text-white bg-stone-800 p-2 rounded-full"><X className="w-5 h-5"/></button>
            <h2 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
              <Landmark className="w-8 h-8 text-brand-gold" /> Ingeniería Financiera SAS
            </h2>
            <p className="text-stone-400 text-base mb-8 border-b border-stone-800 pb-4">
              Cómo los grandes capitales utilizan las Sociedades por Acciones Simplificadas (SAS) para aportar inmuebles, mitigar impuestos y obtener liquidez en Colombia.
            </p>
            
            <div className="space-y-8">
              {/* Concepto Clave */}
              <section>
                <h3 className="text-xl font-semibold text-white mb-3 text-brand-gold">1. El Aporte en Especie (No es Donar, ni Vender)</h3>
                <p className="text-stone-300 text-sm leading-relaxed mb-3">
                  En el mundo empresarial, <strong>"Aportar a una sociedad"</strong> significa que el propietario entrega el inmueble a una empresa (ej. su propia SAS) y a cambio recibe <strong>Acciones</strong> de igual valor. 
                  Según el <strong>Artículo 319 del Estatuto Tributario</strong>, esta transacción es "neutral". Al no haber intercambio por dinero, la DIAN no lo considera una venta y la ganancia ocasional es <strong>$0</strong>.
                </p>
                <div className="bg-stone-950/50 p-4 rounded-xl border border-stone-800">
                  <span className="text-brand-gold font-bold text-sm block mb-1">Ejemplo Numérico:</span>
                  <p className="text-stone-400 text-xs">Tienes un edificio que te costó $1.000 Millones y hoy vale $5.000 Millones. Si se lo <em>donas</em> a tu hijo, él paga 15% sobre lo que recibe. Si lo <em>vendes</em> como persona natural, pagas 15% sobre $4.000 Millones de utilidad. Pero si lo <em>aportas</em> a tu SAS, recibes $5.000 Millones en acciones de tu SAS y pagas $0 de impuestos en esa transacción inicial.</p>
                </div>
              </section>

              {/* Como volverlo liquido */}
              <section>
                <h3 className="text-xl font-semibold text-white mb-3 text-sky-400">2. ¿Cómo se obtiene Liquidez (Efectivo)?</h3>
                <p className="text-stone-300 text-sm leading-relaxed mb-4">
                  Una vez que el inmueble está "envuelto" dentro de la SAS, existen 3 rutas principales para convertir esas acciones en dinero en efectivo real para el bolsillo del propietario:
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-sky-900/10 border border-sky-800/30 p-4 rounded-xl">
                    <h4 className="text-sky-300 font-bold mb-2">A. Vender la Empresa (El Atajo Ninja)</h4>
                    <p className="text-stone-400 text-xs mb-2">En lugar de vender el edificio, le vendes el 100% de las acciones de tu SAS al inversionista. Él te paga en efectivo y pasa a ser dueño de la SAS (que es dueña del edificio).</p>
                    <div className="bg-stone-950 p-2 rounded text-[11px] text-stone-500 border border-stone-800">
                      <strong className="text-sky-400">Beneficio:</strong> Te ahorras el 100% de los gastos de notaría y beneficencia (que en $5.000M serían casi $80 Millones tirados a la basura). Vender acciones es un contrato privado.
                    </div>
                  </div>

                  <div className="bg-emerald-900/10 border border-emerald-800/30 p-4 rounded-xl">
                    <h4 className="text-emerald-400 font-bold mb-2">B. Créditos Corporativos</h4>
                    <p className="text-stone-400 text-xs mb-2">La SAS pide un crédito comercial multimillonario poniendo el edificio como garantía hipotecaria. El banco suelta el efectivo a la empresa, y la empresa te lo entrega a ti (como préstamo o pago de dividendos).</p>
                    <div className="bg-stone-950 p-2 rounded text-[11px] text-stone-500 border border-stone-800">
                      <strong className="text-emerald-400">Beneficio:</strong> Tienes efectivo en mano, no pagas impuestos de venta, y los intereses de ese crédito los deduce la SAS de su propia declaración de renta.
                    </div>
                  </div>

                  <div className="bg-purple-900/10 border border-purple-800/30 p-4 rounded-xl md:col-span-2">
                    <h4 className="text-purple-400 font-bold mb-2">C. Flujo de Caja y Deducciones Mágicas</h4>
                    <p className="text-stone-400 text-xs mb-2">Si el edificio produce arriendos, la plata le entra a la SAS. La gran ventaja corporativa es que las empresas deducen <em>todo</em> (computadores, gasolina, contador, salarios, remodelaciones, depreciación, etc.).</p>
                    <div className="bg-stone-950 p-2 rounded text-[11px] text-stone-500 border border-stone-800">
                      <strong className="text-purple-400">Beneficio:</strong> La utilidad neta corporativa se exprime al máximo y tributa muchísimo menos que si recibieras esos arriendos como Persona Natural. El saldo limpio te lo sacas al final como dividendos.
                    </div>
                  </div>
                </div>
              </section>

            </div>
          </div>
        </div>
      )}

      {showGuiaCierreModal && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-stone-700 w-full max-w-4xl rounded-2xl p-6 md:p-8 relative max-h-[90vh] overflow-y-auto animate-fade-in text-left">
            <button onClick={() => setShowGuiaCierreModal(false)} className="absolute top-4 right-4 text-stone-500 hover:text-white bg-stone-800 p-2 rounded-full"><X className="w-5 h-5"/></button>
            <h2 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
              <Route className="w-8 h-8 text-brand-gold" /> Guía de Cierre de Venta
            </h2>
            <p className="text-stone-400 text-base mb-8 border-b border-stone-800 pb-4">
              Desde que un prospecto se interesa hasta la escritura registrada: qué hacer en cada paso, qué documentos se piden y quién paga qué, según la normatividad colombiana.
            </p>

            <div className="space-y-6">

              <section className="bg-stone-950/50 p-4 md:p-5 rounded-xl border border-stone-800">
                <h3 className="text-lg font-bold text-brand-gold mb-2 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5" /> 1. Antes de agendar la visita — precalificar
                </h3>
                <p className="text-stone-300 text-sm leading-relaxed">
                  Pregunta el medio de pago antes de coordinar cualquier visita: ¿contado o crédito hipotecario?, si es crédito ¿tiene carta de pre-aprobación o estudio con algún banco?, y el rango de presupuesto. Sin esto arriesgas el tiempo del propietario mostrando el inmueble a alguien que no puede comprarlo todavía.
                </p>
                <p className="text-stone-500 text-xs mt-2">Paga: nadie, es un filtro verbal tuyo de 2 minutos.</p>
              </section>

              <section className="bg-stone-950/50 p-4 md:p-5 rounded-xl border border-stone-800">
                <h3 className="text-lg font-bold text-brand-gold mb-2 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5" /> 2. Antes de publicar — estudio de títulos
                </h3>
                <p className="text-stone-300 text-sm leading-relaxed mb-2">
                  Se pide al captar el inmueble, no cuando ya hay comprador: descarga el <strong>Certificado de Tradición y Libertad</strong> con la matrícula inmobiliaria y verifica que el propietario sea el dueño real, y que no haya hipotecas, embargos o patrimonio de familia sin levantar. Si el título tiene un problema, te ahorras invertir en fotos, cartel y publicación.
                </p>
                <div className="bg-stone-950 p-2.5 rounded text-xs text-stone-400 border border-stone-800">
                  <strong className="text-brand-gold-light">Trámite:</strong> 100% en línea, en el portal de la Superintendencia de Notariado y Registro (SNR) o la VUR, con el número de matrícula. Sale al instante, no hay que ir a ninguna oficina.
                  <br /><strong className="text-brand-gold-light">Paga:</strong> el propietario (~$23.000–$30.000 COP) — es el gasto de estudio preliminar antes de promocionar.
                </div>
              </section>

              <section className="bg-stone-950/50 p-4 md:p-5 rounded-xl border border-stone-800">
                <h3 className="text-lg font-bold text-brand-gold mb-2 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5" /> 3. Llegó el interesado — oferta de compra
                </h3>
                <p className="text-stone-300 text-sm leading-relaxed">
                  Cuando el comprador precalificado dice que le interesa, formaliza precio, forma de pago y plazo propuesto — puede ser un WhatsApp o correo, no necesita ser un documento legal pesado. Es la bisagra entre "le gustó" y la promesa: confirma números antes de redactar nada extenso.
                </p>
              </section>

              <section className="bg-stone-950/50 p-4 md:p-5 rounded-xl border border-stone-800">
                <h3 className="text-lg font-bold text-brand-gold mb-2 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5" /> 4. Ambas partes de acuerdo — promesa de compraventa
                </h3>
                <p className="text-stone-300 text-sm leading-relaxed mb-2">
                  Documento entre comprador y vendedor (tú lo gestionas/redactas, no eres parte). Debe llevar, sin excepción (Art. 1611 C.C.):
                </p>
                <ul className="text-stone-400 text-sm space-y-1 list-disc list-inside mb-2">
                  <li>Identificación completa de comprador y vendedor</li>
                  <li>Matrícula inmobiliaria del inmueble</li>
                  <li>Precio total y forma de pago</li>
                  <li><strong>Arras</strong>: cuánto entrega el comprador como garantía y qué pasa si alguien se arrepiente (Art. 1859 C.C.)</li>
                  <li><strong>Fecha, hora y notaría exactas</strong> de la escritura — sin esto la promesa es nula</li>
                  <li>Cláusula de saneamiento</li>
                  <li>Autorización irrevocable de pago de tu comisión, descontada del dinero que se mueve aquí y en la escritura</li>
                </ul>
                <p className="text-stone-500 text-xs">Certificado de tradición nuevo (menor a 30 días): se vuelve a pedir aquí, porque el de la captación puede haberse quedado desactualizado.</p>
              </section>

              <section className="bg-stone-950/50 p-4 md:p-5 rounded-xl border border-stone-800">
                <h3 className="text-lg font-bold text-brand-gold mb-2 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5" /> 5. Entre la promesa y la escritura
                </h3>
                <p className="text-stone-300 text-sm leading-relaxed">
                  El comprador tramita el crédito si aplica, dentro del plazo pactado. Se coordina quién asume la <strong>retención en la fuente</strong> (practicada por el notario) y se reúnen los paz y salvos: predial del año vigente, valorización si aplica, y administración si es propiedad horizontal.
                </p>
              </section>

              <section className="bg-stone-950/50 p-4 md:p-5 rounded-xl border border-stone-800">
                <h3 className="text-lg font-bold text-brand-gold mb-2 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5" /> 6. Notaría — escritura pública y registro
                </h3>
                <p className="text-stone-300 text-sm leading-relaxed">
                  Se firma con cédulas originales, la promesa, el certificado de tradición actualizado y los paz y salvos. La venta no es legalmente perfecta hasta la escritura (Art. 1857 C.C.), y solo es oponible a terceros cuando la escritura queda <strong>registrada</strong> en la Oficina de Registro de Instrumentos Públicos (ORIP).
                </p>

                <div className="mt-4 pt-4 border-t border-stone-800">
                  <h4 className="text-sm font-bold text-stone-200 mb-2">Cómo se paga el registro y la beneficencia (paso a paso)</h4>
                  <ol className="text-stone-300 text-sm space-y-1.5 list-decimal list-inside">
                    <li><strong>Liquidar</strong> en el portal de la Secretaría de Hacienda del departamento (en Bogotá, la Secretaría Distrital de Hacienda) — calcula beneficencia y registro juntos, beneficencia primero.</li>
                    <li><strong>Pagar</strong> lo liquidado, normalmente por PSE.</li>
                    <li><strong>Presentar el recibo</strong> junto con la escritura en la ORIP del municipio donde está el inmueble. <strong>Sin el recibo, la ORIP no inscribe la escritura</strong> — la venta queda firmada pero no registrada.</li>
                  </ol>
                  <div className="mt-3 bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-xs text-amber-200 leading-relaxed">
                    <strong>¿Lo haces tú como agente?</strong> Puedes acompañar todo el trámite — no hay ninguna reserva legal que lo impida, y ya lo prometes en tu propia calculadora ("gestionamos la escritura sin cobros adicionales"). Pero no manejes tú el dinero del impuesto: que el comprador pague directamente por PSE con la liquidación que le generas, y tú te encargas de la parte operativa (portal, seguimiento, entregar el recibo en la ORIP).
                  </div>
                </div>
              </section>

              <section className="bg-sky-900/10 border border-sky-800/30 p-4 md:p-5 rounded-xl">
                <h3 className="text-lg font-bold text-sky-400 mb-3 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5" /> 6.1 Quién paga qué, y por qué
                </h3>
                <p className="text-stone-400 text-xs mb-4">
                  Así es <strong>lo normal</strong> en Colombia por costumbre notarial y por norma tributaria — no es una regla rígida: la promesa puede pactar otra repartición, pero si no dice nada, así se reparte.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Columna Comprador */}
                  <div className="bg-stone-950/60 border border-sky-800/40 rounded-xl overflow-hidden">
                    <div className="bg-sky-900/30 px-3.5 py-2 border-b border-sky-800/40">
                      <span className="text-xs font-bold text-sky-300 uppercase tracking-wide">Paga el Comprador</span>
                    </div>
                    <div className="p-3.5 space-y-3.5">
                      <div>
                        <div className="flex justify-between items-baseline">
                          <span className="text-sm font-semibold text-white">Derechos notariales (su mitad)</span>
                          <span className="text-[11px] font-mono text-sky-300">~0,27%</span>
                        </div>
                        <p className="text-[11px] text-stone-400 mt-0.5 leading-snug">Por qué: la escritura beneficia a ambos por igual, así que por costumbre se paga 50/50 con el vendedor.</p>
                      </div>
                      <div>
                        <div className="flex justify-between items-baseline">
                          <span className="text-sm font-semibold text-white">Impuesto de registro</span>
                          <span className="text-[11px] font-mono text-sky-300">0,5%–1%</span>
                        </div>
                        <p className="text-[11px] text-stone-400 mt-0.5 leading-snug">Por qué: es el trámite que lo inscribe a él como el nuevo dueño ante la ORIP — sin esto no es dueño frente a terceros, así que lo paga quien lo necesita.</p>
                      </div>
                      <div>
                        <div className="flex justify-between items-baseline">
                          <span className="text-sm font-semibold text-white">Sobretasa de beneficencia</span>
                          <span className="text-[11px] font-mono text-sky-300">~1%</span>
                        </div>
                        <p className="text-[11px] text-stone-400 mt-0.5 leading-snug">Por qué: impuesto departamental que grava el acto de adquirir el inmueble; se liquida junto al registro.</p>
                      </div>
                    </div>
                  </div>

                  {/* Columna Vendedor */}
                  <div className="bg-stone-950/60 border border-brand-gold/30 rounded-xl overflow-hidden">
                    <div className="bg-brand-gold/10 px-3.5 py-2 border-b border-brand-gold/30">
                      <span className="text-xs font-bold text-brand-gold uppercase tracking-wide">Paga el Vendedor</span>
                    </div>
                    <div className="p-3.5 space-y-3.5">
                      <div>
                        <div className="flex justify-between items-baseline">
                          <span className="text-sm font-semibold text-white">Derechos notariales (su mitad)</span>
                          <span className="text-[11px] font-mono text-brand-gold">~0,27%</span>
                        </div>
                        <p className="text-[11px] text-stone-400 mt-0.5 leading-snug">Por qué: la misma lógica del comprador — se reparte 50/50 salvo que la promesa diga otra cosa.</p>
                      </div>
                      <div>
                        <div className="flex justify-between items-baseline">
                          <span className="text-sm font-semibold text-white">Retención en la fuente</span>
                          <span className="text-[11px] font-mono text-brand-gold">1% / 2,5%</span>
                        </div>
                        <p className="text-[11px] text-stone-400 mt-0.5 leading-snug">Por qué: es un anticipo del impuesto que el vendedor debe declarar por la venta; el notario lo retiene antes de entregarle el dinero. 1% hasta 10.000 UVT (~$523.740.000 en 2026), 2,5% sobre el excedente (Decreto 572 de 2025).</p>
                      </div>
                      <div>
                        <div className="flex justify-between items-baseline">
                          <span className="text-sm font-semibold text-white">Ganancia ocasional</span>
                          <span className="text-[11px] font-mono text-brand-gold">15%</span>
                        </div>
                        <p className="text-[11px] text-stone-400 mt-0.5 leading-snug">Por qué: grava la utilidad real (venta menos compra) cuando tuvo el inmueble 2 años o más — es su ganancia, no la del comprador.</p>
                      </div>
                      <div>
                        <div className="flex justify-between items-baseline">
                          <span className="text-sm font-semibold text-white">Estudio de títulos</span>
                          <span className="text-[11px] font-mono text-brand-gold">~$23.000–$30.000</span>
                        </div>
                        <p className="text-[11px] text-stone-400 mt-0.5 leading-snug">Por qué: es el propietario quien se beneficia de vender sin sorpresas legales; se paga al captar, antes de invertir en promoción.</p>
                      </div>
                      <div>
                        <div className="flex justify-between items-baseline">
                          <span className="text-sm font-semibold text-white">Tu comisión</span>
                          <span className="text-[11px] font-mono text-brand-gold">Según tu acuerdo</span>
                        </div>
                        <p className="text-[11px] text-stone-400 mt-0.5 leading-snug">Por qué: quien contrata el servicio de intermediación es quien lo paga — lo fija el acuerdo de promoción que firmaste al captar.</p>
                      </div>
                    </div>
                  </div>
                </div>

                <p className="text-stone-500 text-[11px] mt-4 leading-relaxed">
                  💡 Ninguna de estas reglas es obligatoria por ley (salvo los impuestos, que sí lo son en su monto y en a quién corresponden declararlos). Lo único que la ley exige es que quede claro en algún documento — dejarlo explícito en la promesa evita discusiones el día de la firma.
                </p>
              </section>

              <section className="bg-emerald-900/10 border border-emerald-800/30 p-4 md:p-5 rounded-xl">
                <h3 className="text-lg font-bold text-emerald-400 mb-2 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5" /> 7. Tu comisión
                </h3>
                <p className="text-stone-300 text-sm leading-relaxed">
                  Según tu acuerdo de venta: 50% al firmar la promesa, 50% al firmar la escritura (o el calendario de crédito/arriendo si aplica). Con la cláusula de autorización de pago del paso 4, se descuenta directamente del dinero que se mueve en cada momento, en vez de depender de que el propietario te pague después por su cuenta.
                </p>
                <div className="mt-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 text-xs text-emerald-200 leading-relaxed">
                  <strong>Estás protegido si el negocio se cierra "por fuera":</strong> tu acuerdo tiene una cláusula de causa eficiente — si el propietario cierra directamente con un comprador que tú presentaste, contactaste o gestionaste, la comisión se sigue causando igual, sin importar cuánto tiempo haya pasado. No dependes de haber firmado tú mismo el negocio.
                </div>
              </section>

              <section className="bg-stone-950/50 p-4 md:p-5 rounded-xl border border-stone-800">
                <h3 className="text-lg font-bold text-brand-gold mb-2 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5" /> 8. Lo que sigue después de la escritura
                </h3>
                <p className="text-stone-300 text-sm leading-relaxed mb-2">
                  El negocio queda firmado y registrado, pero para el vendedor el cierre tributario no termina ese día:
                </p>
                <ul className="text-stone-400 text-sm space-y-1.5 list-disc list-inside">
                  <li><strong>Declaración de renta del año siguiente</strong> (se presenta entre agosto y octubre): ahí el vendedor declara la ganancia ocasional real. La retención que se pagó en la notaría es solo un <strong>anticipo</strong>, no el impuesto final.</li>
                  <li><strong>4×1000 (GMF):</strong> los movimientos bancarios grandes durante el cierre (cuota inicial, desembolsos) pagan este gravamen — pequeño, pero vale la pena avisarle al cliente para que no le sorprenda en su extracto.</li>
                </ul>
              </section>

            </div>
          </div>
        </div>
      )}

      {/* Botón de Logout en la esquina superior */}
      <button 
        onClick={onLogout}
        className="absolute top-4 right-4 md:top-8 md:right-8 flex items-center gap-2 px-4 py-2 bg-stone-900 border border-stone-800 rounded-full text-stone-400 hover:text-brand-gold hover:border-brand-gold transition-all z-50 shadow-md hover:shadow-brand-gold/10"
      >
        <LogOut className="w-4 h-4 md:w-5 md:h-5" />
        <span className="text-sm md:text-base font-medium">Cerrar Sesión</span>
      </button>

      <div className="text-center mb-12 max-w-2xl mt-20 md:mt-0">
        <h1 className="text-4xl md:text-5xl font-light text-brand-gold mb-4">
          Panel de Agente
        </h1>
        <p className="text-stone-400 text-lg">
          Selecciona la herramienta que necesitas usar con tu cliente.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:gap-6 w-full max-w-5xl">
        
        {/* Tarjeta de la Calculadora */}
        <button 
          onClick={onOpenCalculator}
          className="group flex flex-col items-center text-center p-4 md:p-8 bg-stone-900 border border-stone-800 rounded-2xl md:rounded-3xl hover:border-brand-gold hover:bg-stone-900/80 transition-all duration-300 shadow-2xl hover:-translate-y-2 relative overflow-hidden gap-3 md:gap-4"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-brand-gold/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="w-14 h-14 md:w-20 md:h-20 shrink-0 rounded-full bg-stone-800 flex items-center justify-center group-hover:bg-brand-gold/20 transition-colors">
            <Calculator className="w-6 h-6 md:w-10 md:h-10 text-brand-gold" />
          </div>
          <div className="flex flex-col items-center">
            <h2 className="text-sm md:text-xl font-bold text-white mb-1 md:mb-2 leading-tight">Calculadora Inmobiliaria</h2>
            <p className="text-stone-400 text-[10px] md:text-sm leading-relaxed hidden sm:block">
              Simulador avanzado de crédito, retorno de inversión, flujo de caja y rentabilidad.
            </p>
          </div>
        </button>

        {/* Tarjeta del Formulario */}
        <button 
          onClick={onOpenForm}
          className="group flex flex-col items-center text-center p-4 md:p-8 bg-stone-900 border border-stone-800 rounded-2xl md:rounded-3xl hover:border-brand-gold hover:bg-stone-900/80 transition-all duration-300 shadow-2xl hover:-translate-y-2 relative overflow-hidden gap-3 md:gap-4"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-brand-gold/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="w-14 h-14 md:w-20 md:h-20 shrink-0 rounded-full bg-stone-800 flex items-center justify-center group-hover:bg-brand-gold/20 transition-colors">
            <ClipboardList className="w-6 h-6 md:w-10 md:h-10 text-brand-gold" />
          </div>
          <div className="flex flex-col items-center">
            <h2 className="text-sm md:text-xl font-bold text-white mb-1 md:mb-2 leading-tight">Registro de Inmuebles</h2>
            <p className="text-stone-400 text-[10px] md:text-sm leading-relaxed hidden sm:block">
              Captación de propiedades, generación de contratos y checklist de exclusividad.
            </p>
          </div>
        </button>

        {/* Tarjeta de Estrategias SAS */}
        <button 
          onClick={() => setShowSasModal(true)}
          className="group flex flex-col items-center text-center p-4 md:p-8 bg-stone-900 border border-stone-800 rounded-2xl md:rounded-3xl hover:border-brand-gold hover:bg-stone-900/80 transition-all duration-300 shadow-2xl hover:-translate-y-2 relative overflow-hidden gap-3 md:gap-4"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-brand-gold/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="w-14 h-14 md:w-20 md:h-20 shrink-0 rounded-full bg-stone-800 flex items-center justify-center group-hover:bg-brand-gold/20 transition-colors">
            <Landmark className="w-6 h-6 md:w-10 md:h-10 text-brand-gold" />
          </div>
          <div className="flex flex-col items-center">
            <h2 className="text-sm md:text-xl font-bold text-white mb-1 md:mb-2 leading-tight">Estrategias SAS</h2>
            <p className="text-stone-400 text-[10px] md:text-sm leading-relaxed hidden sm:block">
              Módulo educativo de ingeniería financiera, aportes en especie y liquidez corporativa.
            </p>
          </div>
        </button>

        {/* Tarjeta de Portafolio VIP */}
        <button 
          onClick={() => setActiveView('portafolio')}
          className="group flex flex-col items-center text-center p-4 md:p-8 bg-stone-900 border border-brand-gold/30 rounded-2xl md:rounded-3xl hover:border-brand-gold hover:bg-stone-900/80 transition-all duration-300 shadow-[0_0_30px_rgba(212,175,55,0.1)] hover:shadow-[0_0_40px_rgba(212,175,55,0.2)] hover:-translate-y-2 relative overflow-hidden gap-3 md:gap-4"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-brand-gold/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-brand-gold/10 rounded-full blur-2xl group-hover:bg-brand-gold/20 transition-colors" />
          <div className="w-14 h-14 md:w-20 md:h-20 shrink-0 rounded-full bg-stone-800 flex items-center justify-center group-hover:bg-brand-gold/20 transition-colors relative z-10 border border-brand-gold/20">
            <Building2 className="w-6 h-6 md:w-10 md:h-10 text-brand-gold" />
          </div>
          <div className="flex flex-col items-center relative z-10">
            <h2 className="text-sm md:text-xl font-bold text-white mb-1 md:mb-2 leading-tight">Portafolio de Inmuebles</h2>
            <p className="text-stone-400 text-[10px] md:text-sm leading-relaxed hidden sm:block">
              Accede al catálogo de inmuebles publicados. Genera y comparte PDFs interactivos.
            </p>
          </div>
        </button>

        {/* Tarjeta de la Guía de Cierre de Venta */}
        <button
          onClick={() => setShowGuiaCierreModal(true)}
          className="col-span-2 group flex flex-col items-center text-center p-4 md:p-8 bg-stone-900 border border-stone-800 rounded-2xl md:rounded-3xl hover:border-brand-gold hover:bg-stone-900/80 transition-all duration-300 shadow-2xl hover:-translate-y-2 relative overflow-hidden gap-3 md:gap-4"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-brand-gold/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="w-14 h-14 md:w-20 md:h-20 shrink-0 rounded-full bg-stone-800 flex items-center justify-center group-hover:bg-brand-gold/20 transition-colors">
            <Route className="w-6 h-6 md:w-10 md:h-10 text-brand-gold" />
          </div>
          <div className="flex flex-col items-center">
            <h2 className="text-sm md:text-xl font-bold text-white mb-1 md:mb-2 leading-tight">Guía de Cierre de Venta</h2>
            <p className="text-stone-400 text-[10px] md:text-sm leading-relaxed hidden sm:block">
              Paso a paso desde la oferta hasta la escritura: qué documentos pedir, quién paga qué y cómo asegurar tu comisión.
            </p>
          </div>
        </button>

        {/* Tarjeta de Miguel: ocupa las dos columnas para no quedar sola
            impar al final de la grilla */}
        <button
          onClick={() => setShowMiguelModal(true)}
          className="col-span-2 group flex flex-col items-center text-center p-4 md:p-8 bg-stone-900 border border-stone-800 rounded-2xl md:rounded-3xl hover:border-brand-gold hover:bg-stone-900/80 transition-all duration-300 shadow-2xl hover:-translate-y-2 relative overflow-hidden gap-3 md:gap-4"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-brand-gold/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="w-14 h-14 md:w-20 md:h-20 shrink-0 rounded-full bg-stone-800 flex items-center justify-center group-hover:bg-brand-gold/20 transition-colors">
            <Bot className="w-6 h-6 md:w-10 md:h-10 text-brand-gold" />
          </div>
          <div className="flex flex-col items-center">
            <h2 className="text-sm md:text-xl font-bold text-white mb-1 md:mb-2 leading-tight">Miguel · Agente Captador</h2>
            <p className="text-stone-400 text-[10px] md:text-sm leading-relaxed hidden sm:block">
              Lanza el barrido de propietarios directos en Fincaraiz y Metrocuadrado por sector y habitaciones.
            </p>
          </div>
        </button>

      </div>

      {showMiguelModal && (
        <MiguelCaptadorModal
          agentCredential={agentCredential}
          onClose={() => setShowMiguelModal(false)}
        />
      )}
    </div>
  );
}
