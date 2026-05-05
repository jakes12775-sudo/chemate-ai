import { GroupsStudio } from "@/components/chemate/groups-studio";
import { requirePageSession } from "@/lib/auth/session";
import { getGroupDetailForUser, listGroupsForUser } from "@/lib/chemate/service";

export const dynamic = "force-dynamic";

export default async function GroupsPage() {
  const session = await requirePageSession(["student", "mentor", "super_admin", "cashier"]);
  const memberships = await listGroupsForUser(session.user.id);
  const firstGroupId = memberships[0]?.group.id;
  const initialGroup = firstGroupId
    ? await getGroupDetailForUser(session.user.id, firstGroupId)
    : null;

  return (
    <GroupsStudio
      currentUser={{
        id: session.user.id,
        username: session.user.username,
        name: session.user.name,
      }}
      initialGroups={memberships.map((membership) => ({
        id: membership.group.id,
        name: membership.group.name,
        topic: membership.group.topic,
        description: membership.group.description,
        visibility: membership.group.visibility,
        members: membership.group.members.map((member) => ({
          id: member.id,
          role: member.role,
          user: member.user,
        })),
        calls: membership.group.calls.map((call) => ({
          id: call.id,
          title: call.title,
          mode: call.mode,
          joinUrl: call.joinUrl,
        })),
        messages: membership.group.messages.map((message) => ({
          id: message.id,
          content: message.content,
          author: message.author,
        })),
      }))}
      initialGroup={
        initialGroup
          ? {
              id: initialGroup.id,
              name: initialGroup.name,
              topic: initialGroup.topic,
              description: initialGroup.description,
              visibility: initialGroup.visibility,
              slug: initialGroup.slug,
              owner: initialGroup.owner,
              members: initialGroup.members.map((member) => ({
                id: member.id,
                role: member.role,
                user: member.user,
              })),
              messages: initialGroup.messages.map((message) => ({
                id: message.id,
                content: message.content,
                createdAt: message.createdAt.toISOString(),
                author: message.author,
              })),
              calls: initialGroup.calls.map((call) => ({
                id: call.id,
                title: call.title,
                roomName: call.roomName,
                joinUrl: call.joinUrl,
                mode: call.mode,
                createdAt: call.createdAt.toISOString(),
              })),
            }
          : null
      }
    />
  );
}
