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
        setError(null);
        const fechaFormateada = format(fechaSeleccionada, 'yyyy-MM-dd');

        console.log('🔄 Fetching pedidos for date:', fechaFormateada);

        const [pedidosResponse, estadisticasResponse] = await Promise.all([
          fetch(`/api/pedidos?fecha=${fechaFormateada}`),
          fetch(`/api/pedidos/estadisticas?fecha=${fechaFormateada}`)
        ]);

        console.log('📡 Pedidos response status:', pedidosResponse.status);
        console.log('📡 Estadísticas response status:', estadisticasResponse.status);

        if (!pedidosResponse.ok) {
          throw new Error(`Error ${pedidosResponse.status} al cargar pedidos`);
        }

        if (!estadisticasResponse.ok) {
          console.warn('⚠️ No se pudieron cargar las estadísticas, continuando sin ellas...');
        }

        const pedidosData = await pedidosResponse.json();
        console.log('📦 Datos de pedidos recibidos:', pedidosData);

        if (!pedidosData.success) {
          throw new Error(pedidosData.error || 'Error en los datos de pedidos');
        }

        // Procesar pedidos con la NUEVA estructura
        const pedidosFormateados = (pedidosData.data || []).map((pedido: any) => {
          console.log('🔍 Procesando pedido:', pedido.id, pedido.numero_pedido);
          console.log('🛍️ Items del pedido:', pedido.items);

          return {
            ...pedido,
            // Asegurar que precio_total sea número
            precio_total: typeof pedido.precio_total === 'string'
              ? parseFloat(pedido.precio_total)
              : pedido.precio_total || 0,
            // Estado por defecto
            estado: pedido.estado || 'pendiente',
            // Asegurar que items sea un array
            items: pedido.items || []
          };
        });

        console.log('✅ Pedidos formateados:', pedidosFormateados.length);

        setPedidos(pedidosFormateados);
        setPedidosEntregados(pedidosFormateados.filter((p: Pedido) => p.estado === 'entregado'));

        // Procesar estadísticas si están disponibles
        if (estadisticasResponse.ok) {
          const estadisticasData = await estadisticasResponse.json();
          if (estadisticasData.success) {
            setEstadisticas(estadisticasData.data.estadisticas);
          }
        }

      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
        console.error('❌ Error fetching data:', err);
        setError(errorMessage);

        // Resetear datos en caso de error
        setPedidos([]);
        setPedidosEntregados([]);
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