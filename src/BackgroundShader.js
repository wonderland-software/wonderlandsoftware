import { useEffect, useRef } from 'react';

const VERT = `
attribute vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`;

// Procedural canvas-weave: perpendicular warp/weft threads, half-cylinder
// cross-section per thread, basket-weave over/under via checker mask, simple
// lambertian lighting from upper-left. Static — rendered once per resize.
const FRAG = `
precision mediump float;
uniform vec2 u_res;
uniform float u_dpr;

float hash21(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

void main() {
  vec2 fc = gl_FragCoord.xy;
  vec2 uv = fc / u_res;

  // Roughly 4 CSS pixels per thread regardless of DPR
  float scale = 4.0 * u_dpr;

  vec2 g = fc / scale;
  vec2 cellId = floor(g);
  vec2 cellPos = fract(g) - 0.5; // -0.5 to 0.5 within each cell

  // Subtle per-cell jitter so the weave doesn't read as a perfect grid
  float jx = (hash21(cellId) - 0.5) * 0.18;
  float jy = (hash21(cellId.yx + 7.3) - 0.5) * 0.18;
  vec2 p = cellPos + vec2(jx, jy);

  float PI = 3.14159265;

  // Half-cylinder height profile for warp (vertical) and weft (horizontal)
  float warpH = max(cos(p.x * PI), 0.0);
  float weftH = max(cos(p.y * PI), 0.0);

  // Basket-weave: alternate which thread is on top
  float chk = mod(cellId.x + cellId.y, 2.0);
  float warpAmp = mix(1.0, 0.45, chk);
  float weftAmp = mix(0.45, 1.0, chk);
  float warpZ = warpH * warpAmp;
  float weftZ = weftH * weftAmp;

  // Pick the dominant thread for the surface normal at this pixel
  vec3 n;
  if (warpZ >= weftZ) {
    n = vec3(sin(p.x * PI), 0.0, max(cos(p.x * PI), 0.01));
  } else {
    n = vec3(0.0, sin(p.y * PI), max(cos(p.y * PI), 0.01));
  }
  n = normalize(n);

  // Light from upper-left, slightly forward — gives raised threads a soft sheen
  vec3 L = normalize(vec3(-0.45, 0.55, 0.7));
  float diffuse = max(dot(n, L), 0.0);

  // Approx ambient occlusion: deeper in the valleys between threads
  float ao = smoothstep(0.05, 0.8, max(warpZ, weftZ));

  // Per-thread irregularity (warm/cool variation)
  float v = (hash21(cellId) - 0.5) * 0.022;

  // Wide soft vignette so the edges feel like a stretched canvas
  float vig = 1.0 - smoothstep(0.4, 1.1, length((uv - 0.5) * vec2(1.0, 1.1)));

  // Build final value — extremely white-dominant
  float val = 0.935 + diffuse * 0.065 - (1.0 - ao) * 0.045 + v;
  val *= mix(0.965, 1.0, vig);

  // Tiny grain to break up any banding
  float grain = (hash21(fc) - 0.5) * 0.006;
  val += grain;

  gl_FragColor = vec4(vec3(clamp(val, 0.0, 1.0)), 1.0);
}
`;

function makeShader(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  return s;
}

export default function BackgroundShader() {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) return;

    const prog = gl.createProgram();
    gl.attachShader(prog, makeShader(gl, gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, makeShader(gl, gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW
    );
    const posLoc = gl.getAttribLocation(prog, 'a_pos');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(prog, 'u_res');
    const uDpr = gl.getUniformLocation(prog, 'u_dpr');

    const render = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uDpr, dpr);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    };
    render();
    window.addEventListener('resize', render);
    return () => window.removeEventListener('resize', render);
  }, []);

  return (
    <canvas
      ref={ref}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
        pointerEvents: 'none',
        display: 'block',
      }}
    />
  );
}
