import { UserRoundCheck, UserRoundPlus, UsersRound } from "lucide-react";
import ConnectionCard from "./ConnectionCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { dummyConnectionsData, dummyFollowersData, dummyFollowingData, dummyPendingConnectionsData } from "@/dummy-data";

const ConnectionsTabs = () => {
  return (
    <Tabs
      className="w-full"
      defaultValue="followers"
    >
      <TabsList className="gap-3 p-1 rounded-sm border bg-white shadow">
        <TabsTrigger
          className="text-neutral-500 data-[state=active]:text-neutral-900 data-[state=active]:shadow-none cursor-pointer"
          value="followers"
        >
          <UsersRound />
          <span>Seguidores</span>
        </TabsTrigger>

        <TabsTrigger 
          className="text-neutral-500 data-[state=active]:text-neutral-900 data-[state=active]:shadow-none cursor-pointer"
          value="following"
        >
          <UserRoundCheck />
          <span>Siguiendo</span>
        </TabsTrigger>

        <TabsTrigger 
          className="text-neutral-500 data-[state=active]:text-neutral-900 data-[state=active]:shadow-none cursor-pointer"
          value="pending"
        >
          <UserRoundPlus />
          <span>Pendientes</span>
        </TabsTrigger>

        <TabsTrigger 
          className="text-neutral-500 data-[state=active]:text-neutral-900 data-[state=active]:shadow-none cursor-pointer"
          value="connections"
        >
          <UsersRound />
          <span>Conexiones</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="followers">
        <div className="grid grid-cols-1 min-[1000px]:grid-cols-2 gap-2 w-full">
          {dummyFollowersData.map(follower => {
            return (
              <ConnectionCard
                key={follower._id}
                connectionData={follower}
                connection="follower"
              />
            )
          })}
        </div>
      </TabsContent>

      <TabsContent value="following">
        <div className="grid grid-cols-1 min-[1000px]:grid-cols-2 gap-2 w-full">
          {dummyFollowingData.map(following => {
            return (
              <ConnectionCard
                key={following._id}
                connectionData={following}
                connection="following"
              />
            )
          })}
        </div>
      </TabsContent>

      <TabsContent value="pending">
        <div className="grid grid-cols-1 min-[1000px]:grid-cols-2 gap-2 w-full">
          {dummyPendingConnectionsData.map(pending => {
            return (
              <ConnectionCard
                key={pending._id}
                connectionData={pending}
                connection="pending"
              />
            )
          })}
        </div>
      </TabsContent>

      <TabsContent value="connections">
        <div className="grid grid-cols-1 min-[1000px]:grid-cols-2 gap-2 w-full">
          {dummyConnectionsData.map(connection => {
            return (
              <ConnectionCard
                key={connection._id}
                connectionData={connection}
                connection="connection"
              />
            )
          })}
        </div>
      </TabsContent>
    </Tabs>
  )
}

export default ConnectionsTabs