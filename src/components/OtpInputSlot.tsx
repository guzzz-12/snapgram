import { cn } from "@/lib/utils";
import type { SlotProps } from "input-otp";

interface Props {
  props: SlotProps;
}

const OtpInputSlot = ({ props }: Props) => {
  return (
    <div
      className={cn(
        "relative w-full aspect-square text-[2rem]",
        "flex items-center justify-center",
        "transition-all duration-300",
        "border-border border-y border-r first:border-l first:rounded-l-md last:rounded-r-md",
        "group-hover:border-accent-foreground/20 group-focus-within:border-accent-foreground/20",
        "outline outline-accent-foreground/20",
        { "outline-2 outline-accent-foreground": props.isActive },
      )}
    >
      <div className="group-has-[input[data-input-otp-placeholder-shown]]:opacity-20">
        {props.char ?? props.placeholderChar}
      </div>
    </div>
  )
}

export default OtpInputSlot