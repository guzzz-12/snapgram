export const COLORS = [
  {
    name: "Azul marino",
    value: "#165DFC"
  },
  {
    name: "Negro",
    value: "#000000",
  },
  {
    name: "Gris",
    value: "#314258"
  },
  {
    name: "Naranja",
    value: "#FF4B4B"
  },
  {
    name: "Amarillo",
    value: "#FD9A00"
  },
  {
    name: "Morado",
    value: "#3A0CA3"
  },
];

interface Props {
  onSelect: (color: { name: string, value: string }) => void;
}

const StoryColorPicker = ({ onSelect }: Props) => {
  return (
    <div className="flex justify-start items-center gap-1.5">
      {COLORS.map((color) => (
        <button
          style={{ backgroundColor: color.value }}
          className="w-5 h-5 rounded-full border-2 border-neutral-200 cursor-pointer"
          onClick={() => onSelect(color)}
        >
          <span className="sr-only">
            Seleccionar color {color.name}
          </span>
        </button>
      ))}
    </div>
  );
}

export default StoryColorPicker