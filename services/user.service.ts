import { supabase } from '../external/supabaseClient';
import { Database } from '../types/supabase';

type UserRow = Database['public']['Tables']['facturacion_users']['Row'];
type UserInsert = Database['public']['Tables']['facturacion_users']['Insert'];
type UserUpdate = Database['public']['Tables']['facturacion_users']['Update'];

export const createUser = async (user: UserInsert) => {
  const validateData = (user: UserInsert) => {
    if (!user.real_name) throw new Error('Username is required');
    if (!user.username) throw new Error('Username is required');
    if (!user.password) throw new Error('Password is required');
    // if (!user.external_client) throw new Error('External client is required');
  };
  if (!user.external_client) {
    user.external_client = false;
  }

  const checkAlreadyExist = async (username: string) => {
    const { data, error } = await supabase
      .from('facturacion_users')
      .select('*')
      .eq('username', username)
      .maybeSingle(); // ← cambia aquí

    if (error) throw new Error(error.message);
    return data; // data será el objeto o `null` si no existía
  };

  const oldUser = await checkAlreadyExist(user.username!);
  //update password if user exists
  if (oldUser) {
    const { error } = await supabase
      .from('facturacion_users')
      .update({ password: user.password })
      .eq('id', oldUser.id)
      .single();
    if (error) throw new Error(error.message);
    return { status: 'exists' };
  }

  validateData(user);
  const { error } = await supabase
    .from('facturacion_users')
    .insert({
      ...user,
      username: user.username?.toUpperCase(),
    })
    .single();

  if (error) throw new Error(error.message);
  return {
    status: 'ok',
  };
};

export const getAllUsers = async (
  external: boolean
): Promise<Partial<UserRow>[]> => {
  console.error(external);
  if (external) {
    const { data, error } = await supabase
      .from('facturacion_users')
      .select('*')
      .order('id', { ascending: true })
      .select('id, real_name, username, password');
    if (error) throw new Error(error.message);
    return data;
  }
  const { data, error } = await supabase
    .from('facturacion_users')
    .select('*')
    .eq('external_client', false)
    .order('id', { ascending: true })
    .select('id, real_name, username, password');
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

export const getUserByUsername = async (
  username: string
): Promise<UserRow | null> => {
  const { data, error } = await supabase
    .from('facturacion_users')
    .select('*')
    .eq('username', username)
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
