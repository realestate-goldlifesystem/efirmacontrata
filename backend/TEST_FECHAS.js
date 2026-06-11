function testActualizarCampos() {
  const cdr = 'REG_05-06-2026-C43_(Calle 185# 7a-55)_TORRE-7_APTO-1504';
  const fila = buscarFilaPorCDR(cdr);
  if (fila) {
    actualizarCamposInquilino(fila, {
      nombre: 'TEST BOT',
      documento: '123456789',
      email: 'test@bot.com',
      celular: '3001234567',
      fechaInicio: '2026-06-15'
    });
    Logger.log('Hecho!');
  } else {
    Logger.log('No se encontró la fila');
  }
}
