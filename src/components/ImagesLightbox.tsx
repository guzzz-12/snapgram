import Lightbox from "yet-another-react-lightbox";
import { useImagesLighbox } from "@/hooks/useImagesLightbox";

const ImagesLightbox = () => {
  const {images, initialIndex, open, setOpen, setImages, setInitialIndex} = useImagesLighbox();

  const slides = images.map(src => ({src}));

  const onCloseHandler = () => {
    setOpen(false);
    setImages([]);
    setInitialIndex(0);
  }

  return (
    <Lightbox
      open={open}
      close={onCloseHandler}
      index={initialIndex}
      slides={slides}
      carousel={{finite: true}}
    />
  )
}

export default ImagesLightbox