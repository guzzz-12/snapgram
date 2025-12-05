import type { Settings } from "react-slick";
import type { NotificationType } from "@/types/global";

/** Configuración del slider de imágenes de los posts */
export const SLIDER_SETTINGS: Settings = {
  dots: true,
  infinite: false,
  speed: 500,
  slidesToShow: 1,
  slidesToScroll: 1,
};

/** Mapa del texto de las notificaciones según el tipo de notificación */
export const NOTIFICATIONS_TEXT_MAP: Record<NotificationType["notificationType"], string> = {
  "comment": "comentó tu publicación.",
  "follow": "te comenzó a seguir.",
  "like": "le gustó tu publicación.",
  "reply": "respondió a tu comentario en una publicación.",
  "postShared": "compartió tu publicación."
}

export const ACCOUNT_STATUS = {
  isBlocked: "is_blocked",
  accountDisabled: "account_disabled"
}