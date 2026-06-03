
import { supabase } from './supabase.js';

const { data } = await supabase
    .from('anniversaries')
    .select('*')
    .eq('id', 1)
    .single();

const startDate = new Date(data.target_date);
const today = new Date();
const diffDays = Math.floor((today - startDate) / (1000 * 60 * 60 * 24)) + 1;

document.getElementById('dday').textContent = `D+${diffDays}`;

document.getElementById('logoutBtn').onclick = async () => {
  await supabase.auth.signOut();
  location.href = 'login.html';
};
