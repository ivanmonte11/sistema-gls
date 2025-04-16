"use client";

import { useState, useEffect } from 'react';
import TablaStock from '../components/tableStock';

export default function GestionStockPage() {
  const [stockData, setStockData] = useState<{ cantidad: number; precio?: number }>({
    cantidad: 0,
    precio: undefined,
  });
  const [nuevoStock, setNuevoStock] = useState<number | ''>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    obtenerStock();
  }, []);

  const obtenerStock = async () => {
    try {
      const res = await fetch('/api/stock');
      if (res.ok) {
        const data = await res.json();
        setStockData({
          cantidad: data.cantidad,
          precio: data.precio,
        });
      }
    } catch (error) {
      console.error('Error al obtener stock:', error);
    }
  };

  const agregarStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (nuevoStock === '' || nuevoStock <= 0) return;

    setIsLoading(true);
    try {
      const res = await fetch('/api/stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cantidad: nuevoStock }),
      });
      if (res.ok) {
        setNuevoStock('');
        obtenerStock();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const resetearStock = async () => {
    if (!confirm('¿Resetear stock a 0?')) return;
    setIsResetting(true);
    try {
      const res = await fetch('/api/stock', { method: 'DELETE' });
      if (res.ok) obtenerStock();
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-6">Gestión de Stock</h1>

      {/* Tarjeta de acciones compacta */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          {/* Formulario compacto */}
          <form onSubmit={agregarStock} className="flex-1 flex gap-2 w-full">
            <input
              type="number"
              placeholder="Cantidad"
              value={nuevoStock}
              onChange={(e) => setNuevoStock(e.target.value === '' ? '' : Number(e.target.value))}
              className="flex-1 min-w-0 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              min="1"
              required
            />
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
            >
              {isLoading ? (
                <>
                  <Spinner /> Agregando
                </>
              ) : (
                'Agregar'
              )}
            </button>
          </form>

          {/* Botón de reset compacto */}
          <button
            onClick={resetearStock}
            disabled={isResetting}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors w-full sm:w-auto flex items-center justify-center"
          >
            {isResetting ? (
              <>
                <Spinner /> Reseteando
              </>
            ) : (
              'Resetear a 0'
            )}
          </button>
        </div>
      </div>

      {/* Tabla de stock */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <TablaStock stock={stockData.cantidad} precio={stockData.precio} />
      </div>
    </div>
  );
}

// Componente Spinner reutilizable
function Spinner() {
  return (
    <svg
      className="animate-spin h-5 w-5 mr-2 text-white"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      ></path>
    </svg>
  );
}