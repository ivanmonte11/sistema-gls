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

  // Obtener el stock actual al cargar la página
  useEffect(() => {
    obtenerStock();
  }, []);

  // Función para obtener el stock actual
  const obtenerStock = async () => {
    try {
      const res = await fetch('/api/stock');
      if (res.ok) {
        const data = await res.json();
        console.log("Datos recibidos del API:", data); // Para debug
        setStockData({
          cantidad: data.cantidad,
          precio: data.precio,
        });
      } else {
        alert('Error al obtener el stock');
      }
    } catch (error) {
      alert('Error al conectar con el servidor');
    }
  };

  // Función para agregar nuevo stock (se mantiene igual)
  const agregarStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (nuevoStock === '' || nuevoStock <= 0) {
      alert('Ingresa una cantidad válida');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/stock', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ cantidad: nuevoStock }),
      });

      if (res.ok) {
        alert('Stock actualizado con éxito');
        setNuevoStock('');
        obtenerStock(); // Actualizar la tabla de stock
      } else {
        alert('Error al actualizar el stock');
      }
    } catch (error) {
      alert('Error al conectar con el servidor');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">Gestión de Stock</h1>

      {/* Formulario para agregar stock (se mantiene igual) */}
      <form onSubmit={agregarStock} className="bg-white p-6 rounded-lg shadow-md mb-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Agregar Stock</h2>
        <div className="flex items-center space-x-4">
          <input
            type="number"
            placeholder="Cantidad de pollos"
            value={nuevoStock}
            onChange={(e) => setNuevoStock(e.target.value === '' ? '' : Number(e.target.value))}
            className="w-full p-2 border rounded"
            min="1"
            required
          />
          <button
            type="submit"
            disabled={isLoading}
            className="p-2 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center justify-center"
          >
            {isLoading ? (
              <div className="flex items-center">
                <svg
                  className="animate-spin h-5 w-5 mr-3 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Procesando...
              </div>
            ) : (
              'Agregar'
            )}
          </button>
        </div>
      </form>

      {/* Tabla de stock disponible - Ahora pasamos ambos valores */}
      <TablaStock stock={stockData.cantidad} precio={stockData.precio} />
    </div>
  );
}