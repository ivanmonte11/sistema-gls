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

  const handleEditarPedido = async (pedidoEditado: Pedido) => {
    // 1. Guardar copia de seguridad ANTES del try
    const currentPedidos = [...pedidos];
    const currentEntregados = [...pedidosEntregados];

    try {
      setIsEditing(true);
      setError(null);

      // 2. Actualización optimista
      const nuevosPedidos = pedidos.map(pedido =>
        pedido.id === pedidoEditado.id ? { ...pedido, ...pedidoEditado } : pedido
      );

      let nuevosEntregados = [...pedidosEntregados];
      if (pedidoEditado.estado === 'entregado') {
        const pedidoActualizado = nuevosPedidos.find(p => p.id === pedidoEditado.id);
        if (pedidoActualizado) {
          nuevosEntregados = [
            pedidoActualizado,
            ...pedidosEntregados.filter(p => p.id !== pedidoEditado.id)
          ];
        }
      } else {
        nuevosEntregados = pedidosEntregados.filter(p => p.id !== pedidoEditado.id);
      }

      // 3. Aplicar cambios optimistas
      updateData(nuevosPedidos, nuevosEntregados);

      // 4. Llamada API
      const response = await fetch('/api/pedidos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: pedidoEditado.id,
          nombre: pedidoEditado.nombre_cliente,
          telefono: pedidoEditado.telefono_cliente,
          tipoEntrega: pedidoEditado.tipo_entrega,
          tipoEnvio: pedidoEditado.tipo_envio,
          direccion: pedidoEditado.direccion,
          metodoPago: pedidoEditado.metodo_pago,
          conChimichurri: pedidoEditado.con_chimichurri,
          conPapas: pedidoEditado.con_papas,
          cantidadPapas: pedidoEditado.cantidad_papas,
          cantidadPollo: pedidoEditado.cantidad_pollo,
          precioUnitario: pedidoEditado.precio_unitario,
          horaEntrega: pedidoEditado.hora_entrega_solicitada
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Error al editar pedido');
      }

      // 5. Actualizar con datos confirmados (con fallback)
      const pedidoConfirmado = {
        ...pedidoEditado,
        ...(data.data || {}),
        id: pedidoEditado.id // Nunca cambiar el ID
      };

      const pedidosActualizados = nuevosPedidos.map(pedido =>
        pedido.id === pedidoEditado.id ? pedidoConfirmado : pedido
      );

      let entregadosActualizados = [...nuevosEntregados];
      if (pedidoConfirmado.estado === 'entregado') {
        entregadosActualizados = [
          ...pedidosActualizados.filter(p => p.id === pedidoEditado.id && p.estado === 'entregado'),
          ...nuevosEntregados.filter(p => p.id !== pedidoEditado.id)
        ];
      } else {
        entregadosActualizados = nuevosEntregados.filter(p => p.id !== pedidoEditado.id);
      }

      updateData(pedidosActualizados, entregadosActualizados);

      return { success: true, message: 'Pedido actualizado correctamente' };
    } catch (error) {
      console.error('Error al editar pedido:', error);
      setError(error instanceof Error ? error.message : 'Error al editar pedido');
      // 6. Revertir en caso de error
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