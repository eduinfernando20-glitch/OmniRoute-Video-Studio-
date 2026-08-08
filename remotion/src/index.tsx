import React from 'react'
import {Composition} from 'remotion'
import {VideoComposition} from './Video'

export const RemotionRoot = () => {
  return (
    <>
      <Composition
        id="ElViajeDelCafe"
        component={VideoComposition}
        durationInFrames={40 * 30}
        fps={30}
        width={1080}
        height={1920}
      />
    </>
  )
}

export default RemotionRoot
