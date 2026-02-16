import React, {
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  ArrowUp,
  Paperclip,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { FileAttachment } from '@/types/chat';

import { FileAttachmentPreview } from './FileAttachmentPreview';

const MAX_FILE_SIZE_MB = 10;
const MAX_FILES = 10;

interface ChatInputProps {
    value: string;
    onChange: (value: string) => void;
    onSend: () => void;
    onKeyDown: (e: React.KeyboardEvent) => void;
    disabled: boolean;
    placeholder?: string;
    fileAttachments: FileAttachment[];
    onFileAttachmentsChange: (files: FileAttachment[]) => void;
}

/**
 * Read a File as base64 string (without data URL prefix).
 */
function readFileAsBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result as string;
            // Remove data URL prefix: "data:...;base64,"
            const base64 = result.split(",")[1] || "";
            resolve(base64);
        };
        reader.onerror = () => reject(new Error("Failed to read file"));
        reader.readAsDataURL(file);
    });
}

/**
 * Create a preview URL for image files.
 */
function createImagePreview(file: File): string | undefined {
    if (file.type.startsWith("image/")) {
        return URL.createObjectURL(file);
    }
    return undefined;
}

export const ChatInput = forwardRef<HTMLTextAreaElement, ChatInputProps>(({
    value,
    onChange,
    onSend,
    onKeyDown,
    disabled,
    placeholder = "Ask anything",
    fileAttachments,
    onFileAttachmentsChange
}, ref) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isDragOver, setIsDragOver] = useState(false);
    const dragCounterRef = useRef(0);

    // Auto-resize textarea
    useEffect(() => {
        if (ref && typeof ref === 'object' && ref.current) {
            const textarea = ref.current;
            textarea.style.height = '44px';
            const scrollHeight = textarea.scrollHeight;
            const maxHeight = 320; // max-h-80 = 20rem = 320px
            textarea.style.height = Math.min(scrollHeight, maxHeight) + 'px';
        }
    }, [value, ref]);

    // Cleanup preview URLs on unmount
    useEffect(() => {
        return () => {
            fileAttachments.forEach(f => {
                if (f.preview) URL.revokeObjectURL(f.preview);
            });
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const processFiles = useCallback(async (fileList: FileList | File[]) => {
        const files = Array.from(fileList);
        const currentCount = fileAttachments.length;
        const slotsAvailable = MAX_FILES - currentCount;

        if (slotsAvailable <= 0) {
            console.warn(`Maximum ${MAX_FILES} files allowed`);
            return;
        }

        const filesToProcess = files.slice(0, slotsAvailable);

        // Create initial attachment entries
        const newAttachments: FileAttachment[] = filesToProcess.map((file) => ({
            id: `file-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            file,
            name: file.name,
            size: file.size,
            type: file.type || "application/octet-stream",
            preview: createImagePreview(file),
            status: 'pending' as const,
        }));

        // Add to state immediately as pending
        const updatedAttachments = [...fileAttachments, ...newAttachments];
        onFileAttachmentsChange(updatedAttachments);

        // Read files in parallel and update status
        const readPromises = newAttachments.map(async (attachment) => {
            // Check file size
            if (attachment.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
                return {
                    ...attachment,
                    status: 'error' as const,
                    error: `File exceeds ${MAX_FILE_SIZE_MB}MB limit`,
                };
            }

            try {
                // Update status to reading
                attachment.status = 'reading';
                const base64 = await readFileAsBase64(attachment.file);
                return {
                    ...attachment,
                    base64,
                    status: 'ready' as const,
                };
            } catch {
                return {
                    ...attachment,
                    status: 'error' as const,
                    error: 'Failed to read file',
                };
            }
        });

        const processedAttachments = await Promise.all(readPromises);

        // Update all attachments with processed results - merge by replacing matching IDs
        onFileAttachmentsChange(
            updatedAttachments.map((existing) => {
                const processed = processedAttachments.find(p => p.id === existing.id);
                return processed || existing;
            })
        );
    }, [fileAttachments, onFileAttachmentsChange]);

    const handleFileSelect = useCallback(() => {
        fileInputRef.current?.click();
    }, []);

    const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            processFiles(e.target.files);
            // Reset input so same file can be selected again
            e.target.value = '';
        }
    }, [processFiles]);

    const handleRemoveFile = useCallback((id: string) => {
        const fileToRemove = fileAttachments.find(f => f.id === id);
        if (fileToRemove?.preview) {
            URL.revokeObjectURL(fileToRemove.preview);
        }
        onFileAttachmentsChange(fileAttachments.filter(f => f.id !== id));
    }, [fileAttachments, onFileAttachmentsChange]);

    // Drag and drop handlers
    const handleDragEnter = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounterRef.current++;
        if (e.dataTransfer.types.includes('Files')) {
            setIsDragOver(true);
        }
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounterRef.current--;
        if (dragCounterRef.current === 0) {
            setIsDragOver(false);
        }
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounterRef.current = 0;
        setIsDragOver(false);

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            processFiles(e.dataTransfer.files);
        }
    }, [processFiles]);

    // Handle paste event for images
    const handlePaste = useCallback((e: React.ClipboardEvent) => {
        const items = e.clipboardData?.items;
        if (!items) return;

        const fileItems: File[] = [];
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (item.kind === 'file') {
                const file = item.getAsFile();
                if (file) fileItems.push(file);
            }
        }

        if (fileItems.length > 0) {
            e.preventDefault();
            processFiles(fileItems);
        }
    }, [processFiles]);

    const hasContent = value.trim() || fileAttachments.some(f => f.status === 'ready');
    const hasFilesLoading = fileAttachments.some(f => f.status === 'pending' || f.status === 'reading');

    return (
        <div
            className={`border-t border-border px-6 pt-4 pb-4 w-full transition-colors ${
                isDragOver ? 'bg-primary/5 border-t-primary/50' : ''
            }`}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
        >
            {/* File attachment previews */}
            <FileAttachmentPreview
                files={fileAttachments}
                onRemove={handleRemoveFile}
                disabled={disabled}
            />

            {/* Drag overlay */}
            {isDragOver && (
                <div className="flex items-center justify-center py-4 mb-2">
                    <div className="text-sm text-primary font-medium flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-dashed border-primary/40 bg-primary/5">
                        <Paperclip className="h-4 w-4" />
                        Drop files here to attach
                    </div>
                </div>
            )}

            <div className={`relative flex items-center gap-3 ${fileAttachments.length > 0 ? 'mt-2' : ''}`}>
                {/* Hidden file input */}
                <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={handleFileInputChange}
                    disabled={disabled}
                />

                {/* Attach file button */}
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={handleFileSelect}
                    disabled={disabled || fileAttachments.length >= MAX_FILES}
                    className="rounded-full h-11 w-11 p-0 cursor-pointer flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    title={`Attach files (max ${MAX_FILES})`}
                >
                    <Paperclip className="h-5 w-5" />
                </Button>

                <Textarea
                    ref={ref}
                    placeholder={placeholder}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onKeyDown={onKeyDown}
                    onPaste={handlePaste}
                    disabled={disabled}
                    className="flex-1 py-3 px-4 rounded-2xl shadow-sm resize-none overflow-y-auto focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-0 border-2 focus-visible:border-primary/30 min-h-[44px] max-h-80 disabled:opacity-50 bg-background text-foreground placeholder:text-muted-foreground transition-all duration-200"
                    rows={1}
                    style={{
                        minHeight: '44px',
                        height: 'auto',
                    }}
                />
                <Button
                    onClick={onSend}
                    disabled={disabled || !hasContent || hasFilesLoading}
                    size="icon"
                    className="rounded-full h-11 w-11 p-0 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg transition-all duration-200 hover:shadow-xl"
                >
                    <ArrowUp className="h-5 w-5"/>
                </Button>
            </div>
        </div>
    );
});

ChatInput.displayName = 'ChatInput';