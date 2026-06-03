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

(async () => {
  const el = document.getElementById('promises');
  if (!el) return;

  async function load() {
    const { data } = await supabase
      .from('anniversaries')
      .select('*')
      .eq('type', 1)
      .order('target_date', { ascending: true });

    const items = (data || []).map(row => {
      const { label, past } = calcDday(row.target_date);
      return `
        <li class="promise-item">
          <div class="promise-info">
            <strong>${escapeHtml(row.title)}</strong>
            <span class="promise-date">${formatDate(row.target_date)}</span>
          </div>
          <div class="promise-right">
            <span class="promise-dday${past ? ' past' : ''}">${label}</span>
            <button class="promise-delete" data-id="${row.id}" aria-label="삭제">×</button>
          </div>
        </li>`;
    }).join('');

    el.innerHTML = `
      <div class="card">
        <p class="page-kicker">약속</p>
        <h2>다가오는 날들</h2>
        <ul class="promise-list">${items}</ul>
        <form class="promise-form" id="promiseForm">
          <input type="text" id="promiseTitle" placeholder="약속 제목" autocomplete="off">
          <input type="date" id="promiseDate">
          <div class="promise-form-actions">
            <button type="submit">저장</button>
          </div>
        </form>
      </div>`;

    const form = el.querySelector('#promiseForm');

    // 저장
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const title = el.querySelector('#promiseTitle').value.trim();
      const date  = el.querySelector('#promiseDate').value;
      if (!title || !date) return;
      const { error } = await supabase.from('anniversaries').insert({ title, target_date: date, type: 1 });
      if (error) { console.error(error); return; }
      form.reset();
      form.hidden = true;
      await load();
    });

    // 삭제 (이벤트 위임)
    el.querySelector('.promise-list').addEventListener('click', async e => {
      const btn = e.target.closest('.promise-delete');
      if (!btn) return;
      const { error } = await supabase.from('anniversaries').delete().eq('id', btn.dataset.id);
      if (error) { console.error(error); return; }
      await load();
    });
  }

  await load();
})();
