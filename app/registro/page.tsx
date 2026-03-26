'use client';

import { useState } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter } from 'next/navigation';

export default function RegistroPage() {
  const [email, setEmail] = useState('nicolasmacortesgallardo@gmail.com');
  const [password, setPassword] = useState('Admin123');
  const [mensaje, setMensaje] = useState('');
  const [cargando, setCargando] = useState(false);
  const router = useRouter();

  const handleRegistro = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensaje('');
    setCargando(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      setMensaje(`✅ Usuario creado exitosamente! UID: ${userCredential.user.uid}`);
      
      setTimeout(() => {
        router.push('/');
      }, 2000);
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        setMensaje('⚠️ Este email ya está registrado. Puedes iniciar sesión directamente.');
        setTimeout(() => {
          router.push('/');
        }, 2000);
      } else {
        setMensaje(`❌ Error: ${error.message}`);
      }
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Crear Usuario Administrador</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegistro} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Email</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-1"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">Contraseña</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="mt-1"
              />
            </div>

            {mensaje && (
              <div className={`p-3 rounded-md text-sm ${
                mensaje.includes('✅') ? 'bg-green-100 text-green-800' :
                mensaje.includes('⚠️') ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }`}>
                {mensaje}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={cargando}>
              {cargando ? 'Creando usuario...' : 'Crear Usuario'}
            </Button>
          </form>

          <div className="mt-4 text-sm text-muted-foreground">
            <p>Credenciales pre-configuradas:</p>
            <p className="font-mono text-xs mt-1">
              nicolasmacortesgallardo@gmail.com<br/>
              Admin123
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
