import React from "react"
import { cn } from "@/lib/utils"
import { Flame, Zap } from "lucide-react"

interface FenixPayLogoProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl"
  variant?: "full" | "mini" | "icon"
  className?: string
  animated?: boolean
}

const sizeMap = {
  xs: "text-base",
  sm: "text-xl", 
  md: "text-2xl",
  lg: "text-3xl",
  xl: "text-4xl"
}

const iconSizeMap = {
  xs: "w-5 h-5",
  sm: "w-6 h-6",
  md: "w-8 h-8", 
  lg: "w-10 h-10",
  xl: "w-12 h-12"
}

export function FenixPayLogo({ 
  size = "md", 
  variant = "full", 
  className, 
  animated = false 
}: FenixPayLogoProps) {
  const textSize = sizeMap[size]
  const iconSize = iconSizeMap[size]

  const animatedClass = animated ? "magic-float" : ""

  if (variant === "mini" || variant === "icon") {
    return (
      <div className={cn("relative flex items-center justify-center", iconSize, className)}>
        <div className={cn("relative", animatedClass)}>
          {/* Phoenix flame icon with gradient */}
          <div className="relative">
            <Flame 
              className={cn(
                "text-blue-500 dark:text-blue-400",
                iconSize,
                "drop-shadow-lg"
              )} 
            />
            {/* Lightning overlay for "pay" aspect */}
            <Zap 
              className={cn(
                "absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2",
                "w-3 h-3 text-blue-300 dark:text-blue-200",
                "opacity-80"
              )} 
            />
          </div>
          {/* Glow effect */}
          <div className="absolute inset-0 blur-sm opacity-50">
            <Flame className={cn("text-blue-400", iconSize)} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn(
      "flex items-center font-bold tracking-tight",
      "text-slate-900 dark:text-slate-100", 
      textSize, 
      className,
      animatedClass
    )}>
      {/* Phoenix icon */}
      <div className="relative mr-2">
        <div className="relative">
          <Flame 
            className={cn(
              "text-blue-500 dark:text-blue-400",
              iconSize,
              "drop-shadow-lg"
            )} 
          />
          {/* Lightning overlay */}
          <Zap 
            className={cn(
              "absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2",
              "w-3 h-3 text-blue-300 dark:text-blue-200",
              "opacity-80"
            )} 
          />
        </div>
        {/* Glow effect */}
        <div className="absolute inset-0 blur-sm opacity-30">
          <Flame className={cn("text-blue-400", iconSize)} />
        </div>
      </div>
      
      {/* Text logo */}
      <span className="tracking-wide">
        <span className="text-blue-600 dark:text-blue-400 font-black">FENIX</span>
        <span className="text-slate-700 dark:text-slate-300 font-semibold">PAY</span>
      </span>
    </div>
  )
}

export default FenixPayLogo