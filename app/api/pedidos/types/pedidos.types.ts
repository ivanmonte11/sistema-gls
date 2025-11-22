export interface ItemPedido {
  producto_id: number;
  producto_nombre: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  tipo_medida: string;
  observaciones?: string;
}

export interface Pedido {
  id?: number;
  numero_pedido: string;
  client_id: number | null;
  nombre_cliente: string;
  telefono_cliente: string | null;
  tipo_entrega: 'retira' | 'envio'; // Cambié 'retiro' por 'retira' para consistencia
  tipo_envio: 'cercano' | 'lejano' | 'la_banda' | 'gratis' | null;
  direccion: string | null;
  metodo_pago: 'efectivo' | 'debito' | 'credito' | 'transferencia';
  con_chimichurri: boolean;
  // ELIMINADOS: con_papas, cantidad_papas, cantidad_pollo, precio_unitario
  precio_total: number;
  fecha_pedido: string;
  hora_pedido: string;
  hora_entrega_solicitada: string;
  hora_entrega_real?: string | null;
  estado: 'pendiente' | 'preparando' | 'en_camino' | 'entregado' | 'cancelado';
  cliente_eventual: boolean;
  impreso: boolean;
  // NUEVO: items del pedido
  items: ItemPedido[];
}

export interface PedidoCreateRequest {
  nombre: string;
  telefono?: string;
  tipoEntrega: 'retira' | 'envio'; // Cambié 'retiro' por 'retira'
  tipoEnvio?: 'cercano' | 'lejano' | 'la_banda' | 'gratis';
  direccion?: string;
  metodoPago: 'efectivo' | 'debito' | 'credito' | 'transferencia';
  conChimichurri?: boolean;
  // ELIMINADOS: conPapas, cantidadPapas, cantidadPollo, precioUnitario
  // NUEVO: items y precioTotal
  items: ItemPedido[];
  precioTotal: number;
  horaEntrega: string;
  clienteEventual?: boolean;
  client_id?: number | null;
}

export interface PedidoCreateResponse {
  pedidoId: number;
  numeroPedido: string;
  total: number;
}

export interface PedidoUpdateRequest extends Omit<PedidoCreateRequest, 'client_id'> {
  id: number | string;
}

export interface PedidoUpdateStatusRequest {
  id: number;
  estado: 'pendiente' | 'preparando' | 'en_camino' | 'entregado' | 'cancelado';
}

// También necesitamos actualizar la interfaz para el frontend
export interface PedidoFrontend {
  id: number;
  numero_pedido: string;
  nombre_cliente: string;
  telefono_cliente: string | null;
  tipo_entrega: 'retira' | 'envio';
  tipo_envio: 'cercano' | 'lejano' | 'la_banda' | 'gratis' | null;
  direccion: string | null;
  metodo_pago: string;
  con_chimichurri: boolean;
  precio_total: number;
  fecha_pedido: string;
  hora_pedido: string;
  hora_entrega_solicitada: string;
  hora_entrega_real: string | null;
  estado: string;
  cliente_eventual: boolean;
  impreso: boolean;
  items: ItemPedido[];
  nombre_cliente_completo?: string;
  client_id?: number;
}