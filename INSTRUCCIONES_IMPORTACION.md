# Instrucciones para Claude Code — Importar datos del instituto IBO

> **Para Claude Code:** Este archivo te dice cómo importar los datos reales del instituto al sistema. Leelo completo antes de hacer cambios.

## Archivos que tenés que mirar

1. **`ibo_datos_importacion.json`** — Contiene 449 alumnos reales del instituto, sus pagos del año en curso (~2.400 registros), 19 cursos, 63 grupos familiares, y la configuración base. Este JSON ya está en el formato exacto que espera la app.

2. **`REPORTE_IMPORTACION.md`** — Reporte para la usuaria sobre qué alumnos están sin DNI, sin celular, etc. (es informativo, ella ya lo leyó).

3. **`CONTEXTO.md`** — El contexto general del proyecto (lógica de negocio).

4. **`ibo_pagos.jsx`** — El componente actual con la lógica.

## Cómo importar el JSON

El archivo `ibo_datos_importacion.json` tiene esta estructura, **idéntica** al estado interno `data` de la app:

```json
{
  "_meta": { ... },
  "cursos": [...],
  "gruposFamiliares": [...],
  "alumnos": [...],
  "pagos": [...],
  "preciosCuotas": [],
  "promociones": [],
  "configuracion": { ... }
}
```

### Opción A: import directo al iniciar la app (recomendado)

Una vez que armes el proyecto Vite + React + Tailwind, en lugar del `initialState` hardcodeado, **cargá `ibo_datos_importacion.json` como dato semilla** la primera vez que se abre la app.

Pseudo-código:
```js
import datosIniciales from './ibo_datos_importacion.json';

// En App component:
useEffect(() => {
  const guardado = localStorage.getItem('ibo_data');
  if (guardado) {
    setData(JSON.parse(guardado));
  } else {
    // Primer uso: cargar datos del instituto
    const { _meta, ...rest } = datosIniciales;
    setData(rest);
  }
}, []);
```

### Opción B: botón "Importar JSON" en Configuración

La app actual ya tiene un botón "Importar JSON" en Configuración → Backup. La usuaria podría usarlo para cargar `ibo_datos_importacion.json` después de haber abierto la app vacía. Esto le sirve si en algún momento quiere resetear y volver a cargar.

**Confirmá con la usuaria cuál opción prefiere antes de implementar.**

## Cosas particulares de este JSON

### Campo `_extra` en alumnos
Cada alumno tiene un objeto `_extra` con: `direccion`, `responsable_principal`, `responsable_alternativo`, `arranca_en`, `desde_hoja_curso`. **El sistema actual no usa estos campos**, pero la usuaria pidió no perderlos. Hay 2 opciones:
- **A:** Dejar `_extra` ahí silenciosamente (no rompe nada, queda como metadata).
- **B:** Mover esos datos a `observaciones` del alumno.
- **C:** Extender el schema del alumno con esos campos y mostrarlos en la UI.

**Preguntale a la usuaria.** Si no es prioridad, dejá `_extra` y ya.

### Campo `notaOriginal` en pagos
Cada pago tiene un campo `notaOriginal` con el texto exacto de la planilla (ej: `"38k a favor bco 19/02"`). Mostralo en la pantalla de detalle del pago como referencia (es útil cuando tenga que verificar algún cobro raro).

### Pagos con `montoCobrado: 0`
Muchos pagos tienen `montoCobrado: 0` porque en la planilla solo decía "ibo 10/03" sin monto. **La cuota igual aparece como pagada** (no parcial). Cuando la usuaria cargue los precios de las cuotas en la app, podrías ofrecerle un comando tipo "recalcular montos de pagos sin monto explícito" que les asigne el precio que correspondía en esa fecha.

Hay otros con monto explícito (ej: `38000`, `7000`, etc.) que la planilla sí especificaba — esos se respetan tal cual.

### Cursos sin precios cargados
El JSON tiene los cursos definidos pero `preciosCuotas: []`. La usuaria tiene que cargar los precios manualmente desde la pestaña Cursos cuando los defina. Lo mismo con `matriculas: []` en configuración.

### Cursos sin horarios
Los cursos vienen con `horarios: []`. La usuaria también los tiene que cargar (desde Cursos → Editar curso).

### Alumnos sin horario asignado
Todos los alumnos vienen con `horarioCurso: ''`. Una vez que ella cargue los horarios de cada curso, va a tener que asignarle uno a cada alumno. Si son 449 alumnos, considerá ofrecerle un **modo de asignación masiva** (ej: "asignar este horario a todos los alumnos del curso X").

## Validación previa al import

Antes de importar, validá:
- IDs de alumno únicos
- `cursoId` de cada alumno apunta a un curso existente (o está vacío)
- `grupoFamiliarId` apunta a un grupo existente (o es null)
- `alumnoId` de cada pago apunta a un alumno existente
- `periodoId` de cada pago es uno de: INSC, MARZ, ABRI, MAYO, JUNI, JULI, AGOS, SEPT, OCTU, NOVI, DICI, EXAM

Si encontrás inconsistencias, pará y avisale a la usuaria, no importes silenciosamente.

## Después de importar

1. Verificá que la app abra sin errores.
2. Hacé que muestre un mensaje al usuario tipo: *"Se importaron 449 alumnos, 2.406 pagos, 19 cursos y 63 grupos familiares."*
3. Ofrecé exportar un backup inicial inmediatamente (por si algo sale mal después).

## ¡Importante! No reescribir lógica que ya funciona

La lógica del componente `ibo_pagos.jsx` ya está validada con la usuaria. **No la cambies por iniciativa propia** — solo adaptá lo necesario para que corra en Vite (imports, export default, reemplazar `window.storage` por `localStorage`, etc.).
