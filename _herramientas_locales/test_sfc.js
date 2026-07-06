async function run() {
  const url = "https://www.datos.gov.co/resource/w9zh-vetq.json?$limit=50000";
  const response = await fetch(url);
  const data = await response.json();
  
  const productos = new Set();
  data.forEach(d => {
      if (d.tipo_de_cr_dito === 'Vivienda') {
          productos.add(d.producto_de_cr_dito);
      }
  });
  
  console.log("Productos para Vivienda:", Array.from(productos));
}

run();
