import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, writeBatch } from "firebase/firestore";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { readFileSync } from "fs";
import { join } from "path";

// Manual .env parser for zero-dependency
const envPath = join(process.cwd(), ".env");
const envContent = readFileSync(envPath, "utf-8");
envContent.split("\n").forEach(line => {
  const [key, value] = line.split("=");
  if (key && value) process.env[key.trim()] = value.trim();
});

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const setup = async () => {
  console.log("🚀 Iniciando configuración en:", firebaseConfig.projectId);

  // 1. Crear Usuario
  const email = "nicolasmacortesgallardo@gmail.com";
  const password = "Admin123";

  try {
    console.log("👤 Creando usuario administrador...");
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    console.log("✅ Usuario creado:", userCredential.user.email);
  } catch (error) {
    if (error.code === 'auth/email-already-in-use') {
      console.log("ℹ️ El usuario ya existe.");
    } else {
      console.error("❌ Error al crear usuario:", error.message);
      console.log("⚠️ Asegúrate de haber activado AUTH con Email/Password en la consola de Firebase.");
      return;
    }
  }

  // 2. Seeding de Datos
  console.log("📦 Poblando base de datos...");
  const batch = writeBatch(db);

  // Productos Base (Master Catalog)
  const productos = [
    { id: 'palta-hass', nombre: 'Palta Hass', precio: 2500, unidad: 'kg', stock_actual: 0, activo: true, costo_referencia: 1800 },
    { id: 'limon', nombre: 'Limón', precio: 1200, unidad: 'kg', stock_actual: 0, activo: true, costo_referencia: 800 },
  ];

  for (const producto of productos) {
    batch.set(doc(db, "productos", producto.id), { 
      ...producto, 
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }

  // Envases
  const envases = [
    { id: 'toro-gamela', nombre: 'Toro / Gamela', peso_vacio: 0.8, precio_venta: 1000, cobrable: true },
    { id: 'rejilla', nombre: 'Rejilla', peso_vacio: 0.3, precio_venta: 0, cobrable: false },
    { id: 'bandeja', nombre: 'Bandeja', peso_vacio: 1.6, precio_venta: 3000, cobrable: true },
    { id: 'caja_carton', nombre: 'Caja de Cartón', peso_vacio: 0, precio_venta: 0, cobrable: false },
  ];

  for (const envase of envases) {
    batch.set(doc(db, "envases", envase.id), { ...envase, stock_actual: 100 });
  }

  // 3. Lotes de Prueba (Logística)
  const lotes = [
    {
      id: 'LOTE-TEST-001',
      producto_id: 'palta-hass',
      variedad: 'Hass',
      origen: 'nacional',
      calibres: [
        { calibre: '18', cantidad_cajas: 10 },
        { calibre: '20', cantidad_cajas: 15 },
        { calibre: 'Extra', cantidad_cajas: 5 }
      ],
      peso_total: 600,
      stock_actual_kg: 600,
      precio_sugerido: 2500,
      costo_unidad: 1800,
      tipo_bulto: 'pallet',
      envase_id: 'toro-gamela',
      envase_cantidad_total: 30,
      fecha_ingreso: new Date(),
      estado: 'disponible'
    }
  ];

  for (const lote of lotes) {
    batch.set(doc(db, "lotes", lote.id), lote);
    // Update product stock accordingly
    batch.update(doc(db, "productos", lote.producto_id), {
      stock_actual: 600
    });
  }


  await batch.commit();
  console.log("✅ Base de datos poblada!");
  console.log("\n✨ ¡Listo! Ya puedes loguearte en la app con:");
  console.log("📧 Email:", email);
  console.log("🔑 Pass:", password);
};

setup().catch(console.error);
