"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useState, useTransition } from "react";
import { CallMode, StudyGroupVisibility } from "@prisma/client";
import { MessageSquareMore, Mic, Plus, Search, Users, Video } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type UserSearchResult = {
  id: string;
  username: string;
  name: string;
  school: string | null;
  avatarUrl: string | null;
};

type GroupSummary = {
  id: string;
  name: string;
  topic: string;
  description: string | null;
  visibility: StudyGroupVisibility;
  members: {
    id: string;
    role: string;
    user: {
      id: string;
      username: string;
      name: string;
      avatarUrl: string | null;
    };
  }[];
  calls: {
    id: string;
    title: string;
    mode: CallMode;
    joinUrl: string;
  }[];
  messages: {
    id: string;
    content: string;
    author: {
      username: string;
      name: string;
    };
  }[];
};

type GroupDetail = {
  id: string;
  name: string;
  topic: string;
  description: string | null;
  visibility: StudyGroupVisibility;
  slug: string;
  owner: {
    id: string;
    username: string;
    name: string;
  };
  members: {
    id: string;
    role: string;
    user: {
      id: string;
      username: string;
      name: string;
      school: string | null;
      avatarUrl: string | null;
    };
  }[];
  messages: {
    id: string;
    content: string;
    createdAt: string;
    author: {
      id: string;
      username: string;
      name: string;
    };
  }[];
  calls: {
    id: string;
    title: string;
    roomName: string;
    joinUrl: string;
    mode: CallMode;
    createdAt: string;
  }[];
};

async function fetchUserMatches(query: string) {
  const response = await fetch(`/api/groups/users?q=${encodeURIComponent(query)}`);
  const payload = (await response.json()) as { users?: UserSearchResult[] };
  return payload.users ?? [];
}

export function GroupsStudio({
  currentUser,
  initialGroups,
  initialGroup,
}: {
  currentUser: {
    id: string;
    username: string;
    name: string;
  };
  initialGroups: GroupSummary[];
  initialGroup: GroupDetail | null;
}) {
  const router = useRouter();
  const [groups, setGroups] = useState(initialGroups);
  const [activeGroup, setActiveGroup] = useState<GroupDetail | null>(initialGroup);
  const [selectedGroupId, setSelectedGroupId] = useState(
    initialGroup?.id ?? initialGroups[0]?.id ?? "",
  );
  const [createForm, setCreateForm] = useState({
    name: "",
    topic: "",
    description: "",
    visibility: "private" as StudyGroupVisibility,
  });
  const [createMemberIds, setCreateMemberIds] = useState<string[]>([]);
  const [createSearch, setCreateSearch] = useState("");
  const [memberSearch, setMemberSearch] = useState("");
  const [createSearchResults, setCreateSearchResults] = useState<UserSearchResult[]>([]);
  const [memberSearchResults, setMemberSearchResults] = useState<UserSearchResult[]>([]);
  const [messageDraft, setMessageDraft] = useState("");
  const [isPending, startTransition] = useTransition();

  const deferredCreateSearch = useDeferredValue(createSearch);
  const deferredMemberSearch = useDeferredValue(memberSearch);

  useEffect(() => {
    const query = deferredCreateSearch.trim();

    if (query.length < 2) {
      return;
    }

    let cancelled = false;

    void (async () => {
      const users = await fetchUserMatches(query);
      if (!cancelled) {
        setCreateSearchResults(users);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [deferredCreateSearch]);

  useEffect(() => {
    const query = deferredMemberSearch.trim();

    if (query.length < 2) {
      return;
    }

    let cancelled = false;

    void (async () => {
      const users = await fetchUserMatches(query);
      if (!cancelled) {
        setMemberSearchResults(users);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [deferredMemberSearch]);

  async function refreshGroups(activeId?: string) {
    const response = await fetch("/api/groups");
    const payload = (await response.json()) as { groups?: { group: GroupSummary }[] };
    const nextGroups = (payload.groups ?? []).map((item) => item.group);
    setGroups(nextGroups);

    const nextId = activeId ?? selectedGroupId ?? nextGroups[0]?.id ?? "";

    if (nextId) {
      await loadGroup(nextId, nextGroups);
    }
  }

  async function loadGroup(groupId: string, sourceGroups = groups) {
    const response = await fetch(`/api/groups/${groupId}`);
    const payload = (await response.json()) as { group?: GroupDetail; error?: string };

    if (!response.ok || !payload.group) {
      toast.error(payload.error ?? "Unable to open that group.");
      return;
    }

    setSelectedGroupId(groupId);
    setActiveGroup(payload.group);

    if (!sourceGroups.some((group) => group.id === groupId)) {
      await refreshGroups(groupId);
    }
  }

  function toggleCreateMember(userId: string) {
    setCreateMemberIds((current) =>
      current.includes(userId)
        ? current.filter((id) => id !== userId)
        : [...current, userId],
    );
  }

  function createGroup() {
    if (!createForm.name.trim() || !createForm.topic.trim()) {
      toast.error("Add a group name and topic first.");
      return;
    }

    startTransition(async () => {
      const response = await fetch("/api/groups", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...createForm,
          memberUserIds: createMemberIds,
        }),
      });

      const payload = (await response.json()) as { group?: { id: string }; error?: string };

      if (!response.ok || !payload.group) {
        toast.error(payload.error ?? "Unable to create the group.");
        return;
      }

      setCreateForm({
        name: "",
        topic: "",
        description: "",
        visibility: "private",
      });
      setCreateMemberIds([]);
      setCreateSearch("");
      toast.success("Study group created.");
      await refreshGroups(payload.group.id);
    });
  }

  function addMember(userId: string) {
    if (!activeGroup) {
      return;
    }

    startTransition(async () => {
      const response = await fetch(`/api/groups/${activeGroup.id}/members`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          memberUserIds: [userId],
        }),
      });

      const payload = (await response.json()) as { group?: GroupDetail; error?: string };

      if (!response.ok || !payload.group) {
        toast.error(payload.error ?? "Unable to add member.");
        return;
      }

      setActiveGroup(payload.group);
      setMemberSearch("");
      toast.success("Member added.");
      await refreshGroups(activeGroup.id);
    });
  }

  function sendMessage() {
    if (!activeGroup || !messageDraft.trim()) {
      return;
    }

    startTransition(async () => {
      const response = await fetch(`/api/groups/${activeGroup.id}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: messageDraft,
        }),
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        toast.error(payload.error ?? "Unable to send message.");
        return;
      }

      setMessageDraft("");
      toast.success("Message sent.");
      await loadGroup(activeGroup.id);
      await refreshGroups(activeGroup.id);
    });
  }

  function startCall(mode: CallMode) {
    if (!activeGroup) {
      return;
    }

    startTransition(async () => {
      const response = await fetch(`/api/groups/${activeGroup.id}/calls`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ mode }),
      });

      const payload = (await response.json()) as { room?: { id: string }; error?: string };

      if (!response.ok || !payload.room) {
        toast.error(payload.error ?? "Unable to start the call room.");
        return;
      }

      toast.success(`${mode === "audio" ? "Audio" : "Video"} room ready.`);
      router.push(`/dashboard/groups/${activeGroup.id}/call?room=${payload.room.id}`);
      router.refresh();
    });
  }

  const visibleCreateResults =
    deferredCreateSearch.trim().length >= 2 ? createSearchResults : [];
  const visibleMemberResults =
    deferredMemberSearch.trim().length >= 2 ? memberSearchResults : [];

  return (
    <div className="space-y-6">
      <section className="panel p-6 md:p-8">
        <span className="eyebrow">Groups</span>
        <h1 className="mt-3 text-3xl font-semibold text-ink">Study together</h1>
        <p className="mt-3 max-w-3xl text-sm leading-8 text-ink-soft">
          Search usernames, build focused groups, chat, and launch audio or video rooms.
        </p>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-6">
          <div className="panel p-6">
            <div className="flex items-center gap-3">
              <Plus className="h-5 w-5 text-cyan-300" />
              <h2 className="text-2xl font-semibold text-ink">New group</h2>
            </div>

            <div className="mt-5 grid gap-4">
              <input
                className="field"
                placeholder="Group name"
                value={createForm.name}
                onChange={(event) =>
                  setCreateForm((current) => ({ ...current, name: event.target.value }))
                }
              />
              <input
                className="field"
                placeholder="Topic"
                value={createForm.topic}
                onChange={(event) =>
                  setCreateForm((current) => ({ ...current, topic: event.target.value }))
                }
              />
              <textarea
                className="textarea"
                placeholder="Short purpose"
                value={createForm.description}
                onChange={(event) =>
                  setCreateForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
              />
              <select
                className="select"
                value={createForm.visibility}
                onChange={(event) =>
                  setCreateForm((current) => ({
                    ...current,
                    visibility: event.target.value as StudyGroupVisibility,
                  }))
                }
              >
                <option value="private">Private</option>
                <option value="public_discoverable">Discoverable</option>
              </select>

              <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
                  <input
                    className="field pl-11"
                    placeholder="Search usernames"
                    value={createSearch}
                    onChange={(event) => setCreateSearch(event.target.value)}
                  />
                </div>
                <div className="mt-4 space-y-3">
                  {visibleCreateResults.map((user) => (
                    <button
                      key={user.id}
                      type="button"
                      className={`flex w-full items-center justify-between rounded-[20px] border px-4 py-3 text-left transition ${
                        createMemberIds.includes(user.id)
                          ? "border-cyan-300/30 bg-cyan-300/10"
                          : "border-white/10 bg-white/4"
                      }`}
                      onClick={() => toggleCreateMember(user.id)}
                    >
                      <div>
                        <p className="font-semibold text-ink">@{user.username}</p>
                        <p className="text-sm text-ink-soft">
                          {user.name}
                          {user.school ? ` · ${user.school}` : ""}
                        </p>
                      </div>
                      <span className="text-xs uppercase tracking-[0.16em] text-cyan-200">
                        {createMemberIds.includes(user.id) ? "picked" : "pick"}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                className="button-primary"
                disabled={isPending}
                onClick={createGroup}
              >
                Create group
              </button>
            </div>
          </div>

          <div className="panel p-6">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-lime-300" />
              <h2 className="text-2xl font-semibold text-ink">My groups</h2>
            </div>
            <div className="mt-5 space-y-3">
              {groups.map((group) => (
                <button
                  key={group.id}
                  type="button"
                  className={`w-full rounded-[22px] border px-4 py-4 text-left transition ${
                    selectedGroupId === group.id
                      ? "border-cyan-300/30 bg-cyan-300/10"
                      : "border-white/10 bg-white/4"
                  }`}
                  onClick={() => loadGroup(group.id)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-ink">{group.name}</p>
                      <p className="mt-1 text-sm text-ink-soft">{group.topic}</p>
                    </div>
                    <span className="badge bg-white/6 text-ink-soft">{group.members.length}</span>
                  </div>
                  {group.messages[0] ? (
                    <p className="mt-3 text-sm leading-7 text-ink-soft">
                      @{group.messages[0].author.username}: {group.messages[0].content}
                    </p>
                  ) : null}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {activeGroup ? (
            <>
              <div className="panel p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap gap-2">
                      <span className="badge bg-cyan-300/10 text-cyan-200">
                        {activeGroup.topic}
                      </span>
                      <span className="badge bg-lime-300/10 text-lime-200">
                        {activeGroup.visibility === "private" ? "private" : "discoverable"}
                      </span>
                    </div>
                    <h2 className="mt-4 text-3xl font-semibold text-ink">{activeGroup.name}</h2>
                    <p className="mt-3 max-w-3xl text-sm leading-8 text-ink-soft">
                      {activeGroup.description ?? "Focused study space for shared revision."}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      className="button-secondary"
                      onClick={() => startCall("audio")}
                    >
                      <Mic className="h-4 w-4 text-cyan-300" />
                      Audio room
                    </button>
                    <button
                      type="button"
                      className="button-primary"
                      onClick={() => startCall("video")}
                    >
                      <Video className="h-4 w-4" />
                      Video room
                    </button>
                    {activeGroup.calls[0] ? (
                      <Link
                        href={`/dashboard/groups/${activeGroup.id}/call?room=${activeGroup.calls[0].id}`}
                        className="button-secondary"
                      >
                        Join latest
                      </Link>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="grid gap-6 xl:grid-cols-[0.88fr_1.12fr]">
                <div className="space-y-6">
                  <div className="panel p-6">
                    <h3 className="text-2xl font-semibold text-ink">Members</h3>
                    <div className="mt-4 space-y-3">
                      {activeGroup.members.map((member) => (
                        <div
                          key={member.id}
                          className="rounded-[22px] border border-white/10 bg-white/5 px-4 py-3"
                        >
                          <p className="font-semibold text-ink">@{member.user.username}</p>
                          <p className="text-sm text-ink-soft">
                            {member.user.name}
                            {member.user.school ? ` · ${member.user.school}` : ""}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="panel p-6">
                    <h3 className="text-2xl font-semibold text-ink">Add members</h3>
                    <div className="relative mt-4">
                      <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
                      <input
                        className="field pl-11"
                        placeholder="Search usernames"
                        value={memberSearch}
                        onChange={(event) => setMemberSearch(event.target.value)}
                      />
                    </div>
                    <div className="mt-4 space-y-3">
                      {visibleMemberResults
                        .filter(
                          (user) =>
                            !activeGroup.members.some((member) => member.user.id === user.id),
                        )
                        .map((user) => (
                          <div
                            key={user.id}
                            className="flex items-center justify-between rounded-[20px] border border-white/10 bg-white/4 px-4 py-3"
                          >
                            <div>
                              <p className="font-semibold text-ink">@{user.username}</p>
                              <p className="text-sm text-ink-soft">
                                {user.name}
                                {user.school ? ` · ${user.school}` : ""}
                              </p>
                            </div>
                            <button
                              type="button"
                              className="button-secondary"
                              disabled={isPending}
                              onClick={() => addMember(user.id)}
                            >
                              Add
                            </button>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>

                <div className="panel p-6">
                  <div className="flex items-center gap-3">
                    <MessageSquareMore className="h-5 w-5 text-cyan-300" />
                    <h3 className="text-2xl font-semibold text-ink">Discussion</h3>
                  </div>

                  <div className="mt-5 space-y-4">
                    <textarea
                      className="textarea"
                      placeholder="Share a question, derivation step, or exam tip."
                      value={messageDraft}
                      onChange={(event) => setMessageDraft(event.target.value)}
                    />
                    <button
                      type="button"
                      className="button-primary"
                      disabled={isPending}
                      onClick={sendMessage}
                    >
                      Send
                    </button>
                  </div>

                  <div className="mt-6 space-y-4">
                    {activeGroup.messages.map((message) => (
                      <article
                        key={message.id}
                        className={`rounded-[24px] border px-4 py-4 ${
                          message.author.id === currentUser.id
                            ? "border-cyan-300/20 bg-cyan-300/8"
                            : "border-white/10 bg-white/5"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-4">
                          <p className="font-semibold text-ink">@{message.author.username}</p>
                          <span className="text-xs uppercase tracking-[0.16em] text-ink-soft">
                            {new Date(message.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-ink-soft">
                          {message.content}
                        </p>
                      </article>
                    ))}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="panel p-8">
              <p className="text-lg font-semibold text-ink">No group selected yet.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
