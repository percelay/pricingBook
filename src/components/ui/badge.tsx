import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 border px-2 text-[10px] font-medium uppercase tracking-[0.18em] whitespace-nowrap transition-colors focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-1 focus-visible:outline-[#292929] [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default: "border-[#292929] bg-[#292929] text-[#ffffff]",
        secondary: "border-[#292929] bg-transparent text-[#292929]",
        destructive: "border-[#292929] bg-transparent text-[#292929]",
        outline: "border-[#292929] bg-transparent text-[#292929]",
        ghost: "border-transparent bg-transparent text-[#292929]",
        link: "border-transparent bg-transparent text-[#292929] underline-offset-4 hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant }), className),
      },
      props
    ),
    render,
    state: {
      slot: "badge",
      variant,
    },
  })
}

export { Badge, badgeVariants }
