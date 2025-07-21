'use client';

import { useState, useEffect } from 'react';
import { addDays, format } from 'date-fns'; // Añadimos format aquí
import { DateSelector } from './components/DateSelector';
import { PedidosTable } from './components/PedidosTable';
import { ResumenEstadisticas } from './components/ResumenEstadisticas';
import { EditModal } from './components/EditModal';
import { usePedidosData } from './hooks/usePedidosData';
import { usePedidosActions } from './hooks/usePedidosActions';
import { Pedido, Estadisticas } from './types/pedidos.types';

export default function HistorialVentas() {
  // Estado
  const [fechaSeleccionada, setFechaSeleccionada] = useState<Date>(new Date());
  const [activeTab, setActiveTab] = useState<'todos' | 'entregados' | 'impresos'>('todos');
  const [pedidoAEditar, setPedidoAEditar] = useState<Pedido | null>(null);
  const [localPedidos, setLocalPedidos] = useState<Pedido[]>([]);
  const [localEntregados, setLocalEntregados] = useState<Pedido[]>([]);

  // Lógica de datos
  const {
    pedidos,
    pedidosEntregados,
    estadisticas,
    isLoading,
    error,
    setPedidos,
    setPedidosEntregados
  } = usePedidosData(fechaSeleccionada);

  // Sincronizar estados locales con los datos cargados
  useEffect(() => {
    setLocalPedidos(pedidos);
    setLocalEntregados(pedidosEntregados);
  }, [pedidos, pedidosEntregados]);

  // Lógica de acciones
  const {
    isEditing,
    error: actionError,
    actualizarEstadoPedido,
    handleEditarPedido,
    setError
  } = usePedidosActions(
    localPedidos,
    localEntregados,
    fechaSeleccionada,
    (newPedidos, newEntregados) => {
      setLocalPedidos(newPedidos);
      setLocalEntregados(newEntregados);
      setPedidos(newPedidos);
      setPedidosEntregados(newEntregados);
    }
  );

  // Handlers
  const cambiarDia = (dias: number) => {
    setFechaSeleccionada(addDays(fechaSeleccionada, dias));
  };

  const irADiaActual = () => {
    setFechaSeleccionada(new Date());
  };

  const handleCloseModal = () => {
    setPedidoAEditar(null);
    setError(null);
  };

  // Función para recargar los datos
  const reloadData = async () => {
    const fechaFormateada = format(fechaSeleccionada, 'yyyy-MM-dd');
    const response = await fetch(`/api/pedidos?fecha=${fechaFormateada}`);
    const data = await response.json();
    if (data.success) {
      setLocalPedidos(data.data);
      setLocalEntregados(data.data.filter((p: Pedido) => p.estado === 'entregado'));
      setPedidos(data.data);
      setPedidosEntregados(data.data.filter((p: Pedido) => p.estado === 'entregado'));
    }
  };

  // Render states
  if (isLoading) return <div className="p-4 text-center">Cargando...</div>;
  if (error) return <div className="p-4 text-red-500">Error: {error}</div>;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Historial de Ventas</h1>

      <DateSelector
        fechaSeleccionada={fechaSeleccionada}
        cambiarDia={cambiarDia}
        irADiaActual={irADiaActual}
      />

      <PedidosTable
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        pedidos={localPedidos}
        pedidosEntregados={localEntregados}
        setPedidoAEditar={setPedidoAEditar}
        actualizarEstadoPedido={actualizarEstadoPedido}
        onPedidoImpreso={reloadData}
      />

      {pedidoAEditar && (
        <EditModal
          pedido={pedidoAEditar}
          onClose={handleCloseModal}
          onSave={async (pedidoEditado) => {
            const result = await handleEditarPedido(pedidoEditado);
            if (result.success) {
              await reloadData(); // Recargar datos después de editar
              handleCloseModal();
            }
            return result;
          }}
          isEditing={isEditing}
          error={actionError}
          setError={setError}
        />
      )}

      <ResumenEstadisticas
        estadisticas={estadisticas}
        pedidosEntregados={localEntregados}
      />
    </div>
  );
}