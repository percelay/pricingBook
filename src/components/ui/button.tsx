import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center border whitespace-nowrap font-mono text-[12px] font-medium uppercase tracking-[0.2em] transition-colors outline-none select-none focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-[#292929] disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5",
  {
    variants: {
      variant: {
        // Filled ink — used sparingly for primary CTAs
        default:
          "border-[#292929] bg-[#292929] text-[#ffffff] hover:bg-[#000000] hover:border-[#000000]",
        // Default outline ghosted button — primary action style per mono x7
        outline:
          "border-[#292929] bg-transparent text-[#292929] hover:bg-[#292929] hover:text-[#ffffff]",
        secondary:
          "border-[#292929] bg-transparent text-[#292929] hover:bg-[#292929] hover:text-[#ffffff]",
        ghost:
          "border-transparent bg-transparent text-[#292929] hover:bg-[#292929] hover:text-[#ffffff]",
        destructive:
          "border-[#292929] bg-transparent text-[#292929] hover:bg-[#292929] hover:text-[#ffffff]",
        link:
          "border-transparent bg-transparent text-[#292929] underline-offset-4 hover:underline normal-case tracking-[-0.02em]",
      },
      size: {
        default: "h-9 gap-2 px-5",
        xs: "h-6 gap-1 px-2 text-[10px] [&_svg:not([class*='size-'])]:size-3",
        sm: "h-7 gap-1.5 px-3 text-[11px]",
        lg: "h-10 gap-2 px-6 text-[13px]",
        icon: "size-9 px-0",
        "icon-xs": "size-6 px-0 [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-7 px-0",
        "icon-lg": "size-10 px-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
