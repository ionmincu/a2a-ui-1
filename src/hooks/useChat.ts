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
} from '@/types/chat';

interface UseChatProps {
    agentUrl?: string;
    isStreamingEnabled?: boolean;
    contextId?: string;
    authorizationHeader?: string | null;
}

export const useChat = ({ agentUrl, isStreamingEnabled = false, contextId, authorizationHeader }: UseChatProps = {}) => {
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            id: 1,
            sender: "agent",
            content: "Hello, I am your agent. How can I assist you today?",
            senderName: "Assistant",
            timestamp: new Date(),
        }
    ]);
    
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    
    // Refs для управления анимацией печатания
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

    // Функция для симуляции печатания токенов
    const simulateTyping = useCallback((messageId: number, fullText: string, speed: number = 30) => {
        // Очищаем предыдущую анимацию
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
                // Определяем следующий токен (слово или символ)
                let nextIndex = state.currentIndex + 1;
                
                // Ускоряем печатание для пробелов и знаков препинания
                const currentChar = state.fullText[state.currentIndex];
                if (currentChar === ' ' || /[.,!?;:]/.test(currentChar)) {
                    speed = 10;
                } else if (/[a-zA-Zа-яА-ЯёЁ0-9]/.test(currentChar)) {
                    // Для обычных символов пытаемся найти конец слова
                    while (nextIndex < state.fullText.length && 
                           /[a-zA-Zа-яА-ЯёЁ0-9]/.test(state.fullText[nextIndex])) {
                        nextIndex++;
                    }
                    speed = Math.random() * 40 + 20; // 20-60ms для слов
                } else {
                    speed = 50; // Медленнее для специальных символов
                }

                const displayText = state.fullText.substring(0, nextIndex);
                
                setMessages(prev => 
                    prev.map(msg => 
                        msg.id === messageId 
                            ? { ...msg, content: displayText + "▋" } // Добавляем курсор
                            : msg
                    )
                );

                typingStateRef.current.currentIndex = nextIndex;
                
                typingTimeoutRef.current = setTimeout(typeNextChar, speed);
            } else {
                // Завершаем печатание
                setMessages(prev => 
                    prev.map(msg => 
                        msg.id === messageId 
                            ? { ...msg, content: state.fullText } // Убираем курсор
                            : msg
                    )
                );
                
                typingStateRef.current.isTyping = false;
            }
        };

        typeNextChar();
    }, []);

    // Функция для остановки анимации печатания
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

    // Очистка таймеров при размонтировании
    useEffect(() => {
        return () => {
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }
        };
    }, []);

    // Функция для преобразования ChatMessage в A2A Message формат
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
            ...(contextId && { contextId: contextId }), // Условно добавляем contextId
            metadata: {
                timestamp: chatMessage.timestamp.toISOString(),
                senderName: chatMessage.senderName,
                originalId: chatMessage.id
            }
        };
    }, [contextId]);

    // Функция для получения истории последних 10 сообщений в формате A2A
    const getMessageHistory = useCallback((currentMessages: ChatMessage[]): Message[] => {
        // Берем последние 10 сообщений (исключая приветственное сообщение если это единственное)
        const messagesToInclude = currentMessages.length === 1 && currentMessages[0].id === 1 
            ? [] // Не включаем начальное приветственное сообщение
            : currentMessages.slice(-10); // Берем последние 10 сообщений
        
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

    // Обычная отправка сообщения (новая схема)
    const sendMessageSync = useCallback(async (content: string, fileAttachments?: FileAttachment[]) => {
        const client = new A2AClient(agentUrl!, window.fetch.bind(window), authorizationHeader);
        const messageId = uuidv4();
        
        // Получаем историю сообщений
        const messageHistory = getMessageHistory(messages);
        
        // Build parts: text + files
        const parts: Part[] = [{ text: content, kind: "text" }];
        if (fileAttachments && fileAttachments.length > 0) {
            parts.push(...buildFileParts(fileAttachments));
        }
        
        // Создаем конфигурацию
        const configuration: MessageSendConfiguration = {
            acceptedOutputModes: ["text"],
            historyLength: messageHistory.length,
            blocking: true
        };

        // Создаем message объект с условным включением contextId
        const message: Message = {
            messageId: messageId,
            role: "user",
            parts: parts,
            kind: "message",
            ...(contextId && { contextId: contextId })
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

        console.log("Отправляем сообщение (обычный режим) с историей:", {
            messageId,
            historyLength: messageHistory.length,
            isStreaming: false,
            contextId: contextId
        });

        console.log("SendMessageParams:", JSON.stringify(sendParams, null, 2));

        const responseMessage = await client.sendMessage(sendParams);
        console.log("Message Result:", responseMessage);

        // Extract text from response message and collect parts/artifacts
        let agentResponse = "No response";
        let responseParts: Part[] = [];
        let responseArtifacts: Artifact[] = [];

        // Проверяем, что ответ может быть как Message, так и Task (некоторые серверы возвращают Task)
        if (responseMessage) {
            // Если это Task с status.message (UiPath format)
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
            // Если это Task (имеет artifacts на верхнем уровне)
            else if ('artifacts' in responseMessage && Array.isArray(responseMessage.artifacts)) {
                responseArtifacts = responseMessage.artifacts;
                
                // Извлекаем текст из всех text parts во всех artifacts
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
            // Если это Message (имеет parts на верхнем уровне)
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

    // Стриминговая отправка сообщения (старая схема с TaskSendParams)
    const sendMessageStream = useCallback(async (content: string, fileAttachments?: FileAttachment[]) => {
        const client = new A2AClient(agentUrl!, window.fetch.bind(window), authorizationHeader);
        const taskId = uuidv4();
        const messageId = uuidv4();
        
        // Получаем историю сообщений
        const messageHistory = getMessageHistory(messages);
        
        // Build parts: text + files
        const parts: Part[] = [{ text: content, kind: "text" }];
        if (fileAttachments && fileAttachments.length > 0) {
            parts.push(...buildFileParts(fileAttachments));
        }
        
        // Создаем message объект с условным включением contextId
        const streamMessage: Message = {
            messageId: messageId,
            role: "user",
            parts: parts,
            kind: "message",
            ...(contextId && { contextId: contextId })
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

        console.log("Отправляем задачу (стриминг режим) с историей:", {
            taskId,
            messageId,
            historyCount: messageHistory.length,
            isStreaming: true,
            contextId: contextId
        });

        console.log("TaskSendParams:", JSON.stringify(sendParams, null, 2));

        const agentResponse = "";
        let agentMessageId: number | null = null;
        let accumulatedText = "";
        const accumulatedArtifacts: Artifact[] = [];
        const accumulatedParts: Part[] = [];

        try {
            // Обрабатываем стрим
            for await (const event of client.sendTaskSubscribe(sendParams)) {
                console.log("Streaming event:", event);
                
                if (event && typeof event === 'object') {
                    let newTextChunk = "";
                    
                    // Обработка TaskStatusUpdateEvent
                    if ('status' in event && event.status) {
                        const status = event.status as any;
                        if (status.message && status.message.parts) {
                            const textParts = status.message.parts
                                .filter((part: any) => part.kind === "text")
                                .map((part: any) => part.text)
                                .join("");
                            
                            if (textParts) {
                                newTextChunk = textParts;
                            }
                        }
                    }
                    
                    // Обработка TaskArtifactUpdateEvent
                    if ('artifact' in event && event.artifact) {
                        const artifact = event.artifact as any;
                        const appendMode = 'append' in event ? (event as any).append : false;
                        const hasArtifactParts = Array.isArray(artifact.parts) && artifact.parts.length > 0;
                        const hasUsefulArtifactContent = hasArtifactParts || !!artifact.description || !!artifact.metadata;
                        
                        // Игнорируем пустые placeholder artifacts (например, "response" с 0 parts)
                        if (!hasUsefulArtifactContent) {
                            continue;
                        }
                        
                        // Добавляем или обновляем artifact к накопленным
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
                            
                            // Обновляем сообщение с новыми artifacts
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
                        
                        // Извлекаем текст из artifact для печатания
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

                    // Если получили новый текст, объединяем cumulative/delta чанки
                    if (newTextChunk) {
                        // Check if we're in append mode
                        const isAppendMode = 'append' in event && (event as any).append;
                        
                        if (isAppendMode) {
                            // In append mode, always append the new chunk
                            accumulatedText = accumulatedText + newTextChunk;
                        } else {
                            // In replace mode (append=false), replace accumulated text
                            accumulatedText = newTextChunk;
                        }
                        
                        // Создаем или обновляем сообщение
                        if (agentMessageId) {
                            // Обновляем существующее сообщение
                            setMessages(prev => 
                                prev.map(msg => 
                                    msg.id === agentMessageId 
                                        ? { ...msg, content: accumulatedText + "▋" } // Показываем курсор
                                        : msg
                                )
                            );
                        } else {
                            // Создаем новое сообщение при первом чанке
                            setMessages(prev => {
                                const agentMessage: ChatMessage = {
                                    id: prev.length + 1,
                                    sender: "agent",
                                    content: accumulatedText + "▋",
                                    senderName: "Assistant",
                                    timestamp: new Date(),
                                    artifacts: [],
                                    parts: []
                                };
                                agentMessageId = agentMessage.id;
                                return [...prev, agentMessage];
                            });
                            // Hide typing indicator once we receive the first message chunk
                            setIsLoading(false);
                        }
                    }
                        
                    // Проверяем завершение
                    if ('final' in event && event.final) {
                        console.log("Streaming completed");
                        // Завершаем и показываем полный текст без курсора с artifacts
                        if (agentMessageId) {
                            setMessages(prev => 
                                prev.map(msg => 
                                    msg.id === agentMessageId 
                                        ? { 
                                            ...msg, 
                                            content: accumulatedText, // Убираем курсор
                                            artifacts: accumulatedArtifacts.length > 0 ? accumulatedArtifacts : undefined,
                                            // Only include parts if they have non-text content
                                            parts: accumulatedParts.length > 0 && accumulatedParts.some(p => p.kind !== 'text')
                                                ? accumulatedParts
                                                : undefined
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
            // Показываем ошибку
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
        
        // Останавливаем любую текущую анимацию печатания
        stopTyping();
        
        const userMessage: ChatMessage = {
            id: messages.length + 1,
            sender: "user",
            content,
            senderName: "You",
            timestamp: new Date(),
            fileAttachments: fileAttachments && fileAttachments.length > 0 ? fileAttachments : undefined
        };

        // Добавляем сообщение пользователя к истории
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

    return {
        messages,
        isLoading,
        messagesEndRef,
        scrollToBottom,
        sendMessage,
        setMessages
    };
}; 