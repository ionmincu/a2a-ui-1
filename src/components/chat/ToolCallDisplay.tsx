import React, { useState } from 'react';

import {
  ChevronDown,
  ChevronRight,
  Loader2,
  CheckCircle2,
  Wrench,
} from 'lucide-react';

import { ToolCall } from '@/types/chat';

interface ToolCallDisplayProps {
    toolCalls: ToolCall[];
}

const ToolCallItem: React.FC<{ toolCall: ToolCall }> = ({ toolCall }) => {
    const [expanded, setExpanded] = useState(false);
    const isRunning = toolCall.phase === 'start';

    return (
        <div className="border border-border/50 rounded-lg overflow-hidden bg-background/50">
            {/* Header */}
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-muted/50 transition-colors"
            >
                {/* Expand/collapse icon */}
                {expanded
                    ? <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
                    : <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
                }

                {/* Status icon */}
                {isRunning ? (
                    <Loader2 className="h-3.5 w-3.5 text-blue-500 animate-spin shrink-0" />
                ) : (
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                )}

                {/* Tool icon + name */}
                <Wrench className="h-3 w-3 text-muted-foreground shrink-0" />
                <span className="font-medium text-foreground truncate">
                    {toolCall.toolName}
                </span>

                {/* Status label */}
                <span className={`ml-auto text-[10px] px-1.5 py-0.5 rounded-full shrink-0 ${
                    isRunning
                        ? 'bg-blue-500/10 text-blue-500'
                        : 'bg-green-500/10 text-green-500'
                }`}>
                    {isRunning ? 'running' : 'done'}
                </span>
            </button>

            {/* Expanded details */}
            {expanded && (
                <div className="border-t border-border/50 px-3 py-2 space-y-2">
                    {/* Input */}
                    {toolCall.input && Object.keys(toolCall.input).length > 0 && (
                        <div>
                            <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">
                                Input
                            </div>
                            <pre className="text-[11px] text-foreground/80 bg-muted/50 rounded p-2 overflow-x-auto max-h-32 whitespace-pre-wrap break-words">
                                {JSON.stringify(toolCall.input, null, 2)}
                            </pre>
                        </div>
                    )}

                    {/* Output */}
                    {toolCall.output && (
                        <div>
                            <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">
                                Output
                            </div>
                            <pre className="text-[11px] text-foreground/80 bg-muted/50 rounded p-2 overflow-x-auto max-h-48 whitespace-pre-wrap break-words">
                                {toolCall.output}
                            </pre>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export const ToolCallDisplay: React.FC<ToolCallDisplayProps> = ({ toolCalls }) => {
    if (!toolCalls || toolCalls.length === 0) return null;

    return (
        <div className="space-y-1.5 my-1">
            {toolCalls.map((toolCall) => (
                <ToolCallItem key={toolCall.toolCallId} toolCall={toolCall} />
            ))}
        </div>
    );
};
