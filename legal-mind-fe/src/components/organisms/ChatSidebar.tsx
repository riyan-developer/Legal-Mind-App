import { useMemo, useRef } from "react";
import { Plus, PanelLeftClose, PanelLeft, LogOut } from "lucide-react";
import { useAppStore } from "@/store/appStore";
import { Button } from "@/components/ui/button";
import { SectionLabel } from "@/components/atoms/SectionLabel";
import { SessionItem } from "@/components/molecules/SessionItem";
import { useInfiniteChats } from "@/hooks/useChatsInfinite";
import { useAuth } from "@/hooks/useAuth";

export const ChatSidebar = () => {
  const { canUpload, logout, user } = useAuth();
  const {
    activeSessionId,
    sidebarOpen,
    setSidebarOpen,
    setActiveSessionId,
  } = useAppStore();

  const fetchingRef = useRef(false);

  const {
    data,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteChats(50);

  const chats = useMemo(() => {
    const all = data?.pages.flatMap((page) => page.data) ?? [];
    return Array.from(new Map(all.map((chat) => [chat.id, chat])).values());
  }, [data]);

  const handleScroll = async (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;

    const distanceFromBottom =
      el.scrollHeight - el.scrollTop - el.clientHeight;

    const isNearBottom = distanceFromBottom < 120;

    if (!isNearBottom) return;
    if (!hasNextPage) return;
    if (isFetchingNextPage) return;
    if (fetchingRef.current) return;

    try {
      fetchingRef.current = true;
      await fetchNextPage();
    } finally {
      fetchingRef.current = false;
    }
  };

  if (!sidebarOpen) {
    return (
      <div className="flex flex-col items-center py-4 px-1 border-r border-border bg-background w-12 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSidebarOpen(true)}
          aria-label="Open sidebar"
        >
          <PanelLeft className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <aside
      className="w-[280px] shrink-0 border-r border-border bg-background flex flex-col h-full"
      aria-label="Chat sidebar"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h2 className="font-heading text-sm font-semibold tracking-wide text-foreground">
          LegalMind
        </h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close sidebar"
        >
          <PanelLeftClose className="h-4 w-4" />
        </Button>
      </div>

      <div className="px-3 py-3">
        {canUpload ? (
          <Button
            variant="outline"
            className="w-full justify-start gap-2 text-sm border-border"
            onClick={() => setActiveSessionId(null)}
          >
            <Plus className="h-4 w-4 text-primary" />
            <span className="font-heading">New Document Chat</span>
          </Button>
        ) : (
          <div className="rounded-xl border border-border bg-surface-elevated px-3 py-3 text-xs text-muted-foreground">
            Upload is available only for Admin and Partner roles.
          </div>
        )}
      </div>

      <nav
        className="flex-1 overflow-y-auto scrollbar-thin px-3 py-2"
        onScroll={handleScroll}
        aria-label="Document chats"
      >
        <SectionLabel>Documents</SectionLabel>

        <div className="space-y-0.5">
          {isLoading && (
            <p className="text-xs text-muted-foreground px-2 py-4 text-center">
              Loading documents...
            </p>
          )}

          {isError && (
            <p className="text-xs text-destructive px-2 py-4 text-center">
              {(error as Error)?.message || "Failed to load documents."}
            </p>
          )}

          {!isLoading &&
            !isError &&
            chats.map((chat) => (
              <SessionItem
                key={chat.id}
                title={chat.title}
                isActive={chat.id === activeSessionId}
                onClick={() => setActiveSessionId(chat.id)}
                chat={chat}
              />
            ))}

          {!isLoading && !isError && chats.length === 0 && (
            <p className="text-xs text-muted-foreground px-2 py-4 text-center">
              {canUpload
                ? "Upload a document to begin."
                : "No document chats available yet."}
            </p>
          )}

          {isFetchingNextPage && (
            <p className="text-xs text-muted-foreground px-2 py-3 text-center">
              Loading more...
            </p>
          )}

          {!hasNextPage && chats.length > 0 && (
            <p className="text-[11px] text-muted-foreground px-2 py-3 text-center">
              No more documents
            </p>
          )}
        </div>
      </nav>

      <div className="border-t border-border px-3 py-3 space-y-2">
        <div className="px-2">
          <p className="text-sm font-medium text-foreground truncate">
            {user?.full_name || user?.email || "Signed in"}
          </p>
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            {user?.role?.replaceAll("_", " ") || "member"}
          </p>
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start gap-2"
          onClick={() => {
            void logout();
          }}
        >
          <LogOut className="h-4 w-4" />
          <span>Logout</span>
        </Button>
      </div>
    </aside>
  );
}
