/// <reference types="node" />
/// <reference types="node" />
import { Readable } from "stream";
/**
 * LogStream
 */
declare class LogStream extends Readable {
    buffer: Buffer;
    bufferEndBytePos: number;
    maxBufferSize: number;
    writtenBytes: number;
    constructor(maxBufferSize?: number);
    _read(size?: number): void;
    write(data: Buffer | string, immediately?: boolean): void;
    close(): void;
    flush(): void;
    getWrittenBytes(): number;
}
export default LogStream;
