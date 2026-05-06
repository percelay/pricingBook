import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-9 w-full min-w-0 border border-[#292929] bg-[#ffffff] px-3 py-1 text-[14px] text-[#000000] transition-colors outline-none placeholder:text-[#292929]/40 placeholder:tracking-normal focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-1 focus-visible:outline-[#292929] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium",
        className
      )}
      {...props}
    />
  )
}

export { Input }
