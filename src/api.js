const API_BASE = import.meta.env.VITE_API_URL || '/api';

async function request(method, path, body) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (body !== undefined) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE}${path}`, options);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API error ${response.status}: ${errorText || response.statusText}`);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export const api = {
  getAll: () => request('GET', '/data'),
  list: (collectionName) => request('GET', `/${collectionName}`),
  create: (collectionName, record) => request('POST', `/${collectionName}`, record),
  update: (collectionName, record) => request('PUT', `/${collectionName}/${record.id}`, record),
  remove: (collectionName, id) => request('DELETE', `/${collectionName}/${id}`),
};
