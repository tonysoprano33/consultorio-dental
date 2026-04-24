const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://btneovpiaxdvjruskbth.supabase.co';
const SUPABASE_KEY = 'sb_publishable_0oYKU8bCWJX6xDj2FtxtQQ_jJ5gDhmQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function test() {
  console.log('Testing Payments insertion...');
  const { data: payData, error: payError } = await supabase.from('payments').insert([{
    patient_id: '0e1e811d-3a51-42e8-87b6-068ae0497c10',
    amount: 100,
    description: 'Test payment',
    date: '2023-10-27'
  }]);
  
  if (payError) {
    console.error('Payments Error:', payError);
  } else {
    console.log('Payments Success:', payData);
  }

  console.log('\nTesting Inventory insertion...');
  const { data: invData, error: invError } = await supabase.from('inventory').insert([{
    name: 'Test Insumo',
    stock: 10,
    min_stock: 5,
    unit: 'unidades'
  }]);

  if (invError) {
    console.error('Inventory Error:', invError);
  } else {
    console.log('Inventory Success:', invData);
  }
}

test();
