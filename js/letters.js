
import { supabase } from './supabase.js';
const list=document.getElementById('lettersList');

async function load(){
 const {data}=await supabase.from('letters').select('*').order('created_at',{ascending:false});
 list.innerHTML=(data||[]).map(v=>
 `<div class="card"><h3>${v.title||''}</h3><p>${v.content||''}</p></div>`).join('');
}
await load();

document.getElementById('sendBtn').onclick=async()=>{
 const {data:user}=await supabase.auth.getUser();
 await supabase.from('letters').insert({
   sender_id:user.user.id,
   title:document.getElementById('letterTitle').value,
   content:document.getElementById('letterContent').value
 });
 await load();
};
