import {useAgentState} from "@/a2a/state/agent/agentStateContext";
import {useSettingsState} from "@/a2a/state/settings/settingsStateContext";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Check, RotateCcw, Save, Loader2 } from "lucide-react";

export default function SettingsPage() {

    const { agentState } = useAgentState();
    const { settingsState, setSettingsState, saveSettings, loadSettings, resetSettings, isLoaded } = useSettingsState();
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

    const handleSave = () => {
        setSaveStatus('saving');
        try {
            saveSettings();
            setSaveStatus('saved');
            setTimeout(() => setSaveStatus('idle'), 2000);
        } catch (error) {
            console.error('Failed to save settings:', error);
            setSaveStatus('idle');
        }
    };

    const handleReset = () => {
        if (confirm('Are you sure you want to reset all settings to defaults? This cannot be undone.')) {
            resetSettings();
            setSaveStatus('saved');
            setTimeout(() => setSaveStatus('idle'), 2000);
        }
    };

    const handleReload = () => {
        loadSettings();
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
    };

    // Show loading state while settings are being loaded
    if (!isLoaded) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading settings...
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h2 className="text-2xl font-semibold text-foreground">Settings</h2>
                    <p className="text-muted-foreground">
                        Configure application settings and preferences. Settings are automatically saved to your browser.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={handleReload} size="sm">
                        <RotateCcw className="h-4 w-4 mr-1" />
                        Reload
                    </Button>
                    <Button variant="outline" onClick={handleReset} size="sm">
                        Reset
                    </Button>
                    <Button onClick={handleSave} disabled={saveStatus === 'saving'}>
                        {saveStatus === 'saving' ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                Saving...
                            </>
                        ) : saveStatus === 'saved' ? (
                            <>
                                <Check className="h-4 w-4 mr-1" />
                                Saved
                            </>
                        ) : (
                            <>
                                <Save className="h-4 w-4 mr-1" />
                                Save
                            </>
                        )}
                    </Button>
                </div>
            </div>

            {/* Arize Phoenix Settings */}
            <div className="border rounded-lg p-6 bg-muted/50 space-y-4 max-w-xl">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-foreground">Arize Phoenix</h3>
                    <div className="flex items-center gap-2">
                        {settingsState.arize_phoenix_enabled && settingsState.arize_phoenix_url ? (
                            <div className="flex items-center gap-1 text-xs text-green-600">
                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                Configured
                            </div>
                        ) : (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                                Not configured
                            </div>
                        )}
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">
                        Server URL
                        <span className="text-xs text-muted-foreground/70 ml-1">
                            (e.g., http://localhost:6006)
                        </span>
                    </label>
                    <Input
                        value={settingsState.arize_phoenix_url}
                        onChange={(e) => setSettingsState(prev => ({
                            ...prev,
                            arize_phoenix_url: e.target.value
                        }))}
                        placeholder="http://localhost:6006"
                    />
                </div>

                <div className="flex items-center justify-between mt-4">
                    <div className="flex flex-col">
                        <span className="text-sm text-foreground">Enable Arize Phoenix Integration</span>
                        <span className="text-xs text-muted-foreground">
                            Show trace data in the chat sidebar
                        </span>
                    </div>
                    <Switch
                        checked={settingsState.arize_phoenix_enabled}
                        onCheckedChange={(val) => setSettingsState(prev => ({
                            ...prev,
                            arize_phoenix_enabled: val
                        }))}
                    />
                </div>

                {settingsState.arize_phoenix_enabled && (
                    <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-md border border-blue-200 dark:border-blue-800">
                        <p className="text-xs text-blue-700 dark:text-blue-300">
                            <strong>Note:</strong> Make sure your Phoenix server is running and accessible. 
                            The context ID from your conversations will be used as the Phoenix project identifier.
                        </p>
                    </div>
                )}
            </div>

            {/* Storage Info */}
            <div className="border rounded-lg p-4 bg-muted/30 max-w-xl">
                <h4 className="text-sm font-semibold text-foreground mb-2">Storage Information</h4>
                <p className="text-xs text-muted-foreground">
                    Settings are automatically saved to your browser's local storage. 
                    They will persist between sessions but are specific to this browser and domain.
                </p>
                <div className="mt-2 text-xs text-muted-foreground space-y-1">
                    <div>
                        <strong>Storage key:</strong> <code className="bg-muted px-1 rounded">a2a-ui-settings</code>
                    </div>
                    <div>
                        <strong>Status:</strong> 
                        <span className="ml-1 text-green-600">
                            ✓ Loaded and auto-saving
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
