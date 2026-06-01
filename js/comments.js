
import { supabase } from './supabase.js';

export async function loadComments(memoryId){
 const { data } = await supabase
 .from('comments')
 .select('*')
 .eq('memory_id',memoryId)
 .order('created_at');

 document.getElementById('comments').innerHTML =
 (data||[]).map(v=>
 `<div class="comment-item">${v.content}</div>`).join('');
}

export async function saveComment(memoryId,content,userId){
 await supabase.from('comments').insert({
  memory_id:memoryId,
  content,
  user_id:userId
 });
}
