uniform sampler2D tDiffuse;
uniform sampler2D noiseMap;
uniform float strength;
uniform float time;

varying vec2 vUv;

void main() {
  vec4 color = texture2D(tDiffuse, vUv);
  float noise = texture2D(noiseMap, vUv * 3.0 + time * 0.1).r;
  color.rgb += (noise - 0.5) * strength;
  gl_FragColor = color;
}
