#!/usr/bin/env node
const { spawn } = require('child_process')
const path = require('path')
const fs = require('fs')

const propsPath = process.argv[2] || path.join('..', 'projects', 'El-viaje-del-cafe', 'scene.json')
const outPath = process.argv[3] || path.join('out', 'cafe-40s.mp4')

const entry = path.join('src', 'index.tsx')
const composition = 'ElViajeDelCafe'

console.log('Rendering Remotion composition', composition)
console.log('Props file (requested):', propsPath)
console.log('Out file:', outPath)

let propsArg = null
try {
  if (fs.existsSync(propsPath)) {
    const text = fs.readFileSync(propsPath, 'utf8')
    try {
      const parsed = JSON.parse(text)
      // Pass as compact JSON string
      propsArg = JSON.stringify(parsed)
      console.log('Props file loaded and parsed as JSON')
    } catch (err) {
      // If file isn't pure JSON, pass raw string
      propsArg = text.replace(/\r?\n/g, '\\n')
      console.log('Props file loaded as raw text (not valid JSON)')
    }
  } else {
    console.log('Props file not found, running render without --props')
  }
} catch (e) {
  console.warn('Error reading props file:', e.message)
}

const args = propsArg
  ? ['remotion', 'render', entry, composition, outPath, '--props', propsArg]
  : ['remotion', 'render', entry, composition, outPath]

console.log('Running: npx', args.join(' '))

const proc = spawn('npx', args, { stdio: 'inherit' })
proc.on('close', (code) => {
  if (code === 0) {
    console.log('Render completed successfully')
    process.exit(0)
  } else {
    console.error('Render failed with code', code)
    process.exit(code)
  }
})
