
import { supabase } from './supabase.js';

const { data } = await supabase.auth.getUser();

if(!data.user){
 location.href='login.html';
}
