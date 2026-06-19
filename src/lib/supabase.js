import { createClient } from '@supabase/supabase-js';

const SUPA_URL = 'https://ezdkvuqixhwflcqxydeu.supabase.co';
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV6ZGt2dXFpeGh3ZmxjcXh5ZGV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4OTMwOTEsImV4cCI6MjA5NzQ2OTA5MX0.IMB2h8pbnGZu0N_A3LCS5Pb1H_EjsHD1nX_z0ek_iPM';

export const supabase = createClient(SUPA_URL, SUPA_KEY);
