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

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    if (body.action === 'save') {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      saveData(ss, body.data);
      return jsonResponse({ ok: true });
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

function saveData(ss, data) {
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);
  sheet.clearContents();

  var rows = [];
  var simpleKeys = ['cursos', 'configuracion', 'gruposFamiliares', 'promociones'];

  simpleKeys.forEach(function(key) {
    if (data[key] !== undefined) {
      rows.push([key, JSON.stringify(data[key])]);
    }
  });

  CHUNKED_KEYS.forEach(function(key) {
    if (data[key] === undefined) return;
    var json = JSON.stringify(data[key]);
    var nChunks = Math.ceil(json.length / CHUNK_SIZE) || 1;
    for (var i = 0; i < nChunks; i++) {
      var chunkKey = i === 0 ? key : key + '_' + i;
      rows.push([chunkKey, json.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE)]);
    }
  });

  sheet.getRange(1, 1, rows.length, 2).setValues(rows);

  // Actualizar pestañas legibles de cada curso
  try {
    sincronizarPestanas(ss, data);
  } catch (err) {
    // No fallar el guardado si la sincronización de pestañas falla
    console.log('Error sincronizando pestañas: ' + err.toString());
  }
}

// Escribe (o sobreescribe) la pestaña de cada curso con los pagos en formato legible.
// Formato de celda: "ibo 13/03" (método + día/mes), "bco 09/04 *" si el pago fue parcial.
function sincronizarPestanas(ss, data) {
  if (!data.cursos || !data.alumnos || !data.pagos) return;

  var anioActual = new Date().getFullYear();

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
    var pagosPorKey = {};
    data.pagos.forEach(function(pago) {
      var alumno = null;
      for (var i = 0; i < data.alumnos.length; i++) {
        if (data.alumnos[i].id === pago.alumnoId) { alumno = data.alumnos[i]; break; }
      }
      if (!alumno || alumno.cursoId !== curso.id) return;
      var k = pago.alumnoId + '|' + pago.anio;
      if (!pagosPorKey[k]) pagosPorKey[k] = [];
      pagosPorKey[k].push(pago);
    });

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
      var alumno = null;
      for (var i = 0; i < data.alumnos.length; i++) {
        if (data.alumnos[i].id === alumnoId) { alumno = data.alumnos[i]; break; }
      }
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

    hoja.clearContents();
    if (filas.length > 0) {
      hoja.getRange(1, 1, filas.length, HEADERS_CURSO.length).setValues(filas);
    }
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

// ============================================================
// MIGRACIÓN DE PAGOS DESDE SHEET MANUAL
// Cómo usar:
//   1. Abrí el Apps Script de "IBO Pagos - Datos" (Extensiones → Apps Script)
//   2. Pegá este código (ya está incluido si actualizaste Code.gs)
//   3. Ejecutá migrarDesdeSheetManual() con DRY_RUN = true → revisá el log
//   4. Cambiá DRY_RUN = false y ejecutá de nuevo para guardar
// ============================================================
function migrarDesdeSheetManual() {
  var MANUAL_SHEET_ID = '1Oegl1Vfw-gYS0hOd3eUb46rfDmEFt85wL0WZ5C85Lmg';
  var DRY_RUN = true; // ← Cambiar a false para guardar los cambios

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var appData = loadData(ss);
  if (!appData || !appData.alumnos || !appData.pagos) {
    SpreadsheetApp.getUi().alert('Error: no se pudieron cargar los datos de la app.');
    return;
  }

  var manualSS = SpreadsheetApp.openById(MANUAL_SHEET_ID);

  var TABS = [
    'Kinder', 'Prekids', 'Kids',
    '1st Form', '2nd Form',
    '1st Teens', '2nd Teens', '3rd Teens',
    '4th Adults', '5th Adults', '6th Adults',
    'Adults 1', 'Adults 1B/2', 'Adults 2', 'Adults 3', 'Adults 4',
    'FCE'
  ];

  var PERIODO_MAP = {
    'REGIST.': 'INSC', 'REGIST': 'INSC',
    'MARCH': 'MARZ', 'APRIL': 'ABRI', 'MAY': 'MAYO',
    'JUNE': 'JUNI', 'JULY': 'JULI', 'AUGUST': 'AGOS',
    'SEPT': 'SEPT', 'OCT': 'OCTU', 'NOV': 'NOVI',
    'DEC': 'DICI', 'EXAM': 'EXAM'
  };

  var METODO_MAP = { 'ibo': 'efectivo', 'mp': 'mp', 'bco': 'transferencia' };

  function normalizar(s) {
    return String(s || '').toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .trim().replace(/\s+/g, ' ');
  }

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  }

  // Índice de alumnos: "apellido nombre" → alumno
  var alumnoIdx = {};
  appData.alumnos.forEach(function(a) {
    var k = normalizar(a.apellido) + ' ' + normalizar(a.nombre);
    if (!alumnoIdx[k]) alumnoIdx[k] = a;
  });

  function buscarAlumno(apellido, nombre) {
    var k = normalizar(apellido) + ' ' + normalizar(nombre);
    if (alumnoIdx[k]) return alumnoIdx[k];
    // Fallback: primera palabra del apellido + primera del nombre
    var a1 = normalizar(apellido).split(' ')[0];
    var n1 = normalizar(nombre).split(' ')[0];
    var keys = Object.keys(alumnoIdx);
    for (var i = 0; i < keys.length; i++) {
      var parts = keys[i].split(' ');
      if (parts[0] === a1 && parts.slice(1).join(' ').indexOf(n1) === 0) {
        return alumnoIdx[keys[i]];
      }
    }
    return null;
  }

  // Índice de pagos existentes para evitar duplicados
  var existIdx = {};
  appData.pagos.forEach(function(p) {
    existIdx[p.alumnoId + '|' + p.periodoId + '|' + p.anio] = true;
  });

  // Parsea "ibo 13/03", "mp 07/04", "bco 08/06" → objeto o null si es complejo
  function parsearCelda(cell) {
    var s = String(cell || '').trim().toLowerCase();
    var m = s.match(/^(ibo|mp|bco)\s+(\d{2})\/(\d{2})$/);
    if (!m) return null;
    return { metodo: m[1], dia: m[2], mes: m[3] };
  }

  var newPagos = [];
  var noMatch = [];
  var complejos = [];
  var yaExisten = 0;
  var tabLog = [];

  TABS.forEach(function(tabName) {
    var sheet = manualSS.getSheetByName(tabName);
    if (!sheet) { tabLog.push(tabName + ': pestaña no encontrada'); return; }

    var data = sheet.getDataRange().getValues();
    if (data.length < 2) return;

    // Detección de estructura:
    // TRANSPUESTA: fila 0 = "ALUMNO, apell1, apell2...", fila 1 = "NOMBRE, nom1, nom2..."
    // NORMAL:      fila 0 = headers (ALUMNO, , REGIST., MARCH...), filas 1+ = alumnos
    var isTransposed = String(data[1][0]).trim().toUpperCase() === 'NOMBRE';

    var students = [];
    var prices = {};

    if (isTransposed) {
      var apellidos = data[0];
      var nombres = data[1];
      var studentCols = [];
      for (var c = 1; c < apellidos.length; c++) {
        var ap = String(apellidos[c] || '').trim();
        if (ap && !/^\d/.test(ap)) {
          studentCols.push(c);
          students.push({ apellido: ap, nombre: String(nombres[c] || '').trim(), pagos: {} });
        }
      }
      for (var r = 2; r < data.length; r++) {
        var label = String(data[r][0] || '').trim().toUpperCase();
        var pid = PERIODO_MAP[label];
        if (!pid) continue;
        // Buscar precio en la fila (formato XXXXX/YYYYY o XXXXX solo)
        for (var c = 1; c < data[r].length; c++) {
          var v = String(data[r][c] || '').trim();
          if (/^\d+\/\d+$/.test(v) || /^\d{4,}$/.test(v)) {
            var parts = v.split('/');
            prices[pid] = { ef: parseInt(parts[0]) || 0, tr: parseInt(parts[1] || parts[0]) || 0 };
            break;
          }
        }
        for (var si = 0; si < studentCols.length; si++) {
          var c = studentCols[si];
          if (c < data[r].length && data[r][c]) {
            students[si].pagos[pid] = data[r][c];
          }
        }
      }

    } else {
      // NORMAL
      var headers = data[0];
      var colMap = {};
      for (var c = 0; c < headers.length; c++) {
        var h = String(headers[c] || '').trim().toUpperCase();
        var pid = PERIODO_MAP[h];
        if (pid) colMap[c] = pid;
      }
      for (var r = 1; r < data.length; r++) {
        var ap = String(data[r][0] || '').trim();
        if (!ap) {
          // Fila de precios
          Object.keys(colMap).forEach(function(c) {
            var v = String(data[r][c] || '').trim();
            if (/^\d+\/\d+$/.test(v) || /^\d{4,}$/.test(v)) {
              var parts = v.split('/');
              prices[colMap[c]] = { ef: parseInt(parts[0]) || 0, tr: parseInt(parts[1] || parts[0]) || 0 };
            }
          });
          continue;
        }
        var student = { apellido: ap, nombre: String(data[r][1] || '').trim(), pagos: {} };
        Object.keys(colMap).forEach(function(c) {
          if (data[r][c]) student.pagos[colMap[c]] = data[r][c];
        });
        students.push(student);
      }
    }

    var tabCount = 0;
    students.forEach(function(s) {
      var alumno = buscarAlumno(s.apellido, s.nombre);
      if (!alumno) { noMatch.push(tabName + ': ' + s.apellido + ' ' + s.nombre); return; }

      Object.keys(s.pagos).forEach(function(pid) {
        var cell = s.pagos[pid];
        var parsed = parsearCelda(cell);
        if (!parsed) {
          var str = String(cell).trim();
          if (str && !/^-+$/.test(str)) {
            complejos.push(tabName + ' / ' + s.apellido + ' ' + s.nombre + ' / ' + pid + ': ' + str);
          }
          return;
        }
        // Inscripciones en sep-dic son del año anterior
        var anio = (pid === 'INSC' && parseInt(parsed.mes) >= 9) ? 2025 : 2026;
        var existKey = alumno.id + '|' + pid + '|' + anio;
        if (existIdx[existKey]) { yaExisten++; return; }

        var precio = prices[pid] || { ef: 0, tr: 0 };
        var monto = parsed.metodo === 'ibo' ? precio.ef : precio.tr;

        newPagos.push({
          id: uid(),
          alumnoId: alumno.id,
          periodoId: pid,
          anio: anio,
          fechaPago: anio + '-' + parsed.mes + '-' + parsed.dia,
          montoCobrado: monto,
          montoTotal: monto,
          metodo: METODO_MAP[parsed.metodo] || 'efectivo',
          observaciones: 'migrado'
        });
        existIdx[existKey] = true;
        tabCount++;
      });
    });

    tabLog.push(tabName + ': ' + tabCount + ' pagos nuevos');
  });

  if (!DRY_RUN && newPagos.length > 0) {
    var updatedData = loadData(ss);
    updatedData.pagos = (updatedData.pagos || []).concat(newPagos);
    saveData(ss, updatedData);
  }

  var lines = tabLog.concat(['',
    'TOTAL NUEVOS: ' + newPagos.length,
    'Ya existían (saltados): ' + yaExisten,
    'Sin coincidencia en app: ' + noMatch.length,
    'Complejos (cargar a mano): ' + complejos.length
  ]);
  if (noMatch.length > 0) {
    lines.push('', 'Sin match:');
    noMatch.forEach(function(n) { lines.push('  ' + n); });
  }
  if (complejos.length > 0) {
    lines.push('', 'Complejos (cargar a mano):');
    complejos.slice(0, 30).forEach(function(c) { lines.push('  ' + c); });
    if (complejos.length > 30) lines.push('  ... y ' + (complejos.length - 30) + ' más (ver Logs completos)');
  }
  lines.push('');
  lines.push(DRY_RUN
    ? '⚠️  MODO PRUEBA — nada guardado. Cambiá DRY_RUN = false para ejecutar.'
    : '✅  GUARDADO: ' + newPagos.length + ' pagos agregados.');

  Logger.log(lines.join('\n'));
  SpreadsheetApp.getUi().alert('Migración de pagos\n\n' + lines.join('\n'));
}
