interface TablaStockProps {
  stock: number;
  precio?: number; // Hacerlo opcional
}

export default function TablaStock({ stock, precio = 20000 }: TablaStockProps) {
  // Función para formatear números con puntos de miles
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
                {typeof precio === 'number' ? (
                  <span className="text-green-600">${formatNumber(precio)}</span>
                ) : (
                  <span className="text-gray-400">N/A</span>
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}