import React from "react";
import { Button } from "@/components/ui/button";
import { TabType } from "@/types/chat";
import { ThemeToggle } from "@/components/ThemeToggle";

interface HeaderProps {
    activeTab: TabType;
    onTabChange: (tab: TabType) => void;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, onTabChange }) => {
    const navigationItems = [
        { key: "chats" as TabType, label: "Conversations" },
        { key: "agents" as TabType, label: "Agents" },
        { key: "events" as TabType, label: "Event List" },
        { key: "tasks" as TabType, label: "Tasks" },
        { key: "settings" as TabType, label: "Settings" },
    ];

    return (
        <header className="bg-background border-b p-4 flex items-center justify-between">
            <h1 className="pl-12 text-xl font-bold text-foreground">A2A UI</h1>

            <div className="flex items-center space-x-4">
                <nav className="space-x-8">
                    {navigationItems.map((item) => (
                        <Button
                            key={item.key}
                            variant={activeTab === item.key || (activeTab === "chat" && item.key === "chats") ? "default" : "ghost"}
                            className="text-md cursor-pointer"
                            onClick={() => onTabChange(item.key)}
                        >
                            {item.label}
                        </Button>
                    ))}
                </nav>
                
                <div className="pr-12">
                    <ThemeToggle />
                </div>
            </div>
        </header>
    );
}; 