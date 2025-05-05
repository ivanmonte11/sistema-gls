import pool from '@/lib/db';
import { StockItem, StockUpdateRequest, ProductoStockConfig, StockItemConCambios } from '../types/stock.types';

// Obtener el stock
export async function obtenerStock(): Promise<StockItem[]> {
  const client = await pool.connect();
  
  try {
    const result = await client.query(
      `SELECT 
        producto, 
        cantidad, 
        TO_CHAR(fecha_actualizacion, 'YYYY-MM-DD HH24:MI:SS') as fecha_actualizacion
       FROM stock`
    );

    // Verificación explícita de result antes de acceder a result.rows
    if (!result || !result.rows || result.rows.length === 0) {
      throw new Error('No se encontraron registros de stock.');
    }

    return result.rows.map(row => ({
      producto: row.producto,
      cantidad: parseFloat(row.cantidad),
      fecha_actualizacion: row.fecha_actualizacion
    }));
  } finally {
    client.release();
  }
}

// Actualizar stock (con cambios)
export async function actualizarStock(
  data: StockUpdateRequest
): Promise<StockItemConCambios> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Obtener la cantidad actual
    const current = await client.query(
      'SELECT cantidad FROM stock WHERE producto = $1 FOR UPDATE',
      [data.producto]
    );

    if (current.rowCount === 0) {
      throw new Error('Producto no encontrado en stock');
    }

    const cantidadActual = parseFloat(current.rows[0].cantidad);
    let nuevaCantidad = data.cantidad;

    // Aplicar la acción
    if (data.accion) {
      switch (data.accion) {
        case 'incrementar':
          nuevaCantidad = cantidadActual + data.cantidad;
          break;
        case 'decrementar':
          nuevaCantidad = cantidadActual - data.cantidad;
          break;
        case 'establecer':
          // se usa directamente data.cantidad
          break;
      }
    }

    if (nuevaCantidad < 0) {
      throw new Error('La cantidad no puede ser negativa');
    }

    const result = await client.query(
      `UPDATE stock 
       SET cantidad = $1, fecha_actualizacion = NOW() 
       WHERE producto = $2 
       RETURNING 
         producto, 
         cantidad, 
         TO_CHAR(fecha_actualizacion, 'YYYY-MM-DD HH24:MI:SS') as fecha_actualizacion`,
      [nuevaCantidad, data.producto]
    );

    await client.query('COMMIT');

    return {
      producto: result.rows[0].producto,
      cantidad: parseFloat(result.rows[0].cantidad),
      fecha_actualizacion: result.rows[0].fecha_actualizacion,
      anterior: cantidadActual,
      diferencia: parseFloat(result.rows[0].cantidad) - cantidadActual
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Obtener configuración de producto
export async function obtenerConfiguracionProducto(
  producto: string
): Promise<ProductoStockConfig | null> {
  const client = await pool.connect();
  
  try {
    const result = await client.query(
      `SELECT 
        producto, 
        stock_minimo, 
        stock_maximo, 
        alerta_reposicion 
       FROM stock_config 
       WHERE producto = $1`,
      [producto]
    );

    // Verificación de result y rows, y comprobación de existencia de datos
    if (!result || !result.rows || result.rowCount === 0) {
      return null;
    }

    return {
      producto: result.rows[0].producto,
      stock_minimo: parseFloat(result.rows[0].stock_minimo),
      stock_maximo: parseFloat(result.rows[0].stock_maximo),
      alerta_reposicion: result.rows[0].alerta_reposicion
    };
  } finally {
    client.release();
  }
}
