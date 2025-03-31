"use client"

import { useState } from "react"
import { Star } from "lucide-react"

interface StarRatingProps {
  rating: number
  onChange?: (rating: number) => void
  size?: number
  readOnly?: boolean
}

export function StarRating({ rating, onChange, size = 24, readOnly = false }: StarRatingProps) {
  const [hoverRating, setHoverRating] = useState(0)

  const handleMouseEnter = (index: number) => {
    if (readOnly) return
    setHoverRating(index)
  }

  const handleMouseLeave = () => {
    if (readOnly) return
    setHoverRating(0)
  }

  const handleClick = (index: number) => {
    if (readOnly) return
    onChange?.(index)
  }

  return (
    <div className="flex">
      {[1, 2, 3, 4, 5].map((index) => (
        <Star
          key={index}
          size={size}
          className={`
            ${index <= (hoverRating || rating) ? "text-yellow-400 fill-yellow-400" : "text-gray-300"}
            ${!readOnly && "cursor-pointer transition-colors"}
          `}
          onMouseEnter={() => handleMouseEnter(index)}
          onMouseLeave={handleMouseLeave}
          onClick={() => handleClick(index)}
        />
      ))}
    </div>
  )
}

