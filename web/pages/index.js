import Head from 'next/head'
import { useState } from 'react'

export default function Home() {
  const [script, setScript] = useState('')
  const [scenes, setScenes] = useState(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const generateScenes = async () => {
    setLoading(true)
    setMessage('Generando escenas...')
    try {
      const res = await fetch('/api/generate-prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ script })
      })
      const data = await res.json()
      setScenes(data.scenes)
      setMessage('Escenas generadas')
    } catch (err) {
      console.error(err)
      setMessage('Error generando escenas')
    } finally {
      setLoading(false)
    }
  }

  const sendToOmniRoute = async () => {
    if (!scenes) return
    setLoading(true)
    setMessage('Enviando a OmniRoute...')
    try {
      const res = await fetch('/api/omniroute/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenes })
      })
      const data = await res.json()
      setMessage(data.message || 'Enviado (simulado)')
    } catch (err) {
      console.error(err)
      setMessage('Error enviando a OmniRoute')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8 font-sans">
      <Head>
        <title>OmniRoute Video Studio - Panel</title>
      </Head>
      <h1 className="text-2xl font-bold mb-4">OmniRoute Video Studio - Generador</h1>

      <section className="mb-6">
        <h2 className="text-lg font-semibold">Generador de guiones</h2>
        <textarea
          rows={8}
          value={script}
          onChange={(e) => setScript(e.target.value)}
          className="w-full p-2 border rounded mt-2"
          placeholder="Escribe o pega tu guion aquí"
        />
        <div className="mt-2 flex gap-2">
          <button
            onClick={generateScenes}
            className="px-4 py-2 bg-blue-600 text-white rounded"
            disabled={loading}
          >
            {loading ? 'Procesando...' : 'Generar escenas'}
          </button>
          <button
            onClick={sendToOmniRoute}
            className="px-4 py-2 bg-green-600 text-white rounded"
            disabled={!scenes || loading}
          >
            Enviar a OmniRoute
          </button>
        </div>
        {message && <p className="mt-2 text-sm text-gray-700">{message}</p>}
      </section>

      <section>
        <h2 className="text-lg font-semibold">Escenas generadas / Preview</h2>
        {!scenes && <p className="text-sm text-gray-600">No hay escenas todavía. Genera una desde el guion.</p>}
        {scenes && (
          <ul className="mt-2 space-y-2">
            {scenes.map((s) => (
              <li key={s.id} className="p-3 border rounded">
                <strong>{s.title}</strong> — {s.duration}s
                <div className="text-sm text-gray-700 mt-1">Prompt: {s.prompt}</div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
