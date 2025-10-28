import React from 'react'
import Svg, { Circle, Line, G, Rect, Path } from 'react-native-svg'

interface LogoProps {
  size?: number
}

export default function Logo({ size = 200 }: LogoProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
      {/* Mesh network nodes */}
      <Circle cx="50" cy="50" r="8" fill="#007AFF" />
      <Circle cx="150" cy="50" r="8" fill="#007AFF" />
      <Circle cx="100" cy="100" r="8" fill="#007AFF" />
      <Circle cx="50" cy="150" r="8" fill="#007AFF" />
      <Circle cx="150" cy="150" r="8" fill="#007AFF" />

      {/* Mesh network connections */}
      <Line
        x1="50"
        y1="50"
        x2="150"
        y2="50"
        stroke="#007AFF"
        strokeWidth="2"
        opacity="0.4"
      />
      <Line
        x1="50"
        y1="50"
        x2="100"
        y2="100"
        stroke="#007AFF"
        strokeWidth="2"
        opacity="0.4"
      />
      <Line
        x1="150"
        y1="50"
        x2="100"
        y2="100"
        stroke="#007AFF"
        strokeWidth="2"
        opacity="0.4"
      />
      <Line
        x1="100"
        y1="100"
        x2="50"
        y2="150"
        stroke="#007AFF"
        strokeWidth="2"
        opacity="0.4"
      />
      <Line
        x1="100"
        y1="100"
        x2="150"
        y2="150"
        stroke="#007AFF"
        strokeWidth="2"
        opacity="0.4"
      />
      <Line
        x1="50"
        y1="150"
        x2="150"
        y2="150"
        stroke="#007AFF"
        strokeWidth="2"
        opacity="0.4"
      />
      <Line
        x1="50"
        y1="50"
        x2="50"
        y2="150"
        stroke="#007AFF"
        strokeWidth="2"
        opacity="0.4"
      />
      <Line
        x1="150"
        y1="50"
        x2="150"
        y2="150"
        stroke="#007AFF"
        strokeWidth="2"
        opacity="0.4"
      />

      {/* Mail envelope integrated into mesh */}
      <G transform="translate(70, 70)">
        {/* Envelope body */}
        <Rect
          x="0"
          y="10"
          width="60"
          height="40"
          rx="3"
          fill="#FFFFFF"
          stroke="#007AFF"
          strokeWidth="2.5"
        />

        {/* Envelope flap (open) */}
        <Path
          d="M 0 10 L 30 30 L 60 10"
          fill="none"
          stroke="#007AFF"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        <Path
          d="M 0 10 L 30 30 L 60 10 L 60 50 L 0 50 Z"
          fill="#E3F2FF"
          stroke="#007AFF"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />

        {/* Letter inside */}
        <Rect
          x="10"
          y="22"
          width="40"
          height="3"
          fill="#007AFF"
          opacity="0.3"
          rx="1"
        />
        <Rect
          x="10"
          y="30"
          width="40"
          height="3"
          fill="#007AFF"
          opacity="0.3"
          rx="1"
        />
        <Rect
          x="10"
          y="38"
          width="25"
          height="3"
          fill="#007AFF"
          opacity="0.3"
          rx="1"
        />
      </G>

      {/* Highlight the center node (the envelope is on top of it) */}
      <Circle
        cx="100"
        cy="100"
        r="10"
        fill="none"
        stroke="#007AFF"
        strokeWidth="2"
        opacity="0.6"
      />
    </Svg>
  )
}
