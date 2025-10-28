# Reference Implementation Notes

## Meshtastic Web Client

The `reference-implementations/web` directory contains the official Meshtastic web client implementation. This is a valuable reference for understanding how to communicate with Meshtastic devices.

### Key Information

- **Location**: `reference-implementations/web`
- **Purpose**: Reference implementation showing proper patterns for Meshtastic device communication
- **Use Cases**:
  - Understanding device connection protocols
  - Learning how to handle Meshtastic messages
  - Reference for transport layer implementations (Bluetooth, Serial, HTTP)
  - Protobuf definitions and usage patterns

### Transport Implementations Available

The reference implementation includes multiple transport packages:

- `transport-web-bluetooth/` - WebBluetooth API integration
- `transport-web-serial/` - Web Serial API integration
- `transport-http/` - HTTP transport layer
- `transport-node/` - Node.js transport
- `transport-node-serial/` - Node.js serial transport
- `transport-deno/` - Deno runtime transport

### Protobuf Definitions

**Note**: This project uses its own fork of the Meshtastic protobufs (located at `protobufs/` submodule) to support custom modifications and extensions. Do **not** use the protobuf definitions from `reference-implementations/web/packages/protobufs/` - those are only for reference.

- **Our Protobufs**: `protobufs/` (git submodule - MeshEnvy/protobufs fork)
- **Reference Only**: `reference-implementations/web/packages/protobufs/` (upstream reference)
- TypeScript types will be generated from our own protobuf fork, not the reference implementation

### Notes

When implementing Meshtastic device communication features in the main app, refer to this implementation for:

- Proper connection handling
- Message encoding/decoding
- Device state management
- Error handling patterns
- Type definitions and interfaces
