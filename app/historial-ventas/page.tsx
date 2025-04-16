"use client";
import { useEffect, useState } from 'react';
import { TicketPedido } from '../components/TicketPedido';

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
  estado?: string;
  hora_entrega_real?: string | null;
}

interface Estadisticas {
  total: number;
  ventas_totales: number;
  promedio: number;
}

export default function HistorialVentas() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [pedidosEntregados, setPedidosEntregados] = useState<Pedido[]>([]);
  const [estadisticas, setEstadisticas] = useState<Estadisticas>({
    total: 0,
    ventas_totales: 0,
    promedio: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'todos' | 'entregados'>('todos');
  const [pedidoAEditar, setPedidoAEditar] = useState<Pedido | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        const [pedidosResponse, estadisticasResponse] = await Promise.all([
          fetch('/api/pedidos?limit=100'),
          fetch('/api/pedidos/estadisticas')
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
  }, []);

  const calcularTotalesPorMetodo = () => {
    const totales = {
      efectivo: 0,
      debito: 0,
      credito: 0,
      transferencia: 0
    };

    pedidosEntregados.forEach(pedido => {
      const monto = typeof pedido.precio_total === 'number' ? pedido.precio_total : 0;
      switch(pedido.metodo_pago) {
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

  const actualizarEstadoPedido = async (id: number, nuevoEstado: string) => {
    try {
      const response = await fetch('/api/pedidos', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id, estado: nuevoEstado }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Error al actualizar estado');
      }

      setPedidos(pedidos.map(pedido => 
        pedido.id === id ? { ...pedido, estado: nuevoEstado } : pedido
      ));
      
      if (nuevoEstado === 'entregado') {
        const pedidoActualizado = pedidos.find(p => p.id === id);
        if (pedidoActualizado) {
          setPedidosEntregados([{...pedidoActualizado, estado: 'entregado'}, ...pedidosEntregados]);
          const statsResponse = await fetch('/api/pedidos/estadisticas');
          const statsData = await statsResponse.json();
          if (statsResponse.ok && statsData.success) {
            setEstadisticas(statsData.data.estadisticas);
          }
        }
      }

      return true;
    } catch (error) {
      console.error('Error al actualizar estado:', error);
      setError(error instanceof Error ? error.message : 'Error desconocido');
      return false;
    }
  };

  const handleEditarPedido = async (pedidoEditado: Pedido) => {
    try {
      setIsEditing(true);
      setError(null);
  
      const response = await fetch('/api/pedidos', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
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
  
      // Actualizar el estado local
      const pedidoActualizado = data.data;
      setPedidos(pedidos.map(pedido => 
        pedido.id === pedidoEditado.id ? { ...pedido, ...pedidoActualizado } : pedido
      ));
  
      // Actualizar lista de entregados si es necesario
      if (pedidoEditado.estado === 'entregado') {
        setPedidosEntregados(pedidosEntregados.map(pedido => 
          pedido.id === pedidoEditado.id ? { ...pedido, ...pedidoActualizado } : pedido
        ));
      }
  
      // Recargar estadísticas
      const statsResponse = await fetch('/api/pedidos/estadisticas');
      const statsData = await statsResponse.json();
      if (statsResponse.ok && statsData.success) {
        setEstadisticas(statsData.data.estadisticas);
      }
  
      setPedidoAEditar(null);
      return { success: true, message: 'Pedido actualizado correctamente' };
    } catch (error) {
      console.error('Error al editar pedido:', error);
      setError(error instanceof Error ? error.message : 'Error al editar pedido');
      return { success: false, error: error instanceof Error ? error.message : 'Error al editar pedido' };
    } finally {
      setIsEditing(false);
    }
  };

  // Funciones de formato (se mantienen igual)
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
    return isNaN(numero) ? '$0.00' : `$${numero.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
  };

  const formatCantidadPollo = (cantidad: number) => {
    return cantidad % 1 === 0 ? cantidad.toString() : cantidad.toFixed(1);
  };

  const formatHora = (hora: string | null) => {
    return hora ? hora.split(':').slice(0, 2).join(':') : 'No especificada';
  };

  if (isLoading) return <div className="p-4 text-center">Cargando...</div>;
  if (error) return <div className="p-4 text-red-500">Error: {error}</div>;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Historial de Ventas</h1>
      
      <div className="flex border-b mb-4">
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
            {(activeTab === 'todos' ? pedidos : pedidosEntregados).map((pedido) => (
              <tr key={pedido.id} className={`border-b hover:bg-gray-50 ${
                pedido.estado === 'entregado' ? 'bg-green-50' : ''
              }`}>
                <td className="px-4 py-3">{formatNumeroPedido(pedido.numero_pedido)}</td>
                <td className="px-4 py-3">{pedido.nombre_cliente}</td>
                <td className="px-4 py-3">{pedido.telefono_cliente || '-'}</td>
                <td className="px-4 py-3">{formatHora(pedido.hora_pedido)}</td>
                <td className="px-4 py-3">{formatHora(pedido.hora_entrega_solicitada)}</td>
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
                <td className="px-4 py-3">{formatCantidadPollo(pedido.cantidad_pollo)}</td>
                <td className="px-4 py-3 font-semibold">
                  {formatPrecio(pedido.precio_total)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col space-y-2">
                    <TicketPedido pedido={pedido} />
                    
                    <button
                      onClick={() => setPedidoAEditar(pedido)}
                      className="bg-blue-500 hover:bg-blue-600 text-white text-xs py-1 px-2 rounded transition-colors"
                    >
                      Editar
                    </button>
                    
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      pedido.estado === 'entregado' 
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
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal de Edición */}
      {pedidoAEditar && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Editar Pedido #{pedidoAEditar.numero_pedido}</h2>
            
            {error && <div className="bg-red-100 text-red-700 p-2 mb-4 rounded">{error}</div>}
            
            <form onSubmit={(e) => {
              e.preventDefault();
              handleEditarPedido(pedidoAEditar);
            }}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block mb-1 font-medium">Nombre</label>
                  <input
                    type="text"
                    value={pedidoAEditar.nombre_cliente}
                    onChange={(e) => setPedidoAEditar({
                      ...pedidoAEditar,
                      nombre_cliente: e.target.value
                    })}
                    className="w-full p-2 border rounded"
                    required
                  />
                </div>
                
                <div>
                  <label className="block mb-1 font-medium">Teléfono</label>
                  <input
                    type="text"
                    value={pedidoAEditar.telefono_cliente || ''}
                    onChange={(e) => setPedidoAEditar({
                      ...pedidoAEditar,
                      telefono_cliente: e.target.value
                    })}
                    className="w-full p-2 border rounded"
                  />
                </div>
                
                <div>
                  <label className="block mb-1 font-medium">Tipo de Entrega</label>
                  <select
                    value={pedidoAEditar.tipo_entrega}
                    onChange={(e) => setPedidoAEditar({
                      ...pedidoAEditar,
                      tipo_entrega: e.target.value as 'retira' | 'envio'
                    })}
                    className="w-full p-2 border rounded"
                  >
                    <option value="retira">Retira</option>
                    <option value="envio">Envío</option>
                  </select>
                </div>
                
                {pedidoAEditar.tipo_entrega === 'envio' && (
                  <div>
                    <label className="block mb-1 font-medium">Tipo de Envío</label>
                    <select
                      value={pedidoAEditar.tipo_envio || ''}
                      onChange={(e) => setPedidoAEditar({
                        ...pedidoAEditar,
                        tipo_envio: e.target.value as 'cercano' | 'lejano' | 'la_banda' | 'gratis' | null
                      })}
                      className="w-full p-2 border rounded"
                    >
                      <option value="cercano">Cercano</option>
                      <option value="lejano">Lejano</option>
                      <option value="la_banda">La Banda</option>
                      <option value="gratis">Gratis</option>
                    </select>
                  </div>
                )}
                
                {pedidoAEditar.tipo_entrega === 'envio' && (
                  <div className="md:col-span-2">
                    <label className="block mb-1 font-medium">Dirección</label>
                    <input
                      type="text"
                      value={pedidoAEditar.direccion || ''}
                      onChange={(e) => setPedidoAEditar({
                        ...pedidoAEditar,
                        direccion: e.target.value
                      })}
                      className="w-full p-2 border rounded"
                    />
                  </div>
                )}
                
                <div>
                  <label className="block mb-1 font-medium">Método de Pago</label>
                  <select
                    value={pedidoAEditar.metodo_pago}
                    onChange={(e) => setPedidoAEditar({
                      ...pedidoAEditar,
                      metodo_pago: e.target.value
                    })}
                    className="w-full p-2 border rounded"
                  >
                    <option value="efectivo">Efectivo</option>
                    <option value="debito">Débito</option>
                    <option value="credito">Crédito</option>
                    <option value="transferencia">Transferencia</option>
                  </select>
                </div>
                
                <div>
                  <label className="block mb-1 font-medium">Cantidad de Pollo (kg)</label>
                  <input
                    type="number"
                    value={pedidoAEditar.cantidad_pollo}
                    onChange={(e) => setPedidoAEditar({
                      ...pedidoAEditar,
                      cantidad_pollo: parseFloat(e.target.value) || 0
                    })}
                    step="0.5"
                    min="0.5"
                    className="w-full p-2 border rounded"
                    required
                  />
                </div>
                
                <div>
                  <label className="block mb-1 font-medium">Precio Unitario</label>
                  <input
                    type="number"
                    value={pedidoAEditar.precio_unitario}
                    onChange={(e) => setPedidoAEditar({
                      ...pedidoAEditar,
                      precio_unitario: parseFloat(e.target.value) || 0
                    })}
                    min="0"
                    step="0.01"
                    className="w-full p-2 border rounded"
                    required
                  />
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={pedidoAEditar.con_chimichurri}
                    onChange={(e) => setPedidoAEditar({
                      ...pedidoAEditar,
                      con_chimichurri: e.target.checked
                    })}
                    className="mr-2"
                  />
                  <label>Con Chimichurri</label>
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={pedidoAEditar.con_papas}
                    onChange={(e) => setPedidoAEditar({
                      ...pedidoAEditar,
                      con_papas: e.target.checked
                    })}
                    className="mr-2"
                  />
                  <label>Con Papas</label>
                </div>
                
                {pedidoAEditar.con_papas && (
                  <div>
                    <label className="block mb-1 font-medium">Cantidad de Papas</label>
                    <input
                      type="number"
                      value={pedidoAEditar.cantidad_papas}
                      onChange={(e) => setPedidoAEditar({
                        ...pedidoAEditar,
                        cantidad_papas: parseInt(e.target.value) || 0
                      })}
                      min="0"
                      className="w-full p-2 border rounded"
                    />
                  </div>
                )}
                
                <div>
                  <label className="block mb-1 font-medium">Hora de Entrega</label>
                  <input
                    type="time"
                    value={pedidoAEditar.hora_entrega_solicitada || ''}
                    onChange={(e) => setPedidoAEditar({
                      ...pedidoAEditar,
                      hora_entrega_solicitada: e.target.value
                    })}
                    className="w-full p-2 border rounded"
                    required
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setPedidoAEditar(null)}
                  className="px-4 py-2 border rounded hover:bg-gray-100"
                  disabled={isEditing}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  disabled={isEditing}
                >
                  {isEditing ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Resumen de Estadísticas (se mantiene igual) */}
      <div className="mt-8 bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-bold mb-4">Resumen de Entregas</h2>
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

        <h3 className="font-semibold mb-2">Últimos 5 pedidos entregados</h3>
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
              {pedidosEntregados.slice(0, 5).map((pedido) => (
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
    </div>
  );
}