import { supabase } from '../external/supabaseClient';
import { Database } from '../types/supabase';

type UserRow = Database['public']['Tables']['facturacion_users']['Row'];
type UserInsert = Database['public']['Tables']['facturacion_users']['Insert'];
type UserUpdate = Database['public']['Tables']['facturacion_users']['Update'];

export const createUser = async (user: UserInsert): Promise<UserRow | null> => {
  const { data, error } = await supabase
    .from('facturacion_users')
    .insert(user)
    .single();

  if (error) throw new Error(error.message);
  return data;
};

export const getAllUsers = async (
  external: boolean
): Promise<Partial<UserRow>[]> => {
  if (external) {
    const { data, error } = await supabase
      .from('facturacion_users')
      .select('*')
      .order('id', { ascending: true })
      .select('id, real_name');
    if (error) throw new Error(error.message);
    return data;
  }
  const { data, error } = await supabase
    .from('facturacion_users')
    .select('*')
    .eq('external_client', false)
    .order('id', { ascending: true })
    .select('id, real_name');
  if (error) throw new Error(error.message);
  return data;
};

export const getUserById = async (id: number): Promise<UserRow | null> => {
  const { data, error } = await supabase
    .from('facturacion_users')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw new Error(error.message);
  return data;
};

export const updateUser = async (
  id: number,
  user: UserUpdate
): Promise<UserRow | null> => {
  const { data, error } = await supabase
    .from('facturacion_users')
    .update(user)
    .eq('id', id)
    .single();

  if (error) throw new Error(error.message);
  return data;
};

export const deleteUser = async (id: number): Promise<void> => {
  const { error } = await supabase
    .from('facturacion_users')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);
};
