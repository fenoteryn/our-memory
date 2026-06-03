import { supabase } from './supabase.js';

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString('ko-KR', {
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

function escapeHtml(v) {
  return String(v || '')
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;').replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export async function loadComments(memoryId, currentUserId) {
  const { data } = await supabase
    .from('comments')
    .select('*')
    .eq('memory_id', memoryId)
    .order('created_at');

  const el = document.getElementById('comments');
  if (!el) return;

  el.innerHTML = (data || []).map(c => {
    const mine = c.user_id === currentUserId;
    const deleteBtn = mine
      ? `<button class="comment-delete" data-id="${c.id}" aria-label="삭제">×</button>`
      : '';
    return `
      <div class="comment-item ${mine ? 'mine' : 'theirs'}">
        <div class="comment-bubble">${escapeHtml(c.content)}${deleteBtn}</div>
        <span class="comment-time">${formatTime(c.created_at)}</span>
      </div>`;
  }).join('');
}

export async function saveComment(memoryId, content, userId) {
  const { error } = await supabase.from('comments').insert({
    memory_id: memoryId,
    content,
    user_id: userId,
  });
  if (error) throw error;
}

export async function deleteComment(id) {
  const { error } = await supabase.from('comments').delete().eq('id', id);
  if (error) throw error;
}
