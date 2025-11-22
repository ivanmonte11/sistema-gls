import pool from '@/lib/db';
import {
  Pedido,
  PedidoCreateRequest,
  PedidoUpdateRequest,
  PedidoCreateResponse,
  ItemPedido
} from '../types/pedidos.types';
import { TIMEZONE } from '../utils/fecha.utils';

export async function crearPedido(
  client: any,
  data: PedidoCreateRequest
): Promise<PedidoCreateResponse> {
  try {
    // Generar número de pedido
    const numeroPedido = await generarNumeroPedido(client);

    // Insertar el pedido principal
    const pedidoQuery = `
      INSERT INTO pedidos (
        client_id, numero_pedido, nombre_cliente, telefono_cliente,
        tipo_entrega, tipo_envio, direccion, metodo_pago,
        con_chimichurri, precio_total, fecha, hora_pedido, fecha_pedido,
        hora_entrega_solicitada, estado, cliente_eventual
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        NOW() AT TIME ZONE $11,
        (NOW() AT TIME ZONE $11)::time,
        (NOW() AT TIME ZONE $11)::date,
        $12, 'pendiente', $13
      )
      RETURNING id, numero_pedido, precio_total
    `;

    const pedidoResult = await client.query(pedidoQuery, [
      data.clienteEventual ? null : (data.client_id || null),
      numeroPedido,
      data.nombre,
      data.clienteEventual ? null : (data.telefono || null),
      data.tipoEntrega,
      data.tipoEntrega === 'envio' ? data.tipoEnvio : null,
      data.tipoEntrega === 'envio' ? data.direccion : null,
      data.metodoPago,
      data.conChimichurri || false,
      data.precioTotal, // Ahora viene calculado del frontend
      TIMEZONE,
      data.horaEntrega,
      data.clienteEventual || false
    ]);

    const pedidoId = pedidoResult.rows[0].id;
    const precioTotal = pedidoResult.rows[0].precio_total;

    // Insertar los items del pedido
    if (data.items && data.items.length > 0) {
      for (const item of data.items) {
        // Insertar item en pedido_items
        const itemQuery = `
          INSERT INTO pedido_items (
            pedido_id, producto_id, cantidad, precio_unitario, subtotal, observaciones
          ) VALUES ($1, $2, $3, $4, $5, $6)
        `;

        await client.query(itemQuery, [
          pedidoId,
          item.producto_id,
          item.cantidad,
          item.precio_unitario,
          item.subtotal,
          item.observaciones || null
        ]);

        // Actualizar stock del producto
        await client.query(
          'UPDATE stock SET cantidad = cantidad - $1 WHERE id = $2',
          [item.cantidad, item.producto_id]
        );
      }
    }

    return {
      pedidoId: pedidoId,
      numeroPedido: pedidoResult.rows[0].numero_pedido,
      total: precioTotal
    };

  } catch (error) {
    console.error('Error en crearPedido:', error);
    throw error;
  }
}

export async function actualizarPedido(data: any) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    console.log('🔄 actualizarPedido - Datos recibidos:', data);

    // Obtener pedido actual PRIMERO sin los items
    const pedidoActual = await client.query(
      `SELECT estado, cliente_eventual FROM pedidos WHERE id = $1 FOR UPDATE`,
      [data.id]
    );

    if (pedidoActual.rowCount === 0) {
      throw new Error('Pedido no encontrado');
    }

    const estadoActual = pedidoActual.rows[0].estado;
    const esClienteEventual = pedidoActual.rows[0].cliente_eventual;

    if (['entregado', 'cancelado'].includes(estadoActual)) {
      throw new Error(`No se puede editar un pedido ${estadoActual}`);
    }

    // LUEGO obtener los items del pedido (sin FOR UPDATE)
    const itemsAnteriores = await client.query(
      `SELECT producto_id, cantidad FROM pedido_items WHERE pedido_id = $1`,
      [data.id]
    );

    // Actualizar el pedido principal
    const pedidoQuery = `
      UPDATE pedidos SET
        nombre_cliente = $1,
        telefono_cliente = $2,
        tipo_entrega = $3,
        tipo_envio = $4,
        direccion = $5,
        metodo_pago = $6,
        con_chimichurri = $7,
        precio_total = $8,
        hora_entrega_solicitada = $9,
        client_id = $10,
        cliente_eventual = $11,
        fecha_actualizacion = NOW() AT TIME ZONE $12
      WHERE id = $13 RETURNING *
    `;

    const pedidoResult = await client.query(pedidoQuery, [
      data.nombre,
      data.telefono || null,
      data.tipoEntrega,
      data.tipoEntrega === 'envio' ? data.tipoEnvio : null,
      data.tipoEntrega === 'envio' ? data.direccion : null,
      data.metodoPago,
      data.conChimichurri || false,
      data.precioTotal,
      data.horaEntrega,
      data.cliente_id || null,
      data.clienteEventual || false,
      TIMEZONE,
      data.id
    ]);

    console.log('✅ Pedido principal actualizado');

    // Si hay items, actualizarlos
    if (data.items && data.items.length > 0) {
      console.log('📦 Actualizando items:', data.items);

      // Eliminar items anteriores
      await client.query('DELETE FROM pedido_items WHERE pedido_id = $1', [data.id]);
      console.log('🗑️ Items anteriores eliminados');

      // Restaurar stock de items anteriores
      for (const row of itemsAnteriores.rows) {
        if (row.producto_id) {
          await client.query(
            'UPDATE stock SET cantidad = cantidad + $1 WHERE id = $2',
            [row.cantidad, row.producto_id]
          );
        }
      }
      console.log('📊 Stock anterior restaurado');

      // Insertar nuevos items y actualizar stock
      for (const item of data.items) {
        const itemQuery = `
          INSERT INTO pedido_items (
            pedido_id, producto_id, cantidad, precio_unitario, subtotal, observaciones
          ) VALUES ($1, $2, $3, $4, $5, $6)
        `;

        await client.query(itemQuery, [
          data.id,
          item.producto_id,
          item.cantidad,
          item.precio_unitario,
          item.subtotal,
          item.observaciones || ''
        ]);

        console.log(`✅ Item insertado: ${item.producto_id}, cantidad: ${item.cantidad}`);

        // Actualizar stock con nuevos items
        await client.query(
          'UPDATE stock SET cantidad = cantidad - $1 WHERE id = $2',
          [item.cantidad, item.producto_id]
        );

        console.log(`📊 Stock actualizado para producto ${item.producto_id}`);
      }
    }

    // Obtener el pedido actualizado con items para retornar
    const pedidoCompleto = await client.query(`
      SELECT
        p.*,
        COALESCE(
          json_agg(
            json_build_object(
              'id', pi.id,
              'producto_id', pi.producto_id,
              'producto_nombre', s.producto,
              'cantidad', pi.cantidad,
              'precio_unitario', pi.precio_unitario,
              'subtotal', pi.subtotal,
              'tipo_medida', s.tipo_medida,
              'observaciones', pi.observaciones
            )
          ) FILTER (WHERE pi.id IS NOT NULL), '[]'
        ) as items
      FROM pedidos p
      LEFT JOIN pedido_items pi ON p.id = pi.pedido_id
      LEFT JOIN stock s ON pi.producto_id = s.id
      WHERE p.id = $1
      GROUP BY p.id
    `, [data.id]);

    console.log('🎉 Pedido actualizado completamente');

    await client.query('COMMIT');

    return pedidoCompleto.rows[0];

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error en actualizarPedido:', error);
    throw error;
  } finally {
    client.release();
  }
}


export async function actualizarEstadoPedido(data: { id: number | string; estado: string }) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    console.log('🔄 Actualizando estado del pedido:', data);

    // PRIMERO: Obtener el pedido y verificar que existe
    const pedidoResult = await client.query(
      `SELECT estado FROM pedidos WHERE id = $1 FOR UPDATE`,
      [data.id]
    );

    if (pedidoResult.rowCount === 0) {
      throw new Error('Pedido no encontrado');
    }

    const estadoAnterior = pedidoResult.rows[0].estado;

    // SEGUNDO: Obtener los items del pedido (sin FOR UPDATE en el LEFT JOIN)
    const itemsResult = await client.query(
      `SELECT producto_id, cantidad FROM pedido_items WHERE pedido_id = $1`,
      [data.id]
    );

    // Actualizar estado
    let query = 'UPDATE pedidos SET estado = $1';
    const params = [data.estado];

    if (data.estado === 'entregado') {
      query += ', hora_entrega_real = NOW() AT TIME ZONE $2';
      params.push(TIMEZONE);
    }

    query += ' WHERE id = $' + (params.length + 1) + ' RETURNING *';
    params.push(data.id.toString());

    console.log('📝 Query:', query);
    console.log('📝 Params:', params);

    const result = await client.query(query, params);

    // Devolver stock si se cancela
    if (data.estado === 'cancelado' && ['pendiente', 'preparando'].includes(estadoAnterior)) {
      console.log('🔄 Devolviendo stock para pedido cancelado');
      for (const row of itemsResult.rows) {
        if (row.producto_id) {
          await client.query(
            'UPDATE stock SET cantidad = cantidad + $1 WHERE id = $2',
            [row.cantidad, row.producto_id]
          );
        }
      }
    }

    await client.query('COMMIT');
    console.log('✅ Estado actualizado exitosamente');

    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error en actualizarEstadoPedido:', error);
    throw error;
  } finally {
    client.release();
  }
}

// FUNCIÓN QUE FALTABA - OBTENER TODOS LOS PEDIDOS
export async function obtenerPedidos(fecha?: string) {
  const client = await pool.connect();

  try {
    let query = `
      SELECT
        p.id, p.numero_pedido, p.nombre_cliente, p.telefono_cliente,
        p.tipo_entrega, p.tipo_envio, p.direccion, p.metodo_pago,
        p.con_chimichurri, p.precio_total, p.fecha_pedido, p.estado,
        p.cliente_eventual, p.fecha as created_at,
        TO_CHAR(p.hora_entrega_real, 'HH24:MI') as hora_entrega_real,
        TO_CHAR(p.hora_entrega_solicitada, 'HH24:MI') as hora_entrega_solicitada,
        TO_CHAR(p.hora_pedido, 'HH24:MI') as hora_pedido,
        p.impreso,
        -- Información del cliente si no es eventual
        c.name as cliente_nombre_registrado,
        c.phone as cliente_telefono_registrado,
        c.address as cliente_direccion_registrada,
        -- Obtener items del pedido
        COALESCE(
          json_agg(
            json_build_object(
              'id', pi.id,
              'producto_id', pi.producto_id,
              'producto_nombre', s.producto,
              'cantidad', pi.cantidad,
              'precio_unitario', pi.precio_unitario,
              'subtotal', pi.subtotal,
              'tipo_medida', s.tipo_medida,
              'observaciones', pi.observaciones
            )
          ) FILTER (WHERE pi.id IS NOT NULL), '[]'
        ) as items
      FROM pedidos p
      LEFT JOIN clients c ON p.client_id = c.id
      LEFT JOIN pedido_items pi ON p.id = pi.pedido_id
      LEFT JOIN stock s ON pi.producto_id = s.id
    `;

    const params: any[] = [];

    if (fecha) {
      query += ' WHERE DATE(p.fecha_pedido) = $1';
      params.push(fecha);
    }

    query += `
      GROUP BY p.id, c.id
      ORDER BY p.fecha_pedido DESC, p.hora_pedido DESC
    `;

    const result = await client.query(query, params);
    return result.rows;
  } catch (error) {
    console.error('Error en obtenerPedidos:', error);
    throw error;
  } finally {
    client.release();
  }
}

export async function obtenerPedidosPorCliente(clientId: number) {
  const client = await pool.connect();

  try {
    const query = `
      SELECT
        p.id, p.numero_pedido, p.nombre_cliente, p.telefono_cliente,
        p.tipo_entrega, p.tipo_envio, p.direccion, p.metodo_pago,
        p.con_chimichurri, p.precio_total, p.fecha_pedido, p.estado,
        p.cliente_eventual,
        TO_CHAR(p.hora_entrega_real, 'HH24:MI') as hora_entrega_real,
        TO_CHAR(p.hora_entrega_solicitada, 'HH24:MI') as hora_entrega_solicitada,
        TO_CHAR(p.hora_pedido, 'HH24:MI') as hora_pedido,
        p.impreso,
        -- Obtener items del pedido
        COALESCE(
          json_agg(
            json_build_object(
              'id', pi.id,
              'producto_id', pi.producto_id,
              'producto_nombre', s.producto,
              'cantidad', pi.cantidad,
              'precio_unitario', pi.precio_unitario,
              'subtotal', pi.subtotal,
              'tipo_medida', s.tipo_medida
            )
          ) FILTER (WHERE pi.id IS NOT NULL), '[]'
        ) as items
      FROM pedidos p
      LEFT JOIN pedido_items pi ON p.id = pi.pedido_id
      LEFT JOIN stock s ON pi.producto_id = s.id
      WHERE p.client_id = $1
      GROUP BY p.id
      ORDER BY p.fecha_pedido DESC, p.hora_pedido DESC
    `;

    const result = await client.query(query, [clientId]);
    return result.rows;
  } catch (error) {
    console.error('Error en obtenerPedidosPorCliente:', error);
    throw error;
  } finally {
    client.release();
  }
}



export async function generarNumeroPedido(client: any): Promise<string> {
  const ahora = new Date();
  const opciones = { timeZone: 'America/Argentina/Buenos_Aires' };

  // Obtener la fecha en formato DD-MM-YYYY y YYYY-MM-DD
  const dia = ahora.toLocaleDateString('es-AR', { ...opciones, day: '2-digit' });
  const mes = ahora.toLocaleDateString('es-AR', { ...opciones, month: '2-digit' });
  const año = ahora.toLocaleDateString('es-AR', { ...opciones, year: 'numeric' });
  const hoyFormatoLocal = `${dia}-${mes}-${año}`;
  const hoyStr = `${año}-${mes}-${dia}`;

  // Obtener el último número de pedido del día
  const res = await client.query(
    `SELECT numero_pedido FROM pedidos
     WHERE fecha_pedido = $1
     ORDER BY numero_pedido DESC
     LIMIT 1 FOR UPDATE`,
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

  // Verificar si el número ya existe
  const existe = await client.query(
    `SELECT 1 FROM pedidos WHERE numero_pedido = $1 LIMIT 1`,
    [numeroPedido]
  );

  if (existe.rows.length > 0) {
    throw new Error(`El número de pedido generado ya existe: ${numeroPedido}`);
  }

  return numeroPedido;
}

export async function marcarPedidoComoImpreso(id: number) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await client.query(
      `UPDATE pedidos SET impreso = true, fecha_actualizacion = NOW() WHERE id = $1`,
      [id]
    );
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al marcar pedido como impreso:', error);
    throw error;
  } finally {
    client.release();
  }
}