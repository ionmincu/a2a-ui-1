import {
  Artifact,
  Part,
} from '@/a2a/schema';

export interface FileAttachment {
    id: string;
    file: File;
    name: string;
    size: number;
    type: string;
    preview?: string;      // Data URL for image previews
    base64?: string;        // Base64-encoded content (populated after reading)
    status: 'pending' | 'reading' | 'ready' | 'error';
    error?: string;
}

export interface ChatMessage {
    id: number;
    sender: "agent" | "user";
    content: string;
    senderName: string;
    timestamp: Date;
    artifacts?: Artifact[];
    parts?: Part[];
    fileAttachments?: FileAttachment[];
}

export type TabType = "chat" | "chats" | "agents" | "events" | "tasks" | "settings"; 