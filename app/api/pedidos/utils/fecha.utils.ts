// Solo declaramos una vez la constante TIMEZONE
export const TIMEZONE = 'America/Argentina/Buenos_Aires';

export function formatearFechaLocal(fecha: Date): string {
  const opciones = { timeZone: TIMEZONE };
  
  const dia = fecha.toLocaleDateString('es-AR', { ...opciones, day: '2-digit' });
  const mes = fecha.toLocaleDateString('es-AR', { ...opciones, month: '2-digit' });
  const año = fecha.toLocaleDateString('es-AR', { ...opciones, year: 'numeric' });
  
  return `${dia}-${mes}-${año}`;
}

export function formatearHoraLocal(fecha: Date): string {
  return fecha.toLocaleTimeString('es-AR', { 
    timeZone: TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
}

export function obtenerFechaHoraLocal() {
  const ahora = new Date();
  return {
    fecha: ahora.toLocaleDateString('es-AR', { timeZone: TIMEZONE }),
    hora: formatearHoraLocal(ahora)
  };
}
