import { useMemo } from "react";
import { Scale } from "lucide-react";
import { useAppStore } from "@/store/appStore";
import { ChatSidebar, ChatMessageList, ChatComposer, SourcePanel } from "@/components/organisms";
import type { AttachedFile } from "@/components/organisms/ChatComposer";
import { useAddChatMessage } from "@/hooks/useAddChatMessage";
import { useAuth } from "@/hooks/useAuth";
import { useChatMessages, useInfiniteChats } from "@/hooks/useChatsInfinite";
import { useChatRealtime } from "@/hooks/useChatRealtime";

interface ChatLayoutProps {
  onUploadDocument: (file: AttachedFile) => void;
}

export const ChatLayout = ({ onUploadDocument }: ChatLayoutProps) => {
  const { canUpload } = useAuth();
  const { activeSessionId } = useAppStore();
  const { mutate: sendMessage, isPending } = useAddChatMessage();
  const { data: chatsData } = useInfiniteChats(50);
  const { data: chatMessages, isLoading } = useChatMessages(activeSessionId || "");

  const chats = useMemo(
    () => chatsData?.pages.flatMap((page) => page.data) ?? [],
    [chatsData]
  );
  const chatIds = useMemo(() => chats.map((chat) => chat.id), [chats]);

  useChatRealtime(chatIds);

  const activeChat = useMemo(
    () => chats.find((chat) => chat.id === activeSessionId) ?? null,
    [activeSessionId, chats]
  );

  const messages = chatMessages?.messages ?? [];
  const documentInfo = activeChat?.document ?? chatMessages?.chat?.document ?? null;
  const isDocReady = documentInfo?.status === "indexed";
  const hasStreamingMessage = messages.some((message) => message.isStreaming);
  const showUploadComposer = !activeSessionId && canUpload;
  const showNoUploadAccessState = !activeSessionId && !canUpload;

  const onSendMessage = (message: string) => {
    if (!activeSessionId) {
      return;
    }

    sendMessage({ chat_id: activeSessionId, role: "user", content: message });
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <ChatSidebar />

      <main className="flex-1 flex flex-col min-w-0 h-full">
        <header className="flex items-center justify-between px-6 py-3 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <Scale className="h-4 w-4 text-primary" />
            <h1 className="font-heading text-sm font-semibold">
              {activeChat?.title || "LegalMind"}
            </h1>
          </div>
          {isPending ? (
            <span className="text-xs text-muted-foreground font-body" role="status" aria-live="polite">
              Sending your message...
            </span>
          ) : hasStreamingMessage ? (
            <span className="text-xs text-muted-foreground font-body" role="status" aria-live="polite">
              AI is typing...
            </span>
          ) : null}
        </header>

        <ChatMessageList
          messages={messages}
          documentInfo={documentInfo}
          hasActiveSession={Boolean(activeSessionId)}
          isLoading={isLoading}
        />

        {showNoUploadAccessState ? (
          <div className="border-t border-border bg-background px-4 py-4">
            <div className="max-w-[800px] mx-auto text-center text-sm text-muted-foreground">
              Select an existing document chat from the sidebar. Upload is restricted to Admin
              and Partner roles.
            </div>
          </div>
        ) : (
          <ChatComposer
            onSend={(message, files) => {
              if (files?.[0]) {
                onUploadDocument(files[0]);
                return;
              }

              onSendMessage(message);
            }}
            uploadOnly={showUploadComposer}
            disabled={Boolean(activeSessionId) && (!isDocReady || hasStreamingMessage)}
            placeholder={
              isDocReady
                ? "Ask a question about this document..."
                : "Wait for the document to finish indexing before asking a question..."
            }
          />
        )}
      </main>

      <SourcePanel />
    </div>
  );
}
