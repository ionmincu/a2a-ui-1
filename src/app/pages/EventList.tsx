import {useAgentState} from "@/a2a/state/agent/agentStateContext";

export default function EventListPage() {

    const { agentState } = useAgentState();

    return (
        <div>
            <div className="flex items-center justify-between mb-8">
                {/* Left block: heading + description */}
                <div>
                    <h2 className="text-2xl font-semibold">Event List</h2>
                    <p className="text-muted-foreground">
                        This is the page where you can manage and view system events.
                    </p>
                </div>
            </div>
            <div className="space-y-4">
                <p className="text-muted-foreground">No events available yet. Events will appear here as they occur.</p>
            </div>
        </div>
    );
}
