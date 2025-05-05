"use client";
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

export default function EditarClientePage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: ''
  });
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [error, setError] = useState('');

  // Cargar datos del cliente al iniciar
  useEffect(() => {
    const fetchClient = async () => {
        try {
          const res = await fetch(`/api/clients/${id}`);
          
          // Verificar si la respuesta es OK antes de parsear JSON
          if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.error || 'Error al cargar cliente');
          }
          
          const { data } = await res.json();
          
          setFormData({
            name: data.name,
            phone: data.phone || '',
            address: data.address || ''
          });
          
        } catch (err) {
          console.error(err);
          setError(err instanceof Error ? err.message : 'Error desconocido');
        } finally {
          setLoading(false);
        }
      };
    
    fetchClient();
  }, [id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setError('El nombre es requerido');
      return;
    }
    
    setSaveLoading(true);
    setError('');
    
    try {
      const response = await fetch(`/api/clients/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
  
      // Verificar si la respuesta es JSON
      const contentType = response.headers.get('content-type');
      if (!contentType?.includes('application/json')) {
        const text = await response.text();
        throw new Error(text || 'Respuesta no válida del servidor');
      }
  
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Error al actualizar cliente');
      }
      
      router.push('/gestion-clientes');
    } catch (err) {
      console.error('Error al actualizar:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('¿Estás seguro de eliminar este cliente?')) return;
    
    try {
      const response = await fetch(`/api/clients/${id}`, {
        method: 'DELETE',
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Error al eliminar cliente');
      }
      
      router.push('/gestion-clientes');
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Error al eliminar cliente');
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-4">
        <div className="text-center py-8">Cargando cliente...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Editar Cliente</h1>
        <button 
          onClick={() => router.push('/gestion-clientes')}
          className="bg-gray-500 text-white p-2 rounded hover:bg-gray-600"
        >
          Volver
        </button>
      </div>
      
      <div className="bg-white rounded-lg shadow p-6">
        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-700 mb-1">Nombre*</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full p-2 border rounded"
              required
            />
          </div>
          
          <div>
            <label className="block text-gray-700 mb-1">Teléfono</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="w-full p-2 border rounded"
            />
          </div>
          
          <div>
            <label className="block text-gray-700 mb-1">Dirección</label>
            <textarea
              name="address"
              value={formData.address}
              onChange={handleChange}
              className="w-full p-2 border rounded"
              rows={3}
            />
          </div>
          
          <div className="flex justify-between">
            <button
              type="button"
              onClick={handleDelete}
              className="bg-red-500 text-white p-2 rounded hover:bg-red-600"
            >
              Eliminar Cliente
            </button>
            
            <button
              type="submit"
              disabled={saveLoading}
              className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600 disabled:bg-blue-300"
            >
              {saveLoading ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}