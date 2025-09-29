"use client";

import { useEffect, useRef } from "react";

// Lightweight WebGL fragment shader: animated noise + gradient
const frag = `
precision mediump float;
uniform vec2 u_res;
uniform float u_time;
uniform vec2 u_mouse; // 0..1

// Simple hash noise
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);} 
float noise(in vec2 p){
  vec2 i=floor(p), f=fract(p);
  float a=hash(i), b=hash(i+vec2(1.,0.)), c=hash(i+vec2(0.,1.)), d=hash(i+vec2(1.,1.));
  vec2 u=f*f*(3.-2.*f);
  return mix(a,b,u.x)+ (c-a)*u.y*(1.-u.x) + (d-b)*u.x*u.y;
}

void main(){
  vec2 uv = gl_FragCoord.xy / u_res.xy;
  uv.x *= u_res.x / u_res.y;
  vec2 m = u_mouse;
  float t = u_time*0.08;
  float n = noise(uv*3.0 + t) * 0.6 + noise(uv*6.0 - t*1.2) * 0.4;
  float glow = smoothstep(0.2, 1.0, n);
  vec3 base = mix(vec3(0.02,0.05,0.09), vec3(0.12,0.35,0.8), glow);
  // Parallax tint by mouse
  base += vec3(0.05,0.15,0.3) * (m.x*0.4 + m.y*0.3);
  // Vignette
  float d = distance(uv, vec2(0.5));
  base *= smoothstep(0.95, 0.3, d);
  gl_FragColor = vec4(base, 1.0);
}`;

const vert = `
attribute vec2 position;
void main(){
  gl_Position = vec4(position, 0.0, 1.0);
}`;

export function HeroShader() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: 0.5, y: 0.5 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl", { antialias: false, depth: false, stencil: false });
    if (!gl) return;

    // Compile helpers
    function compile(type: number, src: string) {
      const s = gl.createShader(type)!; gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.warn(gl.getShaderInfoLog(s));
      }
      return s;
    }
    const vs = compile(gl.VERTEX_SHADER, vert);
    const fs = compile(gl.FRAGMENT_SHADER, frag);
    const prog = gl.createProgram()!; gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
    gl.useProgram(prog);

    // Fullscreen quad
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1,-1, 1,-1, -1,1,  -1,1, 1,-1, 1,1
    ]), gl.STATIC_DRAW);
    const posLoc = gl.getAttribLocation(prog, "position");
    gl.enableVertexAttribArray(posLoc); gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(prog, "u_res");
    const uTime = gl.getUniformLocation(prog, "u_time");
    const uMouse = gl.getUniformLocation(prog, "u_mouse");

    let raf = 0; let start = performance.now();
    function resize(){
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvas.clientWidth * dpr;
      const h = canvas.clientHeight * dpr;
      if (canvas.width !== w || canvas.height !== h){ canvas.width = w; canvas.height = h; }
      gl.viewport(0,0,canvas.width, canvas.height);
    }
    const onMouse = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current.x = (e.clientX - rect.left) / rect.width;
      mouseRef.current.y = (e.clientY - rect.top) / rect.height;
    };
    const onTouch = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t) return; const rect = canvas.getBoundingClientRect();
      mouseRef.current.x = (t.clientX - rect.left) / rect.width;
      mouseRef.current.y = (t.clientY - rect.top) / rect.height;
    };

    function frame(){
      raf = requestAnimationFrame(frame);
      resize();
      const t = (performance.now() - start) / 1000;
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, t);
      gl.uniform2f(uMouse, mouseRef.current.x, 1.0 - mouseRef.current.y);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
    frame();

    window.addEventListener('mousemove', onMouse);
    window.addEventListener('touchmove', onTouch, { passive: true });
    const stop = () => { cancelAnimationFrame(raf); window.removeEventListener('mousemove', onMouse); window.removeEventListener('touchmove', onTouch); };
    return stop;
  }, []);

  return (
    <div className="absolute inset-0 -z-10 rounded-2xl overflow-hidden">
      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
}


