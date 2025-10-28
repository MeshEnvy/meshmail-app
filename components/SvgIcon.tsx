import React from 'react'
import Svg from 'react-native-svg'

interface SvgIconProps {
  size?: number
  color?: string
  children: React.ReactNode
}

export default function SvgIcon({ size = 24, color = '#fff', children }: SvgIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child, { fill: color })
        }
        return child
      })}
    </Svg>
  )
}
