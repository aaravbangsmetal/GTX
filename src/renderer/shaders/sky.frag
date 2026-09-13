uniform vec3 topColor;
uniform vec3 bottomColor;
uniform vec3 horizonColor;
uniform float sunAngle;
uniform float dayMix;

varying vec3 vWorldPosition;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

void main() {
  vec3 dir = normalize(vWorldPosition);
  float h = dir.y * 0.5 + 0.5;

  vec3 skyColor = mix(bottomColor, horizonColor, smoothstep(0.0, 0.35, h));
  skyColor = mix(skyColor, topColor, smoothstep(0.35, 1.0, h));

  vec3 sunDir = normalize(vec3(cos(sunAngle), sin(sunAngle), 0.3));
  float sunDot = max(dot(dir, sunDir), 0.0);
  float sunDisc = pow(sunDot, 256.0) * dayMix;
  float sunGlow = pow(sunDot, 8.0) * 0.3 * dayMix;
  skyColor += vec3(1.0, 0.6, 0.3) * (sunDisc + sunGlow);

  float nightMix = 1.0 - dayMix;
  if (nightMix > 0.01 && dir.y > 0.1) {
    vec2 starUv = dir.xz / (dir.y + 0.1);
    float star = step(0.995, hash(floor(starUv * 200.0)));
    skyColor += vec3(star) * nightMix * 0.8;
  }

  gl_FragColor = vec4(skyColor, 1.0);
}
