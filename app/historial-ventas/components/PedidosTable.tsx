'use client';

import { useState, useMemo } from 'react';
import { Pedido } from '../types/pedidos.types';
import {
  formatMetodoPago,
  formatTipoEnvio,
  formatNumeroPedido,
  formatPrecio,
  formatCantidadPollo,
  formatHora
} from '../utils/formatters';
import { TicketPedido } from './TicketPedido';

interface PedidosTableProps {
  activeTab: 'todos' | 'entregados' | 'impresos';
  setActiveTab: (tab: 'todos' | 'entregados' | 'impresos') => void;
  pedidos: Pedido[];
  pedidosEntregados: Pedido[];
  setPedidoAEditar: (pedido: Pedido | null) => void;
  actualizarEstadoPedido: (id: number, estado: string) => Promise<boolean>;
  onPedidoImpreso?: () => void;
}

export const PedidosTable = ({
  activeTab,
  setActiveTab,
  pedidos,
  pedidosEntregados,
  setPedidoAEditar,
  actualizarEstadoPedido,
  onPedidoImpreso
}: PedidosTableProps) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Filtro de pedidos según pestaña y búsqueda
  const filteredPedidos = useMemo(() => {
    const currentPedidos =
      activeTab === 'todos'
        ? pedidos
        : activeTab === 'entregados'
          ? pedidosEntregados
          : activeTab === 'impresos'
            ? pedidos.filter(p => !p.impreso)
            : pedidos;

    if (!searchTerm) return currentPedidos;

    const term = searchTerm.toLowerCase();
    return currentPedidos.filter(pedido =>
      pedido.numero_pedido.toString().includes(term) ||
      pedido.nombre_cliente.toLowerCase().includes(term) ||
      (pedido.telefono_cliente && pedido.telefono_cliente.includes(term))
    );
  }, [pedidos, pedidosEntregados, activeTab, searchTerm]);

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <div className="flex border-b">
          <button
            className={`py-2 px-4 font-medium ${activeTab === 'todos' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}
            onClick={() => setActiveTab('todos')}
          >
            Todos los Pedidos
          </button>
          <button
            className={`py-2 px-4 font-medium ${activeTab === 'entregados' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}
            onClick={() => setActiveTab('entregados')}
          >
            Pedidos Entregados
          </button>
          <button
            className={`py-2 px-4 font-medium ${activeTab === 'impresos' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}
            onClick={() => setActiveTab('impresos')}
          >
            Pedidos No Impresos
          </button>
        </div>

        {/* Buscador */}
        <div className="relative">
          <input
            type="text"
            placeholder="Buscar pedidos..."
            className="pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <svg
            className="absolute left-3 top-2.5 h-5 w-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            ></path>
          </svg>
        </div>
      </div>

      <div className="overflow-x-auto mb-8">
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
              <th className="px-4 py-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredPedidos.length > 0 ? (
              filteredPedidos.map((pedido) => (
                <tr key={pedido.id} className={`border-b hover:bg-gray-50 ${pedido.estado === 'entregado' ? 'bg-green-50' : ''}`}>
                  <td className="px-4 py-3">{formatNumeroPedido(pedido.numero_pedido)}</td>
                  <td className="text-lg font-bold text-gray-800 tracking-wide">{pedido.nombre_cliente}</td>
                  <td className="px-4 py-3">{pedido.telefono_cliente || '-'}</td>
                  <td className="px-4 py-3">{formatHora(pedido.hora_pedido)}</td>
                  <td className="px-4 py-3 bg-yellow-100">{formatHora(pedido.hora_entrega_solicitada)}</td>
                  <td className="px-4 py-3">
                    {pedido.tipo_entrega === 'envio'
                      ? `Envío (${formatTipoEnvio(pedido.tipo_envio)})`
                      : 'Retira'}
                  </td>
                  <td className="px-4 py-3">{formatMetodoPago(pedido.metodo_pago)}</td>
                  <td className="px-4 py-3 text-center">{pedido.con_chimichurri ? '✅' : '❌'}</td>
                  <td className="px-4 py-3 text-center">{pedido.con_papas ? `${pedido.cantidad_papas} 🍟` : '❌'}</td>
                  <td className="px-4 py-3">{formatCantidadPollo(pedido.cantidad_pollo)}</td>
                  <td className="px-4 py-3 font-semibold">{formatPrecio(pedido.precio_total)}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col space-y-2">
                      <TicketPedido pedido={pedido}
                        onPedidoImpreso={onPedidoImpreso}
                      />

                      <button
                        onClick={() => setPedidoAEditar(pedido)}
                        className="bg-blue-500 hover:bg-blue-600 text-white text-xs py-1 px-2 rounded transition-colors"
                      >
                        Editar
                      </button>

                      {!pedido.impreso && (
                        <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">
                          🖨️ No impreso
                        </span>
                      )}


                      <span className={`px-2 py-1 rounded-full text-xs ${pedido.estado === 'entregado'
                          ? 'bg-green-100 text-green-800'
                          : pedido.estado === 'cancelado'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                        {pedido.estado}
                      </span>

                      {pedido.estado !== 'entregado' && pedido.estado !== 'cancelado' && (
                        <>
                          <button
                            onClick={() => actualizarEstadoPedido(pedido.id, 'entregado')}
                            className="bg-green-500 hover:bg-green-600 text-white text-xs py-1 px-2 rounded transition-colors"
                          >
                            Marcar como entregado
                          </button>
                          <button
                            onClick={() => actualizarEstadoPedido(pedido.id, 'cancelado')}
                            className="bg-red-500 hover:bg-red-600 text-white text-xs py-1 px-2 rounded transition-colors"
                          >
                            Cancelar pedido
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={12} className="px-4 py-6 text-center text-gray-500">
                  No se encontraron pedidos que coincidan con la búsqueda
                </td>
              </tr>
            )}
          </tbody>
        </table>

      </div>
    </>
  );
};