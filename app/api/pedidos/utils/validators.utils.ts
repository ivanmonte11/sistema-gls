export function validarPedido(data: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Campos requeridos básicos
  const requiredFields = [
    'nombre', 'tipoEntrega', 'metodoPago', 'horaEntrega'
  ];

  // Validar campos requeridos
  requiredFields.forEach(field => {
    if (!data[field]) {
      errors.push(`El campo ${field} es requerido`);
    }
  });

  // Validar tipo de entrega
  if (data.tipoEntrega && !['retira', 'envio'].includes(data.tipoEntrega)) {
    errors.push('El tipo de entrega debe ser "retira" o "envio"');
  }

  // Validar tipo de envío si es entrega a domicilio
  if (data.tipoEntrega === 'envio') {
    if (!data.tipoEnvio) {
      errors.push('El tipo de envío es requerido para entregas a domicilio');
    } else if (!['cercano', 'lejano', 'la_banda', 'gratis'].includes(data.tipoEnvio)) {
      errors.push('Tipo de envío no válido');
    }

    if (!data.direccion || data.direccion.trim().length === 0) {
      errors.push('La dirección es requerida para entregas a domicilio');
    }
  }

  // Validar método de pago
  if (data.metodoPago && !['efectivo', 'debito', 'credito', 'transferencia'].includes(data.metodoPago)) {
    errors.push('Método de pago no válido');
  }

  // NUEVA VALIDACIÓN: Items del pedido (reemplaza la validación de cantidadPollo)
  if (!data.items || !Array.isArray(data.items) || data.items.length === 0) {
    errors.push('El pedido debe contener al menos un producto');
  } else {
    // Validar cada item individualmente
    data.items.forEach((item: any, index: number) => {
      if (!item.producto_id) {
        errors.push(`El producto en la posición ${index + 1} no tiene ID válido`);
      }

      if (!item.cantidad || item.cantidad <= 0) {
        errors.push(`La cantidad del producto en la posición ${index + 1} debe ser mayor a 0`);
      }

      if (!item.precio_unitario || item.precio_unitario < 0) {
        errors.push(`El precio unitario del producto en la posición ${index + 1} es inválido`);
      }

      if (!item.subtotal || item.subtotal < 0) {
        errors.push(`El subtotal del producto en la posición ${index + 1} es inválido`);
      }
    });
  }

  // Validar precio total
  if (!data.precioTotal || data.precioTotal <= 0) {
    errors.push('El precio total es requerido y debe ser mayor a 0');
  }

  // Validar hora de entrega
  if (data.horaEntrega && !/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(data.horaEntrega)) {
    errors.push('El formato de la hora de entrega no es válido (HH:MM)');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

export function validarActualizacionEstado(data: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!data.id && data.id !== 0) {
    errors.push('El ID del pedido es requerido');
  }

  if (!data.estado || typeof data.estado !== 'string') {
    errors.push('El estado es requerido y debe ser un string');
  }

  const estadosValidos = ['pendiente', 'preparando', 'en_camino', 'entregado', 'cancelado'];
  if (data.estado && !estadosValidos.includes(data.estado)) {
    errors.push(`Estado inválido. Debe ser uno de: ${estadosValidos.join(', ')}`);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// Agrega este validador para edición
export function validarActualizacionPedido(data: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Campos requeridos básicos para edición
  const requiredFields = [
    'id', // El ID es requerido para edición
    'nombre',
    'tipoEntrega',
    'metodoPago',
    'horaEntrega'
  ];

  // Validar campos requeridos
  requiredFields.forEach(field => {
    if (!data[field]) {
      errors.push(`El campo ${field} es requerido`);
    }
  });

  // Validar tipo de entrega
  if (data.tipoEntrega && !['retira', 'envio'].includes(data.tipoEntrega)) {
    errors.push('El tipo de entrega debe ser "retira" o "envio"');
  }

  // Validar tipo de envío si es entrega a domicilio
  if (data.tipoEntrega === 'envio') {
    if (!data.tipoEnvio) {
      errors.push('El tipo de envío es requerido para entregas a domicilio');
    } else if (!['cercano', 'lejano', 'la_banda', 'gratis'].includes(data.tipoEnvio)) {
      errors.push('Tipo de envío no válido');
    }

    if (!data.direccion || data.direccion.trim().length === 0) {
      errors.push('La dirección es requerida para entregas a domicilio');
    }
  }

  // Validar método de pago
  if (data.metodoPago && !['efectivo', 'debito', 'credito', 'transferencia'].includes(data.metodoPago)) {
    errors.push('Método de pago no válido');
  }

  // Validación de items del pedido
  if (!data.items || !Array.isArray(data.items) || data.items.length === 0) {
    errors.push('El pedido debe contener al menos un producto');
  } else {
    // Validar cada item individualmente
    data.items.forEach((item: any, index: number) => {
      if (!item.producto_id || item.producto_id <= 0) {
        errors.push(`El producto en la posición ${index + 1} no tiene ID válido`);
      }

      if (!item.cantidad || item.cantidad <= 0) {
        errors.push(`La cantidad del producto en la posición ${index + 1} debe ser mayor a 0`);
      }

      if (!item.precio_unitario || item.precio_unitario < 0) {
        errors.push(`El precio unitario del producto en la posición ${index + 1} es inválido`);
      }

      if (!item.subtotal || item.subtotal < 0) {
        errors.push(`El subtotal del producto en la posición ${index + 1} es inválido`);
      }
    });
  }

  // Validar precio total
  if (!data.precioTotal || data.precioTotal <= 0) {
    errors.push('El precio total es requerido y debe ser mayor a 0');
  }

  // Validar hora de entrega
  if (data.horaEntrega && !/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(data.horaEntrega)) {
    errors.push('El formato de la hora de entrega no es válido (HH:MM)');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

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

// NUEVO: Validador para items individuales (puede ser útil en el frontend)
export function validarItemPedido(item: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!item.producto_id) {
    errors.push('El ID del producto es requerido');
  }

  if (!item.cantidad || item.cantidad <= 0) {
    errors.push('La cantidad debe ser mayor a 0');
  }

  if (!item.precio_unitario || item.precio_unitario < 0) {
    errors.push('El precio unitario es inválido');
  }

  if (!item.subtotal || item.subtotal < 0) {
    errors.push('El subtotal es inválido');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}
