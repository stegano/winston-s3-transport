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
const node_zlib_1 = require("node:zlib");
const winston_transport_1 = __importDefault(require("winston-transport"));
const client_s3_1 = require("@aws-sdk/client-s3");
const lib_storage_1 = require("@aws-sdk/lib-storage");
const stream_1 = require("stream");
const s3_transport_interface_1 = require("./s3-transport.interface");
class S3Transport extends winston_transport_1.default {
    constructor(options) {
        super(options);
        this.streamInfos = new Map();
        /**
         * options
         */
        const { s3ClientConfig, s3TransportConfig } = options;
        /**
         * default config values
         */
        this.s3TransportConfig = Object.assign({ 
            /**
             * generateGroup
             */
            generateGroup: () => "default", 
            /**
             * generateBucketPath
             */
            generateBucketPath: () => "", 
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
             * maxFileAge
             */
            maxFileAge: 1000 * 60 * 5, 
            /**
             * maxIdleTime
             */
            maxIdleTime: 1000 * 10, 
            /**
             * gzip
             */
            gzip: false }, s3TransportConfig);
        this.s3Client = new client_s3_1.S3Client(s3ClientConfig);
        process
            .on("SIGINT", () => __awaiter(this, void 0, void 0, function* () {
            yield this.close();
            process.exit(0);
        }))
            .on("SIGTERM", () => __awaiter(this, void 0, void 0, function* () {
            yield this.close();
            process.exit(0);
        }))
            .on("beforeExit", () => __awaiter(this, void 0, void 0, function* () {
            yield this.close();
        }));
    }
    log(log, next) {
        return __awaiter(this, void 0, void 0, function* () {
            const { bucket, generateGroup, generateBucketPath, maxBufferSize, maxBufferCount, maxIdleTime, maxFileSize, maxFileAge, gzip, } = this.s3TransportConfig;
            /**
             * Generate the log group for the path.
             */
            const group = generateGroup(log);
            const data = `${JSON.stringify(log)}\n`;
            const dataBuffer = Buffer.from(data);
            /**
             * Get the streamInfo object for the group.
             */
            let groupStreamInfo = this.streamInfos.get(group);
            /**
             * If the buffer size exceeds the maximum buffer size, the buffer is flushed.
             */
            if (groupStreamInfo &&
                groupStreamInfo[s3_transport_interface_1.StreamInfoName.TotalWrittenBytes] +
                    dataBuffer.byteLength >=
                    maxFileSize) {
                yield new Promise((resolve) => {
                    groupStreamInfo === null || groupStreamInfo === void 0 ? void 0 : groupStreamInfo[s3_transport_interface_1.StreamInfoName.Stream].end(() => {
                        resolve();
                    });
                });
            }
            /**
             * Get the streamInfo object for the group.
             */
            groupStreamInfo = this.streamInfos.get(group);
            if (groupStreamInfo === undefined) {
                /**
                 * If the number of buffer size exceeds the maximum number of buffer sizes,
                 * the stream with the most written data is removed and a new stream is created.
                 */
                if (this.streamInfos.size >= maxBufferCount) {
                    const sortedStreamInfos = Array.from(this.streamInfos.entries()).sort((a, b) => b[1][0] - a[1][0]);
                    const [, firstStreamInfo] = sortedStreamInfos[0];
                    const [, firstStream] = firstStreamInfo;
                    firstStream.end();
                }
                /**
                 * Create a new streamInfo
                 */
                const bucketPathStream = new stream_1.PassThrough({
                    highWaterMark: maxBufferSize,
                });
                /**
                 * If all data in the buffer is uploaded, the stream is closed and deleted from the streams object
                 */
                const uploadPromise = new lib_storage_1.Upload({
                    client: this.s3Client,
                    params: {
                        Bucket: bucket,
                        Key: generateBucketPath(group, log),
                        Body: gzip ? bucketPathStream.pipe((0, node_zlib_1.createGzip)()) : bucketPathStream,
                        ContentType: "application/jsonl",
                        ContentEncoding: gzip ? "gzip" : undefined,
                    },
                }).done();
                /**
                 * If the maximum file age is set,
                 * the stream is automatically closed after the set time.
                 */
                let autoFlushProcId;
                if (maxFileAge > 0) {
                    autoFlushProcId = setTimeout(() => {
                        bucketPathStream.end();
                    }, maxFileAge);
                }
                uploadPromise
                    .then(() => {
                    this.streamInfos.delete(group);
                    clearTimeout(autoFlushProcId);
                })
                    .catch((error) => {
                    // eslint-disable-next-line no-console
                    console.error(error);
                    this.streamInfos.delete(group);
                    clearTimeout(autoFlushProcId);
                });
                bucketPathStream.once("error", () => {
                    /**
                     * If an error occurs, delete the stream.
                     */
                    this.streamInfos.delete(group);
                    clearTimeout(autoFlushProcId);
                });
                groupStreamInfo = [
                    0,
                    bucketPathStream,
                    uploadPromise,
                    null,
                ];
                this.streamInfos.set(group, groupStreamInfo);
            }
            /**
             * Write log data to the stream.
             */
            groupStreamInfo[s3_transport_interface_1.StreamInfoName.Stream].write(dataBuffer);
            groupStreamInfo[s3_transport_interface_1.StreamInfoName.TotalWrittenBytes] += dataBuffer.length;
            if (groupStreamInfo[s3_transport_interface_1.StreamInfoName.ClearProcId] !== null) {
                /**
                 * If the clearProcId is not null, clear the timeout.
                 */
                clearTimeout(groupStreamInfo[s3_transport_interface_1.StreamInfoName.ClearProcId]);
            }
            groupStreamInfo[s3_transport_interface_1.StreamInfoName.ClearProcId] = setTimeout(() => {
                if (groupStreamInfo === undefined) {
                    return;
                }
                /**
                 * Close the stream after 10 seconds have passed since the data was written.
                 */
                const clearProcId = groupStreamInfo[s3_transport_interface_1.StreamInfoName.ClearProcId];
                if (clearProcId) {
                    clearTimeout(clearProcId);
                    groupStreamInfo[s3_transport_interface_1.StreamInfoName.ClearProcId] = null;
                    groupStreamInfo[s3_transport_interface_1.StreamInfoName.Stream].end();
                }
            }, maxIdleTime);
            next === null || next === void 0 ? void 0 : next();
        });
    }
    close() {
        return __awaiter(this, void 0, void 0, function* () {
            /**
             * Close streams.
             */
            const promiseList = [...this.streamInfos.values()].map((groupStreamInfo) => {
                const [, stream, uploadPromise] = groupStreamInfo;
                stream.end();
                return uploadPromise;
            });
            yield Promise.all(promiseList);
        });
    }
}
exports.default = S3Transport;
