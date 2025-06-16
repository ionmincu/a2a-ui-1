import React from "react";
import { ChatMessage } from "@/types/chat";
import { ArtifactDisplay } from "./ArtifactDisplay";
import { PartsDisplay } from "./PartsDisplay";

interface ChatMessageBubbleProps {
    message: ChatMessage;
}

export const ChatMessageBubble: React.FC<ChatMessageBubbleProps> = ({ message }) => {
    return (
        <div
            className={`mb-4 ${
                message.sender === "user" ? "flex flex-col items-end" : "flex flex-col items-start"
            }`}
        >
            {/* Sender name */}
            <div className={`text-xs text-muted-foreground mb-1 px-2 ${
                message.sender === "user" ? "text-right" : "text-left"
            }`}>
                {message.senderName}
            </div>
            
            <div className="max-w-[70%] space-y-2">
                {/* Message bubble */}
                {message.content && (
                    <div className={`relative px-4 py-3 rounded-2xl text-sm whitespace-pre-wrap break-words ${
                        message.sender === "user"
                            ? "bg-primary text-primary-foreground rounded-br-md"
                            : "bg-muted text-foreground rounded-bl-md"
                    }`}>
                        {message.content}
                        
                        {/* Timestamp */}
                        <div className={`text-xs mt-1 ${
                            message.sender === "user" ? "text-primary-foreground/70" : "text-muted-foreground"
                        }`}>
                            {message.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </div>
                    </div>
                )}

                {/* Artifacts */}
                {message.artifacts && message.artifacts.length > 0 && (
                    <div className="space-y-2">
                        {message.artifacts.map((artifact, index) => (
                            <ArtifactDisplay key={artifact.artifactId || index} artifact={artifact} />
                        ))}
                    </div>
                )}

                {/* Parts */}
                {message.parts && message.parts.length > 0 && (
                    <PartsDisplay parts={message.parts} />
                )}
            </div>
        </div>
    );
}; 