/**
 * FASE 2: dispara 3 registros SIMULTÁNEOS contra el /exec de producción,
 * imitando exactamente el payload del formulario React.
 *
 * Es el escenario que antes del lock corrompía datos: appendRow() + getLastRow()
 * concurrentes hacían que dos agentes leyeran el mismo lastRow.
 *
 * Uso: node _herramientas_locales/prueba_concurrencia_enviar.js
 */
const EXEC_URL = 'https://script.google.com/macros/s/AKfycbxpJ8w_XR5dUhIv1VTuV3ZDjHm-vtz13B5RlyfiLqI9ypZnIuzuUL39_GDHpBisL2oW/exec';

// El correo va por variable de entorno a propósito: este repo es PÚBLICO y una
// dirección real hardcodeada queda expuesta a scrapers.
//   EMAIL_PRUEBA=tucorreo@dominio.com node _herramientas_locales/prueba_concurrencia_enviar.js
const EMAIL_PRUEBA = process.env.EMAIL_PRUEBA;
if (!EMAIL_PRUEBA) {
  console.error('❌ Falta la variable EMAIL_PRUEBA.');
  console.error('   Parte 3 envía un correo REAL de Sala de Firmas a esa dirección,');
  console.error('   así que debe ser una cuenta tuya y nunca la de un tercero.');
  console.error('   Uso: EMAIL_PRUEBA=tucorreo@dominio.com node _herramientas_locales/prueba_concurrencia_enviar.js');
  process.exit(1);
}

const CEDULA_PRUEBA = process.env.CEDULA_PRUEBA || '999000111'; // misma para los 3 -> un solo RPR
const PROPIETARIO = 'PRUEBA QA BORRAR';
const MARCA = 'PRUEBA-QA';                          // aparece en la dirección/CDR

const SI_DEP = 'Depositoㅤ';
const NO_DEP = 'ㅤ';

const hoy = new Date();
const fechaStr = `${String(hoy.getDate()).padStart(2,'0')}/${String(hoy.getMonth()+1).padStart(2,'0')}/${hoy.getFullYear()}`;

function base(n) {
  return {
    accion: 'registrarInmueble',
    reutilizarMultimedia: 'NO',
    "¿Viene de Ciencuadras?": 'NO',
    "Código Ciencuadras": '',
    "Fecha de registro del inmueble.": fechaStr,
    "Define el propósito de tu inmueble": 'Vivienda',
    "Selecciona la localidad del inmueble": 'USAQUEN',
    "Selecciona la UPZ  de tu inmueble": 'USAQUEN',
    "Escriba el barrio del inmueble": 'CEDRITOS',
    "BARRIO COMERCIAL": 'CEDRITOS',
    "Ingrese la Dirección del inmueble": `CRA 99 #99-${n} ${MARCA}`,
    "Ingrese la Ciudad del inmueble": 'BOGOTA',
    "Area  M²": '80',
    "¿Cual es el estrato?": '4',
    "Antiguedad del Inmueble": '10',
    "N° de piso": '3',
    "¿El inmueble solo lo describe el Número? o ¿Número y torre?": 'Solo número',
    "N° o Letra de la Torre": '',
    "N° de inmueble": `90${n}`,
    // Portería en NO para no generar además el Acta de Autorización de Ingreso
    "¿El inmueble dispone de portería y administración para realizar un acta de notificación de promoción inmobiliaria he ingreso?": 'NO',
    "NOMBRE DEL INMUEBLE/ADMINISTRACION": '',
    "NOMBRES Y APELLIDOS DEL PROPIETARIO": PROPIETARIO,
    "TIPO DOCUMENTO PROPIETARIO": 'Cédula de ciudadanía',
    "Número de documento": CEDULA_PRUEBA,
    "Ciudad de Expedicion": 'BOGOTA',
    "Pais de Expedicion": 'COLOMBIA',
    "Pais del celular": '+57',
    "Celular": '3000000000',
    "Correo electrónico": EMAIL_PRUEBA,
    "¿Se permite mascota?": 'NO',
    "INGRESE A CONTINUACIÓN UNA DESCRIPCIÓN ADICIONAL DEL INMUEBLE": `Registro de prueba automatizada (${MARCA}). Borrar.`
  };
}

const CASOS = [
  {
    nombre: '1) CORRETAJE (arriendo) · 1 garaje · CON depósito',
    payload: Object.assign(base(1), {
      "Selecciona el tipo de inmueble": 'Apartamento',
      "N° de Habitaciones": '3',
      "N° de Baños": '2',
      "N° de Garajes": '1',
      "¿Es Independiente o en Servidumbre?": 'Independiente',
      "¿Es Cubierto o descubierto?": 'Cubierto',
      "N° Asignado del garaje": '15',
      "¿Dispone de deposito?": SI_DEP,
      "# De Deposito": '7',
      "TIPO DE NEGOCIO": 'Corretaje',
      "PRECIO DE PROMOCION GENERAL": '2500000',
      "PRECIO DE PROMOCION EN VENTA": '',
      "PRECIO DE ADMINISTRACION PLENA (SIN DESCUENTO)": '350000',
      "PORCENTAJE POR COMERCIALIZACIÓN INMOBILIARIA EN ARRIENDO": '50%',
      "¿Qué tipo de autorización desea realizar?": 'GENERAL'
    }),
    esperado: { accion: 'SE ARRIENDA', tipoSeq: 'C', lineas: ['3 Habitaciones','2 Baños','1 Garaje','1 Depósito'], precio: '$2.500.000', admin: true }
  },
  {
    nombre: '2) VENTA · SIN garaje · SIN depósito',
    payload: Object.assign(base(2), {
      "Selecciona el tipo de inmueble": 'Casa',
      "N° de Habitaciones": '2',
      "N° de Baños": '2',
      "N° de Garajes": 'Ningun',
      "¿Es Independiente o en Servidumbre?": '',
      "¿Es Cubierto o descubierto?": '',
      "N° Asignado del garaje": '',
      "¿Dispone de deposito?": NO_DEP,
      "# De Deposito": '',
      "TIPO DE NEGOCIO": 'Venta',
      "PRECIO DE PROMOCION GENERAL": '',
      "PRECIO DE PROMOCION EN VENTA": '450000000',
      "PRECIO DE ADMINISTRACION PLENA (SIN DESCUENTO)": '',
      "(Porcentaje en números)": '3%',
      "(3%)  (Porcentaje en letras)": 'TRES',
      "¿Qué tipo de autorización desea realizar?": 'GENERAL'
    }),
    esperado: { accion: 'SE VENDE', tipoSeq: 'V', lineas: ['2 Habitaciones','2 Baños'], precio: '$450.000.000', admin: false }
  },
  {
    nombre: '3) VENDI-RENTA (mixto) · garaje COMUNAL · CON depósito',
    payload: Object.assign(base(3), {
      "Selecciona el tipo de inmueble": 'Apartamento',
      "N° de Habitaciones": '4',
      "N° de Baños": '3',
      "N° de Garajes": 'Comunal',
      "¿Es Independiente o en Servidumbre?": 'Servidumbre',
      "¿Es Cubierto o descubierto?": 'Descubierto',
      "N° Asignado del garaje": '',
      "¿Dispone de deposito?": SI_DEP,
      "# De Deposito": '12',
      "TIPO DE NEGOCIO": 'Vendi-Renta',
      "PRECIO DE PROMOCION GENERAL": '3100000',
      "PRECIO DE PROMOCION EN VENTA": '620000000',
      "PRECIO DE ADMINISTRACION PLENA (SIN DESCUENTO)": '420000',
      "PORCENTAJE POR COMERCIALIZACIÓN INMOBILIARIA EN ARRIENDO (Vendi-Renta)": '50%',
      "(Porcentaje en números) (A-V)": '3%',
      "(3%)  (Porcentaje en letras) (A-V)": 'TRES',
      "¿Qué tipo de autorización desea realizar?": 'GENERAL'
    }),
    esperado: { accion: 'SE VENDE Y ARRIENDA', tipoSeq: 'VR', lineas: ['4 Habitaciones','3 Baños','Garaje comunal','1 Depósito'], precio: '$620.000.000 y/o $3.100.000', admin: true }
  }
];

async function enviar(caso, idx) {
  const t0 = Date.now();
  const res = await fetch(EXEC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // igual que el form (evita preflight CORS)
    body: JSON.stringify(caso.payload),
    redirect: 'follow'
  });
  const texto = await res.text();
  let json = null;
  try { json = JSON.parse(texto); } catch (e) { /* puede venir HTML si hay error */ }
  return { idx, nombre: caso.nombre, ms: Date.now() - t0, status: res.status, json, crudo: texto.slice(0, 300) };
}

(async () => {
  console.log('Disparando 3 registros SIMULTÁNEOS a producción...');
  console.log('Propietario de prueba:', PROPIETARIO, '| CC', CEDULA_PRUEBA, '| correo', EMAIL_PRUEBA);
  console.log('');

  const inicio = Date.now();
  // Promise.all = salen a la vez. Máxima contención: el peor caso para el lock.
  const resultados = await Promise.all(CASOS.map((c, i) => enviar(c, i + 1)));
  console.log(`Las 3 respuestas llegaron en ${Date.now() - inicio} ms\n`);

  let ok = 0;
  resultados.sort((a, b) => a.idx - b.idx).forEach(r => {
    const exito = r.json && r.json.success === true;
    if (exito) ok++;
    console.log(`${exito ? '✅' : '❌'} ${r.nombre}`);
    console.log(`   HTTP ${r.status} en ${r.ms} ms`);
    console.log(`   respuesta: ${r.json ? JSON.stringify(r.json) : r.crudo}`);
    console.log('');
  });

  console.log(`Resumen: ${ok}/3 aceptados por el backend.`);
  console.log('El procesamiento pesado (carpetas, contrato, cartel) sigue en segundo plano.');
})();
