import { useEffect, useRef, useState, type ChangeEvent, type Dispatch, type KeyboardEvent, type SetStateAction, type WheelEvent } from "react";
import Picker from "@emoji-mart/react";
import emojiData from "@emoji-mart/data/sets/15/twitter.json";
import { Smile } from "lucide-react";
import HashtagsPopover from "./HashtagsPopover";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useDebounce } from "@/hooks/useDebounce";
import { getCaretCoordinates } from "@/utils/getCaretCoordinates";

// const HASHTAG_REGEX = /#[A-Za-z_][A-Za-z0-9_]*$/; // No soporta diacríticas
const HASHTAG_REGEX = /#[\p{L}\p{N}_]+$/u; // Soporta diacríticas (multilenguaje)

interface Props {
  textContent: string;
  isPending: boolean;
  setTextContent: Dispatch<SetStateAction<string>>;
}

const CreatePostInput = ({ textContent, isPending, setTextContent }: Props) => {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const hashtagsListRef = useRef<HTMLDivElement>(null);

  const [caretPosition, setCaretPosition] = useState(0);
  const [hashtagPosition, setHashtagPosition] = useState({left: 0, top: 0});
  const [showHashtagPopover, setShowHashtagPopover] = useState(false);
  const [currentlyTypingHashtag, setCurrentlyTypingHashtag] = useState("");
  const [selectedHashtag, setSelectedHashtag] = useState("");

  const {debouncedValue} = useDebounce(currentlyTypingHashtag);

  // Hacer autoFocus en el textarea
  useEffect(() => {
    const timeout = setTimeout(() => {
      const textarea = inputRef.current!;

      textarea.focus();

      const contentLength = textarea.value.length;

      textarea.setSelectionRange(contentLength, contentLength);
    }, 250);

    return () => {
      clearTimeout(timeout);
      setTextContent("");
    };
  }, []);

  // Reemplazar el hashtag en el textarea con el hashtag seleccionado
  useEffect(() => {
    if (!selectedHashtag) return;

    setTextContent(textContent.replace(HASHTAG_REGEX, selectedHashtag));

    setSelectedHashtag("");
  }, [selectedHashtag]);

  // Actualizar la posicion del popover a medida que se tipea
  useEffect(() => {
    const textarea = inputRef.current!;
    
    const { top: textareaTop, left: textareaLeft } = textarea.getBoundingClientRect();

    const coords = getCaretCoordinates(textarea, caretPosition);

    setHashtagPosition({
      top: coords.top + textareaTop,
      left: coords.left + textareaLeft,
    });
    
  }, [textContent, caretPosition]);

  // Manejar el evento change del textarea
  const onChangeHandler = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.currentTarget.value;

    // Obtener la posición del cursor del textarea al tipear
    const caretPosition = e.target.selectionStart

    // Chequear si hay un hashtag al final del texto
    const hashtagMatch = value.match(HASHTAG_REGEX);

    setTextContent(value);
    setCaretPosition(caretPosition);
    setShowHashtagPopover(!!hashtagMatch);

    if (hashtagMatch) {
      setCurrentlyTypingHashtag(hashtagMatch[0]);
    }
  }
  
  // Insertar el emoji en la posición del cursor
  const onEmojiPickHandler = (e: any) => {
    const value = textContent.slice(0, caretPosition) + e.native + textContent.slice(caretPosition);
    setTextContent(value);
  }

  // Traspasar el control del evento keydown del textarea a la lista de hashtags
  // de las teclas flecha arriba, abajo y enter si el popover esta abierto
  // para que el usuario pueda navegar entre los hashtags y seleccionarlos
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (!showHashtagPopover) return;

    if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === "Tab") {
      // Evitar el comportamiento por defecto de las flechas y enter
      // en el textarea si el popover esta abierto
      e.preventDefault();
      
      const hashtagsListElement = hashtagsListRef.current;

      // Sobreescribir el evento keydown de la lista de hashtags
      if (hashtagsListElement) {
        hashtagsListElement.dispatchEvent(
          new KeyboardEvent("keydown", {
            key: e.key,
            // Propagar el evento keydown a la lista de hashtags
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

    // Aplicar manualmente el scroll al emoji picker
    e.currentTarget.scrollTop += e.deltaY;
  };

  return (
    <>
      {/* Popover con los hashtags */}
      <HashtagsPopover
        openPopover={showHashtagPopover}
        position={hashtagPosition}
        currentlyTypingHashtag={debouncedValue}
        selectedHashtag={selectedHashtag}
        hashtagsListRef={hashtagsListRef}
        setOpenPopover={setShowHashtagPopover}
        setSelectedHashtag={(hashtag) => {
          setSelectedHashtag(hashtag);
          setShowHashtagPopover(false);
          inputRef.current!.focus();
        }}
      />

      <div
        className="relative flex justify-start items-start gap-3 w-full max-h-[270px] border-b overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200"
      >
        <Textarea
          ref={inputRef}
          className="w-full px-0 py-4 !text-base border-t-0 border-b-0 border-l-0 border-r-0 rounded-none shadow-none resize-none placeholder:text-neutral-400 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:ring-offset-transparent focus-visible:border-b"
          placeholder="¿Qué estás pensando?"
          disabled={isPending}
          value={textContent}
          onChange={onChangeHandler}
          onKeyDown={handleKeyDown}
          onClick={(e) => {
            // Actualizar el state de la posición del cursor al clickear en el textarea
            const caretPosition = e.currentTarget.selectionStart;
            setCaretPosition(caretPosition);
          }}
        />

        <div className="sticky top-[50%] right-1 flex justify-center items-center h-full shrink-0 translate-y-[-50%] z-10">
          <Popover>
            <PopoverTrigger asChild>
              <button
                className="shrink-0 cursor-pointer"
                disabled={isPending}
              >
                <Smile className="size-6 text-neutral-600" aria-hidden />
                <span className="sr-only">Seleccionar Emoji</span>
              </button>
            </PopoverTrigger>

            <PopoverContent
              className="w-full h-full p-0 -translate-y-[1rem] bg-transparent"
              side="left"
              onWheel={handleScrollInterception}
            >
              <Picker
                locale="es"
                emojiVersion="15"
                set="twitter"
                data={emojiData}
                onEmojiSelect={onEmojiPickHandler}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </>
  )
}

export default CreatePostInput