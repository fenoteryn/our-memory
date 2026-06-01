
import { supabase } from './supabase.js';

const params = new URLSearchParams(location.search);

const memoryId = params.get('id');
const memoryDate = params.get('date');

async function loadMemory(){

 if(!memoryId) return;

 const { data } = await supabase
 .from('memories')
 .select('*')
 .eq('id', memoryId)
 .single();

 if(!data) return;

 document.getElementById('title').value = data.title || '';
 document.getElementById('place').value = data.place || '';
 document.getElementById('content').value = data.content || '';
 document.getElementById('rating').value = data.rating || 5;

 loadPhotos();
}

async function loadPhotos(){

 const { data } = await supabase
 .from('photos')
 .select('*')
 .eq('memory_id', memoryId);

 const photoList = document.getElementById('photoList');

 photoList.innerHTML = (data || []).map(photo =>
 `<img src="${photo.photo_url}" style="width:150px;margin:5px;border-radius:12px;">`
 ).join('');
}

loadMemory();

document.getElementById('saveBtn').onclick = async () => {

 const { data:userData } = await supabase.auth.getUser();

 const payload = {
   user_id:userData.user.id,
   title:document.getElementById('title').value,
   place:document.getElementById('place').value,
   content:document.getElementById('content').value,
   rating:Number(document.getElementById('rating').value),
   memory_date:memoryDate
 };

 let currentMemoryId = memoryId;

 if(memoryId){

   await supabase
   .from('memories')
   .update(payload)
   .eq('id', memoryId);

 }else{

   const { data } = await supabase
   .from('memories')
   .insert(payload)
   .select()
   .single();

   currentMemoryId = data.id;
 }

 const files = document.getElementById('photos').files;

 for(const file of files){

   const fileName = Date.now() + '_' + file.name;

   await supabase.storage
   .from('photos')
   .upload(fileName,file);

   const { data:urlData } =
   supabase.storage
   .from('photos')
   .getPublicUrl(fileName);

   await supabase
   .from('photos')
   .insert({
      memory_id:currentMemoryId,
      user_id:userData.user.id,
      photo_url:urlData.publicUrl
   });
 }

 alert('저장 완료');

 location.href='calendar.html';
};
