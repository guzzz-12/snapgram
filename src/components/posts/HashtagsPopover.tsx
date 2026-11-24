import { createPortal } from "react-dom";
import { useEffect, useMemo, useRef, type RefObject } from "react";
import { Hash, Loader2Icon, PlusCircle, RotateCw } from "lucide-react";
import { toast } from "sonner";
import { Command, CommandItem, CommandList } from "@/components/ui/command";
import { useCreateHashtag, useGetHashtags } from "@/services/hashtags";
import useIntersectionObserver from "@/hooks/useIntersectionObserver";
import { errorMessage } from "@/utils/errorMessage";

const POPOVER_WIDTH = 320;
const POPOVER_MAX_HEIGHT = 320;
const VIEWPORT_MARGIN = 12;

interface Props {
  openPopover: boolean;
  position: {
    left: number;
    top: number;
    lineHeight: number;
  };
  rawHashtag: string;
  debouncedHashtag: string;
  hashtagsListRef: RefObject<HTMLDivElement | null>;
  onSelectHashtag: (hashtag: string) => void;
}

/** Resalta la subcadena que coincide con lo que está escribiendo el usuario */
const HighlightedHashtag = ({ title, query }: { title: string; query: string }) => {
  const lowerTitle = title.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const matchIndex = lowerQuery ? lowerTitle.indexOf(lowerQuery) : -1;

  if (matchIndex === -1) {
    return <span>{title}</span>;
  }

  return (
    <span>
      {title.slice(0, matchIndex)}
      <strong className="font-semibold text-[#4F39F6] dark:text-indigo-400">
        {title.slice(matchIndex, matchIndex + query.length)}
      </strong>
      {title.slice(matchIndex + query.length)}
    </span>
  );
};

const formatPostsCount = (count: number) => {
  if (count === 1) return "1 publicación";
  return `${new Intl.NumberFormat("es").format(count)} publicaciones`;
};

const HashtagsPopover = ({
  openPopover,
  position,
  rawHashtag,
  debouncedHashtag,
  hashtagsListRef,
  onSelectHashtag,
}: Props) => {
  const paginationRef = useRef<HTMLDivElement>(null);

  const isDebouncing = rawHashtag !== debouncedHashtag;

  // Consultar los hashtags
  const {
    data,
    isLoading,
    error: hashtagsError,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
  } = useGetHashtags({
    value: debouncedHashtag,
    enabled: openPopover && !!debouncedHashtag && !isDebouncing,
  });

  // Crear el hashtag e insertarlo al completarse
  const { createHashtag, isPending: isCreating } = useCreateHashtag({
    onSuccess: (createdTitle) => {
      onSelectHashtag(createdTitle);
    },
  });

  const { isIntersecting } = useIntersectionObserver({
    paginationRef,
    data: openPopover ? data : null,
  });

  // Consultar la siguiente página de hashtags evitando peticiones duplicadas
  useEffect(() => {
    if (openPopover && hasNextPage && isIntersecting && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [openPopover, hasNextPage, isIntersecting, isFetchingNextPage, fetchNextPage]);

  // Notificar errores como efecto secundario (evita toasts repetidos durante el render)
  useEffect(() => {
    if (hashtagsError && openPopover) {
      toast.error(errorMessage(hashtagsError));
    }
  }, [hashtagsError, openPopover]);

  const hashtags = useMemo(
    () => data?.pages.flatMap((page) => page.data) ?? [],
    [data]
  );

  // Permitir crear el hashtag cuando no exista una coincidencia exacta (aunque haya parciales)
  const hasExactMatch = useMemo(
    () =>
      hashtags.some(
        (h) => h.title.toLowerCase() === debouncedHashtag.toLowerCase()
      ),
    [hashtags, debouncedHashtag]
  );

  const isBusy = isDebouncing || isLoading || isCreating;

  if (!openPopover || !rawHashtag) return null;

  // Coordenadas seguras dentro del viewport (clamping horizontal + flip vertical)
  const viewportWidth = typeof window !== "undefined" ? window.innerWidth : 1024;
  const viewportHeight = typeof window !== "undefined" ? window.innerHeight : 768;

  const clampedLeft = Math.min(
    Math.max(position.left - 16, VIEWPORT_MARGIN),
    Math.max(VIEWPORT_MARGIN, viewportWidth - POPOVER_WIDTH - VIEWPORT_MARGIN)
  );

  const spaceBelow = viewportHeight - (position.top + position.lineHeight);
  const shouldFlipUp =
    spaceBelow < POPOVER_MAX_HEIGHT && position.top > spaceBelow;

  const top = shouldFlipUp
    ? Math.max(VIEWPORT_MARGIN, position.top - 6)
    : position.top + position.lineHeight + 6;

  return createPortal(
    <Command
      ref={hashtagsListRef}
      data-hashtags-popover
      role="listbox"
      aria-label="Sugerencias de hashtags"
      style={{
        top: `${top}px`,
        left: `${clampedLeft}px`,
        transform: shouldFlipUp ? "translateY(-100%)" : undefined,
      }}
      className="fixed w-[320px] max-w-[calc(100vw-24px)] h-fit max-h-[320px] rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg pointer-events-auto z-[60]"
      shouldFilter={false}
      onMouseDown={(e) => {
        // Mantiene el foco en el textarea al interactuar con el popover o su scrollbar
        e.preventDefault();
      }}
    >
      <CommandList className="p-1 max-h-[280px] bg-white dark:bg-slate-900">
        {isBusy && (
          <CommandItem
            className="flex justify-center items-center px-2 py-3 text-sm"
            disabled
          >
            <Loader2Icon className="size-5 text-[#4F39F6] animate-spin" aria-hidden />
            <span className="sr-only">Cargando hashtags</span>
          </CommandItem>
        )}

        {!isBusy && hashtagsError && (
          <CommandItem
            value="__retry__"
            className="flex items-center justify-between px-2.5 py-2.5 text-sm text-red-600 dark:text-red-400 cursor-pointer"
            onSelect={() => refetch()}
          >
            <span>Error al cargar hashtags</span>
            <span className="inline-flex items-center gap-1 text-xs font-medium underline">
              <RotateCw className="size-3.5" aria-hidden />
              Reintentar
            </span>
          </CommandItem>
        )}

        {!isBusy &&
          !hashtagsError &&
          hashtags.map((hashtag) => (
            <CommandItem
              key={hashtag._id}
              value={hashtag.title}
              className="flex items-center justify-between gap-2 px-2.5 py-2.5 text-sm cursor-pointer data-[selected=true]:!bg-[#331fcf]/10"
              onSelect={() => onSelectHashtag(hashtag.title)}
            >
              <span className="flex items-center gap-2 min-w-0 truncate">
                <Hash className="size-4 shrink-0 text-neutral-400" aria-hidden />
                <span className="truncate">
                  <HighlightedHashtag title={hashtag.title} query={debouncedHashtag} />
                </span>
              </span>

              {typeof hashtag.postsCount === "number" && (
                <span className="shrink-0 text-xs text-neutral-500 dark:text-slate-400">
                  {formatPostsCount(hashtag.postsCount)}
                </span>
              )}
            </CommandItem>
          ))}

        {!isBusy && !hashtagsError && debouncedHashtag && !hasExactMatch && (
          <CommandItem
            value={`__create__${debouncedHashtag}`}
            className="flex items-center gap-2 px-2.5 py-2.5 text-sm cursor-pointer data-[selected=true]:!bg-[#331fcf]/10"
            onSelect={() => createHashtag(debouncedHashtag)}
          >
            <PlusCircle className="size-4 shrink-0 text-[#4F39F6]" aria-hidden />
            <span className="truncate">
              Crear hashtag <span className="font-semibold">{debouncedHashtag}</span>
            </span>
          </CommandItem>
        )}

        {isFetchingNextPage && (
          <CommandItem
            className="flex justify-center items-center p-2 text-sm"
            disabled
          >
            <Loader2Icon className="size-5 text-[#4F39F6] animate-spin" aria-hidden />
            <span className="sr-only">Cargando más hashtags</span>
          </CommandItem>
        )}

        {hasNextPage && !isBusy && <div ref={paginationRef} className="w-full h-4" />}
      </CommandList>

      <div className="flex items-center justify-between px-2.5 py-1.5 text-[11px] text-neutral-500 dark:text-slate-400 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/50">
        <span>↑↓ Navegar</span>
        <span>Enter / Tab Seleccionar</span>
        <span>Esc Cerrar</span>
      </div>
    </Command>,
    document.body
  )
}

export default HashtagsPopover