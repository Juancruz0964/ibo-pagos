# Plan: Inscripción 2027 + Deuda 2026

Estado: **planificado, no implementado todavía**. No tocar código hasta que Juan Cruz confirme empezar.

## ⚠️ Antes de arrancar a programar esto

Hacer que Juan Cruz confirme que ya hizo una **copia de seguridad manual** de su Google
Sheet (Archivo → Hacer una copia, ej: "Backup antes de Inscripción 2027") antes de tocar
una sola línea de código. No avanzar sin esa confirmación explícita — es un pedido
puntual de ella después de un incidente previo donde se pisaron datos reales.

## Contexto / por qué

En noviembre abren las inscripciones para 2027 mientras 2026 todavía está en curso.
Necesita una forma de gestionar esa etapa sin que nada de lo que ya existe (alumnos,
cuotas, pagos, precios de 2026) se vea afectado.

## Alcance del feature

### 1. Deuda 2026
- Pantalla/sección que agrupa por alumno el total adeudado de 2026 (todos los meses +
  inscripción), calculado automáticamente en cualquier momento (no un proceso manual de
  "cerrar el año").
- Siempre con el **detalle mes por mes** visible, nunca solo un número suelto.
- Desde ahí, poder **seleccionar** los meses puntuales que le estén pagando (pueden pagar
  de a partes, no todo junto) y cobrarlos reutilizando el mecanismo de cobro que ya existe
  hoy — no un cobro nuevo separado.

### 2. Flujo de Inscripción 2027
- Empieza pidiendo el **DNI**. Si matchea a alguien existente (reutilizando la lógica ya
  existente de `dniCoincidente` en AlumnoForm), autocompleta todo.
- Si no matchea, dejar buscar por **apellido y después nombre** antes de asumir que es
  alumno nuevo (para pescar casos de DNI mal cargado y corregirlo ahí mismo, en vez de
  crear un duplicado).
- Muestra el **curso anterior** del alumno y sugiere automáticamente el **próximo curso**
  según la progresión de niveles (ver más abajo), pero se puede elegir otro curso a mano.
- Se puede cargar la inscripción **sin pagar la matrícula todavía** (alguien avisa que
  sigue, paga después) — igual queda "en la lista 2027".
- Una vez cargada, el alumno aparece en un listado de "Inscriptos 2027".

**Progresión de niveles (dos cadenas separadas, sin conexión entre ellas):**
- Cadena principal: Kinder → Prekids → Kids → 1st Form → 2nd Form → 1st Teens →
  2nd Teens → 3rd Teens → 4th Adults → 5th Adults → 6th Adults → First B2 (después de 6th
  Adults pueden graduarse o seguir a First B2 — no es automático/forzado).
- Cadena de adultos principiantes (aparte): Adults 1 → Adults 1B/2 → Adults 2 →
  Adults 3 → Adults 4.

### 3. Matrícula (Inscripción) con precio flotante — ÚNICA EXCEPCIÓN
- Hoy, para cualquier cuota (mensual o inscripción), en cuanto se registra el primer pago
  parcial, el total queda fijo (`precioFijado` congelado desde el primer pago,
  ver `obtenerEstadoCuota`).
- La Inscripción/matrícula es la **única excepción**: si el precio de matrícula se
  actualiza en Configuración mientras alguien la está pagando de a partes, lo que le
  falta pagar se recalcula con el precio vigente nuevo, no el de cuando empezó a pagar.
- Los meses normales siguen funcionando exactamente igual que ahora (precio fijo desde el
  primer pago). No tocar esa lógica para nada que no sea INSCRIPCION.

## Riesgo técnico ya identificado (y cómo evitarlo)

Si el curso "sugerido para 2027" se escribiera directamente en `alumno.cursoId` en el
momento de la inscripción (noviembre), las cuotas de 2026 **todavía pendientes de pago**
(octubre, noviembre, diciembre) se recalcularían con el precio del curso NUEVO en vez del
viejo, porque `calcularCuota` usa el `cursoId` actual del alumno en vivo, no un valor
congelado por período.

**Solución acordada:** el curso elegido para 2027 se guarda en un campo aparte (algo tipo
`cursoIdProximo` o similar, a definir en el diseño técnico) que NO pisa `cursoId` actual.
Recién se aplica de verdad cuando arranca 2027. Así ningún cálculo de 2026 se ve afectado
por una inscripción hecha en noviembre.

## Principio general para toda la implementación

Diseñar todo como **agregar cosas nuevas** (nuevos campos, nuevos registros), nunca
modificar o sobreescribir lo que ya existe. Probar todo con datos de prueba antes de
subir cualquier cambio real, como se viene haciendo con el resto de la app.

## Próximo paso (cuando ella diga que sigamos)

1. Confirmar que hizo la copia de seguridad manual (ver arriba).
2. Proponer un mockup visual de la pantalla de Inscripción 2027 y de Deuda 2026 para que
   lo apruebe, **antes** de escribir código.
3. Recién ahí, implementar.
