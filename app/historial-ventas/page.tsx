"use client";
import { useEffect, useState } from 'react';

interface Pedido {
  id: number;
  numero_pedido: string;
  nombre_cliente: string;
  fecha: string;
  hora_pedido: string;
  cantidad_pollo: number;
  precio_unitario: number;
  precio_total: number;
  tipo_entrega: string;
  tipo_envio: string | null;
  metodo_pago: string;
  con_chimichurri: boolean;
  direccion?: string;
  telefono_cliente?: string;
}

interface ApiResponse {
  success: boolean;
  data?: Pedido[];
  error?: string;
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
        
        console.log('Datos recibidos:', data.data); // Para diagnóstico
        
        if (!response.ok || !data.success) {
          throw new Error(data.error || `HTTP error! status: ${response.status}`);
        }
        
        setPedidos(data.data || []);
      } catch (err) {
        let errorMessage = 'Error desconocido';
        if (err instanceof Error) errorMessage = err.message;
        setError(errorMessage);
        console.error('Error fetching pedidos:', errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPedidos();
  }, []);

  const formatNumeroPedido = (numero: string) => {
    const parts = numero.split('-');
    if (parts.length === 4) {
      const [year, month, day, seq] = parts;
      return `${day}/${month}-${seq}`;
    }
    return numero;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatTime = (timeValue: any) => {
    if (!timeValue) return '-';
    
    // Si es un string con formato de hora (HH:MM:SS o HH:MM)
    if (typeof timeValue === 'string') {
      // Extraer solo la parte de la hora (HH:MM)
      const timeMatch = timeValue.match(/(\d{2}):(\d{2})(?::\d{2})?/);
      if (timeMatch) {
        return `${timeMatch[1]}:${timeMatch[2]}`;
      }
    }
    
    // Si es un timestamp ISO
    try {
      const date = new Date(timeValue);
      if (!isNaN(date.getTime())) {
        return date.toLocaleTimeString('es-AR', {
          timeZone: 'America/Argentina/Tucuman',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        });
      }
    } catch {
      console.warn('No se pudo formatear la hora:', timeValue);
    }
    
    return '-';
  };

  const getTipoEnvioText = (tipo: string | null) => {
    if (!tipo) return '';
    switch(tipo) {
      case 'cercano': return 'Cercano';
      case 'lejano': return 'Lejano (+$500)';
      case 'la_banda': return 'La Banda (+$800)';
      case 'gratis': return 'Gratis';
      default: return tipo;
    }
  };

  if (isLoading) return <div className="p-4 text-center">Cargando historial...</div>;
  if (error) return <div className="p-4 text-red-500">Error: {error}</div>;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Historial de Pedidos</h1>
      
      {pedidos.length === 0 ? (
        <p className="text-center py-8">No hay pedidos registrados</p>
      ) : (
        <div className="overflow-x-auto bg-white rounded-lg shadow">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left">N° Pedido</th>
                <th className="px-6 py-3 text-left">Cliente</th>
                <th className="px-6 py-3 text-left">Teléfono</th>
                <th className="px-6 py-3 text-left">Fecha</th>
                <th className="px-6 py-3 text-left">Hora</th>
                <th className="px-6 py-3 text-left">Tipo</th>
                <th className="px-6 py-3 text-left">Cantidad</th>
                <th className="px-6 py-3 text-left">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {pedidos.map((pedido) => (
                <tr key={pedido.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {formatNumeroPedido(pedido.numero_pedido)}
                  </td>
                  <td className="px-6 py-4">{pedido.nombre_cliente}</td>
                  <td className="px-6 py-4">{pedido.telefono_cliente || '-'}</td>
                  <td className="px-6 py-4">{formatDate(pedido.fecha)}</td>
                  <td className="px-6 py-4">
                    {formatTime(pedido.hora_pedido)}
                  </td>
                  <td className="px-6 py-4">
                    {pedido.tipo_entrega === 'envio'
                      ? `Envío (${getTipoEnvioText(pedido.tipo_envio)})`
                      : 'Retira'}
                  </td>
                  <td className="px-6 py-4">{pedido.cantidad_pollo}</td>
                  <td className="px-6 py-4 font-semibold">
                    ${Number(pedido.precio_total).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}