
import { supabase } from './supabase.js';

const { data } = await supabase
    .from('anniversaries')
    .select('*')
    .eq('id', 1)
    .single();

const startDate = new Date(data.target_date);

const today = new Date();

const diffDays = (today - startDate) + 1;

document.getElementById('dday')
.textContent = `D+${diffDays}`;

if(localStorage.getItem('theme')==='dark'){
 document.body.classList.add('dark');
}

const themeBtn =
document.getElementById('themeToggle');

if(localStorage.getItem('theme')==='dark'){
 document.body.classList.add('dark');
 themeBtn.textContent='☀️';
}else{
 themeBtn.textContent='🌙';
};

document.getElementById('logoutBtn').onclick=async()=>{
 await supabase.auth.signOut();
 location.href='login.html';
};
