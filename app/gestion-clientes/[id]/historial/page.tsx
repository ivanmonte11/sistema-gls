"use client";
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

type Pedido = {
  id: number;
  numero_pedido: string;
  precio_total: string; // o number si estás seguro
  fecha_pedido: string;
  estado: string;
};

export default function HistorialCliente() {
  const { id } = useParams();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPedidos = async () => {
      const res = await fetch(`/api/pedidos?clientId=${id}`);
      const { data } = await res.json();
      setPedidos(data);
      setLoading(false);
    };
    fetchPedidos();
  }, [id]);

  // 🧮 Métricas
  const totalGastado = pedidos.reduce((acc, p) => acc + parseFloat(p.precio_total), 0);
  const ultimoPedido = pedidos.length > 0
    ? new Date(pedidos[0].fecha_pedido).toLocaleDateString('es-AR')
    : '—';

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
    <h1 className="text-2xl font-bold">Historial de Pedidos</h1>
    <button
      onClick={() => window.location.href = '/gestion-clientes'}
      className="bg-gray-500 text-white px-3 py-2 rounded hover:bg-gray-600"
    >
      Volver
    </button>
  </div>



      {loading ? (
        <p>Cargando...</p>
      ) : pedidos.length === 0 ? (
        <p>No hay pedidos registrados para este cliente.</p>
      ) : (
        <>
          {/* 📊 Métricas del cliente */}
          <div className="grid md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white shadow rounded p-4">
              <h3 className="font-semibold text-sm text-gray-500">Pedidos Totales</h3>
              <p className="text-2xl font-bold text-blue-600">{pedidos.length}</p>
            </div>
            <div className="bg-white shadow rounded p-4">
              <h3 className="font-semibold text-sm text-gray-500">Total Gastado</h3>
              <p className="text-2xl font-bold text-green-600">${totalGastado.toFixed(2)}</p>
            </div>
            <div className="bg-white shadow rounded p-4">
              <h3 className="font-semibold text-sm text-gray-500">Último Pedido</h3>
              <p className="text-md">{ultimoPedido}</p>
            </div>
          </div>

          {/* 🧾 Tabla de historial */}
          <table className="min-w-full bg-white border rounded">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2 text-left">Pedido</th>
                <th className="px-4 py-2 text-left">Fecha</th>
                <th className="px-4 py-2 text-left">Total</th>
                <th className="px-4 py-2 text-left">Estado</th>
              </tr>
            </thead>
            <tbody>
              {pedidos.map((p: any) => (
                <tr key={p.id} className="border-t">
                  <td className="px-4 py-2">{p.numero_pedido}</td>
                  <td className="px-4 py-2">{new Date(p.fecha_pedido).toLocaleDateString('es-AR')}</td>
                  <td className="px-4 py-2">${p.precio_total}</td>
                  <td className="px-4 py-2">{p.estado}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}