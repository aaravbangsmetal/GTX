uniform vec3 waterColor;
uniform vec3 sunDirection;
uniform float reflectivity;
uniform float time;

varying vec3 vWorldPosition;
varying vec3 vNormal;
varying vec2 vUv;

void main() {
  vec3 normal = normalize(vNormal);
  vec3 viewDir = normalize(cameraPosition - vWorldPosition);
  vec3 sunDir = normalize(sunDirection);

  float fresnel = pow(1.0 - max(dot(viewDir, normal), 0.0), 3.0);
  float spec = pow(max(dot(reflect(-sunDir, normal), viewDir), 0.0), 64.0);

  vec3 color = waterColor;
  color = mix(color, vec3(0.2, 0.8, 0.9), fresnel * reflectivity);
  color += vec3(1.0, 0.8, 0.5) * spec * 0.5;

  float foam = sin(vUv.x * 50.0 + time) * sin(vUv.y * 50.0 + time * 0.7);
  color += vec3(0.1) * smoothstep(0.95, 1.0, foam) * 0.3;

  gl_FragColor = vec4(color, 0.92);
}
