#!/usr/bin/env node
const { spawn } = require('child_process')
const path = require('path')

const propsPath = process.argv[2] || path.join('..', 'projects', 'El-viaje-del-cafe', 'scene.json')
const outPath = process.argv[3] || path.join('out', 'cafe-40s.mp4')

const entry = path.join('src', 'index.tsx')
const composition = 'ElViajeDelCafe'

console.log('Rendering Remotion composition', composition)
console.log('Props file:', propsPath)

const args = ['remotion', 'render', entry, composition, outPath, '--props', propsPath]

const proc = spawn('npx', args, { stdio: 'inherit' })
proc.on('close', (code) => {
  if (code === 0) console.log('Render completed')
  else console.error('Render failed with code', code)
})
