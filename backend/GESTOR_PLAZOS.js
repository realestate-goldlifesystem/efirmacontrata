/**
 * PLAZOS DEL TRÁMITE E-FIRMACONTRATA Y SUS CORREOS (oct-2026)
 *
 * Antes había un solo reloj: 48 h desde el pago del inquilino, y si para entonces
 * los documentos del propietario no estaban APROBADOS se devolvía el pago. El
 * tiempo que se demoraba el inquilino llenando, o el agente revisando, se lo
 * comía el propietario. Ahora hay un reloj por etapa, y cada quien responde solo
 * por lo suyo (reglas de Leonardo, 05-oct-2026):
 *
 *   Estado documental        Le toca a      Plazo            Si se vence
 *   (sin enviar, ya pagó)    inquilino      48 h del pago    reembolso
 *   INQ_SUBMITTED            agente         24 h             solo recordatorio
 *   INQ_CORRECTION           inquilino      24 h             reembolso
 *   INQ_VALIDATED            propietario    48 h para CARGAR reembolso
 *   PROP_SUBMITTED           agente         24 h             solo recordatorio
 *   PROP_CORRECTION          propietario    24 h             reembolso
 *   PROP_VALIDATED en adel.  —              —                pago consolidado
 *
 * El reloj se DETIENE cuando el cliente carga: un propietario que cumple a la
 * hora 47 no pierde el proceso porque al agente le quedó una hora para revisar.
 * En los tramos del agente nunca se devuelve dinero; se le recuerda una vez al día.
 *
 * Cómo se sabe cuándo empezó cada etapa: la columna "CONTROL DE PLAZO" guarda
 * "ESTADO|fecha" y se actualiza cada vez que ESTADO DOCUMENTAL cambia
 * (plzSincronizar). El estado se escribe desde varios sitios del código, así que
 * además de llamarla en los puntos conocidos, el auditor de pagos la corre en
 * cada ronda: si algún camino se escapa, se corrige solo en ≤ 30 min.
 *
 * El plazo cuenta desde lo MÁS RECIENTE entre el cambio de estado y el pago: si
 * hubo un reembolso y el inquilino vuelve a pagar días después, su pago nuevo no
 * nace vencido.
 */

var PLAZOS = {
  HOJA: '1.1 - INMUEBLES REGISTRADOS',
  COL_CONTROL: 'CONTROL DE PLAZO',
  COL_ESTADO_DOC: 'ESTADO DOCUMENTAL',
  HORAS_FORMULARIO_INQUILINO: 48,
  HORAS_PROPIETARIO_CARGAR: 48,
  HORAS_CORRECCION: 24,
  HORAS_AGENTE_REVISAR: 24,
  HORAS_BORRADOR: 24,
  CORREO_ADMIN: 'realestate.goldlifesystem@gmail.com',
  CONSOLIDAN: ['PROP_VALIDATED', 'READY_CONTRACT', 'CONTRACT_GENERATED', 'CONTRACT_REVIEW', 'CONTRACT_FINAL', 'COMPLETED']
};

// ==========================================
// FUNCIONES PURAS (sin servicios de Google)
// Prueba: node _herramientas_locales/test_plazos.js
// ==========================================

/** "INQ_CORRECTION|cedula,recibo" → "INQ_CORRECTION". '' si no hay estado. */
function plzEstadoBase(estadoDoc) {
  return String(estadoDoc || '').split('|')[0].trim().toUpperCase();
}

/**
 * ¿En qué va el reloj de este trámite?
 * @param {Object} d { estado, fechaPago (ms), fechaCambio (ms) }
 * @return {{tipo:string, quien:string, vence:number, desde:number}}
 *   tipo: 'consolidado' | 'vence' (hay fecha límite y devuelve dinero) |
 *         'pausado' (le toca al agente) | 'desconocido' (no se puede decidir: NO se reembolsa)
 */
function plzCalcular(d) {
  var estado = plzEstadoBase(d.estado);
  var pago = Number(d.fechaPago) || 0;
  var cambio = Number(d.fechaCambio) || 0;
  var H = 3600000;

  if (PLAZOS.CONSOLIDAN.indexOf(estado) !== -1) return { tipo: 'consolidado', quien: '', vence: 0, desde: 0 };

  if (estado === '') {
    if (!pago) return { tipo: 'desconocido', quien: 'inquilino', vence: 0, desde: 0 };
    return { tipo: 'vence', quien: 'inquilino', vence: pago + PLAZOS.HORAS_FORMULARIO_INQUILINO * H, desde: pago };
  }

  if (estado === 'INQ_SUBMITTED' || estado === 'PROP_SUBMITTED') {
    return { tipo: 'pausado', quien: 'agente', vence: 0, desde: cambio };
  }

  var horas = estado === 'INQ_VALIDATED' ? PLAZOS.HORAS_PROPIETARIO_CARGAR
            : (estado === 'INQ_CORRECTION' || estado === 'PROP_CORRECTION') ? PLAZOS.HORAS_CORRECCION
            : 0;
  if (!horas) return { tipo: 'desconocido', quien: '', vence: 0, desde: 0 };
  // Sin fecha de cambio no se sabe cuándo empezó la etapa: no se adivina.
  if (!cambio) return { tipo: 'desconocido', quien: '', vence: 0, desde: 0 };

  var desde = Math.max(cambio, pago);
  return {
    tipo: 'vence',
    quien: estado === 'INQ_CORRECTION' ? 'inquilino' : 'propietario',
    vence: desde + horas * H,
    desde: desde
  };
}

/** "ESTADO|2026-10-06T02:41:00.000Z" ↔ { estado, ms } */
function plzMarca(estado, ms) {
  return estado + '|' + new Date(ms).toISOString();
}
function plzLeerMarca(texto) {
  var partes = String(texto || '').split('|');
  if (partes.length < 2) return { estado: '', ms: 0 };
  var ms = Date.parse(partes[1]);
  return { estado: partes[0].trim().toUpperCase(), ms: isNaN(ms) ? 0 : ms };
}

/** ¿Toca recordarle al agente? Pasadas 24 h de espera, y como mucho una vez cada 24 h. */
function plzTocaRecordar(desdeMs, ultimoRecordatorioMs, ahoraMs) {
  var H = 3600000;
  if (!desdeMs || ahoraMs - desdeMs < PLAZOS.HORAS_AGENTE_REVISAR * H) return false;
  return !ultimoRecordatorioMs || ahoraMs - ultimoRecordatorioMs >= 24 * H;
}

/** 1791240060000 → "martes 6 de octubre a las 5:41 p. m." (hora de Colombia, UTC−5 fijo). */
function plzFechaLarga(ms) {
  var DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  var MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  var d = new Date(Number(ms) - 5 * 3600000);        // se lee con getUTC* para no depender de la zona del servidor
  var h = d.getUTCHours(), m = d.getUTCMinutes();
  var h12 = h % 12 === 0 ? 12 : h % 12;
  return DIAS[d.getUTCDay()] + ' ' + d.getUTCDate() + ' de ' + MESES[d.getUTCMonth()] +
         ' a las ' + h12 + ':' + ('0' + m).slice(-2) + (h < 12 ? ' a. m.' : ' p. m.');
}

/** Texto seguro para meter dentro de HTML. */
function plzEsc(s) {
  return String(s === null || s === undefined ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** "MARIA CAMILA JIMENEZ" → "Maria Camila Jimenez" (para saludar sin gritar). */
function plzNombrePropio(s) {
  return String(s || '').replace(/\s+/g, ' ').trim().toLowerCase()
    .replace(/(^|[\s\-'])([a-záéíóúüñ])/g, function (_, a, b) { return a + b.toUpperCase(); });
}

// ---------- Plantilla de los correos ----------

/**
 * Arma un correo con la línea gráfica del sistema (negro y dorado).
 * o = { titulo, nombre, cuerpo (HTML), boton:{texto,url}, despuesDelBoton (HTML), codigo }
 */
function plzHtml(o) {
  var boton = o.boton && o.boton.url
    ? '<div style="text-align:center; margin:34px 0;">' +
        '<a href="' + plzEsc(o.boton.url) + '" style="display:inline-block; background-color:#d4af37; color:#ffffff; text-decoration:none; padding:16px 34px; font-size:16px; font-weight:bold; border-radius:4px; text-transform:uppercase; letter-spacing:1px;">' +
        plzEsc(o.boton.texto) + '</a></div>'
    : '';
  return '' +
    '<div style="margin:0; padding:0; background-color:#f4f4f4; font-family:\'Helvetica Neue\', Helvetica, Arial, sans-serif; color:#333333;">' +
      '<div style="max-width:600px; margin:40px auto; background-color:#ffffff; border-radius:8px; overflow:hidden; box-shadow:0 4px 15px rgba(0,0,0,0.1);">' +
        '<div style="background-color:#1a1a1a; color:#d4af37; text-align:center; padding:30px 20px; border-bottom:4px solid #d4af37;">' +
          '<h1 style="margin:0; font-size:24px; letter-spacing:1px; font-weight:300;">REAL ESTATE <br><strong style="font-weight:700;">GOLD LIFE SYSTEM</strong></h1>' +
          '<p style="margin:10px 0 0 0; font-size:12px; letter-spacing:3px; color:#bfa24a;">E-FIRMACONTRATA</p>' +
        '</div>' +
        '<div style="padding:40px 30px; line-height:1.6; font-size:16px;">' +
          '<h2 style="color:#1a1a1a; margin:0 0 22px 0; font-size:21px; line-height:1.3;">' + plzEsc(o.titulo) + '</h2>' +
          '<p style="margin:0 0 20px 0;">Estimado/a <strong>' + plzEsc(plzNombrePropio(o.nombre) || 'cliente') + '</strong>,</p>' +
          o.cuerpo + boton + (o.despuesDelBoton || '') +
          '<p style="margin:28px 0 0 0;">Con aprecio,</p>' +
          '<p style="margin:4px 0 0 0;"><strong style="color:#1a1a1a;">Real Estate - Gold Life System</strong></p>' +
        '</div>' +
        '<div style="background-color:#1a1a1a; color:#888888; text-align:center; padding:20px; font-size:13px;">' +
          '<p style="margin:5px 0;">E-FirmaContrata &bull; <span style="color:#d4af37; font-weight:bold;">Real Estate - Gold Life System</span></p>' +
          (o.codigo ? '<p style="margin:5px 0;">Código de registro: ' + plzEsc(o.codigo) + '</p>' : '') +
          '<p style="margin:5px 0;">Este es un correo automático. Si necesita ayuda, escríbale a su asesor.</p>' +
        '</div>' +
      '</div>' +
    '</div>';
}

function plzP(html) { return '<p style="margin:0 0 20px 0;">' + html + '</p>'; }

/** Recuadro dorado (para lo importante: plazos, garantías). */
function plzCaja(html) {
  return '<div style="background-color:#fcf9f2; border-left:4px solid #d4af37; padding:16px 20px; margin:26px 0; border-radius:0 4px 4px 0; font-size:15px; color:#444444;">' + html + '</div>';
}

/** Lista de pasos numerados. pasos = [[titulo, detalle], ...] */
function plzPasos(pasos) {
  return '<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:22px 0;">' +
    pasos.map(function (p, i) {
      return '<tr>' +
        '<td valign="top" style="width:38px; padding:0 0 14px 0;"><div style="width:28px; height:28px; line-height:28px; border-radius:14px; background-color:#1a1a1a; color:#d4af37; text-align:center; font-weight:bold; font-size:14px;">' + (i + 1) + '</div></td>' +
        '<td valign="top" style="padding:2px 0 14px 0; font-size:15px;"><strong style="color:#1a1a1a;">' + p[0] + '</strong><br><span style="color:#555555;">' + p[1] + '</span></td>' +
      '</tr>';
    }).join('') + '</table>';
}

// ---------- Los textos (devuelven {asunto, html}) ----------

/** 1. Al inquilino, cuando se le envía el formulario. */
function plzCorreoInicialInquilino(d) {
  var dir = d.direccion ? ' del inmueble en <strong>' + plzEsc(d.direccion) + '</strong>' : '';
  return {
    asunto: 'FORMULARIO DE ARRENDAMIENTO DEL INMUEBLE' + (d.direccion ? ' "' + d.direccion + '"' : '') + ' - ' + d.codigo,
    html: plzHtml({
      titulo: '¡Su solicitud fue aprobada! Hagamos su contrato',
      nombre: d.nombre, codigo: d.codigo,
      cuerpo:
        plzP('Tenemos una buena noticia: su solicitud de arrendamiento' + dir + ' fue <strong>aprobada</strong>.') +
        plzP('El contrato lo elaboramos con <strong>E-FirmaContrata</strong>, nuestro sistema digital: todo se hace desde su celular o computador, sin filas ni papeles, y con firma electrónica de plena validez legal.') +
        plzPasos([
          ['Sus datos y documentos', 'Activa el servicio y diligencia un formulario corto. La información viaja cifrada.'],
          ['Contrato a su medida', 'Redactamos el contrato de este inmueble y le enviamos el borrador para que lo revise con calma.'],
          ['Firma electrónica', 'Cuando todas las partes aprueban, se firma en línea a través de una plataforma certificada.']
        ]) +
        plzCaja('<strong>Su pago está protegido.</strong> El valor del trámite se muestra antes de pagar. Si el proceso no llega a formalizarse dentro de los plazos del sistema, <strong>se le devuelve automáticamente</strong>, sin que tenga que pedirlo.'),
      boton: { texto: 'Comenzar ahora', url: d.url },
      despuesDelBoton:
        plzP('<span style="font-size:14px; color:#666666;">Un detalle: una vez realice el pago, cuenta con <strong>' + PLAZOS.HORAS_FORMULARIO_INQUILINO + ' horas</strong> para enviar su formulario. Entre más pronto lo haga, más pronto tendrá su contrato.</span>')
    })
  };
}

/** 2. Al inquilino, cuando se aprueban sus documentos. */
function plzCorreoInquilinoAprobado(d) {
  var plazo = plzFechaLarga(d.vence);
  return {
    asunto: '✅ Sus documentos fueron aprobados - ' + d.codigo,
    html: plzHtml({
      titulo: 'Sus documentos fueron aprobados',
      nombre: d.nombre, codigo: d.codigo,
      cuerpo:
        plzP('Revisamos su documentación' + (d.direccion ? ' para el inmueble en <strong>' + plzEsc(d.direccion) + '</strong>' : '') + ' y todo está en orden. <strong>Su parte quedó aprobada.</strong>') +
        plzP('Lo que sigue ya no depende de usted: acabamos de enviarle al propietario su formulario para que cargue sus documentos. Apenas los tengamos aprobados, pasamos a elaborar el contrato.') +
        plzCaja('<strong>Su garantía.</strong> El propietario tiene hasta el <strong>' + plazo + '</strong> para cargar sus documentos. Si no lo hace, el sistema <strong>le devuelve su pago automáticamente</strong> y se lo notificamos por este medio. No tiene que hacer nada.') +
        plzP('Le escribiremos en cuanto haya novedades. Gracias por su confianza.')
    })
  };
}

/** 3. Al propietario, con su formulario, cuando se aprueba al inquilino. */
function plzCorreoPropietarioFormulario(d) {
  var cajaPlazo = d.vence
    ? plzCaja('<strong>Tiempos garantizados.</strong> Para asegurarle a usted y a su inquilino la entrega oportuna del contrato, el sistema reserva este proceso hasta el <strong>' + plzFechaLarga(d.vence) + '</strong>.<br><br>' +
              'Si para ese momento no hemos recibido sus documentos, el sistema le devuelve el pago al inquilino y libera el proceso; para retomarlo habría que iniciarlo de nuevo desde cero. Cargarlos ahora le toma unos minutos y deja su arrendamiento asegurado.')
    : '';
  return {
    asunto: 'FORMULARIO DE PROPIETARIO DEL INMUEBLE' + (d.direccion ? ' "' + d.direccion + '"' : '') + ' - ' + d.codigo,
    html: plzHtml({
      titulo: 'Su inquilino está listo. Ahora sigue usted',
      nombre: d.nombre, codigo: d.codigo,
      cuerpo:
        plzP('Le damos la bienvenida a <strong>E-FirmaContrata</strong>, el sistema con el que elaboramos y firmamos el contrato de su inmueble' + (d.direccion ? ' en <strong>' + plzEsc(d.direccion) + '</strong>' : '') + ' de forma digital: sin filas, sin papeles y con firma electrónica de plena validez legal.') +
        plzP('<strong>La buena noticia:</strong> su inquilino ya entregó toda su documentación, la revisamos y fue <strong>aprobada</strong>. Está listo para firmar.') +
        plzP('Para continuar solo necesitamos sus documentos:') +
        '<ul style="margin:0 0 22px 0; padding-left:22px; color:#444444; line-height:1.9; font-size:15px;">' +
          '<li>Documento de identidad</li><li>Formulario SARLAFT</li><li>Certificado bancario</li>' +
          '<li>Certificado de tradición y libertad</li><li>Recibos de servicios públicos al día</li></ul>' +
        cajaPlazo,
      boton: { texto: 'Cargar mis documentos', url: d.url },
      despuesDelBoton:
        plzP('<span style="font-size:14px; color:#666666;">Después de esto ya casi terminamos: revisamos sus documentos, le enviamos el borrador del contrato para su aprobación y pasamos a la firma electrónica.</span>')
    })
  };
}

/** 4. A los dos, cuando se aprueban los documentos del propietario. rol: 'inquilino' | 'propietario' */
function plzCorreoTodoAprobado(d) {
  return {
    asunto: '🎉 Documentos aprobados: sigue su contrato - ' + d.codigo,
    html: plzHtml({
      titulo: 'Todo aprobado. Viene su contrato',
      nombre: d.nombre, codigo: d.codigo,
      cuerpo:
        plzP('Los documentos de <strong>ambas partes</strong> ya fueron revisados y aprobados' + (d.direccion ? ' para el inmueble en <strong>' + plzEsc(d.direccion) + '</strong>' : '') + '. ' +
             (d.rol === 'inquilino' ? 'Su pago quedó en firme y el proceso sigue adelante.' : 'El proceso quedó asegurado y sigue adelante.')) +
        plzP('Esto es lo que viene:') +
        plzPasos([
          ['Borrador del contrato', 'En un plazo máximo de ' + PLAZOS.HORAS_BORRADOR + ' horas recibirá un correo con el borrador para revisarlo en línea.'],
          ['Su revisión', 'Podrá aprobarlo o pedir ajustes desde la misma pantalla. Cada ajuste genera una nueva versión, hasta que todas las partes estén de acuerdo.'],
          ['Firma electrónica', 'Con el contrato aprobado por todos, le llegará la invitación para firmar en línea.']
        ]) +
        plzCaja('<strong>Esté pendiente de su correo.</strong> El siguiente mensaje le llegará a esta misma dirección. Si no lo ve en su bandeja de entrada, revise la carpeta de spam o promociones.')
    })
  };
}

/** 5. Explicación de la sala de revisión, para el correo del borrador. Devuelve HTML para MENSAJE_PRINCIPAL. */
function plzTextoRevisionBorrador(rol) {
  var quien = rol === 'propietario' ? 'del contrato de arrendamiento de su propiedad'
            : rol === 'codeudor' ? 'del contrato de arrendamiento en el que usted figura como codeudor'
            : 'de su contrato de arrendamiento';
  return 'El borrador ' + quien + ' ya está listo para su revisión.<br><br>' +
    '<strong>Así funciona la sala de revisión:</strong>' +
    '<ol style="margin:12px 0 0 0; padding-left:22px; line-height:1.7;">' +
      '<li><strong>Lea el borrador</strong> con calma. En "Seleccione su rol" indique quién es usted.</li>' +
      '<li>Si está de acuerdo, pulse <strong>Aprobar Contrato</strong>.</li>' +
      '<li>Si quiere un ajuste, escríbalo en <strong>Observaciones</strong> y pulse <strong>Solicitar Corrección</strong>. Prepararemos una <strong>nueva versión</strong> y le volverá a llegar.</li>' +
      '<li>En el <strong>Historial de Revisiones</strong> verá cada versión y los comentarios de todas las partes: nada se cambia sin que quede registrado.</li>' +
    '</ol>';
}
var PLZ_TEXTO_REVISION_SECUNDARIO =
  'Cuando <strong>todas las partes aprueban la misma versión</strong>, generamos el contrato definitivo y pasamos a la firma electrónica. Entre más pronto lo revise, más pronto tendrá su contrato firmado.';

/** 6. A las partes, cuando el borrador pasa a contrato original. Devuelve textos para la plantilla común. */
function plzTextosContratoListo(displayId) {
  return {
    titulo: 'Su contrato está listo para firmar',
    principal: 'El contrato de arrendamiento <strong>' + plzEsc(displayId) + '</strong> fue aprobado por todas las partes y ya generamos el <strong>documento definitivo</strong>.<br><br>' +
               'El siguiente paso es la <strong>firma electrónica</strong>: en breve recibirá un correo de nuestra plataforma de firma certificada con el enlace para firmar. Es un proceso guiado que toma pocos minutos y tiene plena validez legal.',
    secundario: '<strong>Esté pendiente de su bandeja de entrada.</strong> El correo de firma llega de una dirección distinta a esta; si no lo ve, revise la carpeta de spam o promociones. Una vez firmen todas las partes, el contrato queda formalizado.'
  };
}

/** Aviso de plazo para los correos de corrección (HTML). */
function plzAvisoCorreccionHtml(venceMs) {
  return plzCaja('⏳ <strong>Tiene ' + PLAZOS.HORAS_CORRECCION + ' horas para enviar la corrección:</strong> hasta el <strong>' + plzFechaLarga(venceMs) + '</strong>.<br><br>' +
                 'El sistema reserva el proceso durante ese tiempo. Si la corrección no llega, devuelve el pago del inquilino y libera el proceso, y habría que iniciarlo de nuevo desde cero. Son solo los documentos indicados: le tomará unos minutos.');
}

/** Al inquilino, cuando se le devuelve el pago. */
function plzCorreoReembolsoInquilino(d) {
  return {
    asunto: 'Le devolvimos su pago - ' + d.codigo,
    html: plzHtml({
      titulo: 'Le devolvimos su pago',
      nombre: d.nombre, codigo: d.codigo,
      cuerpo:
        plzP('El proceso de arrendamiento' + (d.direccion ? ' del inmueble en <strong>' + plzEsc(d.direccion) + '</strong>' : '') + ' no alcanzó a completarse dentro del plazo garantizado por el sistema.') +
        plzCaja('Tal como nos comprometimos, <strong>ya le devolvimos el valor que pagó</strong>. El reembolso se hace al mismo medio de pago que usó; según su banco, puede tardar unos días en verse reflejado.') +
        plzP('Si sigue interesado en el inmueble, con gusto retomamos el proceso cuando usted quiera: solo escríbale a su asesor. Gracias por su confianza y por su paciencia.')
    })
  };
}

/** Al propietario, cuando se devuelve el pago del inquilino. */
function plzCorreoReembolsoPropietario(d) {
  return {
    asunto: 'El proceso de su inmueble se liberó - ' + d.codigo,
    html: plzHtml({
      titulo: 'El proceso de su inmueble se liberó',
      nombre: d.nombre, codigo: d.codigo,
      cuerpo:
        plzP('Le informamos que se cumplió el plazo que el sistema había reservado para el contrato' + (d.direccion ? ' del inmueble en <strong>' + plzEsc(d.direccion) + '</strong>' : '') + ' sin que el proceso quedara completo.') +
        plzP('Para cumplirle al inquilino con los tiempos garantizados, <strong>le devolvimos su pago y el proceso quedó liberado</strong>.') +
        plzCaja('<strong>Podemos retomarlo.</strong> Si desea continuar con este arrendamiento, escríbale a su asesor y lo iniciamos de nuevo. Tener sus documentos a la mano hará que esta vez sea mucho más rápido.')
    })
  };
}

// ---------- Avisos al agente ----------

/** Aviso al agente cuando un cliente carga sus documentos. quien: 'inquilino' | 'propietario' */
function plzCorreoAgenteCarga(d) {
  var esProp = d.quien === 'propietario';
  return {
    asunto: (esProp ? '📥 El PROPIETARIO cargó sus documentos' : '📥 El INQUILINO cargó sus documentos') + ' - ' + d.codigo,
    html: plzHtml({
      titulo: (esProp ? 'El propietario' : 'El inquilino') + ' ya cargó sus documentos',
      nombre: 'Equipo GoldLife', codigo: d.codigo,
      cuerpo:
        plzP('<strong>' + plzEsc(plzNombrePropio(d.nombreCliente) || (esProp ? 'El propietario' : 'El inquilino')) + '</strong> envió su formulario' + (d.direccion ? ' del inmueble en <strong>' + plzEsc(d.direccion) + '</strong>' : '') + ' (' + plzEsc(d.codigo) + ').') +
        plzCaja('<strong>Tienes ' + PLAZOS.HORAS_AGENTE_REVISAR + ' horas para revisarlos</strong>, hasta el ' + plzFechaLarga(d.vence) + '.<br>Mientras los revisas, el reloj del reembolso está detenido: no se devuelve ningún pago por este tramo.') +
        plzP('Abre el panel de validación desde la hoja para aprobarlos o pedir una corrección.'),
      boton: d.urlHoja ? { texto: 'Abrir la hoja', url: d.urlHoja } : null
    })
  };
}

/** Recordatorio diario al agente si lleva más de 24 h sin revisar. */
function plzCorreoAgenteRecordatorio(d) {
  var esProp = d.quien === 'propietario';
  return {
    asunto: '⏰ PENDIENTE: llevas ' + d.horas + ' h sin revisar los documentos del ' + (esProp ? 'propietario' : 'inquilino') + ' - ' + d.codigo,
    html: plzHtml({
      titulo: 'Hay documentos esperando tu revisión',
      nombre: 'Equipo GoldLife', codigo: d.codigo,
      cuerpo:
        plzP('Los documentos del <strong>' + (esProp ? 'propietario' : 'inquilino') + '</strong>' + (d.nombreCliente ? ' (' + plzEsc(plzNombrePropio(d.nombreCliente)) + ')' : '') + (d.direccion ? ' del inmueble en <strong>' + plzEsc(d.direccion) + '</strong>' : '') + ' llevan <strong>' + d.horas + ' horas</strong> sin revisar.') +
        plzCaja('El compromiso es revisarlos en ' + PLAZOS.HORAS_AGENTE_REVISAR + ' horas. No se devuelve ningún pago por esta demora, pero <strong>el inquilino y el propietario están esperando</strong>.') +
        plzP('Este recordatorio se repite una vez al día hasta que los apruebes o pidas una corrección.'),
      boton: d.urlHoja ? { texto: 'Abrir la hoja', url: d.urlHoja } : null
    })
  };
}

// ==========================================
// HOJA: CONTROL DE PLAZO
// ==========================================

function _plzHoja() {
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(PLAZOS.HOJA);
}
function _plzEncabezados(sheet) {
  return sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(function (h) { return String(h).trim(); });
}

/**
 * Pone al día la marca "ESTADO|fecha" de una fila. Idempotente: solo escribe
 * cuando ESTADO DOCUMENTAL cambió desde la última vez que se miró.
 * @return {{estado:string, cambioMs:number, cambio:boolean}}
 */
function plzSincronizar(sheet, fila, headers) {
  headers = headers ? headers.map(function (h) { return String(h).trim(); }) : _plzEncabezados(sheet);
  var cEstado = headers.indexOf(PLAZOS.COL_ESTADO_DOC);
  var cControl = headers.indexOf(PLAZOS.COL_CONTROL);
  if (cEstado === -1 || cControl === -1) return { estado: '', cambioMs: 0, cambio: false, sinColumna: true };

  var estado = plzEstadoBase(sheet.getRange(fila, cEstado + 1).getValue());
  var celda = sheet.getRange(fila, cControl + 1);
  var marca = plzLeerMarca(celda.getValue());

  if (!estado) return { estado: '', cambioMs: 0, cambio: false };
  if (marca.estado === estado && marca.ms) return { estado: estado, cambioMs: marca.ms, cambio: false };

  var ahora = new Date().getTime();
  celda.setValue(plzMarca(estado, ahora));
  return { estado: estado, cambioMs: ahora, cambio: true };
}

/** Datos de la fila que usan los correos. */
function _plzDatosFila(sheet, fila, headers) {
  var v = sheet.getRange(fila, 1, 1, headers.length).getValues()[0];
  var g = function (n) { var i = headers.indexOf(n); return i === -1 ? '' : String(v[i] === null || v[i] === undefined ? '' : v[i]).trim(); };
  return {
    codigo: g('ID DE REGISTRO') || g('CODIGO DE REGISTRO'),
    direccion: g('Ingrese la Dirección del inmueble'),
    inquilino: g('NOMBRE COMPLETO INQUILINO'), correoInquilino: g('CORREO INQUILINO'),
    propietario: g('NOMBRES Y APELLIDOS DEL PROPIETARIO'), correoPropietario: g('Correo electrónico')
  };
}

function _plzEnviar(para, correo, cco) {
  if (!para || String(para).indexOf('@') === -1) return false;
  var m = { to: para, subject: correo.asunto, htmlBody: correo.html };
  if (cco) m.bcc = cco;
  MailApp.sendEmail(m);
  return true;
}

/**
 * Llamar justo después de cambiar ESTADO DOCUMENTAL. Marca el inicio de la etapa
 * y, si el cliente acaba de cargar, le avisa al agente. Nunca lanza.
 * @return {{estado, cambioMs, cambio}} o null si falló
 */
function plzAlCambiarEstado(fila) {
  try {
    var sheet = _plzHoja();
    var headers = _plzEncabezados(sheet);
    var s = plzSincronizar(sheet, fila, headers);
    if (s.cambio && (s.estado === 'INQ_SUBMITTED' || s.estado === 'PROP_SUBMITTED')) {
      var d = _plzDatosFila(sheet, fila, headers);
      var quien = s.estado === 'PROP_SUBMITTED' ? 'propietario' : 'inquilino';
      _plzEnviar(PLAZOS.CORREO_ADMIN, plzCorreoAgenteCarga({
        quien: quien, codigo: d.codigo, direccion: d.direccion,
        nombreCliente: quien === 'propietario' ? d.propietario : d.inquilino,
        vence: s.cambioMs + PLAZOS.HORAS_AGENTE_REVISAR * 3600000,
        urlHoja: SpreadsheetApp.getActiveSpreadsheet().getUrl()
      }));
    }
    return s;
  } catch (e) {
    Logger.log('⚠️ plzAlCambiarEstado: ' + e.message);
    return null;
  }
}

/** Fecha límite (ms) de la etapa actual de una fila, o 0 si no hay reloj corriendo. No usa la fecha de pago. */
function plzVencimientoDeFila(fila) {
  try {
    var sheet = _plzHoja();
    var s = plzSincronizar(sheet, fila, _plzEncabezados(sheet));
    var p = plzCalcular({ estado: s.estado, fechaCambio: s.cambioMs, fechaPago: 0 });
    return p.tipo === 'vence' ? p.vence : 0;
  } catch (e) {
    Logger.log('⚠️ plzVencimientoDeFila: ' + e.message);
    return 0;
  }
}

// ==========================================
// ENGANCHES CON EL AUDITOR DE PAGOS (API_MERCADOPAGO.js)
// ==========================================

/**
 * ¿Hay que devolver este pago YA? Lo llama auditorDeContratosVencidos por cada
 * pago APROBADO cuyo trámite todavía no consolida. De paso pone al día la marca
 * de la fila y le recuerda al agente si lleva más de 24 h sin revisar.
 *
 * Ante cualquier duda devuelve false: mejor un pago sin devolver que avisa en el
 * registro, que devolverle la plata a alguien que estaba cumpliendo.
 */
function plzPagoVencido(sheet, fila, headers, fechaPagoMs, ahoraMs) {
  try {
    var enc = headers.map(function (h) { return String(h).trim(); });
    var s = plzSincronizar(sheet, fila, enc);
    if (s.sinColumna) {
      Logger.log('⚠️ Falta la columna ' + PLAZOS.COL_CONTROL + ': no se decide ningún reembolso.');
      return false;
    }
    if (s.cambio && (s.estado === 'INQ_SUBMITTED' || s.estado === 'PROP_SUBMITTED')) {
      // Un cambio que no pasó por plzAlCambiarEstado: el aviso al agente sale desde aquí
      var d0 = _plzDatosFila(sheet, fila, enc);
      var q0 = s.estado === 'PROP_SUBMITTED' ? 'propietario' : 'inquilino';
      _plzEnviar(PLAZOS.CORREO_ADMIN, plzCorreoAgenteCarga({
        quien: q0, codigo: d0.codigo, direccion: d0.direccion,
        nombreCliente: q0 === 'propietario' ? d0.propietario : d0.inquilino,
        vence: s.cambioMs + PLAZOS.HORAS_AGENTE_REVISAR * 3600000,
        urlHoja: SpreadsheetApp.getActiveSpreadsheet().getUrl()
      }));
    }

    var p = plzCalcular({ estado: s.estado, fechaPago: fechaPagoMs, fechaCambio: s.cambioMs });

    if (p.tipo === 'vence') return ahoraMs >= p.vence;

    if (p.tipo === 'pausado') {
      var d = _plzDatosFila(sheet, fila, enc);
      var props = PropertiesService.getScriptProperties();
      var clave = 'PLZ_RECORDATORIO_' + d.codigo + '_' + s.estado;
      if (plzTocaRecordar(p.desde, Number(props.getProperty(clave)) || 0, ahoraMs)) {
        var quien = s.estado === 'PROP_SUBMITTED' ? 'propietario' : 'inquilino';
        _plzEnviar(PLAZOS.CORREO_ADMIN, plzCorreoAgenteRecordatorio({
          quien: quien, codigo: d.codigo, direccion: d.direccion,
          nombreCliente: quien === 'propietario' ? d.propietario : d.inquilino,
          horas: Math.floor((ahoraMs - p.desde) / 3600000),
          urlHoja: SpreadsheetApp.getActiveSpreadsheet().getUrl()
        }));
        props.setProperty(clave, String(ahoraMs));
      }
    }
    return false;
  } catch (e) {
    Logger.log('⚠️ plzPagoVencido falló (no se reembolsa): ' + e.message);
    return false;
  }
}

/** Tras un reembolso exitoso: avisa al inquilino y al propietario. Nunca lanza. */
function plzAvisarReembolso(sheet, fila, headers) {
  try {
    var enc = headers.map(function (h) { return String(h).trim(); });
    var d = _plzDatosFila(sheet, fila, enc);
    _plzEnviar(d.correoInquilino, plzCorreoReembolsoInquilino({ nombre: d.inquilino, codigo: d.codigo, direccion: d.direccion }), PLAZOS.CORREO_ADMIN);
    _plzEnviar(d.correoPropietario, plzCorreoReembolsoPropietario({ nombre: d.propietario, codigo: d.codigo, direccion: d.direccion }));
  } catch (e) {
    Logger.log('⚠️ No se pudo avisar del reembolso: ' + e.message);
  }
}

// ==========================================
// ENVÍOS QUE DISPARA LA VALIDACIÓN (GESTOR DE DOCUMENTOS.js)
// ==========================================

/** Al aprobar al inquilino: marca la etapa y le escribe al inquilino. Devuelve la fecha límite del propietario (ms). */
function plzAlAprobarInquilino(fila) {
  var vence = 0;
  try {
    var sheet = _plzHoja();
    var headers = _plzEncabezados(sheet);
    var s = plzSincronizar(sheet, fila, headers);
    vence = (s.cambioMs || new Date().getTime()) + PLAZOS.HORAS_PROPIETARIO_CARGAR * 3600000;
    var d = _plzDatosFila(sheet, fila, headers);
    _plzEnviar(d.correoInquilino, plzCorreoInquilinoAprobado({ nombre: d.inquilino, codigo: d.codigo, direccion: d.direccion, vence: vence }));
  } catch (e) {
    Logger.log('⚠️ plzAlAprobarInquilino: ' + e.message);
  }
  return vence;
}

/** Al aprobar al propietario: les escribe a los dos. */
function plzAlAprobarPropietario(fila) {
  try {
    var sheet = _plzHoja();
    var headers = _plzEncabezados(sheet);
    plzSincronizar(sheet, fila, headers);
    var d = _plzDatosFila(sheet, fila, headers);
    _plzEnviar(d.correoInquilino, plzCorreoTodoAprobado({ rol: 'inquilino', nombre: d.inquilino, codigo: d.codigo, direccion: d.direccion }));
    _plzEnviar(d.correoPropietario, plzCorreoTodoAprobado({ rol: 'propietario', nombre: d.propietario, codigo: d.codigo, direccion: d.direccion }));
  } catch (e) {
    Logger.log('⚠️ plzAlAprobarPropietario: ' + e.message);
  }
}

// ==========================================
// PRUEBA MANUAL (editor de Apps Script)
// ==========================================

/**
 * Envía TODOS los correos nuevos al correo del sistema, con datos de ejemplo y
 * [PRUEBA n/11] en el asunto, para leerlos tal como le llegarían al cliente.
 * No toca la hoja ni le escribe a ningún cliente.
 */
function probarCorreosDePlazos() {
  var ahora = new Date().getTime();
  var base = { codigo: 'AA000000', direccion: 'Cl 100 #10-20', url: 'https://realestate-goldlifesystem.github.io/efirmacontrata/frontend/' };
  var inq = Object.assign({ nombre: 'JUAN CARLOS PÉREZ GÓMEZ' }, base);
  var prop = Object.assign({ nombre: 'MARÍA FERNANDA LÓPEZ RUIZ' }, base);
  var urlHoja = SpreadsheetApp.getActiveSpreadsheet().getUrl();
  var listo = plzTextosContratoListo(base.codigo);

  var tplRev = HtmlService.createTemplateFromFile('backend/email_notificacion');
  tplRev.TITULO = 'Borrador del Contrato Listo para Revisión';
  tplRev.NOMBRE_CLIENTE = 'Juan Carlos Pérez Gómez';
  tplRev.MENSAJE_PRINCIPAL = plzTextoRevisionBorrador('inquilino');
  tplRev.MENSAJE_SECUNDARIO = PLZ_TEXTO_REVISION_SECUNDARIO;
  tplRev.URL_ACCION = base.url; tplRev.TEXTO_BOTON = 'Revisar y Validar Borrador del Contrato';

  var tplListo = HtmlService.createTemplateFromFile('backend/email_notificacion');
  tplListo.TITULO = listo.titulo; tplListo.NOMBRE_CLIENTE = 'cliente';
  tplListo.MENSAJE_PRINCIPAL = listo.principal; tplListo.MENSAJE_SECUNDARIO = listo.secundario;
  tplListo.URL_ACCION = ''; tplListo.TEXTO_BOTON = '';

  var correos = [
    plzCorreoInicialInquilino(inq),
    plzCorreoInquilinoAprobado(Object.assign({ vence: ahora + 48 * 3600000 }, inq)),
    plzCorreoPropietarioFormulario(Object.assign({ vence: ahora + 48 * 3600000 }, prop)),
    plzCorreoTodoAprobado(Object.assign({ rol: 'inquilino' }, inq)),
    { asunto: 'Borrador del Contrato de Arrendamiento para Revisión - ' + base.codigo, html: tplRev.evaluate().getContent() },
    { asunto: 'Contrato Original Aprobado - Listo para Firma Electrónica: ' + base.codigo, html: tplListo.evaluate().getContent() },
    plzCorreoReembolsoInquilino(inq),
    plzCorreoReembolsoPropietario(prop),
    plzCorreoAgenteCarga({ quien: 'propietario', codigo: base.codigo, direccion: base.direccion, nombreCliente: prop.nombre, vence: ahora + 24 * 3600000, urlHoja: urlHoja }),
    plzCorreoAgenteRecordatorio({ quien: 'propietario', codigo: base.codigo, direccion: base.direccion, nombreCliente: prop.nombre, horas: 26, urlHoja: urlHoja }),
    // El recuadro de plazo que llevan los correos de corrección (el resto de ese correo no cambió)
    { asunto: 'Corrección requerida - así se ve el aviso de plazo - ' + base.codigo,
      html: plzHtml({ titulo: 'Corrección requerida', nombre: prop.nombre, codigo: base.codigo,
        cuerpo: plzP('Hemos revisado sus documentos y necesitamos que vuelva a enviar los siguientes archivos para continuar con el proceso:') +
                '<ul style="color:#666666;"><li>Certificado bancario</li></ul>' + plzAvisoCorreccionHtml(ahora + 24 * 3600000),
        boton: { texto: 'Realizar correcciones', url: base.url } }) }
  ];
  correos.forEach(function (c, i) {
    MailApp.sendEmail({ to: PLAZOS.CORREO_ADMIN, subject: '[PRUEBA ' + (i + 1) + '/' + correos.length + '] ' + c.asunto, htmlBody: c.html });
  });
  Logger.log('Enviados ' + correos.length + ' correos de prueba a ' + PLAZOS.CORREO_ADMIN);
}
