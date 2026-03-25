import { useEffect, useRef, useState } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import { Float } from "@react-three/drei/core/Float"
import { MeshDistortMaterial } from "@react-three/drei/core/MeshDistortMaterial"
import { RoundedBox } from "@react-three/drei/core/RoundedBox"
import { Torus } from "@react-three/drei/core/shapes"
import type { Group } from "three"

import { HeroSceneFallback } from "@/components/landing/hero-scene-fallback"

type LedgerCardProps = {
  position: [number, number, number]
  rotation: [number, number, number]
  color: string
}

const SCENE_CARDS: Array<LedgerCardProps> = [
  {
    position: [-2.5, 1.2, -0.5],
    rotation: [-0.3, 0.4, -0.2],
    color: "#1a6b3c",
  },
  {
    position: [2.25, -1.1, -0.4],
    rotation: [0.28, -0.35, 0.22],
    color: "#bf5a36",
  },
  {
    position: [2.7, 1.5, -0.9],
    rotation: [-0.2, -0.3, 0.26],
    color: "#6d7387",
  },
]

function LedgerCard({ position, rotation, color }: LedgerCardProps) {
  const ref = useRef<Group>(null)

  useFrame((state) => {
    if (!ref.current) {
      return
    }

    ref.current.rotation.z =
      rotation[2] +
      Math.sin(state.clock.elapsedTime * 0.35 + position[0]) * 0.08
    ref.current.position.y =
      position[1] +
      Math.cos(state.clock.elapsedTime * 0.45 + position[0]) * 0.12
  })

  return (
    <group ref={ref} position={position} rotation={rotation}>
      <RoundedBox args={[1.8, 2.4, 0.08]} radius={0.1} smoothness={4}>
        <meshStandardMaterial
          color="#f6f1e8"
          metalness={0.05}
          roughness={0.92}
        />
      </RoundedBox>
      <mesh position={[0, 0.68, 0.05]}>
        <planeGeometry args={[1.2, 0.1]} />
        <meshBasicMaterial color={color} transparent opacity={0.9} />
      </mesh>
      <mesh position={[-0.2, 0.2, 0.05]}>
        <planeGeometry args={[0.95, 0.08]} />
        <meshBasicMaterial color="#c8c0b2" transparent opacity={0.7} />
      </mesh>
      <mesh position={[0.05, -0.1, 0.05]}>
        <planeGeometry args={[1.2, 0.08]} />
        <meshBasicMaterial color="#d6cfc1" transparent opacity={0.6} />
      </mesh>
      <mesh position={[-0.3, -0.4, 0.05]}>
        <planeGeometry args={[0.65, 0.08]} />
        <meshBasicMaterial color="#1a6b3c" transparent opacity={0.75} />
      </mesh>
    </group>
  )
}

function CoinRing({
  position,
  color,
}: {
  position: [number, number, number]
  color: string
}) {
  const ref = useRef<Group>(null)

  useFrame((state) => {
    if (!ref.current) {
      return
    }

    ref.current.rotation.x = state.clock.elapsedTime * 0.35
    ref.current.rotation.y = state.clock.elapsedTime * 0.45
  })

  return (
    <group ref={ref} position={position}>
      <Torus args={[0.55, 0.12, 16, 64]}>
        <meshStandardMaterial color={color} metalness={0.3} roughness={0.4} />
      </Torus>
    </group>
  )
}

function CoreOrb() {
  const ref = useRef<Group>(null)

  useFrame((state) => {
    if (!ref.current) {
      return
    }

    ref.current.rotation.y = state.clock.elapsedTime * 0.25
    ref.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.18) * 0.16
  })

  return (
    <group ref={ref}>
      <mesh>
        <icosahedronGeometry args={[1.1, 5]} />
        <MeshDistortMaterial
          color="#1a6b3c"
          emissive="#0c2e19"
          emissiveIntensity={0.25}
          roughness={0.12}
          metalness={0.18}
          distort={0.28}
          speed={2.1}
        />
      </mesh>
      <mesh scale={1.5}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial color="#dfeee5" transparent opacity={0.14} />
      </mesh>
    </group>
  )
}

function Scene() {
  return (
    <>
      <color attach="background" args={["#000000"]} />
      <fog attach="fog" args={["#faf7f0", 7, 18]} />
      <ambientLight intensity={1.4} />
      <directionalLight position={[3, 6, 4]} intensity={2.1} color="#fff4de" />
      <pointLight position={[-4, -2, 3]} intensity={18} color="#1a6b3c" />
      <pointLight position={[4, 1, 2]} intensity={12} color="#b56c46" />

      <Float speed={2.2} rotationIntensity={0.35} floatIntensity={0.4}>
        <CoreOrb />
      </Float>

      {SCENE_CARDS.map((card) => (
        <Float
          key={`${card.position[0]}-${card.position[1]}`}
          speed={1.4}
          rotationIntensity={0.28}
          floatIntensity={0.5}
        >
          <LedgerCard {...card} />
        </Float>
      ))}

      <Float speed={1.2} floatIntensity={0.3} rotationIntensity={0.25}>
        <CoinRing position={[-1.8, -1.7, 0.5]} color="#c98e2d" />
      </Float>
      <Float speed={1.8} floatIntensity={0.25} rotationIntensity={0.18}>
        <CoinRing position={[1.4, 1.8, 0.2]} color="#6b7384" />
      </Float>
    </>
  )
}

export function HeroScene() {
  const sceneRef = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(false)
  const [isInViewport, setIsInViewport] = useState(true)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const element = sceneRef.current
    if (!element) {
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.length === 0) {
          return
        }

        setIsInViewport(entries[0].isIntersecting)
      },
      { rootMargin: "120px 0px" }
    )

    observer.observe(element)

    return () => {
      observer.disconnect()
    }
  }, [])

  if (!mounted) {
    return <HeroSceneFallback />
  }

  return (
    <div ref={sceneRef} className="absolute inset-0 overflow-hidden rounded-[2rem]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(26,107,60,0.22),transparent_28%),radial-gradient(circle_at_80%_12%,rgba(201,142,45,0.2),transparent_26%),radial-gradient(circle_at_70%_76%,rgba(114,122,146,0.22),transparent_22%)]" />
      <Canvas
        frameloop={isInViewport ? "always" : "never"}
        camera={{ position: [0, 0, 6.5], fov: 42 }}
        dpr={[1, 1.5]}
        gl={{ antialias: false, powerPreference: "high-performance" }}
      >
        <Scene />
      </Canvas>
      <div className="paper-grid pointer-events-none absolute inset-0 opacity-20" />
    </div>
  )
}
