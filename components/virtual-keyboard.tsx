"use client"

import { Button } from "@/components/ui/button"
import { Delete } from "lucide-react"

interface VirtualKeyboardProps {
  onKeyPress: (value: string) => void
  onBackspace: () => void
  onClear: () => void
}

export function VirtualKeyboard({ onKeyPress, onBackspace, onClear }: VirtualKeyboardProps) {
  const keys = [
    ["1", "2", "3"],
    ["4", "5", "6"],
    ["7", "8", "9"],
    [".", "0", "⌫"],
  ]

  const handleKeyClick = (key: string) => {
    if (key === "⌫") {
      onBackspace()
    } else {
      onKeyPress(key)
    }
  }

  return (
    <div className="w-full space-y-2">
      {keys.map((row, rowIndex) => (
        <div key={rowIndex} className="grid grid-cols-3 gap-2">
          {row.map((key) => (
            <Button
              key={key}
              type="button"
              variant={key === "⌫" ? "destructive" : "outline"}
              size="lg"
              className="h-14 text-xl font-semibold"
              onClick={() => handleKeyClick(key)}
            >
              {key === "⌫" ? <Delete className="h-5 w-5" /> : key}
            </Button>
          ))}
        </div>
      ))}
      <Button
        type="button"
        variant="secondary"
        size="lg"
        className="h-14 w-full text-lg font-semibold"
        onClick={onClear}
      >
        Clear
      </Button>
    </div>
  )
}
