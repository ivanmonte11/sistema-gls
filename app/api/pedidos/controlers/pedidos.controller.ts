import { NextResponse } from 'next/server';
import {
  crearPedido,
  actualizarPedido,
  actualizarEstadoPedido,
  obtenerPedidos,
  obtenerPedidosPorCliente,
  marcarPedidoComoImpreso,
} from '../services/pedidos.service';
import pool from '@/lib/db';
import { validarPedido, validarActualizacionEstado } from '../utils/validators.utils';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get('clientId');
  const fecha = searchParams.get('fecha');

  try {
    let pedidos;

    if (clientId) {
      pedidos = await obtenerPedidosPorCliente(Number(clientId));
    } else {
      pedidos = await obtenerPedidos(fecha || undefined);
    }

    return NextResponse.json({
      success: true,
      data: pedidos
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
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    console.log('→ Iniciando POST /api/pedidos');

    const contentType = request.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      throw new Error('Content-Type debe ser application/json');
    }

    const data = await request.json();
    console.log('→ Datos recibidos del pedido:', data);

    // Validación del pedido - ACTUALIZADA para múltiples productos
    const { isValid, errors } = validarPedido(data);
    if (!isValid) {
      throw new Error(`Datos inválidos: ${JSON.stringify(errors)}`);
    }

    // Verificar que haya items en el pedido
    if (!data.items || data.items.length === 0) {
      throw new Error('El pedido debe contener al menos un producto');
    }

    // Procesamiento del cliente - MANTENIDO
    let clientId: number | null = null;

    if (!data.clienteEventual && data.nombre) {
      // Buscar por teléfono si existe, sino por nombre
      const searchQuery = data.telefono
        ? 'SELECT id FROM clients WHERE phone = $1 LIMIT 1'
        : 'SELECT id FROM clients WHERE name = $1 LIMIT 1';

      const searchValue = data.telefono || data.nombre;

      const clientResult = await client.query(searchQuery, [searchValue]);

      if (clientResult.rows.length === 0) {
        // Crear nuevo cliente solo si no es eventual
        const newClient = await client.query(
          'INSERT INTO clients (name, phone, address) VALUES ($1, $2, $3) RETURNING id',
          [data.nombre, data.telefono || null, data.direccion || null]
        );
        clientId = newClient.rows[0].id;
        console.log('Nuevo cliente creado con ID:', clientId);
      } else {
        clientId = clientResult.rows[0].id;
        console.log('Cliente existente encontrado:', clientId);
      }
    }

    // Crear el pedido - ACTUALIZADO para múltiples productos
    const resultado = await crearPedido(client, {
      ...data,
      client_id: clientId,
      clienteEventual: data.clienteEventual || false,
      items: data.items // Incluir los items del pedido
    });

    await client.query('COMMIT');

    return NextResponse.json({
      success: true,
      message: 'Pedido registrado con éxito',
      pedidoId: resultado.pedidoId,
      numeroPedido: resultado.numeroPedido,
      total: resultado.total
    });

  } catch (error) {
    await client.query('ROLLBACK');
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    console.error('❌ Error en POST /api/pedidos:', errorMessage);

    return NextResponse.json(
      {
        success: false,
        error: 'Error al registrar el pedido',
        details: process.env.NODE_ENV === 'development' ? errorMessage : null
      },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

// Los métodos PATCH, PUT se mantienen igual...
export async function PATCH(request: Request) {
  try {
    if (!request.headers.get('content-type')?.includes('application/json')) {
      return NextResponse.json(
        { success: false, error: 'Content-Type debe ser application/json' },
        { status: 400 }
      );
    }

    const data = await request.json();
    console.log('📨 PATCH request data:', data);

    // ✅ Manejar pedidos impresos directamente
    if (data.impreso === true && typeof data.id === 'number') {
      try {
        await marcarPedidoComoImpreso(data.id);
        return NextResponse.json({
          success: true,
          message: 'Pedido marcado como impreso'
        });
      } catch (err) {
        console.error('Error al marcar como impreso:', err);
        return NextResponse.json(
          { success: false, error: 'No se pudo marcar como impreso' },
          { status: 500 }
        );
      }
    }

    // ✅ Validar y actualizar estado de pedido
    const { isValid, errors } = validarActualizacionEstado(data);
    if (!isValid) {
      console.error('❌ Validación fallida:', errors);
      return NextResponse.json(
        { success: false, error: 'Datos inválidos', details: errors },
        { status: 400 }
      );
    }

    console.log('🔄 Ejecutando actualizarEstadoPedido con:', data);
    const resultado = await actualizarEstadoPedido(data);

    return NextResponse.json({
      success: true,
      message: 'Estado actualizado',
      data: resultado
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    console.error('❌ Error en PATCH /api/pedidos:', errorMessage);

    return NextResponse.json(
      {
        success: false,
        error: 'Error al actualizar estado o marcar como impreso',
        details: process.env.NODE_ENV === 'development' ? errorMessage : null
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    console.log('→ Iniciando PUT /api/pedidos (EDICIÓN)');

    if (!request.headers.get('content-type')?.includes('application/json')) {
      return NextResponse.json(
        { success: false, error: 'Content-Type debe ser application/json' },
        { status: 400 }
      );
    }

    const data = await request.json();
    console.log('→ Datos recibidos para edición:', JSON.stringify(data, null, 2));

    // Validación básica
    if (!data.id) {
      return NextResponse.json(
        { success: false, error: 'Se requiere el ID del pedido' },
        { status: 400 }
      );
    }

    if (!data.nombre || !data.tipoEntrega || !data.metodoPago || !data.horaEntrega) {
      return NextResponse.json(
        { success: false, error: 'Faltan campos requeridos: nombre, tipoEntrega, metodoPago, horaEntrega' },
        { status: 400 }
      );
    }

    if (!data.items || !Array.isArray(data.items) || data.items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'El pedido debe contener al menos un producto' },
        { status: 400 }
      );
    }

    // Verificar que el pedido existe
    const pedidoExistente = await pool.query(
      'SELECT id, estado FROM pedidos WHERE id = $1',
      [data.id]
    );

    if (pedidoExistente.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Pedido no encontrado' },
        { status: 404 }
      );
    }

    // Actualizar el pedido
    const resultado = await actualizarPedido(data);

    console.log('✅ Pedido actualizado exitosamente');

    return NextResponse.json({
      success: true,
      message: 'Pedido actualizado con éxito',
      data: resultado
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    console.error('❌ Error en PUT /api/pedidos:', errorMessage);

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