'use client';

import { useState } from 'react';
import { auth, db } from '@/lib/firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { collection, addDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function TestFirebasePage() {
  const [resultado, setResultado] = useState<string[]>([]);

  const agregarLog = (mensaje: string) => {
    setResultado(prev => [...prev, `${new Date().toLocaleTimeString()}: ${mensaje}`]);
  };

  const testConexion = async () => {
    agregarLog('🔍 Iniciando pruebas de Firebase...');
    
    // Test 1: Verificar configuración
    agregarLog(`✓ API Key: ${process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.substring(0, 10)}...`);
    agregarLog(`✓ Auth Domain: ${process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN}`);
    agregarLog(`✓ Project ID: ${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}`);
    
    // Test 2: Verificar Auth
    try {
      agregarLog('📝 Intentando crear usuario de prueba...');
      const email = `test${Date.now()}@test.com`;
      const password = 'Test123456';
      
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      agregarLog(`✅ Usuario creado: ${userCredential.user.uid}`);
      
      // Test 3: Intentar login
      agregarLog('🔐 Intentando login...');
      await signInWithEmailAndPassword(auth, email, password);
      agregarLog('✅ Login exitoso!');
      
    } catch (error: any) {
      agregarLog(`❌ Error: ${error.code} - ${error.message}`);
    }
    
    // Test 4: Verificar Firestore
    try {
      agregarLog('💾 Probando Firestore...');
      const docRef = await addDoc(collection(db, 'test'), {
        mensaje: 'Test de conexión',
        timestamp: new Date()
      });
      agregarLog(`✅ Firestore OK - Doc ID: ${docRef.id}`);
    } catch (error: any) {
      agregarLog(`❌ Firestore Error: ${error.code} - ${error.message}`);
    }
  };

  const testUsuarioReal = async () => {
    agregarLog('🔐 Probando crear usuario real...');
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        'nicolasmacortesgallardo@gmail.com',
        'Admin123'
      );
      agregarLog(`✅ Usuario real creado: ${userCredential.user.uid}`);
      agregarLog(`📧 Email: ${userCredential.user.email}`);
    } catch (error: any) {
      agregarLog(`❌ Error: ${error.code}`);
      agregarLog(`📝 Mensaje: ${error.message}`);
      
      if (error.code === 'auth/email-already-in-use') {
        agregarLog('⚠️ El usuario ya existe. Intentando login...');
        try {
          await signInWithEmailAndPassword(auth, 'nicolasmacortesgallardo@gmail.com', 'Admin123');
          agregarLog('✅ Login exitoso con usuario existente!');
        } catch (loginError: any) {
          agregarLog(`❌ Login falló: ${loginError.code} - ${loginError.message}`);
        }
      }
    }
  };

  return (
    <div className="min-h-screen p-8 bg-background">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Diagnóstico de Firebase</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button onClick={testConexion}>
              Probar Conexión Firebase
            </Button>
            <Button onClick={testUsuarioReal} variant="secondary">
              Crear Usuario Real
            </Button>
            <Button onClick={() => setResultado([])} variant="outline">
              Limpiar
            </Button>
          </div>

          <div className="bg-black text-green-400 p-4 rounded-lg font-mono text-sm h-96 overflow-y-auto">
            {resultado.length === 0 ? (
              <p className="text-gray-500">Haz clic en un botón para comenzar las pruebas...</p>
            ) : (
              resultado.map((log, i) => (
                <div key={i} className="mb-1">{log}</div>
              ))
            )}
          </div>

          <div className="text-sm text-muted-foreground">
            <p><strong>Instrucciones:</strong></p>
            <ol className="list-decimal list-inside space-y-1 mt-2">
              <li>Haz clic en "Probar Conexión Firebase" para diagnosticar</li>
              <li>Revisa los mensajes en la consola negra</li>
              <li>Si todo está OK, haz clic en "Crear Usuario Real"</li>
              <li>Copia cualquier error que veas aquí</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
