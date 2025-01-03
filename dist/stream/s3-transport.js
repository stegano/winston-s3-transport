"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const winston_transport_1 = __importDefault(require("winston-transport"));
const client_s3_1 = require("@aws-sdk/client-s3");
const node_gzip_1 = require("node-gzip");
const log_stream_1 = __importDefault(require("./log-stream"));
class S3Transport extends winston_transport_1.default {
    constructor(options) {
        super(options);
        this.streams = {};
        /**
         * options
         */
        const { s3ClientConfig, S3TransportConfig } = options;
        /**
         * default config values
         */
        this.s3TransportConfig = Object.assign({ 
            /**
             * bucketPath
             */
            bucketPath: () => "default", 
            /**
             * maxBufferCount
             */
            maxBufferCount: 50, 
            /**
             * maxBufferSize
             */
            maxBufferSize: 1024, 
            /**
             * maxFileSize
             */
            maxFileSize: 1024 * 2, 
            /**
             * gzip
             */
            gzip: false }, S3TransportConfig);
        this.s3Client = new client_s3_1.S3Client(s3ClientConfig);
    }
    log(log, next) {
        return __awaiter(this, void 0, void 0, function* () {
            const bucketPath = this.s3TransportConfig.bucketPath(log);
            if (bucketPath in this.streams === false) {
                /**
                 * If the number of buffer size exceeds the maximum number of buffer sizes,
                 * the stream with the most written data is removed and a new stream is created.
                 */
                if (Object.keys(this.streams).length >=
                    this.s3TransportConfig.maxBufferCount) {
                    const sortedStreams = Object.entries(this.streams).sort((a, b) => b[1].writtenBytes - a[1].writtenBytes);
                    const [, stream] = sortedStreams[0];
                    stream.flush();
                }
                /**
                 * Create a new stream
                 */
                const logStream = new log_stream_1.default(this.s3TransportConfig.maxBufferSize);
                this.streams[bucketPath] = logStream;
                /**
                 * If all data in the buffer is uploaded, the stream is closed and deleted from the streams object
                 */
                this.s3Client
                    .send(new client_s3_1.PutObjectCommand({
                    Bucket: "bucsketPath",
                    Key: bucketPath,
                    Body: logStream,
                }))
                    .then(() => {
                    delete this.streams[bucketPath];
                })
                    .catch(() => {
                    delete this.streams[bucketPath];
                });
                logStream.once("error", () => {
                    /**
                     * If an error occurs, delete the stream.
                     */
                    delete this.streams[bucketPath];
                });
            }
            const stream = this.streams[bucketPath];
            const logData = this.s3TransportConfig.gzip
                ? yield (0, node_gzip_1.gzip)(`${JSON.stringify(log)}\n`)
                : Buffer.from(`${JSON.stringify(log)}\n`);
            /**
             * Write log data to the stream.
             */
            stream.write(logData);
            /**
             * If the buffer size exceeds the maximum buffer size, the buffer is flushed.
             */
            if (stream.writtenBytes >= this.s3TransportConfig.maxFileSize) {
                stream.flush();
            }
            next === null || next === void 0 ? void 0 : next();
        });
    }
}
exports.default = S3Transport;
