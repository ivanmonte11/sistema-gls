import FormularioPedido from '../components/FormularioPedido';

export default function RegistrarPedidoPage() {
  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">Registrar Pedido</h1>
      <FormularioPedido />
    </div>
  );
}