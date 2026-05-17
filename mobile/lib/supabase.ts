import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SUPABASE_URL = 'https://lrblvcixijbbfxiutgnp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxyYmx2Y2l4aWpiYmZ4aXV0Z25wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczOTU0OTUsImV4cCI6MjA5Mjk3MTQ5NX0.WgBIwYNy16GF4_6pGP1lCURrV1AYAtvJasQlFL-r5IY';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
