const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envLocal = fs.readFileSync('.env.local', 'utf-8');
const SUPABASE_URL = envLocal.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)?.[1]?.trim();
const SUPABASE_KEY = envLocal.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)?.[1]?.trim();

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function check() {
  const { data, error } = await supabase.from('patients').select('*').limit(1);
  if (error) {
    console.error('Error fetching:', error);
  } else {
    console.log('Columns:', data && data[0] ? Object.keys(data[0]) : 'no data');
  }
}

check();
