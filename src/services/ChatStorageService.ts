import { Artifact, Part } from '@/a2a/schema';
import { ChatMessage, ToolCall } from '@/types/chat';

/**
 * Interface for persisting chat conversation data.
 * Swap the implementation (e.g. LocalStorageChatStorage → RemoteA2AChatStorage)
 * without touching hooks or components.
 */
export interface IChatStorageService {
    loadMessages(conversationId: string): ChatMessage[] | null;
    saveMessages(conversationId: string, messages: ChatMessage[]): void;
    loadTaskId(conversationId: string): string | null;
    saveTaskId(conversationId: string, taskId: string | null): void;
    removeConversation(conversationId: string): void;
}

// Serializable shape stored in localStorage (Date → string, File objects stripped)
interface StoredChatMessage {
    id: number;
    sender: "agent" | "user";
    content: string;
    senderName: string;
    timestamp: string;
    artifacts?: Artifact[];
    parts?: Part[];
    toolCalls?: ToolCall[];
}

const MESSAGES_KEY = "a2a_chat_messages_";
const TASK_ID_KEY = "a2a_task_id_";

export class LocalStorageChatStorage implements IChatStorageService {

    loadMessages(conversationId: string): ChatMessage[] | null {
        try {
            const raw = localStorage.getItem(MESSAGES_KEY + conversationId);
            if (raw) {
                const parsed: StoredChatMessage[] = JSON.parse(raw);
                return parsed.map(msg => ({
                    ...msg,
                    timestamp: new Date(msg.timestamp),
                }));
            }
        } catch (error) {
            console.error("Failed to load chat messages:", error);
        }
        return null;
    }

    saveMessages(conversationId: string, messages: ChatMessage[]): void {
        try {
            const serializable: StoredChatMessage[] = messages.map(
                ({ fileAttachments, timestamp, ...rest }) => ({
                    ...rest,
                    timestamp: timestamp instanceof Date ? timestamp.toISOString() : String(timestamp),
                })
            );
            localStorage.setItem(MESSAGES_KEY + conversationId, JSON.stringify(serializable));
        } catch (error) {
            console.error("Failed to save chat messages:", error);
        }
    }

    loadTaskId(conversationId: string): string | null {
        try {
            return localStorage.getItem(TASK_ID_KEY + conversationId);
        } catch {
            return null;
        }
    }

    saveTaskId(conversationId: string, taskId: string | null): void {
        try {
            if (taskId) {
                localStorage.setItem(TASK_ID_KEY + conversationId, taskId);
            } else {
                localStorage.removeItem(TASK_ID_KEY + conversationId);
            }
        } catch (error) {
            console.error("Failed to save task ID:", error);
        }
    }

    removeConversation(conversationId: string): void {
        try {
            localStorage.removeItem(MESSAGES_KEY + conversationId);
            localStorage.removeItem(TASK_ID_KEY + conversationId);
        } catch (error) {
            console.error("Failed to remove chat storage:", error);
        }
    }
}

/** Default singleton – used by useChat and anywhere else that needs chat storage. */
export const chatStorage: IChatStorageService = new LocalStorageChatStorage();
