'use client';

import { useState } from 'react';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

export default function SeedPage() {
  const [logs, setLogs] = useState<string[]>([]);
  const [cargando, setCargando] = useState(false);

  const agregarLog = (mensaje: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${mensaje}`]);
  };

  const cargarDatos = async () => {
    setCargando(true);
    setLogs([]);
    agregarLog('🌱 Iniciando carga de datos...');

    try {
      // Productos
      const productos = [
        { nombre: 'Tomate', precio: 2500, unidad: 'kg', stock_actual: 100, activo: true },
        { nombre: 'Palta', precio: 4500, unidad: 'kg', stock_actual: 50, activo: true },
        { nombre: 'Manzana', precio: 3000, unidad: 'kg', stock_actual: 80, activo: true },
        { nombre: 'Plátano', precio: 2000, unidad: 'kg', stock_actual: 120, activo: true },
        { nombre: 'Naranja', precio: 2200, unidad: 'kg', stock_actual: 90, activo: true },
        { nombre: 'Pan', precio: 1500, unidad: 'unid', stock_actual: 200, activo: true },
        { nombre: 'Leche', precio: 1800, unidad: 'unid', stock_actual: 50, activo: true },
        { nombre: 'Huevos (docena)', precio: 3500, unidad: 'unid', stock_actual: 30, activo: true },
        { nombre: 'Arroz', precio: 1800, unidad: 'kg', stock_actual: 150, activo: true },
        { nombre: 'Azúcar', precio: 1500, unidad: 'kg', stock_actual: 100, activo: true },
      ];

      agregarLog('📦 Creando productos...');
      for (const producto of productos) {
        const docRef = await addDoc(collection(db, 'productos'), {
          ...producto,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        });
        agregarLog(`  ✓ ${producto.nombre} - ID: ${docRef.id}`);
      }

      // Clientes
      const clientes = [
        { nombre: 'Juan Pérez', telefono: '+56912345678', saldo_deuda: 0, activo: true },
        { nombre: 'María González', telefono: '+56987654321', saldo_deuda: 15000, activo: true },
        { nombre: 'Pedro Rodríguez', telefono: '+56923456789', saldo_deuda: 8500, activo: true },
        { nombre: 'Ana Martínez', telefono: '+56934567890', saldo_deuda: 0, activo: true },
        { nombre: 'Carlos López', telefono: '+56945678901', saldo_deuda: 12000, activo: true },
      ];

      agregarLog('👥 Creando clientes...');
      for (const cliente of clientes) {
        const docRef = await addDoc(collection(db, 'clientes'), {
          ...cliente,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        });
        agregarLog(`  ✓ ${cliente.nombre} - Deuda: $${cliente.saldo_deuda} - ID: ${docRef.id}`);
      }

      agregarLog('✅ ¡Datos cargados exitosamente!');
      agregarLog('');
      agregarLog('📋 Próximos pasos:');
      agregarLog('1. Ve a /dashboard para gestionar la caja');
      agregarLog('2. Abre una sesión de caja');
      agregarLog('3. Ve a /ventas para comenzar a vender');

    } catch (error: any) {
      agregarLog(`❌ Error: ${error.message}`);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <Card className="max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle>Cargar Datos de Prueba</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Esta página cargará datos de prueba en Firestore: productos y clientes.
          </p>

          <Button 
            onClick={cargarDatos} 
            disabled={cargando}
            className="w-full"
            size="lg"
          >
            {cargando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {cargando ? 'Cargando datos...' : 'Cargar Datos de Prueba'}
          </Button>

          {logs.length > 0 && (
            <div className="bg-black text-green-400 p-4 rounded-lg font-mono text-sm h-96 overflow-y-auto">
              {logs.map((log, i) => (
                <div key={i} className="mb-1">{log}</div>
              ))}
            </div>
          )}

          <div className="text-sm text-muted-foreground space-y-2">
            <p><strong>Datos que se crearán:</strong></p>
            <ul className="list-disc list-inside space-y-1">
              <li>10 productos (frutas, verduras, abarrotes)</li>
              <li>5 clientes con diferentes saldos de deuda</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
