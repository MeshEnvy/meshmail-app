import React from 'react'
import Svg, { Circle, Rect, Path } from 'react-native-svg'

interface EnvelopeIconProps {
  size?: number
}

export default function EnvelopeIcon({ size = 24 }: EnvelopeIconProps) {
  const scale = size / 60 // Original envelope size is 60x60
  const centerX = size / 2
  const centerY = size / 2
  
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none">
      {/* Envelope body */}
      <Rect
        x={centerX - 30 * scale}
        y={centerY - 20 * scale}
        width={60 * scale}
        height={40 * scale}
        rx={3 * scale}
        fill="#FFFFFF"
        stroke="#007AFF"
        strokeWidth={2.5 * scale}
      />

      {/* Envelope flap (open) */}
      <Path
        d={`M ${centerX - 30 * scale} ${centerY - 20 * scale} L ${centerX} ${centerY} L ${centerX + 30 * scale} ${centerY - 20 * scale}`}
        fill="none"
        stroke="#007AFF"
        strokeWidth={2.5 * scale}
        strokeLinejoin="round"
      />
      <Path
        d={`M ${centerX - 30 * scale} ${centerY - 20 * scale} L ${centerX} ${centerY} L ${centerX + 30 * scale} ${centerY - 20 * scale} L ${centerX + 30 * scale} ${centerY + 20 * scale} L ${centerX - 30 * scale} ${centerY + 20 * scale} Z`}
        fill="#E3F2FF"
        stroke="#007AFF"
        strokeWidth={2.5 * scale}
        strokeLinejoin="round"
      />

      {/* Letter inside */}
      <Rect
        x={centerX - 20 * scale}
        y={centerY - 8 * scale}
        width={40 * scale}
        height={3 * scale}
        fill="#007AFF"
        opacity="0.3"
        rx={1 * scale}
      />
      <Rect
        x={centerX - 20 * scale}
        y={centerY}
        width={40 * scale}
        height={3 * scale}
        fill="#007AFF"
        opacity="0.3"
        rx={1 * scale}
      />
      <Rect
        x={centerX - 20 * scale}
        y={centerY + 8 * scale}
        width={25 * scale}
        height={3 * scale}
        fill="#007AFF"
        opacity="0.3"
        rx={1 * scale}
      />

      {/* Center dot */}
      <Circle
        cx={centerX}
        cy={centerY}
        r={2 * scale}
        fill="#007AFF"
      />
    </Svg>
  )
}
