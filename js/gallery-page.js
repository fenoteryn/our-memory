import { supabase } from './supabase.js';
import { signUrls } from './storage.js';

const grid = document.getElementById('galleryGrid');

const { data, error } = await supabase
  .from('photos')
  .select('photo_url,memory_id')
  .order('id', { ascending: false });

if (error) { console.error(error); }

if (data?.length) {
  const signed = await signUrls(data.map(p => p.photo_url));
  grid.innerHTML = data.map(p => {
    const url = signed.get(p.photo_url) || '';
    return url ? `<img src="${url}" style="width:100%;max-width:220px;border-radius:16px;margin:8px;" loading="lazy">` : '';
  }).join('');
}
