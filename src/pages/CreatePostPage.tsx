import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Image, X } from "lucide-react";
import { toast } from "sonner";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import useImagePicker from "@/hooks/useImagePicker";
import { dummyUserData } from "@/dummy-data";

const FormSchema = z.object({
  content: z
    .string()
    .max(2400, "El contenido no puede tener más de 2400 caracteres"),
});

type FormType = z.infer<typeof FormSchema>;

const CreatePostPage = () => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const formProps = useForm<FormType>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      content: "",
    }
  });

  const {selectedImageFile, selectedImagePreview, setSelectedImageFile, setSelectedImagePreview, onImagePickHandler} = useImagePicker({ fileInputRef });

  const onSubmitHandler = async (values: FormType) => {
    if (!values.content.trim() && !selectedImageFile) return;

    setIsSubmitting(true);

    setTimeout(() => {
      console.log({...values, selectedImageFile});

      setIsSubmitting(false);
      setSelectedImageFile(null);
      setSelectedImagePreview(null);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      formProps.reset();

      toast.success("Post creado con éxito.");
    }, 1200);
  }

  return (
    <main className="pageWrapper">
      <SidebarTrigger className="absolute block md:hidden top-4 left-4 cursor-pointer z-10" />
      
      <section className="flex flex-col gap-6 w-full h-full">
        <div className="shrink-0">
          <h1 className="text-2xl font-semibold">
            Crear Post
          </h1>

          <p className="text-sm text-neutral-700">
            Comparte lo que estás pensando
          </p>
        </div>

        <div className="w-full max-w-[600px] h-auto p-4 bg-white rounded-lg shadow">
          <div className="flex justify-start items-center gap-3 mb-6">
            <Avatar className="w-[60px] h-[60px] shrink-0">
              <AvatarImage
                src={dummyUserData.profile_picture}
                alt={dummyUserData.username}
              />

              <AvatarFallback>
                {dummyUserData.full_name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="flex flex-col w-full">
              <p className="font-semibold text-neutral-900">
                {dummyUserData.full_name}
              </p>

              <p className="text-sm text-neutral-700">
                @{dummyUserData.username}
              </p>
            </div>
          </div>

          <Form {...formProps}>
            <form
              className="flex flex-col gap-4 w-full"
              onSubmit={formProps.handleSubmit(onSubmitHandler)}
            >
              <div className="max-h-[420px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200">
                <FormField
                  control={formProps.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Textarea
                          className="border-b border-t-0 border-l-0 border-r-0 rounded-none shadow-none resize-none placeholder:text-neutral-400"
                          placeholder="¿Qué estás pensando?"
                          rows={4}
                          {...field}
                        />
                      </FormControl>

                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-between items-center w-full">
                <div className="flex justify-start items-center gap-3">
                  <Button
                    className="border-none cursor-pointer"
                    type="button"
                    size="icon"
                    variant="outline"
                    disabled={isSubmitting}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Image className="size-6 text-neutral-600" aria-hidden />
                    <span className="sr-only">Adjuntar imagen</span>
                  </Button>

                  {selectedImagePreview && selectedImageFile && (
                    <div className="relative">
                      <button
                        className="absolute top-0.5 right-0.5 flex justify-center items-center p-0.5 rounded-full cursor-pointer text-red-700 bg-red-50"
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => {
                          setSelectedImageFile(null);
                          setSelectedImagePreview(null);
                        }}
                      >
                        <X className="size-4" aria-hidden />
                        <span className="sr-only">Eliminar imagen</span>
                      </button>

                      <img
                        className="w-[50px] h-[50px] shrink-0 rounded-sm"
                        src={selectedImagePreview}
                        alt={selectedImageFile.name}
                      />
                    </div>
                  )}
                </div>

                <Button
                  className="gap-1 text-sm font-normal bg-[#4F39F6] hover:bg-[#331fcf] transition-colors cursor-pointer"
                  type="submit"
                  disabled={isSubmitting}
                >
                  Publicar Post
                </Button>
              </div>
            </form>
          </Form>

          {/* Input oculto del selector de imagen */}
          <input
            ref={fileInputRef}
            type="file"
            hidden
            multiple={false}
            disabled={isSubmitting}
            accept="image/png, image/jpg, image/jpeg, image/webp"
            onChange={onImagePickHandler}
          />
        </div>
      </section>
    </main>
  )
}

export default CreatePostPage