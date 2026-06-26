import { create } from 'zustand';
import { UsuariosService, UserDB } from '../../../lib/services/usuarios.service';
import { MetasService } from '../../../lib/services/metas.service';
import { formatCLPCurrency, parseChileanMoneyInput } from '../../../lib/utils';

interface UserFormState {
  nombre: string;
  email: string;
  password: string;
  role: 'admin' | 'cashier';
}

interface ConfigState {
  tabActiva: 'perfil' | 'usuarios' | 'metas';
  nombrePerfil: string;
  rolPerfil: 'admin' | 'cashier';
  guardandoPerfil: boolean;

  usuarios: UserDB[];
  cargandoUsuarios: boolean;
  creandoUsuario: boolean;
  userForm: UserFormState;

  metaDiariaInput: string;
  guardandoMeta: boolean;

  // Actions
  setTabActiva: (tab: 'perfil' | 'usuarios' | 'metas') => void;
  setNombrePerfil: (nombre: string) => void;
  setRolPerfil: (role: 'admin' | 'cashier') => void;
  setMetaDiariaInput: (meta: string) => void;
  setUserForm: (fields: Partial<UserFormState>) => void;
  
  cargarUsuarios: (toast: any) => Promise<void>;
  cargarMetaDiaria: () => Promise<void>;
  handleActualizarPerfil: (actualizarPerfilFn: (name: string, role: 'admin' | 'cashier') => Promise<void>, toast: any) => Promise<boolean>;
  handleCrearUsuario: (toast: any) => Promise<boolean>;
  handleToggleEstadoUsuario: (uid: string, activoActual: boolean, toast: any) => Promise<void>;
  handleGuardarMeta: (userId: string | undefined, toast: any) => Promise<boolean>;
}

const initialUserForm = (): UserFormState => ({
  nombre: '',
  email: '',
  password: '',
  role: 'cashier',
});

export const useConfigStore = create<ConfigState>((set, get) => ({
  tabActiva: 'perfil',
  nombrePerfil: '',
  rolPerfil: 'cashier',
  guardandoPerfil: false,

  usuarios: [],
  cargandoUsuarios: false,
  creandoUsuario: false,
  userForm: initialUserForm(),

  metaDiariaInput: '',
  guardandoMeta: false,

  setTabActiva: (tabActiva) => set({ tabActiva }),
  setNombrePerfil: (nombrePerfil) => set({ nombrePerfil }),
  setRolPerfil: (rolPerfil) => set({ rolPerfil }),
  setMetaDiariaInput: (metaDiariaInput) => set({ metaDiariaInput }),
  setUserForm: (fields) => set((state) => ({ userForm: { ...state.userForm, ...fields } })),

  cargarUsuarios: async (toast) => {
    set({ cargandoUsuarios: true });
    try {
      const lista = await UsuariosService.listarUsuarios();
      set({ usuarios: lista });
    } catch (error) {
      console.error('Error al listar usuarios:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los colaboradores.',
        variant: 'destructive',
      });
    } finally {
      set({ cargandoUsuarios: false });
    }
  },

  cargarMetaDiaria: async () => {
    try {
      const meta = await MetasService.obtenerMetaDiaria();
      set({ metaDiariaInput: formatCLPCurrency(meta) });
    } catch (error) {
      console.error('Error al cargar meta diaria:', error);
    }
  },

  handleActualizarPerfil: async (actualizarPerfilFn, toast) => {
    const { nombrePerfil, rolPerfil } = get();
    if (!nombrePerfil.trim()) {
      toast({
        title: 'Campo requerido',
        description: 'Por favor, ingresa tu nombre.',
        variant: 'destructive',
      });
      return false;
    }

    set({ guardandoPerfil: true });
    try {
      await actualizarPerfilFn(nombrePerfil.trim(), rolPerfil);
      toast({
        title: 'Perfil actualizado',
        description: 'Tus datos han sido actualizados con éxito.',
        variant: 'success',
      });
      return true;
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo actualizar tu perfil.',
        variant: 'destructive',
      });
      return false;
    } finally {
      set({ guardandoPerfil: false });
    }
  },

  handleCrearUsuario: async (toast) => {
    const { userForm } = get();
    if (!userForm.nombre.trim() || !userForm.email.trim() || !userForm.password.trim()) {
      toast({
        title: 'Campos incompletos',
        description: 'Por favor, completa todos los campos del formulario.',
        variant: 'destructive',
      });
      return false;
    }

    set({ creandoUsuario: true });
    try {
      await UsuariosService.crearUsuario({
        nombre: userForm.nombre.trim(),
        email: userForm.email.trim(),
        password: userForm.password.trim(),
        role: userForm.role,
      });

      toast({
        title: 'Colaborador registrado',
        description: `Se ha registrado a ${userForm.nombre} exitosamente.`,
        variant: 'success',
      });

      set({ userForm: initialUserForm() });
      await get().cargarUsuarios(toast);
      return true;
    } catch (error: any) {
      toast({
        title: 'Error al registrar',
        description: error.message || 'No se pudo registrar el nuevo colaborador.',
        variant: 'destructive',
      });
      return false;
    } finally {
      set({ creandoUsuario: false });
    }
  },

  handleToggleEstadoUsuario: async (uid, activoActual, toast) => {
    try {
      await UsuariosService.cambiarEstadoActivo(uid, !activoActual);
      toast({
        title: 'Estado actualizado',
        description: `Colaborador está ahora ${!activoActual ? 'Activo' : 'Inactivo'}.`,
        variant: 'success',
      });
      await get().cargarUsuarios(toast);
    } catch (error) {
      console.error(error);
      toast({
        title: 'Error',
        description: 'No se pudo cambiar el estado del colaborador.',
        variant: 'destructive',
      });
    }
  },

  handleGuardarMeta: async (userId, toast) => {
    const { metaDiariaInput } = get();
    const monto = parseChileanMoneyInput(metaDiariaInput);
    if (monto <= 0) {
      toast({
        title: 'Monto inválido',
        description: 'La meta de ventas debe ser mayor a 0.',
        variant: 'destructive',
      });
      return false;
    }

    set({ guardandoMeta: true });
    try {
      await MetasService.guardarMetaDiaria(monto, userId);
      toast({
        title: 'Meta guardada',
        description: `Objetivo diario configurado en ${formatCLPCurrency(monto)}.`,
        variant: 'success',
      });
      set({ metaDiariaInput: formatCLPCurrency(monto) });
      return true;
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo guardar la meta diaria.',
        variant: 'destructive',
      });
      return false;
    } finally {
      set({ guardandoMeta: false });
    }
  },
}));
