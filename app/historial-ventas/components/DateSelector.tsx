'use client';

import { isSameDay } from 'date-fns';
import { formatFecha } from '../utils/formatters';

interface DateSelectorProps {
  fechaSeleccionada: Date;
  cambiarDia: (dias: number) => void;
  irADiaActual: () => void;
}

export const DateSelector = ({ fechaSeleccionada, cambiarDia, irADiaActual }: DateSelectorProps) => {
  return (
    <div className="flex items-center justify-between mb-6 bg-white p-4 rounded-lg shadow">
      <button
        onClick={() => cambiarDia(-1)}
        className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
      >
        &larr; Día anterior
      </button>

      <div className="text-center">
        <h2 className="text-xl font-semibold">
          {formatFecha(fechaSeleccionada)}
        </h2>
        {!isSameDay(fechaSeleccionada, new Date()) && (
          <button
            onClick={irADiaActual}
            className="text-sm text-blue-600 hover:underline mt-1"
          >
            Volver al día actual
          </button>
        )}
      </div>

      <button
        onClick={() => cambiarDia(1)}
        disabled={isSameDay(fechaSeleccionada, new Date())}
        className={`px-4 py-2 rounded ${isSameDay(fechaSeleccionada, new Date()) ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-gray-200 hover:bg-gray-300'}`}
      >
        Día siguiente &rarr;
      </button>
    </div>
  );
};