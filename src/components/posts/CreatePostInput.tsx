import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type Dispatch,
  type KeyboardEvent,
  type SetStateAction,
  type WheelEvent,
} from "react";
import { Loader2Icon, Smile } from "lucide-react";
import { useTheme } from "next-themes";
import HashtagsPopover from "./HashtagsPopover";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useDebounce } from "@/hooks/useDebounce";
import { getCaretCoordinates } from "@/utils/getCaretCoordinates";
import {
  getActiveHashtagAtCaret,
  replaceActiveHashtag,
  type ActiveHashtag,
} from "@/utils/hashtagCaret";

const LazyEmojiPicker = lazy(async () => {
  const [{ default: Picker }, { default: emojiData }] = await Promise.all([
    import("@emoji-mart/react"),
    import("@emoji-mart/data/sets/15/twitter.json"),
  ]);

  return {
    default: (props: { theme?: "light" | "dark"; onEmojiSelect: (e: any) => void }) => (
      <Picker
        locale="es"
        emojiVersion="15"
        set="twitter"
        theme={props.theme ?? "light"}
        previewPosition="none"
        navPosition="bottom"
        data={emojiData}
        onEmojiSelect={props.onEmojiSelect}
      />
    ),
  };
});

interface Props {
  textContent: string;
  isPending: boolean;
  setTextContent: Dispatch<SetStateAction<string>>;
}

const CreatePostInput = ({ textContent, isPending, setTextContent }: Props) => {
  const { resolvedTheme } = useTheme();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const hashtagsListRef = useRef<HTMLDivElement>(null);

  const [caretPosition, setCaretPosition] = useState(0);
  const [hashtagPosition, setHashtagPosition] = useState({
    left: 0,
    top: 0,
    lineHeight: 24,
  });
  const [activeHashtag, setActiveHashtag] = useState<ActiveHashtag | null>(null);

  const rawHashtag = activeHashtag?.value ?? "";
  const showHashtagPopover = activeHashtag !== null;
  const { debouncedValue: debouncedHashtag } = useDebounce(rawHashtag, 250);

  const closeHashtagPopover = useCallback(() => {
    setActiveHashtag(null);
  }, []);

  // Sincronizar el hashtag activo respecto a la posición actual del cursor
  const syncActiveHashtag = useCallback(
    (value: string, selectionStart: number, selectionEnd: number = selectionStart) => {
      setCaretPosition(selectionStart);
      const detected = getActiveHashtagAtCaret(value, selectionStart, selectionEnd);
      setActiveHashtag(detected);
    },
    []
  );

  // Recalcular posición del popover en viewport (incluyendo scroll y resize)
  const updatePopoverPosition = useCallback(() => {
    const textarea = inputRef.current;
    if (!textarea || !activeHashtag) return;

    const { top: textareaTop, left: textareaLeft } = textarea.getBoundingClientRect();
    const coords = getCaretCoordinates(textarea, activeHashtag.start);

    setHashtagPosition({
      top: coords.top + textareaTop,
      left: coords.left + textareaLeft,
      lineHeight: coords.height || 24,
    });
  }, [activeHashtag]);

  // Hacer autoFocus en el textarea
  useEffect(() => {
    const timeout = setTimeout(() => {
      const textarea = inputRef.current;
      if (!textarea) return;

      textarea.focus();
      const contentLength = textarea.value.length;
      textarea.setSelectionRange(contentLength, contentLength);
      setCaretPosition(contentLength);
    }, 250);

    return () => {
      clearTimeout(timeout);
      setTextContent("");
    };
  }, []);

  // Actualizar coordenadas cuando cambie el contenido, cursor, scroll o viewport
  useEffect(() => {
    if (!showHashtagPopover) return;

    updatePopoverPosition();

    const scrollContainer = scrollContainerRef.current;
    scrollContainer?.addEventListener("scroll", updatePopoverPosition, { passive: true });
    window.addEventListener("scroll", updatePopoverPosition, { passive: true, capture: true });
    window.addEventListener("resize", updatePopoverPosition);

    return () => {
      scrollContainer?.removeEventListener("scroll", updatePopoverPosition);
      window.removeEventListener("scroll", updatePopoverPosition, { capture: true });
      window.removeEventListener("resize", updatePopoverPosition);
    };
  }, [showHashtagPopover, textContent, caretPosition, updatePopoverPosition]);

  // Cerrar el popover al hacer clic fuera del textarea y de la lista de sugerencias
  useEffect(() => {
    if (!showHashtagPopover) return;

    const handlePointerDownOutside = (e: PointerEvent) => {
      const target = e.target as Node;
      const isInsideTextarea = inputRef.current?.contains(target);
      const isInsidePopover = hashtagsListRef.current?.contains(target);

      if (!isInsideTextarea && !isInsidePopover) {
        closeHashtagPopover();
      }
    };

    document.addEventListener("pointerdown", handlePointerDownOutside);
    return () => document.removeEventListener("pointerdown", handlePointerDownOutside);
  }, [showHashtagPopover, closeHashtagPopover]);

  // Insertar/reemplazar el hashtag seleccionado o recién creado en su rango exacto
  const handleSelectHashtag = useCallback(
    (selectedTitle: string) => {
      if (!activeHashtag) return;

      const { nextText, nextCaretPosition } = replaceActiveHashtag(
        textContent,
        activeHashtag,
        selectedTitle,
        true
      );

      setTextContent(nextText);
      setCaretPosition(nextCaretPosition);
      closeHashtagPopover();

      requestAnimationFrame(() => {
        const textarea = inputRef.current;
        if (!textarea) return;
        textarea.focus();
        textarea.setSelectionRange(nextCaretPosition, nextCaretPosition);
      });
    },
    [activeHashtag, textContent, setTextContent, closeHashtagPopover]
  );

  // Manejar el evento change del textarea
  const onChangeHandler = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const { value, selectionStart, selectionEnd } = e.currentTarget;
    setTextContent(value);
    syncActiveHashtag(value, selectionStart, selectionEnd);
  };

  // Re-evaluar el hashtag activo al mover el cursor con el teclado
  const handleKeyUp = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Escape") return;

    if (
      showHashtagPopover &&
      (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === "Tab")
    ) {
      return;
    }

    const navigationKeys = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"];
    if (navigationKeys.includes(e.key)) {
      const { value, selectionStart, selectionEnd } = e.currentTarget;
      syncActiveHashtag(value, selectionStart, selectionEnd);
    }
  };

  // Insertar el emoji en la posición del cursor y mover el caret después del emoji
  const onEmojiPickHandler = (e: any) => {
    const emoji: string = e.native;
    const nextValue =
      textContent.slice(0, caretPosition) + emoji + textContent.slice(caretPosition);
    const nextCaret = caretPosition + emoji.length;

    setTextContent(nextValue);
    setCaretPosition(nextCaret);
    closeHashtagPopover();

    requestAnimationFrame(() => {
      const textarea = inputRef.current;
      if (!textarea) return;
      textarea.focus();
      textarea.setSelectionRange(nextCaret, nextCaret);
    });
  };

  // Traspasar el control del evento keydown del textarea a la lista de hashtags
  // y cerrar el popover con Escape sin cerrar el Dialog padre
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (!showHashtagPopover) return;

    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      e.nativeEvent.stopImmediatePropagation();
      closeHashtagPopover();
      return;
    }

    if (
      e.key === "ArrowDown" ||
      e.key === "ArrowUp" ||
      e.key === "Enter" ||
      e.key === "Tab"
    ) {
      e.preventDefault();

      const hashtagsListElement = hashtagsListRef.current;
      if (hashtagsListElement) {
        hashtagsListElement.dispatchEvent(
          new KeyboardEvent("keydown", {
            // cmdk selecciona con Enter, no con Tab
            key: e.key === "Tab" ? "Enter" : e.key,
            bubbles: true,
            cancelable: true,
          })
        );
      }
    }
  };

  // Detener la propagación del evento scroll del emoji picker al scroll del textarea
  const handleScrollInterception = (e: WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.scrollTop += e.deltaY;
  };

  return (
    <>
      {/* Popover con los hashtags */}
      <HashtagsPopover
        openPopover={showHashtagPopover}
        position={hashtagPosition}
        rawHashtag={rawHashtag}
        debouncedHashtag={debouncedHashtag}
        hashtagsListRef={hashtagsListRef}
        onSelectHashtag={handleSelectHashtag}
      />

      <div
        ref={scrollContainerRef}
        className="relative flex justify-start items-start gap-3 w-full max-h-[270px] border-b border-slate-200 dark:border-slate-800 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 dark:scrollbar-thumb-slate-700 scrollbar-track-gray-200 dark:scrollbar-track-slate-900"
      >
        <Textarea
          ref={inputRef}
          className="w-full px-0 py-4 !text-base text-neutral-900 dark:text-slate-100 dark:bg-transparent border-t-0 border-b-0 border-l-0 border-r-0 rounded-none shadow-none resize-none placeholder:text-neutral-400 dark:placeholder:text-slate-500 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:ring-offset-transparent focus-visible:border-b"
          placeholder="¿Qué estás pensando?"
          data-testid="create-post-input"
          role="combobox"
          aria-expanded={showHashtagPopover}
          aria-haspopup="listbox"
          aria-autocomplete="list"
          disabled={isPending}
          value={textContent}
          onChange={onChangeHandler}
          onKeyDown={handleKeyDown}
          onKeyUp={handleKeyUp}
          onClick={(e) => {
            const { value, selectionStart, selectionEnd } = e.currentTarget;
            syncActiveHashtag(value, selectionStart, selectionEnd);
          }}
        />

        <div className="sticky top-[50%] right-1 flex justify-center items-center h-full shrink-0 translate-y-[-50%] z-10">
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="shrink-0 cursor-pointer"
                disabled={isPending}
              >
                <Smile className="size-6 text-neutral-600 dark:text-slate-400" aria-hidden />
                <span className="sr-only">Seleccionar Emoji</span>
              </button>
            </PopoverTrigger>

            <PopoverContent
              className="w-full h-full p-0 -translate-y-[1rem] bg-transparent border-none shadow-none"
              side="left"
              onWheel={handleScrollInterception}
            >
              <Suspense
                fallback={
                  <div className="flex items-center justify-center w-[352px] h-[435px] bg-white dark:bg-slate-900 rounded-lg shadow">
                    <Loader2Icon className="size-6 text-[#4F39F6] animate-spin" />
                  </div>
                }
              >
                <LazyEmojiPicker
                  theme={resolvedTheme === "dark" ? "dark" : "light"}
                  onEmojiSelect={onEmojiPickHandler}
                />
              </Suspense>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </>
  )
}

export default CreatePostInput