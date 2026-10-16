import api from './client'

// Uploaded files open through the API, which checks who is asking (owner or administrator only).
export function fileUrl(id) {
  return `${api.defaults.baseURL}/uploads/${id}`
}
