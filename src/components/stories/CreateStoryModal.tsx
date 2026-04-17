import { useEffect, useRef, useState, type ChangeEvent, type ClipboardEvent } from "react";
import { ArrowLeft, Expand, Image, Minimize, Palette, Plus, TypeOutline } from "lucide-react";
import StoryColorPicker, { COLORS } from "./StoryColorPicker";
import { Button } from "../ui/button";
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogOverlay, DialogTitle } from "../ui/dialog";
import { Textarea } from "../ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { useCreateStory } from "@/services/stories";
import useImagePicker from "@/hooks/useImagePicker";
import { useCreatePublicationModal } from "@/hooks/useCreatePublicationModal";

const TEXT_BG_COLORS: ("transparent" | "#fff" | "#000")[] = ["transparent", "#fff", "#000"];

const CreateStoryModal = () => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const prevTextRef = useRef("");

  const [storyTextContent, setStoryTextContent] = useState("");
  const [charLimitReached, setCharLimitReached] = useState(false);
  const [isPasted, setIsPasted] = useState(false);
  const [storyTextColor, setStoryTextColor] = useState<"#fff" | "#000">("#fff");
  const [storyTextBgColor, setStoryTextBgColor] = useState<"transparent" | "#fff" | "#000">(TEXT_BG_COLORS[0]);
  const [selectdBgColor, setSelectedBgColor] = useState<{ name: string, value: string }>( COLORS[0] );
  const [imageSize, setImageSize] = useState<"cover" | "contain">("cover");

  const { selectedImageFiles, selectedImagePreviews, setSelectedImageFiles, setSelectedImagePreviews, onImagePickHandler} = useImagePicker({fileInputRef});

  const {open: isOpen, publicationType, setOpen} = useCreatePublicationModal();

  useEffect(() => {
    if (!containerRef.current || !textareaRef.current) {
      return;
    }

    if (isPasted) {
      let containerHeight = containerRef.current.clientHeight;
      let textarea = textareaRef.current;
      let splittedText = storyTextContent.split("");

      while (textarea.scrollHeight >= (containerHeight - 120)) {
        splittedText.pop();
        textarea.value = splittedText.join("");
        containerHeight = containerRef.current.clientHeight;
        textarea = textareaRef.current!;
      }

      setIsPasted(false);
      setStoryTextContent(splittedText.join(""));
      prevTextRef.current = storyTextContent;
      
    } else {
      setIsPasted(false);

      const containerHeight = containerRef.current?.clientHeight;
      const textarea = textareaRef.current;
      
      if (textarea.scrollHeight >= (containerHeight - 120)) {
        setCharLimitReached(true);
      } else {
        setCharLimitReached(false);
      }
    
      prevTextRef.current = storyTextContent;
    }
  }, [storyTextContent, isPasted]);

  useEffect(() => {
    return () => {
      if (!isOpen) {
        setStoryTextContent("");
        setSelectedImageFiles([]);
        setSelectedImagePreviews([]);
      
        if(fileInputRef.current) {
          fileInputRef.current.value = ""
        };
      }
    }
  }, [isOpen]);

  const onChangeHandler = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setIsPasted(false);

    if (charLimitReached && e.target.value.length > prevTextRef.current.length) {
      setStoryTextContent(prevTextRef.current);
      return false;
    }

    setStoryTextContent(e.target.value);
  }

  const onPasteHandler = (e: ClipboardEvent<HTMLTextAreaElement>) => {
    e.preventDefault();

    const text = e.clipboardData.getData("text/plain");

    setIsPasted(true);
    setStoryTextContent(text);
    prevTextRef.current = text;
  }

  // Alternar el color de fondo del texto (transparente, blanco o negro)
  const toggleTextBgColor = () => {
    // Obtener el index del color actual
    const index = TEXT_BG_COLORS.indexOf(storyTextBgColor);

    if (index === -1) return;

    // Actualizar el index para obtener el siguiente color
    const nextIndex = index + 1 === TEXT_BG_COLORS.length ? 0 : index + 1;

    // Actualizar el color actual
    setStoryTextBgColor(TEXT_BG_COLORS[nextIndex]);
  }

  // Crear la historia
  const {createStory, isLoading} = useCreateStory({
    storyTextContent,
    selectedImageFiles,
    selectdBgColor,
    storyTextColor,
    storyTextBgColor,
    imageSize
  });

  return (
    <Dialog
      open={isOpen && publicationType === "story"}
      onOpenChange={isOpen => {
        if (isLoading) return;
        setOpen({open: false, publicationType: null});
      }}
    >
      <DialogOverlay className="bg-black/80 backdrop-blur-sm" />

      <DialogContent className="flex flex-col justify-start w-auto h-[95vh] p-0 aspect-[1/1.7] rounded-lg bg-transparent text-white border-none shadow-none [&>button]:hidden overflow-hidden">
        <DialogTitle className="sr-only">
          Crear historia
        </DialogTitle>

        <DialogHeader className="absolute top-0 left-0 w-full p-4 bg-linear-to-b from-black to-transparent z-10">
          <div className="relative w-full py-1">
            <DialogClose asChild>
              <Button
                className="absolute top-[50%] left-0 translate-y-[-50%] hover:bg-transparent cursor-pointer"
                variant="ghost"
                size="icon"
                disabled={isLoading}
              >
                <ArrowLeft className="size-6 shrink-0 text-white stroke-2" aria-hidden />
                <span className="sr-only">Cancelar</span>
              </Button>
            </DialogClose>

            <p className="w-full text-xl text-white text-center">
              Crear historia
            </p>
          </div>
        </DialogHeader>
          
        <div
          ref={containerRef}
          style={{
            backgroundColor: selectdBgColor.value,
            backgroundImage: selectedImagePreviews[0] ? `url(${selectedImagePreviews[0]})` : undefined,
            backgroundPosition: "center",
            backgroundSize: imageSize,
            backgroundRepeat: "no-repeat",
          }}
          className="relative flex justify-center items-center w-full h-full grow p-4 rounded-md overflow-hidden"
        >
          <Textarea
            ref={textareaRef}
            style={{ color: storyTextColor, backgroundColor: storyTextBgColor }}
            className="flex justify-center items-center w-[auto] max-h-full !text-2xl text-center leading-tight text-shadow-lg font-semibold resize-none bg-transparent shadow-none border-none focus:outline-none focus:border-none focus-visible:outline-none focus-visible:ring-0 placeholder:text-white scrollbar scrollbar-track-transparent scrollbar-thumb-transparent"
            placeholder="¿Qué estás pensando?"
            rows={1}
            disabled={isLoading}
            value={storyTextContent}
            onChange={onChangeHandler}
            onPaste={onPasteHandler}
          />
        </div>

        <div className="absolute left-0 bottom-0 flex flex-col gap-3 w-full p-4 bg-linear-to-t from-black to-transparent z-10">
          {selectedImageFiles[0] &&
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className="absolute top-0 left-4 -translate-y-[100%] p-2 rounded-full text-white bg-black/30 cursor-pointer z-10"
                  onClick={() => setImageSize(imageSize === "contain" ? "cover" : "contain")}
                >
                  {imageSize === "contain" &&
                    <Expand className="size-6 stroke-1" aria-hidden />
                  }

                  {imageSize === "cover" &&
                    <Minimize className="size-6 stroke-1" aria-hidden />
                  }

                  <span className="sr-only">
                    {imageSize === "contain" ? "Expandir imagen" : "Contraer imagen"}
                  </span>
                </button>
              </TooltipTrigger>

              <TooltipContent>
                <span>
                  {imageSize === "contain" ? "Expandir imagen" : "Contraer imagen"}
                </span>
              </TooltipContent>
            </Tooltip>
          }

          <div className="flex justify-between gap-4 w-full">
            <StoryColorPicker onSelect={(color) => setSelectedBgColor(color)} />

            <div className="flex items-center gap-1.5">
              <Tooltip>
                <TooltipTrigger>
                  <Button
                    className="flex justify-center items-center gap-1 w-8 h-8 rounded-full text-neutral-900 bg-white hover:bg-neutral-100 cursor-pointer"
                    size="icon"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Image className="size-5 text-neutral-600" aria-hidden />
                    <span className="sr-only">Seleccionar Imagen</span>
                  </Button>
                </TooltipTrigger>

                <TooltipContent>
                  <p>Seleccionar imagen</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger>
                  <Button
                    className="flex justify-center items-center gap-1 w-8 h-8 rounded-full text-neutral-900 bg-white hover:bg-neutral-100 cursor-pointer"
                    size="icon"
                    onClick={() => {
                    setStoryTextColor(storyTextColor === "#fff" ? "#000" : "#fff");
                    }}
                  >
                    <TypeOutline className="size-5 text-neutral-600" aria-hidden />
                    <span className="sr-only">Cambiar color del texto</span>
                  </Button>
                </TooltipTrigger>

                <TooltipContent>
                  <p>Cambiar color del texto</p>
                </TooltipContent>
              </Tooltip>

              <Button
                className="flex justify-center items-center gap-1 w-8 h-8 rounded-full text-neutral-900 bg-white hover:bg-neutral-100 cursor-pointer"
                size="icon"
                onClick={toggleTextBgColor}
              >
                <Palette className="size-5 text-neutral-600" aria-hidden />
                <span className="sr-only">Cambiar color del fondo del texto</span>
              </Button>
            </div>
          </div>

          <Button
            className="gap-1 text-base font-light bg-[#4F39F6] hover:bg-[#331fcf] transition-colors cursor-pointer"
            size="sm"
            disabled={isLoading}
            onClick={() => {
              if (!storyTextContent && !selectedImageFiles[0]) return;
              createStory();
            }}
          >
            <Plus className="size-6" aria-hidden />
            <span>Publicar historia</span>
          </Button>
        </div>


        {/* Input oculto del selector de imagen */}
        <input
          ref={fileInputRef}
          type="file"
          hidden
          multiple={false}
          disabled={isLoading}
          accept="image/png, image/jpg, image/jpeg, image/webp"
          onChange={onImagePickHandler}
        />
      </DialogContent>
    </Dialog>
  )
}

export default CreateStoryModal