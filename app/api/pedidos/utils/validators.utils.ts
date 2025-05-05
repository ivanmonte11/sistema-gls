export function validarPedido(data: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    const requiredFields = [
      'nombre', 'tipoEntrega', 'metodoPago', 
      'cantidadPollo', 'precioUnitario', 'horaEntrega'
    ];
  
    // Validar campos requeridos
    requiredFields.forEach(field => {
      if (!data[field]) {
        errors.push(`El campo ${field} es requerido`);
      }
    });
  
    // Validar cantidad de pollo
    if (data.cantidadPollo && (data.cantidadPollo <= 0 || data.cantidadPollo % 0.5 !== 0)) {
      errors.push('La cantidad debe ser mayor a 0 y múltiplo de 0.5 (ej: 0.5, 1, 1.5)');
    }
  
    return {
      isValid: errors.length === 0,
      errors
    };
  }
  
  export function validarActualizacionEstado(data: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    const estadosValidos = ['pendiente', 'preparando', 'en_camino', 'entregado', 'cancelado'];
  
    if (!data.id) {
      errors.push('El ID del pedido es requerido');
    }
  
    if (!data.estado) {
      errors.push('El estado es requerido');
    } else if (!estadosValidos.includes(data.estado)) {
      errors.push('Estado no válido');
    }
  
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // ... (validadores existentes para pedidos)

export function validarActualizacionStock(data: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!data.producto) {
    errors.push('El producto es requerido');
  }

  if (data.cantidad === undefined || data.cantidad === null) {
    errors.push('La cantidad es requerida');
  } else if (isNaN(parseFloat(data.cantidad))) {
    errors.push('La cantidad debe ser un número válido');
  } else if (parseFloat(data.cantidad) < 0) {
    errors.push('La cantidad no puede ser negativa');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

export function validarCantidadPollo(cantidad: number): { isValid: boolean; error?: string } {
  if (cantidad <= 0) {
    return { isValid: false, error: 'La cantidad debe ser mayor a 0' };
  }
  
  if (cantidad % 0.5 !== 0) {
    return { isValid: false, error: 'La cantidad debe ser múltiplo de 0.5 (ej: 0.5, 1, 1.5)' };
  }

  return { isValid: true };
}