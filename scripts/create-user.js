const { initializeApp } = require('firebase/app');
const { getAuth, createUserWithEmailAndPassword } = require('firebase/auth');

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

async function createUser() {
  try {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      'nicolasmacortesgallardo@gmail.com',
      'Admin123'
    );
    console.log('✅ Usuario creado exitosamente!');
    console.log('Email:', userCredential.user.email);
    console.log('UID:', userCredential.user.uid);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error al crear usuario:', error.message);
    process.exit(1);
  }
}

createUser();
