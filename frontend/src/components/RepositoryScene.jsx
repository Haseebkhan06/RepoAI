import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import './RepositoryScene.css'

export default function RepositoryScene({ thinking, scanKey, pulseKey }) {
  const canvasRef = useRef(null)
  const api = useRef({})

  useEffect(() => {
    const canvas = canvasRef.current
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100)
    camera.position.z = 9
    const group = new THREE.Group()
    scene.add(group)

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const CLUSTERS = 16
    const N = 800
    const BASE = 0.4
    const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) / 1.5

    // clusters are folders, stars are files
    const centers = Array.from(
      { length: CLUSTERS },
      () => new THREE.Vector3(gauss() * 4.4, gauss() * 3.4, gauss() * 3.4),
    )
    const pos = new Float32Array(N * 3)
    const cluster = new Array(N)
    for (let i = 0; i < N; i++) {
      const c = i % CLUSTERS
      cluster[i] = c
      pos[i * 3] = centers[c].x + gauss() * 0.9
      pos[i * 3 + 1] = centers[c].y + gauss() * 0.9
      pos[i * 3 + 2] = centers[c].z + gauss() * 0.9
    }
    const glow = new Float32Array(N).fill(BASE)
    const base = new Float32Array(N).fill(BASE)
    const size = Float32Array.from({ length: N }, () => 5 + Math.random() * 8)
    const phase = Float32Array.from({ length: N }, () => Math.random() * 6.28)

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    geo.setAttribute('aGlow', new THREE.BufferAttribute(glow, 1))
    geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1))
    geo.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1))

    const uniforms = {
      uTime: { value: 0 },
      uScale: { value: renderer.getPixelRatio() },
    }
    const mat = new THREE.ShaderMaterial({
      uniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: `
        attribute float aGlow; attribute float aSize; attribute float aPhase;
        uniform float uTime; uniform float uScale; varying float vGlow;
        void main() {
          vGlow = aGlow + 0.08 * sin(uTime * 1.4 + aPhase);
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * (0.6 + vGlow * 1.1) * uScale * (9.0 / -mv.z);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        varying float vGlow;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          if (d > 0.5) discard;
          float a = smoothstep(0.5, 0.0, d);
          vec3 col = mix(vec3(0.62, 0.7, 0.95), vec3(1.0, 0.88, 0.54), clamp(vGlow - 0.3, 0.0, 1.0));
          gl_FragColor = vec4(col, a * clamp(vGlow + 0.3, 0.0, 1.0));
        }`,
    })
    group.add(new THREE.Points(geo, mat))

    // lines: each star joins its nearest neighbour in the same folder
    const seg = []
    for (let i = 0; i < N; i++) {
      let best = -1
      let bd = 1e9
      for (let j = 0; j < N; j++) {
        if (j === i || cluster[j] !== cluster[i]) continue
        const dx = pos[i * 3] - pos[j * 3]
        const dy = pos[i * 3 + 1] - pos[j * 3 + 1]
        const dz = pos[i * 3 + 2] - pos[j * 3 + 2]
        const d = dx * dx + dy * dy + dz * dz
        if (d < bd) { bd = d; best = j }
      }
      if (best > -1) {
        seg.push(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2], pos[best * 3], pos[best * 3 + 1], pos[best * 3 + 2])
      }
    }
    const lineGeo = new THREE.BufferGeometry()
    lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(seg, 3))
    const lineMat = new THREE.LineBasicMaterial({ color: 0xa3abd3, transparent: true, opacity: 0.1 })
    group.add(new THREE.LineSegments(lineGeo, lineMat))

    // state
    let mode = 'idle'
    let isThinking = false
    let scanPtr = 0
    let wave = -1
    let lineTarget = 0.1
    const order = [...Array(N).keys()].sort((a, b) => cluster[a] - cluster[b]) // folder by folder
    let mx = 0
    let my = 0
    const onMove = (e) => {
      mx = e.clientX / window.innerWidth - 0.5
      my = e.clientY / window.innerHeight - 0.5
    }
    window.addEventListener('pointermove', onMove)

    function resize() {
      const w = window.innerWidth
      const h = window.innerHeight
      renderer.setSize(w, h, false)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      group.position.x = w > 900 ? 3.6 : 0
      group.scale.setScalar(w > 900 ? 1.1 : 0.8)
    }
    window.addEventListener('resize', resize)
    resize()

    const attr = geo.attributes.aGlow
    let raf
    function frame(t) {
      uniforms.uTime.value = t / 1000
      if (!reduceMotion) {
        group.rotation.y += isThinking ? 0.004 : 0.0009
        group.rotation.x += (my * 0.3 - group.rotation.x) * 0.03
        group.rotation.y += mx * 0.0006
      }
      if (mode === 'scan') {
        for (let k = 0; k < 10 && scanPtr < N; k++) {
          const i = order[scanPtr++]
          glow[i] = 1.7
          base[i] = 0.7
        }
        if (scanPtr >= N) { mode = 'idle'; lineTarget = 0.2 }
      }
      if (isThinking) {
        for (let k = 0; k < 6; k++) glow[(Math.random() * N) | 0] = 1.6
      }
      if (wave >= 0) {
        wave += 0.16
        for (let i = 0; i < N; i++) {
          const d = Math.hypot(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2])
          if (Math.abs(d - wave) < 0.5) glow[i] = 1.9
        }
        if (wave > 9) wave = -1
      }
      for (let i = 0; i < N; i++) glow[i] += (base[i] - glow[i]) * 0.04
      attr.needsUpdate = true
      lineMat.opacity += ((isThinking ? 0.3 : lineTarget) - lineMat.opacity) * 0.05
      renderer.render(scene, camera)
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)

    api.current = {
      scan() { mode = 'scan'; scanPtr = 0; base.fill(BASE); lineTarget = 0.1 },
      setThinking(on) { isThinking = on },
      pulse() { wave = 0 },
    }

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('resize', resize)
      geo.dispose()
      lineGeo.dispose()
      mat.dispose()
      lineMat.dispose()
      renderer.dispose()
    }
  }, [])

  useEffect(() => { api.current.setThinking?.(thinking) }, [thinking])
  useEffect(() => { if (scanKey) api.current.scan?.() }, [scanKey])
  useEffect(() => { if (pulseKey) api.current.pulse?.() }, [pulseKey])

  return <canvas ref={canvasRef} className="scene" aria-hidden="true" />
}