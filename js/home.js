
import { supabase } from './supabase.js';

const { data } = await supabase
    .from('anniversaries')
    .select('*')
    .eq('title', '연애 시작')
    .single();

const startDate = new Date(data.target_date);

const today = new Date();

const diffDays =
Math.floor(
    (today - startDate)
    / (1000 * 60 * 60 * 24)
) + 1;

document.getElementById('dday')
.textContent = `D+${diffDays}`;

if(localStorage.getItem('theme')==='dark'){
 document.body.classList.add('dark');
}

document.getElementById('themeToggle').onclick=()=>{
 document.body.classList.toggle('dark');
 localStorage.setItem('theme',
 document.body.classList.contains('dark')?'dark':'light');
};

document.getElementById('logoutBtn').onclick=async()=>{
 await supabase.auth.signOut();
 location.href='login.html';
};
