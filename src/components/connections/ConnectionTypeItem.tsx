interface Props {
  count: number;
  title: string;
}

const ConnectionTypeItem = ({count, title}: Props) => {
  return (
    <li className="flex flex-col gap-0 items-center w-full shrink-0 p-4 text-center bg-white border rounded-md shadow">
      <span className="text-base font-semibold">
        {count}
      </span>

      <p className="text-sm text-neutral-700">
        {title}
      </p>
    </li>
  )
}

export default ConnectionTypeItem