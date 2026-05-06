import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-20 w-full border border-[#292929] bg-[#ffffff] px-3 py-2 text-[14px] text-[#000000] transition-colors outline-none placeholder:text-[#292929]/40 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-1 focus-visible:outline-[#292929] disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
