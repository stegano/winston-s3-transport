"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-disable no-underscore-dangle */
/* eslint-disable @typescript-eslint/naming-convention */
const stream_1 = require("stream");
/**
 * LogStream
 */
class LogStream extends stream_1.Readable {
    constructor(maxBufferSize = 1024) {
        super();
        this.buffer = Buffer.alloc(maxBufferSize);
        this.bufferEndBytePos = 0;
        this.writtenBytes = 0;
        this.maxBufferSize = maxBufferSize;
    }
    // eslint-disable-next-line no-underscore-dangle
    _read(size) {
        if (size === undefined) {
            /**
             * If the size is not specified, the entire buffer is output.
             */
            this.flush();
            return;
        }
        /**
         * If the size is specified, output the buffer up to the specified size.
         */
        const _size = Math.min(size, this.bufferEndBytePos);
        /**
         * Output the buffer up to the specified size.
         */
        const subarray = this.buffer.subarray(0, _size);
        this.push(subarray);
        this.writtenBytes += subarray.byteLength;
        this.buffer = this.buffer.slice(_size);
        this.bufferEndBytePos -= subarray.byteLength;
    }
    write(data, immediately = false) {
        const dataBuffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
        if (immediately ||
            this.maxBufferSize < dataBuffer.byteLength + this.bufferEndBytePos) {
            this.flush();
            this.push(dataBuffer);
            this.writtenBytes += dataBuffer.byteLength;
            return;
        }
        dataBuffer.copy(this.buffer, this.bufferEndBytePos);
        this.bufferEndBytePos += dataBuffer.byteLength;
    }
    close() {
        this.flush();
        this.push(null);
    }
    flush() {
        if (this.bufferEndBytePos > 0) {
            this.push(this.buffer.subarray(0, this.bufferEndBytePos));
            this.writtenBytes += this.bufferEndBytePos;
            this.buffer.fill(0);
            this.bufferEndBytePos = 0;
        }
    }
    getWrittenBytes() {
        return this.writtenBytes;
    }
}
exports.default = LogStream;
