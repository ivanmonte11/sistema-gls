"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type Client = {
  id: number;
  name: string;
  phone: string;
  address: string;
  created_at: string;
};

export default function GestionClientes() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0
  });
  const router = useRouter();

  useEffect(() => {
    fetchClients();
  }, [pagination.page, searchTerm]);

  const fetchClients = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/clients?search=${searchTerm}&page=${pagination.page}&limit=${pagination.limit}`
      );
      const data = await res.json();

      if (data.success) {
        setClients(data.data);
        setPagination(prev => ({
          ...prev,
          total: data.total
        }));
      }
    } catch (error) {
      console.error('Error fetching clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPagination(prev => ({ ...prev, page: 1 }));
    fetchClients();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-AR');
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Gestión de Clientes</h1>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-6">
          <form onSubmit={handleSearch} className="flex">
            <input
              type="text"
              placeholder="Buscar por nombre o teléfono..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="p-2 border rounded-l"
            />
            <button
              type="submit"
              className="bg-blue-500 text-white p-2 rounded-r hover:bg-blue-600"
            >
              Buscar
            </button>
          </form>

          <Link href="/gestion-clientes/nuevo">
            <button className="bg-green-500 text-white p-2 rounded hover:bg-green-600">
              Nuevo Cliente
            </button>
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-8">Cargando clientes...</div>
        ) : clients.length === 0 ? (
          <div className="text-center py-8">
            {searchTerm ? 'No se encontraron clientes' : 'No hay clientes registrados'}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="py-2 px-4 text-left">Nombre</th>
                    <th className="py-2 px-4 text-left">Teléfono</th>
                    <th className="py-2 px-4 text-left">Dirección</th>
                    <th className="py-2 px-4 text-left">Registrado</th>
                    <th className="py-2 px-4 text-left">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map((client) => (
                    <tr key={client.id} className="border-b">
                      <td className="py-2 px-4">{client.name}</td>
                      <td className="py-2 px-4">{client.phone || '-'}</td>
                      <td className="py-2 px-4">{client.address || '-'}</td>
                      <td className="py-2 px-4">{formatDate(client.created_at)}</td>
                      <td className="py-2 px-4">
                        <div className="flex gap-2">
                          <Link href={`/gestion-clientes/${client.id}`}>
                            <button className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600">
                              Editar
                            </button>
                          </Link>
                          <Link href={`/gestion-clientes/${client.id}/historial`}>
                            <button className="bg-gray-500 text-white px-3 py-1 rounded hover:bg-gray-600">
                              Ver Historial
                            </button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center mt-4">
              <div>
                Mostrando {clients.length} de {pagination.total} clientes
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setPagination(prev => ({
                    ...prev,
                    page: Math.max(1, prev.page - 1)
                  }))}
                  disabled={pagination.page === 1}
                  className="p-2 border rounded disabled:opacity-50"
                >
                  Anterior
                </button>
                <button
                  onClick={() => setPagination(prev => ({
                    ...prev,
                    page: prev.page + 1
                  }))}
                  disabled={pagination.page * pagination.limit >= pagination.total}
                  className="p-2 border rounded disabled:opacity-50"
                >
                  Siguiente
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}