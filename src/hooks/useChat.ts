import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import { v4 as uuidv4 } from 'uuid';

import { A2AClient } from '@/a2a/client';
import {
  Artifact,
  Message,
  MessageSendConfiguration,
  MessageSendParams,
  Part,
  TaskSendParams,
} from '@/a2a/schema';
import {
  ChatMessage,
  FileAttachment,
  ToolCall,
} from '@/types/chat';
import { chatStorage } from '@/services/ChatStorageService';

interface UseChatProps {
    agentUrl?: string;
    isStreamingEnabled?: boolean;
    authorizationHeader?: string | null;
    conversationId?: string;
}

export const useChat = ({ agentUrl, isStreamingEnabled = false, authorizationHeader, conversationId }: UseChatProps = {}) => {
    const defaultMessages: ChatMessage[] = [
        {
            id: 1,
            sender: "agent",
            content: "Hello, I am your agent. How can I assist you today?",
            senderName: "Assistant",
            timestamp: new Date(),
        }
    ];

    const [messages, setMessages] = useState<ChatMessage[]>(defaultMessages);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const storageReady = useRef(false);

    // A2A multi-turn conversation state
    // Per server spec: contextId = taskId = conversationId (single identity).
    // First message sends nothing; server returns contextId which we reuse for follow-ups.
    const [currentContextId, setCurrentContextId] = useState<string | null>(null);

    // Load persisted data from IndexedDB on mount
    useEffect(() => {
        if (!conversationId) {
            storageReady.current = true;
            return;
        }
        let cancelled = false;
        (async () => {
            const [savedMessages, savedContextId] = await Promise.all([
                chatStorage.loadMessages(conversationId),
                chatStorage.loadContextId(conversationId),
            ]);
            if (cancelled) return;
            if (savedMessages) setMessages(savedMessages);
            if (savedContextId) setCurrentContextId(savedContextId);
            storageReady.current = true;
        })();
        return () => { cancelled = true; };
    }, [conversationId]);

    // Persist messages to IndexedDB whenever they change
    useEffect(() => {
        if (!conversationId || !storageReady.current) return;
        chatStorage.saveMessages(conversationId, messages);
    }, [messages, conversationId]);

    // Persist contextId to IndexedDB whenever it changes
    useEffect(() => {
        if (!conversationId || !storageReady.current) return;
        chatStorage.saveContextId(conversationId, currentContextId);
    }, [currentContextId, conversationId]);
    
    // Refs for managing typing animation
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const typingStateRef = useRef<{
        messageId: number | null;
        fullText: string;
        currentIndex: number;
        isTyping: boolean;
    }>({
        messageId: null,
        fullText: "",
        currentIndex: 0,
        isTyping: false
    });

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, []);

    // Function to simulate token-by-token typing
    const simulateTyping = useCallback((messageId: number, fullText: string, speed: number = 30) => {
        // Clear previous animation
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        typingStateRef.current = {
            messageId,
            fullText,
            currentIndex: 0,
            isTyping: true
        };

        const typeNextChar = () => {
            const state = typingStateRef.current;
            
            if (state.currentIndex < state.fullText.length && state.isTyping) {
                // Determine next token (word or character)
                let nextIndex = state.currentIndex + 1;

                // Speed up typing for spaces and punctuation
                const currentChar = state.fullText[state.currentIndex];
                if (currentChar === ' ' || /[.,!?;:]/.test(currentChar)) {
                    speed = 10;
                } else if (/[a-zA-Zа-яА-ЯёЁ0-9]/.test(currentChar)) {
                    // For regular characters, try to find end of word
                    while (nextIndex < state.fullText.length &&
                           /[a-zA-Zа-яА-ЯёЁ0-9]/.test(state.fullText[nextIndex])) {
                        nextIndex++;
                    }
                    speed = Math.random() * 40 + 20; // 20-60ms for words
                } else {
                    speed = 50; // Slower for special characters
                }

                const displayText = state.fullText.substring(0, nextIndex);
                
                setMessages(prev =>
                    prev.map(msg =>
                        msg.id === messageId
                            ? { ...msg, content: displayText + "▋" } // Add cursor
                            : msg
                    )
                );

                typingStateRef.current.currentIndex = nextIndex;

                typingTimeoutRef.current = setTimeout(typeNextChar, speed);
            } else {
                // Finish typing
                setMessages(prev =>
                    prev.map(msg =>
                        msg.id === messageId
                            ? { ...msg, content: state.fullText } // Remove cursor
                            : msg
                    )
                );
                
                typingStateRef.current.isTyping = false;
            }
        };

        typeNextChar();
    }, []);

    // Function to stop typing animation
    const stopTyping = useCallback(() => {
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = null;
        }
        
        const state = typingStateRef.current;
        if (state.isTyping && state.messageId) {
            setMessages(prev => 
                prev.map(msg => 
                    msg.id === state.messageId 
                        ? { ...msg, content: state.fullText }
                        : msg
                )
            );
            typingStateRef.current.isTyping = false;
        }
    }, []);

    // Cleanup timers on unmount
    useEffect(() => {
        return () => {
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }
        };
    }, []);

    // Function to convert ChatMessage to A2A Message format
    const convertChatMessageToA2AMessage = useCallback((chatMessage: ChatMessage): Message => {
        const parts: Part[] = [
            {
                kind: "text",
                text: chatMessage.content,
                metadata: undefined
            }
        ];

        return {
            messageId: `chat-${chatMessage.id}-${Date.now()}`,
            role: chatMessage.sender === "user" ? "user" : "agent",
            parts: parts,
            kind: "message",
            ...(currentContextId && { contextId: currentContextId }),
            metadata: {
                timestamp: chatMessage.timestamp.toISOString(),
                senderName: chatMessage.senderName,
                originalId: chatMessage.id
            }
        };
    }, [currentContextId]);

    // Function to get the last 10 messages in A2A format
    const getMessageHistory = useCallback((currentMessages: ChatMessage[]): Message[] => {
        // Take last 10 messages (excluding welcome message if it's the only one)
        const messagesToInclude = currentMessages.length === 1 && currentMessages[0].id === 1
            ? [] // Don't include initial welcome message
            : currentMessages.slice(-10); // Take last 10 messages
        
        return messagesToInclude.map(convertChatMessageToA2AMessage);
    }, [convertChatMessageToA2AMessage]);

    // Helper: convert FileAttachment[] to A2A Part[]
    const buildFileParts = useCallback((files: FileAttachment[]): Part[] => {
        return files
            .filter(f => f.status === 'ready' && f.base64)
            .map(f => {
                // A2A 0.3.1-preview: "kind" discriminator inside file object
                const part = {
                    kind: 'file' as const,
                    file: {
                        kind: 'bytes',
                        bytes: f.base64!,
                        name: f.name,
                        mimeType: f.type || 'application/octet-stream',
                    },
                };
                return part as unknown as Part;
            });
    }, []);

    // Regular message sending (new schema)
    const sendMessageSync = useCallback(async (content: string, fileAttachments?: FileAttachment[]) => {
        const client = new A2AClient(agentUrl!, window.fetch.bind(window), authorizationHeader);
        const messageId = uuidv4();

        // Get message history
        const messageHistory = getMessageHistory(messages);

        // Build parts: text + files
        const parts: Part[] = [{ text: content, kind: "text" }];
        if (fileAttachments && fileAttachments.length > 0) {
            parts.push(...buildFileParts(fileAttachments));
        }

        // Create configuration
        const configuration: MessageSendConfiguration = {
            acceptedOutputModes: ["text"],
            historyLength: messageHistory.length,
            blocking: true
        };

        // Create message object:
        // - Use taskId to continue conversation (follow-up messages)
        // - Use contextId only for first message
        console.log("🔍 Building message - currentContextId:", currentContextId);
        const message: Message = {
            messageId: messageId,
            role: "user",
            parts: parts,
            kind: "message",
            // contextId = taskId = conversationId per server spec.
            // First message: no contextId (server creates it). Follow-ups: send contextId.
            ...(currentContextId && { contextId: currentContextId })
        };

        const sendParams: MessageSendParams = {
            message: message,
            configuration: configuration,
            metadata: {
                messageHistory: messageHistory,
                sessionInfo: {
                    totalMessages: messages.length + 1,
                    timestamp: new Date().toISOString(),
                    userAgent: navigator.userAgent
                }
            }
        };

        console.log("Sending message (regular mode) with history:", {
            messageId,
            historyLength: messageHistory.length,
            isStreaming: false,
            contextId: currentContextId
        });

        console.log("SendMessageParams:", JSON.stringify(sendParams, null, 2));

        const responseMessage = await client.sendMessage(sendParams);
        console.log("Message Result (full structure):", JSON.stringify(responseMessage, null, 2));

        // Save contextId from response for multi-turn conversations.
        // Server uses contextId = taskId = conversationId (single identity).
        if (responseMessage) {
            let extractedContextId: string | null = null;

            // Prefer contextId directly on the response
            if ('contextId' in responseMessage && typeof (responseMessage as any).contextId === 'string') {
                extractedContextId = (responseMessage as any).contextId;
            }
            // Fall back to id (Task response) or taskId (Message response)
            else if ('id' in responseMessage && typeof responseMessage.id === 'string') {
                extractedContextId = responseMessage.id;
            } else if ('taskId' in responseMessage && typeof (responseMessage as any).taskId === 'string') {
                extractedContextId = (responseMessage as any).taskId;
            }

            if (extractedContextId) {
                console.log("✅ Saving contextId:", extractedContextId);
                setCurrentContextId(extractedContextId);
            } else {
                console.warn("⚠️ No contextId found in response. Response keys:", Object.keys(responseMessage));
            }
        }

        // Extract text from response message and collect parts/artifacts
        let agentResponse = "No response";
        let responseParts: Part[] = [];
        let responseArtifacts: Artifact[] = [];

        // Check that response can be either Message or Task (some servers return Task)
        if (responseMessage) {
            // If this is Task with status.message (UiPath format)
            if ('kind' in responseMessage && (responseMessage as any).kind === 'task' && 'status' in responseMessage) {
                const task = responseMessage as any;
                console.log("Received Task response with status:", task.status?.state);
                
                // Extract message from task.status.message
                if (task.status?.message?.parts && Array.isArray(task.status.message.parts)) {
                    responseParts = task.status.message.parts;
                    const textParts = task.status.message.parts
                        .filter((part: any) => part.kind === "text")
                        .map((part: any) => part.text)
                        .join("");
                    agentResponse = textParts || "Empty response";
                    console.log("Extracted text from Task.status.message:", agentResponse);
                }
                
                // Also check for artifacts in the task
                if (task.artifacts && Array.isArray(task.artifacts)) {
                    responseArtifacts = task.artifacts;
                }
            }
            // If this is Task (has artifacts at top level)
            else if ('artifacts' in responseMessage && Array.isArray(responseMessage.artifacts)) {
                responseArtifacts = responseMessage.artifacts;

                // Extract text from all text parts in all artifacts
                for (const artifact of responseMessage.artifacts) {
                    if (artifact.parts) {
                        const textParts = artifact.parts
                            .filter((part: any) => part.kind === "text")
                            .map((part: any) => part.text)
                            .join("");
                        if (textParts) {
                            agentResponse = agentResponse === "No response" ? textParts : agentResponse + "\n" + textParts;
                        }
                    }
                }
            }
            // If this is Message (has parts at top level)
            else if ('parts' in responseMessage && Array.isArray(responseMessage.parts)) {
                responseParts = responseMessage.parts;
                const textParts = responseMessage.parts
                    .filter((part: any) => part.kind === "text")
                    .map((part: any) => part.text)
                    .join("");
                agentResponse = textParts || "Empty response";
            }
        }

        return { text: agentResponse, parts: responseParts, artifacts: responseArtifacts };
    }, [agentUrl, authorizationHeader, messages, getMessageHistory, buildFileParts]);

    // Streaming message sending (old schema with TaskSendParams)
    const sendMessageStream = useCallback(async (content: string, fileAttachments?: FileAttachment[]) => {
        const client = new A2AClient(agentUrl!, window.fetch.bind(window), authorizationHeader);
        const taskId = uuidv4();
        const messageId = uuidv4();

        // Get message history
        const messageHistory = getMessageHistory(messages);
        
        // Build parts: text + files
        const parts: Part[] = [{ text: content, kind: "text" }];
        if (fileAttachments && fileAttachments.length > 0) {
            parts.push(...buildFileParts(fileAttachments));
        }
        
        // Create message object:
        // - Use taskId to continue conversation (follow-up messages)
        // - Use contextId only for first message
        console.log("🔍 Building streaming message - currentContextId:", currentContextId);
        const streamMessage: Message = {
            messageId: messageId,
            role: "user",
            parts: parts,
            kind: "message",
            // contextId = taskId = conversationId per server spec.
            // First message: no contextId (server creates it). Follow-ups: send contextId.
            ...(currentContextId && { contextId: currentContextId })
        };

        const sendParams: TaskSendParams = {
            id: taskId,
            message: streamMessage,
            metadata: {
                messageHistory: messageHistory,
                historyCount: messageHistory.length,
                sessionInfo: {
                    totalMessages: messages.length + 1,
                    timestamp: new Date().toISOString(),
                    userAgent: navigator.userAgent
                }
            }
        };

        console.log("Sending task (streaming mode) with history:", {
            taskId,
            messageId,
            historyCount: messageHistory.length,
            isStreaming: true,
            contextId: currentContextId
        });

        console.log("TaskSendParams:", JSON.stringify(sendParams, null, 2));

        const agentResponse = "";
        let agentMessageId: number | null = null;
        let accumulatedText = "";
        const accumulatedArtifacts: Artifact[] = [];
        const accumulatedParts: Part[] = [];
        const accumulatedToolCalls: ToolCall[] = [];

        try {
            // Handle streaming events
            for await (const event of client.sendTaskSubscribe(sendParams)) {
                console.log("Streaming event:", event);

                if (event && typeof event === 'object') {
                    // Save contextId from streaming event (contextId = taskId = conversationId).
                    // Prefer contextId, fall back to id (taskId).
                    if ('contextId' in event && typeof (event as any).contextId === 'string') {
                        console.log("✅ Saving contextId from streaming event:", (event as any).contextId);
                        setCurrentContextId((event as any).contextId);
                    } else if ('id' in event && typeof event.id === 'string') {
                        console.log("✅ Saving contextId from streaming event.id:", event.id);
                        setCurrentContextId(event.id);
                    }

                    let newTextChunk = "";
                    let toolCallUpdate = false;

                    // Handle TaskStatusUpdateEvent
                    if ('status' in event && event.status) {
                        const status = event.status as any;
                        if (status.message && status.message.metadata) {
                            const meta = status.message.metadata;

                            // Detect tool call events
                            if (meta.toolCallPhase === 'start' && meta.toolCallId) {
                                const toolCall: ToolCall = {
                                    toolCallId: meta.toolCallId,
                                    toolName: meta.toolName || 'unknown',
                                    phase: 'start',
                                    input: meta.toolCallInput,
                                    timestamp: new Date()
                                };
                                accumulatedToolCalls.push(toolCall);
                                toolCallUpdate = true;
                                console.log("Tool call started:", meta.toolName, meta.toolCallInput);
                            } else if (meta.toolCallPhase === 'end' && meta.toolCallId) {
                                const existingIdx = accumulatedToolCalls.findIndex(
                                    tc => tc.toolCallId === meta.toolCallId
                                );
                                const outputText = Array.isArray(meta.toolCallOutput)
                                    ? meta.toolCallOutput.map((o: any) => o.text || '').join('\n')
                                    : typeof meta.toolCallOutput === 'string' ? meta.toolCallOutput : '';
                                if (existingIdx >= 0) {
                                    accumulatedToolCalls[existingIdx] = {
                                        ...accumulatedToolCalls[existingIdx],
                                        phase: 'end',
                                        output: outputText,
                                        timestamp: new Date()
                                    };
                                } else {
                                    accumulatedToolCalls.push({
                                        toolCallId: meta.toolCallId,
                                        toolName: meta.toolName || 'unknown',
                                        phase: 'end',
                                        output: outputText,
                                        timestamp: new Date()
                                    });
                                }
                                toolCallUpdate = true;
                                console.log("Tool call completed:", meta.toolCallId);
                            }
                        }

                        // Extract text from non-tool-call status messages
                        if (status.message && status.message.parts && !toolCallUpdate) {
                            const textParts = status.message.parts
                                .filter((part: any) => part.kind === "text")
                                .map((part: any) => part.text)
                                .join("");

                            if (textParts) {
                                newTextChunk = textParts;
                            }
                        }
                    }
                    
                    // Handle TaskArtifactUpdateEvent
                    if ('artifact' in event && event.artifact) {
                        const artifact = event.artifact as any;
                        const appendMode = 'append' in event ? (event as any).append : false;
                        const hasArtifactParts = Array.isArray(artifact.parts) && artifact.parts.length > 0;
                        const hasUsefulArtifactContent = hasArtifactParts || !!artifact.description || !!artifact.metadata;

                        // Ignore empty placeholder artifacts (e.g., "response" with 0 parts)
                        if (!hasUsefulArtifactContent) {
                            continue;
                        }
                        
                        // Add or update accumulated artifacts
                        // Only store artifacts that have non-text parts (files, data, etc.)
                        const hasNonTextParts = artifact.parts && artifact.parts.some((p: any) => p.kind !== 'text');

                        if (hasNonTextParts) {
                            const existingIndex = accumulatedArtifacts.findIndex(a => a.artifactId === artifact.artifactId);
                            if (existingIndex >= 0) {
                                // If append mode, merge the parts
                                if (appendMode && artifact.parts) {
                                    const existingArtifact = accumulatedArtifacts[existingIndex];
                                    accumulatedArtifacts[existingIndex] = {
                                        ...existingArtifact,
                                        parts: [...(existingArtifact.parts || []), ...artifact.parts]
                                    };
                                } else {
                                    accumulatedArtifacts[existingIndex] = artifact;
                                }
                            } else {
                                accumulatedArtifacts.push(artifact);
                            }

                            // Update message with new artifacts
                            if (agentMessageId) {
                                setMessages(prev => 
                                    prev.map(msg => 
                                        msg.id === agentMessageId 
                                            ? { ...msg, artifacts: [...accumulatedArtifacts] }
                                            : msg
                                    )
                                );
                            }
                        }
                        
                        // Extract text from artifact for typing
                        if (artifact.parts) {
                            const textParts = artifact.parts
                                .filter((part: any) => part.kind === "text")
                                .map((part: any) => part.text)
                                .join("");
                            
                            if (textParts) {
                                // If append mode, add to existing text, otherwise it's a new chunk
                                if (appendMode) {
                                    newTextChunk = textParts; // Will be appended below
                                } else {
                                    newTextChunk = textParts;
                                }
                            }
                        }
                    }

                    // If we received new text, combine cumulative/delta chunks
                    if (newTextChunk) {
                        // Check if we're in append mode
                        const isAppendMode = 'append' in event && (event as any).append;

                        if (isAppendMode) {
                            accumulatedText = accumulatedText + newTextChunk;
                        } else {
                            accumulatedText = newTextChunk;
                        }
                    }

                    // Create or update message when we have text or tool call updates
                    if (newTextChunk || toolCallUpdate) {
                        if (agentMessageId) {
                            // Update existing message
                            setMessages(prev =>
                                prev.map(msg =>
                                    msg.id === agentMessageId
                                        ? {
                                            ...msg,
                                            content: newTextChunk ? accumulatedText + "▋" : msg.content,
                                            toolCalls: [...accumulatedToolCalls]
                                        }
                                        : msg
                                )
                            );
                        } else {
                            // Create new message on first chunk or tool call
                            setMessages(prev => {
                                const agentMessage: ChatMessage = {
                                    id: prev.length + 1,
                                    sender: "agent",
                                    content: newTextChunk ? accumulatedText + "▋" : "",
                                    senderName: "Assistant",
                                    timestamp: new Date(),
                                    artifacts: [],
                                    parts: [],
                                    toolCalls: [...accumulatedToolCalls]
                                };
                                agentMessageId = agentMessage.id;
                                return [...prev, agentMessage];
                            });
                            // Hide typing indicator once we receive the first event
                            setIsLoading(false);
                        }
                    }


                    // Check for completion
                    if ('final' in event && event.final) {
                        console.log("Streaming completed");
                        // Finish and show complete text without cursor with artifacts and tool calls
                        if (agentMessageId) {
                            setMessages(prev =>
                                prev.map(msg =>
                                    msg.id === agentMessageId
                                        ? {
                                            ...msg,
                                            content: accumulatedText, // Remove cursor
                                            artifacts: accumulatedArtifacts.length > 0 ? accumulatedArtifacts : undefined,
                                            parts: accumulatedParts.length > 0 && accumulatedParts.some(p => p.kind !== 'text')
                                                ? accumulatedParts
                                                : undefined,
                                            toolCalls: accumulatedToolCalls.length > 0 ? accumulatedToolCalls : undefined
                                        }
                                        : msg
                                )
                            );
                        }
                        break;
                    }
                }
            }
        } catch (error) {
            console.error("Streaming error:", error);
            // Show error
            if (agentMessageId) {
                setMessages(prev => 
                    prev.map(msg => 
                        msg.id === agentMessageId 
                            ? { ...msg, content: `Streaming error: ${error instanceof Error ? error.message : String(error)}` }
                            : msg
                    )
                );
            }
        }

        return accumulatedText;
    }, [agentUrl, authorizationHeader, messages, getMessageHistory, simulateTyping, stopTyping, buildFileParts]);

    const sendMessage = useCallback(async (content: string, fileAttachments?: FileAttachment[]) => {
        if ((!content.trim() && (!fileAttachments || fileAttachments.length === 0)) || isLoading || !agentUrl) return;

        // Stop any current typing animation
        stopTyping();

        const userMessage: ChatMessage = {
            id: messages.length + 1,
            sender: "user",
            content,
            senderName: "You",
            timestamp: new Date(),
            fileAttachments: fileAttachments && fileAttachments.length > 0 ? fileAttachments : undefined
        };

        // Add user message to history
        const updatedMessages = [...messages, userMessage];
        setMessages(updatedMessages);
        setIsLoading(true);

        try {
            if (isStreamingEnabled) {
                await sendMessageStream(content, fileAttachments);
            } else {
                const syncResponse = await sendMessageSync(content, fileAttachments);
                
                setMessages(prev => {
                    const agentMessage: ChatMessage = {
                        id: prev.length + 1,
                        sender: "agent",
                        content: syncResponse.text,
                        senderName: "Assistant",
                        timestamp: new Date(),
                        artifacts: syncResponse.artifacts.length > 0 ? syncResponse.artifacts : undefined,
                        // Only include parts if they have non-text content
                        parts: syncResponse.parts.length > 0 && syncResponse.parts.some(p => p.kind !== 'text') 
                            ? syncResponse.parts 
                            : undefined
                    };
                    return [...prev, agentMessage];
                });
            }
        } catch (error) {
            console.error("A2A Client Error:", error);
            stopTyping();
            setMessages(prev => {
                const errorMessage: ChatMessage = {
                    id: prev.length + 1,
                    sender: "agent",
                    content: `Error: ${error instanceof Error ? error.message : String(error)}`,
                    senderName: "Assistant",
                    timestamp: new Date()
                };
                return [...prev, errorMessage];
            });
        } finally {
            setIsLoading(false);
        }
    }, [isLoading, agentUrl, messages, isStreamingEnabled, sendMessageSync, sendMessageStream, stopTyping]);

    // Reset conversation state (clear contextId to start a new conversation)
    const resetConversation = useCallback(() => {
        console.log("Resetting conversation - clearing contextId");
        setCurrentContextId(null);
    }, []);

    return {
        messages,
        isLoading,
        messagesEndRef,
        scrollToBottom,
        sendMessage,
        setMessages,
        resetConversation,
        currentContextId // Expose for debugging/testing
    };
}; 