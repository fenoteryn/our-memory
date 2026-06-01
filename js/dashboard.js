
import { supabase } from './supabase.js';

const { data:memories } = await supabase
.from('memories')
.select('place');

const { data:photos } = await supabase
.from('photos')
.select('id');

const places = new Set((memories||[]).map(v=>v.place).filter(Boolean));

document.getElementById('stats').innerHTML = `
<div class="hero-card">
<h2>❤️ Our Memory</h2>
<p>📸 사진 ${photos?.length||0}장</p>
<p>📍 장소 ${places.size}곳</p>
<p>📝 기록 ${(memories||[]).length}개</p>
</div>`;
