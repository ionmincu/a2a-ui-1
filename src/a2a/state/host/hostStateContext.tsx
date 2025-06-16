"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect } from "react";
import {HostState} from "@/a2a/state/host/HostState";

// Constants for localStorage
const AGENTS_STORAGE_KEY = "a2a_agents";

// Utility functions for localStorage
const saveAgentsToStorage = (hostState: HostState) => {
    try {
        if (typeof window !== 'undefined') {
            localStorage.setItem(AGENTS_STORAGE_KEY, JSON.stringify(hostState.hosts));
        }
    } catch (error) {
        console.error("Failed to save agents to localStorage:", error);
    }
};

const loadAgentsFromStorage = (): HostState => {
    try {
        if (typeof window !== 'undefined') {
            const stored = localStorage.getItem(AGENTS_STORAGE_KEY);
            if (stored) {
                const hosts = JSON.parse(stored);
                return new HostState({ hosts });
            }
        }
    } catch (error) {
        console.error("Failed to load agents from localStorage:", error);
    }
    return new HostState();
};

// Define the shape of the context
interface HostStateContextType {
    hostState: HostState;
    setHostState: React.Dispatch<React.SetStateAction<HostState>>;
    saveAgents: () => void;
    isLoaded: boolean;
}

// Create the context with a default value of undefined.
// You will validate that the context is defined in the hook.
const HostStateContext = createContext<HostStateContextType | undefined>(undefined);

export const HostStateProvider = ({ children }: { children: ReactNode }) => {
    // Initialize with empty state to prevent hydration mismatch
    const [hostState, setHostState] = useState<HostState>(() => new HostState());
    const [isLoaded, setIsLoaded] = useState(false);

    // Load from localStorage on client side only
    useEffect(() => {
        const loadedState = loadAgentsFromStorage();
        setHostState(loadedState);
        setIsLoaded(true);
    }, []);

    // Save to localStorage whenever hostState changes (but only after initial load)
    useEffect(() => {
        if (isLoaded) {
            saveAgentsToStorage(hostState);
        }
    }, [hostState, isLoaded]);

    // Manual save function
    const saveAgents = () => {
        saveAgentsToStorage(hostState);
    };

    return (
        <HostStateContext.Provider value={{ hostState, setHostState, saveAgents, isLoaded }}>
            {children}
        </HostStateContext.Provider>
    );
};

// Custom hook for consuming the context.
export const useHostState = (): HostStateContextType => {
    const context = useContext(HostStateContext);
    if (!context) {
        throw new Error("useHostState must be used within an HostStateProvider");
    }
    return context;
};
