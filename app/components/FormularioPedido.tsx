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
  medio_pollo: number;
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
    envio_la_banda: 3000,
    medio_pollo: 1000
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
  useEffect(() => {
    calcularPrecioTotal();
  }, [itemsPedido, tipoEntrega, tipoEnvio, preciosConfig]);

  // Cargar clientes al buscar
  useEffect(() => {
    const buscarClientes = async () => {
      if (busquedaCliente.length > 2 && !clienteEventual) {
        setCargandoClientes(true);
        try {
          const res = await fetch(`/api/clients?search=${encodeURIComponent(busquedaCliente)}&autocomplete=true`);
          if (res.ok) {
            const clientes = await res.json();
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
            ...preciosMap,
            medio_pollo_recargo: preciosMap.medio_pollo_recargo
          }));
        }
      }
    } catch (error) {
      console.error('Error obteniendo precios:', error);
    }
  };

  // Función para obtener el stock disponible de un producto
  const getStockDisponible = (productoId: number): number => {
    const producto = productos.find(p => p.id === productoId);
    if (!producto) return 0;

    // Calcular cuánto stock ya está reservado en el pedido actual
    const stockReservado = itemsPedido
      .filter(item => item.producto_id === productoId)
      .reduce((total, item) => total + item.cantidad, 0);

    return producto.cantidad - stockReservado;
  };

  // Función mejorada para detectar medio pollo
  const esMedioPollo = (item: ItemPedido): boolean => {
    const nombreLower = item.producto_nombre.toLowerCase();
    const esProductoPollo = nombreLower.includes('pollo');
    const esMedio = item.cantidad === 0.5;

    return esProductoPollo && esMedio;
  };

  // Función para calcular el cargo adicional total para medio pollo
  const calcularCargoMedioPollo = () => {
    let cargoTotal = 0;

    itemsPedido.forEach(item => {
      if (esMedioPollo(item)) {
        const producto = productos.find(p => p.id === item.producto_id);
        if (producto && producto.precio) {
          const medioPolloSinCargo = producto.precio / 2;
          const cargoPorUnidad = item.precio_unitario - medioPolloSinCargo;
          cargoTotal += cargoPorUnidad;
        }
      }
    });

    return cargoTotal;
  };

  const agregarProducto = () => {
    if (!productoSeleccionado || cantidadProducto <= 0) return;

    const producto = productos.find(p => p.id === parseInt(productoSeleccionado));
    if (!producto || !producto.precio) {
      alert('Este producto no tiene precio configurado');
      return;
    }

    // Verificar stock disponible
    const stockDisponible = getStockDisponible(producto.id);
    if (cantidadProducto > stockDisponible) {
      alert(`Stock insuficiente. Disponible: ${stockDisponible} ${getLabelTipoMedida(producto.tipo_medida)}`);
      return;
    }

    // CALCULAR PRECIO - NUEVA LÓGICA
    let precioFinal = producto.precio;
    let subtotal = producto.precio * cantidadProducto;
    let esMedioPolloProducto = false;

    // Si es POLLO y la cantidad es 0.5 (medio pollo)
    if (producto.producto.toLowerCase().includes('pollo') && cantidadProducto === 0.5) {
      const cargoAdicional = preciosConfig.medio_pollo;

      // Precio = (Pollo entero / 2) + cargo adicional
      precioFinal = (producto.precio / 2) + cargoAdicional;
      subtotal = precioFinal; // Como es 0.5, el subtotal es igual al precio final
      esMedioPolloProducto = true;

      console.log('🍗 Medio pollo calculado:', {
        precioPolloEntero: producto.precio,
        medioPolloSinCargo: producto.precio / 2,
        cargoAdicional,
        precioFinal,
        subtotal
      });
    }

    const nuevoItem: ItemPedido = {
      producto_id: producto.id,
      producto_nombre: producto.producto,
      cantidad: cantidadProducto,
      precio_unitario: precioFinal,
      subtotal: subtotal,
      tipo_medida: producto.tipo_medida
    };

    console.log('➕ Nuevo item:', {
      ...nuevoItem,
      esMedioPollo: esMedioPolloProducto
    });

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
    let subtotal = itemsPedido.reduce((total, item) => total + item.subtotal, 0);

    let costoEnvio = 0;

    if (tipoEntrega === 'envio') {
      switch (tipoEnvio) {
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

    const total = subtotal + costoEnvio;
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

  // Calcular valores para el desglose - CORREGIDO
  const cargoMedioPollo = calcularCargoMedioPollo();
  const subtotalSinCargo = itemsPedido.reduce((total, item) => {
    const producto = productos.find(p => p.id === item.producto_id);

    if (!producto?.precio) return total;

    if (esMedioPollo(item)) {
      // Para medio pollo: sumamos el precio base completo (11,000) sin multiplicar por 0.5
      return total + (producto.precio / 2);
    } else {
      // Para otros productos: precio normal multiplicado por cantidad
      return total + (producto.precio * item.cantidad);
    }
  }, 0);


  return (
    <div className="max-w-4xl mx-auto p-4">
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
                  setMostrarSugerencias(false);
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
                    const valor = e.target.value;
                    setBusquedaCliente(valor);

                    if (!valor) {
                      setCliente(null);
                      setTelefono('');
                      setDireccion('');
                      setMostrarSugerencias(false);
                    } else if (valor.length > 2) {
                      setMostrarSugerencias(true);
                    }
                  }}
                  placeholder="Nombre o teléfono..."
                  className="w-full p-2 border rounded"
                  onFocus={() => {
                    if (busquedaCliente.length > 2 || cliente) {
                      setMostrarSugerencias(true);
                    }
                  }}
                />
                {cliente && (
                  <button
                    type="button"
                    onClick={() => {
                      setCliente(null);
                      setBusquedaCliente('');
                      setTelefono('');
                      setDireccion('');
                      setMostrarSugerencias(false);
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
                <ul
                  className="absolute z-10 w-full mt-1 bg-white border rounded shadow-lg max-h-60 overflow-auto"
                  onMouseLeave={() => setTimeout(() => setMostrarSugerencias(false), 200)}
                >
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
                      onMouseDown={(e) => e.preventDefault()}
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

          <div className="flex gap-2 items-start">
            <select
              value={productoSeleccionado}
              onChange={(e) => setProductoSeleccionado(e.target.value)}
              className="flex-1 p-2 border rounded min-w-0"
            >
              <option value="">Seleccionar producto</option>
              {productos.map(producto => {
                const stockDisponible = getStockDisponible(producto.id);
                return (
                  <option key={producto.id} value={producto.id} disabled={stockDisponible <= 0}>
                    {producto.producto} - ${formatNumber(producto.precio || 0)}/{getLabelTipoMedida(producto.tipo_medida)}
                    {stockDisponible <= 0 ? ' (SIN STOCK)' : ` (Stock: ${stockDisponible})`}
                  </option>
                );
              })}
            </select>

            <div className="flex gap-2 flex-nowrap">
              <input
                type="number"
                value={cantidadProducto}
                onChange={(e) => setCantidadProducto(Number(e.target.value))}
                min="0.1"
                step="0.1"
                className="w-24 p-2 border rounded"
                placeholder="Cant."
              />

              <button
                type="button"
                onClick={agregarProducto}
                className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 whitespace-nowrap"
              >
                Agregar
              </button>
            </div>
          </div>

          {/* Mostrar stock disponible del producto seleccionado */}
          {productoSeleccionado && (
            <div className="text-sm text-gray-600 bg-blue-50 p-2 rounded">
              {(() => {
                const producto = productos.find(p => p.id === parseInt(productoSeleccionado));
                if (producto) {
                  const stockDisponible = getStockDisponible(producto.id);
                  return (
                    <>
                      <strong>Stock disponible:</strong> {stockDisponible} {getLabelTipoMedida(producto.tipo_medida)}
                      {stockDisponible <= 0 && (
                        <span className="text-red-600 font-semibold ml-2"> - PRODUCTO AGOTADO</span>
                      )}
                      {stockDisponible > 0 && stockDisponible < 5 && (
                        <span className="text-orange-600 font-semibold ml-2"> - ÚLTIMAS UNIDADES</span>
                      )}
                    </>
                  );
                }
                return null;
              })()}
            </div>
          )}

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
                  {itemsPedido.map((item, index) => {
                    const stockDisponible = getStockDisponible(item.producto_id);
                    const esProductoMedioPollo = esMedioPollo(item);
                    const producto = productos.find(p => p.id === item.producto_id);

                    return (
                      <tr key={index} className="border-t">
                        <td className="p-2">
                          {item.producto_nombre}
                          {esProductoMedioPollo && (
                            <div className="text-xs text-orange-600 font-semibold">
                              (Medio pollo - incluye cargo adicional)
                            </div>
                          )}
                          <div className="text-xs text-gray-500">
                            Stock restante: {stockDisponible} {getLabelTipoMedida(item.tipo_medida)}
                          </div>
                        </td>
                        <td className="p-2">
                          {item.cantidad === 0.5 ? '1/2' : item.cantidad} {getLabelTipoMedida(item.tipo_medida)}
                        </td>
                        <td className="p-2">
                          ${formatNumber(item.precio_unitario)}
                          {esProductoMedioPollo && producto && producto.precio && (
                            <div className="text-xs text-gray-500">
                              (Base: ${formatNumber(producto.precio / 2)} + ${formatNumber(preciosConfig.medio_pollo)})
                            </div>
                          )}
                        </td>
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
                    );
                  })}
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
          <div className="space-y-2">
            {/* Mostrar subtotal sin cargos adicionales */}
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>${formatNumber(subtotalSinCargo)}</span>
            </div>

            {/* Mostrar cargo adicional por medio pollo si existe */}
            {cargoMedioPollo > 0 && (
              <div className="flex justify-between text-orange-600">
                <span>Recargo por medio pollo:</span>
                <span>+${formatNumber(cargoMedioPollo)}</span>
              </div>
            )}

            {tipoEntrega === 'envio' && tipoEnvio !== 'gratis' && (
              <div className="flex justify-between">
                <span>Costo de Envío:</span>
                <span>+${formatNumber(
                  tipoEnvio === 'cercano' ? preciosConfig.envio_cercano :
                    tipoEnvio === 'lejano' ? preciosConfig.envio_lejano :
                      tipoEnvio === 'la_banda' ? preciosConfig.envio_la_banda : 0
                )}</span>
              </div>
            )}

            <div className="flex justify-between text-lg font-bold pt-2 border-t">
              <span>Total a pagar:</span>
              <span className="text-2xl font-bold text-blue-600">
                ${formatNumber(precioFinal)}
              </span>
            </div>
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