import { useRef, useEffect, type ReactNode } from "react";
import type { Message } from "../../types";
import { cn } from "../../lib/utils";
import { TextMessage } from "./TextMessage";
import { ImageMessage } from "./ImageMessage";
import { ChartMessage } from "./ChartMessage";
import { EditDialogMessage } from "./EditDialogMessage";

interface MessageListProps {
  messages: Message[];
  onAction?: (action: string, message: Message) => void;
  userAvatar?: string;
  onUserAvatarClick?: () => void;
  focusCard?: ReactNode;
}

export function MessageList({ messages, onAction, userAvatar, onUserAvatarClick, focusCard }: MessageListProps) {

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Find if there's a focus_response message (indicates Focus mode is active)
  const hasFocusResponse = messages.some(msg => msg.id === 'focus_response');

  return (
    <div 
      className="flex-1 overflow-y-auto bg-[#ededed] p-4 space-y-4"
      ref={scrollRef}
    >
      {messages.map((msg, index) => (
        <div key={msg.id}>
          {/* Render the message */}
          <div
            className={cn(
              "flex w-full",
              msg.sender === "user" ? "justify-end" : "justify-start"
            )}
          >
            {/* Avatar */}
            {msg.sender === "system" && msg.type !== "edit_dialog" && (
              <img src={`${import.meta.env.BASE_URL}icon.png`} alt="AI" className="w-10 h-10 rounded-md mr-2 flex-shrink-0 object-contain bg-white" />
            )}

            {msg.type === "text" && <TextMessage message={msg} />}
            {msg.type === "voice" && <TextMessage message={msg} />}
            {msg.type === "file" && <TextMessage message={msg} />}
            {msg.type === "image" && <ImageMessage message={msg} />}
            {msg.type === "chart" && <ChartMessage message={msg} />}
            {msg.type === "edit_dialog" && (
              <EditDialogMessage 
                message={msg} 
                onAction={(action) => onAction?.(action, msg)} 
              />
            )}
            
            {msg.sender === "user" && (
              <div 
                className="w-10 h-10 bg-gray-400 rounded-md ml-2 flex-shrink-0 overflow-hidden cursor-pointer active:opacity-80 transition-opacity"
                onClick={onUserAvatarClick}
              >
                {userAvatar ? (
                  <img src={userAvatar} alt="User" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gray-400" />
                )}
              </div>
            )}
          </div>

          {/* Insert Focus Card after the user's trigger message (message before focus_response) */}
          {focusCard && hasFocusResponse && messages[index + 1]?.id === 'focus_response' && (
            <div className="my-4">
              {focusCard}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
