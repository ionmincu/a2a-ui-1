# A2A Server Implementation Issues & Recommendations

This document outlines observations and recommendations for A2A server implementations based on testing with the UiPath agent.

## Issues Identified

### 1. Non-Standard Well-Known Endpoint Path

**Issue:**
- The agent uses `/.well-known/agent-card.json` instead of the standard `/.well-known/agent.json`
- This deviates from the A2A protocol specification

**Impact:**
- Clients expecting the standard path will fail to discover the agent card
- Requires custom client logic to try multiple paths

**Recommendation:**
```
✅ Use: /.well-known/agent.json (as per A2A spec)
❌ Avoid: /.well-known/agent-card.json (non-standard)
```

**Workaround Implemented:**
The client now tries both paths in order:
1. `/.well-known/agent-card.json` (UiPath-specific)
2. `/.well-known/agent.json` (standard)

---

### 2. Unsupported JSON-RPC Method: `agent/card`

**Issue:**
- The agent returns error `-32601` (Method not found) for `agent/card` JSON-RPC method
- Error message: `"Invalid JSON-RPC request: 'method' field is not a valid A2A method."`

**Impact:**
- Clients that don't support the well-known endpoint will fail
- No fallback mechanism for agent discovery

**Recommendation:**
```json
// Support the agent/card JSON-RPC method as a fallback
POST /agent-endpoint
{
  "jsonrpc": "2.0",
  "id": "request-id",
  "method": "agent/card",
  "params": null
}

// Should return:
{
  "jsonrpc": "2.0",
  "id": "request-id",
  "result": { /* AgentCard object */ }
}
```

**Workaround Implemented:**
- Client prioritizes well-known endpoint
- Only attempts JSON-RPC as fallback (which fails for UiPath)
- Provides clear error messages when both methods fail

---

### 3. `message/send` Returns Task Instead of Message

**Issue:**
- When calling `message/send`, the agent returns a `Task` object with the message nested inside `status.message`
- The A2A spec allows this but it's not the typical synchronous pattern

**Current Response Format:**
```json
{
  "jsonrpc": "2.0",
  "id": "request-id",
  "result": {
    "kind": "task",
    "id": "task-id",
    "status": {
      "state": "input-required",
      "message": {
        "kind": "message",
        "role": "agent",
        "parts": [{"kind": "text", "text": "response"}]
      }
    }
  }
}
```

**Expected Format (for synchronous responses):**
```json
{
  "jsonrpc": "2.0",
  "id": "request-id",
  "result": {
    "kind": "message",
    "role": "agent",
    "parts": [{"kind": "text", "text": "response"}],
    "messageId": "message-id"
  }
}
```

**Recommendation:**
- If the agent processes messages synchronously, return a `Message` directly
- Only return a `Task` if the processing is truly asynchronous and requires polling
- Document clearly in the agent card which pattern is used

**Workaround Implemented:**
The client now handles both response formats:
1. Direct `Message` objects
2. `Task` objects with nested `status.message`
3. `Task` objects with `artifacts` arrays

---

### 4. Response Time Concerns

**Observed Behavior:**
- Response time: ~11.5 seconds for a simple query
- Header shows: `x-envoy-upstream-service-time: 11531` (ms)

**Impact:**
- Default client timeouts (30-60s) may be insufficient
- Poor user experience for long-running operations

**Recommendation:**
- For long-running operations:
  - Return a `Task` immediately with `state: "working"`
  - Support `task/get` for status polling
  - Optionally support `task/subscribe` for streaming updates
  - Or use Server-Sent Events (SSE) for real-time updates

- For quick operations:
  - Return synchronous `Message` responses
  - Optimize processing to < 3 seconds when possible

**Workaround Implemented:**
- Client timeout increased to 5 minutes (300s)
- Proxy endpoint configured with 5-minute timeout
- Better timeout error messages

---

## Summary of Recommendations

### High Priority
1. ✅ **Use standard well-known endpoint**: `/.well-known/agent.json`
2. ✅ **Support `agent/card` JSON-RPC method** as fallback
3. ✅ **Return `Message` for synchronous responses**, not `Task`

### Medium Priority
4. ✅ **Optimize response times** or implement proper async pattern with polling
5. ✅ **Document response patterns** in agent card capabilities
6. ✅ **Add proper CORS headers** to avoid proxy requirements

### Low Priority
7. ✅ **Implement streaming support** for better UX on long operations
8. ✅ **Add conversation history support** (agent reported inability to recall history)

---

## Testing Recommendations

### For A2A Server Implementers

1. **Test with multiple clients**
   - Ensure compatibility with different A2A client implementations
   - Don't assume clients will work around non-standard behavior

2. **Follow the spec strictly**
   - Use standard endpoint paths
   - Support required JSON-RPC methods
   - Return expected response types

3. **Document deviations**
   - If you deviate from the spec, document why
   - Provide migration paths to standard implementations

4. **Performance testing**
   - Ensure responses are fast enough for synchronous patterns
   - Or implement proper async patterns with polling/streaming

---

## Client Compatibility Notes

This client implementation now supports:
- ✅ Multiple well-known endpoint paths
- ✅ Task and Message response formats
- ✅ Extended timeouts (5 minutes)
- ✅ Graceful fallback when methods not supported
- ✅ Detailed logging for debugging

However, **server-side fixes are still recommended** to ensure compatibility with other A2A clients.

---

## References

- [A2A Protocol Specification](https://github.com/a2a-community/a2a-protocol)
- Agent Card Well-Known URI: RFC 8615
- JSON-RPC 2.0 Specification: https://www.jsonrpc.org/specification

---

*Document generated: February 13, 2026*
*Based on testing with UiPath agent endpoint*
