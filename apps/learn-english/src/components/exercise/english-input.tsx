"use client";

import type { ComponentProps } from "react";
import { Keyboard } from "lucide-react";
import { Input } from "@/components/ui/input";
import { hasNonAscii } from "@/learning/normalize";
import { cn } from "@/lib/utils";

/**
 * Text input for typed English answers. Browsers can't switch off Vietnamese
 * Telex/VNI typing, so autocorrect and friends are off and a hint appears as
 * soon as accented letters show up.
 */
export function EnglishInput({ value, className, ...props }: Omit<ComponentProps<"input">, "value"> & { value: string }) {
  return (
    <div className="grid gap-2">
      <Input
        lang="en"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="none"
        spellCheck={false}
        value={value}
        className={cn("h-12 text-lg md:text-lg", className)}
        {...props}
      />
      {hasNonAscii(value) ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
          <Keyboard className="size-4 shrink-0" aria-hidden />
          Có vẻ bộ gõ tiếng Việt đang bật. Hãy tắt Telex/VNI để gõ tiếng Anh.
        </p>
      ) : null}
    </div>
  );
}
