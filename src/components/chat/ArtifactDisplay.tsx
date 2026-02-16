import React from 'react';

import {
  Database,
  Download,
  FileText,
} from 'lucide-react';

import {
  Artifact,
  Part,
} from '@/a2a/schema';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
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

interface ArtifactDisplayProps {
    artifact: Artifact;
}

interface PartDisplayProps {
    part: Part;
    index: number;
}

const PartDisplay: React.FC<PartDisplayProps> = ({ part, index }) => {
    switch (part.kind) {
        case "text":
            return (
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Text Part {index + 1}</span>
                    </div>
                    <div className="bg-muted/50 rounded-md p-3 whitespace-pre-wrap break-words text-sm">
                        {part.text}
                    </div>
                    {part.metadata && Object.keys(part.metadata).length > 0 && (
                        <div className="text-xs text-muted-foreground">
                            <strong>Metadata:</strong> {JSON.stringify(part.metadata, null, 2)}
                        </div>
                    )}
                </div>
            );

        case "file": {
            const fileData = part.file;
            const isImage = fileData.mimeType?.startsWith('image/');
            const bytesContent = 'bytes' in fileData ? fileData.bytes : undefined;
            const uriContent = 'uri' in fileData ? fileData.uri : undefined;

            return (
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <Download className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">File Part {index + 1}</span>
                    </div>
                    <div className="bg-muted/50 rounded-md p-3">
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
                            <div className="flex items-center gap-2 mt-2">
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
                    {part.metadata && Object.keys(part.metadata).length > 0 && (
                        <div className="text-xs text-muted-foreground">
                            <strong>Metadata:</strong> {JSON.stringify(part.metadata, null, 2)}
                        </div>
                    )}
                </div>
            );
        }

        case "data":
            return (
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <Database className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Data Part {index + 1}</span>
                    </div>
                    <div className="bg-muted/50 rounded-md p-3">
                        <pre className="text-xs whitespace-pre-wrap break-words">
                            {JSON.stringify(part.data, null, 2)}
                        </pre>
                    </div>
                    {part.metadata && Object.keys(part.metadata).length > 0 && (
                        <div className="text-xs text-muted-foreground">
                            <strong>Metadata:</strong> {JSON.stringify(part.metadata, null, 2)}
                        </div>
                    )}
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

export const ArtifactDisplay: React.FC<ArtifactDisplayProps> = ({ artifact }) => {
    return (
        <Card className="mt-2 border-l-4 border-l-blue-500">
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">
                        {artifact.name || `Artifact ${artifact.artifactId}`}
                    </CardTitle>
                    <Badge variant="secondary" className="text-xs">
                        {artifact.parts.length} part{artifact.parts.length !== 1 ? "s" : ""}
                    </Badge>
                </div>
                {artifact.description && (
                    <CardDescription className="text-xs">
                        {artifact.description}
                    </CardDescription>
                )}
                {artifact.extensions && artifact.extensions.length > 0 && (
                    <div className="flex gap-1 flex-wrap">
                        {artifact.extensions.map((ext, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                                {ext}
                            </Badge>
                        ))}
                    </div>
                )}
            </CardHeader>
            <CardContent className="space-y-4">
                {artifact.parts.map((part, index) => (
                    <PartDisplay key={index} part={part} index={index} />
                ))}
                {artifact.metadata && Object.keys(artifact.metadata).length > 0 && (
                    <div className="text-xs text-muted-foreground border-t pt-2">
                        <strong>Artifact Metadata:</strong>
                        <pre className="mt-1 whitespace-pre-wrap">
                            {JSON.stringify(artifact.metadata, null, 2)}
                        </pre>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}; 