// Voco — Supabase Client
const SUPABASE_URL = 'https://dgmatfpwekziyumdfpcu.supabase.co';
const SUPABASE_KEY = 'sb_publishable_WDXTlQP70E5A9cHQxH3iNA_VhAYTRDt';

const { createClient } = supabase;
const sb = createClient(SUPABASE_URL, SUPABASE_KEY);
