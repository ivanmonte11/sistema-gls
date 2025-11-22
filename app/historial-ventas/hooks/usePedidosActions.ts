import { useState } from 'react';
import { Pedido } from '../types/pedidos.types';

export const usePedidosActions = (
  pedidos: Pedido[],
  pedidosEntregados: Pedido[],
  fechaSeleccionada: Date,
  updateData: (pedidos: Pedido[], entregados: Pedido[]) => void
) => {
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const actualizarEstadoPedido = async (id: number, nuevoEstado: string) => {
    // 1. Guardar copia de seguridad ANTES del try
    const currentPedidos = [...pedidos];
    const currentEntregados = [...pedidosEntregados];

    try {
      // 2. Actualización optimista
      const nuevosPedidos = pedidos.map(pedido =>
        pedido.id === id ? { ...pedido, estado: nuevoEstado } : pedido
      );

      let nuevosEntregados = [...pedidosEntregados];
      if (nuevoEstado === 'entregado') {
        const pedidoActualizado = nuevosPedidos.find(p => p.id === id);
        if (pedidoActualizado) {
          nuevosEntregados = [pedidoActualizado, ...pedidosEntregados.filter(p => p.id !== id)];
        }
      } else {
        nuevosEntregados = pedidosEntregados.filter(p => p.id !== id);
      }

      // 3. Aplicar cambios optimistas
      updateData(nuevosPedidos, nuevosEntregados);

      // 4. Llamada API
      const response = await fetch('/api/pedidos', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, estado: nuevoEstado }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Error al actualizar estado');
      }

      // 5. Actualizar con datos confirmados
      const pedidoConfirmado = data.data || nuevosPedidos.find(p => p.id === id);
      const pedidosActualizados = nuevosPedidos.map(pedido =>
        pedido.id === id ? { ...pedido, ...pedidoConfirmado } : pedido
      );

      let entregadosActualizados = [...nuevosEntregados];
      if (pedidoConfirmado?.estado === 'entregado') {
        entregadosActualizados = [
          ...nuevosPedidos.filter(p => p.id === id && p.estado === 'entregado'),
          ...nuevosEntregados.filter(p => p.id !== id)
        ];
      } else {
        entregadosActualizados = nuevosEntregados.filter(p => p.id !== id);
      }

      updateData(pedidosActualizados, entregadosActualizados);

      return true;
    } catch (error) {
      console.error('Error al actualizar estado:', error);
      setError(error instanceof Error ? error.message : 'Error desconocido');
      // 6. Revertir en caso de error
      updateData(currentPedidos, currentEntregados);
      return false;
    }
  };

  // En usePedidosActions.ts - ACTUALIZAR handleEditarPedido
const handleEditarPedido = async (pedidoEditado: Pedido) => {
  const currentPedidos = [...pedidos];
  const currentEntregados = [...pedidosEntregados];

  try {
    setIsEditing(true);
    setError(null);

    // Actualización optimista
    const nuevosPedidos = pedidos.map(pedido =>
      pedido.id === pedidoEditado.id ? { ...pedido, ...pedidoEditado } : pedido
    );

    let nuevosEntregados = [...pedidosEntregados];
    if (pedidoEditado.estado === 'entregado') {
      const pedidoActualizado = nuevosPedidos.find(p => p.id === pedidoEditado.id);
      if (pedidoActualizado) {
        nuevosEntregados = [pedidoActualizado, ...pedidosEntregados.filter(p => p.id !== pedidoEditado.id)];
      }
    } else {
      nuevosEntregados = pedidosEntregados.filter(p => p.id !== pedidoEditado.id);
    }

    updateData(nuevosPedidos, nuevosEntregados);

    // Preparar datos para el backend CON LA ESTRUCTURA CORRECTA
    const datosParaBackend = {
      id: pedidoEditado.id,
      // Campos básicos
      nombre: pedidoEditado.nombre_cliente,
      telefono: pedidoEditado.telefono_cliente || '',
      tipoEntrega: pedidoEditado.tipo_entrega,
      metodoPago: pedidoEditado.metodo_pago,
      horaEntrega: pedidoEditado.hora_entrega_solicitada,
      // Campos condicionales
      tipoEnvio: pedidoEditado.tipo_entrega === 'envio' ? pedidoEditado.tipo_envio : null,
      direccion: pedidoEditado.tipo_entrega === 'envio' ? pedidoEditado.direccion : null,
      // Items del pedido (desde pedido_items)
      items: pedidoEditado.items?.map(item => ({
        producto_id: item.producto_id,
        cantidad: item.cantidad,
        precio_unitario: item.precio_unitario,
        subtotal: item.subtotal,
        observaciones: item.observaciones || ''
      })) || [],
      precioTotal: pedidoEditado.precio_total,
      conChimichurri: pedidoEditado.con_chimichurri,
      clienteEventual: pedidoEditado.cliente_eventual || false,
      cliente_id: pedidoEditado.cliente_id || null
    };

    console.log('📤 Enviando edición:', datosParaBackend);

    // Llamada API
    const response = await fetch('/api/pedidos', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datosParaBackend),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Error al editar pedido');
    }

    // Actualizar con respuesta del servidor
    const pedidoConfirmado = data.data || pedidoEditado;

    const pedidosActualizados = nuevosPedidos.map(pedido =>
      pedido.id === pedidoEditado.id ? { ...pedido, ...pedidoConfirmado } : pedido
    );

    updateData(pedidosActualizados, nuevosEntregados);

    return { success: true, message: 'Pedido actualizado correctamente' };
  } catch (error) {
    console.error('Error al editar pedido:', error);
    setError(error instanceof Error ? error.message : 'Error al editar pedido');
    updateData(currentPedidos, currentEntregados);
    return { success: false, error: error instanceof Error ? error.message : 'Error al editar pedido' };
  } finally {
    setIsEditing(false);
  }
};

  return {
    isEditing,
    error,
    actualizarEstadoPedido,
    handleEditarPedido,
    setError
  };
};