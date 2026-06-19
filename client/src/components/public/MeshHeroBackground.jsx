import { useRef, useEffect } from 'react'

/* ─────────────────────────────────────────────────────────────────────
 * MeshHeroBackground
 * Animated WebGL "mesh gradient" for the landing hero. Renders the exact
 * ProCuro orb palette (#052532 base with teal/celeste/marigold/sand/mauve/
 * lavender accents) as a continuous, slowly-drifting field via domain-warped
 * fbm noise. Heavily blurred via CSS for a soft look, so we render the buffer
 * below display size for performance and let the browser upscale + blur it.
 *
 * Falls back silently to the hero's solid #052532 background if WebGL is
 * unavailable. Cleans up its animation frame + resize listener on unmount.
 * ──────────────────────────────────────────────────────────────────── */

const RENDER_SCALE = 0.6

const VERT = `
  attribute vec2 a_pos;
  void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`

const FRAG = `
  precision highp float;
  uniform float u_time;
  uniform vec2  u_resolution;

  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
  }
  float fbm(vec2 p) {
    float v = 0.0;
    float amp = 0.5;
    for (int i = 0; i < 6; i++) {
      v += amp * noise(p);
      p *= 2.0;
      amp *= 0.5;
    }
    return v;
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution.xy;
    vec2 p = uv;
    p.x *= u_resolution.x / u_resolution.y;
    float t = u_time * 0.10;

    vec2 q = vec2(fbm(p + vec2(0.0, t)), fbm(p + vec2(5.2, 1.3 - t)));
    vec2 r = vec2(fbm(p + 2.0 * q + vec2(1.7, 9.2) + 0.30 * t),
                  fbm(p + 2.0 * q + vec2(8.3, 2.8) - 0.20 * t));
    float f = fbm(p + 2.0 * r);

    // Exact hero orb colours floating on the #052532 base, plus added red + purple.
    vec3 base     = vec3(0.020, 0.145, 0.196); // #052532 midnight.dark (hero bg)
    vec3 tealL    = vec3(0.369, 0.588, 0.643); // #5E96A4 teal.light
    vec3 celeste  = vec3(0.753, 0.835, 0.839); // #C0D5D6 celeste
    vec3 marigold = vec3(0.647, 0.553, 0.400); // #A58D66 accent
    vec3 sand     = vec3(0.749, 0.663, 0.533); // #BFA988 accent.light
    vec3 mauve    = vec3(0.690, 0.482, 0.545); // #B07B8B
    vec3 lavender = vec3(0.694, 0.612, 0.851); // #B19CD9
    vec3 red      = vec3(0.839, 0.271, 0.271); // #D64545 added red
    vec3 purple   = vec3(0.486, 0.227, 0.929); // #7C3AED added purple

    vec3 col = base;
    col = mix(col, tealL,    smoothstep(0.25, 0.75, f)             * 0.85);
    col = mix(col, celeste,  smoothstep(0.45, 0.95, r.y)           * 0.60);
    col = mix(col, marigold, smoothstep(0.40, 0.90, q.x)           * 0.50);
    col = mix(col, lavender, smoothstep(0.55, 1.00, q.y)           * 0.45);
    col = mix(col, mauve,    smoothstep(0.55, 1.00, r.x)           * 0.35);
    col = mix(col, sand,     smoothstep(0.60, 1.00, f * q.x)       * 0.30);
    col = mix(col, purple,   smoothstep(0.40, 0.90, 1.0 - q.y)     * 0.45);
    col = mix(col, red,      smoothstep(0.45, 0.95, 1.0 - r.y)     * 0.40);

    gl_FragColor = vec4(col, 1.0);
  }
`

function compileShader(gl, type, src) {
  const shader = gl.createShader(type)
  gl.shaderSource(shader, src)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error('MeshHeroBackground shader error:', gl.getShaderInfoLog(shader))
    gl.deleteShader(shader)
    return null
  }
  return shader
}

export default function MeshHeroBackground({ className }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const gl = canvas.getContext('webgl', { antialias: false, premultipliedAlpha: false })
    if (!gl) return // silent fallback to the hero's solid background

    const vert = compileShader(gl, gl.VERTEX_SHADER, VERT)
    const frag = compileShader(gl, gl.FRAGMENT_SHADER, FRAG)
    if (!vert || !frag) return

    const program = gl.createProgram()
    gl.attachShader(program, vert)
    gl.attachShader(program, frag)
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('MeshHeroBackground link error:', gl.getProgramInfoLog(program))
      return
    }

    const a_pos = gl.getAttribLocation(program, 'a_pos')
    const u_time = gl.getUniformLocation(program, 'u_time')
    const u_resolution = gl.getUniformLocation(program, 'u_resolution')

    const buffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1, -1,  1, -1,  -1, 1,
      -1,  1,  1, -1,   1, 1,
    ]), gl.STATIC_DRAW)

    function resize() {
      const w = Math.max(1, Math.floor(canvas.clientWidth * RENDER_SCALE))
      const h = Math.max(1, Math.floor(canvas.clientHeight * RENDER_SCALE))
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w
        canvas.height = h
      }
      gl.viewport(0, 0, canvas.width, canvas.height)
    }
    window.addEventListener('resize', resize)

    let raf
    const start = performance.now()
    function render(now) {
      resize()
      gl.useProgram(program)
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
      gl.enableVertexAttribArray(a_pos)
      gl.vertexAttribPointer(a_pos, 2, gl.FLOAT, false, 0, 0)
      gl.uniform1f(u_time, (now - start) / 1000)
      gl.uniform2f(u_resolution, canvas.width, canvas.height)
      gl.drawArrays(gl.TRIANGLES, 0, 6)
      raf = requestAnimationFrame(render)
    }
    raf = requestAnimationFrame(render)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      gl.deleteBuffer(buffer)
      gl.deleteProgram(program)
      gl.deleteShader(vert)
      gl.deleteShader(frag)
    }
  }, [])

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />
}
