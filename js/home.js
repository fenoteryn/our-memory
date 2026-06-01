
import { supabase } from './supabase.js';

const startDate = new Date('2025-03-01');

const diff=Math.floor((new Date()-startDate)/(1000*60*60*24))+1;
document.getElementById('dday').textContent=`D+${diff}`;

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
