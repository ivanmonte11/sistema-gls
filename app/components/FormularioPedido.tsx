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
  const [cantidadPollo, setCantidadPollo] = useState<number>(0);
  const [precioUnitario, setPrecioUnitario] = useState<number>(20000);
  const [precioFinal, setPrecioFinal] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [stockData, setStockData] = useState<StockData>({ cantidad: 0, precio: 20000 });
  const [lastResetDate, setLastResetDate] = useState<string>('');

  useEffect(() => {
    obtenerStock();
    checkAndResetSequence();
  }, []);

  useEffect(() => {
    if (cantidadPollo > 0) {
      calcularPrecio();
    }
  }, [cantidadPollo, tipoEntrega, tipoEnvio, conPapas, cantidadPapas]);

  const calcularPrecio = () => {
    let total = cantidadPollo * precioUnitario;
    
    // Costo de envío
    if (tipoEntrega === 'envio') {
      switch(tipoEnvio) {
        case 'cercano': total += 1500; break;
        case 'lejano': total += 2500; break;
        case 'la_banda': total += 3000; break;
      }
    }

    // Costo de papas (ejemplo: $500 por porción)
    if (conPapas && cantidadPapas > 0) {
      total += cantidadPapas * 500;
    }

    setPrecioFinal(total);
  };

  const obtenerStock = async () => {
    try {
      const res = await fetch('/api/stock');
      if (res.ok) {
        const data: StockData = await res.json();
        setStockData(data);
        setPrecioUnitario(20000);
      }
    } catch (error) {
      console.error('Error obteniendo stock:', error);
    }
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
  
    if (cantidadPollo <= 0) {
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
          cantidadPapas,
          cantidadPollo,
          precioUnitario,
          precioTotal: precioFinal
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
      setCantidadPollo(0);
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

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>, setter: React.Dispatch<React.SetStateAction<number>>) => {
    const value = parseFloat(e.target.value);
    setter(isNaN(value) ? 0 : value);
  };

  return (
    <div className="max-w-md mx-auto p-4">
      <div className="bg-white p-4 mb-6 rounded-lg shadow">
        <h2 className="text-xl font-bold mb-2">Stock Disponible</h2>
        <TablaStock stock={stockData.cantidad} precio={20000} />
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
                    <span>Cercano (+${formatNumber(1500)})</span>
                  </label>
                  <label className="flex items-center space-x-2 p-2 border rounded">
                    <input
                      type="radio"
                      checked={tipoEnvio === 'lejano'}
                      onChange={() => setTipoEnvio('lejano')}
                    />
                    <span>Lejano (+${formatNumber(2500)})</span>
                  </label>
                  <label className="flex items-center space-x-2 p-2 border rounded">
                    <input
                      type="radio"
                      checked={tipoEnvio === 'la_banda'}
                      onChange={() => setTipoEnvio('la_banda')}
                    />
                    <span>La Banda (+${formatNumber(3000)})</span>
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
              value={cantidadPollo || ''}
              onChange={(e) => handleNumberChange(e, setCantidadPollo)}
              className="w-full p-2 border rounded"
              min="1"
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
                {tipoEnvio === 'cercano' && `Incluye envío cercano: $${formatNumber(1500)}`}
                {tipoEnvio === 'lejano' && `Incluye costo de envío lejano: $${formatNumber(2500)}`}
                {tipoEnvio === 'la_banda' && `Incluye costo de envío a La Banda: $${formatNumber(3000)}`}
                {tipoEnvio === 'gratis' && 'Incluye envío gratis'}
              </div>
            )}
            {conPapas && cantidadPapas > 0 && (
              <div className="text-sm text-gray-600 mt-1">
                {cantidadPapas} porción(es) de papas: +${formatNumber(cantidadPapas * 500)}
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