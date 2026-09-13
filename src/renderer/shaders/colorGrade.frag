uniform sampler2D tDiffuse;
uniform sampler2D lutMap;
uniform float lutSize;

varying vec2 vUv;

vec3 applyLut(vec3 color) {
  float size = lutSize;
  float slice = color.b * (size - 1.0);
  float sliceZ = floor(slice);
  float sliceT = slice - sliceZ;

  float cellSize = 1.0 / size;
  float halfCell = cellSize * 0.5;

  vec2 uv0 = vec2(
    color.r * (size - 1.0) / size + halfCell,
    color.g * (size - 1.0) / size + halfCell
  );
  uv0.x += sliceZ * cellSize;

  vec2 uv1 = uv0;
  uv1.x += cellSize;

  vec3 sample0 = texture2D(lutMap, uv0).rgb;
  vec3 sample1 = texture2D(lutMap, uv1).rgb;
  return mix(sample0, sample1, sliceT);
}

void main() {
  vec4 color = texture2D(tDiffuse, vUv);
  color.rgb = applyLut(color.rgb);
  gl_FragColor = color;
}
