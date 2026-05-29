import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useHandTrack } from './HandTrackContext';
import * as THREE from 'three';

// Connections for the hand skeleton
const CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4], // thumb
  [0, 5], [5, 6], [6, 7], [7, 8], // index
  [0, 9], [9, 10], [10, 11], [11, 12], // middle
  [0, 13], [13, 14], [14, 15], [15, 16], // ring
  [0, 17], [17, 18], [18, 19], [19, 20], // pinky
  [5, 9], [9, 13], [13, 17] // palm
];

export default function HandModel() {
  const { landmarks, viewMode } = useHandTrack();
  const spheresRef = useRef<THREE.Group>(null);
  const linesRef = useRef<THREE.Group>(null);
  const cylindersRef = useRef<THREE.Group>(null);

  const scale = 5;
  const offsetX = -2.5;
  const offsetY = -2.5;

  useFrame(() => {
    if (!landmarks) return;

    // Update Joints (Spheres)
    if (spheresRef.current) {
      landmarks.forEach((lm, i) => {
        const sphere = spheresRef.current!.children[i] as THREE.Mesh;
        if (sphere) {
          sphere.position.set(
            (1 - lm.x) * scale + offsetX,
            (1 - lm.y) * scale + offsetY,
            -lm.z * scale
          );
        }
      });
    }

    // Update Lines (Wireframe Mode)
    if (linesRef.current && viewMode === 'wireframe') {
      CONNECTIONS.forEach((conn, i) => {
        const line = linesRef.current!.children[i] as THREE.Line;
        if (line) {
          const startLM = landmarks[conn[0]];
          const endLM = landmarks[conn[1]];
          const positions = line.geometry.attributes.position.array as Float32Array;
          
          positions[0] = (1 - startLM.x) * scale + offsetX;
          positions[1] = (1 - startLM.y) * scale + offsetY;
          positions[2] = -startLM.z * scale;
          
          positions[3] = (1 - endLM.x) * scale + offsetX;
          positions[4] = (1 - endLM.y) * scale + offsetY;
          positions[5] = -endLM.z * scale;
          
          line.geometry.attributes.position.needsUpdate = true;
        }
      });
    }

    // Update Cylinders (Solid & Bones Modes)
    if (cylindersRef.current && (viewMode === 'solid' || viewMode === 'bones')) {
      CONNECTIONS.forEach((conn, i) => {
        const cylinder = cylindersRef.current!.children[i] as THREE.Mesh;
        if (cylinder) {
          const startLM = landmarks[conn[0]];
          const endLM = landmarks[conn[1]];
          
          const start = new THREE.Vector3(
            (1 - startLM.x) * scale + offsetX,
            (1 - startLM.y) * scale + offsetY,
            -startLM.z * scale
          );
          const end = new THREE.Vector3(
            (1 - endLM.x) * scale + offsetX,
            (1 - endLM.y) * scale + offsetY,
            -endLM.z * scale
          );
          
          const direction = new THREE.Vector3().subVectors(end, start);
          const len = direction.length();
          
          cylinder.position.copy(start).add(direction.clone().multiplyScalar(0.5));
          cylinder.scale.set(1, len, 1);
          cylinder.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize());
        }
      });
    }
  });

  const isSolid = viewMode === 'solid';
  const isBones = viewMode === 'bones';

  return (
    <group>
      {/* Joints */}
      <group ref={spheresRef}>
        {Array.from({ length: 21 }).map((_, i) => (
          <mesh key={i}>
            <sphereGeometry args={[isSolid ? 0.14 : 0.08, 16, 16]} />
            <meshStandardMaterial 
              color={isSolid ? "#ffdbac" : (i === 0 ? "#ff4444" : "#22d3ee")} 
              emissive={isSolid ? "#000000" : (i === 0 ? "#ff0000" : "#22d3ee")}
              emissiveIntensity={isSolid ? 0 : 0.5}
              roughness={isSolid ? 0.6 : 0.2}
              metalness={isSolid ? 0.1 : 0.8}
            />
          </mesh>
        ))}
      </group>

      {/* Wireframe View */}
      {viewMode === 'wireframe' && (
        <group ref={linesRef}>
          {CONNECTIONS.map((_, i) => (
            <line key={i}>
              <bufferGeometry>
                <bufferAttribute
                  attach="attributes-position"
                  count={2}
                  array={new Float32Array(6)}
                  itemSize={3}
                />
              </bufferGeometry>
              <lineBasicMaterial color="#22d3ee" transparent opacity={0.4} />
            </line>
          ))}
        </group>
      )}

      {/* Solid/Bones View */}
      {(isSolid || isBones) && (
        <group ref={cylindersRef}>
          {CONNECTIONS.map((_, i) => (
            <mesh key={i}>
              <cylinderGeometry args={[isSolid ? 0.12 : 0.04, isSolid ? 0.12 : 0.04, 1, 12]} />
              <meshStandardMaterial 
                color={isSolid ? "#ffdbac" : "#ffffff"} 
                emissive={isSolid ? "#000000" : "#22d3ee"}
                emissiveIntensity={isSolid ? 0 : 0.2}
                roughness={0.5}
                metalness={isSolid ? 0 : 0.9}
              />
            </mesh>
          ))}
        </group>
      )}
    </group>
  );
}
