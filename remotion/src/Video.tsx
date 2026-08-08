import React from 'react'
import {AbsoluteFill, Sequence, useCurrentFrame, interpolate} from 'remotion'

export const VideoComposition: React.FC = () => {
  const frame = useCurrentFrame()
  const opacity = interpolate(frame, [0, 15], [0, 1])

  return (
    <AbsoluteFill style={{backgroundColor: '#111'}}>
      <Sequence from={0} durationInFrames={1200}>
        <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
          <div style={{color: 'white', fontSize: 48, opacity}}>El viaje del café</div>
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  )
}

export default VideoComposition
