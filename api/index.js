// Simple API adapter: endpoints for prompt generation, OmniRoute adapter, and TTS orchestration
const express = require('express')
const bodyParser = require('body-parser')
const axios = require('axios')

const app = express()
app.use(bodyParser.json())

// POST /api/generate-prompts
app.post('/api/generate-prompts', async (req, res) => {
  const { script } = req.body
  // Placeholder: call an LLM or local generator to convert script -> scenes/prompts
  // Return a simple mocked scene list for now
  const scenes = [
    { id: 1, title: 'Introducción', duration: 8, prompt: 'Paisaje de cafetales al amanecer, estilo cinematográfico' },
    { id: 2, title: 'Proceso', duration: 20, prompt: 'Close ups de granos de cafe, secuencia narrativa' },
    { id: 3, title: 'Cierre', duration: 12, prompt: 'Taza de cafe humeante y logo, tono emotivo' }
  ]
  res.json({ scenes })
})

// POST /api/omniroute/send
app.post('/api/omniroute/send', async (req, res) => {
  const { scenes } = req.body
  // TODO: usar la API de OmniRoute con las credenciales del usuario
  // ejemplo: await axios.post(process.env.OMNIROUTE_URL + '/ingest', scenes, { headers: { Authorization: `Bearer ${process.env.OMNIROUTE_KEY}` } })
  res.json({ ok: true, message: 'Envío simulado a OmniRoute (configurar credenciales)' })
})

// POST /api/tts
app.post('/api/tts', async (req, res) => {
  const { text, voice } = req.body
  // Placeholder: integrar ElevenLabs / Google TTS
  res.json({ ok: true, url: 'https://example.com/audio/placeholder.mp3' })
})

const port = process.env.PORT || 4000
app.listen(port, () => console.log('API listening on', port))
