// Tipo para los ítems de stock
export interface StockItem {
    producto: string;
    cantidad: number;
    fecha_actualizacion: string;
    unidad_medida?: string;
    descripcion?: string;
  }
  
  // Tipo extendido para incluir cambios de stock (usado en PATCH)
  export interface StockItemConCambios extends StockItem {
    anterior: number;
    diferencia: number;
    stock_minimo?: number;
    stock_maximo?: number;
  }
  
  // Tipo para la respuesta del stock
  export interface StockResponse {
    success: boolean;
    data: StockItemConConfig[]; // aquí se usa el nuevo tipo extendido
    error?: string;
    details?: string | null;
  } 
  
  // Tipo para la actualización de stock
  export interface StockUpdateRequest {
    producto: string;
    cantidad: number;
    accion?: 'incrementar' | 'decrementar' | 'establecer';
  }
  
  // Tipo para la respuesta de actualización de stock
  export interface StockUpdateResponse {
    success: boolean;
    message?: string;
    data?: StockItemConCambios;
    error?: string;
    detalles?: {
      anterior: number;
      nuevo: number;
      diferencia?: number;
    };
  }
  
  // Tipo para la configuración de productos en stock
  export interface ProductoStockConfig {
    producto: string;
    stock_minimo: number;
    stock_maximo: number;
    alerta_reposicion: boolean;
  }
  
  // Tipo para la verificación de stock
  export interface StockVerificacion {
    producto: string;
    cantidadRequerida: number;
    suficiente: boolean;
    disponible: number;
    necesitaReposicion?: boolean;
  }
  
  // Para GET: StockItem extendido con configuración
export interface StockItemConConfig extends StockItem {
    stock_minimo?: number;
    stock_maximo?: number;
    necesita_reposicion?: boolean;
  }