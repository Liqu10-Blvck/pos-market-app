import { Cliente } from '../../../lib/types/pos';

/**
 * Filtra los clientes por búsqueda de nombre o teléfono.
 */
export const filtrarClientes = (clientes: Cliente[], searchQuery: string): Cliente[] => {
  const query = searchQuery.toLowerCase().trim();
  if (!query) return clientes;
  
  return clientes.filter(c => 
    c.nombre.toLowerCase().includes(query) ||
    (c.telefono && c.telefono.includes(query))
  );
};
