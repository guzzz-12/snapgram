import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface Props {
  disabled: boolean;
  children: ReactNode;
  callback: () => void;
}

const PostCardFooterBtn = ({ disabled, children, callback }: Props) => {
  return (
    <Button
      className="flex justify-center gap-1 grow text-base font-normal bg-neutral-100 cursor-pointer hover:bg-neutral-200"
      variant="ghost"
      size="default"
      disabled={disabled}
      onClick={() => callback()}
    >
      {children}
    </Button>
  )
}

export default PostCardFooterBtn