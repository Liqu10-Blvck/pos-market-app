import { create } from 'zustand';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth } from '../../../lib/firebase';

interface RegistroState {
  nombre: string;
  email: string;
  password: string;
  confirmPassword: string;
  error: string;
  isLoading: boolean;

  setNombre: (nombre: string) => void;
  setEmail: (email: string) => void;
  setPassword: (password: string) => void;
  setConfirmPassword: (confirmPassword: string) => void;
  setError: (error: string) => void;
  setIsLoading: (isLoading: boolean) => void;

  registrarCuenta: (router: any) => Promise<boolean>;
}

export const useRegistroStore = create<RegistroState>((set, get) => ({
  nombre: '',
  email: '',
  password: '',
  confirmPassword: '',
  error: '',
  isLoading: false,

  setNombre: (nombre) => set({ nombre }),
  setEmail: (email) => set({ email }),
  setPassword: (password) => set({ password }),
  setConfirmPassword: (confirmPassword) => set({ confirmPassword }),
  setError: (error) => set({ error }),
  setIsLoading: (isLoading) => set({ isLoading }),

  registrarCuenta: async (router) => {
    const { nombre, email, password, confirmPassword, isLoading } = get();
    if (isLoading) return false;

    set({ error: '' });

    if (password.length < 6) {
      set({ error: 'La contraseña debe tener al menos 6 caracteres.' });
      return false;
    }

    if (password !== confirmPassword) {
      set({ error: 'Las contraseñas no coinciden.' });
      return false;
    }

    set({ isLoading: true });

    try {
      // 1. Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // 2. Set profile displayName
      if (userCredential.user) {
        await updateProfile(userCredential.user, {
          displayName: nombre
        });
      }

      // Reset form
      set({
        nombre: '',
        email: '',
        password: '',
        confirmPassword: '',
      });

      // 3. Redirect to login page with registered query parameter
      router.replace('/?registered=true');
      return true;
    } catch (err: any) {
      console.error('Error al registrar usuario:', err);
      if (err.code === 'auth/email-already-in-use') {
        set({ error: 'El correo electrónico ya está registrado.' });
      } else if (err.code === 'auth/invalid-email') {
        set({ error: 'El correo electrónico no es válido.' });
      } else if (err.code === 'auth/weak-password') {
        set({ error: 'La contraseña es demasiado débil.' });
      } else {
        set({ error: err.message || 'Ocurrió un error al registrar la cuenta.' });
      }
      return false;
    } finally {
      set({ isLoading: false });
    }
  }
}));
