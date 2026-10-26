// ============================================================
// IBO Pagos — Google Apps Script
// Pega este código completo en el editor de Apps Script.
// ============================================================

var SHEET_NAME = 'datos';
var CHUNK_SIZE = 40000;
var CHUNKED_KEYS = ['pagos', 'alumnos', 'preciosCuotas'];

// columna 0-based dentro de la fila de la pestaña de curso
var PERIODO_COL = {
  'INSC': 3,
  'MARZ': 4,
  'ABRI': 5,
  'MAYO': 6,
  'JUNI': 7,
  'JULI': 8,
  'AGOS': 9,
  'SEPT': 10,
  'OCTU': 11,
  'NOVI': 12,
  'DICI': 13,
  'EXAM': 14
};

var HEADERS_CURSO = ['Alumno', 'Nombre', 'Año', 'REGIST.', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPT', 'OCT', 'NOV', 'DEC', 'EXAM'];

// Abreviatura de método de pago para mostrar en la celda
var METODO_CODE = {
  'efectivo':      'ibo',
  'transferencia': 'bco',
  'mp':            'mp'
};

function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var data = loadData(ss);
    return jsonResponse({ ok: true, data: data });
  } catch (err) {
    return jsonResponse({ ok: false, error: err.toString() });
  }
}

// Todo doPost corre adentro de este candado: así, aunque lleguen dos
// pedidos de guardado exactamente al mismo instante (desde dos pantallas
// distintas), Google los procesa de a uno — nunca se cruzan ni se pisan.
function conCandado(fn) {
  var candado = LockService.getScriptLock();
  candado.waitLock(30000);
  try {
    return fn();
  } finally {
    candado.releaseLock();
  }
}

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    if (body.action === 'save') {
      return conCandado(function() {
        // false = ignorar pagos/cajaConteos pase lo que pase, aunque esta
        // llamada venga de una versión VIEJA de la app que todavía los
        // mande como parte del guardado general (no sabe que ahora se
        // manejan aparte). Blindaje permanente, no depende de que todos
        // los dispositivos estén actualizados.
        saveData(ss, body.data, false);
        return jsonResponse({ ok: true });
      });
    }

    // Acciones ADITIVAS: en vez de mandar "toda la base de datos" (que puede
    // pisar lo que otra pantalla acaba de agregar), estas piden "agregá esto
    // puntual" — el servidor lee lo que ya hay, le suma lo nuevo, y guarda.
    // Como corre adentro del candado, es imposible que dos de estas (o una de
    // estas y un guardado general) se crucen.
    if (body.action === 'agregarPagos') {
      return conCandado(function() {
        var data = loadData(ss) || {};
        var existentes = {};
        (data.pagos || []).forEach(function(p) { existentes[p.id] = true; });
        var nuevos = (body.pagos || []).filter(function(p) { return !existentes[p.id]; });
        data.pagos = (data.pagos || []).concat(nuevos);
        saveData(ss, data, true); // true = esta sí trae pagos actualizados a propósito
        return jsonResponse({ ok: true });
      });
    }

    if (body.action === 'eliminarPago') {
      return conCandado(function() {
        var data = loadData(ss) || {};
        data.pagos = (data.pagos || []).filter(function(p) { return p.id !== body.pagoId; });
        saveData(ss, data, true);
        return jsonResponse({ ok: true });
      });
    }

    if (body.action === 'agregarConteoCaja') {
      return conCandado(function() {
        var data = loadData(ss) || {};
        var yaExiste = (data.cajaConteos || []).some(function(c) { return c.id === body.conteo.id; });
        if (!yaExiste) {
          data.cajaConteos = (data.cajaConteos || []).concat([body.conteo]);
          saveData(ss, data, true);
        }
        return jsonResponse({ ok: true });
      });
    }

    if (body.action === 'agregarInscripcion2027') {
      return conCandado(function() {
        var data = loadData(ss) || {};
        var yaExiste = (data.inscripciones2027 || []).some(function(i) { return i.id === body.inscripcion.id; });
        if (!yaExiste) {
          data.inscripciones2027 = (data.inscripciones2027 || []).concat([body.inscripcion]);
          saveData(ss, data, true);
        }
        return jsonResponse({ ok: true });
      });
    }

    if (body.action === 'eliminarInscripcion2027') {
      return conCandado(function() {
        var data = loadData(ss) || {};
        data.inscripciones2027 = (data.inscripciones2027 || []).filter(function(i) { return i.id !== body.inscripcionId; });
        saveData(ss, data, true);
        return jsonResponse({ ok: true });
      });
    }

    return jsonResponse({ ok: false, error: 'Acción desconocida' });
  } catch (err) {
    return jsonResponse({ ok: false, error: err.toString() });
  }
}

function loadData(ss) {
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet || sheet.getLastRow() === 0) return null;

  var rows = sheet.getRange(1, 1, sheet.getLastRow(), 2).getValues();
  var result = {};
  var chunks = {};

  rows.forEach(function(row) {
    var key = String(row[0]);
    var val = String(row[1]);
    if (!key || !val) return;

    var matched = false;
    for (var i = 0; i < CHUNKED_KEYS.length; i++) {
      var k = CHUNKED_KEYS[i];
      if (key === k) {
        if (!chunks[k]) chunks[k] = {};
        chunks[k][0] = val;
        matched = true;
        break;
      } else if (key.indexOf(k + '_') === 0) {
        var idx = parseInt(key.replace(k + '_', ''));
        if (!chunks[k]) chunks[k] = {};
        chunks[k][idx] = val;
        matched = true;
        break;
      }
    }

    if (!matched) {
      try { result[key] = JSON.parse(val); } catch (e) {}
    }
  });

  CHUNKED_KEYS.forEach(function(k) {
    if (!chunks[k]) return;
    var idxs = Object.keys(chunks[k]).map(Number).sort(function(a, b) { return a - b; });
    var json = idxs.map(function(i) { return chunks[k][i]; }).join('');
    try { result[k] = JSON.parse(json); } catch(e) {}
  });

  return result;
}

var TODAS_LAS_CLAVES = ['cursos', 'configuracion', 'gruposFamiliares', 'promociones', 'alumnosParticulares', 'cajaConteos', 'inscripciones2027', 'pagos', 'alumnos', 'preciosCuotas'];
var CLAVES_ADITIVAS_GAS = { pagos: true, cajaConteos: true, inscripciones2027: true };

function saveData(ss, data, permitirPagosYCaja) {
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);

  // pagos, cajaConteos e inscripciones2027 solo se escriben cuando quien
  // llama es una de las acciones aditivas (permitirPagosYCaja=true), que
  // arman "data" leyendo lo que ya hay y sumando lo puntual. El guardado
  // general (false) los ignora SIEMPRE, sin importar qué traiga "data" en
  // esos campos -- así, aunque quede una pestaña con una versión vieja de
  // la app todavía mandando pagos como parte del guardado general, no
  // puede tocarlos.
  var necesitaCompletar = TODAS_LAS_CLAVES.some(function(k) {
    if (CLAVES_ADITIVAS_GAS[k] && !permitirPagosYCaja) return true;
    return data[k] === undefined;
  });
  var completo = data;
  if (necesitaCompletar) {
    var actual = loadData(ss) || {};
    completo = {};
    TODAS_LAS_CLAVES.forEach(function(k) {
      var esAditiva = CLAVES_ADITIVAS_GAS[k];
      if (esAditiva && !permitirPagosYCaja) {
        completo[k] = actual[k];
      } else {
        completo[k] = data[k] !== undefined ? data[k] : actual[k];
      }
    });
  }

  var rows = [];
  var simpleKeys = ['cursos', 'configuracion', 'gruposFamiliares', 'promociones', 'alumnosParticulares', 'cajaConteos', 'inscripciones2027'];

  simpleKeys.forEach(function(key) {
    if (completo[key] !== undefined) {
      rows.push([key, JSON.stringify(completo[key])]);
    }
  });

  CHUNKED_KEYS.forEach(function(key) {
    if (completo[key] === undefined) return;
    var json = JSON.stringify(completo[key]);
    var nChunks = Math.ceil(json.length / CHUNK_SIZE) || 1;
    for (var i = 0; i < nChunks; i++) {
      var chunkKey = i === 0 ? key : key + '_' + i;
      rows.push([chunkKey, json.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE)]);
    }
  });

  escribirSoloCambios(sheet, rows, 2);

  // Actualizar pestañas legibles de cada curso
  try {
    sincronizarPestanas(ss, completo);
  } catch (err) {
    // No fallar el guardado si la sincronización de pestañas falla
    console.log('Error sincronizando pestañas: ' + err.toString());
  }
}

// Escribe solo las celdas que efectivamente cambiaron respecto de lo que ya
// había en la hoja (comparando fila por fila y columna por columna), en vez
// de borrar todo y reescribirlo de cero. Esto hace que el historial de
// versiones de Google Sheets solo registre lo que realmente cambió en cada
// guardado, en vez de mostrar "toda la hoja distinta" cada vez.
function escribirSoloCambios(sheet, filas, numCols) {
  var lastRow = sheet.getLastRow();
  var oldValues = lastRow > 0 ? sheet.getRange(1, 1, lastRow, numCols).getValues() : [];
  var vacia = new Array(numCols).fill('');
  var maxRows = Math.max(oldValues.length, filas.length);

  for (var i = 0; i < maxRows; i++) {
    var nueva = i < filas.length ? filas[i] : vacia;
    var vieja = i < oldValues.length ? oldValues[i] : vacia;
    var distinta = false;
    for (var c = 0; c < numCols; c++) {
      if (String(vieja[c]) !== String(nueva[c])) { distinta = true; break; }
    }
    if (distinta) {
      sheet.getRange(i + 1, 1, 1, numCols).setValues([nueva]);
    }
  }
}

// Escribe (o sobreescribe) la pestaña de cada curso con los pagos en formato legible.
// Formato de celda: "ibo 13/03" (método + día/mes), "bco 09/04 *" si el pago fue parcial.
function sincronizarPestanas(ss, data) {
  if (!data.cursos || !data.alumnos || !data.pagos) return;

  var anioActual = new Date().getFullYear();

  // Índices armados una sola vez para toda la función (antes se buscaba
  // "a mano" el alumno de cada pago, recorriendo la lista completa de
  // alumnos, una vez POR CADA pago Y por cada curso -- con años de pagos
  // acumulados eso se volvía muy lento). Ahora cada pago se ubica en O(1).
  var alumnoPorId = {};
  data.alumnos.forEach(function(a) { alumnoPorId[a.id] = a; });

  var pagosPorCursoYKey = {};
  data.pagos.forEach(function(pago) {
    var alumno = alumnoPorId[pago.alumnoId];
    if (!alumno) return;
    var cursoId = alumno.cursoId;
    if (!pagosPorCursoYKey[cursoId]) pagosPorCursoYKey[cursoId] = {};
    var k = pago.alumnoId + '|' + pago.anio;
    if (!pagosPorCursoYKey[cursoId][k]) pagosPorCursoYKey[cursoId][k] = [];
    pagosPorCursoYKey[cursoId][k].push(pago);
  });

  data.cursos.forEach(function(curso) {
    // Obtener o crear la pestaña con el nombre del curso
    var hoja = ss.getSheetByName(curso.nombre);
    if (!hoja) {
      if (!curso.activo) return;
      hoja = ss.insertSheet(curso.nombre);
    }

    // Alumnos activos de este curso
    var alumnosDeCurso = data.alumnos.filter(function(a) {
      return a.cursoId === curso.id && a.activo;
    });

    // Pagos de este curso agrupados por "alumnoId|anio"
    var pagosPorKey = pagosPorCursoYKey[curso.id] || {};

    // Combinaciones (alumno, año) a mostrar
    var combinaciones = {};

    // Siempre incluir alumnos activos para el año actual
    alumnosDeCurso.forEach(function(a) {
      var k = a.id + '|' + anioActual;
      combinaciones[k] = { alumno: a, anio: anioActual };
    });

    // Incluir cualquier combinación con pagos (aunque el alumno ya no esté en el curso)
    Object.keys(pagosPorKey).forEach(function(k) {
      if (combinaciones[k]) return;
      var partes = k.split('|');
      var alumnoId = partes[0];
      var anio = parseInt(partes[1]);
      var alumno = alumnoPorId[alumnoId];
      if (alumno) combinaciones[k] = { alumno: alumno, anio: anio };
    });

    // Ordenar por apellido+nombre, luego por año
    var lista = Object.values(combinaciones).sort(function(a, b) {
      var na = ((a.alumno.apellido || '') + ' ' + (a.alumno.nombre || '')).toLowerCase();
      var nb = ((b.alumno.apellido || '') + ' ' + (b.alumno.nombre || '')).toLowerCase();
      if (na < nb) return -1;
      if (na > nb) return 1;
      return a.anio - b.anio;
    });

    // Construir filas
    var filas = [HEADERS_CURSO];

    lista.forEach(function(comb) {
      var a = comb.alumno;
      var anio = comb.anio;
      var k = a.id + '|' + anio;
      var pagos = pagosPorKey[k] || [];

      // Pagos agrupados por periodoId
      var pagosPorPeriodo = {};
      pagos.forEach(function(p) {
        if (!pagosPorPeriodo[p.periodoId]) pagosPorPeriodo[p.periodoId] = [];
        pagosPorPeriodo[p.periodoId].push(p);
      });

      var fila = new Array(HEADERS_CURSO.length).fill('');
      fila[0] = a.apellido || '';
      fila[1] = a.nombre || '';
      fila[2] = anio;

      Object.keys(PERIODO_COL).forEach(function(periodoId) {
        var colIdx = PERIODO_COL[periodoId];
        var ps = pagosPorPeriodo[periodoId] || [];
        if (ps.length === 0) return;

        var totalCobrado = ps.reduce(function(s, p) { return s + (p.montoCobrado || 0); }, 0);
        var precioFijado = ps[0].precioFijado || 0;
        var esParcial = precioFijado > 0 && totalCobrado < precioFijado;

        var partes = ps.map(function(p) {
          var code = METODO_CODE[p.metodo] || 'ibo';
          return code + ' ' + fechaCorta(p.fechaPago);
        });

        fila[colIdx] = partes.join(' / ') + (esParcial ? ' *' : '');
      });

      filas.push(fila);
    });

    escribirSoloCambios(hoja, filas, HEADERS_CURSO.length);
  });
}

// Convierte 'YYYY-MM-DD' → 'DD/MM'
function fechaCorta(fechaStr) {
  if (!fechaStr) return '?';
  var partes = String(fechaStr).split('-');
  if (partes.length < 3) return fechaStr;
  return partes[2] + '/' + partes[1];
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// Migración desde el Sheet manual viejo: ya se ejecutó y no hace falta
// más. El código de migrarDesdeSheetManual() sigue disponible en el
// historial de git de este archivo si alguna vez hace falta de nuevo.
