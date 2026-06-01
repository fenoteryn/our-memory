import { supabase } from './supabase.js';

const params = new URLSearchParams(location.search);
const memoryId = params.get('id');
let memoryDate = params.get('date');

const titleEl = document.getElementById('title');
const placeEl = document.getElementById('place');
const contentEl = document.getElementById('content');
const ratingEl = document.getElementById('rating');
const photosEl = document.getElementById('photos');
const photoListEl = document.getElementById('photoList');
const selectedFilesEl = document.getElementById('selectedFiles');
const saveBtn = document.getElementById('saveBtn');
const messageEl = document.getElementById('formMessage');
const dateLabelEl = document.getElementById('memoryDateLabel');

function setMessage(message, type = '') {
  if (!messageEl) return;
  messageEl.textContent = message;
  messageEl.dataset.type = type;
}

function formatDateLabel(dateText) {
  if (!dateText) return '데이트 기록';

  const date = new Date(`${dateText}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateText;

  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short'
  });
}

function setRating(value) {
  const rating = Number(value) || 5;
  ratingEl.value = String(rating);

  document.querySelectorAll('#ratingWrap .rating-star').forEach((star) => {
    star.classList.toggle('active', Number(star.dataset.rate) <= rating);
  });
}

function renderSelectedFiles() {
  const files = Array.from(photosEl.files || []);

  selectedFilesEl.innerHTML = files.map((file) => (
    `<span>${file.name}</span>`
  )).join('');
}

async function loadPhotos(id) {
  const { data, error } = await supabase
    .from('photos')
    .select('*')
    .eq('memory_id', id)
    .order('id', { ascending: false });

  if (error) {
    console.error(error);
    return;
  }

  photoListEl.innerHTML = (data || []).map((photo) => (
    `<img src="${photo.photo_url}" alt="업로드한 데이트 사진">`
  )).join('');
}

async function loadMemory() {
  if (!memoryId) {
    dateLabelEl.textContent = formatDateLabel(memoryDate);
    return;
  }

  const { data, error } = await supabase
    .from('memories')
    .select('*')
    .eq('id', memoryId)
    .single();

  if (error) {
    setMessage(error.message, 'error');
    return;
  }

  if (!data) return;

  memoryDate = data.memory_date;
  dateLabelEl.textContent = formatDateLabel(memoryDate);
  titleEl.value = data.title || '';
  placeEl.value = data.place || '';
  contentEl.value = data.content || '';
  setRating(data.rating || 5);

  await loadPhotos(memoryId);
}

function makeStoragePath(userId, memoryRecordId, file) {
  const extension = file.name.includes('.') ? file.name.split('.').pop() : 'jpg';
  const safeExtension = extension.toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  const uniqueName = `${Date.now()}-${crypto.randomUUID()}.${safeExtension}`;

  return `${userId}/${memoryRecordId}/${uniqueName}`;
}

async function uploadPhotos(userId, memoryRecordId) {
  const files = Array.from(photosEl.files || []);

  for (const file of files) {
    const filePath = makeStoragePath(userId, memoryRecordId, file);

    const { error: uploadError } = await supabase.storage
      .from('photos')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage
      .from('photos')
      .getPublicUrl(filePath);

    const { error: insertError } = await supabase
      .from('photos')
      .insert({
        memory_id: memoryRecordId,
        user_id: userId,
        photo_url: urlData.publicUrl
      });

    if (insertError) throw insertError;
  }
}

async function saveMemory() {
  setMessage('');
  saveBtn.disabled = true;
  saveBtn.textContent = '저장 중...';

  try {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;
    if (!userData.user) throw new Error('로그인이 필요합니다.');
    if (!memoryDate) throw new Error('캘린더에서 날짜를 다시 선택해 주세요.');

    const payload = {
      user_id: userData.user.id,
      title: titleEl.value.trim(),
      place: placeEl.value.trim(),
      content: contentEl.value.trim(),
      rating: Number(ratingEl.value),
      memory_date: memoryDate
    };

    let currentMemoryId = memoryId;

    if (memoryId) {
      const { error } = await supabase
        .from('memories')
        .update(payload)
        .eq('id', memoryId);

      if (error) throw error;
    } else {
      const { data, error } = await supabase
        .from('memories')
        .insert(payload)
        .select()
        .single();

      if (error) throw error;
      currentMemoryId = data.id;
    }

    await uploadPhotos(userData.user.id, currentMemoryId);

    setMessage('저장되었습니다.', 'success');
    location.href = 'calendar.html';
  } catch (error) {
    console.error(error);
    setMessage(error.message || '저장 중 문제가 발생했습니다.', 'error');
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = '저장하기';
  }
}

document.querySelectorAll('#ratingWrap .rating-star').forEach((star) => {
  star.addEventListener('click', () => {
    setRating(star.dataset.rate);
  });
});

photosEl.addEventListener('change', renderSelectedFiles);
saveBtn.addEventListener('click', saveMemory);

setRating(ratingEl.value);
loadMemory();
