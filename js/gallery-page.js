
import { supabase } from './supabase.js';
const grid=document.getElementById('galleryGrid');
const {data}=await supabase.from('photos').select('photo_url,memory_id');
grid.innerHTML=(data||[]).map(p=>`<img src="${p.photo_url}" style="width:100%;max-width:220px;border-radius:16px;margin:8px;">`).join('');
