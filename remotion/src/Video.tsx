import React from 'react'
import {AbsoluteFill, Sequence, useCurrentFrame, interpolate} from 'remotion'
import sceneData from '../../projects/El-viaje-del-cafe/scene.json'

type Scene = { id: string; title: string; duration: number; prompt: string }

export const VideoComposition: React.FC<{scene?: { scenes: Scene[]; fps?: number }}>= ({scene}) => {
  const fps = (scene && scene.fps) || sceneData.fps || 30
  const scenes = (scene && scene.scenes) || sceneData.scenes

  // compute start frame for each scene
  let cumulative = 0
  const framesPerScene = scenes.map((s) => {
    const frames = Math.round((s.duration || 1) * fps)
    const start = cumulative
    cumulative += frames
    return { ...s, frames, start }
  })

  return (
    <AbsoluteFill style={{backgroundColor: '#000'}}>
      {framesPerScene.map((s) => (
        <Sequence key={s.id} from={s.start} durationInFrames={s.frames}>
          <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
            <SceneCard title={s.title} prompt={s.prompt} />
          </AbsoluteFill>
        </Sequence>
      ))}
    </AbsoluteFill>
  )
}

const SceneCard: React.FC<{title: string; prompt: string}> = ({title, prompt}) => {
  const frame = useCurrentFrame()
  const opacity = interpolate(frame, [0, 10], [0, 1])
  return (
    <div style={{color: 'white', textAlign: 'center', padding: 40, opacity}}>
      <div style={{fontSize: 64, fontWeight: 700}}>{title}</div>
      <div style={{fontSize: 20, marginTop: 20, maxWidth: 700}}>{prompt}</div>
    </div>
  )
}

export default VideoComposition
