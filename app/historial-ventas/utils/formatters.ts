import { es } from 'date-fns/locale';
import { format } from 'date-fns';

export const formatMetodoPago = (metodo: string): string => {
  const metodos: Record<string, string> = {
    efectivo: 'Efectivo',
    debito: 'Débito',
    credito: 'Crédito',
    transferencia: 'Transferencia'
  };
  return metodos[metodo] || metodo;
};

export const formatTipoEnvio = (tipo: string | null): string => {
  if (!tipo) return '';
  const tipos: Record<string, string> = {
    cercano: 'Cercano',
    lejano: 'Lejano',
    la_banda: 'La Banda (+$800)',
    gratis: 'Gratis'
  };
  return tipos[tipo] || tipo;
};

export const formatNumeroPedido = (numero: string): string => {
  const parts = numero.split('-');
  return parts.length === 4 ? `${parts[2]}/${parts[1]}-${parts[3]}` : numero;
};

export const formatPrecio = (precio: number | string): string => {
  const numero = typeof precio === 'string' ? parseFloat(precio) : precio;
  return isNaN(numero) ? '$0.00' : `$${numero.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
};

export const formatCantidadPollo = (cantidad: number): string => {
    // Asegurarnos que es un número válido (protección adicional)
    const num = Number(cantidad);
    if (isNaN(num)) return '0'; // Manejo de casos inválidos
    
    // Formatear según si es entero o decimal
    if (num % 1 === 0) {
      return num.toFixed(0); // Enteros: "2"
    } else {
      // Decimales: "1.5" (elimina ceros sobrantes)
      return num.toString()
        .replace(/(\.\d*?[1-9])0+$/, '$1') // Elimina ceros finales
        .replace(/\.$/, ''); // Elimina punto si quedó solo
    }
  };
export const formatHora = (hora: string | null): string => {
  return hora ? hora.slice(0, 5) : 'No especificada'; // Más eficiente que split+join
};

export const formatFecha = (fecha: Date): string => {
  return format(fecha, 'EEEE, d MMMM yyyy', { locale: es });
};