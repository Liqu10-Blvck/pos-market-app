import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';

interface AuthUser {
  uid: string;
  email: string;
  role: 'admin' | 'cashier';
}

export async function verifySession(req: Request, requiredRole?: 'admin'): Promise<AuthUser | null> {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.split('Bearer ')[1];
    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    if (!apiKey) {
      console.error('API Key missing for verifySession');
      return null;
    }

    // Lookup token with Google Identity Toolkit REST API
    const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: token })
    });

    if (!res.ok) {
      return null;
    }

    const data = await res.json();
    const firebaseUser = data.users?.[0];
    if (!firebaseUser) {
      return null;
    }

    // Retrieve user role and status from Firestore using REST API with the user's ID Token
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    if (!projectId) {
      console.error('Project ID missing for verifySession');
      return null;
    }

    const isEmulator = process.env.FIRESTORE_EMULATOR_HOST;
    let url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/usuarios/${firebaseUser.localId}`;
    if (isEmulator) {
      url = `http://${process.env.FIRESTORE_EMULATOR_HOST}/v1/projects/${projectId}/databases/(default)/documents/usuarios/${firebaseUser.localId}`;
    }

    const firestoreRes = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!firestoreRes.ok) {
      console.error(`Firestore REST API returned ${firestoreRes.status} in verifySession`);
      return null;
    }

    const docData = await firestoreRes.json();
    const fields = docData.fields;
    if (!fields) {
      return null;
    }

    const role = fields.role?.stringValue;
    const activo = fields.activo?.booleanValue;

    if (activo !== true) {
      return null; // User is inactive
    }

    if (requiredRole && requiredRole === 'admin' && role !== 'admin') {
      return null; // Not authorized
    }

    return {
      uid: firebaseUser.localId,
      email: firebaseUser.email,
      role: role as 'admin' | 'cashier'
    };
  } catch (error) {
    console.error('Error in verifySession:', error);
    return null;
  }
}
