export interface Pedido {
    id?: number;
    numero_pedido: string;
    client_id: number | null;
    nombre_cliente: string;
    telefono_cliente: string | null;
    tipo_entrega: 'retiro' | 'envio';
    tipo_envio: 'cercano' | 'lejano' | 'la_banda' | null;
    direccion: string | null;
    metodo_pago: string;
    con_chimichurri: boolean;
    con_papas: boolean;
    cantidad_papas: number;
    cantidad_pollo: number;
    precio_unitario: number;
    precio_total: number;
    fecha_pedido: string;
    hora_pedido: string;
    hora_entrega_solicitada: string;
    hora_entrega_real?: string | null;
    estado: 'pendiente' | 'preparando' | 'en_camino' | 'entregado' | 'cancelado';
  }
  
  export interface PedidoCreateRequest {
    nombre: string;
    telefono?: string;
    tipoEntrega: 'retiro' | 'envio';
    tipoEnvio?: 'cercano' | 'lejano' | 'la_banda';
    direccion?: string;
    metodoPago: string;
    conChimichurri?: boolean;
    conPapas?: boolean;
    cantidadPapas?: number;
    cantidadPollo: number;
    precioUnitario: number;
    horaEntrega: string;
    client_id?: number | null;
  }
  
  // Agrega esto a tus interfaces existentes
  export interface PedidoCreateResponse {
    pedidoId: number;
    numeroPedido: string;
    total: number;
  }
  export interface PedidoUpdateRequest extends PedidoCreateRequest {
    id: number;
  }
  
  export interface PedidoUpdateStatusRequest {
    id: number;
    estado: 'pendiente' | 'preparando' | 'en_camino' | 'entregado' | 'cancelado';
  }