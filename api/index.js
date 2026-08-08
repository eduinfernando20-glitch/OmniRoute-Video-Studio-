// API adapter: OpenAI for scene generation, ElevenLabs for TTS
const express = require('express')
const bodyParser = require('body-parser')
const axios = require('axios')
const fs = require('fs')
const path = require('path')

require('dotenv').config()

const app = express()
app.use(bodyParser.json())

// serve generated audio files
const audioDir = path.join(__dirname, '..', 'projects', 'El-viaje-del-cafe', 'audio')
app.use('/audio', express.static(audioDir))

// Helper: ensure dir
function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}
ensureDir(audioDir)

// POST /api/generate-prompts
// Uses OpenAI Chat Completions to transform a script into a JSON list of scenes
app.post('/api/generate-prompts', async (req, res) => {
  const { script } = req.body
  if (!script) return res.status(400).json({ error: 'Missing script in body' })
  if (!process.env.OPENAI_API_KEY) return res.status(500).json({ error: 'OPENAI_API_KEY not configured' })

  try {
    const system = `You are a helpful assistant that converts a short video script into a JSON array of scenes. Output ONLY valid JSON. Each scene must contain: id (string), title (string), duration (seconds, integer), prompt (string describing the visuals). The total durations should sum close to the script's requested duration if provided.`
    const user = `Script:\n${script}\n\nReturn an object: { "scenes": [ {id, title, duration, prompt}, ... ] }`

    const resp = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user }
        ],
        temperature: 0.7,
        max_tokens: 800
      },
      {
        headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` }
      }
    )

    const content = resp.data.choices[0].message.content
    // Try to parse the JSON from the assistant
    let json = null
    try {
      json = JSON.parse(content)
    } catch (e) {
      // Attempt to extract JSON substring
      const match = content.match(/\{[\s\S]*\}/)
      if (match) {
        try { json = JSON.parse(match[0]) } catch (e2) { }
      }
    }

    if (!json || !json.scenes) {
      // fallback: return a mocked split based on simple heuristics
      const fallbackScenes = [
        { id: 's1', title: 'Introducción', duration: 8, prompt: 'Paisaje de cafetales al amanecer, estilo cinematográfico' },
        { id: 's2', title: 'Proceso', duration: 20, prompt: 'Close ups de granos de cafe, secuencia narrativa' },
        { id: 's3', title: 'Cierre', duration: 12, prompt: 'Taza de cafe humeante y logo, tono emotivo' }
      ]
      return res.json({ scenes: fallbackScenes, warning: 'Could not parse OpenAI response; returned fallback scenes', raw: content })
    }

    // Normalize scene ids and durations
    const scenes = json.scenes.map((s, idx) => ({
      id: s.id ? String(s.id) : `s${idx + 1}`,
      title: s.title || `Escena ${idx + 1}`,
      duration: Math.max(1, parseInt(s.duration, 10) || 5),
      prompt: s.prompt || (s.description || 'Imagen sin descripción')
    }))

    res.json({ scenes })
  } catch (err) {
    console.error('generate-prompts error', err.response ? err.response.data : err.message)
    res.status(500).json({ error: 'OpenAI request failed', details: err.response ? err.response.data : err.message })
  }
})

// POST /api/tts
// Generates TTS audio for given text using ElevenLabs and saves to projects/.../audio
app.post('/api/tts', async (req, res) => {
  const { text, voiceId, sceneId } = req.body
  if (!text) return res.status(400).json({ error: 'Missing text in body' })
  if (!process.env.ELEVENLABS_KEY) return res.status(500).json({ error: 'ELEVENLABS_KEY not configured' })

  const vid = voiceId || process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM' // default public-ish id placeholder
  const outFile = path.join(audioDir, `${sceneId || Date.now()}.mp3`)

  try {
    const url = `https://api.elevenlabs.io/v1/text-to-speech/${vid}`
    const payload = {
      text,
      model: 'eleven_monolingual_v1'
    }
    const r = await axios.post(url, payload, {
      responseType: 'arraybuffer',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': process.env.ELEVENLABS_KEY
      }
    })

    fs.writeFileSync(outFile, Buffer.from(r.data))
    // Return a URL where the file can be downloaded by the client
    const publicUrlPath = `/audio/${path.basename(outFile)}`
    res.json({ ok: true, path: outFile, url: publicUrlPath })
  } catch (err) {
    console.error('tts error', err.response ? err.response.data : err.message)
    res.status(500).json({ error: 'TTS failed', details: err.response ? err.response.data : err.message })
  }
})

// POST /api/omniroute/send
app.post('/api/omniroute/send', async (req, res) => {
  const { scenes } = req.body
  if (!scenes) return res.status(400).json({ error: 'Missing scenes in body' })
  if (!process.env.OMNIROUTE_URL || !process.env.OMNIROUTE_KEY) {
    return res.status(500).json({ error: 'OMNIROUTE_URL or OMNIROUTE_KEY not configured' })
  }

  try {
    const resp = await axios.post(`${process.env.OMNIROUTE_URL}/ingest`, { scenes }, {
      headers: { Authorization: `Bearer ${process.env.OMNIROUTE_KEY}` }
    })
    res.json({ ok: true, result: resp.data })
  } catch (err) {
    console.error('omniroute send error', err.response ? err.response.data : err.message)
    res.status(500).json({ error: 'OmniRoute request failed', details: err.response ? err.response.data : err.message })
  }
})

const port = process.env.PORT || 4000
app.listen(port, () => console.log('API listening on', port))
