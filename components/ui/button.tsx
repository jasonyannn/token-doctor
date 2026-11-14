import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";

const variants = cva("button", {
  variants: { variant: { primary: "primary", outline: "outline" } },
  defaultVariants: { variant: "outline" },
});
export function Button({
  asChild,
  variant,
  className,
  ...props
}: ComponentProps<"button"> &
  VariantProps<typeof variants> & { asChild?: boolean }) {
  const Component = asChild ? Slot : "button";
  return <Component className={variants({ variant, className })} {...props} />;
}
