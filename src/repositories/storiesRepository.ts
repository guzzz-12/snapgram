import type { StoryType } from "@/types/global";
import { axiosInstance } from "@/utils/axiosInstance";

type CreateStoryProps = {
  storyTextContent: string;
  selectedImageFiles: File[];
  selectdBgColor: { name: string, value: string };
  storyTextColor: "#fff" | "#000";
  storyTextBgColor: "transparent" | "#fff" | "#000";
  imageSize: "cover" | "contain";
}

/** Función para crear una historia */
export const createStoryFn = async (props: CreateStoryProps) => {
  const {storyTextContent, selectedImageFiles, selectdBgColor, storyTextColor, storyTextBgColor, imageSize} = props;

  if (!storyTextContent && !selectedImageFiles[0]) return;

  const formData = new FormData();

  if (selectedImageFiles[0]) {
    formData.append("media", selectedImageFiles[0]);
  }

  formData.append("backgroundColor", selectdBgColor.value);
  formData.append("content", storyTextContent);
  formData.append("textColor", storyTextColor);
  formData.append("textBgColor", storyTextBgColor);
  formData.append("mediaType", selectedImageFiles[0] ? "image" : "text");
  imageSize && formData.append("imageSize", imageSize);
  
  const {data} = await axiosInstance<{data: StoryType}>({
    method: "POST",
    url: "/stories/create",
    data: formData,
    headers: {
      "Content-Type": "multipart/form-data"
    }
  });

  return data.data;
}