
import { supabase } from './supabase.js';
const wrap=document.getElementById('placesList');
const {data}=await supabase.from('memories').select('place,memory_date');
const map={};
(data||[]).forEach(v=>{
 if(!v.place) return;
 if(!map[v.place]) map[v.place]={count:0,last:v.memory_date};
 map[v.place].count++;
 if(v.memory_date>map[v.place].last) map[v.place].last=v.memory_date;
});
wrap.innerHTML=Object.entries(map).map(([place,info])=>
`<div class="card"><h3>${place}</h3><p>${info.count}회 방문</p><p>최근 ${info.last}</p></div>`).join('');
