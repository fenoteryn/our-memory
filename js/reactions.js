
import { supabase } from './supabase.js';

export async function react(memoryId,userId,emoji){
 await supabase.from('reactions').insert({
  memory_id:memoryId,
  user_id:userId,
  emoji
 });
}
