import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  /**
   * "sidebar": Se adapta al ancho del Sidebar (solo ícono en <950px, ícono + texto en >=950px)
   * "icon": Botón compacto redondo/cuadrado de solo ícono (ideal para AuthLayout o headers)
   */
  variant?: "sidebar" | "icon";
  className?: string;
}

const THEME_LABELS: Record<string, string> = {
  light: "Claro",
  dark: "Oscuro",
  system: "Sistema"
};

export const ThemeToggle = ({ variant = "sidebar", className }: ThemeToggleProps) => {
  const { theme = "system", setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {variant === "icon" ? (
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "relative rounded-full text-neutral-700 dark:text-slate-200 hover:bg-neutral-100 dark:hover:bg-slate-800 cursor-pointer",
              className
            )}
            data-testid="theme-toggle-icon-btn"
          >
            <Sun className="size-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute size-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Cambiar tema</span>
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="lg"
            className={cn(
              "flex justify-center min-[950px]:justify-start items-center gap-2 w-full h-auto px-4 py-3 rounded-md text-neutral-700 dark:text-slate-200 hover:!bg-[#4F39F6]/10 dark:hover:!bg-indigo-500/15 transition-colors cursor-pointer",
              className
            )}
            data-testid="theme-toggle-sidebar-btn"
          >
            <div className="relative flex items-center justify-center size-6 shrink-0">
              <Sun
                className="!size-6 text-neutral-700 dark:text-slate-200 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0"
                aria-hidden
              />
              <Moon
                className="absolute !size-6 text-neutral-700 dark:text-slate-200 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100"
                aria-hidden
              />
            </div>

            <span className="hidden min-[950px]:inline text-base font-normal text-neutral-900 dark:text-slate-100">
              Apariencia
            </span>

            <span className="hidden min-[1100px]:inline ml-auto text-xs font-medium text-neutral-500 dark:text-slate-400">
              {THEME_LABELS[theme] ?? "Sistema"}
            </span>
          </Button>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align={variant === "icon" ? "end" : "start"}
        side={variant === "icon" ? "bottom" : "top"}
        className="w-48 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
      >
        <DropdownMenuLabel className="text-xs font-semibold text-neutral-500 dark:text-slate-400">
          Tema de la interfaz
        </DropdownMenuLabel>

        <DropdownMenuSeparator className="bg-neutral-200 dark:bg-slate-800" />

        <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
          <DropdownMenuRadioItem
            value="light"
            className="flex items-center gap-2 cursor-pointer text-neutral-900 dark:text-slate-100 focus:bg-slate-100 dark:focus:bg-slate-800"
            data-testid="theme-option-light"
          >
            <Sun className="size-4 text-amber-500" aria-hidden />
            <span>Claro</span>
          </DropdownMenuRadioItem>

          <DropdownMenuRadioItem
            value="dark"
            className="flex items-center gap-2 cursor-pointer text-neutral-900 dark:text-slate-100 focus:bg-slate-100 dark:focus:bg-slate-800"
            data-testid="theme-option-dark"
          >
            <Moon className="size-4 text-indigo-400" aria-hidden />
            <span>Oscuro</span>
          </DropdownMenuRadioItem>

          <DropdownMenuRadioItem
            value="system"
            className="flex items-center gap-2 cursor-pointer text-neutral-900 dark:text-slate-100 focus:bg-slate-100 dark:focus:bg-slate-800"
            data-testid="theme-option-system"
          >
            <Monitor className="size-4 text-neutral-500 dark:text-slate-400" aria-hidden />
            <span>Sistema</span>
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

/**
 * Submenú para integrar dentro del DropdownMenu "Más" (...) del Sidebar
 */
export const ThemeSubMenu = () => {
  const { theme = "system", setTheme } = useTheme();

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger className="flex items-center gap-2 px-3 py-3 cursor-pointer text-neutral-700 dark:text-slate-200 focus:bg-slate-100 dark:focus:bg-slate-800">
        <div className="relative flex items-center justify-center size-4 shrink-0">
          <Sun className="size-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute size-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        </div>
        <span className="text-sm font-medium text-neutral-900 dark:text-slate-100">
          Tema ({THEME_LABELS[theme] ?? "Sistema"})
        </span>
      </DropdownMenuSubTrigger>

      <DropdownMenuSubContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
        <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
          <DropdownMenuRadioItem
            value="light"
            className="flex items-center gap-2 cursor-pointer text-neutral-900 dark:text-slate-100"
          >
            <Sun className="size-4 text-amber-500" aria-hidden />
            <span>Claro</span>
          </DropdownMenuRadioItem>

          <DropdownMenuRadioItem
            value="dark"
            className="flex items-center gap-2 cursor-pointer text-neutral-900 dark:text-slate-100"
          >
            <Moon className="size-4 text-indigo-400" aria-hidden />
            <span>Oscuro</span>
          </DropdownMenuRadioItem>

          <DropdownMenuRadioItem
            value="system"
            className="flex items-center gap-2 cursor-pointer text-neutral-900 dark:text-slate-100"
          >
            <Monitor className="size-4 text-neutral-500 dark:text-slate-400" aria-hidden />
            <span>Sistema</span>
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
};

export default ThemeToggle;