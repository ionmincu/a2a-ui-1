import React from "react";
import { Header } from "@/components/layout/Header";
import { TabContent } from "@/components/layout/TabContent";
import { useAppState } from "@/hooks/useAppState";
import { useHostState } from "@/a2a/state/host/hostStateContext";
import { useAppState as useAppContext } from "@/a2a/state/app/appStateContext";

export const App: React.FC = () => {
    const {
        activeTab,
        showAgentDetails,
        selectedAgent,
        conversation,
        handleTabChange,
        handleOpenConversation
    } = useAppState();

    const { isLoaded: hostStateLoaded } = useHostState();
    const { isLoaded: appStateLoaded } = useAppContext();

    // Show loading state until all data is loaded
    if (!hostStateLoaded || !appStateLoaded) {
        return (
            <div className="h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="text-muted-foreground text-lg mb-2">Loading A2A UI...</div>
                    <div className="text-muted-foreground/60 text-sm">Please wait while we load your data</div>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen flex flex-col overflow-hidden max-h-screen">
            <Header 
                activeTab={activeTab} 
                onTabChange={handleTabChange} 
            />
            
            <TabContent
                activeTab={activeTab}
                selectedAgent={selectedAgent}
                showAgentDetails={showAgentDetails}
                conversation={conversation}
                onChatTabChange={activeTab === "chat" ? () => {} : undefined}
                onOpenConversation={handleOpenConversation}
            />
        </div>
    );
}; 