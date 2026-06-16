const payload = {
  action: "registrarInmueble", // CamelCase!
  "NOMBRES Y APELLIDOS DEL PROPIETARIO": "JUAN PEREZ (TEST TIPO 1 ADMI-VENTA)",
  "Número de documento": "888999777",
  "Correo electrónico": "juanpereztest@example.com",
  "TIPO DE NEGOCIO": "Admi-Venta",
  "Ingrese la Dirección del inmueble": "CALLE FALSISIMA 123",
  "N° o Letra de la Torre": "Torre A",
  "N° de inmueble": "Apto 101",
  "¿El inmueble dispone de portería y administración para realizar un acta de notificación de promoción inmobiliaria he ingreso?": "SI",
  "¿Desea enviar el acta notificación de gestión inmobiliaria a la administración desde este formulario también?": "NO",
  "Correo electrónico de la administración": ""
};

fetch('https://script.google.com/macros/s/AKfycbxpJ8w_XR5dUhIv1VTuV3ZDjHm-vtz13B5RlyfiLqI9ypZnIuzuUL39_GDHpBisL2oW/exec', {
  method: 'POST',
  body: JSON.stringify(payload) // Wait, is "datos" a wrapper or is it spread?
})
.then(res => res.json())
.then(data => {
  console.log("Respuesta del servidor:");
  console.log(data);
})
.catch(err => {
  console.error("Error enviando petición:", err);
});
