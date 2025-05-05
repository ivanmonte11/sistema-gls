import { NextResponse } from 'next/server';
import { 
  obtenerStock, 
  actualizarStock,
  obtenerConfiguracionProducto
} from '../services/stock.service';
import { validarActualizacionStock } from '../utils/validators.utils';
import { StockUpdateRequest, StockResponse, StockUpdateResponse } from '../types/stock.types';

export async function GET(): Promise<NextResponse<StockResponse>> {
    try {
      const stock = await obtenerStock();
  
      const stockConConfig = await Promise.all(
        stock.map(async item => {
          const config = await obtenerConfiguracionProducto(item.producto);
          return {
            ...item,
            stock_minimo: config?.stock_minimo,
            stock_maximo: config?.stock_maximo,
            necesita_reposicion: config 
              ? item.cantidad <= config.stock_minimo 
              : undefined
          };
        })
      );
  
      return NextResponse.json({
        success: true,
        data: stockConConfig
      });
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      console.error('Error en GET /api/stock:', errorMessage);
  
      return NextResponse.json({
        success: false,
        data: [],
        error: 'Error al obtener stock',
        details: process.env.NODE_ENV === 'development' ? errorMessage : null
      }, { status: 500 });
    }
  }
  
  import { StockItemConCambios } from '../types/stock.types';

export async function PATCH(request: Request): Promise<NextResponse<StockUpdateResponse>> {
    try {
      if (!request.headers.get('content-type')?.includes('application/json')) {
        return NextResponse.json({
          success: false,
          data: undefined,
          error: 'Content-Type debe ser application/json'
        }, { status: 400 });
      }
  
      const data: StockUpdateRequest = await request.json();
      const { isValid, errors } = validarActualizacionStock(data);
      
      if (!isValid) {
        return NextResponse.json({
          success: false,
          data: undefined,
          error: 'Datos inválidos',
          details: errors
        }, { status: 400 });
      }
  
      const stockActualizado = await actualizarStock(data) as StockItemConCambios;

      const config = await obtenerConfiguracionProducto(data.producto);
  
      // Desestructuramos para seguridad de tipos
      const { anterior, cantidad, diferencia, ...resto } = stockActualizado;
  
      return NextResponse.json({
        success: true,
        message: 'Stock actualizado correctamente',
        data: {
          ...resto,
          cantidad,
          anterior,
          diferencia,
          stock_minimo: config?.stock_minimo,
          stock_maximo: config?.stock_maximo
        },
        detalles: {
          anterior,
          nuevo: cantidad,
          diferencia
        }
      });
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      console.error('Error en PATCH /api/stock:', errorMessage);
  
      return NextResponse.json({
        success: false,
        data: undefined,
        error: 'Error al actualizar stock',
        details: process.env.NODE_ENV === 'development' ? errorMessage : null
      }, { status: 500 });
    }
  }
  