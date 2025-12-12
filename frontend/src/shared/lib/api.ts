const API_BASE = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api';

export async function createRoom(): Promise<{ roomId: string }> {
  const res = await fetch(`${API_BASE}/rooms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  if (!res.ok) throw new Error('Failed to create room');
  return res.json();
}

export async function getRoom(roomId: string) {
  const res = await fetch(`${API_BASE}/rooms/${roomId}`);
  if (!res.ok) throw new Error('Room not found');
  return res.json();
}

export async function checkHealth(): Promise<{ status: string }> {
  const res = await fetch(`${API_BASE}/health`);
  return res.json();
}
