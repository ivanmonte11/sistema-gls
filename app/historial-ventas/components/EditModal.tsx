'use client';

import { useState } from 'react';
import { Pedido } from '../types/pedidos.types';

interface EditModalProps {
  pedido: Pedido;
  onClose: () => void;
  onSave: (pedido: Pedido) => Promise<{ success: boolean; message?: string; error?: string }>;
  isEditing: boolean;
  error: string | null;
  setError: (error: string | null) => void;
}

export const EditModal = ({ pedido, onClose, onSave, isEditing, error, setError }: EditModalProps) => {
  const [pedidoEditado, setPedidoEditado] = useState<Pedido>({ ...pedido });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const result = await onSave(pedidoEditado);
    if (result.success) {
      onClose(); // Solo cerrar si fue exitoso
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">Editar Pedido #{pedidoEditado.numero_pedido}</h2>

        {error && <div className="bg-red-100 text-red-700 p-2 mb-4 rounded">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block mb-1 font-medium">Nombre</label>
              <input
                type="text"
                value={pedidoEditado.nombre_cliente}
                onChange={(e) => setPedidoEditado({
                  ...pedidoEditado,
                  nombre_cliente: e.target.value
                })}
                className="w-full p-2 border rounded"
                required
              />
            </div>

            <div>
              <label className="block mb-1 font-medium">Teléfono</label>
              <input
                type="text"
                value={pedidoEditado.telefono_cliente || ''}
                onChange={(e) => setPedidoEditado({
                  ...pedidoEditado,
                  telefono_cliente: e.target.value
                })}
                className="w-full p-2 border rounded"
              />
            </div>

            <div>
              <label className="block mb-1 font-medium">Tipo de Entrega</label>
              <select
                value={pedidoEditado.tipo_entrega}
                onChange={(e) => setPedidoEditado({
                  ...pedidoEditado,
                  tipo_entrega: e.target.value as 'retira' | 'envio'
                })}
                className="w-full p-2 border rounded"
              >
                <option value="retira">Retira</option>
                <option value="envio">Envío</option>
              </select>
            </div>

            {pedidoEditado.tipo_entrega === 'envio' && (
              <div>
                <label className="block mb-1 font-medium">Tipo de Envío</label>
                <select
                  value={pedidoEditado.tipo_envio || ''}
                  onChange={(e) => setPedidoEditado({
                    ...pedidoEditado,
                    tipo_envio: e.target.value as 'cercano' | 'lejano' | 'la_banda' | 'gratis' | null
                  })}
                  className="w-full p-2 border rounded"
                >
                  <option value="cercano">Cercano</option>
                  <option value="lejano">Lejano</option>
                  <option value="la_banda">La Banda</option>
                  <option value="gratis">Gratis</option>
                </select>
              </div>
            )}

            {pedidoEditado.tipo_entrega === 'envio' && (
              <div className="md:col-span-2">
                <label className="block mb-1 font-medium">Dirección</label>
                <input
                  type="text"
                  value={pedidoEditado.direccion || ''}
                  onChange={(e) => setPedidoEditado({
                    ...pedidoEditado,
                    direccion: e.target.value
                  })}
                  className="w-full p-2 border rounded"
                />
              </div>
            )}

            <div>
              <label className="block mb-1 font-medium">Método de Pago</label>
              <select
                value={pedidoEditado.metodo_pago}
                onChange={(e) => setPedidoEditado({
                  ...pedidoEditado,
                  metodo_pago: e.target.value
                })}
                className="w-full p-2 border rounded"
              >
                <option value="efectivo">Efectivo</option>
                <option value="debito">Débito</option>
                <option value="credito">Crédito</option>
                <option value="transferencia">Transferencia</option>
              </select>
            </div>

            <div>
  <label className="block mb-1 font-medium">Cantidad de Pollos</label>
  <input
    type="number"
    value={
      pedidoEditado.cantidad_pollo === 0
        ? ''
        : Number.isInteger(pedidoEditado.cantidad_pollo)
          ? pedidoEditado.cantidad_pollo // Mostrar como número entero directamente
          : pedidoEditado.cantidad_pollo // Mostrar decimales para medios pollos
    }
    onChange={(e) => {
      if (e.target.value === '') {
        setPedidoEditado({
          ...pedidoEditado,
          cantidad_pollo: 0
        });
        return;
      }

      const value = parseFloat(e.target.value);
      if (!isNaN(value) && value >= 0.5 && value % 0.5 === 0) {
        setPedidoEditado({
          ...pedidoEditado,
          cantidad_pollo: value
        });
      }
    }}
    onBlur={(e) => {
      if (e.target.value === '') {
        setPedidoEditado({
          ...pedidoEditado,
          cantidad_pollo: 0.5
        });
      }
    }}
    step="0.5"
    min="0.5"
    className="w-full p-2 border rounded"
    required
    placeholder="0.5"
  />
  <p className="text-sm text-gray-500 mt-1">Ej: 0.5, 1, 1.5, 2, etc. (Mínimo 0.5)</p>
</div>

            <div className="flex items-center">
              <input
                type="checkbox"
                checked={pedidoEditado.con_chimichurri}
                onChange={(e) => setPedidoEditado({
                  ...pedidoEditado,
                  con_chimichurri: e.target.checked
                })}
                className="mr-2"
              />
              <label>Con Chimichurri</label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                checked={pedidoEditado.con_papas}
                onChange={(e) => setPedidoEditado({
                  ...pedidoEditado,
                  con_papas: e.target.checked
                })}
                className="mr-2"
              />
              <label>Con Papas</label>
            </div>

            {pedidoEditado.con_papas && (
              <div>
                <label className="block mb-1 font-medium">Cantidad de Papas</label>
                <input
                  type="number"
                  value={pedidoEditado.cantidad_papas === 0 ? '' : pedidoEditado.cantidad_papas}
                  onChange={(e) => setPedidoEditado({
                    ...pedidoEditado,
                    cantidad_papas: parseInt(e.target.value) || 0
                  })}
                  min="0"
                  className="w-full p-2 border rounded"
                  placeholder="0"
                />
              </div>
            )}

            <div>
              <label className="block mb-1 font-medium">Hora de Entrega</label>
              <input
                type="time"
                value={pedidoEditado.hora_entrega_solicitada || ''}
                onChange={(e) => setPedidoEditado({
                  ...pedidoEditado,
                  hora_entrega_solicitada: e.target.value
                })}
                className="w-full p-2 border rounded"
                required
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded hover:bg-gray-100"
              disabled={isEditing}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              disabled={isEditing}
            >
              {isEditing ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};