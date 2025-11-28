'use client';
import { useState, useEffect } from 'react';
import TablaStock from '../components/tableStock';

interface ProductoStock {
  id: number;
  producto: string;
  cantidad: number;
  precio: number | null;
  tipo_medida: string;
  categoria: string | null;
  activo: boolean;
}

export default function GestionStockPage() {
  const [productos, setProductos] = useState<ProductoStock[]>([]);
  const [nuevoProducto, setNuevoProducto] = useState({
    producto: '',
    cantidad: '' as number | '',
    precio: '' as number | '',
    tipo_medida: 'unidad',
    categoria: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);

  useEffect(() => {
    obtenerStock();
  }, []);

  const obtenerStock = async () => {
    try {
      const res = await fetch('/api/stock');
      if (res.ok) {
        const data = await res.json();
        setProductos(data);
      }
    } catch (error) {
      console.error('Error al obtener stock:', error);
    }
  };

  const agregarProducto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoProducto.producto || nuevoProducto.cantidad === '' || nuevoProducto.cantidad <= 0) return;

    setIsLoading(true);
    try {
      const res = await fetch('/api/stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          producto: nuevoProducto.producto,
          cantidad: nuevoProducto.cantidad,
          precio: nuevoProducto.precio || null,
          tipo_medida: nuevoProducto.tipo_medida,
          categoria: nuevoProducto.categoria || null
        }),
      });
      if (res.ok) {
        setNuevoProducto({
          producto: '',
          cantidad: '',
          precio: '',
          tipo_medida: 'unidad',
          categoria: ''
        });
        obtenerStock();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const actualizarProducto = async (id: number, datos: Partial<ProductoStock>) => {
    try {
      const res = await fetch(`/api/stock/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos),
      });
      if (res.ok) {
        obtenerStock();
      }
    } catch (error) {
      console.error('Error al actualizar producto:', error);
    }
  };

  const desactivarProducto = async (id: number) => {
    if (!confirm('¿Desactivar este producto?')) return;

    try {
      const res = await fetch(`/api/stock/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        obtenerStock();
      }
    } catch (error) {
      console.error('Error al desactivar producto:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
          Gestión de Stock
        </h1>
        <button
          onClick={() => setModoEdicion(!modoEdicion)}
          className={`px-4 py-2 rounded-lg transition-colors ${
            modoEdicion
              ? 'bg-gray-600 text-white hover:bg-gray-700'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {modoEdicion ? 'Modo Visualización' : 'Modo Edición'}
        </button>
      </div>

      {/* Formulario para agregar productos */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Agregar Producto</h2>
        <form onSubmit={agregarProducto} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <input
            type="text"
            placeholder="Nombre del producto"
            value={nuevoProducto.producto}
            onChange={(e) => setNuevoProducto({...nuevoProducto, producto: e.target.value})}
            className="p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          />
          <input
            type="number"
            step="0.01"
            placeholder="Cantidad"
            value={nuevoProducto.cantidad}
            onChange={(e) => setNuevoProducto({...nuevoProducto, cantidad: e.target.value === '' ? '' : Number(e.target.value)})}
            className="p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            min="0.01"
            required
          />
          <select
            value={nuevoProducto.tipo_medida}
            onChange={(e) => setNuevoProducto({...nuevoProducto, tipo_medida: e.target.value})}
            className="p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="unidad">Unidad</option>
            <option value="kilo">Kilo</option>
            <option value="medio_kilo">1/2 Kilo</option>
            <option value="gramo">Gramo</option>
            <option value="litro">Litro</option>
            <option value="docena">Docena</option>
            <option value="media_docena">1/2 Docena</option>
            <option value="porcion">Porción</option>
            <option value="media_porcion">1/2 Porción</option>
          </select>
          <select
            value={nuevoProducto.categoria}
            onChange={(e) => setNuevoProducto({...nuevoProducto, categoria: e.target.value})}
            className="p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Sin categoría</option>
            <option value="Pollos">Pollos</option>
            <option value="Papas">Papas</option>
            <option value="Bebidas">Bebidas</option>
            <option value="Acompañamientos">Acompañamientos</option>
            <option value="Postres">Postres</option>
            <option value="Otros">Otros</option>
          </select>
          <input
            type="number"
            step="0.01"
            placeholder="Precio (opcional)"
            value={nuevoProducto.precio}
            onChange={(e) => setNuevoProducto({...nuevoProducto, precio: e.target.value === '' ? '' : Number(e.target.value)})}
            className="p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            min="0"
          />
          <button
            type="submit"
            disabled={isLoading}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center"
          >
            {isLoading ? 'Agregando...' : 'Agregar'}
          </button>
        </form>
      </div>

      {/* Tabla de stock */}
      <TablaStock
        productos={productos}
        onActualizarProducto={modoEdicion ? actualizarProducto : undefined}
        onDesactivarProducto={modoEdicion ? desactivarProducto : undefined}
        modoEdicion={modoEdicion}
      />
    </div>
  );
}