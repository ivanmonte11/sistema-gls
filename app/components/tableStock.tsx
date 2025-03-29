interface TablaStockProps {
  stock: number;
  precio?: number; // Hacerlo opcional
}

export default function TablaStock({ stock, precio }: TablaStockProps) {
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
              <td className="p-3 text-gray-800 font-medium">{stock}</td>
              <td className="p-3 text-gray-800 font-medium">
                {typeof precio === 'number' ? (
                  <span className="text-green-600">${precio.toFixed(2)}</span>
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