import Head from 'next/head'
import { useState } from 'react'

export default function Home() {
  const [script, setScript] = useState('')

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
        <div className="mt-2">
          <button className="px-4 py-2 bg-blue-600 text-white rounded">Generar escenas</button>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Generador de escenas / Preview</h2>
        <p className="text-sm text-gray-600">Aquí se listarán las escenas generadas.</p>
      </section>
    </div>
  )
}
