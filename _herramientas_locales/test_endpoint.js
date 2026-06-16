const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxpJ8w_XR5dUhIv1VTuV3ZDjHm-vtz13B5RlyfiLqI9ypZnIuzuUL39_GDHpBisL2oW/exec';

async function run() {
  const payload = {
    accion: 'registrarInmueble',
    "Fecha de registro del inmueble.": new Date().toISOString().split('T')[0],
    "Define el propósito de tu inmueble": 'Vivienda',
    "Selecciona la localidad del inmueble": 'Usaquén',
    "Selecciona la UPZ  de tu inmueble": 'LOS CEDROS',
    "Escriba el barrio del inmueble": 'TESTING_SPEED_ASYNC',
    "Ingrese la Dirección del inmueble": 'Calle 140 # 9-18',
    "Ingrese la Ciudad del inmueble": 'BOGOTA',
    "Selecciona el tipo de inmueble": 'Apartamento',
    "Area  M²": '80',
    "N° de Habitaciones": '2',
    "N° de Baños": '2',
    "¿Cual es el estrato?": '4',
    "Antiguedad del Inmueble": '5',
    "N° de piso": '4',
    "MEDIDAS DEL ESPACIO DE LA NEVERA": '0.60x0.70x1.80',
    "PUNTO DE AGUA": 'NO',
    "MEDIDAS DEL ESPACIO DE LA LAVADORA": '0.69x0.66x1.13',
    "PUNTO DE GAS": 'NO',
    "¿El inmueble solo lo describe el Número? o ¿Número y torre?": 'Número',
    "N° o Letra de la Torre": '',
    "N° de inmueble": '402',
    "N° de Garajes": '1',
    "¿Es Independiente o en Servidumbre?": 'Independiente',
    "¿Es Cubierto o descubierto?": 'Cubierto',
    "N° Asignado del garaje": '12',
    "¿Dispone de deposito?": 'ㅤ',
    "# De Deposito": '',
    "¿Que tipo vista tiene?": 'Exterior',
    "¿Que tipo de calentador tiene?": 'Gas',
    "¿Que tipo de cocina es?": 'Integral',
    "¿Que tipo de estilo de cocina es?": 'Abierta',
    "¿Que tipo de estufa dispone la cocina?": 'Gas',
    "Otro Interno": '',
    "¿Qué tipo de vigilancia dispone?": 'vigilancia de celaduría',
    "¿En que tipo de zona se encuentra el inmueble? [Tipo de zona #1 Zona Residencial]": 'Zona Residencialㅤ',
    "¿En que tipo de zona se encuentra el inmueble? [Tipo de zona #2 Zona Comercial]": '',
    "¿En que tipo de zona se encuentra el inmueble? [Tipo de zona #3 Zona Industrial]": '',
    "¿En que tipo de zona se encuentra el inmueble? [Tipo de zona #4 Zona Campestre]": '',
    "¿En que tipo de via se encuentra el inmueble?": 'Secundaria',
    "¿Cual es el tipo de diseño que tiene el inmueble?": 'Convencional',
    "Otro Externo": '',
    "INGRESE A CONTINUACIÓN UNA DESCRIPCIÓN ADICIONAL DEL INMUEBLE": 'Test de velocidad de registro asíncrono',
    "¿El inmueble dispone de portería y administración para realizar un acta de notificación de promoción inmobiliaria he ingreso?": 'NO',
    "NOMBRES Y APELLIDOS DEL PROPIETARIO": 'TEST SPEED',
    "TIPO DOCUMENTO PROPIETARIO": 'CC',
    "Número de documento": '12345678',
    "Ciudad de Expedicion": 'BOGOTA',
    "Pais de Expedicion": 'COLOMBIA',
    "Pais del celular": '+57',
    "Celular": '3001234567',
    "Correo electrónico": 'testspeed@example.com',
    "TIPO DE NEGOCIO": 'Corretaje',
    "PORCENTAJE POR COMERCIALIZACIÓN INMOBILIARIA EN ARRIENDO": '100%'
  };

  console.log(`Sending POST to ${SCRIPT_URL}...`);
  
  try {
    const response = await fetch(SCRIPT_URL, {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      }
    });

    console.log(`Response status: ${response.status} ${response.statusText}`);
    const text = await response.text();
    console.log('Response body:', text);
  } catch (error) {
    console.error('Fetch error:', error);
  }
}

run();
