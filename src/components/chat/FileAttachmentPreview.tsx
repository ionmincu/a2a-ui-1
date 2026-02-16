import React from 'react';

import {
  File,
  FileCode,
  FileSpreadsheet,
  FileText,
  Image,
  Loader2,
  X,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { FileAttachment } from '@/types/chat';

interface FileAttachmentPreviewProps {
    files: FileAttachment[];
    onRemove: (id: string) => void;
    disabled?: boolean;
}

const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
};

const getFileIcon = (type: string) => {
    if (type.startsWith("image/")) return <Image className="h-4 w-4 text-green-500" />;
    if (type === "application/pdf") return <FileText className="h-4 w-4 text-red-500" />;
    if (type.includes("spreadsheet") || type === "text/csv") return <FileSpreadsheet className="h-4 w-4 text-emerald-500" />;
    if (type.includes("json") || type.includes("javascript") || type.includes("typescript") || type.includes("xml"))
        return <FileCode className="h-4 w-4 text-yellow-500" />;
    if (type.startsWith("text/")) return <FileText className="h-4 w-4 text-blue-500" />;
    return <File className="h-4 w-4 text-muted-foreground" />;
};

const FileAttachmentItem: React.FC<{
    file: FileAttachment;
    onRemove: (id: string) => void;
    disabled?: boolean;
}> = ({ file, onRemove, disabled }) => {
    const isImage = file.type.startsWith("image/");

    return (
        <div className="relative group flex items-center gap-2 bg-muted/60 rounded-lg px-3 py-2 border border-border/50 max-w-[200px]">
            {/* Thumbnail or icon */}
            {isImage && file.preview ? (
                <img
                    src={file.preview}
                    alt={file.name}
                    className="h-8 w-8 rounded object-cover flex-shrink-0"
                />
            ) : (
                <div className="h-8 w-8 rounded bg-muted flex items-center justify-center flex-shrink-0">
                    {file.status === 'reading' ? (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    ) : (
                        getFileIcon(file.type)
                    )}
                </div>
            )}

            {/* File info */}
            <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate text-foreground" title={file.name}>
                    {file.name}
                </p>
                <p className="text-[10px] text-muted-foreground">
                    {file.status === 'error' ? (
                        <span className="text-destructive">{file.error || 'Error'}</span>
                    ) : file.status === 'reading' ? (
                        'Reading...'
                    ) : (
                        formatFileSize(file.size)
                    )}
                </p>
            </div>

            {/* Remove button */}
            {!disabled && (
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity absolute -top-1.5 -right-1.5 rounded-full bg-muted-foreground/20 hover:bg-destructive hover:text-destructive-foreground"
                    onClick={() => onRemove(file.id)}
                >
                    <X className="h-3 w-3" />
                </Button>
            )}
        </div>
    );
};

export const FileAttachmentPreview: React.FC<FileAttachmentPreviewProps> = ({
    files,
    onRemove,
    disabled
}) => {
    if (files.length === 0) return null;

    return (
        <div className="px-6 pt-3">
            <div className="flex flex-wrap gap-2">
                {files.map((file) => (
                    <FileAttachmentItem
                        key={file.id}
                        file={file}
                        onRemove={onRemove}
                        disabled={disabled}
                    />
                ))}
            </div>
        </div>
    );
};

FileAttachmentPreview.displayName = 'FileAttachmentPreview';
