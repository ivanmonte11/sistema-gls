import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Pedido, Estadisticas } from '../types/pedidos.types';

export const usePedidosData = (fechaSeleccionada: Date) => {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [pedidosEntregados, setPedidosEntregados] = useState<Pedido[]>([]);
  const [estadisticas, setEstadisticas] = useState<Estadisticas>({
    total: 0,
    ventas_totales: 0,
    promedio: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const fechaFormateada = format(fechaSeleccionada, 'yyyy-MM-dd');

        const [pedidosResponse, estadisticasResponse] = await Promise.all([
          fetch(`/api/pedidos?fecha=${fechaFormateada}`),
          fetch(`/api/pedidos/estadisticas?fecha=${fechaFormateada}`)
        ]);

        if (!pedidosResponse.ok || !estadisticasResponse.ok) {
          throw new Error('Error al cargar datos');
        }

        const pedidosData = await pedidosResponse.json();
        const estadisticasData = await estadisticasResponse.json();

        if (!pedidosData.success || !estadisticasData.success) {
          throw new Error(pedidosData.error || estadisticasData.error || 'Error en los datos');
        }

        const pedidosFormateados = pedidosData.data.map((pedido: Pedido) => ({
          ...pedido,
          precio_total: typeof pedido.precio_total === 'string'
            ? parseFloat(pedido.precio_total)
            : pedido.precio_total,
          precio_unitario: typeof pedido.precio_unitario === 'string'
            ? parseFloat(pedido.precio_unitario)
            : pedido.precio_unitario,
          cantidad_pollo: typeof pedido.cantidad_pollo === 'string'
            ? parseFloat(pedido.cantidad_pollo)
            : pedido.cantidad_pollo,
          estado: pedido.estado || 'pendiente'
        }));

        setPedidos(pedidosFormateados || []);
        setPedidosEntregados(pedidosFormateados.filter((p: Pedido) => p.estado === 'entregado'));
        setEstadisticas(estadisticasData.data.estadisticas);

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error desconocido');
        console.error('Error fetching data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [fechaSeleccionada]);

  return {
    pedidos,
    pedidosEntregados,
    estadisticas,
    isLoading,
    error,
    setPedidos,
    setPedidosEntregados,
    setEstadisticas
  };
};