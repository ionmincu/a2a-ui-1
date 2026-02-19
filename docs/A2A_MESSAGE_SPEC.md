# A2A Message Send Specification

> **Status:** Verified working with A2A 0.3.1-preview (.NET SDK)  
> **Last verified:** February 2026

## Overview

This document defines the correct JSON structure for sending messages with file attachments via the A2A protocol `message/send` JSON-RPC method.

## JSON-RPC Envelope

```json
{
  "jsonrpc": "2.0",
  "id": "<uuid>",
  "method": "message/send",
  "params": {
    "message": { ... },
    "configuration": { ... }
  }
}
```

## Message Structure (`params`)

```json
{
  "message": {
    "messageId": "a5ad7c89-b1d3-4cde-ad1c-f87f5560141a",
    "role": "user",
    "parts": [
      {
        "text": "what do you see?",
        "kind": "text"
      },
      {
        "kind": "file",
        "file": {
          "kind": "bytes",
          "bytes": "<base64-encoded-content>",
          "name": "car2.jpg",
          "mimeType": "image/jpeg"
        }
      }
    ],
    "kind": "message",
    "contextId": "19b244ef-f028-4df4-bf90-e173c02e3576"
  },
  "configuration": {
    "acceptedOutputModes": [
      "text"
    ],
    "historyLength": 0,
    "blocking": true
  }
}
```

## Parts

### TextPart

```json
{
  "kind": "text",
  "text": "your message here"
}
```

| Field  | Required | Description          |
|--------|----------|----------------------|
| `kind` | **Yes**  | Must be `"text"`     |
| `text` | **Yes**  | The text content     |

### FilePart (with bytes)

```json
{
  "kind": "file",
  "file": {
    "kind": "bytes",
    "bytes": "<base64-encoded-content>",
    "name": "document.pdf",
    "mimeType": "application/pdf"
  }
}
```

| Field           | Required | Description                                              |
|-----------------|----------|----------------------------------------------------------|
| `kind`          | **Yes**  | Must be `"file"` (on the part)                           |
| `file`          | **Yes**  | Nested file object                                       |
| `file.kind`     | **Yes**  | Discriminator: `"bytes"` for inline content              |
| `file.bytes`    | **Yes**  | Base64-encoded file content                              |
| `file.name`     | No       | File name                                                |
| `file.mimeType` | No       | MIME type (defaults to `application/octet-stream`)       |

### FilePart (with URI)

```json
{
  "kind": "file",
  "file": {
    "kind": "uri",
    "uri": "urn:uipath:cas:file:orchestrator:12345",
    "name": "report.pdf",
    "mimeType": "application/pdf"
  }
}
```

| Field           | Required | Description                                              |
|-----------------|----------|----------------------------------------------------------|
| `kind`          | **Yes**  | Must be `"file"` (on the part)                           |
| `file`          | **Yes**  | Nested file object                                       |
| `file.kind`     | **Yes**  | Discriminator: `"uri"` for URI reference                 |
| `file.uri`      | **Yes**  | URI pointing to the file                                 |
| `file.name`     | No       | File name                                                |
| `file.mimeType` | No       | MIME type                                                |

## Key Rules

1. **`file` must be a nested object** — `bytes`, `name`, `mimeType` go inside `file`, NOT at the top level of the part.
2. **`file.kind` is required** — The A2A 0.3.1-preview library uses `JsonPolymorphicAttribute` on `FileContent` and needs the `"kind"` discriminator (`"bytes"` or `"uri"`) to deserialize correctly.
3. **Do NOT use `$type`** — Properties starting with `$` are rejected by the .NET JSON serializer when metadata support is enabled.
4. **Do NOT use `type: "FileWithBytes"`** — The discriminator field is `kind`, not `type`.

## Configuration

| Field                  | Required | Description                                       |
|------------------------|----------|---------------------------------------------------|
| `acceptedOutputModes`  | No       | Array of accepted output modes (e.g., `["text"]`) |
| `historyLength`        | No       | Number of history messages included                |
| `blocking`             | No       | `true` for synchronous, `false` for async          |

## Message Fields

| Field       | Required | Description                                          |
|-------------|----------|------------------------------------------------------|
| `messageId` | **Yes**  | Unique message identifier (UUID)                     |
| `role`      | **Yes**  | `"user"` or `"agent"`                                |
| `parts`     | **Yes**  | Array of `TextPart`, `FilePart`, or `DataPart`       |
| `kind`      | **Yes**  | Must be `"message"`                                  |
| `contextId` | No       | Conversation context identifier                      |

## Common Errors

| Error | Cause |
|-------|-------|
| `FilePart must have either 'bytes' or 'uri'` | `file` object is missing, empty, or missing the `kind` discriminator |
| `Properties that start with '$' are not allowed` | Used `$type` instead of `kind` as discriminator |
| `Failed to deserialize MessageSendParams` | Malformed JSON structure |
