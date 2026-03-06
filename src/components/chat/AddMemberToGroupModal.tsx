import { useEffect, useRef, useState } from "react";
import { FaRegCheckCircle } from "react-icons/fa";
import { FiSearch } from "react-icons/fi";
import { SearchX } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { useChatsService } from "@/services/chatsService";
import useIntersectionObserver from "@/hooks/useIntersectionObserver";
import { useDebounce } from "@/hooks/useDebounce";
import { errorMessage } from "@/utils/errorMessage";
import type { ChatType } from "@/types/global";
import { cn } from "@/lib/utils";

interface Props {
  isOpen: boolean;
  chatData: ChatType | null | undefined;
  setIsOpen: (open: boolean) => void;
}

const AddMemberToGroupModal = ({ isOpen, chatData, setIsOpen }: Props) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const paginationRef = useRef<HTMLDivElement>(null);

  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const {debouncedValue} = useDebounce(searchTerm);

  const {getUsersToChat, addMemberToGroup} = useChatsService();

  const {
    usersData,
    usersError,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage
  } = getUsersToChat({ isOpen, keyword: debouncedValue });

  // Hacer focus en el input cuando se abra el modal
  // Limpiar el state cuando se cierre el modal
  useEffect(() => {
    inputRef.current?.focus();

    return () => {
      setSelectedUserId(null);
      setSearchTerm("");
    }
  }, [isOpen]);

  // Mutation para agregar el usuario al grupo
  const {mutate, isPending} = addMemberToGroup({chatId: chatData?._id, selectedUserId, setIsOpen});

  const {isIntersecting} = useIntersectionObserver({ data: usersData, paginationRef });

  // Cargar la siguiente pagina de usuarios
  useEffect(() => {
    if (isIntersecting) {
      fetchNextPage();
    }
  }, [isIntersecting]);

  if (usersError) {
    toast.error(errorMessage(usersError));
  }

  const isButtonDisabled = !selectedUserId || isPending;
  const groupMembers = chatData?.participants.map((user) => user._id) || [];

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if(isPending) return;
        setIsOpen(open);
      }}
    >
      <DialogContent className="py-4">
        <DialogHeader className="pb-4 border-b overflow-hidden">
          <DialogTitle className="w-full max-w-[90%] mx-auto text-center truncate">
            Agregar miembro a {chatData?.groupName}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-2 shrink-0">
          <Label
            htmlFor="name"
            className="text-sm text-neutral-900"
          >
            Buscar amigos
          </Label>
          
          <div className="relative">
            <FiSearch className="absolute left-2 top-1/2 size-5 text-neutral-500 translate-y-[-50%]" />

            <Input
              ref={inputRef}
              id="name"
              className="pl-9"
              type="search"
              placeholder="Busca por nombre o usuario..."
              disabled={false}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-col">
          <ul className="flex flex-col gap-2 w-full max-h-[450px] grow overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200">
          
            {/* Indicador de loading */}
            {isLoading &&
              Array(2).fill(0).map((_, i) => {
                return (
                  <li key={i} className="w-full">
                    <Skeleton className="flex justify-start items-center gap-3 w-full p-2 bg-neutral-300">
                      <Skeleton className="w-[40px] h-[40px] shrink-0 rounded-full bg-neutral-100" />
                      <div className="flex flex-col justify-center items-start gap-2 w-full">
                        <Skeleton className="w-[80%] h-4 rounded bg-neutral-100" />
                        <Skeleton className="w-1/3 h-3 rounded bg-neutral-100" />
                      </div>
                    </Skeleton>
                  </li>
                )
              })
            }

            {!isLoading && debouncedValue && usersData.length === 0 &&
              <li className="flex justify-center items-center gap-1 w-full">
                <SearchX className="size-6 text-neutral-600 shrink-0 stroke-1" />
                <p className="text-sm text-neutral-600">
                  No se encontraron resultados
                </p>
              </li>
            }

            <RadioGroup
              value={selectedUserId}
              onValueChange={(value) => setSelectedUserId(value)}
            >
              {!isLoading && chatData && usersData.map((user) => {
                const isAlreadyMember = groupMembers.includes(user._id);

                return (
                  <li key={user._id} className="w-full">
                    <Label
                      id={user._id}
                      className={cn("flex justify-start items-center gap-4 p-2 rounded-md bg-transparent hover:bg-[#4F39F6]/10 cursor-pointer", isAlreadyMember && "cursor-default bg-neutral-100")}
                    >
                      <div className="flex justify-start items-center gap-2 w-full">
                        <Avatar className="w-[45px] h-[45px] shrink-0">
                          <AvatarImage
                            className="w-full h-full object-cover"
                            src={user.profilePicture || "/default_avatar.webp"}
                          />

                          <AvatarFallback className="w-full h-full object-cover">
                            {user.fullName.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>

                        <div className="flex flex-col justify-center items-start gap-1 w-full">
                          <p className="font-semibold text-neutral-900">{user.fullName}</p>
                          <p className="text-xs text-neutral-600">@{user.username}</p>
                        </div>

                        {isAlreadyMember && (
                          <div className="flex justify-start items-center gap-1">
                            <FaRegCheckCircle className="size-4 text-[#4F39F6]" />
                            <p className="text-xs text-center text-neutral-600 whitespace-nowrap">
                              Ya es miembro
                            </p>
                          </div>
                        )}
                      </div>

                      {!isAlreadyMember &&
                        <RadioGroupItem
                          id={user._id}
                          className="size-6.5 start-0 rounded-full border-neutral-300 cursor-pointer data-[state=checked]:border-[#4F39F6] data-[state=checked]:bg-[#4F39F6] data-[state=checked]:text-white"
                          value={user._id}
                        />
                      }
                    </Label>
                  </li>
                )
              })}
            </RadioGroup>

            {hasNextPage && !isFetchingNextPage &&
              <div ref={paginationRef} className="w-full h-10" />
            }
          </ul>

          <div className="flex justify-end items-center gap-2 w-full pt-4 pb-3 start-0 border-t">
            <Button
              className="cursor-pointer"
              variant="ghost"
              onClick={() => setIsOpen(false)}
            >
              Cancelar
            </Button>

            <Button
              className="wtext-sm text-white bg-[#4F39F6] hover:bg-[#331fcf] cursor-pointer"
              variant="default"
              disabled={isButtonDisabled}
              onClick={() => mutate()}
            >
              Agregar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default AddMemberToGroupModal