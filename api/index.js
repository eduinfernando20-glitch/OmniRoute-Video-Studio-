// API adapter: OpenAI for scene generation, ElevenLabs for TTS, plus orchestration endpoint
const express = require('express')
const bodyParser = require('body-parser')
const axios = require('axios')
const fs = require('fs')
const fsp = fs.promises
const path = require('path')

require('dotenv').config()

const app = express()
app.use(bodyParser.json())

// serve generated audio files
const projectDir = path.join(__dirname, '..', 'projects', 'El-viaje-del-cafe')
const audioDir = path.join(projectDir, 'audio')
const sceneFile = path.join(projectDir, 'scene.json')
const sceneBackup = path.join(projectDir, 'scene.orig.json')

app.use('/audio', express.static(audioDir))

// Helper: ensure dir
function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}
ensureDir(audioDir)

async function callOpenAIForScenes(script) {
  if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not configured')

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
  let json = null
  try {
    json = JSON.parse(content)
  } catch (e) {
    const match = content.match(/\{[\s\S]*\}/)
    if (match) {
      try { json = JSON.parse(match[0]) } catch (e2) { }
    }
  }

  if (!json || !json.scenes) {
    // fallback scenes
    return [
      { id: 's1', title: 'Introducción', duration: 8, prompt: 'Paisaje de cafetales al amanecer, estilo cinematográfico' },
      { id: 's2', title: 'Proceso', duration: 20, prompt: 'Close ups de granos de cafe, secuencia narrativa' },
      { id: 's3', title: 'Cierre', duration: 12, prompt: 'Taza de cafe humeante y logo, tono emotivo' }
    ]
  }

  const scenes = json.scenes.map((s, idx) => ({
    id: s.id ? String(s.id) : `s${idx + 1}`,
    title: s.title || `Escena ${idx + 1}`,
    duration: Math.max(1, parseInt(s.duration, 10) || 5),
    prompt: s.prompt || (s.description || 'Imagen sin descripción')
  }))

  return scenes
}

async function generateTTSForScene(text, sceneId, voiceId) {
  if (!process.env.ELEVENLABS_KEY) throw new Error('ELEVENLABS_KEY not configured')
  const vid = voiceId || process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM'
  const filename = `${sceneId || Date.now()}.mp3`
  const outFile = path.join(audioDir, filename)

  const url = `https://api.elevenlabs.io/v1/text-to-speech/${vid}`
  const payload = { text, model: 'eleven_monolingual_v1' }

  const r = await axios.post(url, payload, {
    responseType: 'arraybuffer',
    headers: {
      'Content-Type': 'application/json',
      'xi-api-key': process.env.ELEVENLABS_KEY
    }
  })

  await fsp.writeFile(outFile, Buffer.from(r.data))
  return `/audio/${filename}`
}

// Existing endpoints (generate-prompts, tts, omniroute/send)
app.post('/api/generate-prompts', async (req, res) => {
  const { script } = req.body
  if (!script) return res.status(400).json({ error: 'Missing script in body' })
  try {
    const scenes = await callOpenAIForScenes(script)
    res.json({ scenes })
  } catch (err) {
    console.error('generate-prompts error', err.message || err)
    res.status(500).json({ error: 'OpenAI request failed', details: err.message || err })
  }
})

app.post('/api/tts', async (req, res) => {
  const { text, voiceId, sceneId } = req.body
  if (!text) return res.status(400).json({ error: 'Missing text in body' })
  try {
    const url = await generateTTSForScene(text, sceneId, voiceId)
    res.json({ ok: true, url })
  } catch (err) {
    console.error('tts error', err.message || err)
    res.status(500).json({ error: 'TTS failed', details: err.message || err })
  }
})

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

// NEW: /api/orchestrate
// Orchestration pipeline: [generate scenes] -> [tts per scene] -> save updated scene.json with audio_url
app.post('/api/orchestrate', async (req, res) => {
  const { script, scenes: providedScenes, voiceId } = req.body
  try {
    let scenes = providedScenes

    if (!scenes) {
      if (!script) return res.status(400).json({ error: 'Provide script or scenes in body' })
      scenes = await callOpenAIForScenes(script)
    }

    // For safety: create backup of existing scene.json
    try {
      if (fs.existsSync(sceneFile) && !fs.existsSync(sceneBackup)) {
        await fsp.copyFile(sceneFile, sceneBackup)
      }
    } catch (e) { console.warn('backup failed', e.message) }

    // Generate TTS for each scene and attach audio_url
    for (let i = 0; i < scenes.length; i++) {
      const s = scenes[i]
      const narrationText = s.narration || s.title + '. ' + (s.prompt || '')
      try {
        const audioUrl = await generateTTSForScene(narrationText, s.id || `scene-${i+1}`, voiceId)
        s.audio_url = audioUrl
      } catch (e) {
        console.error('tts per scene failed', e.message || e)
        s.audio_url = null
      }
    }

    // Save updated scenes to scene.json (overwrite)
    const out = {
      title: 'El viaje del café (generated)',
      duration: scenes.reduce((a,b) => a + (b.duration||0), 0),
      fps: 30,
      format: '9:16',
      scenes
    }

    await fsp.writeFile(sceneFile, JSON.stringify(out, null, 2), 'utf8')

    res.json({ ok: true, scenes, saved: sceneFile })
  } catch (err) {
    console.error('orchestrate error', err.message || err)
    res.status(500).json({ error: 'Orchestration failed', details: err.message || err })
  }
})

const port = process.env.PORT || 4000
app.listen(port, () => console.log('API listening on', port))
