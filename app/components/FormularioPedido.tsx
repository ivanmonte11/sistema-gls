"use client";
import { useState, useEffect } from 'react';

const formatNumber = (num: number) => {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

const TablaStock = ({ stock, precio }: { stock: number; precio: number }) => {
  return (
    <div className="grid grid-cols-2 gap-4 mb-4">
      <div>
        <p className="text-gray-600">Stock disponible:</p>
        <p className="font-bold">{formatNumber(stock)} unidades</p>
      </div>
      <div>
        <p className="text-gray-600">Precio unitario:</p>
        <p className="font-bold text-green-600">${formatNumber(precio)}</p>
      </div>
    </div>
  );
};

type StockData = {
  cantidad: number;
  precio: number;
};

type PreciosConfig = {
  medio_pollo_recargo: number;
  papas_precio: number;
  envio_cercano: number;
  envio_lejano: number;
  envio_la_banda: number;
};

export default function FormularioPedido() {
  // Estados del formulario
  const [nombre, setNombre] = useState<string>('');
  const [telefono, setTelefono] = useState<string>('');
  const [numeroPedido, setNumeroPedido] = useState<string>('');
  const [tipoEntrega, setTipoEntrega] = useState<'retira' | 'envio'>('retira');
  const [tipoEnvio, setTipoEnvio] = useState<'cercano' | 'lejano' | 'la_banda' | 'gratis'>('cercano');
  const [direccion, setDireccion] = useState<string>('');
  const [metodoPago, setMetodoPago] = useState<'efectivo' | 'debito' | 'credito' | 'transferencia'>('efectivo');
  const [conChimichurri, setConChimichurri] = useState<boolean>(false);
  const [conPapas, setConPapas] = useState<boolean>(false);
  const [cantidadPapas, setCantidadPapas] = useState<number>(0);
  const [cantidadPollo, setCantidadPollo] = useState<number | ''>('');
  const [horaEntrega, setHoraEntrega] = useState<string>('');
  const [precioUnitario, setPrecioUnitario] = useState<number>(20000);
  const [precioFinal, setPrecioFinal] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [stockData, setStockData] = useState<StockData>({ cantidad: 0, precio: 20000 });
  const [preciosConfig, setPreciosConfig] = useState<PreciosConfig>({
    medio_pollo_recargo: 1000,
    papas_precio: 4000,
    envio_cercano: 1500,
    envio_lejano: 2500,
    envio_la_banda: 3000
  });

  useEffect(() => {
    obtenerStock();
    obtenerPrecios();
    checkAndResetSequence();
    
    // Establecer hora por defecto (1 hora en el futuro)
    const ahora = new Date();
    ahora.setHours(ahora.getHours() + 1);
    const hora = ahora.getHours().toString().padStart(2, '0');
    const minutos = ahora.getMinutes().toString().padStart(2, '0');
    setHoraEntrega(`${hora}:${minutos}`);
  }, []);

  useEffect(() => {
    if (typeof cantidadPollo === 'number' && cantidadPollo > 0) {
      calcularPrecio();
    } else {
      setPrecioFinal(0);
    }
  }, [cantidadPollo, tipoEntrega, tipoEnvio, conPapas, cantidadPapas, preciosConfig]);

  const obtenerStock = async () => {
    try {
      const res = await fetch('/api/stock');
      if (res.ok) {
        const data: StockData = await res.json();
        setStockData(data);
        setPrecioUnitario(data.precio || 20000);
      }
    } catch (error) {
      console.error('Error obteniendo stock:', error);
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

  const calcularPrecio = () => {
    let total = 0;
    const cantidadEntera = Math.floor(cantidadPollo as number);
    const tieneMedioPollo = (cantidadPollo as number) % 1 !== 0;

    // 1. Pollos enteros
    total += cantidadEntera * precioUnitario;

    // 2. Medio pollo (mitad de precio + recargo dinámico)
    if (tieneMedioPollo) {
      total += (precioUnitario / 2) + preciosConfig.medio_pollo_recargo;
    }

    // 3. Costo de envío dinámico
    if (tipoEntrega === 'envio') {
      switch(tipoEnvio) {
        case 'cercano': total += preciosConfig.envio_cercano; break;
        case 'lejano': total += preciosConfig.envio_lejano; break;
        case 'la_banda': total += preciosConfig.envio_la_banda; break;
      }
    }

    // 4. Papas extras con precio dinámico
    if (conPapas && cantidadPapas > 0) {
      total += cantidadPapas * preciosConfig.papas_precio;
    }

    // Redondeamos a números enteros para evitar decimales
    setPrecioFinal(Math.round(total));
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
    const fechaStr = `${hoy.getFullYear()}-${(hoy.getMonth()+1).toString().padStart(2,'0')}-${hoy.getDate().toString().padStart(2,'0')}`;
    const numeroMostrar = `${fechaStr}-${sequence.toString().padStart(3,'0')}`;
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
    
    if (!nombre.trim()) {
      alert('Ingrese el nombre del cliente');
      return;
    }
  
    if (cantidadPollo === '' || cantidadPollo <= 0) {
      alert('La cantidad debe ser mayor a 0');
      return;
    }
  
    if (cantidadPollo > stockData.cantidad) {
      alert(`Stock insuficiente. Disponible: ${formatNumber(stockData.cantidad)}`);
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
          nombre,
          telefono,
          tipoEntrega,
          tipoEnvio: tipoEntrega === 'envio' ? tipoEnvio : null,
          direccion: tipoEntrega === 'envio' ? direccion : null,
          metodoPago,
          conChimichurri,
          conPapas,
          cantidadPapas: conPapas ? cantidadPapas : 0,
          cantidadPollo,
          precioUnitario,
          precioTotal: precioFinal,
          horaEntrega
        }),
      });
  
      const result = await response.json();
  
      if (!response.ok) {
        throw new Error(result.error || 'Error al registrar pedido');
      }

      const currentSequence = parseInt(localStorage.getItem('currentSequence') || '0');
      localStorage.setItem('currentSequence', (currentSequence + 1).toString());
      
      alert('Pedido registrado con éxito');
      setNombre('');
      setTelefono('');
      setCantidadPollo('');
      setConChimichurri(false);
      setConPapas(false);
      setCantidadPapas(0);
      setTipoEntrega('retira');
      obtenerStock();
      checkAndResetSequence();
  
    } catch (error) {
      console.error('Error:', error);
      alert(error instanceof Error ? error.message : 'Error desconocido al registrar pedido');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCantidadPolloChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '') {
      setCantidadPollo('');
    } else {
      const numValue = parseFloat(value);
      if (!isNaN(numValue)) {
        setCantidadPollo(numValue);
      }
    }
  };

  return (
    <div className="max-w-md mx-auto p-4">
      <div className="bg-white p-4 mb-6 rounded-lg shadow">
        <h2 className="text-xl font-bold mb-2">Stock Disponible</h2>
        <TablaStock stock={stockData.cantidad} precio={precioUnitario} />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-bold mb-4">Nuevo Pedido</h2>
        
        {/* Datos del cliente */}
        <div className="space-y-4">
          <div>
            <label className="block text-gray-700 mb-1">Nombre del cliente*</label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full p-2 border rounded"
              required
            />
          </div>

          <div>
            <label className="block text-gray-700 mb-1">Teléfono</label>
            <input
              type="tel"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              className="w-full p-2 border rounded"
            />
          </div>

          <div>
            <label className="block text-gray-700 mb-1">Número de pedido</label>
            <input
              type="text"
              value={formatNumeroParaMostrar(numeroPedido)}
              readOnly
              className="w-full p-2 border rounded bg-gray-100"
            />
          </div>

          <div>
            <label className="block text-gray-700 mb-1">Hora de entrega solicitada</label>
            <input
              type="time"
              value={horaEntrega}
              onChange={(e) => setHoraEntrega(e.target.value)}
              className="w-full p-2 border rounded"
            />
            <p className="text-sm text-gray-500 mt-1">
              Los pedidos se preparan según la hora de entrega solicitada (más temprano = mayor prioridad)
            </p>
          </div>
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
                  required={tipoEntrega === 'envio'}
                />
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

        {/* Chimichurri y Papas */}
        <div className="space-y-3">
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

          <div className="flex items-center">
            <input
              type="checkbox"
              checked={conPapas}
              onChange={(e) => {
                setConPapas(e.target.checked);
                if (!e.target.checked) setCantidadPapas(0);
              }}
              className="mr-2"
              id="papas"
            />
            <label htmlFor="papas" className="mr-2">Incluir porción de papas</label>
            
            {conPapas && (
              <select
                value={cantidadPapas}
                onChange={(e) => setCantidadPapas(Number(e.target.value))}
                className="p-1 border rounded"
              >
                <option value="0">0</option>
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
              </select>
            )}
          </div>
        </div>

        {/* Cantidad y precios */}
        <div className="space-y-4">
          <div>
            <label className="block text-gray-700 mb-1">Cantidad de pollos*</label>
            <input
              type="number"
              value={cantidadPollo}
              onChange={handleCantidadPolloChange}
              step="0.5"
              min="0.5"
              className="w-full p-2 border rounded"
              required
            />
          </div>

          <div className="bg-blue-50 p-3 rounded-lg">
            <div className="flex justify-between font-bold">
              <span>Total a pagar:</span>
              <span className="text-lg text-blue-600">
                ${formatNumber(precioFinal)}
              </span>
            </div>
            {tipoEntrega === 'envio' && (
              <div className="text-sm text-gray-600 mt-1">
                {tipoEnvio === 'cercano' && `Incluye envío cercano: $${formatNumber(preciosConfig.envio_cercano)}`}
                {tipoEnvio === 'lejano' && `Incluye costo de envío lejano: $${formatNumber(preciosConfig.envio_lejano)}`}
                {tipoEnvio === 'la_banda' && `Incluye costo de envío a La Banda: $${formatNumber(preciosConfig.envio_la_banda)}`}
                {tipoEnvio === 'gratis' && 'Incluye envío gratis'}
              </div>
            )}
            {conPapas && cantidadPapas > 0 && (
              <div className="text-sm text-gray-600 mt-1">
                {cantidadPapas} porción(es) de papas: +${formatNumber(cantidadPapas * preciosConfig.papas_precio)}
              </div>
            )}
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600 disabled:bg-blue-300"
        >
          {isLoading ? 'Procesando...' : 'Registrar Pedido'}
        </button>
      </form>
    </div>
  );
}