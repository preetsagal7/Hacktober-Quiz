import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  (import.meta.env.VITE_SUPABASE_URL as string) ||
  'https://qjckcykrovgfbuvezdwf.supabase.co';

const supabaseAnonKey =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string) ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqY2tjeWtyb3ZnZmJ1dmV6ZHdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIzNzIxMjMsImV4cCI6MjEwNzk0ODEyM30.4pL_e_9Rcft9Kl4iMmTK20xPivLKk8BU5SHpAJ6OVIU';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
