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

export const formatCantidadPollo = (cantidad?: number): string => {
  // Si no hay cantidad (porque ahora viene de items), retornar vacío
  if (cantidad === undefined || cantidad === null) return '';

  // Asegurarnos que es un número válido
  const num = Number(cantidad);
  if (isNaN(num)) return '';

  // Formatear según si es entero o decimal
  if (num % 1 === 0) {
    return num.toFixed(0);
  } else {
    return num.toString()
      .replace(/(\.\d*?[1-9])0+$/, '$1')
      .replace(/\.$/, '');
  }
};

export const formatHora = (hora: string | null): string => {
  return hora ? hora.slice(0, 5) : 'No especificada';
};

export const formatFecha = (fecha: Date): string => {
  return format(fecha, 'EEEE, d MMMM yyyy', { locale: es });
};

// FUNCIONES PARA LA ESTRUCTURA CON ITEMS
export const calcularTotalProductos = (items: any[]): number => {
  if (!items || !Array.isArray(items)) return 0;
  return items.reduce((total, item) => total + (parseFloat(item.cantidad) || 0), 0);
};

export const calcularCantidadPollo = (items: any[]): number => {
  if (!items || !Array.isArray(items)) return 0;
  const polloItems = items.filter(item =>
    item.producto_nombre?.toLowerCase().includes('pollo')
  );
  return polloItems.reduce((total, item) => total + (parseFloat(item.cantidad) || 0), 0);
};

export const calcularCantidadPapas = (items: any[]): number => {
  if (!items || !Array.isArray(items)) return 0;
  const papasItems = items.filter(item =>
    item.producto_nombre?.toLowerCase().includes('papa') ||
    item.producto_nombre?.toLowerCase().includes('papas')
  );
  return papasItems.reduce((total, item) => total + (parseFloat(item.cantidad) || 0), 0);
};

export const tienePapas = (items: any[]): boolean => {
  return calcularCantidadPapas(items) > 0;
};

// Función para obtener un resumen completo de productos
export const obtenerResumenProductos = (items: any[]) => {
  if (!items || !Array.isArray(items)) {
    return { productos: [] };
  }

  const productosAgrupados: Record<string, {
    cantidad: number,
    tipo_medida: string,
    producto_id: number
  }> = {};

  items.forEach(item => {
    const nombre = item.producto_nombre || 'Producto sin nombre';
    const cantidad = parseFloat(item.cantidad) || 0;
    const tipo_medida = item.tipo_medida || 'unidad';
    const producto_id = item.producto_id;

    // Agrupar por nombre + tipo_medida para mantener la medida correcta
    const clave = `${nombre}-${tipo_medida}`;

    if (productosAgrupados[clave]) {
      productosAgrupados[clave].cantidad += cantidad;
    } else {
      productosAgrupados[clave] = {
        cantidad,
        tipo_medida,
        producto_id
      };
    }
  });

  // Convertir el objeto a array
  const productos = Object.entries(productosAgrupados).map(([clave, datos]) => ({
    nombre: clave.split('-')[0], // Extraer solo el nombre
    cantidad: datos.cantidad,
    tipo_medida: datos.tipo_medida,
    producto_id: datos.producto_id,
    id: `${datos.producto_id}-${clave}` // ID único para React
  }));

  return { productos };
};

// Actualiza esta función en utils/formatters.ts
export const formatearCantidadConMedida = (cantidad: number, tipoMedida: string, productoNombre?: string): string => {
  const cant = Number(cantidad);
  if (isNaN(cant)) return '0';

  const esEmpanada = productoNombre?.toLowerCase().includes('empanada');

  // Para empanadas, hacer conversiones especiales
  if (esEmpanada) {
    // Si está en docenas
    if (tipoMedida === 'docena') {
      if (cant === 1) return '1 docena';
      if (cant === 0.5) return '1/2 docena';
      if (cant === 1.5) return '1 docena y 1/2';
      if (cant === 2) return '2 docenas';
      if (cant === 2.5) return '2 docenas y 1/2';
      if (cant === 3) return '3 docenas';
      if (cant > 1 && cant % 1 === 0) return `${cant} docenas`;
      if (cant > 1) return `${cant} docenas`;
      return `${cant} docena`;
    }

    // Si está en unidades, convertir a docenas cuando sea posible
    if (tipoMedida === 'unidad') {
      if (cant === 12) return '1 docena';
      if (cant === 6) return '1/2 docena';
      if (cant === 18) return '1 docena y 1/2';
      if (cant === 24) return '2 docenas';
      if (cant === 30) return '2 docenas y 1/2';
      if (cant === 36) return '3 docenas';
      if (cant >= 12 && cant % 12 === 0) return `${cant / 12} docenas`;
      if (cant >= 12) {
        const docenas = Math.floor(cant / 12);
        const unidades = cant % 12;
        if (unidades === 0) return `${docenas} docenas`;
        return `${docenas} docena${docenas > 1 ? 's' : ''} y ${unidades} unidad${unidades > 1 ? 'es' : ''}`;
      }
      return `${cant} unidad${cant > 1 ? 'es' : ''}`;
    }
  }

  // Para otros productos, usar la lógica normal
  switch (tipoMedida) {
    case 'kilo':
    case 'kg':
      return `${cant} kg`;

    case 'gramo':
      return `${cant} gr`;

    case 'unidad':
      return `${cant} unidad${cant > 1 ? 'es' : ''}`;

    case 'porcion':
      return `${cant} porción${cant > 1 ? 'es' : ''}`;

    case 'litro':
      return `${cant} litro${cant > 1 ? 's' : ''}`;

    case 'docena':
      return `${cant} docena${cant > 1 ? 's' : ''}`;

    default:
      return `${cant} ${tipoMedida || 'unidad'}`;
  }
};
// Función para obtener el ícono según el tipo de producto
// En formatters.ts - actualiza la función
export const obtenerIconoProducto = (
  nombre: string,
  tipoMedida?: string,
  productoId?: number  // Agregar este parámetro opcional
): string => {
  const nombreLower = nombre.toLowerCase();

  // PRIMERO verificar si es empanada (tiene prioridad)
  if (nombreLower.includes('empanada')) {
    return '🥟'; // Icono específico para empanadas
  }

  // MILANESAS (agregado después de empanadas)
  if (nombreLower.includes('milanesa')) {
    if (nombreLower.includes('napolitana')) {
      return '🧀'; // Milanesa napolitana - icono de queso
    } else if (nombreLower.includes('pollo')) {
      return '🍗'; // Milanesa de pollo - icono de muslo de pollo
    } else {
      return '🍖'; // Milanesa de carne - icono de carne
    }
  }

  // POLLO - CAMBIADO A POLLO ASADO/LISTO PARA COMER
  if (nombreLower.includes('pollo')) {
    return '🍗'; // Icono de pollo asado/muslo listo para comer
  }

  if (nombreLower.includes('papa') || nombreLower.includes('papas')) {
    return '🍟'; // Icono de papas fritas
  }

  if (nombreLower.includes('bebida') || nombreLower.includes('gaseosa') || nombreLower.includes('coca')) {
    return '🥤'; // Icono de bebida
  }

  if (nombreLower.includes('postre') || nombreLower.includes('dulce') || nombreLower.includes('helado')) {
    return '🍰'; // Icono de postre
  }

  if (nombreLower.includes('salsa') || nombreLower.includes('chimichurri') || nombreLower.includes('aderezo')) {
    return '🧂'; // Icono de salsa
  }

  if (nombreLower.includes('ensalada') || nombreLower.includes('verdura')) {
    return '🥗'; // Icono de ensalada
  }

  if (nombreLower.includes('hamburguesa')) {
    return '🍔'; // Icono de hamburguesa
  }

  if (nombreLower.includes('pizza')) {
    return '🍕'; // Icono de pizza
  }

  if (nombreLower.includes('pan') || nombreLower.includes('sandwich')) {
    return '🥪'; // Icono de sándwich
  }

  // Si no coincide con nombres, usar tipo de medida como fallback
  if (tipoMedida === 'kilo' || tipoMedida === 'kg') {
    return '⚖️'; // Icono de balanza
  }

  if (tipoMedida === 'litro') {
    return '💧'; // Icono de líquido
  }

  if (tipoMedida === 'docena') {
    return '📦'; // Icono de paquete
  }

  // Icono por defecto
  return '📦';
};

// Función para formatear la cantidad según el tipo de producto (legacy - mantener compatibilidad)
export const formatearCantidadProducto = (nombre: string, cantidad: number): string => {
  const nombreLower = nombre.toLowerCase();

  if (nombreLower.includes('empanada')) {
    if (cantidad === 12) return '1 docena';
    if (cantidad === 6) return '1/2 docena';
    if (cantidad === 24) return '2 docenas';
    if (cantidad === 36) return '3 docenas';
    return `${cantidad} unidades`;
  }

  if (nombreLower.includes('papa') || nombreLower.includes('papas')) {
    return `${cantidad} porción${cantidad > 1 ? 'es' : ''}`;
  }

  return `${cantidad} unidad${cantidad > 1 ? 'es' : ''}`;
};

// Función para debug - mostrar información detallada de los productos
export const debugProductos = (items: any[]) => {
  console.log('🔍 DEBUG Productos:', {
    itemsCount: items?.length || 0,
    items: items?.map(item => ({
      nombre: item.producto_nombre,
      cantidad: item.cantidad,
      tipo_medida: item.tipo_medida,
      producto_id: item.producto_id
    }))
  });

  const { productos } = obtenerResumenProductos(items || []);
  console.log('📦 Productos agrupados:', productos);

  return productos;
};