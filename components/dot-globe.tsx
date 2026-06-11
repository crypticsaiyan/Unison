"use client"

import { useEffect, useRef, useState } from "react"
import createGlobe from "cobe"

interface DotGlobeProps {
  className?: string
  /** Auto-rotation speed. */
  speed?: number
}

const LANGUAGES = [
  { id: 'en', lat: 40.7128, lng: -74.0060, label: 'English',    flag: '🇺🇸' },
  { id: 'es', lat: 40.4637, lng: -3.7492,  label: 'Español',   flag: '🇪🇸' },
  { id: 'fr', lat: 46.2276, lng: 2.2137,   label: 'Français',  flag: '🇫🇷' },
  { id: 'de', lat: 51.1657, lng: 10.4515,  label: 'Deutsch',   flag: '🇩🇪' },
  { id: 'it', lat: 41.8719, lng: 12.5674,  label: 'Italiano',  flag: '🇮🇹' },
  { id: 'pt', lat: -14.235, lng: -51.9253, label: 'Português', flag: '🇧🇷' },
  { id: 'nl', lat: 52.3676, lng: 4.9041,   label: 'Nederlands',flag: '🇳🇱' },
  { id: 'hi', lat: 20.5937, lng: 78.9629,  label: 'हिन्दी',      flag: '🇮🇳' },
  { id: 'ar', lat: 23.4241, lng: 53.8478,  label: 'العربية',   flag: '🇦🇪' },
  { id: 'zh', lat: 35.8617, lng: 104.1954, label: '中文',       flag: '🇨🇳' },
  { id: 'ja', lat: 36.2048, lng: 138.2529, label: '日本語',     flag: '🇯🇵' },
  { id: 'ko', lat: 35.9078, lng: 127.7669, label: '한국어',     flag: '🇰🇷' },
  { id: 'vi', lat: 14.0583, lng: 108.2772, label: 'Tiếng Việt',flag: '🇻🇳' },
  { id: 'pl', lat: 51.9194, lng: 19.1451,  label: 'Polski',    flag: '🇵🇱' },
  { id: 'uk', lat: 48.3794, lng: 31.1656,  label: 'Українська',flag: '🇺🇦' },
]

/**
 * Real dotted Earth globe (continents rendered as dots) via cobe/WebGL,
 * themed to the Unison baltic-sea / keppel palette and auto-rotating.
 * Drag to spin freely in any direction. Language badges follow their countries.
 */
export function DotGlobe({ className, speed = 0.004 }: DotGlobeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Accumulated rotation
  const phi   = useRef(0)
  const theta = useRef(0.25)
  // Live drag delta (relative to drag start)
  const dragStart  = useRef<{ x: number; y: number } | null>(null)
  const dragDelta  = useRef({ phi: 0, theta: 0 })
  // Momentum: velocity from last pointer move
  const velocity   = useRef({ phi: 0, theta: 0 })
  const lastMove   = useRef<{ x: number; y: number; t: number } | null>(null)

  const [ready, setReady] = useState(false)
  const badgeRefs = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    let width = 0
    const onResize = () => {
      width = canvas.offsetWidth || canvas.parentElement?.offsetWidth || 480
    }
    window.addEventListener("resize", onResize)
    onResize()

    const globe = createGlobe(canvas, {
      devicePixelRatio: Math.min(window.devicePixelRatio || 1, 2),
      width: width * 2,
      height: width * 2,
      phi: 0,
      theta: 0.25,
      dark: 1,
      diffuse: 1.3,
      mapSamples: 22000,
      mapBrightness: 8,
      baseColor: [0.09, 0.13, 0.16],
      markerColor: [0.45, 0.9, 0.82],
      glowColor: [0.15, 0.35, 0.34],
      markers: [],
    })

    const THETA_MIN = -0.6, THETA_MAX = 0.9

    let rafId = 0
    const tick = () => {
      if (dragStart.current === null) {
        // Auto-rotate + momentum decay
        phi.current += speed + velocity.current.phi
        theta.current = Math.max(THETA_MIN, Math.min(THETA_MAX, theta.current + velocity.current.theta))
        velocity.current.phi   *= 0.92
        velocity.current.theta *= 0.92
      }

      const currentPhi   = phi.current   + dragDelta.current.phi
      const currentTheta = Math.max(THETA_MIN, Math.min(THETA_MAX,
        theta.current + dragDelta.current.theta))
      
      globe.update({ 
        phi: currentPhi, 
        theta: currentTheta, 
        width: width * 2, 
        height: width * 2 
      })

      // Replicate cobe's internal U() + O() projection exactly.
      // U([lat, lng]) -> 3D unit vector (cobe offsets lng by -PI)
      // O(vec3) -> {x, y, visible} in [0,1] canvas space
      const cosT = Math.cos(currentTheta), sinT = Math.sin(currentTheta)
      const cosF = Math.cos(currentPhi),   sinF = Math.sin(currentPhi)

      LANGUAGES.forEach((lang, i) => {
        const el = badgeRefs.current[i]
        if (!el) return

        const latR = lang.lat * Math.PI / 180
        const lngR = lang.lng * Math.PI / 180 - Math.PI  // cobe subtracts PI from lng
        const cosLat = Math.cos(latR)

        // cobe U(): [-cosLat*cos(lngR), sin(latR), cosLat*sin(lngR)]
        const vx = -cosLat * Math.cos(lngR)
        const vy =  Math.sin(latR)
        const vz =  cosLat * Math.sin(lngR)

        // cobe O(): rotate by phi (f) and theta (l)
        // c = cosF*vx + sinF*vz
        // s = sinF*sinT*vx + cosT*vy - cosF*sinT*vz
        // z3 = -sinF*cosT*vx + sinT*vy + cosF*cosT*vz  (visibility: z3 >= 0)
        const c  =  cosF * vx + sinF * vz
        const s  =  sinF * sinT * vx + cosT * vy - cosF * sinT * vz
        const z3 = -sinF * cosT * vx + sinT * vy + cosF * cosT * vz

        // canvas [0,1]: x=(c+1)/2, y=(-s+1)/2  (ignoring scale/offset/aspect; width==height)
        const nx = (c + 1) / 2
        const ny = (-s + 1) / 2
        const px = nx * width
        const py = ny * width

        const visible = z3 >= 0 || (c * c + s * s) >= 0.64
        if (visible && z3 >= -0.1) {
          const isFront = z3 > 0
          el.style.opacity = isFront ? "1" : "0.25"
          el.style.transform = `translate(${px}px, ${py}px) translate(-50%, -50%) scale(${0.85 + z3 * 0.15})`
          el.style.zIndex = Math.round(z3 * 100).toString()
          el.style.pointerEvents = isFront ? "auto" : "none"
        } else {
          el.style.opacity = "0"
          el.style.pointerEvents = "none"
        }
      })

      rafId = requestAnimationFrame(tick)
    }

    rafId = requestAnimationFrame(tick)

    const t = setTimeout(() => setReady(true), 50)

    return () => {
      clearTimeout(t)
      cancelAnimationFrame(rafId)
      globe.destroy()
      window.removeEventListener("resize", onResize)
    }
  }, [speed])

  const getXY = (e: React.PointerEvent | React.TouchEvent) => {
    if ("touches" in e) return { x: e.touches[0].clientX, y: e.touches[0].clientY }
    return { x: (e as React.PointerEvent).clientX, y: (e as React.PointerEvent).clientY }
  }

  const onPointerDown = (e: React.PointerEvent) => {
    dragStart.current = { x: e.clientX, y: e.clientY }
    lastMove.current  = { x: e.clientX, y: e.clientY, t: Date.now() }
    velocity.current  = { phi: 0, theta: 0 }
    dragDelta.current = { phi: 0, theta: 0 }
    if (canvasRef.current) canvasRef.current.style.cursor = "grabbing"
  }

  const onPointerUp = () => {
    if (dragStart.current) {
      // Commit drag into base rotation
      phi.current   += dragDelta.current.phi
      theta.current += dragDelta.current.theta
      dragDelta.current = { phi: 0, theta: 0 }
    }
    dragStart.current = null
    lastMove.current  = null
    if (canvasRef.current) canvasRef.current.style.cursor = "grab"
  }

  const onPointerMove = (e: React.PointerEvent | React.TouchEvent) => {
    if (!dragStart.current) return
    const { x, y } = getXY(e)
    const now = Date.now()

    dragDelta.current.phi   =  (x - dragStart.current.x) / 180
    dragDelta.current.theta =  (y - dragStart.current.y) / 180

    // Track velocity from last 50ms for momentum
    if (lastMove.current && now - lastMove.current.t > 0) {
      const dt = Math.max(now - lastMove.current.t, 8)
      velocity.current.phi   = ((x - lastMove.current.x) / 180) * (16 / dt)
      velocity.current.theta = ((y - lastMove.current.y) / 180) * (16 / dt)
    }
    lastMove.current = { x, y, t: now }
  }

  return (
    <div
      className={`relative ${className || ""}`}
      style={{ aspectRatio: "1" }}
    >
      <canvas
        ref={canvasRef}
        style={{
          width: "100%",
          height: "100%",
          cursor: "grab",
          contain: "layout paint size",
          opacity: 1,
          transition: "opacity 0.8s ease",
        }}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerOut={onPointerUp}
        onPointerMove={onPointerMove}
        onTouchMove={onPointerMove}
        aria-hidden="true"
      />
      
      <div className="absolute inset-0 pointer-events-none">
        {LANGUAGES.map((lang, i) => (
          <div
            key={lang.id}
            ref={(el) => { badgeRefs.current[i] = el }}
            className="absolute left-0 top-0 transition-transform duration-0 ease-out will-change-transform"
            style={{ opacity: 0 }}
          >
            <div className="flex items-center gap-1.5 rounded-full border border-[var(--color-baltic-sea-700)] bg-[var(--color-baltic-sea-900)]/80 px-2.5 py-1 text-[11px] font-medium shadow-xl backdrop-blur transition-colors hover:border-[var(--color-keppel-400)] pointer-events-auto cursor-pointer">
              <span className="text-[13px] leading-none">{lang.flag}</span>
              <span className="text-[var(--color-baltic-sea-50)] leading-none">{lang.label}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
