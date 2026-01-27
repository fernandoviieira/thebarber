import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Log de diagnóstico (Remover após consertar)
if (!supabaseUrl || !supabaseAnonKey) {
  console.error("❌ ERRO: Chaves do Supabase não encontradas no arquivo .env!")
}

export const supabase = createClient(
  supabaseUrl || '',
  supabaseAnonKey || ''
)