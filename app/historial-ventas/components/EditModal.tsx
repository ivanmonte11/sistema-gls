'use client';

import { useState, useEffect } from 'react';
import { Pedido, ItemPedido } from '../types/pedidos.types';

interface ProductoStock {
  id: number;
  producto: string;
  cantidad: number;
  precio: number | null;
  tipo_medida: string;
  categoria: string | null;
  activo: boolean;
}

interface PreciosConfig {
  envio_cercano: number;
  envio_lejano: number;
  envio_la_banda: number;
}

interface EditModalProps {
  pedido: Pedido;
  onClose: () => void;
  onSave: (pedido: Pedido) => Promise<{ success: boolean; message?: string; error?: string }>;
  isEditing: boolean;
  error: string | null;
  setError: (error: string | null) => void;
}

export const EditModal = ({ pedido, onClose, onSave, isEditing, error, setError }: EditModalProps) => {
  const [pedidoEditado, setPedidoEditado] = useState<Pedido>({ ...pedido });
  const [productos, setProductos] = useState<ProductoStock[]>([]);
  const [itemsEditados, setItemsEditados] = useState<ItemPedido[]>([]);
  const [productoSeleccionado, setProductoSeleccionado] = useState<string>('');
  const [cantidadProducto, setCantidadProducto] = useState<number>(1);
  const [preciosConfig, setPreciosConfig] = useState<PreciosConfig>({
    envio_cercano: 1500,
    envio_lejano: 2500,
    envio_la_banda: 3000
  });
  const [cargando, setCargando] = useState(true);

  // Cargar productos disponibles, items del pedido y precios de envío
  useEffect(() => {
    const cargarDatos = async () => {
      try {
        setCargando(true);

        // Cargar precios de envío primero
        await cargarPreciosEnvio();

        // Cargar productos del stock
        await cargarProductos();

        // Cargar items del pedido
        await cargarItemsPedido();

      } catch (error) {
        console.error('Error cargando datos:', error);
        setError('Error al cargar los datos del pedido');
      } finally {
        setCargando(false);
      }
    };

    cargarDatos();
  }, [pedido, setError]);

  const cargarPreciosEnvio = async () => {
    try {
      const res = await fetch('/api/precios');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          const preciosMap = data.data.reduce((acc: any, item: any) => {
            acc[item.item_key] = parseFloat(item.item_value);
            return acc;
          }, {});

          setPreciosConfig({
            envio_cercano: preciosMap.envio_cercano || 1500,
            envio_lejano: preciosMap.envio_lejano || 2500,
            envio_la_banda: preciosMap.envio_la_banda || 3000
          });
        }
      }
    } catch (error) {
      console.error('Error cargando precios de envío:', error);
    }
  };

  const cargarProductos = async () => {
    try {
      const res = await fetch('/api/stock');
      if (!res.ok) {
        throw new Error(`Error ${res.status} al cargar productos`);
      }
      const productosStock = await res.json();
      setProductos(productosStock.filter((p: ProductoStock) => p.activo && p.precio));
    } catch (error) {
      console.error('Error cargando productos:', error);
      // Si falla, al menos mostrar los productos que ya están en el pedido
      setProductos([]);
    }
  };

  const cargarItemsPedido = async () => {
    try {
      // Si el pedido ya tiene items en el prop, usarlos directamente
      if (pedido.items && pedido.items.length > 0) {
        setItemsEditados(pedido.items);
      } else {
        // Si no tiene items, intentar cargarlos desde la API
        try {
          const resItems = await fetch(`/api/pedidos/${pedido.id}/items`);
          if (resItems.ok) {
            const itemsData = await resItems.json();
            setItemsEditados(itemsData);
          } else {
            // Si no existe el endpoint, usar items vacíos
            setItemsEditados([]);
          }
        } catch (itemsError) {
          console.error('Error cargando items:', itemsError);
          setItemsEditados([]);
        }
      }
    } catch (error) {
      console.error('Error procesando items del pedido:', error);
      setItemsEditados([]);
    }
  };

  const agregarProducto = () => {
    if (!productoSeleccionado || cantidadProducto <= 0) return;

    const producto = productos.find(p => p.id === parseInt(productoSeleccionado));
    if (!producto || !producto.precio) return;

    // Verificar stock
    if (cantidadProducto > producto.cantidad) {
      alert(`Stock insuficiente. Disponible: ${producto.cantidad} ${getLabelTipoMedida(producto.tipo_medida)}`);
      return;
    }

    const nuevoItem: ItemPedido = {
      id: Date.now(), // ID temporal para la UI
      pedido_id: pedido.id,
      producto_id: producto.id,
      producto_nombre: producto.producto,
      cantidad: cantidadProducto,
      precio_unitario: producto.precio,
      subtotal: producto.precio * cantidadProducto,
      tipo_medida: producto.tipo_medida,
      observaciones: ''
    };

    setItemsEditados([...itemsEditados, nuevoItem]);
    setProductoSeleccionado('');
    setCantidadProducto(1);
  };

  const eliminarProducto = (index: number) => {
    const nuevosItems = [...itemsEditados];
    nuevosItems.splice(index, 1);
    setItemsEditados(nuevosItems);
  };

  const actualizarCantidad = (index: number, nuevaCantidad: number) => {
    if (nuevaCantidad <= 0) return;

    const nuevosItems = [...itemsEditados];
    const item = nuevosItems[index];

    // Verificar stock
    const producto = productos.find(p => p.id === item.producto_id);
    if (producto && nuevaCantidad > producto.cantidad) {
      alert(`Stock insuficiente. Disponible: ${producto.cantidad}`);
      return;
    }

    item.cantidad = nuevaCantidad;
    item.subtotal = item.precio_unitario * nuevaCantidad;

    setItemsEditados(nuevosItems);
  };

  // CALCULAR COSTO DE ENVÍO
  const calcularCostoEnvio = (): number => {
    if (pedidoEditado.tipo_entrega !== 'envio' || !pedidoEditado.tipo_envio) {
      return 0;
    }

    switch(pedidoEditado.tipo_envio) {
      case 'cercano':
        return preciosConfig.envio_cercano;
      case 'lejano':
        return preciosConfig.envio_lejano;
      case 'la_banda':
        return preciosConfig.envio_la_banda;
      case 'gratis':
        return 0;
      default:
        return 0;
    }
  };

  // CALCULAR SUBTOTAL DE PRODUCTOS
  const calcularSubtotalProductos = (): number => {
    return itemsEditados.reduce((total, item) => total + item.subtotal, 0);
  };

  // CALCULAR TOTAL FINAL (productos + envío)
  const calcularTotal = (): number => {
    const subtotalProductos = calcularSubtotalProductos();
    const costoEnvio = calcularCostoEnvio();
    return subtotalProductos + costoEnvio;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (itemsEditados.length === 0) {
      setError('Debe agregar al menos un producto');
      return;
    }

    // Preparar pedido completo con items actualizados
    const pedidoCompleto: Pedido = {
      ...pedidoEditado,
      items: itemsEditados,
      precio_total: calcularTotal() // ← AHORA INCLUYE EL ENVÍO
    };

    console.log('📤 Enviando pedido editado:', pedidoCompleto);
    console.log('🚚 Costo envío:', calcularCostoEnvio());
    console.log('📦 Subtotal productos:', calcularSubtotalProductos());
    console.log('💰 Total:', calcularTotal());

    const result = await onSave(pedidoCompleto);
    if (result.success) {
      onClose();
    }
  };

  const getLabelTipoMedida = (tipo: string) => {
    const labels: { [key: string]: string } = {
      unidad: 'unidades',
      kilo: 'kg',
      gramo: 'g',
      litro: 'L',
      docena: 'docenas',
      porcion: 'porciones'
    };
    return labels[tipo] || tipo;
  };

  const getStockDisponible = (productoId: number): number => {
    const producto = productos.find(p => p.id === productoId);
    return producto?.cantidad || 0;
  };

  const costoEnvio = calcularCostoEnvio();
  const subtotalProductos = calcularSubtotalProductos();
  const total = calcularTotal();

  if (cargando) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg p-6">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-center">Cargando datos del pedido...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">Editar Pedido #{pedidoEditado.numero_pedido}</h2>

        {error && <div className="bg-red-100 text-red-700 p-2 mb-4 rounded">{error}</div>}

        <form onSubmit={handleSubmit}>
          {/* Información básica */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block mb-1 font-medium">Nombre</label>
              <input
                type="text"
                value={pedidoEditado.nombre_cliente}
                onChange={(e) => setPedidoEditado({ ...pedidoEditado, nombre_cliente: e.target.value })}
                className="w-full p-2 border rounded"
                required
              />
            </div>

            <div>
              <label className="block mb-1 font-medium">Teléfono</label>
              <input
                type="text"
                value={pedidoEditado.telefono_cliente || ''}
                onChange={(e) => setPedidoEditado({ ...pedidoEditado, telefono_cliente: e.target.value })}
                className="w-full p-2 border rounded"
              />
            </div>

            <div>
              <label className="block mb-1 font-medium">Tipo de Entrega</label>
              <select
                value={pedidoEditado.tipo_entrega}
                onChange={(e) => setPedidoEditado({ ...pedidoEditado, tipo_entrega: e.target.value as 'retira' | 'envio' })}
                className="w-full p-2 border rounded"
              >
                <option value="retira">Retira</option>
                <option value="envio">Envío</option>
              </select>
            </div>

            {pedidoEditado.tipo_entrega === 'envio' && (
              <>
                <div>
                  <label className="block mb-1 font-medium">Tipo de Envío</label>
                  <select
                    value={pedidoEditado.tipo_envio || ''}
                    onChange={(e) => setPedidoEditado({ ...pedidoEditado, tipo_envio: e.target.value as any })}
                    className="w-full p-2 border rounded"
                  >
                    <option value="cercano">Cercano (+${preciosConfig.envio_cercano})</option>
                    <option value="lejano">Lejano (+${preciosConfig.envio_lejano})</option>
                    <option value="la_banda">La Banda (+${preciosConfig.envio_la_banda})</option>
                    <option value="gratis">Gratis</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block mb-1 font-medium">Dirección</label>
                  <input
                    type="text"
                    value={pedidoEditado.direccion || ''}
                    onChange={(e) => setPedidoEditado({ ...pedidoEditado, direccion: e.target.value })}
                    className="w-full p-2 border rounded"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block mb-1 font-medium">Método de Pago</label>
              <select
                value={pedidoEditado.metodo_pago}
                onChange={(e) => setPedidoEditado({ ...pedidoEditado, metodo_pago: e.target.value })}
                className="w-full p-2 border rounded"
              >
                <option value="efectivo">Efectivo</option>
                <option value="debito">Débito</option>
                <option value="credito">Crédito</option>
                <option value="transferencia">Transferencia</option>
              </select>
            </div>

            <div>
              <label className="block mb-1 font-medium">Hora de Entrega</label>
              <input
                type="time"
                value={pedidoEditado.hora_entrega_solicitada || ''}
                onChange={(e) => setPedidoEditado({ ...pedidoEditado, hora_entrega_solicitada: e.target.value })}
                className="w-full p-2 border rounded"
                required
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                checked={pedidoEditado.con_chimichurri}
                onChange={(e) => setPedidoEditado({ ...pedidoEditado, con_chimichurri: e.target.checked })}
                className="mr-2"
              />
              <label>Con Chimichurri</label>
            </div>
          </div>

          {/* Selector de productos */}
          <div className="mb-6">
            <h3 className="font-medium text-lg mb-3">Productos del Pedido</h3>

            {productos.length === 0 ? (
              <div className="text-yellow-600 bg-yellow-50 p-3 rounded mb-4">
                No se pudieron cargar los productos disponibles. Puede editar las cantidades de los productos existentes.
              </div>
            ) : (
              <div className="flex gap-2 mb-4">
                <select
                  value={productoSeleccionado}
                  onChange={(e) => setProductoSeleccionado(e.target.value)}
                  className="flex-1 p-2 border rounded"
                >
                  <option value="">Seleccionar producto</option>
                  {productos.map(producto => (
                    <option key={producto.id} value={producto.id}>
                      {producto.producto} - ${producto.precio}/{getLabelTipoMedida(producto.tipo_medida)} (Stock: {producto.cantidad})
                    </option>
                  ))}
                </select>

                <input
                  type="number"
                  value={cantidadProducto}
                  onChange={(e) => setCantidadProducto(Number(e.target.value))}
                  min="0.1"
                  step="0.1"
                  className="w-20 p-2 border rounded"
                  placeholder="Cant."
                />

                <button
                  type="button"
                  onClick={agregarProducto}
                  className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                >
                  Agregar
                </button>
              </div>
            )}

            {/* Lista de productos existentes */}
            {itemsEditados.length > 0 && (
              <div className="border rounded">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="p-2 text-left">Producto</th>
                      <th className="p-2 text-left">Cantidad</th>
                      <th className="p-2 text-left">Precio</th>
                      <th className="p-2 text-left">Subtotal</th>
                      <th className="p-2 text-left"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {itemsEditados.map((item, index) => (
                      <tr key={item.id || index} className="border-t">
                        <td className="p-2">{item.producto_nombre}</td>
                        <td className="p-2">
                          <input
                            type="number"
                            value={item.cantidad}
                            onChange={(e) => actualizarCantidad(index, Number(e.target.value))}
                            min="0.1"
                            step="0.1"
                            className="w-20 p-1 border rounded"
                          />
                          <span className="ml-2">{getLabelTipoMedida(item.tipo_medida)}</span>
                        </td>
                        <td className="p-2">${item.precio_unitario}</td>
                        <td className="p-2">${item.subtotal}</td>
                        <td className="p-2">
                          <button
                            type="button"
                            onClick={() => eliminarProducto(index)}
                            className="text-red-500 hover:text-red-700"
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Resumen de precios */}
          <div className="bg-blue-50 p-4 rounded-lg mb-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Subtotal Productos:</span>
                <span>${subtotalProductos}</span>
              </div>

              {costoEnvio > 0 && (
                <div className="flex justify-between">
                  <span>Costo de Envío:</span>
                  <span>+${costoEnvio}</span>
                </div>
              )}

              <div className="flex justify-between text-lg font-bold pt-2 border-t">
                <span>Total:</span>
                <span className="text-blue-600">${total}</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded hover:bg-gray-100"
              disabled={isEditing}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              disabled={isEditing || itemsEditados.length === 0}
            >
              {isEditing ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};