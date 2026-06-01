
import { supabase } from './supabase.js';

const { data } = await supabase
    .from('anniversaries')
    .select('*')
    .eq('id', 1)
    .single();

const startDate = new Date(data.target_date);

const today = new Date();

const diffDays =
Math.floor(
  (today - startDate) /
  (1000 * 60 * 60 * 24)
) + 2;

document.getElementById('dday')
.textContent = `D+${diffDays}`;

const themeBtn = document.getElementById('themeToggle');

themeBtn.onclick = ()=>{

  document.body.classList.toggle('dark');

  const isDark =
  document.body.classList.contains('dark');

  localStorage.setItem(
    'theme',
    isDark ? 'dark' : 'light'
  );

  themeBtn.textContent =
    isDark
    ? '☀️'
    : '🌙';

};

document.getElementById('logoutBtn').onclick=async()=>{
 await supabase.auth.signOut();
 location.href='login.html';
};
