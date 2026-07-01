# IBO Pagos — Sistema de gestión para instituto de inglés

> **Para Claude Code:** Este documento contiene el contexto completo del proyecto. Antes de hacer cambios, leelo entero junto con `ibo_pagos.jsx`. Cuando termines de leer, contale a la usuaria qué entendiste y proponé los próximos pasos. **No hagas cambios todavía.**

---

## Sobre el proyecto

Es un sistema de gestión de pagos para un **instituto de inglés llamado IBO**, ubicado en Argentina. Lo usan 2-3 personas (la dueña + secretarias). Maneja unos 16 cursos y varios cientos de alumnos.

**Estado actual:** versión funcional como componente React (un solo archivo `ibo_pagos.jsx`), con persistencia en `window.storage` (almacenamiento del navegador). Probada y validada en Claude.ai.

**Próximos pasos (lo que venimos a hacer en Claude Code):**
1. **Setup local:** armar un proyecto Vite + React + Tailwind para correrlo en la PC de la usuaria.
2. **Reemplazar `window.storage`** por `localStorage` o IndexedDB para que funcione fuera del entorno de Claude.
3. **Migrar a Google Apps Script + Google Sheets** (Fase 2): la app vivirá en la web, accesible desde cualquier lugar con cuenta Google, datos sincronizados en un Sheet que actúa como base de datos.

---

## Lógica de negocio (¡importante, fue muy charlada!)

### Cursos y precios
- 16 cursos aproximadamente (en el seed hay 4 de ejemplo).
- Cada curso tiene un único tipo de precio mensual con dos modalidades: **efectivo** y **transferencia/MP** (transferencia es siempre 10% más caro).
- **El precio del Examen** (período "Exam" del calendario) **NO se carga aparte**: usa automáticamente el precio mensual vigente en diciembre del año correspondiente.

### Histórico de precios con vigencia
- Los precios se guardan con un campo `vigenciaDesde`. Cuando se actualizan, **NO se modifican los precios anteriores** — se crea un nuevo registro.
- Al calcular cuánto debe alguien por un mes determinado, busca el precio cuya vigencia sea ≤ la fecha del 1° de ese mes.
- Esto permite que la usuaria cargue precios históricos cuando empiece a usar el sistema a mitad de año.
- El "hasta" de cada precio se calcula automáticamente: es el día anterior a la `vigenciaDesde` del siguiente registro.

### Matrícula
- La matrícula (período "Insc") tiene un **valor único global** para todos los cursos (no depende del curso).
- También tiene histórico con vigencia desde-hasta.
- Se gestiona desde la pestaña Configuración, no desde Cursos.

### Recargos por fecha de pago
Para una cuota del mes M:
- **Del 1 al 15 del mes M:** precio normal (efectivo o transferencia).
- **Del 16 al fin del mes M:** +5% sobre el precio (configurable). Aplica tanto a efectivo como a transferencia.
- **A partir del mes siguiente (M+1):** +10% sobre el precio de transferencia ORIGINAL (no acumula sobre el 5% anterior). **Solo se acepta transferencia, no efectivo.**
- Si pasan más meses, no se acumula nada más (queda fijo en el +10%). Pero el porcentaje es configurable por si en el futuro deciden cambiarlo.

### Descuento por hermanos (escalonado)
- Los alumnos se asocian a un "grupo familiar".
- Dentro del grupo, los hermanos se ordenan por fecha de nacimiento (mayor a menor).
- Configuración actual:
  - 1° y 2° hermano: sin descuento
  - **3° hermano: 20% de descuento**
  - **4° hermano: 50% de descuento**
  - **5° hermano: 100% de descuento (gratis)**
- El sistema permite editar las posiciones y porcentajes en Configuración.

### Promociones individuales
- Se pueden aplicar a un alumno específico, en meses específicos.
- Son **monto fijo de descuento** (no porcentaje).
- La lógica de cálculo ya las soporta, pero **falta la UI para crear/editar promociones** (pendiente).

### Pagos parciales
- Una cuota puede pagarse en partes.
- El **primer pago fija el precio total** de la cuota — esto es importante: si pagaron parcial el día 10 (sin recargo), el saldo restante se paga sin recargo aunque cobres en el mes siguiente.
- Estados de una cuota: `pendiente` (sin pagos), `parcial` (cobrado < total), `pagado` (cobrado >= total).
- Visualmente: blanco = pendiente, amarillo con ½ = parcial, verde = pagado.
- Al click en una cuota parcial, se ve el detalle con todos los pagos registrados y un botón "Cobrar saldo".

### Pagos combinados (medios de pago)
- El instituto recibe en **efectivo, Mercado Pago, o transferencia**.
- A veces un mismo cobro se divide entre dos o tres medios (ej: $10.000 efectivo + $5.000 MP).
- La usuaria carga la distribución y el sistema valida que sume el total.
- **Caso especial:** si hay UNA sola cuota en modo parcial + pago combinado activado, la suma del combinado **es** el monto parcial (auto-vinculado).

### Cobro a varios alumnos
- A veces un papá viene a pagar por varios hermanos a la vez.
- Hay un modo "Cobrar a varios": se buscan y agregan múltiples alumnos, se selecciona qué meses cobrar de cada uno, y se cobra todo en una sola operación.

### WhatsApp post-cobro
- Al confirmar un cobro, se abre el paso de "Enviar WhatsApp" con un botón por cada celular.
- **Hermanos con el mismo celular** (típicamente padre/madre): reciben **un solo mensaje agrupado** con el detalle de cada hermano.
- Plantillas configurables en Configuración:
  - `plantillaWhatsApp`: pago normal (variables: `{nombre} {periodos} {instituto} {total}`)
  - `plantillaWhatsAppParcial`: aviso de pago parcial (variables: `{nombre} {monto} {periodo} {instituto} {saldo}`)
  - `plantillaWhatsAppSaldo`: aviso de pago de saldo pendiente (variables: `{nombre} {monto} {periodo} {instituto}`)
- **Formato de celular:** se carga sin 0 ni 15 (ej: `1145678901`) — el sistema antepone `549` automáticamente para WhatsApp.

### Eliminación de pagos
- Click en una cuota verde o amarilla → modal con detalle → opción de eliminar pago(s) individuales.
- Confirmación de doble paso para evitar borrados accidentales.

---

## Estructura de datos (estado global `data`)

```js
{
  cursos: [
    { id, nombre, activo, horarios: ['Lunes y Miércoles · 18:00 a 19:30', ...] }
  ],
  preciosCuotas: [
    { id, cursoId, tipo: 'MENSUAL', efectivo, transferencia, vigenciaDesde }
    // tipo: solo 'MENSUAL' (el examen usa el mensual de diciembre, la inscripción usa matriculas)
  ],
  alumnos: [
    {
      id, nombre, apellido, dni, fechaNacimiento,
      celular, celularAlternativo,
      cursoId, horarioCurso,
      grupoFamiliarId,  // null o id de grupo
      activo, observaciones
    }
  ],
  gruposFamiliares: [{ id, nombre }],
  promociones: [
    { id, alumnoId, montoDescuento, meses: ['MARZ-2026', ...] }
  ],
  pagos: [
    {
      id, alumnoId, periodoId, anio, fechaPago,
      montoCobrado,    // lo que efectivamente se cobró en este registro
      precioFijado,    // el precio total de la cuota cuando se hizo el primer pago (para parciales)
      montoTotal,      // legacy (= montoCobrado)
      observaciones
    }
  ],
  configuracion: {
    nombreInstituto: 'IBO',
    recargoSegundaQuincenaPorcentaje: 5,
    recargoMesVencidoPorcentaje: 10,
    descuentosHermanos: [
      { posicion: 3, porcentaje: 20 },
      { posicion: 4, porcentaje: 50 },
      { posicion: 5, porcentaje: 100 }
    ],
    matriculas: [
      { id, efectivo, transferencia, vigenciaDesde }
    ],
    plantillaWhatsApp: '...',
    plantillaWhatsAppParcial: '...',
    plantillaWhatsAppSaldo: '...'
  }
}
```

### Períodos del calendario (constante PERIODOS)
12 períodos: `INSC` (inscripción/matrícula), `MARZ`–`DICI` (10 meses lectivos), `EXAM` (examen).

---

## Stack y dependencias

El componente actual usa:
- **React** (hooks: useState, useEffect, useMemo)
- **Tailwind CSS** (clases utilitarias, sin compilar — viene preparado para Vite + Tailwind estándar)
- **lucide-react** para iconos
- **Google Fonts:** Fraunces (display) e Inter (body), cargadas via `<style>@import` dentro del componente

No usa ninguna librería de fechas, charts ni nada raro.

---

## Decisiones de diseño tomadas

- **Color principal:** verde esmeralda (Tailwind `emerald-700`).
- **Fondo:** sutil gradiente radial verde claro en la parte superior.
- **Tipografía:** Fraunces serif itálica para el branding "IBO" en el header, Inter para todo lo demás.
- **Avatares de alumnos:** colores generados deterministicamente por nombre (8 colores distintos).
- **Estilo general:** minimalista, mucho whitespace, bordes redondeados generosos (`rounded-2xl`).

---

## Lo que está pendiente / ideas a futuro

1. **UI para crear/editar promociones individuales** (la lógica ya está).
2. **Reportes:** total cobrado por mes, alumnos con cuotas vencidas, etc.
3. **Importar alumnos** desde Excel/CSV (la usuaria tiene su data actual en otro sistema).
4. **Dashboard de inicio** con estadísticas rápidas.
5. **Migración a Google Apps Script + Sheets** (Fase 2 — el gran objetivo).
6. **Multi-usuario con permisos** (cuando esté en Google Apps Script).

---

## Cómo es la usuaria y cómo le gusta trabajar

- No es desarrolladora. Conoce HTML básico, no sabe React.
- Le gusta **iterar de a poco**: ve algo, prueba, pide ajustes específicos.
- Prefiere que le **expliques en lenguaje claro** qué hace cada cambio antes de implementarlo, especialmente si es algo complejo (ej: pagos parciales).
- Aprecia que le **avises cuando algo sea mejor para más adelante** (ej: "esto lo dejamos para Fase 2").
- Está abierta a tu opinión técnica — si una decisión no escala bien, decíselo.
- Habla en español argentino. Respondele igual.

---

## Primer mensaje sugerido para empezar

Cuando termines de leer este documento y `ibo_pagos.jsx`, deciéndole algo como:

> "Leí el contexto y el componente. Esto es lo que entendí: [resumen breve]. Para arrancar te propongo:
> 1. Crear el proyecto Vite + React + Tailwind
> 2. Adaptar el componente para que use `localStorage` en lugar de `window.storage`
> 3. Correrlo localmente y verificar que todo funcione
>
> Después de eso, te muestro cómo arrancar el camino hacia Google Sheets. ¿Te parece?"
