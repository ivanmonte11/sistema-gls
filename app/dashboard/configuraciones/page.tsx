// app/dashboard/configuraciones/page.tsx
'use client';
import { useState, useEffect } from 'react';
import { Card, Title, TextInput, Button, Table, TableHead, TableRow, TableHeaderCell, TableBody, TableCell } from '@tremor/react';

interface PrecioConfig {
  id: number;
  item_key: string;
  item_name: string;
  item_value: number;
  description: string;
}

export default function ConfiguracionPrecios() {
  const [precios, setPrecios] = useState<PrecioConfig[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPrecios();
  }, []);

  const fetchPrecios = async () => {
    try {
      const res = await fetch('/api/precios');
      const data = await res.json();
      if (data.success) {
        setPrecios(data.data);
      }
    } catch (error) {
      console.error('Error fetching prices:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (id: number, newValue: number) => {
    try {
      const res = await fetch('/api/precios', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id, value: newValue }),
      });

      const data = await res.json();
      if (data.success) {
        fetchPrecios(); // Refresh data
      }
    } catch (error) {
      console.error('Error updating price:', error);
    }
  };

  if (loading) return <div>Cargando precios...</div>;

  return (
    <Card className="mt-6">
      <Title>Configuración de Precios</Title>
      
      <Table className="mt-4">
        <TableHead>
          <TableRow>
            <TableHeaderCell>Item</TableHeaderCell>
            <TableHeaderCell>Descripción</TableHeaderCell>
            <TableHeaderCell>Precio</TableHeaderCell>
            <TableHeaderCell>Acción</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {precios.map((item) => (
            <TableRow key={item.id}>
              <TableCell>{item.item_name}</TableCell>
              <TableCell>{item.description}</TableCell>
              <TableCell>
                <TextInput
                  type="number"
                  value={item.item_value.toString()}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    const newPrecios = [...precios];
                    const index = newPrecios.findIndex(p => p.id === item.id);
                    newPrecios[index].item_value = parseFloat(e.target.value) || 0;
                    setPrecios(newPrecios);
                  }}
                />
              </TableCell>
              <TableCell>
                <Button size="xs" onClick={() => handleUpdate(item.id, item.item_value)}>
                  Guardar
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}