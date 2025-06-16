import React from "react";
import { TabType } from "@/types/chat";
import { AgentCard } from "@/a2a/schema";
import { StateConversation } from "@/a2a/state";
import { ChatContainer } from "@/components/chat/ChatContainer";
import ConversationListPage from "@/app/pages/ConversationListPage";
import AgentListPage from "@/app/pages/AgentListPage";
import EventListPage from "@/app/pages/EventList";
import TaskListPage from "@/app/pages/TaskListPage";
import SettingsPage from "@/app/pages/SettingsPage";

interface TabContentProps {
    activeTab: TabType;
    selectedAgent: AgentCard | null;
    showAgentDetails: boolean;
    conversation: StateConversation | null;
    onChatTabChange?: () => void;
    onOpenConversation: (conversation: StateConversation) => void;
}

export const TabContent: React.FC<TabContentProps> = ({
    activeTab,
    selectedAgent,
    showAgentDetails,
    conversation,
    onChatTabChange,
    onOpenConversation
}) => {
    const renderContent = () => {
        switch (activeTab) {
            case "chat":
                return (
                    <ChatContainer
                        selectedAgent={selectedAgent}
                        showAgentDetails={showAgentDetails}
                        conversation={conversation}
                        onChatTabChange={onChatTabChange}
                    />
                );
            case "chats":
                return <ConversationListPage openConversation={onOpenConversation} />;
            case "agents":
                return <AgentListPage />;
            case "events":
                return <EventListPage />;
            case "tasks":
                return <TaskListPage />;
            case "settings":
                return <SettingsPage />;
            default:
                return <ConversationListPage openConversation={onOpenConversation} />;
        }
    };

    return (
        <main className="flex-1 overflow-hidden min-h-0">
            {activeTab === "chat" ? (
                renderContent()
            ) : (
                <div className="px-16 pt-8 pb-4 h-full overflow-auto">
                    {renderContent()}
                </div>
            )}
        </main>
    );
}; 