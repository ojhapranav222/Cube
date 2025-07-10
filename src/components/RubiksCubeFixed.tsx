'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Html } from '@react-three/drei'
import * as THREE from 'three'

// Fixed draggable control panel component
function DraggableControlPanel({ children, initialPosition = { x: 20, y: 20 } }) {
  const [position, setPosition] = useState(initialPosition)
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const panelRef = useRef<HTMLDivElement>(null)
  const dragStateRef = useRef(false)

  const handleMouseDown = useCallback((e) => {
    // Only allow dragging from the header area or non-interactive elements
    if (e.target.tagName === 'BUTTON' || e.target.closest('button')) return
    
    e.preventDefault()
    e.stopPropagation()
    
    setIsDragging(true)
    dragStateRef.current = true
    const rect = panelRef.current.getBoundingClientRect()
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    })
    
    // Add cursor styles to body to prevent text selection
    document.body.style.userSelect = 'none'
    document.body.style.cursor = 'move'
    
    // Prevent canvas from intercepting mouse events
    document.addEventListener('selectstart', preventDefaultEvent, { passive: false })
  }, [])

  const handleMouseMove = useCallback((e) => {
    if (!dragStateRef.current || !panelRef.current) return
    
    e.preventDefault()
    e.stopPropagation()
    
    const newX = e.clientX - dragOffset.x
    const newY = e.clientY - dragOffset.y
    
    // Get actual panel dimensions
    const panelRect = panelRef.current.getBoundingClientRect()
    const panelWidth = panelRect.width
    const panelHeight = panelRect.height
    
    // Keep panel within viewport bounds
    const maxX = window.innerWidth - panelWidth
    const maxY = window.innerHeight - panelHeight
    
    setPosition({
      x: Math.max(0, Math.min(maxX, newX)),
      y: Math.max(0, Math.min(maxY, newY))
    })
  }, [dragOffset])

  const handleMouseUp = useCallback((e) => {
    if (!dragStateRef.current) return
    
    setIsDragging(false)
    dragStateRef.current = false
    
    // Restore cursor styles
    document.body.style.userSelect = ''
    document.body.style.cursor = ''
    
    // Remove event listeners
    document.removeEventListener('selectstart', preventDefaultEvent)
    
    // Snap to corners if close enough
    const snapThreshold = 50
    const windowWidth = window.innerWidth
    const windowHeight = window.innerHeight
    const panelRect = panelRef.current?.getBoundingClientRect()
    if (!panelRect) return
    
    const panelWidth = panelRect.width
    const panelHeight = panelRect.height
    
    let finalX = position.x
    let finalY = position.y
    
    // Check for corner snapping
    if (position.x < snapThreshold) finalX = 20 // Left edge
    if (position.y < snapThreshold) finalY = 20 // Top edge
    if (position.x > windowWidth - panelWidth - snapThreshold) finalX = windowWidth - panelWidth - 20 // Right edge
    if (position.y > windowHeight - panelHeight - snapThreshold) finalY = windowHeight - panelHeight - 20 // Bottom edge
    
    setPosition({ x: finalX, y: finalY })
  }, [position])

  // Helper function to prevent default
  const preventDefaultEvent = (e: Event) => {
    e.preventDefault()
    return false
  }
  
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove, { passive: false })
      document.addEventListener('mouseup', handleMouseUp, { passive: false })
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
        document.removeEventListener('selectstart', preventDefaultEvent)
      }
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  return (
    <div
      ref={panelRef}
      className={`absolute z-50 bg-black bg-opacity-90 p-4 rounded-xl shadow-2xl select-none ${
        isDragging ? 'cursor-move' : 'cursor-grab'
      }`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transition: isDragging ? 'none' : 'all 0.2s ease-out',
        minWidth: '280px',
        maxWidth: '320px',
        visibility: 'visible', // Ensure panel stays visible
        opacity: isDragging ? 0.9 : 1, // Slight transparency while dragging
        pointerEvents: 'auto', // Ensure it stays interactive
        zIndex: 1000 // High z-index to stay on top
      }}
    >
      <div 
        className="flex items-center justify-between mb-3 cursor-move"
        onMouseDown={handleMouseDown}
        style={{ userSelect: 'none' }}
      >
        <h3 className="text-white text-lg font-bold pointer-events-none">Controls</h3>
        <div className="text-gray-400 text-xs pointer-events-none">📋 Drag to move</div>
      </div>
      <div className="pointer-events-auto">
        {children}
      </div>
    </div>
  )
}

// Define the 6 colors for the cube faces
const COLORS = {
  front: '#ff0000',   // Red
  back: '#ffa500',    // Orange
  left: '#00ff00',    // Green
  right: '#0000ff',   // Blue
  top: '#ffff00',     // Yellow
  bottom: '#ffffff'   // White
}

// Individual cube piece component
function CubePiece({ 
  position, 
  colors, 
  onClick, 
  isSelected, 
  rotation,
  groupRef
}) {
  const meshRef = useRef<THREE.Mesh>(null)
  const [hovered, setHovered] = useState(false)

  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.scale.setScalar(hovered ? 1.05 : 1)
      // Apply the rotation to the individual cubelet
      if (rotation) {
        meshRef.current.rotation.set(rotation[0], rotation[1], rotation[2])
      }
    }
  })

  return (
    <mesh
      ref={meshRef}
      position={position}
      onClick={onClick}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[0.95, 0.95, 0.95]} />
      {colors.map((color, index) => (
        <meshStandardMaterial
          key={index}
          attach={`material-${index}`}
          color={color}
          transparent={isSelected}
          opacity={isSelected ? 0.7 : 1}
          roughness={0.3}
          metalness={0.1}
        />
      ))}
    </mesh>
  )
}

// Utility functions for cube rotation
const rotatePosition = (pos, axis, clockwise) => {
  const [x, y, z] = pos
  
  switch (axis) {
    case 'x':
      return clockwise ? [x, -z, y] : [x, z, -y]
    case 'y':
      return clockwise ? [z, y, -x] : [-z, y, x]
    case 'z':
      return clockwise ? [-y, x, z] : [y, -x, z]
    default:
      return pos
  }
}

// Color rotation function synchronized with rotatePosition
const rotateColors = (colors, axis, clockwise) => {
  const newColors = [...colors]
  
  switch (axis) {
    case 'x':
      if (!clockwise) {
        const temp = newColors[2] // top
        newColors[2] = newColors[4] // top = front
        newColors[4] = newColors[3] // front = bottom
        newColors[3] = newColors[5] // bottom = back
        newColors[5] = temp // back = top
      } else {
        const temp = newColors[2] // top
        newColors[2] = newColors[5] // top = back
        newColors[5] = newColors[3] // back = bottom
        newColors[3] = newColors[4] // bottom = front
        newColors[4] = temp // front = top
      }
      break
    case 'y':
      if (!clockwise) {
        const temp = newColors[0] // right
        newColors[0] = newColors[4] // right = front
        newColors[4] = newColors[1] // front = left
        newColors[1] = newColors[5] // left = back
        newColors[5] = temp // back = right
      } else {
        const temp = newColors[0] // right
        newColors[0] = newColors[5] // right = back
        newColors[5] = newColors[1] // back = left
        newColors[1] = newColors[4] // left = front
        newColors[4] = temp // front = right
      }
      break
    case 'z':
      if (!clockwise) {
        const temp = newColors[0] // right
        newColors[0] = newColors[2] // right = top
        newColors[2] = newColors[1] // top = left
        newColors[1] = newColors[3] // left = bottom
        newColors[3] = temp // bottom = right
      } else {
        const temp = newColors[0] // right
        newColors[0] = newColors[3] // right = bottom
        newColors[3] = newColors[1] // bottom = left
        newColors[1] = newColors[2] // left = top
        newColors[2] = temp // top = right
      }
      break
  }

  return newColors
}

// Main Rubik's cube component
function RubiksCubeScene() {
  const [selectedPiece, setSelectedPiece] = useState(null)
  const [isAnimating, setIsAnimating] = useState(false)
  const [isShuffling, setIsShuffling] = useState(false)
  const [shuffleTimeouts, setShuffleTimeouts] = useState([])
  const groupRef = useRef<THREE.Group>(null)
  const layerGroupsRef = useRef({})
  const shuffleActiveRef = useRef(false)

  // Initialize the cube state
  const initializeCube = () => {
    const pieces = []
    for (let x = -1; x <= 1; x++) {
      for (let y = -1; y <= 1; y++) {
        for (let z = -1; z <= 1; z++) {
          const colors = [
            x === 1 ? COLORS.right : '#333333',
            x === -1 ? COLORS.left : '#333333',
            y === 1 ? COLORS.top : '#333333',
            y === -1 ? COLORS.bottom : '#333333',
            z === 1 ? COLORS.front : '#333333',
            z === -1 ? COLORS.back : '#333333'
          ]

          pieces.push({
            id: `${x}-${y}-${z}`,
            position: [x, y, z],
            colors,
            rotation: [0, 0, 0], // Individual cubelet rotation
            animationRotation: [0, 0, 0] // For smooth animation
          })
        }
      }
    }
    return pieces
  }

  const [cubeState, setCubeState] = useState(initializeCube())

  // Rotate a face with smooth 90-degree animation
  const rotateFace = (face, clockwise = true) => {
    if (isAnimating) return
    
    setIsAnimating(true)
    const newState = [...cubeState]
    
    // Get the pieces that belong to this face
    const rotatingPieces = []
    const originalPositions = []
    const originalRotations = []
    
    newState.forEach(piece => {
      const [x, y, z] = piece.position
      let shouldRotate = false
      
      switch (face) {
        case 'front':
          shouldRotate = Math.round(z) === 1
          break
        case 'back':
          shouldRotate = Math.round(z) === -1
          break
        case 'top':
          shouldRotate = Math.round(y) === 1
          break
        case 'bottom':
          shouldRotate = Math.round(y) === -1
          break
        case 'right':
          shouldRotate = Math.round(x) === 1
          break
        case 'left':
          shouldRotate = Math.round(x) === -1
          break
      }
      
      if (shouldRotate) {
        rotatingPieces.push(piece)
        originalPositions.push([...piece.position])
        originalRotations.push([...piece.rotation])
      }
    })
    
    // Animation parameters for smoother rotation
    const animationDuration = 500 // 500ms for smoother animation
    const startTime = performance.now()
    const totalAngle = Math.PI / 2 // Exactly 90 degrees
    
    const animate = (currentTime) => {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / animationDuration, 1)

      // Use easing function for smoother animation
      const easeProgress = 1 - Math.pow(1 - progress, 3) // Ease-out cubic
      const currentAngle = totalAngle * easeProgress * (clockwise ? 1 : -1)

      if (progress < 1) {
        // Apply rotation to each piece
        rotatingPieces.forEach((piece, index) => {
          const [origX, origY, origZ] = originalPositions[index]
          let newPos = [origX, origY, origZ]
          
          switch (face) {
            case 'front':
              // Rotate around Z axis (front face)
              if (Math.round(origZ) === 1) {
                newPos = [
                  Math.cos(currentAngle) * origX - Math.sin(currentAngle) * origY,
                  Math.sin(currentAngle) * origX + Math.cos(currentAngle) * origY,
                  origZ
                ]
              }
              break
            case 'back':
              // Rotate around Z axis (back face - swapped direction)
              if (Math.round(origZ) === -1) {
                newPos = [
                  Math.cos(currentAngle) * origX - Math.sin(currentAngle) * origY,
                  Math.sin(currentAngle) * origX + Math.cos(currentAngle) * origY,
                  origZ
                ]
              }
              break
            case 'top':
              // Rotate around Y axis (top face)
              if (Math.round(origY) === 1) {
                newPos = [
                  Math.cos(currentAngle) * origX + Math.sin(currentAngle) * origZ,
                  origY,
                  -Math.sin(currentAngle) * origX + Math.cos(currentAngle) * origZ
                ]
              }
              break
              case 'bottom':
                if (Math.round(origY) === -1) {
                  newPos = [
                    Math.cos(currentAngle) * origX + Math.sin(currentAngle) * origZ, // CHANGE from -currentAngle to currentAngle
                    origY,
                    -Math.sin(currentAngle) * origX + Math.cos(currentAngle) * origZ // CHANGE from -currentAngle to currentAngle
                  ]
                }
                break;
            case 'right':
              // Rotate around X axis (right face)
              if (Math.round(origX) === 1) {
                newPos = [
                  origX,
                  Math.cos(currentAngle) * origY - Math.sin(currentAngle) * origZ,
                  Math.sin(currentAngle) * origY + Math.cos(currentAngle) * origZ
                ]
              }
              break
          case 'left':
            // Rotate around X axis (left face - swapped direction)
            if (Math.round(origX) === -1) {
              newPos = [
                origX,
                Math.cos(currentAngle) * origY - Math.sin(currentAngle) * origZ,
                Math.sin(currentAngle) * origY + Math.cos(currentAngle) * origZ
              ]
            }
            break
        }

        piece.position = newPos
        
        // Update individual cubelet rotation based on face
        const [origRx, origRy, origRz] = originalRotations[index]
        switch (face) {
          case 'front':
            piece.rotation = [origRx, origRy, origRz + currentAngle]
            break
          case 'back':
            piece.rotation = [origRx, origRy, origRz + currentAngle]
            break
          case 'top':
            piece.rotation = [origRx, origRy + currentAngle, origRz]
            break
          case 'bottom':
            piece.rotation = [origRx, origRy + currentAngle, origRz] // CHANGE from -currentAngle to +currentAngle
            break
          case 'right':
            piece.rotation = [origRx + currentAngle, origRy, origRz]
            break
          case 'left':
            piece.rotation = [origRx + currentAngle, origRy, origRz]
            break
        }
      })

      setCubeState([...newState])
      requestAnimationFrame(animate)
    } else {
      // Animation complete - snap to final positions
      rotatingPieces.forEach((piece, index) => {
        const [origX, origY, origZ] = originalPositions[index]
        
        // Update position using the rotation logic
        piece.position = rotatePosition([origX, origY, origZ], getAxisForFace(face), clockwise)
        
        // Rotate colors by exactly 90 degrees based on the face being rotated
        // For top and bottom faces, invert the direction to match the visual animation
        const colorClockwise = (face === 'top' || face==='bottom') ? !clockwise : clockwise
        piece.colors = rotateColors(piece.colors, getAxisForFace(face), colorClockwise)
        
        // Reset rotation to prevent accumulation - the position change handles the visual rotation
        piece.rotation = [0, 0, 0]
      })
      
      // Helper function to get axis for face
      function getAxisForFace(face: string) {
        switch (face) {
          case 'front':
          case 'back':
            return 'z'
          case 'top':
          case 'bottom':
            return 'y'
          case 'right':
          case 'left':
            return 'x'
          default:
            return 'z'
        }
      }

      setCubeState([...newState])
      setIsAnimating(false)
    }
  }

  requestAnimationFrame(animate)
  }

  // Enhanced stop function
  const stopShuffle = () => {
    if (shuffleTimeouts.length > 0) {
      shuffleTimeouts.forEach(timeoutId => clearTimeout(timeoutId))
      setShuffleTimeouts([])
    }
    shuffleActiveRef.current = false
    setIsShuffling(false)
  }

  // Fixed shuffle function with proper state management
  const shuffleCube = () => {
    if (isShuffling || isAnimating) return
    
    console.log('Starting shuffle...') // Debug log
    setIsShuffling(true)
    shuffleActiveRef.current = true
    const faces = ['front', 'back', 'top', 'bottom', 'right', 'left']
    const shuffleMoves = 20 // 20+ random legal twists
    const timeouts = []
    
    // Generate random moves avoiding redundant moves
    const moves = []
    let lastFace = null
    
    for (let i = 0; i < shuffleMoves; i++) {
      let randomFace
      // Avoid same face twice in a row for better scrambling
      do {
        randomFace = faces[Math.floor(Math.random() * faces.length)]
      } while (randomFace === lastFace)
      
      const randomDirection = Math.random() > 0.5
      moves.push({ face: randomFace, clockwise: randomDirection })
      lastFace = randomFace
    }
    
    console.log('Generated moves:', moves) // Debug log
    
    // Execute moves with proper timing and animation
    let completedMoves = 0
    
    moves.forEach((move, i) => {
      const timeoutId = setTimeout(() => {
        // Check if shuffle is still active using ref
        if (shuffleActiveRef.current) {
          console.log(`Executing move ${i + 1}/${shuffleMoves}:`, move) // Debug log
          rotateFace(move.face, move.clockwise) // This handles animation AND color updates
          completedMoves++
          
          // Check if this was the last move
          if (completedMoves === shuffleMoves) {
            setTimeout(() => {
              console.log('Shuffle complete!') // Debug log
              setIsShuffling(false)
              setShuffleTimeouts([])
              shuffleActiveRef.current = false
            }, 600) // Wait for last animation to complete
          }
        }
      }, i * 600) // Slightly faster for better UX
      timeouts.push(timeoutId)
    })
    
    setShuffleTimeouts(timeouts)
  }

  // Reset the cube
  const resetCube = () => {
    setCubeState(initializeCube())
  }

  // Expose functions to window for external control panel
  useEffect(() => {
    (window as any).rotateFace = rotateFace
    ;(window as any).shuffleCube = shuffleCube
    ;(window as any).stopShuffle = stopShuffle
    ;(window as any).resetCube = resetCube
    ;(window as any).isAnimating = isAnimating
    ;(window as any).isShuffling = isShuffling
    
    return () => {
      delete (window as any).rotateFace
      delete (window as any).shuffleCube
      delete (window as any).stopShuffle
      delete (window as any).resetCube
      delete (window as any).isAnimating
      delete (window as any).isShuffling
    }
  }, [rotateFace, shuffleCube, stopShuffle, resetCube, isAnimating, isShuffling])

  return (
    <>
      {/* Enhanced lighting */}
      <ambientLight intensity={0.6} />
      <directionalLight 
        position={[10, 15, 5]} 
        intensity={1.2} 
        castShadow 
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={50}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
      />
      <pointLight position={[-10, -10, -10]} intensity={0.5} />
      <spotLight 
        position={[5, 5, 5]} 
        angle={0.3} 
        penumbra={1} 
        intensity={0.5} 
        castShadow 
      />
      
      <group ref={groupRef}>
        {cubeState.map((piece) => (
          <CubePiece
            key={piece.id}
            position={piece.position}
            colors={piece.colors}
            onClick={() => setSelectedPiece(piece.id)}
            isSelected={selectedPiece === piece.id}
            rotation={piece.rotation}
            groupRef={groupRef}
          />
        ))}
      </group>

      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={5}
        maxDistance={15}
      />
    </>
  )
}

// Main component export
export default function RubiksCube() {
  return (
    <div className="w-screen h-screen relative">
      <Canvas 
        camera={{ position: [5, 5, 5], fov: 60 }} 
        shadows
        gl={{ antialias: true }}
      >
        <RubiksCubeScene />
      </Canvas>
      
      {/* Control Panel Outside Canvas to Avoid OrbitControls Interference */}
      <DraggableControlPanel>
        <div className="space-y-3">
          <div>
            <h4 className="text-white text-sm font-medium mb-2">Face Rotations</h4>
            
            {/* Front and Back */}
            <div className="flex gap-2 mb-2">
              <button
                onClick={() => (window as any).rotateFace?.('front', true)}
                className="px-3 py-2 bg-red-500 text-white rounded text-xs hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                F
              </button>
              <button
                onClick={() => (window as any).rotateFace?.('front', false)}
                className="px-3 py-2 bg-red-700 text-white rounded text-xs hover:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                F'
              </button>
              <button
                onClick={() => (window as any).rotateFace?.('back', true)}
                className="px-3 py-2 bg-orange-500 text-white rounded text-xs hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                B
              </button>
              <button
                onClick={() => (window as any).rotateFace?.('back', false)}
                className="px-3 py-2 bg-orange-700 text-white rounded text-xs hover:bg-orange-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                B'
              </button>
            </div>
            
            {/* Right and Left */}
            <div className="flex gap-2 mb-2">
              <button
                onClick={() => (window as any).rotateFace?.('right', true)}
                className="px-3 py-2 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                R
              </button>
              <button
                onClick={() => (window as any).rotateFace?.('right', false)}
                className="px-3 py-2 bg-blue-700 text-white rounded text-xs hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                R'
              </button>
              <button
                onClick={() => (window as any).rotateFace?.('left', true)}
                className="px-3 py-2 bg-green-500 text-white rounded text-xs hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                L
              </button>
              <button
                onClick={() => (window as any).rotateFace?.('left', false)}
                className="px-3 py-2 bg-green-700 text-white rounded text-xs hover:bg-green-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                L'
              </button>
            </div>
            
            {/* Top and Bottom */}
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => (window as any).rotateFace?.('top', true)}
                className="px-3 py-2 bg-yellow-500 text-black rounded text-xs hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                U
              </button>
              <button
                onClick={() => (window as any).rotateFace?.('top', false)}
                className="px-3 py-2 bg-yellow-700 text-white rounded text-xs hover:bg-yellow-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                U'
              </button>
              <button
                onClick={() => (window as any).rotateFace?.('bottom', true)}
                className="px-3 py-2 bg-white text-black rounded text-xs hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors border"
              >
                D
              </button>
              <button
                onClick={() => (window as any).rotateFace?.('bottom', false)}
                className="px-3 py-2 bg-gray-300 text-black rounded text-xs hover:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                D'
              </button>
            </div>
          </div>
          
          {/* Action buttons */}
          <div className="border-t border-gray-600 pt-3">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => (window as any).shuffleCube?.()}
                className="px-4 py-2 bg-purple-600 text-white rounded text-sm hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Shuffle
              </button>
              <button
                onClick={() => (window as any).stopShuffle?.()}
                className="px-4 py-2 bg-orange-600 text-white rounded text-sm hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Stop
              </button>
              <button
                onClick={() => (window as any).resetCube?.()}
                className="px-4 py-2 bg-red-600 text-white rounded text-sm hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      </DraggableControlPanel>
    </div>
  )
}
