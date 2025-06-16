import {useAgentState} from "@/a2a/state/agent/agentStateContext";

export default function TaskListPage() {

    const { agentState } = useAgentState();

    return (
        <div>
            <div className="flex items-center justify-between mb-8">
                {/* Left block: heading + description */}
                <div>
                    <h2 className="text-2xl font-semibold">Tasks</h2>
                    <p className="text-muted-foreground">
                        This is the page where you can manage and monitor tasks.
                    </p>
                </div>
            </div>
            <div className="space-y-4">
                <p className="text-muted-foreground">No tasks available yet. Tasks will appear here when created.</p>
            </div>
        </div>
    );
}
