'use client';

import { Pedido, Estadisticas } from '../types/pedidos.types';
import { formatPrecio, formatMetodoPago, formatHora, formatNumeroPedido } from '../utils/formatters';

interface ResumenEstadisticasProps {
  estadisticas: Estadisticas;
  pedidosEntregados: Pedido[];
}

export const ResumenEstadisticas = ({ estadisticas, pedidosEntregados }: ResumenEstadisticasProps) => {
  const calcularTotalesPorMetodo = () => {
    const totales = {
      efectivo: 0,
      debito: 0,
      credito: 0,
      transferencia: 0
    };

    pedidosEntregados.forEach(pedido => {
      const monto = typeof pedido.precio_total === 'number' ? pedido.precio_total : 0;
      switch (pedido.metodo_pago) {
        case 'efectivo':
          totales.efectivo += monto;
          break;
        case 'debito':
          totales.debito += monto;
          break;
        case 'credito':
          totales.credito += monto;
          break;
        case 'transferencia':
          totales.transferencia += monto;
          break;
      }
    });

    return totales;
  };

  const totalesPorMetodo = calcularTotalesPorMetodo();

  return (
    <div className="mt-8 bg-white p-6 rounded-lg shadow">
      <h2 className="text-xl font-bold mb-4">Resumen del Día</h2>
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
        <div className="bg-green-50 p-4 rounded-lg">
          <h3 className="font-semibold text-green-800">Total Entregados</h3>
          <p className="text-2xl font-bold">{estadisticas.total}</p>
        </div>
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="font-semibold text-blue-800">Ventas Totales</h3>
          <p className="text-2xl font-bold">
            {formatPrecio(estadisticas.ventas_totales)}
          </p>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg">
          <h3 className="font-semibold text-yellow-800">Efectivo</h3>
          <p className="text-2xl font-bold">
            {formatPrecio(totalesPorMetodo.efectivo)}
          </p>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg">
          <h3 className="font-semibold text-purple-800">Débito</h3>
          <p className="text-2xl font-bold">
            {formatPrecio(totalesPorMetodo.debito)}
          </p>
        </div>
        <div className="bg-red-50 p-4 rounded-lg">
          <h3 className="font-semibold text-red-800">Crédito</h3>
          <p className="text-2xl font-bold">
            {formatPrecio(totalesPorMetodo.credito)}
          </p>
        </div>
        <div className="bg-cyan-50 p-4 rounded-lg">
          <h3 className="font-semibold text-cyan-800">Transferencia</h3>
          <p className="text-2xl font-bold">
            {formatPrecio(totalesPorMetodo.transferencia || 0)}
          </p>
        </div>
      </div>

      <h3 className="font-semibold mb-2">Todos los pedidos del día</h3>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-green-50 rounded-lg overflow-hidden">
          <thead className="bg-green-100">
            <tr>
              <th className="px-4 py-2">N° Pedido</th>
              <th className="px-4 py-2">Cliente</th>
              <th className="px-4 py-2">Total</th>
              <th className="px-4 py-2">Pago</th>
              <th className="px-4 py-2">Hora Entrega</th>
            </tr>
          </thead>
          <tbody>
            {pedidosEntregados.map((pedido) => (
              <tr key={`entregado-${pedido.id}`} className="border-b hover:bg-green-100">
                <td className="px-4 py-3">{formatNumeroPedido(pedido.numero_pedido)}</td>
                <td className="px-4 py-3">{pedido.nombre_cliente}</td>
                <td className="px-4 py-3 font-semibold">
                  {formatPrecio(pedido.precio_total)}
                </td>
                <td className="px-4 py-3">
                  {formatMetodoPago(pedido.metodo_pago)}
                </td>
                <td className="px-4 py-3">
                  {pedido.hora_entrega_real ? formatHora(pedido.hora_entrega_real) : formatHora(pedido.hora_entrega_solicitada)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};