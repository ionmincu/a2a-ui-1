import React from 'react';

import {
  Database,
  Download,
  FileText,
} from 'lucide-react';

import { Part } from '@/a2a/schema';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

/**
 * Download a base64 encoded file.
 */
function downloadBase64File(base64: string, filename: string, mimeType: string) {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: mimeType || 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || 'download';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

interface PartsDisplayProps {
    parts: Part[];
}

interface PartItemProps {
    part: Part;
    index: number;
}

const PartItem: React.FC<PartItemProps> = ({ part, index }) => {
    const getPartIcon = (kind: string) => {
        switch (kind) {
            case "text":
                return <FileText className="h-4 w-4" />;
            case "file":
                return <Download className="h-4 w-4" />;
            case "data":
                return <Database className="h-4 w-4" />;
            default:
                return <div className="h-4 w-4 bg-muted rounded" />;
        }
    };

    const getPartTitle = (kind: string) => {
        switch (kind) {
            case "text":
                return "Text";
            case "file":
                return "File";
            case "data":
                return "Data";
            default:
                return "Unknown";
        }
    };

    const renderPartContent = () => {
        switch (part.kind) {
            case "text":
                return (
                    <div className="bg-muted/30 rounded-md p-3 whitespace-pre-wrap break-words text-sm">
                        {part.text}
                    </div>
                );

            case "file": {
                const fileData = part.file;
                const isImage = fileData.mimeType?.startsWith('image/');
                const bytesContent = 'bytes' in fileData ? fileData.bytes : undefined;
                const uriContent = 'uri' in fileData ? fileData.uri : undefined;

                return (
                    <div className="bg-muted/30 rounded-md p-3 space-y-2">
                        <div className="text-sm">
                            <strong>Name:</strong> {fileData.name || "Untitled file"}
                        </div>
                        {fileData.mimeType && (
                            <div className="text-sm">
                                <strong>Type:</strong> {fileData.mimeType}
                            </div>
                        )}
                        {/* Inline image preview */}
                        {isImage && bytesContent && (
                            <div className="mt-2">
                                <img
                                    src={`data:${fileData.mimeType};base64,${bytesContent}`}
                                    alt={fileData.name || 'Image'}
                                    className="max-w-full max-h-64 rounded-md border"
                                />
                            </div>
                        )}
                        {isImage && uriContent && (
                            <div className="mt-2">
                                <img
                                    src={uriContent}
                                    alt={fileData.name || 'Image'}
                                    className="max-w-full max-h-64 rounded-md border"
                                />
                            </div>
                        )}
                        {uriContent && (
                            <div className="text-sm">
                                <strong>URL:</strong>{" "}
                                <a
                                    href={uriContent}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary hover:underline"
                                >
                                    {uriContent}
                                </a>
                            </div>
                        )}
                        {bytesContent && (
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-muted-foreground">
                                    Base64 data ({bytesContent.length} chars)
                                </span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 text-xs"
                                    onClick={() => downloadBase64File(
                                        bytesContent,
                                        fileData.name || 'download',
                                        fileData.mimeType || 'application/octet-stream'
                                    )}
                                >
                                    <Download className="h-3 w-3 mr-1" />
                                    Download
                                </Button>
                            </div>
                        )}
                    </div>
                );
            }

            case "data":
                return (
                    <div className="bg-muted/30 rounded-md p-3">
                        <pre className="text-xs whitespace-pre-wrap break-words">
                            {JSON.stringify(part.data, null, 2)}
                        </pre>
                    </div>
                );

            default:
                return (
                    <div className="text-sm text-muted-foreground">
                        Unknown part type: {(part as any).kind}
                    </div>
                );
        }
    };

    return (
        <Card className="border-l-4 border-l-green-500">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                    {getPartIcon(part.kind)}
                    {getPartTitle(part.kind)} Part {index + 1}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
                {renderPartContent()}
                {part.metadata && Object.keys(part.metadata).length > 0 && (
                    <div className="text-xs text-muted-foreground border-t pt-2">
                        <strong>Metadata:</strong>
                        <pre className="mt-1 whitespace-pre-wrap">
                            {JSON.stringify(part.metadata, null, 2)}
                        </pre>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export const PartsDisplay: React.FC<PartsDisplayProps> = ({ parts }) => {
    if (!parts || parts.length === 0) {
        return null;
    }

    return (
        <div className="mt-2 space-y-2">
            {parts.map((part, index) => (
                <PartItem key={index} part={part} index={index} />
            ))}
        </div>
    );
}; 