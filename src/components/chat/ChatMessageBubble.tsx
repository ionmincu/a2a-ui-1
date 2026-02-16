import React from 'react';

import {
  File,
  FileCode,
  FileSpreadsheet,
  FileText,
  Image,
} from 'lucide-react';

import {
  ChatMessage,
  FileAttachment,
} from '@/types/chat';

import { ArtifactDisplay } from './ArtifactDisplay';
import { PartsDisplay } from './PartsDisplay';

interface ChatMessageBubbleProps {
    message: ChatMessage;
}

const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
};

const getFileIcon = (type: string) => {
    if (type.startsWith("image/")) return <Image className="h-4 w-4 text-green-500" />;
    if (type === "application/pdf") return <FileText className="h-4 w-4 text-red-500" />;
    if (type.includes("spreadsheet") || type === "text/csv") return <FileSpreadsheet className="h-4 w-4 text-emerald-500" />;
    if (type.includes("json") || type.includes("javascript") || type.includes("typescript"))
        return <FileCode className="h-4 w-4 text-yellow-500" />;
    if (type.startsWith("text/")) return <FileText className="h-4 w-4 text-blue-500" />;
    return <File className="h-4 w-4 text-muted-foreground" />;
};

const UserFileAttachments: React.FC<{ files: FileAttachment[] }> = ({ files }) => {
    return (
        <div className="flex flex-wrap gap-2 mt-1">
            {files.map((file) => {
                const isImage = file.type.startsWith("image/");
                return (
                    <div
                        key={file.id}
                        className="flex items-center gap-2 bg-primary-foreground/10 rounded-lg px-2.5 py-1.5 text-xs"
                    >
                        {isImage && file.preview ? (
                            <img
                                src={file.preview}
                                alt={file.name}
                                className="h-8 w-8 rounded object-cover"
                            />
                        ) : (
                            getFileIcon(file.type)
                        )}
                        <div className="min-w-0">
                            <p className="truncate max-w-[120px] font-medium" title={file.name}>{file.name}</p>
                            <p className="text-[10px] opacity-70">{formatFileSize(file.size)}</p>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

interface ChatMessageBubbleProps {
    message: ChatMessage;
}

export const ChatMessageBubble: React.FC<ChatMessageBubbleProps> = ({ message }) => {
    // Filter out artifacts that only contain text parts, since text is already shown in the message content
    const displayArtifacts = (message.artifacts || []).filter(
        artifact => {
            if (!Array.isArray(artifact.parts) || artifact.parts.length === 0) {
                return false;
            }
            // Only show artifacts that have non-text parts (files, data, etc.)
            return artifact.parts.some(part => part.kind !== 'text');
        }
    );

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

                        {/* User file attachments */}
                        {message.sender === "user" && message.fileAttachments && message.fileAttachments.length > 0 && (
                            <UserFileAttachments files={message.fileAttachments} />
                        )}
                        
                        {/* Timestamp */}
                        <div className={`text-xs mt-1 ${
                            message.sender === "user" ? "text-primary-foreground/70" : "text-muted-foreground"
                        }`}>
                            {message.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </div>
                    </div>
                )}

                {/* Artifacts */}
                {displayArtifacts.length > 0 && (
                    <div className="space-y-2">
                        {displayArtifacts.map((artifact, index) => (
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