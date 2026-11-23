import { Crop as CropIcon, Lock, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ASPECT_RATIO_PRESETS,
  type AspectRatioValue,
  type CropMode,
} from "@/types/imageCropper";
import { cn } from "@/lib/utils";

interface CropModeControlsProps {
  cropMode: CropMode;
  aspectPreset: AspectRatioValue;
  disabled?: boolean;
  onModeChange: (mode: CropMode) => void;
  onAspectPresetChange: (preset: AspectRatioValue) => void;
  onReset: () => void;
}

const CropModeControls = ({
  cropMode,
  aspectPreset,
  disabled = false,
  onModeChange,
  onAspectPresetChange,
  onReset,
}: CropModeControlsProps) => {
  return (
    <div className="flex flex-col gap-2.5 w-full">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {/* Selector de los dos modos de recorte */}
        <div
          className="inline-flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-800"
          role="group"
          aria-label="Modo de recorte"
        >
          <Button
            type="button"
            size="sm"
            variant={cropMode === "free" ? "default" : "ghost"}
            disabled={disabled}
            data-testid="crop-mode-free-btn"
            aria-pressed={cropMode === "free"}
            className={cn(
              "h-8 px-3 text-xs cursor-pointer",
              cropMode === "free" &&
                "bg-[#4F39F6] text-white hover:bg-[#331fcf] dark:bg-[#4F39F6] dark:text-white"
            )}
            onClick={() => onModeChange("free")}
          >
            <CropIcon className="size-3.5" aria-hidden />
            Recorte libre
          </Button>

          <Button
            type="button"
            size="sm"
            variant={cropMode === "aspect" ? "default" : "ghost"}
            disabled={disabled}
            data-testid="crop-mode-aspect-btn"
            aria-pressed={cropMode === "aspect"}
            className={cn(
              "h-8 px-3 text-xs cursor-pointer",
              cropMode === "aspect" &&
                "bg-[#4F39F6] text-white hover:bg-[#331fcf] dark:bg-[#4F39F6] dark:text-white"
            )}
            onClick={() => onModeChange("aspect")}
          >
            <Lock className="size-3.5" aria-hidden />
            Relación de aspecto
          </Button>
        </div>

        {/* Botón para restablecer la selección */}
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={disabled}
          data-testid="crop-reset-btn"
          className="h-8 px-2.5 text-xs cursor-pointer"
          onClick={onReset}
        >
          <RotateCcw className="size-3.5" aria-hidden />
          Restablecer
        </Button>
      </div>

      {/* Presets de relación de aspecto visibles únicamente en modo bloqueado */}
      {cropMode === "aspect" && (
        <div
          className="flex flex-wrap items-center gap-1.5"
          role="group"
          aria-label="Proporción de recorte"
          data-testid="crop-aspect-presets"
        >
          {ASPECT_RATIO_PRESETS.map((preset) => {
            const isSelected = aspectPreset === preset.value;

            return (
              <Button
                key={preset.id}
                type="button"
                size="sm"
                variant={isSelected ? "secondary" : "outline"}
                disabled={disabled}
                data-testid={`crop-aspect-preset-${preset.id}`}
                aria-pressed={isSelected}
                className={cn(
                  "h-7 px-2.5 text-xs cursor-pointer",
                  isSelected &&
                    "border-[#4F39F6] bg-[#4F39F6]/10 text-[#4F39F6] dark:bg-[#4F39F6]/20 dark:text-indigo-300"
                )}
                onClick={() => onAspectPresetChange(preset.value)}
              >
                {preset.label}
              </Button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CropModeControls;