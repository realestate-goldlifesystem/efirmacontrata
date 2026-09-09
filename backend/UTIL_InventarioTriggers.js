/**
 * INVENTARIO DE TRIGGERS: qué hay instalado, qué hace cada uno y cuáles sobran.
 *
 * Apps Script admite 20 triggers por proyecto. Pasado ese tope, create() lanza
 * excepción — y eso ya provocó un inmueble duplicado el 08-09-2026, porque la
 * excepción abortó el borrado de una fila temporal. Conviene tenerlos a raya.
 *
 * La API de Trigger NO dice cada cuánto se ejecuta uno ni cuándo le toca. Por eso
 * la frecuencia se saca del CATÁLOGO de abajo, que refleja lo que crea el código.
 * Si un trigger no aparece en el catálogo, se marca como desconocido para que se
 * revise a mano en vez de darlo por bueno.
 *
 * Ejecutar inventariarTriggers() desde el editor. No modifica nada.
 */

// Lo que el propio código instala. Fuente: UTIL_Triggers.js, API_CRON_AGENDA.js,
// UTIL_Rollback.js y 1- REGISTRO DE INMUEBLE.js.
var CATALOGO_TRIGGERS = {
  // ---- Recurrentes: se ejecutan solos una y otra vez ----
  'auditorDeContratosVencidos': {
    frecuencia: 'CADA 1 MINUTO', clase: 'recurrente',
    para: 'Reembolsos / contratos vencidos.',
    nota: 'El que más ejecuciones consume con diferencia: ~1.440 al día.'
  },
  'revisarBuzonAndrea': {
    frecuencia: 'CADA 5 MINUTOS', clase: 'recurrente',
    para: 'Buzón del agente de voz Andrea.',
    nota: '~288 ejecuciones al día. Si Andrea no está en uso, es candidato a quitar.'
  },
  'ejecutarMotorAgenda': {
    frecuencia: 'CADA HORA', clase: 'recurrente',
    para: 'Motor de agenda (citas y recordatorios).', nota: ''
  },
  'cronJobActualizarBancos': {
    frecuencia: 'DIARIO 3:00 AM', clase: 'recurrente',
    para: 'Actualiza la lista de bancos.', nota: ''
  },
  'sincroTasasSFC': {
    frecuencia: 'SEMANAL, lunes 2:00 AM', clase: 'recurrente',
    para: 'Sincroniza tasas de la Superfinanciera.', nota: ''
  },

  // ---- Por evento: solo cuando alguien hace algo ----
  'onFormSubmitInmueble': {
    frecuencia: 'AL ENVIAR EL FORMULARIO', clase: 'evento',
    para: 'Arranca el registro de un inmueble.',
    nota: 'IMPRESCINDIBLE: sin él no se registra nada.'
  },
  'onEditEstados': {
    frecuencia: 'AL EDITAR EL SHEET', clase: 'evento',
    para: 'Reacciona a cambios de estado en la hoja.', nota: ''
  },

  // ---- De un solo uso: se crean, se disparan y deberían desaparecer ----
  'continuarRegistroInmuebleParte2': {
    frecuencia: 'UN SOLO USO (a los 2 s)', clase: 'unSoloUso',
    para: 'Segunda fase del registro.',
    nota: 'Normal verlo mientras hay un registro en curso. Varios a la vez, o uno con la cola vacía, sobran.'
  },
  'continuarRegistroInmuebleParte3': {
    frecuencia: 'UN SOLO USO', clase: 'unSoloUso',
    para: 'Tercera fase del registro.', nota: 'Igual que el anterior.'
  },
  'procesarRegistrosPendientes': {
    frecuencia: 'UN SOLO USO', clase: 'unSoloUso',
    para: 'Worker de la cola de registros.', nota: 'Igual que el anterior.'
  },
  'watchdogColaRegistros': {
    frecuencia: 'UN SOLO USO (se re-arma)', clase: 'unSoloUso',
    para: 'Vigila que la cola no se quede colgada.',
    nota: 'Debería haber como mucho UNO. Se re-arma solo mientras haya cola.'
  },
  'triggerRecordatorioRenovacion': {
    frecuencia: 'UN SOLO USO (día 6)', clase: 'unSoloUso',
    para: 'Recuerda al propietario que firme la renovación.',
    nota: 'Se borra si firma a tiempo. Si se acumulan, son de renovaciones ya cerradas.'
  },
  'triggerRollbackAutomatico': {
    frecuencia: 'UN SOLO USO (día 7)', clase: 'unSoloUso',
    para: 'Revierte la renovación si nadie firmó.',
    nota: 'Mismo caso que el anterior.'
  }
};

function inventariarTriggers() {
  var triggers = ScriptApp.getProjectTriggers();
  Logger.log('===== INVENTARIO DE TRIGGERS =====');
  Logger.log('Instalados: ' + triggers.length + ' de 20 posibles.');
  if (triggers.length >= 18) {
    Logger.log('🔴 AL BORDE DEL TOPE. Al llegar a 20, crear uno nuevo lanza excepción');
    Logger.log('   y eso rompe registros a mitad (pasó el 08-09-2026).');
  } else if (triggers.length >= 14) {
    Logger.log('🟠 Va justo. Conviene liberar los que sobren.');
  } else {
    Logger.log('🟢 Con margen.');
  }

  // Agrupar por función
  var porFuncion = {};
  triggers.forEach(function (t) {
    var f = t.getHandlerFunction();
    if (!porFuncion[f]) porFuncion[f] = [];
    porFuncion[f].push(t);
  });

  var recurrentes = [], eventos = [], unSoloUso = [], desconocidos = [], huerfanos = [];

  for (var f in porFuncion) {
    var info = CATALOGO_TRIGGERS[f];
    var existe = true;
    try { existe = (typeof this[f] === 'function'); } catch (e) { existe = true; }
    var fila = { fn: f, n: porFuncion[f].length, info: info, existe: existe };
    if (!existe) huerfanos.push(fila);
    else if (!info) desconocidos.push(fila);
    else if (info.clase === 'recurrente') recurrentes.push(fila);
    else if (info.clase === 'evento') eventos.push(fila);
    else unSoloUso.push(fila);
  }

  var pinta = function (titulo, lista, explicacion) {
    Logger.log('');
    Logger.log('--- ' + titulo + ' ---');
    if (explicacion) Logger.log(explicacion);
    if (!lista.length) { Logger.log('   (ninguno)'); return; }
    lista.forEach(function (x) {
      var rep = x.n > 1 ? '  ⚠️ x' + x.n + ' REPETIDO' : '';
      Logger.log('   ' + x.fn + rep);
      if (x.info) {
        Logger.log('      ' + x.info.frecuencia + ' — ' + x.info.para);
        if (x.info.nota) Logger.log('      ' + x.info.nota);
      }
    });
  };

  pinta('SE EJECUTAN SOLOS, UNA Y OTRA VEZ', recurrentes,
        'Estos son los que consumen cuota todo el día, aunque nadie toque nada.');
  pinta('SOLO CUANDO ALGUIEN HACE ALGO', eventos,
        'No gastan nada si no se usa el formulario ni se edita la hoja.');
  pinta('DE UN SOLO USO (aquí viven los fantasmas)', unSoloUso,
        'Se crean para una tarea y deberían irse al terminarla. Un .after() ya\n' +
        'gastado SIGUE APARECIENDO en la lista aunque no vaya a ejecutarse más:\n' +
        'ocupa sitio de los 20 y engaña a quien pregunte si hay trabajo en marcha.');
  pinta('NO ESTÁN EN EL CATÁLOGO', desconocidos,
        'No los crea el código que conozco. Revisar a mano antes de tocarlos.');
  pinta('🔴 APUNTAN A FUNCIONES QUE YA NO EXISTEN', huerfanos,
        'Fantasmas seguros: fallarán siempre. Se pueden borrar sin pensarlo.');

  // ¿Los de un solo uso tienen trabajo real esperándoles?
  Logger.log('');
  Logger.log('--- ¿HAY TRABAJO DE VERDAD EN LA COLA? ---');
  var props = PropertiesService.getScriptProperties().getProperties();
  var cola = [];
  for (var k in props) {
    if (k.indexOf('PROCESO_PARTE2_') === 0 || k.indexOf('PROCESO_PARTE3_') === 0 ||
        k.indexOf('PENDING_REGISTRATION_') === 0) cola.push(k);
  }
  Logger.log('Elementos en la cola: ' + cola.length + (cola.length ? ' → ' + cola.join(', ') : ''));
  var totalUnSoloUso = unSoloUso.reduce(function (s, x) { return s + x.n; }, 0);
  if (!cola.length && totalUnSoloUso > 0) {
    Logger.log('⚠️ Hay ' + totalUnSoloUso + ' trigger(s) de un solo uso pero la cola está VACÍA:');
    Logger.log('   salvo los de renovación (días 6 y 7), son fantasmas y se pueden liberar.');
  } else if (cola.length) {
    Logger.log('✅ Hay trabajo pendiente: esos triggers de un solo uso tienen sentido ahora.');
  }

  Logger.log('');
  Logger.log('Para liberar los fantasmas: limpiarTriggersFantasma()  (primero informa, no borra)');
  Logger.log('===== FIN =====');
}

/**
 * Libera triggers fantasma. Por defecto SOLO INFORMA.
 *
 * Se considera fantasma:
 *   · el que apunta a una función que ya no existe (falla siempre);
 *   · los de un solo uso del registro (Parte 2, Parte 3, worker, watchdog)
 *     cuando la cola está VACÍA, o sea que no tienen nada que hacer.
 *
 * NUNCA toca los recurrentes, los de evento ni los de renovación de los días 6
 * y 7: esos tienen trabajo futuro real aunque ahora parezcan dormidos.
 */
function limpiarTriggersFantasma() {
  limpiarTriggersFantasmaImpl(false);
}

function limpiarTriggersFantasma_CONFIRMADO() {
  limpiarTriggersFantasmaImpl(true);
}

function limpiarTriggersFantasmaImpl(borrar) {
  var props = PropertiesService.getScriptProperties().getProperties();
  var hayCola = false;
  for (var k in props) {
    if (k.indexOf('PROCESO_PARTE2_') === 0 || k.indexOf('PROCESO_PARTE3_') === 0 ||
        k.indexOf('PENDING_REGISTRATION_') === 0) { hayCola = true; break; }
  }

  var deUnSoloUsoDelRegistro = ['continuarRegistroInmuebleParte2',
                                'continuarRegistroInmuebleParte3',
                                'procesarRegistrosPendientes',
                                'watchdogColaRegistros'];

  // IDs de los triggers de renovación que SIGUEN vivos. programarTriggersRollback
  // los apunta en Properties, y cancelarTriggersRollback los borra al firmar. Si
  // el ID de un trigger ya no está registrado, esa renovación se cerró y el
  // trigger se quedó huérfano ocupando sitio.
  var idsVivos = {};
  for (var p in props) {
    if (p.indexOf('TRIGGERS_RECORDATORIO_') === 0 || p.indexOf('TRIGGERS_ROLLBACK_') === 0) {
      idsVivos[String(props[p])] = p;
    }
  }
  var deRenovacion = ['triggerRecordatorioRenovacion', 'triggerRollbackAutomatico'];

  var triggers = ScriptApp.getProjectTriggers();
  var aBorrar = [];
  var protegidos = [];

  triggers.forEach(function (t) {
    var f = t.getHandlerFunction();
    var existe = true;
    try { existe = (typeof this[f] === 'function'); } catch (e) { existe = true; }

    if (!existe) { aBorrar.push({ t: t, fn: f, motivo: 'la función ya no existe: falla el 100% de las veces' }); return; }

    if (deUnSoloUsoDelRegistro.indexOf(f) !== -1 && !hayCola) {
      aBorrar.push({ t: t, fn: f, motivo: 'de un solo uso y la cola está vacía' });
      return;
    }

    if (deRenovacion.indexOf(f) !== -1) {
      var clave = idsVivos[t.getUniqueId()];
      if (!clave) {
        aBorrar.push({ t: t, fn: f, motivo: 'su renovación ya se cerró: el ID no está registrado' });
        return;
      }
      // Estar registrado NO basta: la fila del inmueble puede haberse borrado
      // después (limpiezas de pruebas, por ejemplo) y entonces el trigger
      // apunta a un registro que ya no existe. Pasó con tres renovaciones.
      var idReg = clave.replace('TRIGGERS_RECORDATORIO_', '').replace('TRIGGERS_ROLLBACK_', '');
      if (existeFilaDeRegistro(idReg)) {
        protegidos.push(f + ' → ' + clave + '  (el inmueble sigue en el Sheet)');
      } else {
        aBorrar.push({ t: t, fn: f, motivo: 'el inmueble ' + idReg + ' ya no está en el Sheet' });
      }
    }
  });

  if (protegidos.length) {
    Logger.log('');
    Logger.log('🛡️ NO se tocan (renovaciones todavía vivas):');
    protegidos.forEach(function (x) { Logger.log('   · ' + x); });
  }

  Logger.log('===== LIMPIEZA DE TRIGGERS FANTASMA =====');
  Logger.log('Triggers ahora: ' + triggers.length + '/20');
  Logger.log('¿Hay trabajo en la cola? ' + (hayCola ? 'SÍ — no se toca nada del registro' : 'no'));

  if (!aBorrar.length) { Logger.log('✅ No hay fantasmas que liberar.'); return; }

  Logger.log('');
  Logger.log('Se pueden liberar ' + aBorrar.length + ':');
  aBorrar.forEach(function (x) { Logger.log('   · ' + x.fn + '  (' + x.motivo + ')'); });

  if (!borrar) {
    Logger.log('');
    Logger.log('🔎 No se ha borrado nada. Para hacerlo: limpiarTriggersFantasma_CONFIRMADO()');
    return;
  }

  var n = 0;
  var idsLimpiados = {};
  aBorrar.forEach(function (x) {
    try {
      // Si el trigger estaba registrado, se apunta su ID para borrar también las
      // anotaciones: si no, quedan en Properties señalando triggers inexistentes
      // y el próximo inventario vuelve a creerlas vivas.
      var clave = idsVivos[x.t.getUniqueId()];
      if (clave) {
        idsLimpiados[clave.replace('TRIGGERS_RECORDATORIO_', '').replace('TRIGGERS_ROLLBACK_', '')] = true;
      }
      ScriptApp.deleteTrigger(x.t); n++;
    } catch (e) {
      Logger.log('⚠️ No se pudo borrar ' + x.fn + ': ' + e.message);
    }
  });

  var propsSvc = PropertiesService.getScriptProperties();
  var limpiadas = 0;
  for (var idReg in idsLimpiados) {
    ['TRIGGERS_RECORDATORIO_', 'TRIGGERS_ROLLBACK_', 'EMAIL_ROLLBACK_'].forEach(function (pref) {
      if (propsSvc.getProperty(pref + idReg) !== null) {
        propsSvc.deleteProperty(pref + idReg); limpiadas++;
      }
    });
  }

  Logger.log('');
  Logger.log('🗑️ Triggers liberados: ' + n + '. Quedan ' + ScriptApp.getProjectTriggers().length + '/20.');
  if (limpiadas) Logger.log('🧹 Anotaciones huérfanas borradas de Properties: ' + limpiadas);
}

/** ¿Sigue existiendo en el Sheet la fila de ese ID DE REGISTRO? */
function existeFilaDeRegistro(idRegistro) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('1.1 - INMUEBLES REGISTRADOS');
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var col = headers.indexOf('ID DE REGISTRO');
    if (col === -1) return true;   // sin la columna no se puede afirmar que no está
    var valores = sheet.getRange(2, col + 1, Math.max(1, sheet.getLastRow() - 1), 1).getValues();
    for (var i = 0; i < valores.length; i++) {
      if (String(valores[i][0] || '').trim() === idRegistro) return true;
    }
    return false;
  } catch (e) {
    Logger.log('⚠️ No se pudo comprobar si existe ' + idRegistro + ': ' + e.message);
    return true;   // ante la duda, se protege
  }
}
