"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import ConcordCore from "./ConcordCore";
import { useTubeGeometry } from "./hooks/useTubeGeometry";

export type ConvergingPathsProps = {
  /** 0 = the two journeys are far apart, 1 = fully converged at the core. */
  progress: number;
  menteeColor: string;
  mentorColor: string;
  accordColor: string;
  spread?: number;
  endPoint?: [number, number, number];
  compact?: boolean;
  /** Renders the branch offshoots and traveling nodes at reduced detail. */
  lightweight?: boolean;
  /** Multiplies the ConcordCore's own size independent of the ribbons - default 1 keeps every existing caller unchanged. */
  coreScale?: number;
};

type CurveConfig = {
  /** [start, quarter, mid, end] - 4 control points, each lerped separately by progress. */
  separate: THREE.Vector3[];
  converged: THREE.Vector3[];
};

function lerpPoints(a: THREE.Vector3[], b: THREE.Vector3[], t: number): THREE.Vector3[] {
  return a.map((p, i) => p.clone().lerp(b[i], t));
}

function menteeConfig(spread: number, end: THREE.Vector3): CurveConfig {
  // Lower-left, staged through the background (negative z) toward the
  // camera, rather than a flat diagonal - depth is the point.
  return {
    separate: [
      new THREE.Vector3(-spread * 1.05, -spread * 0.75, -2.4),
      new THREE.Vector3(-spread * 0.55, -spread * 0.15, -1.5),
      new THREE.Vector3(-spread * 0.2, spread * 0.05, -0.6),
      new THREE.Vector3(-spread * 0.55, -spread * 0.35, -1.8),
    ],
    converged: [
      new THREE.Vector3(-spread * 1.05, -spread * 0.75, -2.4),
      new THREE.Vector3(-spread * 0.4, -spread * 0.1, -1.1),
      new THREE.Vector3(-spread * 0.1, end.y * 0.5, -0.25),
      end.clone(),
    ],
  };
}

function mentorConfig(spread: number, end: THREE.Vector3): CurveConfig {
  // Upper-right, mirrored staging through the background.
  return {
    separate: [
      new THREE.Vector3(spread * 1.05, spread * 0.75, -2.6),
      new THREE.Vector3(spread * 0.55, spread * 0.2, -1.6),
      new THREE.Vector3(spread * 0.2, -spread * 0.05, -0.7),
      new THREE.Vector3(spread * 0.55, spread * 0.35, -1.9),
    ],
    converged: [
      new THREE.Vector3(spread * 1.05, spread * 0.75, -2.6),
      new THREE.Vector3(spread * 0.4, spread * 0.15, -1.2),
      new THREE.Vector3(spread * 0.1, end.y * 0.5, -0.3),
      end.clone(),
    ],
  };
}

function buildCurve(points: THREE.Vector3[]): THREE.CatmullRomCurve3 {
  return new THREE.CatmullRomCurve3(points);
}

/** A small, static offshoot near the curve's midpoint - an "experience or challenge" moment branching off the main journey, not part of the convergence itself. */
function JourneyBranch({
  curve,
  atT,
  color,
  reveal,
}: {
  curve: THREE.CatmullRomCurve3;
  atT: number;
  color: string;
  reveal: number;
}) {
  const branchCurve = useMemo(() => {
    const origin = curve.getPointAt(atT);
    const tangent = curve.getTangentAt(atT);
    const side = new THREE.Vector3(tangent.y, -tangent.x, tangent.z * 0.4).normalize();
    const tip = origin.clone().add(side.multiplyScalar(0.5)).add(new THREE.Vector3(0, 0.18, 0));
    return new THREE.QuadraticBezierCurve3(
      origin,
      origin.clone().lerp(tip, 0.5).add(new THREE.Vector3(0, 0.08, 0)),
      tip,
    );
  }, [curve, atT]);
  const geometry = useTubeGeometry(branchCurve, 0.018, 10, 6);

  return (
    <mesh geometry={geometry} scale={Math.max(0.001, reveal)}>
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.5}
        transparent
        opacity={0.55}
        roughness={0.4}
      />
    </mesh>
  );
}

/** One glowing marker traveling back and forth along a journey's curve - "layered motion" that keeps the scene alive even when progress is static. */
function TravelingNode({
  curve,
  color,
  phase,
  speed,
  size = 0.075,
}: {
  curve: THREE.CatmullRomCurve3;
  color: string;
  phase: number;
  speed: number;
  size?: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const haloRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const raw = (state.clock.elapsedTime * speed + phase) % 2;
    // Ping-pong 0..1..0 instead of wrapping, so it reads as travel along a
    // path rather than teleporting back to the start.
    const t = raw < 1 ? raw : 2 - raw;
    const p = curve.getPointAt(Math.min(0.995, Math.max(0.005, t)));
    if (groupRef.current) groupRef.current.position.copy(p);
    if (haloRef.current) {
      const wave = 0.5 + 0.5 * Math.sin(state.clock.elapsedTime * 2 + phase * 6);
      haloRef.current.scale.setScalar(1 + wave * 0.3);
      const mat = haloRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.18 + wave * 0.18;
    }
  });

  return (
    <group ref={groupRef}>
      <mesh ref={haloRef}>
        <sphereGeometry args={[size * 2.4, 10, 10]} />
        <meshBasicMaterial color={color} transparent opacity={0.22} depthWrite={false} />
      </mesh>
      <mesh>
        <sphereGeometry args={[size, 10, 10]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.8} />
      </mesh>
    </group>
  );
}

/** A single bright pulse sweeping the full length of a curve once - "a soft wave of light traveling through the ribbon" at the moment of connection. */
function LightWave({
  curve,
  color,
  active,
  size = 0.11,
}: {
  curve: THREE.CatmullRomCurve3;
  color: string;
  active: boolean;
  size?: number;
}) {
  const startRef = useRef<number | null>(null);
  const groupRef = useRef<THREE.Group>(null);
  const matRef = useRef<THREE.MeshBasicMaterial>(null);
  const durationMs = 1100;

  useFrame((state) => {
    if (!active) {
      startRef.current = null;
      if (matRef.current) matRef.current.opacity = 0;
      return;
    }
    const now = state.clock.elapsedTime * 1000;
    if (startRef.current === null) startRef.current = now;
    const t = Math.min(1, (now - startRef.current) / durationMs);
    const p = curve.getPointAt(t);
    if (groupRef.current) groupRef.current.position.copy(p);
    if (matRef.current) matRef.current.opacity = t < 1 ? 0.85 * (1 - Math.abs(t - 0.5) * 1.1) : 0;
  });

  return (
    <group ref={groupRef}>
      <mesh>
        <sphereGeometry args={[size, 12, 12]} />
        <meshBasicMaterial ref={matRef} color={color} transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
}

/**
 * The shared "two journeys converging" primitive behind the landing hero
 * and the match reveal: two dimensional ribbons (not flat lines) staged
 * through real depth, each with a small branch and a couple of traveling
 * glow-nodes, gradually pulled together into a ConcordCore. Callers drive
 * `progress`; everything else about the composition (spread, anchor point,
 * device weight) is configured here so both experiences share one visual
 * language without being pixel-identical.
 */
export default function ConvergingPaths({
  progress,
  menteeColor,
  mentorColor,
  accordColor,
  spread = 2.4,
  endPoint = [0, 0, 0.4],
  compact = false,
  lightweight = false,
  coreScale = 1,
}: ConvergingPathsProps) {
  const clamped = Math.min(1, Math.max(0, progress));
  const quantized = Math.round(clamped * 200) / 200;
  const end = useMemo(() => new THREE.Vector3(...endPoint), [endPoint]);

  const menteePoints = useMemo(() => {
    const cfg = menteeConfig(spread, end);
    return lerpPoints(cfg.separate, cfg.converged, quantized);
  }, [spread, end, quantized]);
  const mentorPoints = useMemo(() => {
    const cfg = mentorConfig(spread, end);
    return lerpPoints(cfg.separate, cfg.converged, quantized);
  }, [spread, end, quantized]);

  const segments = compact ? 32 : 56;
  const radius = compact ? 0.045 : 0.055;

  const menteeCurve = useMemo(() => buildCurve(menteePoints), [menteePoints]);
  const mentorCurve = useMemo(() => buildCurve(mentorPoints), [mentorPoints]);
  const menteeGeo = useTubeGeometry(menteeCurve, radius, segments);
  const mentorGeo = useTubeGeometry(mentorCurve, radius, segments);

  const connected = quantized > 0.92;
  const formed = Math.max(0, (quantized - 0.55) / 0.45);

  return (
    <group>
      <mesh geometry={menteeGeo}>
        <meshStandardMaterial
          color={menteeColor}
          emissive={menteeColor}
          emissiveIntensity={0.4}
          roughness={0.35}
          metalness={0.08}
        />
      </mesh>
      <mesh geometry={mentorGeo}>
        <meshStandardMaterial
          color={mentorColor}
          emissive={mentorColor}
          emissiveIntensity={0.4}
          roughness={0.35}
          metalness={0.08}
        />
      </mesh>

      {!lightweight && (
        <>
          <JourneyBranch curve={menteeCurve} atT={0.35} color={menteeColor} reveal={1} />
          <JourneyBranch curve={mentorCurve} atT={0.4} color={mentorColor} reveal={1} />
        </>
      )}

      <TravelingNode curve={menteeCurve} color={menteeColor} phase={0.2} speed={0.09} />
      <TravelingNode curve={menteeCurve} color={menteeColor} phase={1.1} speed={0.07} />
      {!lightweight && (
        <TravelingNode curve={menteeCurve} color={menteeColor} phase={1.8} speed={0.11} />
      )}
      <TravelingNode curve={mentorCurve} color={mentorColor} phase={0.6} speed={0.08} />
      <TravelingNode curve={mentorCurve} color={mentorColor} phase={1.5} speed={0.1} />
      {!lightweight && (
        <TravelingNode curve={mentorCurve} color={mentorColor} phase={0.9} speed={0.065} />
      )}

      <LightWave curve={menteeCurve} color={accordColor} active={connected} />
      <LightWave curve={mentorCurve} color={accordColor} active={connected} />

      <ConcordCore
        position={endPoint}
        menteeColor={menteeColor}
        mentorColor={mentorColor}
        accordColor={accordColor}
        formed={formed}
        scale={coreScale}
      />
    </group>
  );
}
