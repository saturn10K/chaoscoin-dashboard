"use client";

import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";

interface PostProcessingProps {
  bloomEnabled?: boolean;
  vignetteEnabled?: boolean;
}

export default function PostProcessing({
  bloomEnabled = true,
  vignetteEnabled = true,
}: PostProcessingProps) {
  if (bloomEnabled && vignetteEnabled) {
    return (
      <EffectComposer>
        <Bloom
          intensity={0.7}
          luminanceThreshold={0.15}
          luminanceSmoothing={0.9}
          mipmapBlur
        />
        <Vignette
          offset={0.3}
          darkness={0.55}
          blendFunction={BlendFunction.NORMAL}
        />
      </EffectComposer>
    );
  }

  if (bloomEnabled) {
    return (
      <EffectComposer>
        <Bloom
          intensity={0.7}
          luminanceThreshold={0.15}
          luminanceSmoothing={0.9}
          mipmapBlur
        />
      </EffectComposer>
    );
  }

  if (vignetteEnabled) {
    return (
      <EffectComposer>
        <Vignette
          offset={0.3}
          darkness={0.55}
          blendFunction={BlendFunction.NORMAL}
        />
      </EffectComposer>
    );
  }

  return null;
}
