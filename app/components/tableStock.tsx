'use client';
import { useEffect, useState } from 'react';

interface ProductoStock {
  id: number;
  producto: string;
  cantidad: number;
  precio: number | null;
  tipo_medida: string;
  categoria: string | null;
  activo: boolean;
}

interface TablaStockProps {
  productos: ProductoStock[];
  onActualizarProducto?: (id: number, datos: Partial<ProductoStock>) => void;
  onDesactivarProducto?: (id: number) => void;
  modoEdicion?: boolean;
}

export default function TablaStock({
  productos,
  onActualizarProducto,
  onDesactivarProducto,
  modoEdicion = false
}: TablaStockProps) {
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [formData, setFormData] = useState<Partial<ProductoStock>>({});
  const [productosLocales, setProductosLocales] = useState<ProductoStock[]>(productos);

  useEffect(() => {
    setProductosLocales(productos);
  }, [productos]);

  // TIPOS DE MEDIDA CORREGIDOS
  const tiposMedida = ['unidad', 'kilo', 'medio_kilo', 'gramo', 'litro', 'docena', 'media_docena', 'porcion', 'media_porcion'];
  const categorias = ['Pollos', 'Papas', 'Bebidas', 'Acompañamientos', 'Postres', 'Otros'];

  const iniciarEdicion = (producto: ProductoStock) => {
    setEditandoId(producto.id);
    setFormData({ ...producto });
  };

  const guardarEdicion = async () => {
    if (editandoId && formData && onActualizarProducto) {
      await onActualizarProducto(editandoId, formData);
      setEditandoId(null);
      setFormData({});
    }
  };

  const cancelarEdicion = () => {
    setEditandoId(null);
    setFormData({});
  };

  const handleDesactivarProducto = async (id: number) => {
    if (onDesactivarProducto) {
      await onDesactivarProducto(id);
    }
  };

  const formatNumber = (num: number) => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  const getLabelTipoMedida = (tipo: string) => {
    const labels: { [key: string]: string } = {
      unidad: 'unidades',
      kilo: 'kg',
      medio_kilo: '1/2 kg',
      gramo: 'g',
      litro: 'L',
      docena: 'docenas',
      media_docena: '1/2 docena',
      porcion: 'porciones',
      media_porcion: '1/2 porción' // CORREGIDO - faltaba coma
    };
    return labels[tipo] || tipo;
  };

  const getCantidadDisplay = (producto: ProductoStock) => {
    if (producto.tipo_medida === 'kilo' && producto.cantidad < 1) {
      return `${(producto.cantidad * 1000).toFixed(0)}g`;
    }

    // Mostrar de forma especial para medidas fraccionarias
    if (producto.tipo_medida === 'media_docena') {
      return `${producto.cantidad} 1/2 docena${producto.cantidad > 1 ? 's' : ''}`;
    }
    if (producto.tipo_medida === 'medio_kilo') {
      return `${producto.cantidad} 1/2 kg`;
    }
    if (producto.tipo_medida === 'media_porcion') {
      return `${producto.cantidad} 1/2 porción${producto.cantidad > 1 ? 'es' : ''}`;
    }

    return `${formatNumber(producto.cantidad)} ${getLabelTipoMedida(producto.tipo_medida)}`;
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">
        {modoEdicion ? 'Gestión de Productos' : 'Stock Disponible'}
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="p-3 font-medium text-gray-700">Producto</th>
              <th className="p-3 font-medium text-gray-700">Categoría</th>
              <th className="p-3 font-medium text-gray-700">Cantidad</th>
              <th className="p-3 font-medium text-gray-700">Precio Unitario</th>
              {modoEdicion && (
                <th className="p-3 font-medium text-gray-700">Acciones</th>
              )}
            </tr>
          </thead>
          <tbody>
            {productosLocales.filter(p => p.activo).map((producto) => (
              <tr key={producto.id} className="border-b hover:bg-gray-50 transition-colors">
                {editandoId === producto.id && modoEdicion ? (
                  // Modo edición
                  <>
                    <td className="p-3">
                      <input
                        type="text"
                        value={formData.producto || ''}
                        onChange={(e) => setFormData({...formData, producto: e.target.value})}
                        className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Nombre del producto"
                      />
                    </td>
                    <td className="p-3">
                      <select
                        value={formData.categoria || ''}
                        onChange={(e) => setFormData({...formData, categoria: e.target.value})}
                        className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Sin categoría</option>
                        {categorias.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </td>
                    <td className="p-3">
                      <div className="flex gap-2">
                        <input
                          type="number"
                          step="0.01"
                          value={formData.cantidad || 0}
                          onChange={(e) => setFormData({...formData, cantidad: parseFloat(e.target.value)})}
                          className="w-24 p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <select
                          value={formData.tipo_medida || 'unidad'}
                          onChange={(e) => setFormData({...formData, tipo_medida: e.target.value})}
                          className="w-32 p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          {tiposMedida.map(tipo => (
                            <option key={tipo} value={tipo}>
                              {getLabelTipoMedida(tipo)}
                            </option>
                          ))}
                        </select>
                      </div>
                    </td>
                    <td className="p-3">
                      <input
                        type="number"
                        step="0.01"
                        value={formData.precio || ''}
                        onChange={(e) => setFormData({...formData, precio: e.target.value ? parseFloat(e.target.value) : null})}
                        className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Precio opcional"
                      />
                    </td>
                    <td className="p-3">
                      <div className="flex gap-2">
                        <button
                          onClick={guardarEdicion}
                          className="bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center"
                        >
                          <span className="mr-1">✓</span> Guardar
                        </button>
                        <button
                          onClick={cancelarEdicion}
                          className="bg-gray-500 text-white px-3 py-2 rounded-lg hover:bg-gray-600 transition-colors flex items-center"
                        >
                          <span className="mr-1">✗</span> Cancelar
                        </button>
                      </div>
                    </td>
                  </>
                ) : (
                  // Modo visualización
                  <>
                    <td className="p-3 text-gray-800 font-medium">{producto.producto}</td>
                    <td className="p-3 text-gray-600">
                      {producto.categoria || <span className="text-gray-400">-</span>}
                    </td>
                    <td className="p-3 text-gray-800 font-medium">
                      {getCantidadDisplay(producto)}
                    </td>
                    <td className="p-3 text-gray-800 font-medium">
                      {producto.precio ? (
                        <span className="text-green-600">${formatNumber(producto.precio)}</span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    {modoEdicion && (
                      <td className="p-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => iniciarEdicion(producto)}
                            className="bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => handleDesactivarProducto(producto.id)}
                            className="bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700 transition-colors"
                          >
                            Desactivar
                          </button>
                        </div>
                      </td>
                    )}
                  </>
                )}
              </tr>
            ))}

            {productosLocales.filter(p => p.activo).length === 0 && (
              <tr>
                <td colSpan={modoEdicion ? 5 : 4} className="p-4 text-center text-gray-500">
                  No hay productos activos en stock
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}