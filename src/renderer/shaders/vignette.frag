uniform sampler2D tDiffuse;
uniform float strength;

varying vec2 vUv;

void main() {
  vec4 color = texture2D(tDiffuse, vUv);
  vec2 uv = vUv * 2.0 - 1.0;
  float dist = length(uv);
  float vignette = smoothstep(0.8, 0.2, dist);
  color.rgb *= mix(1.0 - strength, 1.0, vignette);
  gl_FragColor = color;
}
