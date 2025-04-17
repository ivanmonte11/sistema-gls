'use client';
import { useEffect, useState } from 'react';

interface TablaStockProps {
  stock: number;
  precio?: number; // Aún puede pasarse manualmente
}

export default function TablaStock({ stock, precio }: TablaStockProps) {
  const [precioFinal, setPrecioFinal] = useState<number | undefined>(precio);

  useEffect(() => {
    // Solo buscar si no vino desde props
    if (precio === undefined) {
      fetch('/api/precios')
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            const pollo = data.data.find((item: any) => item.item_key === 'pollo_precio');
            if (pollo) {
              setPrecioFinal(pollo.item_value);
            }
          }
        })
        .catch(err => {
          console.error('Error fetching pollo_precio:', err);
        });
    }
  }, [precio]);

  const formatNumber = (num: number) => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">Stock Disponible</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="p-3 font-medium text-gray-700">Producto</th>
              <th className="p-3 font-medium text-gray-700">Cantidad</th>
              <th className="p-3 font-medium text-gray-700">Precio Unitario</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b hover:bg-gray-50 transition-colors">
              <td className="p-3 text-gray-600">Pollo</td>
              <td className="p-3 text-gray-800 font-medium">{formatNumber(stock)}</td>
              <td className="p-3 text-gray-800 font-medium">
                {typeof precioFinal === 'number' ? (
                  <span className="text-green-600">${formatNumber(precioFinal)}</span>
                ) : (
                  <span className="text-gray-400">Cargando...</span>
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
