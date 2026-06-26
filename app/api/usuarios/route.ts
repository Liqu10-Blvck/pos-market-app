import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/api-auth';

export async function POST(req: NextRequest) {
  try {
    const userSession = await verifySession(req, 'admin');
    if (!userSession) {
      return NextResponse.json(
        { error: 'No autorizado. Solo los administradores activos pueden crear usuarios.' },
        { status: 401 }
      );
    }

    const { name, email, password, role } = await req.json();

    if (!name || !email || !password || !role) {
      return NextResponse.json(
        { error: 'Todos los campos son requeridos: nombre, email, contraseña y rol.' },
        { status: 400 }
      );
    }

    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Clave de API de Firebase no configurada.' },
        { status: 500 }
      );
    }

    // 1. Crear usuario en Firebase Auth usando REST API
    const authUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`;
    const authRes = await fetch(authUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password,
        returnSecureToken: true
      })
    });

    const authData = await authRes.json();

    if (!authRes.ok) {
      console.error('Error al registrar en Firebase Auth:', authData);
      return NextResponse.json(
        { error: authData.error?.message || 'Error al registrar el usuario en autenticación.' },
        { status: authRes.status }
      );
    }

    const { localId, idToken } = authData; // localId es el UID del nuevo usuario

    // 2. Actualizar el displayName en Firebase Auth usando REST API
    const updateProfileUrl = `https://identitytoolkit.googleapis.com/v1/accounts:updateProfile?key=${apiKey}`;
    const profileRes = await fetch(updateProfileUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        idToken,
        displayName: name,
        returnSecureToken: true
      })
    });

    if (!profileRes.ok) {
      const profileData = await profileRes.json();
      console.error('Error al actualizar perfil de usuario:', profileData);
      // No fallamos toda la operación, solo logueamos el error
    }

    // 3. Crear el documento de usuario en la colección "usuarios" de Firestore usando REST API con el token del administrador
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.split('Bearer ')[1];
    if (!token) {
      return NextResponse.json(
        { error: 'Token de autorización del administrador faltante.' },
        { status: 401 }
      );
    }

    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const isEmulator = process.env.FIRESTORE_EMULATOR_HOST;
    let firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/usuarios/${localId}`;
    if (isEmulator) {
      firestoreUrl = `http://${process.env.FIRESTORE_EMULATOR_HOST}/v1/projects/${projectId}/databases/(default)/documents/usuarios/${localId}`;
    }

    const firestoreRes = await fetch(firestoreUrl, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        fields: {
          uid: { stringValue: localId },
          nombre: { stringValue: name },
          email: { stringValue: email },
          role: { stringValue: role },
          activo: { booleanValue: true },
          createdAt: { timestampValue: new Date().toISOString() }
        }
      })
    });

    if (!firestoreRes.ok) {
      const firestoreData = await firestoreRes.json();
      console.error('Error al guardar el usuario en Firestore REST API:', firestoreData);
      return NextResponse.json(
        { error: firestoreData.error?.message || 'Error al guardar los detalles del usuario en la base de datos.' },
        { status: firestoreRes.status }
      );
    }

    return NextResponse.json({ 
      success: true, 
      uid: localId, 
      message: 'Usuario creado exitosamente.' 
    });

  } catch (error: any) {
    console.error('Error en API de creación de usuarios:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor al crear el usuario.' },
      { status: 500 }
    );
  }
}
