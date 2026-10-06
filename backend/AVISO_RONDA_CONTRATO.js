/**
 * AVISO AL AGENTE CUANDO UNA VERSIÓN DEL BORRADOR YA FUE RESPONDIDA POR TODOS — oct-2026
 *
 * En el validador de contratos cada parte (inquilino, propietario, codeudores)
 * aprueba o pide corrección sobre la versión vigente del borrador. Antes el
 * agente tenía que entrar a mirar si ya habían respondido todos. Ahora, cuando la
 * ÚLTIMA parte que faltaba da su veredicto, le llega un correo que dice qué pasó:
 *   - todos aprobaron            → seguir con el contrato definitivo;
 *   - todos pidieron corrección  → ajustar y enviar la versión siguiente;
 *   - unos sí y otros no         → quién aprobó, quién pidió qué.
 *
 * Solo se avisa cuando la ronda queda COMPLETA (o cuando, ya completa, alguien
 * cambia su veredicto). Mientras falte alguien no llega nada.
 *
 * Las funciones `ronda…` de arriba son puras (probadas en
 * _herramientas_locales/test_ronda_contrato.js).
 */

// Columnas de LOG_APROBACIONES_CONTRATO: CDR | USUARIO | ACCION | COMENTARIOS | FECHA | HORA | EMAIL | VERSION
const RONDA_PIDE_CORRECCION = ['RECHAZADO', 'CORREGIR', 'CAMBIOS_SOLICITADOS'];

/** ¿La fila es de este registro? Misma tolerancia que verificarAprobacionesCompletas. */
function rondaEsDelRegistro(celda, cdr) {
  const a = String(celda === null || celda === undefined ? '' : celda).trim();
  const b = String(cdr === null || cdr === undefined ? '' : cdr).trim();
  if (!a || !b) return false;
  return a === b || (a.length > 20 && b.indexOf(a) === 0);
}

/**
 * Cómo va la versión vigente.
 * @param {Array[]} filas          filas del registro de aprobaciones, SIN el encabezado
 * @param {string} cdr
 * @param {number} numCodeudores   cuántos codeudores tiene el contrato
 * @return {{version:number, partes:string[], veredictos:Object, faltan:string[], aprobaron:string[],
 *           corrigen:string[], completa:boolean, situacion:string}}
 *   situacion: 'incompleta' | 'todos_aprobaron' | 'todos_corrigen' | 'mixto'
 */
function rondaResumen(filas, cdr, numCodeudores) {
  const propias = (filas || []).filter(f => f && rondaEsDelRegistro(f[0], cdr));
  let version = 1;
  propias.forEach(f => { const v = parseInt(f[7], 10); if (!isNaN(v) && v > version) version = v; });

  const partes = ['inquilino', 'propietario'];
  for (let i = 1; i <= (Number(numCodeudores) || 0); i++) partes.push('codeudor' + i);

  // De cada parte cuenta su ÚLTIMO veredicto en esta versión (puede aprobar y luego pedir un cambio)
  const veredictos = {};
  propias.forEach(f => {
    if ((parseInt(f[7], 10) || 1) !== version) return;
    const parte = String(f[1] || '').trim().toLowerCase();
    if (partes.indexOf(parte) === -1) return;
    const accion = String(f[2] || '').trim().toUpperCase();
    if (accion === 'APROBADO') veredictos[parte] = { veredicto: 'aprobo', comentario: '' };
    else if (RONDA_PIDE_CORRECCION.indexOf(accion) !== -1) veredictos[parte] = { veredicto: 'corrige', comentario: String(f[3] || '').trim() };
  });

  const faltan = partes.filter(p => !veredictos[p]);
  const aprobaron = partes.filter(p => veredictos[p] && veredictos[p].veredicto === 'aprobo');
  const corrigen = partes.filter(p => veredictos[p] && veredictos[p].veredicto === 'corrige');
  const completa = faltan.length === 0;
  return {
    version: version, partes: partes, veredictos: veredictos,
    faltan: faltan, aprobaron: aprobaron, corrigen: corrigen, completa: completa,
    situacion: !completa ? 'incompleta' : corrigen.length === 0 ? 'todos_aprobaron' : aprobaron.length === 0 ? 'todos_corrigen' : 'mixto'
  };
}

/**
 * ¿La fila que se acaba de agregar (la última) amerita avisar al agente?
 * Sí cuando con ella la ronda queda completa, o cuando ya lo estaba y cambió un veredicto.
 */
function rondaTocaAvisar(filas, cdr, numCodeudores) {
  if (!filas || !filas.length) return false;
  const despues = rondaResumen(filas, cdr, numCodeudores);
  if (!despues.completa) return false;
  const antes = rondaResumen(filas.slice(0, -1), cdr, numCodeudores);
  if (!antes.completa || antes.version !== despues.version) return true;
  const firma = (r) => r.partes.map(p => p + ':' + r.veredictos[p].veredicto).join('|');
  return firma(antes) !== firma(despues);
}

/** "codeudor2" → "Codeudor 2" */
function rondaNombreDeParte(parte) {
  const m = String(parte).match(/^codeudor(\d+)$/);
  if (m) return 'Codeudor ' + m[1];
  return parte === 'inquilino' ? 'Inquilino' : parte === 'propietario' ? 'Propietario' : String(parte);
}

/**
 * Correo para el agente. d = { codigo, direccion, resumen, nombres:{inquilino:'…', …}, urlHoja }
 * @return {{asunto:string, html:string}}
 */
function rondaCorreoAgente(d) {
  const r = d.resumen;
  const n = r.partes.length;
  const lista = (partes) => partes.map(rondaNombreDeParte).join(', ').replace(/, ([^,]*)$/, ' y $1');

  let asunto, titulo, entrada, queSigue;
  if (r.situacion === 'todos_aprobaron') {
    asunto = '✅ Todos aprobaron la versión ' + r.version + ' del contrato - ' + d.codigo;
    titulo = 'Todas las partes aprobaron el borrador';
    entrada = 'Las <strong>' + n + ' partes</strong> aprobaron la <strong>versión ' + r.version + '</strong> del borrador' + (d.direccion ? ' del inmueble en <strong>' + plzEsc(d.direccion) + '</strong>' : '') + '. Nadie pidió cambios.';
    queSigue = '<strong>Qué sigue:</strong> abre el panel de validación y genera el contrato definitivo para pasar a la firma.';
  } else if (r.situacion === 'todos_corrigen') {
    asunto = '✏️ Todas las partes pidieron corrección en la versión ' + r.version + ' - ' + d.codigo;
    titulo = 'Todas las partes pidieron corrección';
    entrada = 'Las <strong>' + n + ' partes</strong> ya respondieron la <strong>versión ' + r.version + '</strong> del borrador' + (d.direccion ? ' del inmueble en <strong>' + plzEsc(d.direccion) + '</strong>' : '') + ' y <strong>todas pidieron corrección</strong>.';
    queSigue = '<strong>Qué sigue:</strong> abre el panel de validación, ajusta el borrador con lo que pidieron y envía la <strong>versión ' + (r.version + 1) + '</strong>.';
  } else {
    asunto = '✏️ Versión ' + r.version + ' respondida: ' + r.aprobaron.length + (r.aprobaron.length === 1 ? ' aprobó' : ' aprobaron') + ', ' + r.corrigen.length + ' pidi' + (r.corrigen.length === 1 ? 'ó' : 'eron') + ' corrección - ' + d.codigo;
    titulo = 'Todos respondieron: hay correcciones';
    entrada = 'Las <strong>' + n + ' partes</strong> ya respondieron la <strong>versión ' + r.version + '</strong> del borrador' + (d.direccion ? ' del inmueble en <strong>' + plzEsc(d.direccion) + '</strong>' : '') + '. ' +
              '<strong>' + lista(r.aprobaron) + '</strong> ' + (r.aprobaron.length === 1 ? 'aprobó' : 'aprobaron') + '; <strong>' + lista(r.corrigen) + '</strong> ' + (r.corrigen.length === 1 ? 'pidió' : 'pidieron') + ' corrección.';
    queSigue = '<strong>Qué sigue:</strong> abre el panel de validación, ajusta el borrador y envía la <strong>versión ' + (r.version + 1) + '</strong>. Quienes ya aprobaron tendrán que aprobar la nueva versión.';
  }

  const filas = r.partes.map(p => {
    const v = r.veredictos[p];
    const nombre = (d.nombres && d.nombres[p]) ? ' — ' + plzEsc(plzNombrePropio(d.nombres[p])) : '';
    const estado = v.veredicto === 'aprobo'
      ? '<span style="color:#15803d; font-weight:bold;">✓ Aprobó</span>'
      : '<span style="color:#b45309; font-weight:bold;">✎ Pidió corrección</span>';
    const comentario = v.veredicto === 'corrige'
      ? '<div style="margin-top:6px; padding:8px 12px; background-color:#f6f6f6; border-radius:4px; color:#333333; font-size:14px;">' +
          (v.comentario ? plzEsc(v.comentario).replace(/\n/g, '<br>') : '<em>No escribió observaciones.</em>') + '</div>'
      : '';
    return '<tr><td style="padding:10px 0; border-bottom:1px solid #eeeeee; font-size:15px;">' +
             '<strong style="color:#1a1a1a;">' + rondaNombreDeParte(p) + '</strong>' + nombre + '<br>' + estado + comentario +
           '</td></tr>';
  }).join('');

  return {
    asunto: asunto,
    html: plzHtml({
      titulo: titulo,
      nombre: 'Equipo GoldLife', codigo: d.codigo,
      cuerpo:
        plzP(entrada) +
        '<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:6px 0 10px 0;">' + filas + '</table>' +
        plzCaja(queSigue),
      boton: d.urlHoja ? { texto: 'Abrir la hoja', url: d.urlHoja } : null
    })
  };
}

/**
 * Correo ÚNICO a cada parte cuando todos respondieron la versión y hubo correcciones.
 * (Si todos aprobaron, a las partes les llega el de "contrato aprobado".)
 * Muestra lo mismo que ya ven en el Historial de Revisiones del validador.
 * d = { codigo, direccion, resumen, nombres, destinatario, urlValidador }
 */
function rondaCorreoPartes(d) {
  const r = d.resumen;
  const filas = r.partes.map(p => {
    const v = r.veredictos[p];
    const estado = v.veredicto === 'aprobo'
      ? '<span style="color:#15803d; font-weight:bold;">✓ Aprobó</span>'
      : '<span style="color:#b45309; font-weight:bold;">✎ Pidió un ajuste</span>';
    const comentario = v.veredicto === 'corrige' && v.comentario
      ? '<div style="margin-top:6px; padding:8px 12px; background-color:#f6f6f6; border-radius:4px; color:#333333; font-size:14px;">' + plzEsc(v.comentario).replace(/\n/g, '<br>') + '</div>'
      : '';
    return '<tr><td style="padding:10px 0; border-bottom:1px solid #eeeeee; font-size:15px;">' +
             '<strong style="color:#1a1a1a;">' + rondaNombreDeParte(p) + '</strong><br>' + estado + comentario +
           '</td></tr>';
  }).join('');

  return {
    asunto: 'Todas las partes respondieron el borrador (versión ' + r.version + ') - ' + d.codigo,
    html: plzHtml({
      titulo: 'Todas las partes ya revisaron el borrador',
      nombre: plzNombrePropio(d.destinatario) || 'Cliente', codigo: d.codigo,
      cuerpo:
        plzP('Todas las partes ya revisaron la <strong>versión ' + r.version + '</strong> del borrador del contrato' + (d.direccion ? ' del inmueble en <strong>' + plzEsc(d.direccion) + '</strong>' : '') + '. Este es el resultado:') +
        '<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:6px 0 10px 0;">' + filas + '</table>' +
        plzCaja('<strong>Qué sigue:</strong> estamos preparando la <strong>versión ' + (r.version + 1) + '</strong> con los ajustes solicitados. Le llegará un correo cuando esté lista para su revisión. <strong>Por ahora no tiene que hacer nada.</strong>') +
        plzP('El contrato definitivo se genera cuando todas las partes aprueban la misma versión.'),
      boton: d.urlValidador ? { texto: 'Ver el historial de revisiones', url: d.urlValidador } : null
    })
  };
}

// ---------- Con servicios ----------

/**
 * Se llama justo después de registrar un veredicto. Nunca debe tumbar el registro:
 * quien llama lo envuelve en try/catch.
 * @return {boolean} true si envió el correo
 */
function rondaAvisarSiCompleta(hojaAprobaciones, cdr) {
  const filas = hojaAprobaciones.getDataRange().getValues().slice(1);
  if (!filas.length) return false;

  const datos = recopilarDatosContrato(cdr);
  const info = (datos && datos.success && datos.data) ? datos.data : {};
  const codeudores = info.codeudores || [];
  if (!rondaTocaAvisar(filas, cdr, codeudores.length)) return false;

  const nombres = {
    inquilino: info.inquilino ? info.inquilino.nombre : '',
    propietario: info.propietario ? info.propietario.nombre : ''
  };
  codeudores.forEach((c, i) => { nombres['codeudor' + (i + 1)] = c.nombre || ''; });

  const correo = rondaCorreoAgente({
    codigo: info.idRegistro || (typeof obtenerIdRegistro === 'function' ? obtenerIdRegistro(cdr) : cdr),
    direccion: info.inmueble ? info.inmueble.direccion : '',
    resumen: rondaResumen(filas, cdr, codeudores.length),
    nombres: nombres,
    urlHoja: SpreadsheetApp.getActiveSpreadsheet().getUrl()
  });
  const enviado = _plzEnviar(PLAZOS.CORREO_ADMIN, correo);
  Logger.log('📬 Aviso de ronda completa al agente (' + cdr + '): ' + correo.asunto);

  // A las partes: un solo resumen, y solo si hubo correcciones (si todos aprobaron
  // ya reciben el correo de "contrato aprobado").
  const resumen = rondaResumen(filas, cdr, codeudores.length);
  if (resumen.situacion !== 'todos_aprobaron') {
    const idUrl = encodeURIComponent(info.idRegistro || cdr).replace(/\(/g, '%28').replace(/\)/g, '%29');
    const destinos = [['inquilino', info.inquilino], ['propietario', info.propietario]]
      .concat(codeudores.map((c, i) => ['codeudor' + (i + 1), c]));
    const yaEscritos = {};
    destinos.forEach(par => {
      const persona = par[1] || {};
      const correoParte = String(persona.email || '').trim().toLowerCase();
      if (!correoParte || yaEscritos[correoParte]) return;      // una persona con dos papeles recibe uno solo
      yaEscritos[correoParte] = true;
      try {
        _plzEnviar(persona.email, rondaCorreoPartes({
          codigo: info.idRegistro || cdr,
          direccion: info.inmueble ? info.inmueble.direccion : '',
          resumen: resumen, destinatario: persona.nombre,
          urlValidador: CONTRATO_CONFIG.BASE_URL + '/validador-de-contratos.html?cdr=' + idUrl + '&rol=' + par[0]
        }));
      } catch (e) {
        Logger.log('⚠️ No se pudo enviar el resumen a ' + par[0] + ': ' + e.message);
      }
    });
    Logger.log('📬 Resumen de la versión ' + resumen.version + ' enviado a ' + Object.keys(yaEscritos).length + ' parte(s).');
  }
  return enviado;
}

/** Para ver los tres correos en la bandeja del sistema (no toca ningún registro). */
function probarCorreosDeRonda() {
  const partes = ['inquilino', 'propietario', 'codeudor1'];
  const armar = (mapa) => {
    const filas = [['X', 'ADMIN', 'ENVIADO', '', '', '', '', 2]];
    partes.forEach(p => filas.push(['X', p.toUpperCase(), mapa[p] ? 'APROBADO' : 'CAMBIOS_SOLICITADOS', mapa[p] ? '' : 'PRUEBA: corregir la fecha de inicio.', '', '', '', 2]));
    return rondaResumen(filas, 'X', 1);
  };
  [{ inquilino: 1, propietario: 1, codeudor1: 1 }, {}, { inquilino: 1 }].forEach(mapa => {
    _plzEnviar(PLAZOS.CORREO_ADMIN, rondaCorreoAgente({
      codigo: 'PRUEBA', direccion: 'Calle de Prueba 1 #2-3', resumen: armar(mapa),
      nombres: { inquilino: 'INQUILINO DE PRUEBA', propietario: 'PROPIETARIO DE PRUEBA', codeudor1: 'CODEUDOR DE PRUEBA' },
      urlHoja: SpreadsheetApp.getActiveSpreadsheet().getUrl()
    }));
  });
  // Y el que reciben las partes cuando hubo correcciones
  _plzEnviar(PLAZOS.CORREO_ADMIN, rondaCorreoPartes({
    codigo: 'PRUEBA', direccion: 'Calle de Prueba 1 #2-3', resumen: armar({ inquilino: 1 }),
    destinatario: 'INQUILINO DE PRUEBA', urlValidador: CONTRATO_CONFIG.BASE_URL + '/validador-de-contratos.html?cdr=PRUEBA'
  }));
  Logger.log('Enviados 4 correos de prueba a ' + PLAZOS.CORREO_ADMIN + ' (3 del agente y 1 de las partes)');
}
