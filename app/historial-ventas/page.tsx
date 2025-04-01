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
}

export default function HistorialPedidos() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPedidos = async () => {
      try {
        const response = await fetch('/api/pedidos?limit=100');
        const data = await response.json();
        
        if (!response.ok || !data.success) {
          throw new Error(data.error || `HTTP error! status: ${response.status}`);
        }

        const pedidosFormateados = data.data.map((pedido: Pedido) => ({
          ...pedido,
          precio_total: typeof pedido.precio_total === 'string' 
            ? parseFloat(pedido.precio_total) 
            : pedido.precio_total,
          precio_unitario: typeof pedido.precio_unitario === 'string' 
            ? parseFloat(pedido.precio_unitario) 
            : pedido.precio_unitario
        }));
        
        setPedidos(pedidosFormateados || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error desconocido');
        console.error('Error fetching pedidos:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPedidos();
  }, []);

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

  if (isLoading) return <div className="p-4 text-center">Cargando...</div>;
  if (error) return <div className="p-4 text-red-500">Error: {error}</div>;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Historial de Pedidos</h1>
      
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white rounded-lg overflow-hidden">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-2">N° Pedido</th>
              <th className="px-4 py-2">Cliente</th>
              <th className="px-4 py-2">Teléfono</th>
              <th className="px-4 py-2">Hora Pedido</th>
              <th className="px-4 py-2">Hora Entrega</th>
              <th className="px-4 py-2">Entrega</th>
              <th className="px-4 py-2">Pago</th>
              <th className="px-4 py-2">Chimi</th>
              <th className="px-4 py-2">Papas</th>
              <th className="px-4 py-2">Cant. Pollo</th>
              <th className="px-4 py-2">Total</th>
            </tr>
          </thead>
          <tbody>
            {pedidos.map((pedido) => (
              <tr key={pedido.id} className="border-b hover:bg-gray-50">
                <td className="px-4 py-3">{formatNumeroPedido(pedido.numero_pedido)}</td>
                <td className="px-4 py-3">{pedido.nombre_cliente}</td>
                <td className="px-4 py-3">{pedido.telefono_cliente || '-'}</td>
                <td className="px-4 py-3">{pedido.hora_pedido.split(':').slice(0, 2).join(':')}</td>
                <td className="px-4 py-3">
                  {pedido.hora_entrega_solicitada ? pedido.hora_entrega_solicitada.split(':').slice(0, 2).join(':') : 'No especificada'}
                </td>
                <td className="px-4 py-3">
                  {pedido.tipo_entrega === 'envio' ? 
                    `Envío (${formatTipoEnvio(pedido.tipo_envio)})` : 
                    'Retira'}
                </td>
                <td className="px-4 py-3">{formatMetodoPago(pedido.metodo_pago)}</td>
                <td className="px-4 py-3 text-center">
                  {pedido.con_chimichurri ? '✅' : '❌'}
                </td>
                <td className="px-4 py-3 text-center">
                  {pedido.con_papas ? `${pedido.cantidad_papas} 🍟` : '❌'}
                </td>
                <td className="px-4 py-3">{pedido.cantidad_pollo}</td>
                <td className="px-4 py-3 font-semibold">
                  {formatPrecio(pedido.precio_total)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}