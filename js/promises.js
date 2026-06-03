import { supabase } from './supabase.js';

function formatDate(dateStr) {
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });
}

function calcDday(dateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${dateStr}T00:00:00`);
  const diff = Math.round((target - today) / (1000 * 60 * 60 * 24));
  if (diff === 0) return { label: 'D-Day', past: false };
  if (diff > 0)   return { label: `D-${diff}`, past: false };
  return           { label: `D+${Math.abs(diff)}`, past: true };
}

function escapeHtml(v) {
  return String(v || '').replaceAll('&', '&amp;').replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}

const { data, error } = await supabase
  .from('anniversaries')
  .select('*')
  .eq('type', 1)
  .order('target_date', { ascending: true });

const el = document.getElementById('promises');
if (!el) return;

if (error || !data?.length) {
  el.innerHTML = '';
  return;
}

const items = data.map(row => {
  const { label, past } = calcDday(row.target_date);
  return `
    <li class="promise-item">
      <div class="promise-info">
        <strong>${escapeHtml(row.title)}</strong>
        <span class="promise-date">${formatDate(row.target_date)}</span>
      </div>
      <span class="promise-dday${past ? ' past' : ''}">${label}</span>
    </li>`;
}).join('');

el.innerHTML = `
  <div class="card">
    <p class="page-kicker">약속</p>
    <h2>다가오는 날들</h2>
    <ul class="promise-list">${items}</ul>
  </div>`;
