export interface Pedido {
    id: number;
    numero_pedido: string;
    nombre_cliente: string;
    telefono_cliente?: string;
    tipo_entrega: 'retira' | 'envio';
    tipo_envio: 'cercano' | 'lejano' | 'la_banda' | 'gratis' | null;
    direccion?: string;
    metodo_pago: string;
    con_chimichurri: boolean;
    con_papas: boolean;
    cantidad_papas: number;
    cantidad_pollo: number;
    precio_unitario: number;
    precio_total: number | string;
    fecha: string;
    hora_pedido: string;
    fecha_pedido: string;
    hora_entrega_solicitada: string | null;
    estado?: string;
    hora_entrega_real?: string | null;
  }
  
  export interface Estadisticas {
    total: number;
    ventas_totales: number;
    promedio: number;
  }
  
  export interface TotalesPorMetodo {
    efectivo: number;
    debito: number;
    credito: number;
    transferencia: number;
  }
  
  export interface TablasProps {
    activeTab: 'todos' | 'entregados';
    setActiveTab: (tab: 'todos' | 'entregados') => void;
    pedidos: Pedido[];
    pedidosEntregados: Pedido[];
    setPedidoAEditar: (pedido: Pedido | null) => void;
    actualizarEstadoPedido: (id: number, estado: string) => Promise<boolean>;
  }