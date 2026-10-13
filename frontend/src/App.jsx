import { useEffect, useState } from 'react'
import axios from 'axios'

export default function App() {
  const [status, setStatus] = useState('checking...')
  useEffect(() => {
    axios.get(`${import.meta.env.VITE_API_URL}/api/health`)
      .then(r => setStatus(`API ${r.data.status}, database ${r.data.database}`))
      .catch(() => setStatus('API not reachable'))
  }, [])
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-[#F5F6F8]">
      <h1 className="text-3xl font-bold text-[#1B3350]">Smart Green Hub</h1>
      <p className="text-green-700">{status}</p>
    </div>
  )
}