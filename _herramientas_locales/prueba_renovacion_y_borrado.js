/**
 * LA PRUEBA DECISIVA de la migración a ID.
 *
 * Manda dos registros seguidos:
 *   A = RENOVACIÓN de un inmueble que ya existe (misma cédula, dirección, torre y apto)
 *   B = inmueble NUEVO, que queda encolado detrás de A
 *
 * Por qué esta combinación prueba todo de una:
 *   1. A entra por TIPO_2, el único camino que ejecuta resolverFilaOriginal() — la
 *      función que escribe sobre un inmueble YA REGISTRADO.
 *   2. Al terminar, TIPO_2 borra su fila temporal con deleteRow, así que TODAS las
 *      filas de abajo suben una posición... incluida la de B, que sigue en cola.
 *   3. Si B después resuelve su propio inmueble y no el del vecino, la cola por ID
 *      quedó demostrada con un desplazamiento real, no simulado.
 *
 * Uso: EMAIL_PRUEBA=tucorreo@dominio.com node _herramientas_locales/prueba_renovacion_y_borrado.js
 */
const EXEC = 'https://script.google.com/macros/s/AKfycbxpJ8w_XR5dUhIv1VTuV3ZDjHm-vtz13B5RlyfiLqI9ypZnIuzuUL39_GDHpBisL2oW/exec';

const EMAIL = process.env.EMAIL_PRUEBA;
if (!EMAIL) { console.error('❌ Falta EMAIL_PRUEBA (el repo es público, por eso no va escrito).'); process.exit(1); }

const CEDULA = '988000222';                    // propietario de la tanda PRUEBA-ID2
const DIR_EXISTENTE = 'CRA 99 #99-1 PRUEBA-ID2'; // inmueble ya registrado (C52, apto 901)
const APTO_EXISTENTE = '901';
const PRECIO_RENOVADO = '3900000';             // distinto al actual ($2.500.000) a propósito

const SI_DEP = 'Depositoㅤ';
const NO_DEP = 'ㅤ';
const hoy = new Date();
const fecha = `${String(hoy.getDate()).padStart(2,'0')}/${String(hoy.getMonth()+1).padStart(2,'0')}/${hoy.getFullYear()}`;

function base(dir, apto) {
  return {
    accion: 'registrarInmueble',
    reutilizarMultimedia: 'NO',
    "¿Viene de Ciencuadras?": 'NO',
    "Fecha de registro del inmueble.": fecha,
    "Define el propósito de tu inmueble": 'Vivienda',
    "Selecciona la localidad del inmueble": 'USAQUEN',
    "Selecciona la UPZ  de tu inmueble": 'USAQUEN',
    "Escriba el barrio del inmueble": 'CEDRITOS',
    "BARRIO COMERCIAL": 'CEDRITOS',
    "Ingrese la Dirección del inmueble": dir,
    "Ingrese la Ciudad del inmueble": 'BOGOTA',
    "Area  M²": '80',
    "¿Cual es el estrato?": '4',
    "Antiguedad del Inmueble": '10',
    "N° de piso": '3',
    "¿El inmueble solo lo describe el Número? o ¿Número y torre?": 'Solo número',
    "N° o Letra de la Torre": '',
    "N° de inmueble": apto,
    "¿El inmueble dispone de portería y administración para realizar un acta de notificación de promoción inmobiliaria he ingreso?": 'NO',
    "NOMBRES Y APELLIDOS DEL PROPIETARIO": 'PRUEBA QA BORRAR',
    "TIPO DOCUMENTO PROPIETARIO": 'Cédula de ciudadanía',
    "Número de documento": CEDULA,
    "Ciudad de Expedicion": 'BOGOTA',
    "Pais de Expedicion": 'COLOMBIA',
    "Pais del celular": '+57',
    "Celular": '3000000000',
    "Correo electrónico": EMAIL,
    "¿Se permite mascota?": 'NO',
    "Selecciona el tipo de inmueble": 'Apartamento',
    "N° de Baños": '2',
    "¿Qué tipo de autorización desea realizar?": 'GENERAL'
  };
}

const A = Object.assign(base(DIR_EXISTENTE, APTO_EXISTENTE), {
  "N° de Habitaciones": '3',
  "N° de Garajes": '1',
  "¿Es Independiente o en Servidumbre?": 'Independiente',
  "¿Es Cubierto o descubierto?": 'Cubierto',
  "N° Asignado del garaje": '15',
  "¿Dispone de deposito?": SI_DEP,
  "# De Deposito": '7',
  "TIPO DE NEGOCIO": 'Corretaje',
  "PRECIO DE PROMOCION GENERAL": PRECIO_RENOVADO,
  "PRECIO DE PROMOCION EN VENTA": '',
  "PRECIO DE ADMINISTRACION PLENA (SIN DESCUENTO)": '400000',
  "PORCENTAJE POR COMERCIALIZACIÓN INMOBILIARIA EN ARRIENDO": '50%',
  "INGRESE A CONTINUACIÓN UNA DESCRIPCIÓN ADICIONAL DEL INMUEBLE": 'RENOVACION de prueba (PRUEBA-ID2). Borrar.'
});

const B = Object.assign(base('CRA 99 #99-9 PRUEBA-ID3', '909'), {
  "N° de Habitaciones": '2',
  "N° de Garajes": 'Ningun',
  "¿Es Independiente o en Servidumbre?": '',
  "¿Es Cubierto o descubierto?": '',
  "N° Asignado del garaje": '',
  "¿Dispone de deposito?": NO_DEP,
  "TIPO DE NEGOCIO": 'Venta',
  "PRECIO DE PROMOCION GENERAL": '',
  "PRECIO DE PROMOCION EN VENTA": '505000000',
  "(Porcentaje en números)": '3%',
  "(3%)  (Porcentaje en letras)": 'TRES',
  "INGRESE A CONTINUACIÓN UNA DESCRIPCIÓN ADICIONAL DEL INMUEBLE": 'Nuevo detrás de una renovación (PRUEBA-ID3). Borrar.'
});

const enviar = async (nombre, payload) => {
  const t = Date.now();
  const r = await fetch(EXEC, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload)
  });
  const j = await r.json().catch(() => null);
  console.log(`${j && j.success ? '✅' : '❌'} ${nombre}  (${Date.now() - t} ms)`);
  return j;
};

(async () => {
  console.log('A = RENOVACIÓN de', DIR_EXISTENTE, 'apto', APTO_EXISTENTE, '→ nuevo canon $' + PRECIO_RENOVADO);
  console.log('B = inmueble NUEVO detrás en la cola\n');

  await enviar('A · renovación', A);
  // Pequeña pausa para que las marcas de tiempo ordenen A antes que B.
  await new Promise(r => setTimeout(r, 2500));
  await enviar('B · nuevo (queda encolado detrás)', B);

  console.log('\nQué debe pasar:');
  console.log('  · A transfiere el canon $3.900.000 a la fila del inmueble ORIGINAL (OB412105)');
  console.log('  · A borra su fila temporal → las de abajo suben una posición');
  console.log('  · B, que estaba en cola, resuelve por ID y procesa SU inmueble, no el vecino');
})();
