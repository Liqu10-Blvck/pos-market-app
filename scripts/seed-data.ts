import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, Timestamp } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function seedData() {
  console.log('🌱 Iniciando seed de datos...\n');

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

  console.log('📦 Creando productos...');
  for (const producto of productos) {
    const docRef = await addDoc(collection(db, 'productos'), {
      ...producto,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
    console.log(`  ✓ ${producto.nombre} - ID: ${docRef.id}`);
  }

  // Clientes
  const clientes = [
    { nombre: 'Juan Pérez', telefono: '+56912345678', saldo_deuda: 0, activo: true },
    { nombre: 'María González', telefono: '+56987654321', saldo_deuda: 15000, activo: true },
    { nombre: 'Pedro Rodríguez', telefono: '+56923456789', saldo_deuda: 8500, activo: true },
    { nombre: 'Ana Martínez', telefono: '+56934567890', saldo_deuda: 0, activo: true },
    { nombre: 'Carlos López', telefono: '+56945678901', saldo_deuda: 12000, activo: true },
  ];

  console.log('\n👥 Creando clientes...');
  for (const cliente of clientes) {
    const docRef = await addDoc(collection(db, 'clientes'), {
      ...cliente,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
    console.log(`  ✓ ${cliente.nombre} - Deuda: $${cliente.saldo_deuda} - ID: ${docRef.id}`);
  }

  console.log('\n✅ Seed completado exitosamente!');
  console.log('\nPróximos pasos:');
  console.log('1. Ve a http://localhost:3000');
  console.log('2. Inicia sesión con: nicolasmacortesgallardo@gmail.com / Admin123');
  console.log('3. Ve a /ventas para comenzar a vender');
  
  process.exit(0);
}

seedData().catch((error) => {
  console.error('❌ Error al crear datos:', error);
  process.exit(1);
});
