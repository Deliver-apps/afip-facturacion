import { supabase } from '../external/supabaseClient';
import { Database } from '../types/supabase';

type User = Database['public']['Tables']['facturacion_users']['Row'];
type Users = Database['public']['Tables']['facturacion_users']['Row'][];

export async function getAllUsers(): Promise<Users> {
  const { data, error } = await supabase.from('facturacion_users').select('*');
  if (error) {
    console.log(error);
    return [];
  }
  return data ?? [];
}

export async function getUserById(id: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('facturacion_users')
    .select('*')
    .eq('id', id);
  if (error) {
    console.log(error);
    return null;
  }
  return data[0];
}

export async function getUserByEmail(email: string) {
  const { data, error } = await supabase
    .from('facturacion_users')
    .select('*')
    .eq('email', email);
  if (error) {
    console.log(error);
    return null;
  }
  return data[0];
}
