import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Image, Palette, Plus, TypeOutline } from "lucide-react";
import StoryColorPicker, { COLORS } from "./StoryColorPicker";
import { Button } from "../ui/button";
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogOverlay } from "../ui/dialog";
import { Textarea } from "../ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import useImagePicker from "@/hooks/useImagePicker";
import { dummyStoriesData, dummyUserData, type StoryType } from "@/dummy-data";

const TEXT_BG_COLORS: ("transparent" | "#fff" | "#000")[] = ["transparent", "#fff", "#000"];

interface Props {
  isOpen: boolean;
  onClose: (isOpen: boolean) => void;
}

const CreateStoryModal = ({ isOpen, onClose }: Props) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [storyTextContent, setStoryTextContent] = useState("");
  const [storyTextColor, setStoryTextColor] = useState<"#fff" | "#000">("#fff");
  const [storyTextBgColor, setStoryTextBgColor] = useState<"transparent" | "#fff" | "#000">(TEXT_BG_COLORS[0]);
  const [selectdBgColor, setSelectedBgColor] = useState<{ name: string, value: string }>( COLORS[0] );
  const [isLoading, setIsLoading] = useState(false);

  const { selectedImageFile, selectedImagePreview, setSelectedImageFile, setSelectedImagePreview, onImagePickHandler} = useImagePicker({fileInputRef});

  useEffect(() => {
    return () => {
      if (!isOpen) {
        setStoryTextContent("");
        setSelectedImageFile(null);
        setSelectedImagePreview(null);
        setSelectedBgColor(COLORS[0]);
        setStoryTextBgColor(TEXT_BG_COLORS[0]);
  
        if(fileInputRef.current) {
          fileInputRef.current.value = ""
        };
      }
    }
  }, [isOpen]);

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

  const onSubmitHandler = () => {
    if (!storyTextContent && !selectedImageFile) return;

    setIsLoading(true);

    setTimeout(() => {
      const newStory: StoryType = {
        _id: Date.now().toString(),
        background_color: selectdBgColor.value,
        content: storyTextContent,
        text_color: storyTextColor,
        text_bg_color: storyTextBgColor,
        createdAt: new Date().toString(),
        media_type: selectedImageFile ? "image" : "text",
        media_url: selectedImagePreview || "",
        updatedAt: new Date().toString(),
        user: dummyUserData
      }

      dummyStoriesData.unshift(newStory);

      setIsLoading(false);
      onClose(false);
    }, 2500);
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={isOpen => {
        if (isLoading) return;
        onClose(isOpen);
      }}
    >
      <DialogOverlay className="bg-black opacity-70" />

      <DialogContent className="w-full bg-transparent text-white border-none shadow-none [&>button]:hidden overflow-hidden">
        <DialogHeader>
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
          
          <div
            style={{
              backgroundColor: selectdBgColor.value,
              backgroundImage: selectedImagePreview ? `url(${selectedImagePreview})` : undefined,
              backgroundPosition: "center",
              backgroundSize: "cover",
              backgroundRepeat: "no-repeat",
            }}
            className="flex justify-center items-center w-full p-4 aspect-[4/3] rounded-md"
          >
            <Textarea
              style={{ color: storyTextColor, backgroundColor: storyTextBgColor }}
              className="flex justify-center items-center w-fit max-h-[50vh] !text-2xl text-center leading-tight text-shadow-lg font-semibold resize-none bg-transparent shadow-none border-none focus:outline-none focus:border-none focus-visible:outline-none focus-visible:ring-0 placeholder:text-white overflow-y-auto scrollbar-none"
              placeholder="¿Qué estás pensando?"
              rows={1}
              disabled={isLoading}
              value={storyTextContent}
              onChange={(e) => setStoryTextContent(e.target.value)}
            />
          </div>

          <div className="flex justify-between gap-4 w-full">
            <div className="flex justify-start items-center gap-1.5">
              <StoryColorPicker onSelect={(color) => setSelectedBgColor(color)} />
            </div>

            <div className="flex items-center gap-1.5">
              <Tooltip>
                <TooltipTrigger>
                  <Button
                    className="flex justify-center items-center gap-1 w-10 h-10 rounded-full text-neutral-900 bg-white hover:bg-neutral-100 cursor-pointer"
                    size="icon"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Image className="size-6 text-neutral-600" aria-hidden />
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
                    className="flex justify-center items-center gap-1 w-10 h-10 rounded-full text-neutral-900 bg-white hover:bg-neutral-100 cursor-pointer"
                    size="icon"
                    onClick={() => {
                      setStoryTextColor(storyTextColor === "#fff" ? "#000" : "#fff");
                    }}
                  >
                    <TypeOutline className="size-6 text-neutral-600" aria-hidden />
                    <span className="sr-only">Cambiar color del texto</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Cambiar color del texto</p>
                </TooltipContent>
              </Tooltip>

              <Button
                className="flex justify-center items-center gap-1 w-10 h-10 rounded-full text-neutral-900 bg-white hover:bg-neutral-100 cursor-pointer"
                size="icon"
                onClick={toggleTextBgColor}
              >
                <Palette className="size-6 text-neutral-600" aria-hidden />
                <span className="sr-only">Cambiar color del fondo del texto</span>
              </Button>
            </div>
          </div>

          <Button
            className="gap-1 text-base font-normal bg-[#4F39F6] hover:bg-[#331fcf] transition-colors cursor-pointer"
            disabled={isLoading}
            onClick={onSubmitHandler}
          >
            <Plus className="size-6" aria-hidden />
            <span>Publicar historia</span>
          </Button>
        </DialogHeader>

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