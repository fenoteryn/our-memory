import { supabase } from './supabase.js';

const BUCKET = 'photos';
const EXPIRY = 86400; // 24시간

function extractPath(raw) {
  if (!raw) return '';
  if (!raw.startsWith('http')) return raw;
  const m = raw.match(/\/storage\/v1\/object\/[^/]+\/photos\/(.+?)(?:\?|$)/);
  return m ? m[1] : '';
}

export async function signUrls(rawPaths) {
  const entries = rawPaths
    .filter(Boolean)
    .map(raw => ({ raw, path: extractPath(raw) }))
    .filter(e => e.path);

  if (!entries.length) return new Map();

  const uniquePaths = [...new Set(entries.map(e => e.path))];
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrls(uniquePaths, EXPIRY);
  if (error) { console.error('signUrls error:', error); return new Map(); }

  const pathMap = new Map((data || []).map(item => [item.path, item.signedUrl]));
  return new Map(entries.map(e => [e.raw, pathMap.get(e.path) || '']));
}
