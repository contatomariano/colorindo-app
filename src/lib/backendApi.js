import { supabase } from './supabase';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3001/api';

async function apiRequest(path, options = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token || '';
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    }
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || `HTTP ${response.status}`);
  }
  return payload;
}

export async function getOrder(orderId) {
  return apiRequest(`/orders/${orderId}`);
}

export async function approveAsset(orderId, assetId) {
  return apiRequest(`/orders/${orderId}/assets/${assetId}/approve`, { method: 'POST' });
}

export async function rejectAsset(orderId, assetId, reason) {
  return apiRequest(`/orders/${orderId}/assets/${assetId}/reject`, {
    method: 'POST',
    body: JSON.stringify({ reason })
  });
}

export async function approveAllScenes(orderId) {
  return apiRequest(`/orders/${orderId}/scenes/approve-all`, { method: 'POST' });
}

export async function reprocessOrder(orderId) {
  return apiRequest(`/orders/${orderId}/reprocess`, { method: 'POST' });
}
