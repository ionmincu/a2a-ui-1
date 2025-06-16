import React, { useState, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useChat } from "@/hooks/useChat";
import { MessagesList } from "./MessagesList";
import { ChatInput } from "./ChatInput";
import { AgentCard } from "@/a2a/schema";
import { StateConversation } from "@/a2a/state";
import { useAppState } from "@/a2a/state/app/appStateContext";
import { v4 as uuidv4 } from "uuid";
import { RefreshCw, Copy, Check } from "lucide-react";
import { TraceSidebar } from "./TraceSidebar";
import { useTrace } from "@/hooks/useTrace";
import { useSettingsState } from "@/a2a/state/settings/settingsStateContext";

interface ChatContainerProps {
    selectedAgent: AgentCard | null;
    showAgentDetails: boolean;
    conversation: StateConversation | null;
    onChatTabChange?: () => void;
}

export const ChatContainer: React.FC<ChatContainerProps> = ({
    selectedAgent,
    showAgentDetails,
    conversation,
    onChatTabChange
}) => {
    const [newMessage, setNewMessage] = useState<string>("");
    const [isStreamingEnabled, setIsStreamingEnabled] = useState<boolean>(false);
    const [editingContextId, setEditingContextId] = useState<boolean>(false);
    const [tempContextId, setTempContextId] = useState<string>("");
    const [copied, setCopied] = useState<boolean>(false);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    
    const { appState, setAppState } = useAppState();
    const { settingsState } = useSettingsState();
    
    // Получаем актуальную conversation из appState
    const currentConversation = conversation ? 
        appState.conversations.find(conv => conv.conversation_id === conversation.conversation_id) || conversation 
        : null;

    const { messages, isLoading, messagesEndRef, scrollToBottom, sendMessage } = useChat({
        agentUrl: selectedAgent?.url,
        isStreamingEnabled,
        contextId: currentConversation?.context_id
    });

    const { trace, loading: traceLoading, error: traceError, projectId, availableProjects, refreshTrace } = useTrace({
        contextId: currentConversation?.context_id,
        settings: settingsState,
        selectedAgent: selectedAgent
    });

    // Auto-focus input field when chat tab becomes active
    useEffect(() => {
        if (onChatTabChange) {
            inputRef.current?.focus();
        }
    }, [onChatTabChange]);

    const handleSendMessage = async () => {
        if (!newMessage.trim() || isLoading) return;
        
        const messageToSend = newMessage;
        setNewMessage("");
        
        // Keep focus on input field for continuous typing
        setTimeout(() => {
            inputRef.current?.focus();
        }, 0);

        await sendMessage(messageToSend);
        
        // Автоматически обновляем трейсы после отправки сообщения с задержкой
        // чтобы дать время для генерации трейсов на сервере
        if (refreshTrace) {
            setTimeout(() => {
                console.log('Auto-refreshing traces after message send');
                refreshTrace();
            }, 2000); // 2 секунды задержки для генерации трейсов
        }
        
        // Return focus to input field after response
        setTimeout(() => {
            inputRef.current?.focus();
        }, 100);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    // Проверяем, поддерживает ли агент стриминг
    const isStreamingSupported = selectedAgent?.capabilities?.streaming ?? false;

    // Функции для управления contextId
    const handleGenerateContextId = () => {
        if (!currentConversation) return;
        
        const newContextId = uuidv4();
        
        // Обновляем conversation в appState
        const updatedConversations = appState.conversations.map(conv =>
            conv.conversation_id === currentConversation.conversation_id
                ? { ...conv, context_id: newContextId }
                : conv
        );
        
        setAppState({
            ...appState,
            conversations: updatedConversations
        });
    };

    const handleEditContextId = () => {
        setTempContextId(currentConversation?.context_id || "");
        setEditingContextId(true);
    };

    const handleSaveContextId = () => {
        if (!currentConversation || !tempContextId.trim()) return;
        
        // Обновляем conversation в appState
        const updatedConversations = appState.conversations.map(conv =>
            conv.conversation_id === currentConversation.conversation_id
                ? { ...conv, context_id: tempContextId.trim() }
                : conv
        );
        
        setAppState({
            ...appState,
            conversations: updatedConversations
        });
        
        setEditingContextId(false);
        setTempContextId("");
    };

    const handleCancelEditContextId = () => {
        setEditingContextId(false);
        setTempContextId("");
    };

    const handleCopyContextId = async () => {
        if (!currentConversation?.context_id) return;
        
        try {
            await navigator.clipboard.writeText(currentConversation.context_id);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            console.error("Failed to copy context ID:", error);
        }
    };

    return (
        <div className="flex h-full overflow-hidden min-h-0">
            {settingsState.arize_phoenix_enabled && (
                <TraceSidebar 
                    trace={trace} 
                    loading={traceLoading} 
                    error={traceError} 
                    projectId={projectId}
                    availableProjects={availableProjects}
                    refreshTrace={refreshTrace}
                    contextId={currentConversation?.context_id}
                />
            )}
            {/* Chat Area */}
            <div className="flex-1 flex flex-col overflow-hidden min-h-0">
                <Card className="flex-1 flex flex-col border-0 rounded-none shadow-none overflow-hidden min-h-0">
                    <CardContent className="flex-1 flex flex-col p-0 overflow-hidden min-h-0">
                        <MessagesList
                            messages={messages}
                            isLoading={isLoading}
                            messagesEndRef={messagesEndRef}
                            scrollToBottom={scrollToBottom}
                        />
                        
                        <ChatInput
                            ref={inputRef}
                            value={newMessage}
                            onChange={setNewMessage}
                            onSend={handleSendMessage}
                            onKeyDown={handleKeyDown}
                            disabled={isLoading}
                        />
                    </CardContent>
                </Card>
            </div>

            {/* Agent Details Sidebar */}
            {showAgentDetails && selectedAgent && (
                <div className="w-80 border-l bg-muted/50 p-6 overflow-y-auto">
                    <h3 className="text-lg font-semibold mb-4 text-foreground">Agent Details</h3>
                    <div className="space-y-4">
                        <div>
                            <h4 className="text-sm font-medium text-muted-foreground mb-1">Name</h4>
                            <p className="text-sm text-foreground">{selectedAgent.name}</p>
                        </div>
                        <div>
                            <h4 className="text-sm font-medium text-muted-foreground mb-1">Description</h4>
                            <p className="text-sm text-foreground">{selectedAgent.description}</p>
                        </div>
                        <div>
                            <h4 className="text-sm font-medium text-muted-foreground mb-1">URL</h4>
                            <p className="text-sm text-primary break-all">{selectedAgent.url}</p>
                        </div>
                        
                        {/* Capabilities Section */}
                        <div>
                            <h4 className="text-sm font-medium text-muted-foreground mb-2">Capabilities</h4>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-foreground">Streaming</span>
                                    <div className="flex items-center gap-2">
                                        {isStreamingSupported ? (
                                            <>
                                                <Switch
                                                    checked={isStreamingEnabled}
                                                    onCheckedChange={setIsStreamingEnabled}
                                                    disabled={isLoading}
                                                />
                                                <span className="text-xs text-muted-foreground">
                                                    {isStreamingEnabled ? "ON" : "OFF"}
                                                </span>
                                            </>
                                        ) : (
                                            <span className="text-xs text-muted-foreground">Not supported</span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-foreground">Push Notifications</span>
                                    <span className="text-xs text-muted-foreground">
                                        {selectedAgent.capabilities?.pushNotifications ? "Supported" : "Not supported"}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-foreground">State History</span>
                                    <span className="text-xs text-muted-foreground">
                                        {selectedAgent.capabilities?.stateTransitionHistory ? "Supported" : "Not supported"}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Streaming Status Indicator */}
                        {isStreamingSupported && (
                            <div className="border rounded-lg p-3 bg-background/50">
                                <div className="flex items-center gap-2 mb-1">
                                    <div className={`w-2 h-2 rounded-full ${isStreamingEnabled ? 'bg-green-500' : 'bg-gray-400'}`} />
                                    <span className="text-sm font-medium text-foreground">
                                        {isStreamingEnabled ? "Streaming Mode" : "Standard Mode"}
                                    </span>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    {isStreamingEnabled 
                                        ? "Responses will be streamed in real-time"
                                        : "Responses will be sent after completion"
                                    }
                                </p>
                            </div>
                        )}
                        
                        {currentConversation && (
                            <div>
                                <h4 className="text-sm font-medium text-muted-foreground mb-2">Conversation</h4>
                                <div className="space-y-2">
                                    <div>
                                        <p className="text-sm text-foreground">{currentConversation.conversation_name}</p>
                                        <p className="text-xs text-muted-foreground">ID: {currentConversation.conversation_id}</p>
                                    </div>
                                    
                                    {/* Context ID Management */}
                                    <div className="border rounded-lg p-3 bg-background/50">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-xs font-medium text-foreground">Context ID</span>
                                            <div className="flex items-center gap-1">
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="h-6 px-2 text-xs"
                                                    onClick={handleGenerateContextId}
                                                    disabled={isLoading}
                                                >
                                                    <RefreshCw className="h-3 w-3 mr-1" />
                                                    Generate
                                                </Button>
                                                {currentConversation.context_id && (
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-6 px-2 text-xs"
                                                        onClick={handleCopyContextId}
                                                        disabled={isLoading}
                                                    >
                                                        {copied ? (
                                                            <Check className="h-3 w-3" />
                                                        ) : (
                                                            <Copy className="h-3 w-3" />
                                                        )}
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                        
                                        {editingContextId ? (
                                            <div className="space-y-2">
                                                <Input
                                                    value={tempContextId}
                                                    onChange={(e) => setTempContextId(e.target.value)}
                                                    placeholder="Enter context ID"
                                                    className="text-xs h-8"
                                                />
                                                <div className="flex gap-1">
                                                    <Button
                                                        size="sm"
                                                        variant="default"
                                                        className="h-6 px-2 text-xs flex-1"
                                                        onClick={handleSaveContextId}
                                                    >
                                                        Save
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="h-6 px-2 text-xs flex-1"
                                                        onClick={handleCancelEditContextId}
                                                    >
                                                        Cancel
                                                    </Button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs text-muted-foreground font-mono break-all">
                                                    {currentConversation.context_id || "No context ID"}
                                                </span>
                                                {currentConversation.context_id && (
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-6 px-2 text-xs ml-2"
                                                        onClick={handleEditContextId}
                                                        disabled={isLoading}
                                                    >
                                                        Edit
                                                    </Button>
                                                )}
                                            </div>
                                        )}
                                        
                                        <p className="text-xs text-muted-foreground mt-2">
                                            Context ID is used to maintain conversation state across messages
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}; 