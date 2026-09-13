uniform float time;

varying vec3 vWorldPosition;
varying vec3 vNormal;
varying vec2 vUv;

void main() {
  vUv = uv;
  vec3 pos = position;

  float wave1 = sin(pos.x * 0.02 + time * 1.5) * 0.4;
  float wave2 = sin(pos.z * 0.03 + time * 1.2) * 0.3;
  float wave3 = sin((pos.x + pos.z) * 0.015 + time * 0.8) * 0.2;
  pos.y += wave1 + wave2 + wave3;

  vec4 worldPosition = modelMatrix * vec4(pos, 1.0);
  vWorldPosition = worldPosition.xyz;

  float dx = cos(pos.x * 0.02 + time * 1.5) * 0.02 * 0.4;
  float dz = cos(pos.z * 0.03 + time * 1.2) * 0.03 * 0.3;
  vNormal = normalize(vec3(-dx, 1.0, -dz));

  gl_Position = projectionMatrix * viewMatrix * worldPosition;
}
