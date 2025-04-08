import { NextResponse } from 'next/server';
import pool from '@/lib/db';

const TIMEZONE = 'America/Argentina/Buenos_Aires';

async function generarNumeroPedido(client: any): Promise<string> {
  const ahora = new Date();
  const opciones = { timeZone: 'America/Argentina/Buenos_Aires' };
  
  const dia = ahora.toLocaleDateString('es-AR', { ...opciones, day: '2-digit' });
  const mes = ahora.toLocaleDateString('es-AR', { ...opciones, month: '2-digit' });
  const año = ahora.toLocaleDateString('es-AR', { ...opciones, year: 'numeric' });
  const hoyFormatoLocal = `${dia}-${mes}-${año}`;
  const hoyStr = `${año}-${mes}-${dia}`;

  await client.query('BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE');

  try {
    const res = await client.query(
      `SELECT numero_pedido FROM pedidos 
       WHERE fecha_pedido = $1 
       ORDER BY numero_pedido DESC 
       LIMIT 1
       FOR UPDATE`,
      [hoyStr]
    );

    let siguienteNumero: number;
    if (res.rows.length > 0) {
      const ultimoNumero = res.rows[0].numero_pedido;
      const partes = ultimoNumero.split('-');
      siguienteNumero = parseInt(partes[partes.length - 1]) + 1;
      
      if (isNaN(siguienteNumero)) {
        throw new Error('Formato de número de pedido inválido');
      }
    } else {
      siguienteNumero = 1;
    }

    const numeroPedido = `P-${hoyFormatoLocal}-${siguienteNumero.toString().padStart(3, '0')}`;

    const existe = await client.query(
      `SELECT 1 FROM pedidos WHERE numero_pedido = $1 LIMIT 1`,
      [numeroPedido]
    );

    if (existe.rows.length > 0) {
      throw new Error('Número de pedido duplicado');
    }

    await client.query('COMMIT');
    return numeroPedido;

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error en generarNumeroPedido:', error);
    throw new Error('Error al generar número de pedido');
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const client = await pool.connect();

    // Nuevos parámetros de consulta
    const entregado = searchParams.get('entregado');
    const fecha = searchParams.get('fecha');
    const ultimo = searchParams.get('ultimo') === 'true';
    const limit = searchParams.get('limit') || '100';

    if (ultimo) {
      const result = await client.query(
        `SELECT 
          id,
          numero_pedido,
          nombre_cliente,
          telefono_cliente,
          tipo_entrega,
          tipo_envio,
          direccion,
          metodo_pago,
          con_chimichurri,
          con_papas,
          cantidad_papas,
          cantidad_pollo,
          precio_unitario,
          precio_total,
          fecha,
          hora_pedido,
          fecha_pedido,
          hora_entrega_solicitada,
          entregado,
          fecha_entrega
         FROM pedidos 
         ORDER BY 
           CASE 
             WHEN hora_entrega_solicitada IS NULL THEN 1
             ELSE 0
           END,
           hora_entrega_solicitada ASC,
           hora_pedido ASC
         LIMIT 1`
      );
      client.release();
      return NextResponse.json({
        success: true,
        data: result.rows[0] || null
      });
    }

    // Construcción dinámica de la consulta
    let query = `SELECT 
        id,
        numero_pedido,
        nombre_cliente,
        telefono_cliente,
        tipo_entrega,
        tipo_envio,
        direccion,
        metodo_pago,
        con_chimichurri,
        con_papas,
        cantidad_papas,
        cantidad_pollo,
        precio_unitario,
        precio_total,
        fecha,
        hora_pedido,
        fecha_pedido,
        hora_entrega_solicitada,
        entregado,
        fecha_entrega
       FROM pedidos`;
    
    const params = [];
    const conditions = [];

    if (entregado !== null) {
      conditions.push(`entregado = $${params.length + 1}`);
      params.push(entregado === 'true');
    }

    if (fecha) {
      conditions.push(`fecha_pedido = $${params.length + 1}`);
      params.push(fecha);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ` ORDER BY 
         CASE 
           WHEN hora_entrega_solicitada IS NULL THEN 1
           ELSE 0
         END,
         hora_entrega_solicitada ASC,
         hora_pedido ASC
       LIMIT $${params.length + 1}`;
    params.push(limit);

    const result = await client.query(query, params);
    client.release();
    
    return NextResponse.json({ 
      success: true, 
      data: result.rows 
    });
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    console.error('Error en GET /api/pedidos:', errorMessage);
    return NextResponse.json(
      { 
        success: false,
        error: 'Error al obtener pedidos',
        details: process.env.NODE_ENV === 'development' ? errorMessage : null
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  let client;
  try {
    if (!request.headers.get('content-type')?.includes('application/json')) {
      return NextResponse.json(
        { success: false, error: 'Content-Type debe ser application/json' },
        { status: 400 }
      );
    }

    const data = await request.json();
    
    const requiredFields = [
      'nombre', 'tipoEntrega', 'metodoPago', 
      'cantidadPollo', 'precioUnitario',
      'horaEntrega'
    ];
    const missingFields = requiredFields.filter(field => !data[field]);
    
    if (missingFields.length > 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Faltan campos requeridos',
          missingFields 
        },
        { status: 400 }
      );
    }

    // Validar cantidad de pollo (múltiplo de 0.5)
    if (data.cantidadPollo <= 0 || data.cantidadPollo % 0.5 !== 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'La cantidad debe ser mayor a 0 y múltiplo de 0.5 (ej: 0.5, 1, 1.5)' 
        },
        { status: 400 }
      );
    }

    client = await pool.connect();
    
    // Verificar stock antes de procesar
    const stockResult = await client.query(
      'SELECT cantidad FROM stock WHERE producto = $1',
      ['pollo']
    );
    const stockDisponible = parseFloat(stockResult.rows[0]?.cantidad) || 0;
    
    if (stockDisponible < data.cantidadPollo) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Stock insuficiente. Disponible: ${stockDisponible}` 
        },
        { status: 400 }
      );
    }

    // CALCULO DEL PRECIO ACTUALIZADO
    const precioUnitario = Number(data.precioUnitario);
    let precioTotal = 0;
    const cantidadEntera = Math.floor(data.cantidadPollo);
    const tieneMedioPollo = data.cantidadPollo % 1 !== 0;

    // Pollos enteros
    precioTotal += cantidadEntera * precioUnitario;

    // Medio pollo (mitad del precio + $1000 adicionales)
    if (tieneMedioPollo) {
      precioTotal += (precioUnitario / 2) + 1000;
    }

    // Costos adicionales (envío, papas, etc.)
    if (data.tipoEntrega === 'envio') {
      switch(data.tipoEnvio) {
        case 'cercano': precioTotal += 1500; break;
        case 'lejano': precioTotal += 2500; break;
        case 'la_banda': precioTotal += 3000; break;
      }
    }

    if (data.conPapas && data.cantidadPapas > 0) {
      precioTotal += data.cantidadPapas * 4000;
    }

    const numeroPedido = await generarNumeroPedido(client);
    await client.query('BEGIN');
    
    const result = await client.query(
      `INSERT INTO pedidos (
        numero_pedido,
        nombre_cliente,
        telefono_cliente,
        tipo_entrega,
        tipo_envio,
        direccion,
        metodo_pago,
        con_chimichurri,
        con_papas,
        cantidad_papas,
        cantidad_pollo,
        precio_unitario,
        precio_total,
        fecha,
        hora_pedido,
        fecha_pedido,
        hora_entrega_solicitada
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
        NOW() AT TIME ZONE $14,
        (NOW() AT TIME ZONE $14)::time,
        (NOW() AT TIME ZONE $14)::date,
        $15
      ) RETURNING id, numero_pedido`,
      [
        numeroPedido,
        data.nombre,
        data.telefono || null,
        data.tipoEntrega,
        data.tipoEntrega === 'envio' ? data.tipoEnvio : null,
        data.tipoEntrega === 'envio' ? data.direccion : null,
        data.metodoPago,
        data.conChimichurri || false,
        data.conPapas || false,
        data.conPapas ? (data.cantidadPapas || 0) : 0,
        data.cantidadPollo,
        precioUnitario,
        precioTotal,
        TIMEZONE,
        data.horaEntrega
      ]
    );

    await client.query(
      'UPDATE stock SET cantidad = cantidad - $1 WHERE producto = $2',
      [data.cantidadPollo, 'pollo']
    );

    await client.query('COMMIT');
    client.release();
    
    return NextResponse.json({
      success: true,
      message: 'Pedido registrado con éxito',
      pedidoId: result.rows[0].id,
      numeroPedido: result.rows[0].numero_pedido,
      total: precioTotal,
      desglose: {
        pollosEnteros: cantidadEntera,
        medioPollo: tieneMedioPollo,
        costoMedioPollo: tieneMedioPollo ? (precioUnitario / 2) + 1000 : 0,
        adicional: tieneMedioPollo ? 1000 : 0
      }
    });
    
  } catch (error) {
    if (client) {
      await client.query('ROLLBACK').catch(e => console.error('Error en ROLLBACK:', e));
      client.release();
    }
    
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    console.error('Error en POST /api/pedidos:', {
      message: errorMessage,
      stack: error instanceof Error ? error.stack : null,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json(
      { 
        success: false,
        error: 'Error al registrar el pedido',
        details: process.env.NODE_ENV === 'development' ? errorMessage : null
      },
      { status: 500 }
    );
  }
}

// Nuevo endpoint para marcar como entregado
export async function PUT(request: Request) {
  let client;
  try {
    const { id } = await request.json();
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID de pedido no proporcionado' },
        { status: 400 }
      );
    }

    client = await pool.connect();
    await client.query('BEGIN');
    
    const result = await client.query(
      `UPDATE pedidos 
       SET entregado = true, 
           fecha_entrega = NOW() AT TIME ZONE $1
       WHERE id = $2
       RETURNING *`,
      [TIMEZONE, id]
    );

    await client.query('COMMIT');
    client.release();
    
    if (result.rowCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Pedido no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Pedido marcado como entregado'
    });
    
  } catch (error) {
    if (client) {
      await client.query('ROLLBACK');
      client.release();
    }
    
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    console.error('Error en PUT /api/pedidos:', errorMessage);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Error al actualizar el pedido',
        details: process.env.NODE_ENV === 'development' ? errorMessage : null
      },
      { status: 500 }
    );
  }
}

// Nuevo endpoint para obtener fechas disponibles
export async function GET_FECHAS() {
  try {
    const client = await pool.connect();
    const result = await client.query(
      `SELECT DISTINCT fecha_pedido 
       FROM pedidos 
       ORDER BY fecha_pedido DESC`
    );
    client.release();

    return NextResponse.json({
      success: true,
      data: result.rows.map(row => row.fecha_pedido)
    });
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    console.error('Error en GET /api/pedidos/fechas:', errorMessage);
    return NextResponse.json(
      { 
        success: false,
        error: 'Error al obtener fechas de pedidos',
        details: process.env.NODE_ENV === 'development' ? errorMessage : null
      },
      { status: 500 }
    );
  }
}