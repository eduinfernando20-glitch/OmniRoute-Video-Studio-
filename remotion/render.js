#!/usr/bin/env node
// Simple render script that calls the Remotion CLI with props file
const { spawn } = require('child_process')
const path = require('path')

const args = process.argv.slice(2)
const propsPath = args[0] || path.join('projects', 'El-viaje-del-cafe', 'scene.json')
const outPath = args[1] || path.join('out', 'el-viaje-del-cafe.mp4')

const entry = path.join('src', 'index.tsx')
const composition = 'ElViajeDelCafe'

console.log('Render: entry=', entry)
console.log('Composition=', composition)
console.log('Props file=', propsPath)
console.log('Output=', outPath)

const cmdArgs = [
  'remotion',
  'render',
  entry,
  composition,
  outPath,
  '--props',
  propsPath,
]

const proc = spawn('npx', cmdArgs, { stdio: 'inherit' })

proc.on('close', (code) => {
  if (code === 0) console.log('Render completed')
  else console.error('Render failed with code', code)
})
