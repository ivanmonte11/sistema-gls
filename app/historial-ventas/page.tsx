"use client";
import { useEffect, useState } from 'react';

interface Pedido {
  id: number;
  numero_pedido: string;
  nombre_cliente: string;
  telefono_cliente?: string;
  tipo_entrega: 'retira' | 'envio';
  tipo_envio: 'cercano' | 'lejano' | 'la_banda' | 'gratis' | null;
  direccion?: string;
  metodo_pago: string;
  con_chimichurri: boolean;
  con_papas: boolean;
  cantidad_papas: number;
  cantidad_pollo: number;
  precio_unitario: number;
  precio_total: number | string;
  fecha: string;
  hora_pedido: string;
  fecha_pedido: string;
  hora_entrega_solicitada: string | null;
  entregado: boolean;
  fecha_entrega: string | null;
}

export default function HistorialPedidos() {
  const [pendientes, setPendientes] = useState<Pedido[]>([]);
  const [entregados, setEntregados] = useState<Pedido[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPedidos = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Obtener pedidos pendientes y entregados en paralelo
        const [resPendientes, resEntregados] = await Promise.all([
          fetch('/api/pedidos?entregado=false&limit=100'),
          fetch('/api/pedidos?entregado=true&limit=100')
        ]);

        if (!resPendientes.ok || !resEntregados.ok) {
          throw new Error('Error al cargar los pedidos');
        }

        const dataPendientes = await resPendientes.json();
        const dataEntregados = await resEntregados.json();

        setPendientes(formatPedidos(dataPendientes.data));
        setEntregados(formatPedidos(dataEntregados.data));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error desconocido');
        console.error('Error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPedidos();
  }, []);

  const formatPedidos = (pedidos: Pedido[]) => {
    return pedidos.map(pedido => ({
      ...pedido,
      precio_total: typeof pedido.precio_total === 'string' 
        ? parseFloat(pedido.precio_total) 
        : pedido.precio_total,
      precio_unitario: typeof pedido.precio_unitario === 'string' 
        ? parseFloat(pedido.precio_unitario) 
        : pedido.precio_unitario,
      cantidad_pollo: typeof pedido.cantidad_pollo === 'string'
        ? parseFloat(pedido.cantidad_pollo)
        : pedido.cantidad_pollo
    }));
  };

  const marcarComoEntregado = async (id: number) => {
    try {
      const response = await fetch('/api/pedidos', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id }),
      });

      if (!response.ok) {
        throw new Error('Error al marcar como entregado');
      }

      const data = await response.json();
      
      // Actualizar los estados locales
      setPendientes(pendientes.filter(p => p.id !== id));
      setEntregados([data.data, ...entregados]);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      console.error('Error:', err);
    }
  };

  const formatMetodoPago = (metodo: string) => {
    const metodos: Record<string, string> = {
      efectivo: 'Efectivo',
      debito: 'Débito',
      credito: 'Crédito',
      transferencia: 'Transferencia'
    };
    return metodos[metodo] || metodo;
  };

  const formatTipoEnvio = (tipo: string | null) => {
    if (!tipo) return '';
    const tipos: Record<string, string> = {
      cercano: 'Cercano',
      lejano: 'Lejano (+$500)',
      la_banda: 'La Banda (+$800)',
      gratis: 'Gratis'
    };
    return tipos[tipo] || tipo;
  };

  const formatNumeroPedido = (numero: string) => {
    const parts = numero.split('-');
    if (parts.length === 4) {
      return `${parts[2]}/${parts[1]}-${parts[3]}`;
    }
    return numero;
  };

  const formatPrecio = (precio: number | string) => {
    const numero = typeof precio === 'string' ? parseFloat(precio) : precio;
    return isNaN(numero) ? '$0.00' : `$${numero.toFixed(2)}`;
  };

  const formatCantidadPollo = (cantidad: number) => {
    return cantidad % 1 === 0 ? cantidad.toString() : cantidad.toFixed(1);
  };

  const formatFechaHora = (fechaHora: string | null) => {
    if (!fechaHora) return 'No entregado';
    const fecha = new Date(fechaHora);
    return fecha.toLocaleString('es-AR');
  };

  if (isLoading) return <div className="p-4 text-center">Cargando...</div>;
  if (error) return <div className="p-4 text-red-500">Error: {error}</div>;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Gestión de Pedidos</h1>

      {/* Sección de Pedidos Pendientes */}
      <section className="mb-12">
        <h2 className="text-xl font-semibold mb-4 bg-yellow-100 p-3 rounded-lg">
          Pedidos Pendientes ({pendientes.length})
        </h2>
        
        <div className="overflow-x-auto shadow-md rounded-lg">
          <table className="min-w-full bg-white">
            <thead className="bg-yellow-50">
              <tr>
                <th className="px-4 py-3">N° Pedido</th>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Teléfono</th>
                <th className="px-4 py-3">Hora Pedido</th>
                <th className="px-4 py-3">Hora Entrega Sol.</th>
                <th className="px-4 py-3">Entrega</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Acción</th>
              </tr>
            </thead>
            <tbody>
              {pendientes.length > 0 ? (
                pendientes.map((pedido) => (
                  <tr key={pedido.id} className="border-b hover:bg-yellow-50">
                    <td className="px-4 py-3">{formatNumeroPedido(pedido.numero_pedido)}</td>
                    <td className="px-4 py-3">{pedido.nombre_cliente}</td>
                    <td className="px-4 py-3">{pedido.telefono_cliente || '-'}</td>
                    <td className="px-4 py-3">{pedido.hora_pedido.split(':').slice(0, 2).join(':')}</td>
                    <td className="px-4 py-3">
                      {pedido.hora_entrega_solicitada?.split(':').slice(0, 2).join(':') || '-'}
                    </td>
                    <td className="px-4 py-3">
                      {pedido.tipo_entrega === 'envio' ? 
                        `Envío (${formatTipoEnvio(pedido.tipo_envio)})` : 
                        'Retira'}
                    </td>
                    <td className="px-4 py-3 font-semibold">
                      {formatPrecio(pedido.precio_total)}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => marcarComoEntregado(pedido.id)}
                        className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded transition-colors"
                      >
                        Entregar
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-center text-gray-500">
                    No hay pedidos pendientes
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Sección de Pedidos Entregados */}
      <section>
        <h2 className="text-xl font-semibold mb-4 bg-green-100 p-3 rounded-lg">
          Pedidos Entregados ({entregados.length})
        </h2>
        
        <div className="overflow-x-auto shadow-md rounded-lg">
          <table className="min-w-full bg-white">
            <thead className="bg-green-50">
              <tr>
                <th className="px-4 py-3">N° Pedido</th>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Teléfono</th>
                <th className="px-4 py-3">Fecha/Hora Entrega</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Total</th>
              </tr>
            </thead>
            <tbody>
              {entregados.length > 0 ? (
                entregados.map((pedido) => (
                  <tr key={pedido.id} className="border-b hover:bg-green-50">
                    <td className="px-4 py-3">{formatNumeroPedido(pedido.numero_pedido)}</td>
                    <td className="px-4 py-3">{pedido.nombre_cliente}</td>
                    <td className="px-4 py-3">{pedido.telefono_cliente || '-'}</td>
                    <td className="px-4 py-3">{formatFechaHora(pedido.fecha_entrega)}</td>
                    <td className="px-4 py-3">
                      {pedido.tipo_entrega === 'envio' ? 
                        `Envío (${formatTipoEnvio(pedido.tipo_envio)})` : 
                        'Retira'}
                    </td>
                    <td className="px-4 py-3 font-semibold">
                      {formatPrecio(pedido.precio_total)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-gray-500">
                    No hay pedidos entregados
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}