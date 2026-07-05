export const GRASS_VERTEX_SHADER = /* glsl */ `
  uniform float uTime;
  uniform sampler2D uNoiseTex;
  uniform float uWindAmp;
  uniform float uWindSpeed;
  uniform float uNoiseFactor;

  varying vec2 vUv;
  varying vec3 vWorldPos;

  void main() {
    vUv = uv;

    vec4 mvPos = vec4(position, 1.0);
    #ifdef USE_INSTANCING
      mvPos = instanceMatrix * mvPos;
    #endif
    vWorldPos = mvPos.xyz;

    float power = uv.y * uv.y;

    vec2 noiseUV = mvPos.xz * 0.04 + vec2(uTime * 0.018, 0.0);
    vec4 noise = texture2D(uNoiseTex, noiseUV);

    float wx = sin(mvPos.z * 0.45 + uTime * uWindSpeed) * uWindAmp;
    float wz = cos(mvPos.x * 0.38 + uTime * uWindSpeed * 0.75) * uWindAmp * 0.4;
    wx += (noise.r - 0.5) * uWindAmp * uNoiseFactor;
    wz += (noise.g - 0.5) * uWindAmp * uNoiseFactor * 0.5;

    mvPos.x += wx * power;
    mvPos.z += wz * power;

    gl_Position = projectionMatrix * modelViewMatrix * mvPos;
  }
`;

export const GRASS_FRAGMENT_SHADER = /* glsl */ `
  uniform sampler2D uGrassAlpha;
  uniform sampler2D uNoiseTex;
  uniform vec3 uBaseColor;
  uniform vec3 uTipColor1;
  uniform vec3 uTipColor2;

  varying vec2 vUv;
  varying vec3 vWorldPos;

  void main() {
    float mask = texture2D(uGrassAlpha, vUv).r;
    if (mask < 0.15) discard;

    vec4 noise = texture2D(uNoiseTex, vWorldPos.xz * 0.022);
    vec3 tip = mix(uTipColor1, uTipColor2, noise.r);
    vec3 color = mix(uBaseColor, tip, vUv.y);

    color *= 0.7 + 0.3 * vUv.y;

    gl_FragColor = vec4(color, 1.0);
  }
`;
