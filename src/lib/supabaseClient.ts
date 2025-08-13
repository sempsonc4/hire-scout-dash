import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

const SUPABASE_URL = "https://nbcuyuppurgzgqtdcaki.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5iY3V5dXBwdXJnemdxdGRjYWtpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5Mzg1MjUsImV4cCI6MjA3MDUxNDUyNX0.x5rMpBLKZuITUiswi0napNHXyX7U6wlRGptUmq2oZTk";

// Shared Supabase client for general use
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});

// Create a new client with custom JWT for read-only access to specific run
export const createJWTClient = (jwt: string) => {
  return createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
    global: {
      headers: {
        Authorization: `Bearer ${jwt}`,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    }
  });
};