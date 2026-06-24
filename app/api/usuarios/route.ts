import { NextRequest, NextResponse } from 'next/server';
import { doc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function POST(req: NextRequest) {
  try {
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

    // 3. Crear el documento de usuario en la colección "usuarios" de Firestore
    const userRef = doc(db, 'usuarios', localId);
    await setDoc(userRef, {
      uid: localId,
      nombre: name,
      email: email,
      role: role, // 'admin' | 'cashier'
      activo: true,
      createdAt: Timestamp.now()
    });

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
