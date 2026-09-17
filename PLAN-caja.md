# Plan: Caja (control de efectivo del día)

Estado: **planificado, no implementado todavía**. No tocar código hasta que Juan Cruz confirme empezar.

## Contexto / por qué

Juan Cruz quiere poder ver cuánto efectivo cobró en el día, sin tener que llevar ella
misma la cuenta de cuánto tiene en la caja (usa un cambio ya separado que va gastando
según necesita, así que nunca sabe un "fondo inicial" exacto).

## Diseño acordado

### 1. Sin "fondo inicial" diario obligatorio
No se le pide ningún monto de partida todos los días. La pantalla funciona igual
sin eso: siempre muestra el detalle de lo cobrado, exista o no un conteo cargado.

### 2. Conteo manual, opcional, cuando ella quiera
- En cualquier momento puede cargar un "conteo": cuánto efectivo contó físicamente en
  ese instante (fecha/hora + monto).
- Desde ese conteo en adelante, la app suma sola todo lo cobrado en efectivo y calcula
  **"Deberías tener ahora" = último conteo + cobrado en efectivo desde ese conteo**.
- Si nunca cargó un conteo, ese número simplemente no se muestra (no se inventa un
  valor). La lista de cobrado del día funciona igual.
- Puede volver a cargar un conteo nuevo cuando quiera (por las dudas, o para
  actualizar), y ahí arranca a sumar de nuevo desde ese punto.

### 3. Vueltos — ya contemplado, no requiere nada especial
Cuando cobra $62.500 con un billete de $70.000 y da $7.500 de vuelto de la misma
caja, el aumento real de su caja es $62.500 — que es exactamente lo que la app
registra como cobrado (el precio de la cuota, no el billete recibido). No hace falta
trackear vueltos por separado, el número ya cierra solo.

### 4. "Cobrado en efectivo hoy" es genérico, no una lista fija de conceptos
Suma **todos** los pagos en efectivo del día que sea, sin importar el concepto
(cuota mensual, alumno particular, matrícula/inscripción, etc.), con detalle
línea por línea (alumno/concepto, hora, monto).

**Importante:** esto se diseña a propósito así de genérico (por medio de pago +
fecha, no por una lista de "tipos de cobro soportados") para que cuando se
implemente **Inscripción 2027** (ver `PLAN-inscripcion-2027.md`), cualquier cobro en
efectivo de matrícula/cuotas 2027 aparezca automáticamente en la Caja sin tener que
volver a tocar esta pantalla.

### 5. Sin retiros/gastos manuales (por ahora)
No se pidió una forma de registrar plata que sale de la caja para otra cosa (gastos,
depósitos, uso personal). Si eso empieza a pasar y desfasa el número de "deberías
tener", se retoma el diseño en ese momento.

## Mockup

Aprobado un mockup visual con dos pantallas (con conteo cargado / antes del primer
conteo). Está guardado como Artifact en Claude (no versionado en este repo).

## Próximo paso (cuando ella diga que sigamos)

1. Diseño técnico: dónde se guardan los conteos (nuevo array, sin tocar nada
   existente) y cómo se calcula "cobrado en efectivo del día" a partir de los pagos
   ya existentes (solo lectura, sin modificar `pagos`).
2. Implementar la pestaña "Caja", probar con datos de prueba.
3. Subir el cambio real recién cuando esté verificado.
