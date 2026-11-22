const m=`#version 300 es
in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`,f=`#version 300 es
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform vec2 uMouse;
uniform vec2 uVel;
uniform vec3 uBase;
uniform vec3 uGlow;
uniform vec3 uWarm;
uniform float uStrength;
out vec4 outColor;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  mat2 r = mat2(0.8, -0.6, 0.6, 0.8);
  for (int i = 0; i < 4; i++) { v += a * noise(p); p = r * p * 2.02; a *= 0.5; }
  return v;
}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
  vec2 m = (uMouse - 0.5 * uRes) / uRes.y;
  vec2 dm = p - m;
  float d2 = dot(dm, dm);
  // The cursor parts the light around it and drags it along with its motion.
  vec2 push = dm * exp(-d2 * 5.0) * 0.45 - uVel * exp(-d2 * 7.0) * 0.9;
  vec2 q = p * 0.85 + push;
  float t = uTime * 0.035;
  vec2 w = vec2(fbm(q + vec2(t, -0.6 * t)), fbm(q + vec2(5.2, 1.3) - t));
  float f = fbm(q + 2.2 * w + vec2(0.4 * t, 0.2 * t));

  vec3 col = uBase;
  float glow = smoothstep(0.46, 0.86, f);
  glow *= glow * (3.0 - 2.0 * glow);
  float warm = smoothstep(0.55, 1.0, w.y) * (1.0 - glow * 0.6);
  col = mix(col, uGlow, glow * 0.72 * uStrength);
  col = mix(col, uWarm, warm * 0.2 * uStrength);
  col += uGlow * exp(-d2 * 3.5) * 0.05 * uStrength; // a little light where the cursor is
  // Darker towards the edges so content in the middle reads first.
  col *= mix(1.0, 0.72, smoothstep(0.35, 1.05, length((uv - 0.5) * vec2(1.25, 1.0))));
  // Dither to stop banding in the dark gradients.
  col += (hash(gl_FragCoord.xy + fract(uTime)) - 0.5) / 255.0 * 1.5;
  outColor = vec4(col, 1.0);
}`,c=h=>{const s=h.trim(),t=s.match(/^#([0-9a-f]{6})$/i);if(t){const e=parseInt(t[1],16);return[(e>>16&255)/255,(e>>8&255)/255,(e&255)/255]}const r=s.match(/[\d.]+/g);return r&&r.length>=3?[+r[0]/255,+r[1]/255,+r[2]/255]:[.07,.07,.06]};class g{canvas=null;gl=null;prog=null;u={};base=[.067,.067,.063];glow=[.55,.45,.4];glowTarget=[.55,.45,.4];warm=[.878,.475,.29];strength=1;mouse={x:0,y:0,tx:0,ty:0,vx:0,vy:0};scale=.5;still=!1;started=performance.now();raf=0;init(){if(this.gl)return!0;const s=document.querySelector("canvas.bg-glow");if(!s)return!1;const t=s.getContext("webgl2",{antialias:!1,alpha:!1,powerPreference:"low-power"});if(!t)return!1;const r=(e,i)=>{const o=t.createShader(e);if(t.shaderSource(o,i),t.compileShader(o),!t.getShaderParameter(o,t.COMPILE_STATUS))throw new Error(t.getShaderInfoLog(o)??"shader");return o};try{const e=t.createProgram();if(t.attachShader(e,r(t.VERTEX_SHADER,m)),t.attachShader(e,r(t.FRAGMENT_SHADER,f)),t.linkProgram(e),!t.getProgramParameter(e,t.LINK_STATUS))throw new Error(t.getProgramInfoLog(e)??"link");t.useProgram(e);const i=t.createBuffer();t.bindBuffer(t.ARRAY_BUFFER,i),t.bufferData(t.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),t.STATIC_DRAW);const o=t.getAttribLocation(e,"aPos");t.enableVertexAttribArray(o),t.vertexAttribPointer(o,2,t.FLOAT,!1,0,0);for(const a of["uRes","uTime","uMouse","uVel","uBase","uGlow","uWarm","uStrength"])this.u[a]=t.getUniformLocation(e,a);this.prog=e}catch(e){return console.warn("[bg-glow] disabled:",e),!1}return this.canvas=s,this.gl=t,this.still=matchMedia("(prefers-reduced-motion: reduce)").matches,this.readTheme(),this.resize(),this.mouse.x=this.mouse.tx=innerWidth*.5,this.mouse.y=this.mouse.ty=innerHeight*.45,addEventListener("resize",()=>this.resize()),addEventListener("pointermove",e=>{this.mouse.tx=e.clientX,this.mouse.ty=e.clientY},{passive:!0}),document.addEventListener("visibilitychange",()=>document.hidden?cancelAnimationFrame(this.raf):this.loop()),new MutationObserver(()=>this.readTheme()).observe(document.documentElement,{attributes:!0,attributeFilter:["data-theme"]}),document.documentElement.classList.add("has-glow"),this.loop(),!0}readTheme(){const s=document.documentElement.dataset.theme==="light";this.base=c(getComputedStyle(document.body).backgroundColor),this.warm=s?[.95,.72,.58]:[.5,.2,.09],this.strength=s?.55:1}setColor(s){if(!s)return;const t=c(s),e=document.documentElement.dataset.theme==="light"?.9:.72,i=(t[0]+t[1]+t[2])/3;this.glowTarget=t.map(o=>(o*.88+i*.12)*e),this.still&&(this.glow=this.glowTarget,this.draw(performance.now()))}resize(){if(!this.canvas||!this.gl)return;const s=matchMedia("(pointer: coarse)").matches;this.scale=s?.25:.33,this.canvas.width=Math.max(1,Math.round(innerWidth*this.scale)),this.canvas.height=Math.max(1,Math.round(innerHeight*this.scale)),this.gl.viewport(0,0,this.canvas.width,this.canvas.height),this.still&&this.draw(performance.now())}draw(s){const t=this.gl,r=this.u,e=this.mouse;if(!this.still){const o=e.x,a=e.y;e.x+=(e.tx-e.x)*.14,e.y+=(e.ty-e.y)*.14,e.vx+=((e.x-o)/innerHeight*6-e.vx)*.1,e.vy+=((e.y-a)/innerHeight*6-e.vy)*.1,this.glow=this.glow.map((l,u)=>l+(this.glowTarget[u]-l)*.055)}const i=this.scale;t.uniform2f(r.uRes,this.canvas.width,this.canvas.height),t.uniform1f(r.uTime,this.still?12:(s-this.started)/1e3),t.uniform2f(r.uMouse,e.x*i,(innerHeight-e.y)*i),t.uniform2f(r.uVel,e.vx,-e.vy),t.uniform3f(r.uBase,...this.base),t.uniform3f(r.uGlow,...this.glow),t.uniform3f(r.uWarm,...this.warm),t.uniform1f(r.uStrength,this.strength),t.drawArrays(t.TRIANGLES,0,3)}loop=()=>{if(cancelAnimationFrame(this.raf),this.still){this.draw(performance.now());return}let s=0;const t=r=>{r-s>=32&&(s=r,this.draw(r)),this.raf=requestAnimationFrame(t)};this.raf=requestAnimationFrame(t)}}let n=null;function d(){return n||(n=new g),n}export{d as b};
