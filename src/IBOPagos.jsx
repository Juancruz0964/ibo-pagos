import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search, Plus, X, Edit2, Trash2, Users, BookOpen, Settings, CreditCard,
  Check, MessageCircle, ChevronRight, Download, Upload, AlertCircle,
  Calendar, DollarSign, UserPlus, History, Tag, Home, Ban
} from 'lucide-react';
import datosIniciales from '../ibo_datos_importacion.json';

// ============================================================
// STORAGE LAYER
// Si VITE_GAS_URL está definida usa Google Sheets vía Apps Script.
// Si no, usa localStorage (modo local/desarrollo).
// ============================================================
const GAS_URL = import.meta.env.VITE_GAS_URL || '';

const storage = {
  async get(key) {
    if (!GAS_URL) {
      try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : null;
      } catch { return null; }
    }
    try {
      const res = await fetch(`${GAS_URL}?action=load`, { cache: 'no-store' });
      const json = await res.json();
      return json.ok ? json.data : null;
    } catch (e) {
      console.error('Error al cargar datos de Sheets:', e);
      return null;
    }
  },
  async set(key, value) {
    if (!GAS_URL) {
      try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
      return { ok: true };
    }
    try {
      await fetch(GAS_URL, {
        method: 'POST',
        mode: 'no-cors',
        body: JSON.stringify({ action: 'save', data: value }),
      });
      return { ok: true };
    } catch (e) {
      console.error('Error al guardar datos en Sheets:', e);
      return { ok: false, error: e.message };
    }
  }
};

// ============================================================
// CONSTANTS
// ============================================================
const PERIODOS = [
  { id: 'INSC', label: 'Insc', full: 'Inscripción', tipo: 'INSCRIPCION', mes: 0 },
  { id: 'MARZ', label: 'Marz', full: 'Marzo', tipo: 'MENSUAL', mes: 3 },
  { id: 'ABRI', label: 'Abri', full: 'Abril', tipo: 'MENSUAL', mes: 4 },
  { id: 'MAYO', label: 'Mayo', full: 'Mayo', tipo: 'MENSUAL', mes: 5 },
  { id: 'JUNI', label: 'Juni', full: 'Junio', tipo: 'MENSUAL', mes: 6 },
  { id: 'JULI', label: 'Juli', full: 'Julio', tipo: 'MENSUAL', mes: 7 },
  { id: 'AGOS', label: 'Agos', full: 'Agosto', tipo: 'MENSUAL', mes: 8 },
  { id: 'SEPT', label: 'Sept', full: 'Septiembre', tipo: 'MENSUAL', mes: 9 },
  { id: 'OCTU', label: 'Octu', full: 'Octubre', tipo: 'MENSUAL', mes: 10 },
  { id: 'NOVI', label: 'Novi', full: 'Noviembre', tipo: 'MENSUAL', mes: 11 },
  { id: 'DICI', label: 'Dici', full: 'Diciembre', tipo: 'MENSUAL', mes: 12 },
  { id: 'EXAM', label: 'Exam', full: 'Examen', tipo: 'EXAMEN', mes: 0 }
];

// ============================================================
// INITIAL SEED DATA
// ============================================================
const initialState = {
  cursos: [
    { id: 'c1', nombre: '1st Form', activo: true, horarios: ['Lunes y Miércoles · 18:00 a 19:30', 'Martes y Jueves · 17:00 a 18:30'] },
    { id: 'c2', nombre: '2nd Form', activo: true, horarios: ['Martes y Jueves · 17:00 a 18:30', 'Sábados · 10:00 a 12:30'] },
    { id: 'c3', nombre: '3rd Form', activo: true, horarios: ['Lunes y Miércoles · 19:30 a 21:00'] },
    { id: 'c4', nombre: 'Adultos Beginners', activo: true, horarios: ['Sábados · 10:00 a 12:00'] }
  ],
  preciosCuotas: [
    { id: 'pc1', cursoId: 'c1', tipo: 'MENSUAL', efectivo: 25000, transferencia: 27500, vigenciaDesde: '2026-03-01' },
    { id: 'pc2', cursoId: 'c2', tipo: 'MENSUAL', efectivo: 27000, transferencia: 29700, vigenciaDesde: '2026-03-01' },
    { id: 'pc3', cursoId: 'c3', tipo: 'MENSUAL', efectivo: 29000, transferencia: 31900, vigenciaDesde: '2026-03-01' },
    { id: 'pc4', cursoId: 'c4', tipo: 'MENSUAL', efectivo: 30000, transferencia: 33000, vigenciaDesde: '2026-03-01' }
  ],
  alumnos: [
    { id: 'a1', nombre: 'Luca Valentín', apellido: 'Perez', dni: '50123456', fechaNacimiento: '2012-04-15', celular: '1145678901', celularAlternativo: '1198765432', cursoId: 'c1', horarioCurso: 'Lunes y Miércoles · 18:00 a 19:30', grupoFamiliarId: null, activo: true, observaciones: '' },
    { id: 'a2', nombre: 'Sofía', apellido: 'Perez', dni: '52345678', fechaNacimiento: '2014-08-22', celular: '1145678901', celularAlternativo: '', cursoId: 'c2', horarioCurso: 'Martes y Jueves · 17:00 a 18:30', grupoFamiliarId: null, activo: true, observaciones: '' },
    { id: 'a3', nombre: 'Martín', apellido: 'García', dni: '48234567', fechaNacimiento: '2008-11-03', celular: '1156789012', celularAlternativo: '', cursoId: 'c4', horarioCurso: '', grupoFamiliarId: null, activo: true, observaciones: '' }
  ],
  gruposFamiliares: [],
  promociones: [],
  pagos: [],
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
      { id: 'm1', efectivo: 22000, transferencia: 24200, vigenciaDesde: '2026-01-01' }
    ],
    plantillaWhatsApp: 'Hola {nombre}! Confirmamos el pago de {periodos} en {instituto} por {total} ({medio}). ¡Muchas gracias!',
    plantillaWhatsAppParcial: 'Hola {nombre}! Recibimos un pago parcial de {monto} ({medio}) para la cuota de {periodo} en {instituto}. Saldo pendiente: {saldo}. ¡Gracias!',
    plantillaWhatsAppSaldo: 'Hola {nombre}! Confirmamos el pago del saldo pendiente de {periodo} ({monto} en {medio}) en {instituto}. ¡Cuota saldada!'
  }
};

// ============================================================
// HELPERS
// ============================================================
const fmtMoney = (n) => '$' + Math.round(n).toLocaleString('es-AR');
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const today = () => new Date().toISOString().split('T')[0];

const initials = (alumno) => {
  const a = (alumno.apellido || '').trim()[0] || '';
  const n = (alumno.nombre || '').trim()[0] || '';
  return (a + n).toUpperCase();
};

// Genera un color de avatar basado en el nombre (consistente por persona)
const AVATAR_COLORS = [
  { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  { bg: 'bg-amber-100', text: 'text-amber-700' },
  { bg: 'bg-sky-100', text: 'text-sky-700' },
  { bg: 'bg-rose-100', text: 'text-rose-700' },
  { bg: 'bg-violet-100', text: 'text-violet-700' },
  { bg: 'bg-teal-100', text: 'text-teal-700' },
  { bg: 'bg-orange-100', text: 'text-orange-700' },
  { bg: 'bg-indigo-100', text: 'text-indigo-700' }
];
const avatarColor = (alumno) => {
  const seed = (alumno.id || alumno.nombre + alumno.apellido || '').split('').reduce((s, c) => s + c.charCodeAt(0), 0);
  return AVATAR_COLORS[seed % AVATAR_COLORS.length];
};

// Componente Avatar con color generado por alumno
const Avatar = ({ alumno, size = 'md', className = '' }) => {
  const color = avatarColor(alumno);
  const sizes = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base'
  };
  return (
    <div className={`rounded-full flex items-center justify-center font-semibold shrink-0 ${color.bg} ${color.text} ${sizes[size]} ${className}`}>
      {initials(alumno)}
    </div>
  );
};

const fullName = (alumno) => `${alumno.apellido}, ${alumno.nombre}`;

// Limpia y formatea celular para WhatsApp (Argentina)
const formatPhoneForWA = (phone) => {
  if (!phone) return '';
  let digits = phone.replace(/\D/g, '');
  // Si ya empieza con 54, dejarlo
  if (digits.startsWith('54')) return digits;
  // Si empieza con 0, sacarlo
  if (digits.startsWith('0')) digits = digits.slice(1);
  // Sacar el 15 si está después del código de área (heurística simple)
  // Asumimos que en argentina el formato es: codArea + 15 + numero (legacy) o codArea + numero
  // Para WhatsApp se necesita 549 + codArea + numero (sin 15)
  // Si tiene 11 dígitos y los primeros 2-4 son código de área, asumimos sin 15
  return '549' + digits;
};

// Busca el precio vigente de un curso para una fecha dada
const buscarPrecioVigente = (precios, cursoId, tipo, fecha) => {
  const aplicables = precios
    .filter(p => p.cursoId === cursoId && p.tipo === tipo && p.vigenciaDesde <= fecha)
    .sort((a, b) => b.vigenciaDesde.localeCompare(a.vigenciaDesde));
  return aplicables[0] || null;
};

// Obtiene el periodo "de referencia" para el cálculo de recargos
// Retorna {anio, mes} - mes 1-12. Para INSC y EXAM usa enero/diciembre del año.
const periodoReferencia = (periodoId, anio) => {
  const p = PERIODOS.find(x => x.id === periodoId);
  if (!p) return null;
  if (p.tipo === 'MENSUAL') return { anio, mes: p.mes };
  if (p.tipo === 'INSCRIPCION') return { anio, mes: 2 }; // febrero como ref
  if (p.tipo === 'EXAMEN') return { anio, mes: 12 }; // diciembre como ref
  return null;
};

// Calcula la cuota para un alumno en un periodo determinado
const calcularCuota = (alumno, periodoId, anio, ctx) => {
  const { cursos, preciosCuotas, alumnos, configuracion, promociones } = ctx;
  const periodo = PERIODOS.find(p => p.id === periodoId);
  if (!periodo) return null;

  const ref = periodoReferencia(periodoId, anio);
  // Fecha del 1° del periodo (para buscar precio vigente)
  const fechaInicioPeriodo = `${anio}-${String(ref.mes).padStart(2, '0')}-01`;
  // Último día del periodo
  const ultimoDia = new Date(anio, ref.mes, 0).getDate();
  const fechaFinPeriodo = `${anio}-${String(ref.mes).padStart(2, '0')}-${String(ultimoDia).padStart(2, '0')}`;
  const dia15 = `${anio}-${String(ref.mes).padStart(2, '0')}-15`;

  let precio;
  if (periodo.tipo === 'INSCRIPCION') {
    // Matrícula: valor global desde configuración (con histórico de vigencias)
    const matriculas = (configuracion.matriculas || [])
      .filter(m => m.vigenciaDesde <= fechaInicioPeriodo)
      .sort((a, b) => b.vigenciaDesde.localeCompare(a.vigenciaDesde));
    precio = matriculas[0];
    if (!precio) return { error: 'Sin matrícula configurada (Configuración → Matrícula)' };
  } else {
    // Mensual y Examen usan el precio MENSUAL vigente
    // (el Examen toma el precio de Diciembre del año del período)
    precio = buscarPrecioVigente(preciosCuotas, alumno.cursoId, 'MENSUAL', fechaInicioPeriodo);
    if (!precio) return { error: 'Sin precio configurado para este curso/periodo' };
  }

  const hoy = today();
  let efectivoBase = precio.efectivo;
  let transferenciaBase = precio.transferencia;

  // Determinar etapa del pago
  let etapa, recargoPct = 0;
  if (hoy <= dia15) {
    etapa = 'Primera quincena';
  } else if (hoy <= fechaFinPeriodo) {
    etapa = 'Segunda quincena';
    recargoPct = configuracion.recargoSegundaQuincenaPorcentaje;
  } else {
    etapa = 'Mes vencido';
    recargoPct = configuracion.recargoMesVencidoPorcentaje;
  }

  // Exención de recargo individual (alumno avisó que paga tarde)
  if (recargoPct > 0 && (alumno.sinRecargo || []).includes(`${periodoId}-${anio}`)) {
    recargoPct = 0;
  }

  let transferenciaFinal = Math.round(transferenciaBase * (1 + recargoPct / 100));
  // Mes vencido: el precio es siempre la base de transferencia + recargo, cualquiera sea el medio de pago
  let efectivoFinal = etapa === 'Mes vencido'
    ? transferenciaFinal
    : Math.round(efectivoBase * (1 + recargoPct / 100));

  // Descuento por hermano — hermanos ordenados automáticamente por precio de cuota
  // de mayor a menor. El más caro es posición 1 (sin descuento), el más barato
  // ocupa la posición más alta y recibe el mayor descuento configurado.
  let descuentoHermano = 0;
  if (alumno.grupoFamiliarId) {
    const hermanos = alumnos
      .filter(a => a.grupoFamiliarId === alumno.grupoFamiliarId && a.activo)
      .map(a => {
        const pc = buscarPrecioVigente(preciosCuotas, a.cursoId, 'MENSUAL', fechaInicioPeriodo);
        return { ...a, _precio: pc ? pc.efectivo : 0 };
      })
      .sort((a, b) => b._precio - a._precio || a.id.localeCompare(b.id)); // descendente: más caro = posición 1

    const posicion = hermanos.findIndex(h => h.id === alumno.id) + 1;
    const descuentos = [...(configuracion.descuentosHermanos || [])].sort((a, b) => a.posicion - b.posicion);
    descuentos.forEach(d => {
      if (posicion >= d.posicion) descuentoHermano = d.porcentaje;
    });

    if (descuentoHermano > 0) {
      efectivoFinal = Math.round(efectivoFinal * (1 - descuentoHermano / 100));
      transferenciaFinal = Math.round(transferenciaFinal * (1 - descuentoHermano / 100));
    }
  }

  // Promoción individual
  const periodoKey = `${periodoId}-${anio}`;
  const promo = promociones.find(pr =>
    pr.alumnoId === alumno.id && pr.meses.includes(periodoKey)
  );
  if (promo) {
    if (efectivoFinal) efectivoFinal = Math.max(0, efectivoFinal - promo.montoDescuento);
    transferenciaFinal = Math.max(0, transferenciaFinal - promo.montoDescuento);
  }

  return {
    efectivo: efectivoFinal,
    transferencia: transferenciaFinal,
    soloTransferencia: false,
    etapa,
    recargoPct,
    descuentoHermano,
    promo: promo ? promo.montoDescuento : 0,
    base: { efectivo: precio.efectivo, transferencia: precio.transferencia }
  };
};

// Verifica si una cuota fue anulada (alumno no debe ese periodo, ej: empezó más tarde)
const esCuotaAnulada = (alumno, periodoId, anio) => {
  return (alumno.cuotasAnuladas || []).includes(`${periodoId}-${anio}`);
};

// Verifica si un periodo está pagado (mantenida por compatibilidad)
const estaPagado = (pagos, alumnoId, periodoId, anio) => {
  return obtenerEstadoCuota(pagos, alumnoId, periodoId, anio).estado === 'pagado';
};

// Estado completo de una cuota: pendiente, parcial o pagado
const obtenerEstadoCuota = (pagos, alumnoId, periodoId, anio) => {
  const list = pagos
    .filter(p => p.alumnoId === alumnoId && p.periodoId === periodoId && p.anio === anio)
    .sort((a, b) => (a.fechaPago || '').localeCompare(b.fechaPago || ''));
  if (list.length === 0) {
    return { estado: 'pendiente', pagos: [], cobrado: 0, precioFijado: 0, saldo: 0 };
  }
  // Compatibilidad con pagos viejos: si no tiene precioFijado, asumimos que el primer pago lo cubría todo
  const primerPago = list[0];
  const precioFijado = primerPago.precioFijado != null ? primerPago.precioFijado : (primerPago.montoCobrado || primerPago.montoTotal || 0);
  const cobrado = list.reduce((s, p) => s + (p.montoCobrado != null ? p.montoCobrado : (p.montoTotal || 0)), 0);
  const saldo = Math.max(0, precioFijado - cobrado);
  return {
    estado: cobrado >= precioFijado ? 'pagado' : 'parcial',
    pagos: list,
    cobrado,
    precioFijado,
    saldo
  };
};

// ============================================================
// MAIN APP
// ============================================================
export default function App() {
  const [data, setData] = useState(initialState);
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState('pagos');
  const [importMessage, setImportMessage] = useState(null);
  const [saveStatus, setSaveStatus] = useState('idle'); // 'idle' | 'pending' | 'saving' | 'saved' | 'error'
  const saveTimer = useRef(null);

  useEffect(() => {
    storage.get('ibo_data').then(saved => {
      if (saved) {
        // Migración: aplicar mesesExcluidos desde el JSON si el curso guardado no lo tiene
        const cursosActualizados = (saved.cursos || []).map(c => {
          if (!c.mesesExcluidos) {
            const jsonCurso = datosIniciales.cursos?.find(jc => jc.id === c.id);
            if (jsonCurso?.mesesExcluidos) return { ...c, mesesExcluidos: jsonCurso.mesesExcluidos };
            return { ...c, mesesExcluidos: [] };
          }
          return c;
        });
        setData({ ...initialState, ...saved, cursos: cursosActualizados });
      } else {
        const { _meta, ...rest } = datosIniciales;
        setData(rest);
        const t = _meta.totales;
        setImportMessage(`Se importaron ${t.alumnos} alumnos, ${t.pagos} pagos, ${t.cursos} cursos y ${t.grupos_familiares} grupos familiares.`);
      }
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (!loaded) return;
    setSaveStatus('pending');
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setSaveStatus('saving');
      const result = await storage.set('ibo_data', data);
      if (result.ok) {
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2500);
      } else {
        setSaveStatus('error');
      }
    }, GAS_URL ? 1500 : 0);
    return () => clearTimeout(saveTimer.current);
  }, [data, loaded]);

  const update = (patch) => setData(d => ({ ...d, ...patch }));

  if (!loaded) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 font-body" style={{
        background: 'radial-gradient(ellipse at top, #f0fdf4 0%, #fafaf9 40%, #fafaf9 100%)'
      }}>
        <div className="text-center">
          <div className="font-display text-5xl font-semibold italic text-emerald-700 mb-1">IBO</div>
          <div className="text-xs text-stone-400 tracking-[0.2em] uppercase">Sistema de pagos</div>
        </div>
        <div className="flex gap-2">
          {[0, 1, 2].map(i => (
            <div key={i} className="w-2 h-2 rounded-full bg-emerald-400"
              style={{ animation: `ibo-dot 1.4s ease-in-out ${i * 0.22}s infinite` }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&display=swap');
        .font-display { font-family: 'Fraunces', Georgia, serif; font-optical-sizing: auto; }
        .font-body { font-family: 'Inter', ui-sans-serif, system-ui, sans-serif; }
      `}</style>
      <div className="min-h-screen text-stone-900 font-body" style={{
        background: 'radial-gradient(ellipse at top, #f0fdf4 0%, #fafaf9 35%, #fafaf9 100%)'
      }}>
        <div className="max-w-5xl mx-auto px-4 py-8">
          <Header tab={tab} setTab={setTab} nombreInstituto={data.configuracion.nombreInstituto} saveStatus={saveStatus} />
          {importMessage && (
            <div className="mt-4 flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-emerald-800 text-sm">
              <Check size={16} className="shrink-0 text-emerald-600" />
              <span>{importMessage}</span>
              <button onClick={() => setImportMessage(null)} className="ml-auto text-emerald-500 hover:text-emerald-700"><X size={14} /></button>
            </div>
          )}
          <div className="mt-6">
            {tab === 'pagos' && <PagosTab data={data} update={update} />}
            {tab === 'alumnos' && <AlumnosTab data={data} update={update} />}
            {tab === 'cursos' && <CursosTab data={data} update={update} />}
            {tab === 'config' && <ConfigTab data={data} update={update} />}
          </div>
        </div>
      </div>
    </>
  );
}

// ============================================================
// HEADER
// ============================================================
function SaveIndicator({ status }) {
  if (status === 'idle') return null;
  const map = {
    pending:  { text: 'Sin guardar…',  cls: 'text-stone-400' },
    saving:   { text: 'Guardando…',    cls: 'text-amber-500' },
    saved:    { text: 'Guardado ✓',    cls: 'text-emerald-600' },
    error:    { text: 'Error al guardar', cls: 'text-red-500' },
  };
  const { text, cls } = map[status] || {};
  return <span className={`text-xs font-medium ${cls}`}>{text}</span>;
}

function Header({ tab, setTab, nombreInstituto, saveStatus }) {
  const tabs = [
    { id: 'pagos', label: 'Pagos', icon: CreditCard },
    { id: 'alumnos', label: 'Alumnos', icon: Users },
    { id: 'cursos', label: 'Cursos', icon: BookOpen },
    { id: 'config', label: 'Configuración', icon: Settings }
  ];
  return (
    <div className="bg-white/80 backdrop-blur rounded-2xl border border-stone-200/80 px-6 pt-6 pb-2 shadow-sm">
      <div className="flex items-baseline justify-between mb-1">
        <h1 className="font-display text-3xl tracking-tight">
          <span className="font-semibold italic text-emerald-800">{nombreInstituto}</span>
          <span className="text-stone-300 mx-2 font-light">·</span>
          <span className="text-stone-700 font-normal">{tabs.find(t => t.id === tab)?.label}</span>
        </h1>
        <div className="flex items-center gap-3">
          <SaveIndicator status={saveStatus} />
          <div className="text-xs text-stone-400 hidden sm:block">
            {new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </div>
        </div>
      </div>
      <div className="flex gap-1 mt-5 border-b border-stone-200 -mx-6 px-6">
        {tabs.map(t => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-all ${
                active
                  ? 'border-emerald-700 text-emerald-800'
                  : 'border-transparent text-stone-500 hover:text-stone-800 hover:border-stone-300'
              }`}
            >
              <Icon size={16} strokeWidth={active ? 2.25 : 1.75} />
              {t.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// PAGOS TAB
// ============================================================
function PagosTab({ data, update }) {
  const [query, setQuery] = useState('');
  const [selectedAlumnoId, setSelectedAlumnoId] = useState(null);
  const [selectedPeriodos, setSelectedPeriodos] = useState([]); // {alumnoId, periodoId, anio}
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [multiMode, setMultiMode] = useState(false);
  const [multiAlumnos, setMultiAlumnos] = useState([]); // [{alumnoId, periodos: [periodoId]}]
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [pagoView, setPagoView] = useState(null); // {alumno, periodo, anio, pago}
  const [subView, setSubView] = useState('cobrar'); // 'cobrar' | 'deudores'
  const [editingAlumno, setEditingAlumno] = useState(null);

  const alumno = data.alumnos.find(a => a.id === selectedAlumnoId);
  const curso = alumno ? data.cursos.find(c => c.id === alumno.cursoId) : null;

  const resultados = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return data.alumnos
      .filter(a => a.activo && (
        a.nombre.toLowerCase().includes(q) ||
        a.apellido.toLowerCase().includes(q) ||
        (a.nombre + ' ' + a.apellido).toLowerCase().includes(q)
      ))
      .slice(0, 8);
  }, [query, data.alumnos]);

  const togglePeriodo = (alumnoId, periodoId) => {
    const key = `${alumnoId}-${periodoId}-${anio}`;
    const existe = selectedPeriodos.find(p => `${p.alumnoId}-${p.periodoId}-${p.anio}` === key);
    if (existe) {
      setSelectedPeriodos(selectedPeriodos.filter(p => `${p.alumnoId}-${p.periodoId}-${p.anio}` !== key));
    } else {
      setSelectedPeriodos([...selectedPeriodos, { alumnoId, periodoId, anio }]);
    }
  };

  const isPeriodoSelected = (alumnoId, periodoId) =>
    selectedPeriodos.some(p => p.alumnoId === alumnoId && p.periodoId === periodoId && p.anio === anio);

  const totalSeleccionado = selectedPeriodos.length;

  const addAlumnoToMulti = (alumnoId) => {
    if (!multiAlumnos.find(m => m.id === alumnoId)) {
      setMultiAlumnos([...multiAlumnos, { id: alumnoId }]);
    }
    setQuery('');
  };

  const removeFromMulti = (alumnoId) => {
    setMultiAlumnos(multiAlumnos.filter(m => m.id !== alumnoId));
    setSelectedPeriodos(selectedPeriodos.filter(p => p.alumnoId !== alumnoId));
  };

  const onConfirmPayment = (paymentDetails) => {
    // Solo registrar los pagos. El modal se encarga del flujo de WhatsApp.
    const newPagos = selectedPeriodos.map(sp => {
      const detalle = paymentDetails.perAlumno[sp.alumnoId]?.[sp.periodoId];
      return {
        id: uid(),
        alumnoId: sp.alumnoId,
        periodoId: sp.periodoId,
        anio: sp.anio,
        fechaPago: today(),
        montoCobrado: detalle?.monto || 0,
        precioFijado: detalle?.precioFijado || detalle?.monto || 0,
        montoTotal: detalle?.monto || 0, // legacy compat
        metodo: detalle?.metodo || 'efectivo',
        observaciones: ''
      };
    });
    update({ pagos: [...data.pagos, ...newPagos] });
  };

  const saveAlumnoFromPagos = (alumno) => {
    update({ alumnos: data.alumnos.map(a => a.id === alumno.id ? alumno : a) });
    setEditingAlumno(null);
  };

  const closePaymentModal = () => {
    setShowPaymentModal(false);
    setSelectedPeriodos([]);
    if (!multiMode) setSelectedAlumnoId(null);
    else setMultiAlumnos([]);
  };

  const verPago = (alumnoId, periodoId, anio) => {
    const estadoCuota = obtenerEstadoCuota(data.pagos, alumnoId, periodoId, anio);
    const alumno = data.alumnos.find(a => a.id === alumnoId);
    const periodo = PERIODOS.find(p => p.id === periodoId);
    if (estadoCuota.pagos.length > 0 && alumno && periodo) {
      setPagoView({ alumno, periodo, anio, estadoCuota });
    }
  };

  const eliminarPago = (pagoId) => {
    update({ pagos: data.pagos.filter(p => p.id !== pagoId) });
    setPagoView(null);
  };

  const cobrarSaldo = (alumno, periodo, anio, saldo) => {
    // Cerrar el modal de detalle y abrir el de cobro con la línea pre-seleccionada
    setPagoView(null);
    if (multiMode) {
      // En modo multi, agregar el alumno si no está y seleccionar el periodo
      if (!multiAlumnos.find(m => m.id === alumno.id)) {
        setMultiAlumnos([...multiAlumnos, { id: alumno.id }]);
      }
      setSelectedPeriodos([{ alumnoId: alumno.id, periodoId: periodo.id, anio, esSaldo: true, montoSaldo: saldo }]);
    } else {
      setSelectedAlumnoId(alumno.id);
      setSelectedPeriodos([{ alumnoId: alumno.id, periodoId: periodo.id, anio, esSaldo: true, montoSaldo: saldo }]);
    }
    setShowPaymentModal(true);
  };

  // ===== Multi-mode rendering =====
  if (multiMode) {
    return (
      <div className="space-y-4">
        <div className="bg-white rounded-2xl border border-stone-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-stone-900">Cobro a varios alumnos</h2>
              <p className="text-sm text-stone-500 mt-0.5">Agregá los alumnos y seleccioná los meses a cobrar</p>
            </div>
            <button
              onClick={() => { setMultiMode(false); setMultiAlumnos([]); setSelectedPeriodos([]); }}
              className="text-sm text-stone-500 hover:text-stone-800 px-3 py-1.5 rounded-lg hover:bg-stone-100"
            >
              ← Modo individual
            </button>
          </div>

          <SearchBox
            query={query}
            setQuery={setQuery}
            placeholder="Buscar alumno para agregar..."
            resultados={resultados.filter(r => !multiAlumnos.find(m => m.id === r.id))}
            onSelect={(a) => addAlumnoToMulti(a.id)}
          />
        </div>

        {multiAlumnos.length > 0 && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-stone-500">Año:</span>
            <select
              value={anio}
              onChange={e => setAnio(Number(e.target.value))}
              className="px-3 py-1.5 rounded-lg border border-stone-200 bg-white"
            >
              {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        )}

        {multiAlumnos.map(m => {
          const al = data.alumnos.find(a => a.id === m.id);
          if (!al) return null;
          const cur = data.cursos.find(c => c.id === al.cursoId);
          return (
            <AlumnoPagoCard
              key={al.id}
              alumno={al}
              curso={cur}
              data={data}
              update={update}
              anio={anio}
              isSelected={(pid) => isPeriodoSelected(al.id, pid)}
              togglePeriodo={(pid) => togglePeriodo(al.id, pid)}
              onVerPago={(pid) => verPago(al.id, pid, anio)}
              onRemove={() => removeFromMulti(al.id)}
              onEdit={() => setEditingAlumno(al)}
              showRemove
            />
          );
        })}

        {totalSeleccionado > 0 && (
          <FloatingPayBar
            count={totalSeleccionado}
            onClick={() => setShowPaymentModal(true)}
          />
        )}

        {showPaymentModal && (
          <PaymentModal
            data={data}
            update={update}
            selectedPeriodos={selectedPeriodos}
            onClose={closePaymentModal}
            onConfirm={onConfirmPayment}
          />
        )}

        {pagoView && (
          <PagoDetalleModal
            {...pagoView}
            onClose={() => setPagoView(null)}
            onDelete={(pagoId) => eliminarPago(pagoId)}
            onCobrarSaldo={(saldo) => cobrarSaldo(pagoView.alumno, pagoView.periodo, pagoView.anio, saldo)}
          />
        )}

        {editingAlumno && (
          <AlumnoForm
            alumno={editingAlumno}
            data={data}
            update={update}
            onSave={saveAlumnoFromPagos}
            onClose={() => setEditingAlumno(null)}
          />
        )}
      </div>
    );
  }

  // ===== Individual mode =====
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-stone-200 p-6">
        {/* Sub-view toggle */}
        <div className="flex gap-1 border-b border-stone-200 -mx-6 px-6 mb-4">
          <button
            onClick={() => setSubView('cobrar')}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-all ${
              subView === 'cobrar' ? 'border-emerald-700 text-emerald-800' : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            Cobrar
          </button>
          <button
            onClick={() => setSubView('deudores')}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-all ${
              subView === 'deudores' ? 'border-emerald-700 text-emerald-800' : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            Ver deudores
          </button>
        </div>

        {subView === 'cobrar' && (
          <div className="flex items-center justify-between">
            <SearchBox
              query={query}
              setQuery={setQuery}
              placeholder="Buscar alumno por nombre o apellido..."
              resultados={resultados}
              onSelect={(a) => { setSelectedAlumnoId(a.id); setQuery(''); setSelectedPeriodos([]); }}
              className="flex-1"
            />
            <button
              onClick={() => { setMultiMode(true); setSelectedAlumnoId(null); setSelectedPeriodos([]); }}
              className="ml-3 text-sm text-emerald-700 hover:bg-emerald-50 px-3 py-2 rounded-lg flex items-center gap-1.5 whitespace-nowrap"
            >
              <UserPlus size={16} /> Cobrar a varios
            </button>
          </div>
        )}
      </div>

      {subView === 'deudores' && <DeudoresView data={data} />}

      {subView === 'cobrar' && alumno && curso && (
        <>
          <div className="flex items-center gap-3 px-1">
            <span className="text-xs uppercase tracking-wider text-stone-500">Año:</span>
            <select
              value={anio}
              onChange={e => { setAnio(Number(e.target.value)); setSelectedPeriodos([]); }}
              className="px-3 py-1.5 rounded-lg border border-stone-200 bg-white text-sm"
            >
              {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <AlumnoPagoCard
            alumno={alumno}
            curso={curso}
            data={data}
            update={update}
            anio={anio}
            isSelected={(pid) => isPeriodoSelected(alumno.id, pid)}
            togglePeriodo={(pid) => togglePeriodo(alumno.id, pid)}
            onVerPago={(pid) => verPago(alumno.id, pid, anio)}
            onChange={() => { setSelectedAlumnoId(null); setSelectedPeriodos([]); }}
            onEdit={() => setEditingAlumno(alumno)}
          />
        </>
      )}

      {subView === 'cobrar' && !alumno && !query && (
        <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center text-stone-400">
          <Search size={32} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm">Buscá un alumno para comenzar</p>
        </div>
      )}

      {totalSeleccionado > 0 && (
        <FloatingPayBar count={totalSeleccionado} onClick={() => setShowPaymentModal(true)} />
      )}

      {showPaymentModal && (
        <PaymentModal
          data={data}
          update={update}
          selectedPeriodos={selectedPeriodos}
          onClose={closePaymentModal}
          onConfirm={onConfirmPayment}
        />
      )}

      {pagoView && (
        <PagoDetalleModal
          {...pagoView}
          onClose={() => setPagoView(null)}
          onDelete={(pagoId) => eliminarPago(pagoId)}
          onCobrarSaldo={(saldo) => cobrarSaldo(pagoView.alumno, pagoView.periodo, pagoView.anio, saldo)}
        />
      )}

      {editingAlumno && (
        <AlumnoForm
          alumno={editingAlumno}
          data={data}
          update={update}
          onSave={saveAlumnoFromPagos}
          onClose={() => setEditingAlumno(null)}
        />
      )}
    </div>
  );
}

// ============================================================
// PAGO DETALLE MODAL (ver y eliminar pago existente)
// ============================================================
function PagoDetalleModal({ alumno, periodo, anio, estadoCuota, onClose, onDelete, onCobrarSaldo }) {
  const [confirmandoIdx, setConfirmandoIdx] = useState(null);

  const fmtFecha = (f) => f
    ? new Date(f + 'T00:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—';

  const esParcial = estadoCuota.estado === 'parcial';

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-md w-full my-8 max-h-[90vh] overflow-y-auto">
        <div className="border-b border-stone-200 px-6 py-4 flex items-center justify-between sticky top-0 bg-white">
          <h2 className="font-semibold">Detalle de la cuota</h2>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-700"><X size={20} /></button>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex items-center gap-3 pb-4 border-b border-stone-100">
            <Avatar alumno={alumno} size="lg" />
            <div className="flex-1">
              <div className="font-semibold">{fullName(alumno)}</div>
              <div className="text-sm text-stone-500">{periodo.full} {anio}</div>
            </div>
            <div className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
              esParcial ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
            }`}>
              {esParcial ? 'PARCIAL' : 'PAGADO'}
            </div>
          </div>

          {/* Resumen de saldo */}
          <div className={`rounded-xl p-4 space-y-1.5 ${esParcial ? 'bg-amber-50 border border-amber-200' : 'bg-emerald-50/60 border border-emerald-200'}`}>
            <div className="flex justify-between text-sm">
              <span className="text-stone-600">Total de la cuota</span>
              <span className="font-semibold">{fmtMoney(estadoCuota.precioFijado)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-stone-600">Cobrado</span>
              <span className="font-semibold">{fmtMoney(estadoCuota.cobrado)}</span>
            </div>
            {esParcial && (
              <div className="flex justify-between text-base pt-1.5 border-t border-amber-200">
                <span className="font-medium text-amber-900">Saldo pendiente</span>
                <span className="font-bold text-amber-900">{fmtMoney(estadoCuota.saldo)}</span>
              </div>
            )}
          </div>

          {/* Lista de pagos */}
          <div>
            <div className="text-xs uppercase tracking-wider text-stone-500 font-medium mb-2">
              Pagos registrados ({estadoCuota.pagos.length})
            </div>
            <div className="space-y-2">
              {estadoCuota.pagos.map((pago, idx) => {
                const monto = pago.montoCobrado != null ? pago.montoCobrado : (pago.montoTotal || 0);
                const confirmando = confirmandoIdx === pago.id;
                return (
                  <div key={pago.id} className="border border-stone-200 rounded-lg p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium">{fmtMoney(monto)}</div>
                        <div className="text-xs text-stone-500">{fmtFecha(pago.fechaPago)}{idx === 0 && estadoCuota.pagos.length > 1 ? ' · 1° pago' : ''}</div>
                      </div>
                      {!confirmando && (
                        <button
                          onClick={() => setConfirmandoIdx(pago.id)}
                          className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                          title="Eliminar este pago"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                    {confirmando && (
                      <div className="mt-2 pt-2 border-t border-stone-100 bg-red-50 -m-3 mt-2 p-3 rounded-b-lg">
                        <div className="text-xs text-red-800 mb-2">¿Eliminar este pago?</div>
                        <div className="flex gap-2">
                          <button onClick={() => setConfirmandoIdx(null)} className="flex-1 px-3 py-1.5 rounded text-xs border border-red-200 bg-white">Cancelar</button>
                          <button onClick={() => onDelete(pago.id)} className="flex-1 px-3 py-1.5 rounded text-xs bg-red-600 text-white">Sí, eliminar</button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Acciones */}
          <div className="flex gap-2 pt-4 border-t border-stone-200">
            <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-lg border border-stone-200 hover:bg-stone-50 font-medium text-sm">
              Cerrar
            </button>
            {esParcial && onCobrarSaldo && (
              <button
                onClick={() => onCobrarSaldo(estadoCuota.saldo)}
                className="flex-1 px-4 py-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-medium text-sm flex items-center justify-center gap-2"
              >
                <DollarSign size={14} />
                Cobrar saldo
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// SEARCH BOX
// ============================================================
function SearchBox({ query, setQuery, placeholder, resultados, onSelect, className = '' }) {
  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" />
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-11 pr-4 py-3 rounded-xl border border-stone-200 bg-white text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
        />
      </div>
      {resultados.length > 0 && (
        <div className="absolute z-10 left-0 right-0 mt-1 bg-white border border-stone-200 rounded-xl shadow-lg overflow-hidden">
          {resultados.map(a => (
            <button
              key={a.id}
              onClick={() => onSelect(a)}
              className="w-full text-left px-4 py-2.5 hover:bg-stone-50 flex items-center gap-3 border-b border-stone-100 last:border-0"
            >
              <Avatar alumno={a} size="sm" />
              <div>
                <div className="text-sm font-medium text-stone-900">{fullName(a)}</div>
                <div className="text-xs text-stone-500">DNI {a.dni}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// ALUMNO PAGO CARD (con grilla de meses)
// ============================================================
function AlumnoPagoCard({ alumno, curso, data, update, anio, isSelected, togglePeriodo, onVerPago, onChange, onRemove, showRemove, onEdit }) {
  const periodosAplicables = PERIODOS.filter(p => !(curso?.mesesExcluidos || []).includes(p.id) && !esCuotaAnulada(alumno, p.id, anio));
  const pagados = periodosAplicables.filter(p => obtenerEstadoCuota(data.pagos, alumno.id, p.id, anio).estado === 'pagado').length;
  const parciales = periodosAplicables.filter(p => obtenerEstadoCuota(data.pagos, alumno.id, p.id, anio).estado === 'parcial').length;
  const total = periodosAplicables.length;
  const todosPagados = total > 0 && pagados === total;

  const toggleAnulada = (periodoId) => {
    if (!update) return;
    const key = `${periodoId}-${anio}`;
    const actuales = alumno.cuotasAnuladas || [];
    const nuevas = actuales.includes(key) ? actuales.filter(k => k !== key) : [...actuales, key];
    update({ alumnos: data.alumnos.map(a => a.id === alumno.id ? { ...a, cuotasAnuladas: nuevas } : a) });
  };

  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-sm hover:shadow-md transition-shadow duration-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Avatar alumno={alumno} size="lg" />
          <div>
            <div className="font-semibold text-stone-900">{fullName(alumno)}</div>
            <div className="text-sm text-stone-500">{curso?.nombre || 'Sin curso'}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
            todosPagados ? 'bg-emerald-100 text-emerald-700' : pagados > 0 ? 'bg-stone-100 text-stone-600' : 'bg-stone-100 text-stone-400'
          }`}>
            {pagados}/{total} pagados
          </span>
          {onEdit && (
            <button onClick={onEdit} className="text-sm text-stone-500 hover:text-stone-800 px-3 py-1.5 rounded-lg border border-stone-200 hover:bg-stone-50 flex items-center gap-1.5">
              <Edit2 size={14} /> Editar
            </button>
          )}
          {onChange && (
            <button onClick={onChange} className="text-sm text-stone-500 hover:text-stone-800 px-3 py-1.5 rounded-lg border border-stone-200 hover:bg-stone-50">
              Cambiar
            </button>
          )}
          {showRemove && (
            <button onClick={onRemove} className="text-stone-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50">
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-6 gap-1.5 mb-4">
        {PERIODOS.map(p => {
          const excluido = (curso?.mesesExcluidos || []).includes(p.id);
          if (excluido) {
            return (
              <div
                key={p.id}
                title={`${p.full} — no aplica para este curso`}
                className="flex flex-col items-center justify-center py-3 rounded-xl border border-stone-100 text-[11px] font-medium text-stone-300 bg-stone-50/60 cursor-default select-none"
              >
                {p.label}
              </div>
            );
          }
          const anulada = esCuotaAnulada(alumno, p.id, anio);
          if (anulada) {
            return (
              <button
                key={p.id}
                onClick={() => update && confirm(`¿Reactivar ${p.full} ${anio} para ${alumno.nombre}? Volverá a figurar como pendiente.`) && toggleAnulada(p.id)}
                title={`${p.full} — no corresponde (click para reactivar)`}
                className="flex flex-col items-center justify-center py-3 rounded-xl border border-dashed border-stone-200 text-[11px] font-semibold tracking-wide text-stone-400 bg-stone-50/60 hover:bg-stone-100"
              >
                <span>{p.label}</span>
                <span className="text-[9px] font-normal">N/A</span>
              </button>
            );
          }
          const estadoCuota = obtenerEstadoCuota(data.pagos, alumno.id, p.id, anio);
          const estado = estadoCuota.estado;
          const seleccionado = isSelected(p.id);
          const esPagadoOParcial = estado === 'pagado' || estado === 'parcial';
          return (
            <button
              key={p.id}
              onClick={() => esPagadoOParcial ? (onVerPago && onVerPago(p.id)) : togglePeriodo(p.id)}
              title={
                estado === 'pagado' ? `${p.full} — pagado (click para ver)` :
                estado === 'parcial' ? `${p.full} — parcial · saldo ${fmtMoney(estadoCuota.saldo)} (click para ver)` :
                p.full
              }
              className={`relative flex flex-col items-center justify-center py-3 rounded-xl border text-[11px] font-semibold tracking-wide transition-all duration-150 ${
                estado === 'pagado'
                  ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm shadow-emerald-100 hover:bg-emerald-400 hover:-translate-y-0.5 hover:shadow-emerald-200'
                  : estado === 'parcial'
                    ? 'bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100 hover:-translate-y-0.5 overflow-hidden'
                    : seleccionado
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-400 ring-2 ring-emerald-200 ring-offset-1'
                      : 'bg-stone-50/50 text-stone-500 border-stone-200 hover:bg-emerald-50/70 hover:border-emerald-300 hover:text-emerald-700 hover:shadow-sm'
              }`}
            >
              {estado === 'pagado'
                ? <><Check size={11} className="mb-0.5 opacity-90" /><span>{p.label}</span></>
                : <span>{p.label}</span>
              }
              {estado === 'parcial' && (
                <span className="absolute bottom-0 left-0 right-0 h-1 bg-amber-400/70 rounded-b-xl" />
              )}
              {estado === 'pendiente' && update && (
                <span
                  role="button"
                  title="Marcar que esta cuota no corresponde (ej: alumno que empezó más tarde)"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`¿Marcar ${p.full} ${anio} como "no corresponde" para ${alumno.nombre}?`)) {
                      toggleAnulada(p.id);
                    }
                  }}
                  className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-white border border-stone-300 text-stone-400 flex items-center justify-center opacity-60 hover:opacity-100 hover:text-red-500 hover:border-red-300"
                >
                  <Ban size={10} />
                </span>
              )}
            </button>
          );
        })}
      </div>
      {update && (
        <p className="text-[11px] text-stone-400 -mt-2 mb-3">El ⊘ en la esquina de una cuota pendiente la marca como "no corresponde".</p>
      )}

      {total > 0 && (
        <div>
          <div className="flex justify-between text-xs text-stone-400 mb-1.5">
            <span>
              {pagados > 0 && `${pagados} pagado${pagados !== 1 ? 's' : ''}`}
              {parciales > 0 && `${pagados > 0 ? ' · ' : ''}${parciales} parcial${parciales !== 1 ? 'es' : ''}`}
              {pagados === 0 && parciales === 0 && 'Sin pagos aún'}
            </span>
            <span>{total - pagados - parciales} pendiente{total - pagados - parciales !== 1 ? 's' : ''}</span>
          </div>
          <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-400 rounded-full transition-all duration-500"
              style={{ width: `${(pagados / total) * 100}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// FLOATING PAY BAR
// ============================================================
function FloatingPayBar({ count, onClick }) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30">
      <button
        onClick={onClick}
        className="bg-emerald-700 hover:bg-emerald-800 text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-3 font-medium"
      >
        <DollarSign size={18} />
        Cobrar {count} {count === 1 ? 'cuota' : 'cuotas'}
        <ChevronRight size={16} />
      </button>
    </div>
  );
}

// ============================================================
// PAYMENT MODAL (con métodos de pago + WhatsApp en 2 pasos)
// ============================================================
function PaymentModal({ data, update, selectedPeriodos, onClose, onConfirm }) {
  const [step, setStep] = useState('payment'); // 'payment' | 'whatsapp'
  const [waGroups, setWaGroups] = useState([]);

  // Calcular cuotas para cada selección
  const lineas = useMemo(() => selectedPeriodos.map(sp => {
    const alumno = data.alumnos.find(a => a.id === sp.alumnoId);
    const calc = calcularCuota(alumno, sp.periodoId, sp.anio, data);
    const periodo = PERIODOS.find(p => p.id === sp.periodoId);
    // Si es cobro de saldo, traer el estado actual de la cuota
    const estadoCuota = sp.esSaldo ? obtenerEstadoCuota(data.pagos, sp.alumnoId, sp.periodoId, sp.anio) : null;
    return { ...sp, alumno, calc, periodo, estadoCuota };
  }), [selectedPeriodos, data]);

  // Estado por línea: método (efectivo/transferencia) y modalidad (total/parcial) + monto parcial
  const [metodoPorLinea, setMetodoPorLinea] = useState({});
  const [modalidadPorLinea, setModalidadPorLinea] = useState({}); // 'total' | 'parcial'
  const [montoParcialPorLinea, setMontoParcialPorLinea] = useState({});

  const keyOf = (sp) => `${sp.alumnoId}-${sp.periodoId}-${sp.anio}`;

  const getMetodo = (l) => {
    const k = keyOf(l);
    return metodoPorLinea[k] || (l.calc?.soloTransferencia ? 'transferencia' : 'efectivo');
  };
  const setMetodo = (l, val) => setMetodoPorLinea({ ...metodoPorLinea, [keyOf(l)]: val });

  const getModalidad = (l) => {
    if (l.esSaldo) return 'saldo';
    return modalidadPorLinea[keyOf(l)] || 'total';
  };
  const setModalidad = (l, val) => setModalidadPorLinea({ ...modalidadPorLinea, [keyOf(l)]: val });

  // Precio total de la línea según método
  const getPrecioTotal = (l) => {
    if (l.esSaldo) return l.montoSaldo || 0;
    if (!l.calc || l.calc.error) return 0;
    return getMetodo(l) === 'efectivo' ? (l.calc.efectivo || 0) : (l.calc.transferencia || 0);
  };

  // Monto a cobrar según modalidad
  const getMontoCobrar = (l) => {
    if (l.esSaldo) return l.montoSaldo || 0;
    const mod = getModalidad(l);
    if (mod === 'total') return getPrecioTotal(l);
    // parcial
    const k = keyOf(l);
    return Number(montoParcialPorLinea[k]) || 0;
  };

  const setMontoParcial = (l, val) => {
    setMontoParcialPorLinea({ ...montoParcialPorLinea, [keyOf(l)]: val });
  };

  // Total agregado y detalle por alumno
  const totales = useMemo(() => {
    let total = 0;
    const detallePorAlumno = {};
    lineas.forEach(l => {
      if (l.calc?.error) return;
      const monto = getMontoCobrar(l);
      const precioTotal = getPrecioTotal(l);
      const metodo = l.esSaldo ? 'transferencia' : getMetodo(l);
      total += monto || 0;
      if (!detallePorAlumno[l.alumnoId]) detallePorAlumno[l.alumnoId] = { alumno: l.alumno, items: [], total: 0 };
      detallePorAlumno[l.alumnoId].items.push({
        periodo: l.periodo,
        anio: l.anio,
        monto,
        precioTotal,
        metodo,
        modalidad: getModalidad(l), // 'total' | 'parcial' | 'saldo'
        esSaldo: !!l.esSaldo,
        // Para mostrar saldo restante después del pago en mensajes:
        saldoRestante: Math.max(0, precioTotal - monto)
      });
      detallePorAlumno[l.alumnoId].total += monto;
    });
    return { total, detallePorAlumno };
  }, [lineas, metodoPorLinea, modalidadPorLinea, montoParcialPorLinea]);

  // Distribución mixta
  const [distribuciones, setDistribuciones] = useState({ efectivo: 0, mp: 0, transferencia: 0 });
  const [usaMixto, setUsaMixto] = useState(false);

  // Cuando NO usa mixto, calcular distribuciones automáticamente
  useEffect(() => {
    if (!usaMixto) {
      let ef = 0, tr = 0;
      lineas.forEach(l => {
        if (l.calc?.error) return;
        const monto = getMontoCobrar(l);
        const m = l.esSaldo ? 'transferencia' : getMetodo(l);
        if (m === 'efectivo') ef += monto;
        else tr += monto;
      });
      setDistribuciones({ efectivo: ef, mp: 0, transferencia: tr });
    }
  }, [lineas, metodoPorLinea, modalidadPorLinea, montoParcialPorLinea, usaMixto]);

  // Cuando SÍ usa mixto y hay una única línea parcial: vincular el monto parcial a la suma del combinado
  useEffect(() => {
    if (!usaMixto) return;
    const lineasParciales = lineas.filter(l => !l.calc?.error && !l.esSaldo && getModalidad(l) === 'parcial');
    if (lineasParciales.length === 1) {
      const sum = (Number(distribuciones.efectivo) || 0) + (Number(distribuciones.mp) || 0) + (Number(distribuciones.transferencia) || 0);
      const k = keyOf(lineasParciales[0]);
      const current = Number(montoParcialPorLinea[k]) || 0;
      if (current !== sum) {
        setMontoParcialPorLinea(prev => ({ ...prev, [k]: sum }));
      }
    }
  }, [distribuciones, usaMixto, modalidadPorLinea, lineas]);

  const sumDistr = (Number(distribuciones.efectivo) || 0) + (Number(distribuciones.mp) || 0) + (Number(distribuciones.transferencia) || 0);
  const restante = totales.total - sumDistr;
  const distrOk = Math.abs(restante) < 1;

  // Validar que las parciales tengan monto > 0 y < total
  const hayParcialesInvalidas = lineas.some(l => {
    if (l.calc?.error || l.esSaldo) return false;
    if (getModalidad(l) !== 'parcial') return false;
    const m = getMontoCobrar(l);
    return m <= 0 || m > getPrecioTotal(l);
  });

  // ========= Mensajes WhatsApp =========
  const replaceVars = (template, vars) => {
    let out = template;
    Object.entries(vars).forEach(([k, v]) => {
      out = out.split(`{${k}}`).join(v);
    });
    return out;
  };

  // Arma el string del medio de pago para el mensaje
  const formatMediosStr = (items, usaMixtoLocal, distrLocal) => {
    if (usaMixtoLocal) {
      const partes = [];
      if (distrLocal.efectivo > 0) partes.push(`${fmtMoney(distrLocal.efectivo)} en efectivo`);
      if (distrLocal.mp > 0) partes.push(`${fmtMoney(distrLocal.mp)} por Mercado Pago`);
      if (distrLocal.transferencia > 0) partes.push(`${fmtMoney(distrLocal.transferencia)} por transferencia`);
      return partes.join(' + ');
    }
    const metodos = [...new Set(items.map(it => it.metodo))];
    if (metodos.length === 1) {
      return metodos[0] === 'efectivo' ? 'efectivo' : 'transferencia / Mercado Pago';
    }
    // Items con distintos métodos (poco común)
    const efSum = items.filter(it => it.metodo === 'efectivo').reduce((s, it) => s + it.monto, 0);
    const trSum = items.filter(it => it.metodo !== 'efectivo').reduce((s, it) => s + it.monto, 0);
    const partes = [];
    if (efSum > 0) partes.push(`${fmtMoney(efSum)} en efectivo`);
    if (trSum > 0) partes.push(`${fmtMoney(trSum)} en transferencia / MP`);
    return partes.join(' + ');
  };

  const generarMensajeIndividual = (alumno, items, usaMixtoLocal, distrLocal) => {
    const cfg = data.configuracion;
    const inst = cfg.nombreInstituto;
    const medio = formatMediosStr(items, usaMixtoLocal, distrLocal);

    const totalesItems = items.filter(it => it.modalidad === 'total');
    const parciales = items.filter(it => it.modalidad === 'parcial');
    const saldos = items.filter(it => it.modalidad === 'saldo');

    const partes = [];

    if (totalesItems.length > 0) {
      const periodos = totalesItems.map(it => `${it.periodo.full} ${it.anio}`).join(', ');
      const totalMonto = totalesItems.reduce((s, it) => s + it.monto, 0);
      partes.push(replaceVars(cfg.plantillaWhatsApp, {
        nombre: alumno.nombre,
        periodos,
        instituto: inst,
        total: fmtMoney(totalMonto),
        medio
      }));
    }

    parciales.forEach(it => {
      partes.push(replaceVars(cfg.plantillaWhatsAppParcial || 'Hola {nombre}! Recibimos un pago parcial de {monto} ({medio}) para la cuota de {periodo} en {instituto}. Saldo pendiente: {saldo}. ¡Gracias!', {
        nombre: alumno.nombre,
        monto: fmtMoney(it.monto),
        periodo: `${it.periodo.full} ${it.anio}`,
        instituto: inst,
        saldo: fmtMoney(it.saldoRestante),
        medio
      }));
    });

    saldos.forEach(it => {
      partes.push(replaceVars(cfg.plantillaWhatsAppSaldo || 'Hola {nombre}! Confirmamos el pago del saldo pendiente de {periodo} ({monto} en {medio}) en {instituto}. ¡Cuota saldada!', {
        nombre: alumno.nombre,
        monto: fmtMoney(it.monto),
        periodo: `${it.periodo.full} ${it.anio}`,
        instituto: inst,
        medio
      }));
    });

    return partes.join('\n\n');
  };

  const generarMensajeAgrupado = (alumnos, items, total, usaMixtoLocal, distrLocal) => {
    const detalle = alumnos.map(a => {
      const itemsAlumno = items.filter(it => it.alumnoNombre === a.nombre);
      return itemsAlumno.map(it => {
        if (it.modalidad === 'parcial') return `• ${a.nombre}: pago parcial de ${it.periodo.full} (${fmtMoney(it.monto)}, saldo pendiente: ${fmtMoney(it.saldoRestante)})`;
        if (it.modalidad === 'saldo') return `• ${a.nombre}: saldo de ${it.periodo.full} (${fmtMoney(it.monto)}) — cuota saldada ✓`;
        return `• ${a.nombre}: ${it.periodo.full} (${fmtMoney(it.monto)})`;
      }).join('\n');
    }).join('\n');
    const medio = formatMediosStr(items, usaMixtoLocal, distrLocal);
    return `Hola! Confirmamos los siguientes pagos en ${data.configuracion.nombreInstituto}:\n\n${detalle}\n\nTotal: ${fmtMoney(total)} · Abonado con: ${medio}\n¡Muchas gracias!`;
  };

  const handleConfirm = () => {
    onConfirm({
      perAlumno: Object.fromEntries(
        Object.entries(totales.detallePorAlumno).map(([id, d]) => [
          id,
          Object.fromEntries(d.items.map(it => [it.periodo.id, {
            monto: it.monto,
            metodo: it.metodo,
            precioFijado: it.esSaldo ? null : it.precioTotal // null = no sobrescribir, mantener el existente
          }]))
        ])
      )
    });

    // Calcular grupos de WhatsApp
    const grupos = {};
    Object.values(totales.detallePorAlumno).forEach(({ alumno, items, total }) => {
      const tel = formatPhoneForWA(alumno.celular);
      if (!tel) return;
      if (!grupos[tel]) grupos[tel] = { phone: tel, rawPhone: alumno.celular, alumnos: [], items: [], total: 0 };
      grupos[tel].alumnos.push(alumno);
      grupos[tel].items.push(...items.map(it => ({ ...it, alumnoNombre: alumno.nombre })));
      grupos[tel].total += total;
    });

    const gruposArr = Object.values(grupos).map(g => ({
      ...g,
      sent: false,
      mensaje: g.alumnos.length > 1
        ? generarMensajeAgrupado(g.alumnos, g.items, g.total, usaMixto, distribuciones)
        : generarMensajeIndividual(g.alumnos[0], g.items, usaMixto, distribuciones)
    }));

    setWaGroups(gruposArr);
    setStep('whatsapp');
  };

  const sendWA = (idx) => {
    const g = waGroups[idx];
    const url = `https://wa.me/${g.phone}?text=${encodeURIComponent(g.mensaje)}`;
    window.open(url, '_blank');
    setWaGroups(waGroups.map((wg, i) => i === idx ? { ...wg, sent: true } : wg));
  };

  // ===== Render: paso WhatsApp =====
  if (step === 'whatsapp') {
    const allSent = waGroups.every(g => g.sent);
    return (
      <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 overflow-y-auto">
        <div className="bg-white rounded-2xl max-w-2xl w-full my-8 max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-white border-b border-stone-200 px-6 py-4 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-lg">✓ Pago registrado</h2>
              <p className="text-xs text-stone-500 mt-0.5">Enviá la confirmación por WhatsApp</p>
            </div>
            <button onClick={onClose} className="text-stone-400 hover:text-stone-700 p-1">
              <X size={20} />
            </button>
          </div>

          <div className="p-6 space-y-3">
            {waGroups.length === 0 ? (
              <div className="text-center text-stone-500 py-8">
                <AlertCircle size={28} className="mx-auto mb-2 text-stone-400" />
                Ninguno de los alumnos tiene celular cargado. No se puede enviar WhatsApp.
              </div>
            ) : (
              <>
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-xs text-emerald-800">
                  Hacé click en cada botón para enviar el WhatsApp. Se abre una pestaña nueva por mensaje (los hermanos con mismo celular reciben un solo mensaje agrupado).
                </div>
                {waGroups.map((g, idx) => (
                  <div key={idx} className={`border rounded-xl p-4 ${g.sent ? 'border-emerald-300 bg-emerald-50/40' : 'border-stone-200'}`}>
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">
                          {g.alumnos.map(a => a.nombre).join(' + ')}
                        </div>
                        <div className="text-xs text-stone-500">{g.rawPhone} · Total: {fmtMoney(g.total)}</div>
                      </div>
                      <button
                        onClick={() => sendWA(idx)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 whitespace-nowrap ${
                          g.sent ? 'bg-emerald-100 text-emerald-700' : 'bg-emerald-700 hover:bg-emerald-800 text-white'
                        }`}
                      >
                        <MessageCircle size={14} />
                        {g.sent ? 'Enviar otra vez' : 'Enviar WhatsApp'}
                      </button>
                    </div>
                    <details className="mt-2">
                      <summary className="text-xs text-stone-500 cursor-pointer hover:text-stone-800">Ver mensaje</summary>
                      <pre className="mt-2 text-xs bg-stone-50 rounded p-2 whitespace-pre-wrap font-sans text-stone-700">{g.mensaje}</pre>
                    </details>
                  </div>
                ))}
              </>
            )}

            <div className="pt-2">
              <button
                onClick={onClose}
                className={`w-full px-4 py-3 rounded-xl font-medium ${
                  allSent || waGroups.length === 0
                    ? 'bg-emerald-700 hover:bg-emerald-800 text-white'
                    : 'border border-stone-200 text-stone-700 hover:bg-stone-50'
                }`}
              >
                {allSent || waGroups.length === 0 ? 'Listo' : 'Cerrar sin enviar todos'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ===== Render: paso Payment =====
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full my-8 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-stone-200 px-6 py-4 flex items-center justify-between">
          <h2 className="font-semibold text-lg">Confirmar cobro</h2>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-700 p-1">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Líneas de pago */}
          <div className="space-y-3">
            {lineas.map(l => {
              const k = keyOf(l);
              if (l.calc?.error) {
                return (
                  <div key={k} className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800 flex gap-2">
                    <AlertCircle size={16} className="shrink-0 mt-0.5" />
                    <div>
                      <div className="font-medium">{fullName(l.alumno)} – {l.periodo.full} {l.anio}</div>
                      <div className="text-xs">{l.calc.error}</div>
                    </div>
                  </div>
                );
              }

              // ===== Caso especial: COBRO DE SALDO =====
              if (l.esSaldo) {
                return (
                  <div key={k} className="border border-emerald-300 bg-emerald-50/40 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <div className="font-medium text-sm flex items-center gap-2">
                          {fullName(l.alumno)}
                          <span className="text-[10px] font-bold px-1.5 py-0.5 bg-emerald-700 text-white rounded">SALDO</span>
                        </div>
                        <div className="text-xs text-stone-500">{l.periodo.full} {l.anio} · Saldo pendiente</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-stone-500">A cobrar</div>
                        <div className="font-semibold text-emerald-700">{fmtMoney(l.montoSaldo)}</div>
                      </div>
                    </div>
                    {l.estadoCuota && (
                      <div className="mt-2 pt-2 border-t border-emerald-200/60 text-xs text-stone-600 flex justify-between">
                        <span>Total cuota: {fmtMoney(l.estadoCuota.precioFijado)}</span>
                        <span>Ya cobrado: {fmtMoney(l.estadoCuota.cobrado)}</span>
                      </div>
                    )}
                  </div>
                );
              }

              // ===== Caso normal =====
              const metodo = getMetodo(l);
              const modalidad = getModalidad(l);
              const precioTotal = getPrecioTotal(l);
              const montoParcial = Number(montoParcialPorLinea[k]) || 0;
              const saldoSiParcial = Math.max(0, precioTotal - montoParcial);

              return (
                <div key={k} className="border border-stone-200 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <div className="font-medium text-sm">{fullName(l.alumno)}</div>
                      <div className="text-xs text-stone-500">{l.periodo.full} {l.anio} · {l.calc.etapa}</div>
                    </div>
                    <div className="text-xs text-stone-400">
                      {l.calc.recargoPct > 0 && <span>+{l.calc.recargoPct}% recargo · </span>}
                      {l.calc.descuentoHermano > 0 && <span>-{l.calc.descuentoHermano}% hermano · </span>}
                      {l.calc.promo > 0 && <span>-{fmtMoney(l.calc.promo)} promo · </span>}
                    </div>
                  </div>

                  {/* Selector método */}
                  <div className="grid grid-cols-2 gap-2 mt-3">
                    <button
                      onClick={() => setMetodo(l, 'efectivo')}
                      disabled={l.calc.soloTransferencia}
                      className={`p-3 rounded-lg border text-left transition-colors ${
                        l.calc.soloTransferencia ? 'opacity-40 cursor-not-allowed border-stone-200' :
                        metodo === 'efectivo' ? 'border-emerald-500 bg-emerald-50' : 'border-stone-200 hover:border-stone-300'
                      }`}
                    >
                      <div className="text-xs text-stone-500">Efectivo</div>
                      <div className="font-semibold">{l.calc.soloTransferencia ? '—' : fmtMoney(l.calc.efectivo)}</div>
                    </button>
                    <button
                      onClick={() => setMetodo(l, 'transferencia')}
                      className={`p-3 rounded-lg border text-left transition-colors ${
                        metodo === 'transferencia' ? 'border-emerald-500 bg-emerald-50' : 'border-stone-200 hover:border-stone-300'
                      }`}
                    >
                      <div className="text-xs text-stone-500">Transferencia / MP</div>
                      <div className="font-semibold">{fmtMoney(l.calc.transferencia)}</div>
                    </button>
                  </div>

                  {/* Toggle Sin recargo */}
                  {(l.calc.recargoPct > 0 || (l.alumno.sinRecargo || []).includes(`${l.periodoId}-${l.anio}`)) && (
                    <div className="mt-3 pt-3 border-t border-stone-100">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={(l.alumno.sinRecargo || []).includes(`${l.periodoId}-${l.anio}`)}
                          onChange={e => {
                            const key = `${l.periodoId}-${l.anio}`;
                            const current = l.alumno.sinRecargo || [];
                            const newArr = e.target.checked ? [...current, key] : current.filter(k => k !== key);
                            update({ alumnos: data.alumnos.map(a => a.id === l.alumnoId ? { ...a, sinRecargo: newArr } : a) });
                          }}
                          className="rounded accent-emerald-700"
                        />
                        <span className="text-sm text-stone-700">Sin recargo para esta cuota</span>
                        <span className="text-xs text-stone-400">(avisó que paga tarde)</span>
                      </label>
                    </div>
                  )}

                  {/* Toggle Total / Parcial */}
                  <div className="mt-3 pt-3 border-t border-stone-100">
                    <div className="flex gap-2">
                      <button
                        onClick={() => setModalidad(l, 'total')}
                        className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium border transition-colors ${
                          modalidad === 'total' ? 'bg-emerald-700 text-white border-emerald-700' : 'border-stone-200 text-stone-600 hover:bg-stone-50'
                        }`}
                      >
                        Pago total
                      </button>
                      <button
                        onClick={() => setModalidad(l, 'parcial')}
                        className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium border transition-colors ${
                          modalidad === 'parcial' ? 'bg-amber-500 text-white border-amber-500' : 'border-stone-200 text-stone-600 hover:bg-stone-50'
                        }`}
                      >
                        Pago parcial
                      </button>
                    </div>

                    {modalidad === 'parcial' && (() => {
                      // Detectar si el monto parcial está siendo controlado por el combinado
                      const lineasParciales = lineas.filter(x => !x.calc?.error && !x.esSaldo && getModalidad(x) === 'parcial');
                      const vinculadoACombinado = usaMixto && lineasParciales.length === 1;
                      return (
                        <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2">
                          <div>
                            <label className="text-xs text-amber-800 font-medium flex items-center gap-1.5">
                              Monto que paga ahora
                              {vinculadoACombinado && (
                                <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-normal">
                                  ↓ vinculado al pago combinado
                                </span>
                              )}
                            </label>
                            <input
                              type="number"
                              value={montoParcialPorLinea[k] || ''}
                              placeholder={vinculadoACombinado ? 'Se calcula con el pago combinado' : `Máx ${fmtMoney(precioTotal)}`}
                              onChange={e => setMontoParcial(l, e.target.value)}
                              readOnly={vinculadoACombinado}
                              className={`w-full mt-1 px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-amber-200 ${
                                vinculadoACombinado ? 'bg-stone-100 border-stone-200 cursor-not-allowed text-stone-700' : 'bg-white border-amber-300'
                              }`}
                            />
                          </div>
                          {montoParcial > 0 && (
                            <div className="text-xs text-amber-900 flex justify-between pt-1 border-t border-amber-200">
                              <span>Saldo restante quedará en:</span>
                              <strong>{fmtMoney(saldoSiParcial)}</strong>
                            </div>
                          )}
                          {montoParcial > precioTotal && (
                            <div className="text-xs text-red-700">El monto no puede superar el total ({fmtMoney(precioTotal)})</div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Total */}
          <div className="border-t border-stone-200 pt-4">
            <div className="flex items-center justify-between text-lg">
              <span className="font-medium">Total a cobrar</span>
              <span className="font-bold text-emerald-700">{fmtMoney(totales.total)}</span>
            </div>
          </div>

          {/* Distribución mixta */}
          {(() => {
            const lineasParciales = lineas.filter(l => !l.calc?.error && !l.esSaldo && getModalidad(l) === 'parcial');
            const vinculadoAParcial = usaMixto && lineasParciales.length === 1;
            return (
              <div className={`rounded-xl p-4 transition-colors ${usaMixto ? 'bg-emerald-50/40 border border-emerald-200' : 'bg-stone-50'}`}>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={usaMixto} onChange={e => setUsaMixto(e.target.checked)} className="rounded" />
                  <span className="text-sm font-medium">Pago combinado (efectivo + MP + transferencia)</span>
                </label>
                {usaMixto && (
                  <>
                    {vinculadoAParcial && (
                      <div className="mt-2 text-xs text-emerald-800 bg-emerald-100/60 border border-emerald-200 rounded px-2.5 py-1.5">
                        💡 La suma de estos campos será el <strong>monto parcial</strong> que se cobra ahora.
                      </div>
                    )}
                    <div className="grid grid-cols-3 gap-2 mt-3">
                      {[
                        { k: 'efectivo', label: 'Efectivo' },
                        { k: 'mp', label: 'Mercado Pago' },
                        { k: 'transferencia', label: 'Transferencia' }
                      ].map(({ k, label }) => (
                        <div key={k}>
                          <label className="text-xs text-stone-500">{label}</label>
                          <input
                            type="number"
                            value={distribuciones[k] || ''}
                            placeholder="0"
                            onChange={e => setDistribuciones({ ...distribuciones, [k]: Number(e.target.value) || 0 })}
                            className="w-full mt-1 px-3 py-2 rounded-lg border border-stone-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                          />
                        </div>
                      ))}
                    </div>

                    <div className="mt-3 pt-3 border-t border-stone-200 flex items-center justify-between text-sm">
                      <span className="text-stone-600">Cobrado: <strong className="text-stone-900">{fmtMoney(sumDistr)}</strong> de {fmtMoney(totales.total)}</span>
                      {distrOk ? (
                        <span className="text-emerald-700 font-semibold flex items-center gap-1">
                          <Check size={16} /> Completo
                        </span>
                      ) : restante > 0 ? (
                        <span className="text-amber-700 font-semibold">Falta: {fmtMoney(restante)}</span>
                      ) : (
                        <span className="text-red-600 font-semibold">Excede: {fmtMoney(-restante)}</span>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })()}

          {/* Botones */}
          <div className="flex gap-2">
            <button onClick={onClose} className="flex-1 px-4 py-3 rounded-xl border border-stone-200 text-stone-700 hover:bg-stone-50 font-medium">
              Cancelar
            </button>
            <button
              onClick={handleConfirm}
              disabled={(usaMixto && !distrOk) || totales.total === 0 || hayParcialesInvalidas}
              className="flex-1 px-4 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Check size={18} />
              Cobrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// ALUMNOS TAB
// ============================================================
function AlumnosTab({ data, update }) {
  const [subTab, setSubTab] = useState('lista'); // 'lista' | 'grupos'
  const [editing, setEditing] = useState(null);
  const [query, setQuery] = useState('');
  const [filtroCurso, setFiltroCurso] = useState('todos');
  const [mostrarInactivos, setMostrarInactivos] = useState(false);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return data.alumnos.filter(a => {
      if (!mostrarInactivos && !a.activo) return false;
      if (filtroCurso === 'sin-curso' && a.cursoId) return false;
      if (filtroCurso !== 'todos' && filtroCurso !== 'sin-curso' && a.cursoId !== filtroCurso) return false;
      if (q && !(a.nombre + ' ' + a.apellido + ' ' + a.dni).toLowerCase().includes(q)) return false;
      return true;
    });
  }, [data.alumnos, query, filtroCurso, mostrarInactivos]);

  const conteoPorCurso = useMemo(() => {
    const c = {};
    data.alumnos.filter(a => a.activo).forEach(a => {
      const k = a.cursoId || 'sin-curso';
      c[k] = (c[k] || 0) + 1;
    });
    return c;
  }, [data.alumnos]);

  const saveAlumno = (alumno) => {
    if (alumno.id) {
      update({ alumnos: data.alumnos.map(a => a.id === alumno.id ? alumno : a) });
    } else {
      update({ alumnos: [...data.alumnos, { ...alumno, id: uid() }] });
    }
    setEditing(null);
  };

  const deleteAlumno = (id) => {
    if (confirm('¿Eliminar alumno? Sus pagos quedarán en el historial pero no podrás emitir nuevos cobros.')) {
      update({ alumnos: data.alumnos.map(a => a.id === id ? { ...a, activo: false } : a) });
    }
  };

  const restoreAlumno = (id) => {
    update({ alumnos: data.alumnos.map(a => a.id === id ? { ...a, activo: true } : a) });
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-4">
        {/* Sub-tabs */}
        <div className="flex gap-1 border-b border-stone-200 -mx-6 px-6 -mt-6 pt-4 mb-0">
          {[
            { id: 'lista', label: 'Alumnos' },
            { id: 'grupos', label: `Grupos familiares${data.gruposFamiliares.length > 0 ? ' · ' + data.gruposFamiliares.length : ''}` }
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setSubTab(t.id)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-all ${
                subTab === t.id ? 'border-emerald-700 text-emerald-800' : 'border-transparent text-stone-500 hover:text-stone-800'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {subTab === 'lista' && (
          <>
            <div className="flex items-center gap-3 pt-2">
              <div className="relative flex-1">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Buscar alumno..."
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-stone-200 bg-white"
                />
              </div>
              <button
                onClick={() => setEditing('new')}
                className="bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-3 rounded-xl font-medium flex items-center gap-2 whitespace-nowrap"
              >
                <Plus size={18} /> Nuevo alumno
              </button>
            </div>
            <div className="flex flex-wrap gap-3 items-center">
              <div className="flex items-center gap-2">
                <label className="text-xs uppercase tracking-wider text-stone-500 font-medium">Curso:</label>
                <select
                  value={filtroCurso}
                  onChange={e => setFiltroCurso(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-stone-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                >
                  <option value="todos">Todos · {data.alumnos.filter(a => a.activo).length}</option>
                  {data.cursos.filter(c => c.activo).map(curso => (
                    <option key={curso.id} value={curso.id}>
                      {curso.nombre} · {conteoPorCurso[curso.id] || 0}
                    </option>
                  ))}
                  {conteoPorCurso['sin-curso'] > 0 && (
                    <option value="sin-curso">Sin curso · {conteoPorCurso['sin-curso']}</option>
                  )}
                </select>
              </div>
              <label className="ml-auto text-xs text-stone-500 flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" checked={mostrarInactivos} onChange={e => setMostrarInactivos(e.target.checked)} className="rounded" />
                Mostrar inactivos
              </label>
            </div>
          </>
        )}
      </div>

      {subTab === 'lista' && (
        <>
          <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
            {filtered.length === 0 ? (
              <div className="p-12 text-center text-stone-400 text-sm">No hay alumnos</div>
            ) : (
              <div className="divide-y divide-stone-100">
                {filtered.map(a => {
                  const curso = data.cursos.find(c => c.id === a.cursoId);
                  const grupo = data.gruposFamiliares.find(g => g.id === a.grupoFamiliarId);
                  return (
                    <div key={a.id} className={`flex items-center gap-3 px-5 py-3 hover:bg-stone-50 ${!a.activo ? 'opacity-50' : ''}`}>
                      <Avatar alumno={a} />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm flex items-center gap-2">
                          {fullName(a)}
                          {!a.activo && <span className="text-xs px-1.5 py-0.5 bg-stone-200 text-stone-600 rounded">Inactivo</span>}
                          {grupo && <span className="text-xs px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded flex items-center gap-1"><Home size={10} />{grupo.nombre}</span>}
                        </div>
                        <div className="text-xs text-stone-500 truncate">
                          {curso?.nombre || 'Sin curso'} · {a.horarioCurso || (a.dia ? `${a.dia} ${a.horario || ''}` : 'Sin horario')} · DNI {a.dni}
                          {a.contactoNombre && <> · {a.contactoNombre}</>}
                        </div>
                      </div>
                      <button onClick={() => setEditing(a)} className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg">
                        <Edit2 size={16} />
                      </button>
                      {a.activo ? (
                        <button onClick={() => deleteAlumno(a.id)} className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                          <Trash2 size={16} />
                        </button>
                      ) : (
                        <button onClick={() => restoreAlumno(a.id)} className="text-xs px-2 py-1 text-emerald-700 hover:bg-emerald-50 rounded">
                          Restaurar
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {editing && (
            <AlumnoForm
              alumno={editing === 'new' ? null : editing}
              data={data}
              update={update}
              onSave={saveAlumno}
              onClose={() => setEditing(null)}
            />
          )}
        </>
      )}

      {subTab === 'grupos' && (
        <GruposFamiliaresView data={data} update={update} />
      )}
    </div>
  );
}

// ============================================================
// GRUPOS FAMILIARES VIEW
// ============================================================
function GruposFamiliaresView({ data, update }) {
  const [expandido, setExpandido] = useState(null);
  const [creando, setCreando] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [renombrando, setRenombrando] = useState(null);
  const [nombreEdit, setNombreEdit] = useState('');
  const [busquedas, setBusquedas] = useState({}); // { grupoId: query }

  const crearGrupo = () => {
    if (!nuevoNombre.trim()) return;
    const newGrupo = { id: uid(), nombre: nuevoNombre.trim() };
    update({ gruposFamiliares: [...data.gruposFamiliares, newGrupo] });
    setNuevoNombre('');
    setCreando(false);
    setExpandido(newGrupo.id);
  };

  const eliminarGrupo = (grupoId) => {
    if (!confirm('¿Eliminar el grupo? Los alumnos quedarán sin grupo asignado.')) return;
    update({
      gruposFamiliares: data.gruposFamiliares.filter(g => g.id !== grupoId),
      alumnos: data.alumnos.map(a => a.grupoFamiliarId === grupoId ? { ...a, grupoFamiliarId: null } : a)
    });
    if (expandido === grupoId) setExpandido(null);
  };

  const guardarRenombre = (grupoId) => {
    if (!nombreEdit.trim()) return;
    update({ gruposFamiliares: data.gruposFamiliares.map(g => g.id === grupoId ? { ...g, nombre: nombreEdit.trim() } : g) });
    setRenombrando(null);
  };

  const agregarAlumno = (grupoId, alumnoId) => {
    update({ alumnos: data.alumnos.map(a => a.id === alumnoId ? { ...a, grupoFamiliarId: grupoId } : a) });
    setBusquedas(prev => ({ ...prev, [grupoId]: '' }));
  };

  const quitarAlumno = (alumnoId) => {
    update({ alumnos: data.alumnos.map(a => a.id === alumnoId ? { ...a, grupoFamiliarId: null } : a) });
  };

  const gruposOrdenados = [...data.gruposFamiliares].sort((a, b) => a.nombre.localeCompare(b.nombre));

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-stone-200 p-5 flex items-center justify-between">
        <div>
          <p className="text-sm text-stone-500">
            Agrupá hermanos para aplicar el descuento automático configurado en Configuración.
          </p>
        </div>
        <button
          onClick={() => { setCreando(true); setExpandido(null); }}
          className="bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 whitespace-nowrap ml-4"
        >
          <Plus size={16} /> Nuevo grupo
        </button>
      </div>

      {/* Formulario de nuevo grupo */}
      {creando && (
        <div className="bg-white rounded-2xl border border-emerald-300 p-5">
          <div className="text-sm font-medium text-stone-700 mb-3">Nombre del nuevo grupo</div>
          <div className="flex gap-2">
            <input
              type="text"
              value={nuevoNombre}
              onChange={e => setNuevoNombre(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && crearGrupo()}
              placeholder="Ej: García, López, Familia Martínez..."
              autoFocus
              className="flex-1 px-3 py-2 rounded-lg border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
            <button
              onClick={crearGrupo}
              disabled={!nuevoNombre.trim()}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-sm font-medium disabled:opacity-50"
            >
              Crear
            </button>
            <button
              onClick={() => { setCreando(false); setNuevoNombre(''); }}
              className="px-3 py-2 text-stone-500 hover:text-stone-800 text-sm"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Lista vacía */}
      {gruposOrdenados.length === 0 && !creando && (
        <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center text-stone-400">
          <Users size={36} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium mb-1">No hay grupos creados todavía</p>
          <p className="text-xs">Hacé click en "Nuevo grupo" para crear uno y agregar hermanos</p>
        </div>
      )}

      {/* Grupos */}
      {gruposOrdenados.map(grupo => {
        const miembros = data.alumnos
          .filter(a => a.grupoFamiliarId === grupo.id && a.activo)
          .sort((a, b) => {
            // Ordenar por precio de cuota descendente (el que más paga primero = el que NO descuenta)
            const hoy = today();
            const pA = buscarPrecioVigente(data.preciosCuotas, a.cursoId, 'MENSUAL', hoy)?.efectivo || 0;
            const pB = buscarPrecioVigente(data.preciosCuotas, b.cursoId, 'MENSUAL', hoy)?.efectivo || 0;
            return pB - pA;
          });
        const isOpen = expandido === grupo.id;
        const q = busquedas[grupo.id] || '';

        const resultadosBusqueda = q.trim()
          ? data.alumnos
              .filter(a =>
                a.activo &&
                a.grupoFamiliarId !== grupo.id &&
                (a.nombre + ' ' + a.apellido).toLowerCase().includes(q.toLowerCase())
              )
              .slice(0, 6)
          : [];

        return (
          <div key={grupo.id} className="bg-white rounded-2xl border border-stone-200 overflow-visible">
            {/* Cabecera del grupo */}
            <div
              className="flex items-center gap-3 px-5 py-4 cursor-pointer hover:bg-stone-50 rounded-2xl"
              onClick={() => setExpandido(isOpen ? null : grupo.id)}
            >
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                <Home size={18} className="text-emerald-700" />
              </div>
              <div className="flex-1 min-w-0">
                {renombrando === grupo.id ? (
                  <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                    <input
                      type="text"
                      value={nombreEdit}
                      onChange={e => setNombreEdit(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') guardarRenombre(grupo.id); if (e.key === 'Escape') setRenombrando(null); }}
                      autoFocus
                      className="flex-1 px-2 py-1 rounded-lg border border-emerald-400 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                    <button onClick={() => guardarRenombre(grupo.id)} className="px-3 py-1 bg-emerald-700 text-white rounded-lg text-xs">Guardar</button>
                    <button onClick={() => setRenombrando(null)} className="px-2 py-1 text-stone-500 text-xs">✕</button>
                  </div>
                ) : (
                  <div className="font-semibold text-stone-900">{grupo.nombre}</div>
                )}
                <div className="text-xs text-stone-500 mt-0.5">
                  {miembros.length === 0 ? 'Sin miembros' : `${miembros.length} miembro${miembros.length !== 1 ? 's' : ''}`}
                  {miembros.length > 0 && ` · ${miembros.map(a => a.nombre).join(', ')}`}
                </div>
              </div>
              <ChevronRight
                size={18}
                className={`text-stone-400 transition-transform shrink-0 ${isOpen ? 'rotate-90' : ''}`}
              />
            </div>

            {/* Panel expandido */}
            {isOpen && (
              <div className="border-t border-stone-100 px-5 py-5 space-y-5">

                {/* Miembros actuales */}
                <div>
                  <div className="text-xs uppercase tracking-wider text-stone-500 font-medium mb-2">
                    Miembros del grupo
                    {miembros.length > 1 && (
                      <span className="ml-2 text-stone-400 normal-case font-normal">(de mayor a menor cuota — el mayor descuento va al más barato)</span>
                    )}
                  </div>
                  {miembros.length === 0 ? (
                    <p className="text-sm text-stone-400 italic">Sin miembros — buscá alumnos abajo para agregar</p>
                  ) : (
                    <div className="space-y-1.5">
                      {miembros.map((a, idx) => {
                        const curso = data.cursos.find(c => c.id === a.cursoId);
                        const hoy = today();
                        const precio = buscarPrecioVigente(data.preciosCuotas, a.cursoId, 'MENSUAL', hoy);
                        const cfg = data.configuracion;
                        // miembros está ordenado descendente (más caro = idx 0 = posición 1)
                        const posicion = idx + 1;
                        const descuentos = [...(cfg.descuentosHermanos || [])].sort((x, y) => x.posicion - y.posicion);
                        let descPct = 0;
                        descuentos.forEach(d => { if (posicion >= d.posicion) descPct = d.porcentaje; });
                        return (
                          <div key={a.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-stone-50 border border-stone-100">
                            <div className="w-6 h-6 rounded-full bg-stone-200 flex items-center justify-center text-xs font-bold text-stone-600 shrink-0">
                              {idx + 1}
                            </div>
                            <Avatar alumno={a} size="sm" />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium truncate">{fullName(a)}</div>
                              <div className="text-xs text-stone-500">{curso?.nombre || 'Sin curso'}</div>
                            </div>
                            <div className="text-right shrink-0">
                              {precio && (
                                <div className="text-xs text-stone-500">{fmtMoney(precio.efectivo)}</div>
                              )}
                              {descPct > 0 ? (
                                <div className="text-xs font-semibold text-emerald-700">−{descPct}%</div>
                              ) : idx === 0 ? (
                                <div className="text-xs text-stone-400">sin descuento</div>
                              ) : null}
                            </div>
                            <button
                              onClick={() => quitarAlumno(a.id)}
                              className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg shrink-0"
                              title="Quitar del grupo"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Buscador para agregar */}
                <div>
                  <div className="text-xs uppercase tracking-wider text-stone-500 font-medium mb-2">Agregar alumno al grupo</div>
                  <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                    <input
                      type="text"
                      value={q}
                      onChange={e => setBusquedas(prev => ({ ...prev, [grupo.id]: e.target.value }))}
                      placeholder="Buscar por nombre o apellido..."
                      className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                    {resultadosBusqueda.length > 0 && (
                      <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-stone-200 rounded-xl shadow-lg overflow-hidden">
                        {resultadosBusqueda.map(a => {
                          const curso = data.cursos.find(c => c.id === a.cursoId);
                          const grupoActual = data.gruposFamiliares.find(g => g.id === a.grupoFamiliarId);
                          return (
                            <button
                              key={a.id}
                              onClick={() => agregarAlumno(grupo.id, a.id)}
                              className="w-full text-left px-4 py-2.5 hover:bg-emerald-50 flex items-center gap-3 border-b border-stone-100 last:border-0"
                            >
                              <Avatar alumno={a} size="sm" />
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium">{fullName(a)}</div>
                                <div className="text-xs text-stone-500">
                                  {curso?.nombre || 'Sin curso'}
                                  {grupoActual && <span className="ml-1 text-amber-600"> · actualmente en "{grupoActual.nombre}"</span>}
                                </div>
                              </div>
                              <span className="text-xs text-emerald-700 font-medium">+ Agregar</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Acciones del grupo */}
                <div className="flex gap-2 pt-1 border-t border-stone-100">
                  <button
                    onClick={() => { setRenombrando(grupo.id); setNombreEdit(grupo.nombre); }}
                    className="text-sm text-stone-500 hover:text-stone-800 px-3 py-1.5 rounded-lg border border-stone-200 hover:bg-stone-50 flex items-center gap-1.5"
                  >
                    <Edit2 size={13} /> Renombrar
                  </button>
                  <button
                    onClick={() => eliminarGrupo(grupo.id)}
                    className="text-sm text-red-500 hover:text-red-700 px-3 py-1.5 rounded-lg border border-red-200 hover:bg-red-50 flex items-center gap-1.5"
                  >
                    <Trash2 size={13} /> Eliminar grupo
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ============================================================
// ALUMNO FORM
// ============================================================
function AlumnoForm({ alumno, data, update, onSave, onClose }) {
  const [form, setForm] = useState(alumno || {
    nombre: '', apellido: '', dni: '', fechaNacimiento: '', celular: '', celularAlternativo: '', contactoNombre: '',
    cursoId: data.cursos[0]?.id || '', horarioCurso: '', grupoFamiliarId: null, activo: true, observaciones: ''
  });

  const [showNuevoGrupo, setShowNuevoGrupo] = useState(false);
  const [nuevoGrupoNombre, setNuevoGrupoNombre] = useState('');

  const set = (k, v) => setForm({ ...form, [k]: v });

  const crearGrupo = () => {
    if (!nuevoGrupoNombre.trim()) return;
    const newGrupo = { id: uid(), nombre: nuevoGrupoNombre };
    update({ gruposFamiliares: [...data.gruposFamiliares, newGrupo] });
    set('grupoFamiliarId', newGrupo.id);
    setShowNuevoGrupo(false);
    setNuevoGrupoNombre('');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-xl w-full my-8 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-stone-200 px-6 py-4 flex items-center justify-between">
          <h2 className="font-semibold text-lg">{alumno ? 'Editar alumno' : 'Nuevo alumno'}</h2>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-700"><X size={20} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nombre" value={form.nombre} onChange={v => set('nombre', v)} />
            <Field label="Apellido" value={form.apellido} onChange={v => set('apellido', v)} />
            <Field label="DNI" value={form.dni} onChange={v => set('dni', v)} />
            <Field label="Fecha de nacimiento" type="date" value={form.fechaNacimiento} onChange={v => set('fechaNacimiento', v)} />
            <Field label="Celular principal" value={form.celular} onChange={v => set('celular', v)} hint="Sin 0 ni 15. Ej: 1145678901" />
            <Field label="Nombre padre/madre/tutor" value={form.contactoNombre} onChange={v => set('contactoNombre', v)} hint="A quién corresponde el celular principal" />
            <Field label="Celular alternativo" value={form.celularAlternativo} onChange={v => set('celularAlternativo', v)} />
          </div>

          <div>
            <label className="text-xs text-stone-500 font-medium uppercase tracking-wider">Curso</label>
            <select
              value={form.cursoId}
              onChange={e => set('cursoId', e.target.value)}
              className="w-full mt-1 px-3 py-2 rounded-lg border border-stone-200 bg-white"
            >
              {data.cursos.filter(c => c.activo).map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs text-stone-500 font-medium uppercase tracking-wider">Horario</label>
            {(() => {
              const cursoSeleccionado = data.cursos.find(c => c.id === form.cursoId);
              const horariosDisponibles = cursoSeleccionado?.horarios || [];
              const horarioActualNoEstaEnLista = form.horarioCurso && !horariosDisponibles.includes(form.horarioCurso);
              return (
                <>
                  <select
                    value={form.horarioCurso || ''}
                    onChange={e => set('horarioCurso', e.target.value)}
                    className="w-full mt-1 px-3 py-2 rounded-lg border border-stone-200 bg-white"
                  >
                    <option value="">— Sin asignar / Por confirmar —</option>
                    {horariosDisponibles.map(h => <option key={h} value={h}>{h}</option>)}
                    {horarioActualNoEstaEnLista && (
                      <option value={form.horarioCurso}>{form.horarioCurso} (anterior)</option>
                    )}
                  </select>
                  {horariosDisponibles.length === 0 ? (
                    <p className="text-xs text-amber-600 mt-1">Este curso aún no tiene horarios cargados. Podés cargarlos en la pestaña Cursos → Editar curso.</p>
                  ) : (
                    <p className="text-xs text-stone-400 mt-1">Si todavía no se confirmó el horario, dejalo en "Sin asignar" y completalo después.</p>
                  )}
                </>
              );
            })()}
          </div>

          <div>
            <label className="text-xs text-stone-500 font-medium uppercase tracking-wider">Grupo familiar (hermanos)</label>
            <div className="flex gap-2 mt-1">
              <select
                value={form.grupoFamiliarId || ''}
                onChange={e => set('grupoFamiliarId', e.target.value || null)}
                className="flex-1 px-3 py-2 rounded-lg border border-stone-200 bg-white"
              >
                <option value="">— Sin grupo —</option>
                {data.gruposFamiliares.map(g => <option key={g.id} value={g.id}>{g.nombre}</option>)}
              </select>
              <button onClick={() => setShowNuevoGrupo(true)} className="px-3 py-2 rounded-lg border border-stone-200 text-sm hover:bg-stone-50">
                <Plus size={16} />
              </button>
            </div>
            {showNuevoGrupo && (
              <div className="flex gap-2 mt-2">
                <input
                  type="text"
                  value={nuevoGrupoNombre}
                  onChange={e => setNuevoGrupoNombre(e.target.value)}
                  placeholder="Nombre del grupo (ej: Familia García)"
                  className="flex-1 px-3 py-2 rounded-lg border border-stone-200"
                />
                <button onClick={crearGrupo} className="px-3 py-2 bg-emerald-700 text-white rounded-lg text-sm">Crear</button>
                <button onClick={() => setShowNuevoGrupo(false)} className="px-3 py-2 text-stone-500 text-sm">Cancelar</button>
              </div>
            )}
            <p className="text-xs text-stone-400 mt-1">
              Asociá hermanos al mismo grupo. Si configuraste descuento, se aplicará automáticamente. Si tienen el mismo celular, recibirán un solo WhatsApp al cobrar varios.
            </p>
          </div>

          <div>
            <label className="text-xs text-stone-500 font-medium uppercase tracking-wider">Observaciones</label>
            <textarea
              value={form.observaciones}
              onChange={e => set('observaciones', e.target.value)}
              rows={2}
              className="w-full mt-1 px-3 py-2 rounded-lg border border-stone-200 bg-white text-sm"
            />
          </div>

          <div className="flex gap-2 pt-4 border-t border-stone-200">
            <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-lg border border-stone-200 hover:bg-stone-50 font-medium text-sm">Cancelar</button>
            <button
              onClick={() => onSave(form)}
              disabled={!form.nombre || !form.apellido}
              className="flex-1 px-4 py-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-medium text-sm disabled:opacity-50"
            >
              Guardar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', hint }) {
  return (
    <div>
      <label className="text-xs text-stone-500 font-medium uppercase tracking-wider">{label}</label>
      <input
        type={type}
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        className="w-full mt-1 px-3 py-2 rounded-lg border border-stone-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
      />
      {hint && <p className="text-xs text-stone-400 mt-1">{hint}</p>}
    </div>
  );
}

function FilterChip({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
        active
          ? 'bg-emerald-700 text-white'
          : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
      }`}
    >
      {children}
    </button>
  );
}

// ============================================================
// CURSOS TAB
// ============================================================
function CursosTab({ data, update }) {
  const [editingPriceFor, setEditingPriceFor] = useState(null);
  const [editingCurso, setEditingCurso] = useState(null);

  const guardarPrecios = (cursoId, precios, vigenciaDesde) => {
    // Crear nuevos registros (no modificar los anteriores)
    const nuevos = ['MENSUAL'].map(tipo => ({
      id: uid(),
      cursoId,
      tipo,
      efectivo: Number(precios[tipo].efectivo) || 0,
      transferencia: Number(precios[tipo].transferencia) || 0,
      vigenciaDesde
    }));
    update({ preciosCuotas: [...data.preciosCuotas, ...nuevos] });
    setEditingPriceFor(null);
  };

  const guardarCurso = (curso) => {
    if (curso.id) {
      update({ cursos: data.cursos.map(c => c.id === curso.id ? curso : c) });
    } else {
      update({ cursos: [...data.cursos, { ...curso, id: uid(), activo: true }] });
    }
    setEditingCurso(null);
  };

  const toggleActivoCurso = (id) => {
    update({ cursos: data.cursos.map(c => c.id === id ? { ...c, activo: !c.activo } : c) });
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-stone-200 p-6 flex items-center justify-between">
        <div>
          <h2 className="font-semibold">Cursos y precios</h2>
          <p className="text-sm text-stone-500 mt-0.5">Los precios se guardan con vigencia: actualizar precios no modifica cuotas anteriores</p>
        </div>
        <button onClick={() => setEditingCurso({})} className="bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
          <Plus size={16} /> Curso
        </button>
      </div>

      <div className="space-y-3">
        {data.cursos.map(curso => {
          const hoy = today();
          const precioMensual = buscarPrecioVigente(data.preciosCuotas, curso.id, 'MENSUAL', hoy);
          return (
            <div key={curso.id} className={`bg-white rounded-2xl border border-stone-200 p-5 ${!curso.activo ? 'opacity-60' : ''}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{curso.nombre}</h3>
                  {!curso.activo && <span className="text-xs px-2 py-0.5 bg-stone-200 text-stone-600 rounded">Inactivo</span>}
                </div>
                <div className="flex gap-1">
                  <button onClick={() => setEditingCurso(curso)} className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg">
                    <Edit2 size={14} />
                  </button>
                  <button onClick={() => toggleActivoCurso(curso.id)} className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg" title={curso.activo ? 'Desactivar' : 'Activar'}>
                    {curso.activo ? <Trash2 size={14} /> : <Plus size={14} />}
                  </button>
                </div>
              </div>

              <div>
                <PrecioBox label="Cuota mensual" precio={precioMensual} />
                <div className="text-xs text-stone-400 mt-2 italic">El examen usa automáticamente el precio mensual vigente en diciembre.</div>
              </div>

              <div className="flex items-center gap-2 mt-3">
                <button
                  onClick={() => setEditingPriceFor(curso)}
                  className="text-sm text-emerald-700 hover:bg-emerald-50 px-3 py-1.5 rounded-lg flex items-center gap-1.5"
                >
                  <DollarSign size={14} /> Cambiar / agregar precio
                </button>
                <CursoAlumnosToggle curso={curso} data={data} />
              </div>

              <PrecioHistory data={data} cursoId={curso.id} onDelete={(precioId) => {
                update({ preciosCuotas: data.preciosCuotas.filter(p => p.id !== precioId) });
              }} />
            </div>
          );
        })}
      </div>

      {editingPriceFor && (
        <PriceEditorModal curso={editingPriceFor} data={data} onSave={guardarPrecios} onClose={() => setEditingPriceFor(null)} />
      )}
      {editingCurso && (
        <CursoFormModal curso={editingCurso.id ? editingCurso : null} onSave={guardarCurso} onClose={() => setEditingCurso(null)} />
      )}
    </div>
  );
}

function PrecioBox({ label, precio }) {
  if (!precio) return (
    <div className="border border-dashed border-stone-200 rounded-lg p-3 text-center text-stone-400 text-xs">
      {label}<br />Sin precio
    </div>
  );
  return (
    <div className="border border-stone-200 rounded-lg p-3">
      <div className="text-xs text-stone-500 uppercase tracking-wider">{label}</div>
      <div className="mt-1 space-y-0.5">
        <div className="text-sm">Ef: <span className="font-semibold">{fmtMoney(precio.efectivo)}</span></div>
        <div className="text-sm">Tr: <span className="font-semibold">{fmtMoney(precio.transferencia)}</span></div>
      </div>
    </div>
  );
}

function PrecioHistory({ data, cursoId, onDelete }) {
  const [open, setOpen] = useState(false);
  const historial = data.preciosCuotas
    .filter(p => p.cursoId === cursoId)
    .sort((a, b) => b.vigenciaDesde.localeCompare(a.vigenciaDesde));

  if (historial.length === 0) return null;

  // Agrupar por tipo y calcular hasta
  const porTipo = {};
  historial.forEach(p => {
    if (!porTipo[p.tipo]) porTipo[p.tipo] = [];
    porTipo[p.tipo].push(p);
  });

  // Para cada tipo, calcular hasta = vigenciaDesde del siguiente -1 día
  Object.keys(porTipo).forEach(tipo => {
    const arr = porTipo[tipo]; // ya están ordenados desc por vigenciaDesde
    arr.forEach((p, idx) => {
      if (idx === 0) {
        p._hasta = null; // el más reciente es "vigente"
      } else {
        // El "hasta" es el día antes de la próxima vigencia (el de la posición idx-1)
        const proximo = new Date(arr[idx - 1].vigenciaDesde + 'T00:00:00');
        proximo.setDate(proximo.getDate() - 1);
        p._hasta = proximo.toISOString().split('T')[0];
      }
    });
  });

  const fmtFecha = (f) => f ? new Date(f + 'T00:00:00').toLocaleDateString('es-AR') : '';
  const tipoLabel = { MENSUAL: 'Mensual', EXAMEN: 'Examen' };

  return (
    <div className="mt-3">
      <button onClick={() => setOpen(!open)} className="text-xs text-stone-500 hover:text-stone-800 flex items-center gap-1">
        <History size={12} /> {open ? 'Ocultar' : 'Ver'} historial de precios ({historial.length})
      </button>
      {open && (
        <div className="mt-2 border-t border-stone-100 pt-3 space-y-3">
          {Object.entries(porTipo).map(([tipo, arr]) => (
            <div key={tipo}>
              <div className="text-xs font-medium uppercase tracking-wider text-stone-500 mb-1.5">{tipoLabel[tipo]}</div>
              <div className="space-y-1">
                {arr.map((p, idx) => (
                  <div key={p.id} className={`text-xs flex items-center justify-between gap-2 px-2.5 py-1.5 rounded group ${idx === 0 ? 'bg-emerald-50/60' : 'bg-stone-50'}`}>
                    <span className="text-stone-700 flex-1 min-w-0">
                      {idx === 0 ? (
                        <><span className="text-emerald-700 font-medium">Vigente</span> desde {fmtFecha(p.vigenciaDesde)}</>
                      ) : (
                        <>Del {fmtFecha(p.vigenciaDesde)} al {fmtFecha(p._hasta)}</>
                      )}
                    </span>
                    <span className="text-stone-600 whitespace-nowrap">
                      Ef {fmtMoney(p.efectivo)} · Tr {fmtMoney(p.transferencia)}
                    </span>
                    {onDelete && (
                      <button
                        onClick={() => {
                          if (confirm(`¿Eliminar este precio? Si hay cuotas pagadas usando este precio, mantendrán el monto. Solo afecta cálculos futuros.`)) {
                            onDelete(p.id);
                          }
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded transition-opacity"
                        title="Eliminar precio"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CursoAlumnosToggle({ curso, data }) {
  const [open, setOpen] = useState(false);
  const alumnos = data.alumnos.filter(a => a.cursoId === curso.id && a.activo);
  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="text-sm text-stone-700 hover:bg-stone-100 px-3 py-1.5 rounded-lg flex items-center gap-1.5"
      >
        <Users size={14} /> {open ? 'Ocultar' : 'Ver'} alumnos · {alumnos.length}
      </button>
      {open && (
        <div className="basis-full mt-2 border-t border-stone-100 pt-3">
          {alumnos.length === 0 ? (
            <p className="text-sm text-stone-400 italic">No hay alumnos en este curso</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {alumnos
                .sort((a, b) => (a.apellido + a.nombre).localeCompare(b.apellido + b.nombre))
                .map(a => (
                  <div key={a.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-stone-50">
                    <Avatar alumno={a} size="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">{fullName(a)}</div>
                      <div className="text-xs text-stone-500 truncate">{a.horarioCurso || (a.dia ? `${a.dia} ${a.horario || ''}` : 'Sin horario')}</div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}

function PriceEditorModal({ curso, data, onSave, onClose }) {
  const hoy = today();
  const actual = {
    MENSUAL: buscarPrecioVigente(data.preciosCuotas, curso.id, 'MENSUAL', hoy)
  };
  const [precios, setPrecios] = useState({
    MENSUAL: { efectivo: actual.MENSUAL?.efectivo || 0, transferencia: actual.MENSUAL?.transferencia || 0 }
  });
  const [vigencia, setVigencia] = useState(today());

  const set = (tipo, campo, val) => setPrecios({ ...precios, [tipo]: { ...precios[tipo], [campo]: val } });

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full my-8">
        <div className="border-b border-stone-200 px-6 py-4 flex items-center justify-between">
          <h2 className="font-semibold">Cambiar / agregar precio — {curso.nombre}</h2>
          <button onClick={onClose}><X size={20} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-xs text-emerald-900 space-y-1.5">
            <div className="flex gap-2">
              <Calendar size={14} className="shrink-0 mt-0.5" />
              <div>
                <strong>Vigencia desde:</strong> es la fecha en la que entra en vigor este precio. Podés poner:
                <ul className="mt-1 ml-3 list-disc space-y-0.5">
                  <li><strong>Fecha pasada</strong> → para cargar precios históricos (ej: precio que estuvo vigente en marzo)</li>
                  <li><strong>Hoy</strong> → cambio inmediato</li>
                  <li><strong>Fecha futura</strong> → programar un aumento</li>
                </ul>
                El "hasta" se calcula solo según el siguiente precio que cargues.
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs text-stone-500 font-medium uppercase tracking-wider">Vigencia desde</label>
            <input type="date" value={vigencia} onChange={e => setVigencia(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-lg border border-stone-200 bg-white" />
          </div>

          {[
            { k: 'MENSUAL', label: 'Cuota mensual' }
          ].map(({ k, label }) => (
            <div key={k} className="border border-stone-200 rounded-xl p-4">
              <div className="text-sm font-medium mb-2">{label}</div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-stone-500">Efectivo</label>
                  <input type="number" value={precios[k].efectivo} onChange={e => set(k, 'efectivo', e.target.value)} className="w-full mt-1 px-3 py-2 rounded-lg border border-stone-200 text-sm" />
                </div>
                <div>
                  <label className="text-xs text-stone-500">Transferencia / MP</label>
                  <input type="number" value={precios[k].transferencia} onChange={e => set(k, 'transferencia', e.target.value)} className="w-full mt-1 px-3 py-2 rounded-lg border border-stone-200 text-sm" />
                </div>
              </div>
            </div>
          ))}

          <div className="flex gap-2 pt-2">
            <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-lg border border-stone-200 hover:bg-stone-50 font-medium text-sm">Cancelar</button>
            <button onClick={() => onSave(curso.id, precios, vigencia)} className="flex-1 px-4 py-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-medium text-sm">Guardar</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CursoFormModal({ curso, onSave, onClose }) {
  const [nombre, setNombre] = useState(curso?.nombre || '');
  const [horarios, setHorarios] = useState(curso?.horarios || []);
  const [nuevoHorario, setNuevoHorario] = useState('');
  const [mesesExcluidos, setMesesExcluidos] = useState(curso?.mesesExcluidos || []);

  const toggleMes = (periodoId) => {
    setMesesExcluidos(prev =>
      prev.includes(periodoId) ? prev.filter(m => m !== periodoId) : [...prev, periodoId]
    );
  };

  const agregarHorario = () => {
    if (nuevoHorario.trim() && !horarios.includes(nuevoHorario.trim())) {
      setHorarios([...horarios, nuevoHorario.trim()]);
      setNuevoHorario('');
    }
  };

  const quitarHorario = (h) => {
    setHorarios(horarios.filter(x => x !== h));
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-md w-full my-8">
        <div className="border-b border-stone-200 px-6 py-4 flex items-center justify-between">
          <h2 className="font-semibold">{curso ? 'Editar curso' : 'Nuevo curso'}</h2>
          <button onClick={onClose}><X size={20} /></button>
        </div>
        <div className="p-6 space-y-4">
          <Field label="Nombre del curso" value={nombre} onChange={setNombre} hint="Ej: 1st Form, FCE, Adultos Avanzado" />

          <div>
            <label className="text-xs text-stone-500 font-medium uppercase tracking-wider">Horarios disponibles</label>
            <p className="text-xs text-stone-400 mt-0.5 mb-2">Cargá los días/horarios en los que se dicta este curso. Después al cargar un alumno, podrás elegir uno.</p>

            <div className="space-y-1.5 mb-2">
              {horarios.length === 0 ? (
                <div className="text-xs text-stone-400 italic py-2">Sin horarios cargados</div>
              ) : (
                horarios.map(h => (
                  <div key={h} className="flex items-center gap-2 bg-stone-50 rounded-lg px-3 py-2">
                    <Calendar size={14} className="text-stone-400 shrink-0" />
                    <span className="text-sm flex-1">{h}</span>
                    <button onClick={() => quitarHorario(h)} className="p-1 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded">
                      <X size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={nuevoHorario}
                onChange={e => setNuevoHorario(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), agregarHorario())}
                placeholder="Ej: Lunes y Miércoles · 18:00 a 19:30"
                className="flex-1 px-3 py-2 rounded-lg border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
              <button onClick={agregarHorario} disabled={!nuevoHorario.trim()} className="px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-sm disabled:opacity-50">
                <Plus size={16} />
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs text-stone-500 font-medium uppercase tracking-wider">Meses que no pagan (excluidos)</label>
            <p className="text-xs text-stone-400 mt-0.5 mb-2">Tildá los meses que este curso no abona. No aparecerán en la grilla de pagos ni en la vista de deudores.</p>
            <div className="grid grid-cols-6 gap-1.5">
              {PERIODOS.map(p => {
                const excl = mesesExcluidos.includes(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => toggleMes(p.id)}
                    className={`py-2 px-1 rounded-lg border text-xs font-medium transition-colors ${
                      excl
                        ? 'bg-stone-200 text-stone-500 border-stone-300'
                        : 'bg-white text-stone-700 border-stone-200 hover:border-emerald-300'
                    }`}
                  >
                    {excl ? '✕' : '✓'} {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex gap-2 pt-4 border-t border-stone-200">
            <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-lg border border-stone-200 hover:bg-stone-50 font-medium text-sm">Cancelar</button>
            <button
              onClick={() => onSave({ ...(curso || {}), nombre, horarios, mesesExcluidos })}
              disabled={!nombre.trim()}
              className="flex-1 px-4 py-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-medium text-sm disabled:opacity-50"
            >
              Guardar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// CONFIG TAB
// ============================================================
function ConfigTab({ data, update }) {
  const [config, setConfig] = useState(data.configuracion);
  const [saved, setSaved] = useState(false);
  const [showAddMatricula, setShowAddMatricula] = useState(false);

  const set = (k, v) => setConfig({ ...config, [k]: v });

  const matriculasOrdenadas = [...(config.matriculas || [])].sort((a, b) => b.vigenciaDesde.localeCompare(a.vigenciaDesde));

  const addMatricula = (m) => {
    const matriculas = [...(config.matriculas || []), { ...m, id: uid() }];
    setConfig({ ...config, matriculas });
    update({ configuracion: { ...data.configuracion, matriculas } });
    setShowAddMatricula(false);
  };

  const deleteMatricula = (id) => {
    if (!confirm('¿Eliminar este registro de matrícula? Asegurate de que no esté siendo usado por pagos anteriores.')) return;
    const matriculas = config.matriculas.filter(m => m.id !== id);
    setConfig({ ...config, matriculas });
    update({ configuracion: { ...data.configuracion, matriculas } });
  };

  const save = () => {
    update({ configuracion: config });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const exportar = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ibo-backup-${today()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importar = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const imported = JSON.parse(ev.target.result);
        if (confirm('Esto reemplazará todos los datos actuales. ¿Continuar?')) {
          update(imported);
        }
      } catch (err) {
        alert('Archivo inválido');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-5">
        <h2 className="font-semibold">General</h2>
        <Field label="Nombre del instituto" value={config.nombreInstituto} onChange={v => set('nombreInstituto', v)} />

        <div>
          <label className="text-xs text-stone-500 font-medium uppercase tracking-wider">Plantilla de mensaje WhatsApp</label>
          <textarea
            value={config.plantillaWhatsApp}
            onChange={e => set('plantillaWhatsApp', e.target.value)}
            rows={3}
            className="w-full mt-1 px-3 py-2 rounded-lg border border-stone-200 text-sm"
          />
          <p className="text-xs text-stone-400 mt-1">
            Variables: <code className="bg-stone-100 px-1 rounded">{'{nombre}'}</code> <code className="bg-stone-100 px-1 rounded">{'{periodos}'}</code> <code className="bg-stone-100 px-1 rounded">{'{instituto}'}</code> <code className="bg-stone-100 px-1 rounded">{'{total}'}</code> <code className="bg-stone-100 px-1 rounded">{'{medio}'}</code>
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold">Matrícula (inscripción)</h2>
            <p className="text-sm text-stone-500 mt-0.5">Valor único para todos los cursos. Se aplica al período "Insc". Cada nueva vigencia conserva las anteriores.</p>
          </div>
          <button
            onClick={() => setShowAddMatricula(true)}
            className="bg-emerald-700 hover:bg-emerald-800 text-white px-3 py-1.5 rounded-lg text-sm flex items-center gap-1.5"
          >
            <Plus size={14} /> Nueva
          </button>
        </div>

        {matriculasOrdenadas.length === 0 ? (
          <div className="border border-dashed border-stone-200 rounded-lg p-6 text-center text-stone-400 text-sm">
            Sin matrícula configurada. Hacé click en "Nueva" para definir el valor.
          </div>
        ) : (
          <div className="space-y-2">
            {matriculasOrdenadas.map((m, idx) => {
              const vigente = idx === 0 && m.vigenciaDesde <= today();
              return (
                <div key={m.id} className={`border rounded-lg p-3 flex items-center gap-3 ${vigente ? 'border-emerald-300 bg-emerald-50/40' : 'border-stone-200'}`}>
                  <div className="flex-1">
                    <div className="text-xs font-medium uppercase tracking-wider text-stone-500">
                      {vigente ? <span className="text-emerald-700">Vigente</span> : (m.vigenciaDesde > today() ? <span className="text-amber-700">Programada</span> : 'Anterior')}
                    </div>
                    <div className="text-sm">Desde {m.vigenciaDesde}</div>
                  </div>
                  <div className="text-sm text-right">
                    <div>Ef: <strong>{fmtMoney(m.efectivo)}</strong></div>
                    <div>Tr: <strong>{fmtMoney(m.transferencia)}</strong></div>
                  </div>
                  <button onClick={() => deleteMatricula(m.id)} className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-5">
        <h2 className="font-semibold">Recargos</h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-stone-500 font-medium uppercase tracking-wider">Recargo del 16 al fin de mes (%)</label>
            <input type="number" value={config.recargoSegundaQuincenaPorcentaje} onChange={e => set('recargoSegundaQuincenaPorcentaje', Number(e.target.value))} className="w-full mt-1 px-3 py-2 rounded-lg border border-stone-200 text-sm" />
            <p className="text-xs text-stone-400 mt-1">Se aplica a efectivo y transferencia</p>
          </div>
          <div>
            <label className="text-xs text-stone-500 font-medium uppercase tracking-wider">Recargo mes vencido (%)</label>
            <input type="number" value={config.recargoMesVencidoPorcentaje} onChange={e => set('recargoMesVencidoPorcentaje', Number(e.target.value))} className="w-full mt-1 px-3 py-2 rounded-lg border border-stone-200 text-sm" />
            <p className="text-xs text-stone-400 mt-1">Sobre precio de transferencia, aplica a cualquier medio de pago</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold">Descuentos por hermanos</h2>
            <p className="text-sm text-stone-500 mt-0.5">Definí qué porcentaje de descuento se aplica según la posición del hermano (ordenados automáticamente de cuota más cara a más barata).</p>
          </div>
          <button
            onClick={() => {
              const ultima = (config.descuentosHermanos || []).reduce((max, d) => Math.max(max, d.posicion), 0);
              const nuevo = [...(config.descuentosHermanos || []), { posicion: ultima + 1, porcentaje: 0 }];
              setConfig({ ...config, descuentosHermanos: nuevo });
            }}
            className="bg-emerald-700 hover:bg-emerald-800 text-white px-3 py-1.5 rounded-lg text-sm flex items-center gap-1.5"
          >
            <Plus size={14} /> Agregar
          </button>
        </div>

        {(config.descuentosHermanos || []).length === 0 ? (
          <div className="border border-dashed border-stone-200 rounded-lg p-6 text-center text-stone-400 text-sm">
            Sin descuentos por hermano. Hacé click en "Agregar" para crear uno.
          </div>
        ) : (
          <div className="space-y-2">
            {[...(config.descuentosHermanos || [])].sort((a, b) => a.posicion - b.posicion).map((d, idx, arr) => {
              const realIdx = (config.descuentosHermanos || []).findIndex(x => x === d);
              return (
                <div key={realIdx} className="flex items-center gap-3 p-3 border border-stone-200 rounded-lg">
                  <div className="flex-1 grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-stone-500">Posición del hermano</label>
                      <input
                        type="number"
                        min="1"
                        value={d.posicion}
                        onChange={e => {
                          const newArr = [...config.descuentosHermanos];
                          newArr[realIdx] = { ...d, posicion: Number(e.target.value) || 1 };
                          setConfig({ ...config, descuentosHermanos: newArr });
                        }}
                        className="w-full mt-1 px-3 py-2 rounded-lg border border-stone-200 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-stone-500">% de descuento</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={d.porcentaje}
                        onChange={e => {
                          const newArr = [...config.descuentosHermanos];
                          newArr[realIdx] = { ...d, porcentaje: Number(e.target.value) || 0 };
                          setConfig({ ...config, descuentosHermanos: newArr });
                        }}
                        className="w-full mt-1 px-3 py-2 rounded-lg border border-stone-200 text-sm"
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      const newArr = config.descuentosHermanos.filter((_, i) => i !== realIdx);
                      setConfig({ ...config, descuentosHermanos: newArr });
                    }}
                    className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <div className="bg-stone-50 rounded-lg p-3 text-xs text-stone-600">
          <strong>Cómo funciona:</strong> los hermanos se ordenan automáticamente de cuota más cara a más barata. La posición 1 es quien paga más (sin descuento), y el más barato ocupa la última posición y recibe el mayor descuento. Recordá hacer click en <strong>Guardar configuración</strong> al final.
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-3">
        <h2 className="font-semibold">Backup de datos</h2>
        <p className="text-sm text-stone-500">Exportá tus datos como respaldo o para mover a otra computadora.</p>
        <div className="flex gap-2">
          <button onClick={exportar} className="px-4 py-2 rounded-lg border border-stone-200 hover:bg-stone-50 text-sm flex items-center gap-2">
            <Download size={14} /> Exportar JSON
          </button>
          <label className="px-4 py-2 rounded-lg border border-stone-200 hover:bg-stone-50 text-sm flex items-center gap-2 cursor-pointer">
            <Upload size={14} /> Importar JSON
            <input type="file" accept=".json" onChange={importar} className="hidden" />
          </label>
        </div>
      </div>

      <div className="sticky bottom-4 flex justify-end">
        <button onClick={save} className="bg-emerald-700 hover:bg-emerald-800 text-white px-6 py-2.5 rounded-lg font-medium text-sm shadow-lg">
          {saved ? '✓ Guardado' : 'Guardar configuración'}
        </button>
      </div>

      {showAddMatricula && (
        <MatriculaFormModal
          onSave={addMatricula}
          onClose={() => setShowAddMatricula(false)}
        />
      )}
    </div>
  );
}

// ============================================================
// DEUDORES VIEW
// ============================================================
function DeudoresView({ data }) {
  const mensualPeriodos = PERIODOS.filter(p => p.tipo === 'MENSUAL');
  const mesActual = new Date().getMonth() + 1;
  const defaultPeriodo = mensualPeriodos.find(p => p.mes === mesActual)?.id || mensualPeriodos[0]?.id;

  const [periodo, setPeriodo] = useState(defaultPeriodo);
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [cursoFiltro, setCursoFiltro] = useState('todos');
  const [plantilla, setPlantilla] = useState(
    'Hola {nombre}, te queríamos recordar que se adeuda {mes} en {instituto}. Cualquier consulta no dudes en escribirnos!'
  );
  const [enviados, setEnviados] = useState(new Set());

  const periodoObj = PERIODOS.find(p => p.id === periodo);

  const cursosDisponibles = useMemo(() =>
    data.cursos
      .filter(c => c.activo && !(c.mesesExcluidos || []).includes(periodo))
      .sort((a, b) => a.nombre.localeCompare(b.nombre)),
    [data.cursos, periodo]
  );

  const deudoresPorCurso = useMemo(() => {
    return cursosDisponibles
      .filter(c => cursoFiltro === 'todos' || c.id === cursoFiltro)
      .map(curso => {
        const alumnos = data.alumnos
          .filter(a => a.activo && a.cursoId === curso.id)
          .filter(a => !esCuotaAnulada(a, periodo, anio))
          .filter(a => obtenerEstadoCuota(data.pagos, a.id, periodo, anio).estado === 'pendiente')
          .sort((a, b) => (a.apellido + a.nombre).localeCompare(b.apellido + b.nombre));
        return { curso, alumnos };
      })
      .filter(({ alumnos }) => alumnos.length > 0);
  }, [data, periodo, anio, cursoFiltro, cursosDisponibles]);

  const totalDeudores = deudoresPorCurso.reduce((s, { alumnos }) => s + alumnos.length, 0);

  const generarMensaje = (alumno) =>
    plantilla
      .replace('{nombre}', alumno.nombre)
      .replace('{mes}', `${periodoObj?.full || ''} ${anio}`)
      .replace('{instituto}', data.configuracion.nombreInstituto);

  const enviar = (alumno) => {
    const phone = formatPhoneForWA(alumno.celular);
    if (!phone) { alert(`${alumno.nombre} no tiene celular cargado.`); return; }
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(generarMensaje(alumno))}`, '_blank');
    setEnviados(prev => new Set([...prev, `${alumno.id}-${periodo}-${anio}`]));
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="font-semibold">Deudores por período</h2>
            <p className="text-sm text-stone-500 mt-0.5">Alumnos sin pago registrado para el mes seleccionado</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={periodo}
              onChange={e => { setPeriodo(e.target.value); setEnviados(new Set()); setCursoFiltro('todos'); }}
              className="px-3 py-2 rounded-lg border border-stone-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            >
              {mensualPeriodos.map(p => <option key={p.id} value={p.id}>{p.full}</option>)}
            </select>
            <select
              value={anio}
              onChange={e => { setAnio(Number(e.target.value)); setEnviados(new Set()); }}
              className="px-3 py-2 rounded-lg border border-stone-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            >
              {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <select
              value={cursoFiltro}
              onChange={e => { setCursoFiltro(e.target.value); setEnviados(new Set()); }}
              className="px-3 py-2 rounded-lg border border-stone-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            >
              <option value="todos">Todos los cursos</option>
              {cursosDisponibles.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>
        </div>

        {totalDeudores > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 text-amber-800 text-sm font-medium">
            {totalDeudores} alumno{totalDeudores !== 1 ? 's' : ''} sin pago en {periodoObj?.full} {anio}
          </div>
        )}

        <div>
          <label className="text-xs text-stone-500 font-medium uppercase tracking-wider">Mensaje de recordatorio</label>
          <textarea
            value={plantilla}
            onChange={e => setPlantilla(e.target.value)}
            rows={2}
            className="w-full mt-1 px-3 py-2 rounded-lg border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />
          <p className="text-xs text-stone-400 mt-1">
            Variables: <code className="bg-stone-100 px-1 rounded">{'{nombre}'}</code>{' '}
            <code className="bg-stone-100 px-1 rounded">{'{mes}'}</code>{' '}
            <code className="bg-stone-100 px-1 rounded">{'{instituto}'}</code>
          </p>
        </div>
      </div>

      {totalDeudores === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center text-stone-400">
          <Check size={32} className="mx-auto mb-3 text-emerald-500 opacity-60" />
          <p className="text-sm">No hay deudores para {periodoObj?.full} {anio}</p>
        </div>
      ) : (
        deudoresPorCurso.map(({ curso, alumnos }) => (
          <div key={curso.id} className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-stone-100 bg-stone-50/60 flex items-center gap-3">
              <BookOpen size={16} className="text-stone-400" />
              <span className="font-semibold text-stone-900">{curso.nombre}</span>
              <span className="text-xs text-stone-500 bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                {alumnos.length} sin pagar
              </span>
            </div>
            <div className="divide-y divide-stone-100">
              {alumnos.map(a => {
                const enviado = enviados.has(`${a.id}-${periodo}-${anio}`);
                return (
                  <div key={a.id} className={`flex items-center gap-3 px-5 py-3 ${enviado ? 'bg-emerald-50/40' : 'hover:bg-stone-50'}`}>
                    <Avatar alumno={a} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-stone-900">{fullName(a)}</div>
                      <div className="text-xs text-stone-500">{a.celular || 'Sin celular'}</div>
                    </div>
                    {a.celular ? (
                      <button
                        onClick={() => enviar(a)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap ${
                          enviado
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-emerald-700 hover:bg-emerald-800 text-white'
                        }`}
                      >
                        <MessageCircle size={14} />
                        {enviado ? 'Enviado' : 'Recordar'}
                      </button>
                    ) : (
                      <span className="text-xs text-stone-400 px-3 py-1.5 border border-dashed border-stone-200 rounded-lg">Sin celular</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function MatriculaFormModal({ onSave, onClose }) {
  const [efectivo, setEfectivo] = useState('');
  const [transferencia, setTransferencia] = useState('');
  const [vigenciaDesde, setVigenciaDesde] = useState(today());
  const valido = efectivo && transferencia && vigenciaDesde;
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full">
        <div className="border-b border-stone-200 px-6 py-4 flex items-center justify-between">
          <h2 className="font-semibold">Nueva matrícula</h2>
          <button onClick={onClose}><X size={20} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-xs text-emerald-900 flex gap-2">
            <Calendar size={14} className="shrink-0 mt-0.5" />
            <div>
              Podés poner una fecha pasada para cargar matrículas históricas, hoy para un cambio inmediato, o futura para programar un aumento. Las matrículas anteriores se conservan automáticamente.
            </div>
          </div>
          <div>
            <label className="text-xs text-stone-500 font-medium uppercase tracking-wider">Vigencia desde</label>
            <input type="date" value={vigenciaDesde} onChange={e => setVigenciaDesde(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-lg border border-stone-200 bg-white" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-stone-500 font-medium uppercase tracking-wider">Efectivo</label>
              <input type="number" value={efectivo} onChange={e => setEfectivo(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-lg border border-stone-200 text-sm" />
            </div>
            <div>
              <label className="text-xs text-stone-500 font-medium uppercase tracking-wider">Transferencia / MP</label>
              <input type="number" value={transferencia} onChange={e => setTransferencia(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-lg border border-stone-200 text-sm" />
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-lg border border-stone-200 hover:bg-stone-50 font-medium text-sm">Cancelar</button>
            <button
              onClick={() => onSave({ efectivo: Number(efectivo), transferencia: Number(transferencia), vigenciaDesde })}
              disabled={!valido}
              className="flex-1 px-4 py-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-medium text-sm disabled:opacity-50"
            >
              Guardar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
