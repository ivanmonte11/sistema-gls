"use client";
import { useState, useEffect } from 'react';

interface ProductoStock {
  id: number;
  producto: string;
  cantidad: number;
  precio: number | null;
  tipo_medida: string;
  categoria: string | null;
  activo: boolean;
}

interface Cliente {
  id: number;
  name: string;
  phone?: string;
  address?: string;
}

interface ItemPedido {
  producto_id: number;
  producto_nombre: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  tipo_medida: string;
}

interface PreciosConfig {
  envio_cercano: number;
  envio_lejano: number;
  envio_la_banda: number;
}

const formatNumber = (num: number) => {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

export default function FormularioPedido() {
  // Estados para el selector de clientes
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [busquedaCliente, setBusquedaCliente] = useState('');
  const [clientesSugeridos, setClientesSugeridos] = useState<Cliente[]>([]);
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false);
  const [cargandoClientes, setCargandoClientes] = useState(false);
  const [clienteEventual, setClienteEventual] = useState<boolean>(false);

  // Estados para productos
  const [productos, setProductos] = useState<ProductoStock[]>([]);
  const [itemsPedido, setItemsPedido] = useState<ItemPedido[]>([]);
  const [productoSeleccionado, setProductoSeleccionado] = useState<string>('');
  const [cantidadProducto, setCantidadProducto] = useState<number>(1);

  // Resto de estados del formulario
  const [telefono, setTelefono] = useState<string>('');
  const [numeroPedido, setNumeroPedido] = useState<string>('');
  const [tipoEntrega, setTipoEntrega] = useState<'retira' | 'envio'>('retira');
  const [tipoEnvio, setTipoEnvio] = useState<'cercano' | 'lejano' | 'la_banda' | 'gratis'>('cercano');
  const [direccion, setDireccion] = useState<string>('');
  const [metodoPago, setMetodoPago] = useState<'efectivo' | 'debito' | 'credito' | 'transferencia'>('efectivo');
  const [conChimichurri, setConChimichurri] = useState<boolean>(false);
  const [horaEntrega, setHoraEntrega] = useState<string>('');
  const [precioFinal, setPrecioFinal] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [preciosConfig, setPreciosConfig] = useState<PreciosConfig>({
    envio_cercano: 1500,
    envio_lejano: 2500,
    envio_la_banda: 3000
  });

  // Cargar productos y configuraciones
  useEffect(() => {
    obtenerProductos();
    obtenerPrecios();
    checkAndResetSequence();

    const ahora = new Date();
    ahora.setHours(ahora.getHours() + 1);
    const hora = ahora.getHours().toString().padStart(2, '0');
    const minutos = ahora.getMinutes().toString().padStart(2, '0');
    setHoraEntrega(`${hora}:${minutos}`);
  }, []);

  // Calcular precio total cuando cambian los items o el envío
 // Calcular precio total cuando cambian los items o el envío
useEffect(() => {
  console.log('🔄 useEffect - Recalculando precio...');
  console.log('📋 Items en estado:', itemsPedido);
  console.log('🚚 Tipo entrega:', tipoEntrega);
  calcularPrecioTotal();
}, [itemsPedido, tipoEntrega, tipoEnvio]);

  // Cargar clientes al buscar
  useEffect(() => {
    const buscarClientes = async () => {
      if (busquedaCliente.length > 2 && !clienteEventual) {
        setCargandoClientes(true);
        try {
          const res = await fetch(`/api/clients?search=${encodeURIComponent(busquedaCliente)}&autocomplete=true`);
          if (res.ok) {
            const clientes = await res.json(); // Array directo
            setClientesSugeridos(clientes);
          }
        } catch (error) {
          console.error("Error buscando clientes:", error);
        } finally {
          setCargandoClientes(false);
        }
      } else {
        setClientesSugeridos([]);
        setMostrarSugerencias(false);
      }
    };

    const timer = setTimeout(buscarClientes, 300);
    return () => clearTimeout(timer);
  }, [busquedaCliente, clienteEventual]);

  // Autocompletado al seleccionar cliente
  useEffect(() => {
    if (cliente && !clienteEventual) {
      setTelefono(cliente.phone || '');
      if (cliente.address) setDireccion(cliente.address);
    } else {
      setDireccion('');
    }
  }, [cliente, clienteEventual]);

  const obtenerProductos = async () => {
    try {
      const res = await fetch('/api/stock');
      if (res.ok) {
        const data = await res.json();
        setProductos(data.filter((p: ProductoStock) => p.activo && p.precio));
      }
    } catch (error) {
      console.error('Error obteniendo productos:', error);
    }
  };

  const obtenerPrecios = async () => {
    try {
      const res = await fetch('/api/precios');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          const preciosMap = data.data.reduce((acc: any, item: any) => {
            acc[item.item_key] = parseFloat(item.item_value);
            return acc;
          }, {});
          setPreciosConfig(prev => ({
            ...prev,
            ...preciosMap
          }));
        }
      }
    } catch (error) {
      console.error('Error obteniendo precios:', error);
    }
  };

  const agregarProducto = () => {
  if (!productoSeleccionado || cantidadProducto <= 0) return;

  console.log('🔄 Agregando producto...');
  console.log('🎯 Producto seleccionado ID:', productoSeleccionado);
  console.log('🎯 Cantidad:', cantidadProducto);

  const producto = productos.find(p => p.id === parseInt(productoSeleccionado));
  console.log('🔍 Producto encontrado:', producto);

  if (!producto || !producto.precio) return;

  // Verificar stock
  if (cantidadProducto > producto.cantidad) {
    alert(`Stock insuficiente. Disponible: ${producto.cantidad} ${getLabelTipoMedida(producto.tipo_medida)}`);
    return;
  }

  const nuevoItem: ItemPedido = {
    producto_id: producto.id,
    producto_nombre: producto.producto,
    cantidad: cantidadProducto,
    precio_unitario: producto.precio,
    subtotal: producto.precio * cantidadProducto,
    tipo_medida: producto.tipo_medida
  };

  console.log('➕ Nuevo item:', nuevoItem);

  setItemsPedido([...itemsPedido, nuevoItem]);
  setProductoSeleccionado('');
  setCantidadProducto(1);
};

  const eliminarProducto = (index: number) => {
    const nuevosItems = [...itemsPedido];
    nuevosItems.splice(index, 1);
    setItemsPedido(nuevosItems);
  };

 const calcularPrecioTotal = () => {
  // Calcular subtotal de todos los productos
  console.log('🔍 ITEMS_PEDIDO:', itemsPedido); // ← VER QUÉ HAY EN itemsPedido

  let subtotal = itemsPedido.reduce((total, item) => {
    console.log('📊 Item:', item.producto_nombre, 'Cantidad:', item.cantidad, 'Precio:', item.precio_unitario, 'Subtotal:', item.subtotal);
    return total + item.subtotal;
  }, 0);

  console.log('📦 Subtotal productos:', subtotal);

  let costoEnvio = 0;

  if (tipoEntrega === 'envio') {
    switch(tipoEnvio) {
      case 'cercano':
        costoEnvio = preciosConfig.envio_cercano;
        break;
      case 'lejano':
        costoEnvio = preciosConfig.envio_lejano;
        break;
      case 'la_banda':
        costoEnvio = preciosConfig.envio_la_banda;
        break;
      case 'gratis':
        costoEnvio = 0;
        break;
    }
  }

  console.log('🚚 Costo envío:', costoEnvio);
  console.log('🎯 Tipo entrega:', tipoEntrega, 'Tipo envío:', tipoEnvio);

  const total = subtotal + costoEnvio;
  console.log('💰 Total final:', total);

  setPrecioFinal(total);
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

  const checkAndResetSequence = () => {
    const today = new Date().toLocaleDateString();
    const storedDate = localStorage.getItem('lastResetDate');
    const storedSequence = localStorage.getItem('currentSequence') || '0';

    if (storedDate !== today || !storedDate) {
      localStorage.setItem('lastResetDate', today);
      localStorage.setItem('currentSequence', '1');
      generateDisplayNumber(1);
    } else {
      const currentSequence = parseInt(storedSequence);
      generateDisplayNumber(currentSequence);
    }
  };

  const generateDisplayNumber = (sequence: number) => {
    const hoy = new Date();
    const fechaStr = `${hoy.getFullYear()}-${(hoy.getMonth() + 1).toString().padStart(2, '0')}-${hoy.getDate().toString().padStart(2, '0')}`;
    const numeroMostrar = `${fechaStr}-${sequence.toString().padStart(3, '0')}`;
    setNumeroPedido(numeroMostrar);
  };

  const formatNumeroParaMostrar = (numero: string) => {
    if (numero.includes('-')) {
      const parts = numero.split('-');
      if (parts.length === 4) {
        return `${parts[2]}/${parts[1]}-${parts[3]}`;
      }
      return numero;
    }
    return numero;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!clienteEventual && !cliente && !busquedaCliente.trim()) {
      alert('Debe seleccionar o ingresar un cliente');
      return;
    }

    if (itemsPedido.length === 0) {
      alert('Debe agregar al menos un producto al pedido');
      return;
    }

    if (tipoEntrega === 'envio' && !direccion.trim()) {
      alert('Ingrese la dirección de envío');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/pedidos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cliente_id: clienteEventual ? null : (cliente?.id || null),
          nombre: clienteEventual ? busquedaCliente : (cliente ? cliente.name : busquedaCliente),
          telefono: clienteEventual ? null : telefono,
          tipoEntrega,
          tipoEnvio: tipoEntrega === 'envio' ? tipoEnvio : null,
          direccion: tipoEntrega === 'envio' ? direccion : null,
          metodoPago,
          conChimichurri,
          items: itemsPedido,
          precioTotal: precioFinal,
          horaEntrega,
          clienteEventual
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al registrar pedido');
      }

      const currentSequence = parseInt(localStorage.getItem('currentSequence') || '0');
      localStorage.setItem('currentSequence', (currentSequence + 1).toString());

      alert('Pedido registrado con éxito');
      resetForm();

    } catch (error) {
      console.error('Error:', error);
      alert(error instanceof Error ? error.message : 'Error desconocido al registrar pedido');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setCliente(null);
    setBusquedaCliente('');
    setClienteEventual(false);
    setTelefono('');
    setItemsPedido([]);
    setConChimichurri(false);
    setTipoEntrega('retira');
    setDireccion('');
    obtenerProductos();
    checkAndResetSequence();
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg shadow">
        <h2 className="text-2xl font-bold mb-6">Nuevo Pedido</h2>

        {/* Selector de cliente */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-gray-700 mb-1">
              {clienteEventual ? "Nombre del cliente eventual" : "Buscar cliente existente"}
            </label>
            <label className="flex items-center text-sm text-gray-600">
              <input
                type="checkbox"
                checked={clienteEventual}
                onChange={(e) => {
                  setClienteEventual(e.target.checked);
                  setCliente(null);
                  setBusquedaCliente('');
                  setTelefono('');
                  setDireccion('');
                }}
                className="mr-2"
              />
              Cliente eventual
            </label>
          </div>

          {clienteEventual ? (
            <input
              type="text"
              value={busquedaCliente}
              onChange={(e) => setBusquedaCliente(e.target.value)}
              placeholder="Nombre del cliente"
              className="w-full p-2 border rounded"
              required
            />
          ) : (
            <div className="relative">
              <div className="flex items-center">
                <input
                  type="text"
                  value={busquedaCliente}
                  onChange={(e) => {
                    setBusquedaCliente(e.target.value);
                    if (!e.target.value) {
                      setCliente(null);
                      setTelefono('');
                      setDireccion('');
                    }
                  }}
                  placeholder="Nombre o teléfono..."
                  className="w-full p-2 border rounded"
                  onFocus={() => {
                    if (busquedaCliente.length > 2 || cliente) {
                      setMostrarSugerencias(true);
                    }
                  }}
                  onBlur={() => setTimeout(() => setMostrarSugerencias(false), 200)}
                />
                {cliente && (
                  <button
                    type="button"
                    onClick={() => {
                      setCliente(null);
                      setBusquedaCliente('');
                      setTelefono('');
                      setDireccion('');
                    }}
                    className="ml-2 text-gray-500 hover:text-gray-700"
                    title="Borrar selección"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </button>
                )}
              </div>

              {cargandoClientes && (
                <div className="absolute right-2 top-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-900"></div>
                </div>
              )}

              {mostrarSugerencias && clientesSugeridos.length > 0 && (
                <ul className="absolute z-10 w-full mt-1 bg-white border rounded shadow-lg max-h-60 overflow-auto">
                  {clientesSugeridos.map((cliente) => (
                    <li
                      key={cliente.id}
                      onClick={() => {
                        setCliente(cliente);
                        setBusquedaCliente(cliente.name);
                        setTelefono(cliente.phone || '');
                        setDireccion(cliente.address || '');
                        setMostrarSugerencias(false);
                      }}
                      className="p-2 hover:bg-gray-100 cursor-pointer border-b last:border-b-0"
                    >
                      <div className="font-medium">{cliente.name}</div>
                      {cliente.phone && <div className="text-sm text-gray-600">{cliente.phone}</div>}
                      {cliente.address && <div className="text-sm text-gray-500 truncate">{cliente.address}</div>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* Teléfono */}
        <div>
          <label className="block text-gray-700 mb-1">Teléfono {!clienteEventual && '(Opcional)'}</label>
          <input
            type="tel"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            className="w-full p-2 border rounded"
            disabled={clienteEventual}
          />
          {clienteEventual && (
            <p className="text-sm text-gray-500 mt-1">No se requiere para clientes eventuales</p>
          )}
        </div>

        {/* Número de pedido */}
        <div>
          <label className="block text-gray-700 mb-1">Número de pedido</label>
          <input
            type="text"
            value={formatNumeroParaMostrar(numeroPedido)}
            readOnly
            className="w-full p-2 border rounded bg-gray-100"
          />
        </div>

        {/* Hora de entrega */}
        <div>
          <label className="block text-gray-700 mb-1">Hora de entrega solicitada</label>
          <input
            type="time"
            value={horaEntrega}
            onChange={(e) => setHoraEntrega(e.target.value)}
            className="w-full p-2 border rounded"
          />
        </div>

        {/* Selección de productos */}
        <div className="space-y-4">
          <label className="block text-gray-700 font-semibold">Productos del Pedido</label>

          <div className="flex gap-2">
            <select
              value={productoSeleccionado}
              onChange={(e) => setProductoSeleccionado(e.target.value)}
              className="flex-1 p-2 border rounded"
            >
              <option value="">Seleccionar producto</option>
              {productos.map(producto => (
                <option key={producto.id} value={producto.id}>
                  {producto.producto} - ${formatNumber(producto.precio || 0)}/{getLabelTipoMedida(producto.tipo_medida)}
                </option>
              ))}
            </select>

            <input
              type="number"
              value={cantidadProducto}
              onChange={(e) => setCantidadProducto(Number(e.target.value))}
              min="1"
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

          {/* Lista de productos agregados */}
          {itemsPedido.length > 0 && (
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
                  {itemsPedido.map((item, index) => (
                    <tr key={index} className="border-t">
                      <td className="p-2">{item.producto_nombre}</td>
                      <td className="p-2">
                        {item.cantidad} {getLabelTipoMedida(item.tipo_medida)}
                      </td>
                      <td className="p-2">${formatNumber(item.precio_unitario)}</td>
                      <td className="p-2">${formatNumber(item.subtotal)}</td>
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

        {/* Tipo de entrega */}
        <div className="space-y-2">
          <label className="block text-gray-700 mb-1">Tipo de entrega*</label>
          <div className="flex space-x-4">
            <label className="flex items-center">
              <input
                type="radio"
                checked={tipoEntrega === 'retira'}
                onChange={() => setTipoEntrega('retira')}
                className="mr-2"
              />
              Retira en local
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                checked={tipoEntrega === 'envio'}
                onChange={() => setTipoEntrega('envio')}
                className="mr-2"
              />
              Envío a domicilio
            </label>
          </div>

          {tipoEntrega === 'envio' && (
            <>
              <div className="mt-4 space-y-2">
                <label className="block text-gray-700 mb-1">Zona de envío*</label>
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex items-center space-x-2 p-2 border rounded">
                    <input
                      type="radio"
                      checked={tipoEnvio === 'cercano'}
                      onChange={() => setTipoEnvio('cercano')}
                    />
                    <span>Cercano (+${formatNumber(preciosConfig.envio_cercano)})</span>
                  </label>
                  <label className="flex items-center space-x-2 p-2 border rounded">
                    <input
                      type="radio"
                      checked={tipoEnvio === 'lejano'}
                      onChange={() => setTipoEnvio('lejano')}
                    />
                    <span>Lejano (+${formatNumber(preciosConfig.envio_lejano)})</span>
                  </label>
                  <label className="flex items-center space-x-2 p-2 border rounded">
                    <input
                      type="radio"
                      checked={tipoEnvio === 'la_banda'}
                      onChange={() => setTipoEnvio('la_banda')}
                    />
                    <span>La Banda (+${formatNumber(preciosConfig.envio_la_banda)})</span>
                  </label>
                  <label className="flex items-center space-x-2 p-2 border rounded">
                    <input
                      type="radio"
                      checked={tipoEnvio === 'gratis'}
                      onChange={() => setTipoEnvio('gratis')}
                    />
                    <span>Envío gratis</span>
                  </label>
                </div>
              </div>

              <div className="mt-2">
                <label className="block text-gray-700 mb-1">Dirección exacta*</label>
                <input
                  type="text"
                  value={direccion}
                  onChange={(e) => setDireccion(e.target.value)}
                  className="w-full p-2 border rounded"
                  required
                />
                {cliente?.address && direccion === cliente.address && !clienteEventual && (
                  <p className="text-sm text-green-600 mt-1">
                    Dirección cargada automáticamente del cliente seleccionado
                  </p>
                )}
              </div>
            </>
          )}
        </div>

        {/* Método de pago */}
        <div className="space-y-2">
          <label className="block text-gray-700 mb-1">Método de pago*</label>
          <select
            value={metodoPago}
            onChange={(e) => setMetodoPago(e.target.value as any)}
            className="w-full p-2 border rounded"
          >
            <option value="efectivo">Efectivo</option>
            <option value="debito">Tarjeta de Débito</option>
            <option value="credito">Tarjeta de Crédito</option>
            <option value="transferencia">Transferencia</option>
          </select>
        </div>

        {/* Chimichurri */}
        <div className="flex items-center">
          <input
            type="checkbox"
            checked={conChimichurri}
            onChange={(e) => setConChimichurri(e.target.checked)}
            className="mr-2"
            id="chimichurri"
          />
          <label htmlFor="chimichurri">Incluir chimichurri</label>
        </div>

        {/* Total */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="flex justify-between items-center">
            <span className="text-lg font-bold">Total a pagar:</span>
            <span className="text-2xl font-bold text-blue-600">
              ${formatNumber(precioFinal)}
            </span>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-blue-500 text-white p-3 rounded-lg hover:bg-blue-600 disabled:bg-blue-300 font-semibold"
        >
          {isLoading ? 'Procesando...' : 'Registrar Pedido'}
        </button>
      </form>
    </div>
  );
}