import { Artifact, Part } from '@/a2a/schema';
import { ChatMessage, ToolCall } from '@/types/chat';

/**
 * Async interface for persisting chat conversation data.
 * Swap the implementation (e.g. IndexedDBChatStorage → RemoteA2AChatStorage)
 * without touching hooks or components.
 */
export interface IChatStorageService {
    loadMessages(conversationId: string): Promise<ChatMessage[] | null>;
    saveMessages(conversationId: string, messages: ChatMessage[]): Promise<void>;
    loadContextId(conversationId: string): Promise<string | null>;
    saveContextId(conversationId: string, contextId: string | null): Promise<void>;
    removeConversation(conversationId: string): Promise<void>;
}

/** Shape stored in IndexedDB (Date serialised as ISO string, File objects stripped). */
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

const DB_NAME = "a2a_chat_db";
const DB_VERSION = 1;
const MESSAGES_STORE = "messages";
const TASK_IDS_STORE = "taskIds";

function openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(MESSAGES_STORE)) {
                db.createObjectStore(MESSAGES_STORE);
            }
            if (!db.objectStoreNames.contains(TASK_IDS_STORE)) {
                db.createObjectStore(TASK_IDS_STORE);
            }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

function idbGet<T>(storeName: string, key: string): Promise<T | undefined> {
    return openDB().then(db => new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, "readonly");
        const req = tx.objectStore(storeName).get(key);
        req.onsuccess = () => resolve(req.result as T | undefined);
        req.onerror = () => reject(req.error);
    }));
}

function idbPut(storeName: string, key: string, value: unknown): Promise<void> {
    return openDB().then(db => new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, "readwrite");
        tx.objectStore(storeName).put(value, key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    }));
}

function idbDelete(storeName: string, key: string): Promise<void> {
    return openDB().then(db => new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, "readwrite");
        tx.objectStore(storeName).delete(key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    }));
}

export class IndexedDBChatStorage implements IChatStorageService {

    async loadMessages(conversationId: string): Promise<ChatMessage[] | null> {
        try {
            const stored = await idbGet<StoredChatMessage[]>(MESSAGES_STORE, conversationId);
            if (stored) {
                return stored.map(msg => ({
                    ...msg,
                    timestamp: new Date(msg.timestamp),
                }));
            }
        } catch (error) {
            console.error("Failed to load chat messages from IndexedDB:", error);
        }
        return null;
    }

    async saveMessages(conversationId: string, messages: ChatMessage[]): Promise<void> {
        try {
            const serializable: StoredChatMessage[] = messages.map(
                ({ fileAttachments, timestamp, ...rest }) => ({
                    ...rest,
                    timestamp: timestamp instanceof Date ? timestamp.toISOString() : String(timestamp),
                })
            );
            await idbPut(MESSAGES_STORE, conversationId, serializable);
        } catch (error) {
            console.error("Failed to save chat messages to IndexedDB:", error);
        }
    }

    async loadContextId(conversationId: string): Promise<string | null> {
        try {
            return (await idbGet<string>(TASK_IDS_STORE, conversationId)) ?? null;
        } catch {
            return null;
        }
    }

    async saveContextId(conversationId: string, contextId: string | null): Promise<void> {
        try {
            if (contextId) {
                await idbPut(TASK_IDS_STORE, conversationId, contextId);
            } else {
                await idbDelete(TASK_IDS_STORE, conversationId);
            }
        } catch (error) {
            console.error("Failed to save context ID to IndexedDB:", error);
        }
    }

    async removeConversation(conversationId: string): Promise<void> {
        try {
            await Promise.all([
                idbDelete(MESSAGES_STORE, conversationId),
                idbDelete(TASK_IDS_STORE, conversationId),
            ]);
        } catch (error) {
            console.error("Failed to remove chat storage from IndexedDB:", error);
        }
    }
}

/** Default singleton – used by useChat and anywhere else that needs chat storage. */
export const chatStorage: IChatStorageService = new IndexedDBChatStorage();
