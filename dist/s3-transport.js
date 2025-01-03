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
const date_fns_1 = require("date-fns");
const node_gzip_1 = require("node-gzip");
class S3Transport extends winston_transport_1.default {
    constructor(options) {
        super(options);
        /**
         * Default config values
         */
        this.s3TransportConfig = Object.assign({ 
            /**
             * Group for logs classification.
             */
            group: "default", 
            /**
             * 1000ms x 20 ⇛ 20s
             */
            dataUploadInterval: 1000 * 20, 
            /**
             * 1000ms x 60 ⇛ 60s
             */
            fileRotationInterval: 1000 * 60, 
            /**
             * 1000Byte(1KB) x 1000(1MB) x 2 ⇛ 2MB
             */
            maxDataSize: 1000 * 1000 * 2, 
            /**
             * Whether to use gzip compression
             */
            gzip: false }, options.s3TransportConfig);
        this.s3Client = new client_s3_1.S3Client(options.s3ClientConfig);
        this.logGroups = {};
        setInterval(() => __awaiter(this, void 0, void 0, function* () {
            /**
             * Upload files to S3 bucket sequentially (not in parallel).
             */
            yield this.updateLogGroupList(Object.keys(this.logGroups));
        }), this.s3TransportConfig.dataUploadInterval);
    }
    updateLogGroupList(logGroupIdList = []) {
        return __awaiter(this, void 0, void 0, function* () {
            const [groupId, ...rest] = logGroupIdList;
            if (groupId === undefined) {
                /**
                 * If the item does not exist
                 */
                return true;
            }
            const logGroup = this.logGroups[groupId];
            if (logGroup.data.length === 0) {
                /**
                 * If the item to be uploaded does not exist
                 */
                return true;
            }
            const { bucket, bucketPath, data, uploadTime, createdTime } = logGroup;
            const { dataUploadInterval, fileRotationInterval } = this.s3TransportConfig;
            if ((0, date_fns_1.isAfter)(new Date(), (0, date_fns_1.addMilliseconds)(createdTime, fileRotationInterval))) {
                /**
                 * Upload data and remove from `logGroups` when file rotation cycle is exceeded
                 */
                const logData = [...data];
                delete this.logGroups[groupId];
                yield S3Transport.uploadToS3Bucket(this.s3Client, bucket, bucketPath, logData, this.s3TransportConfig.gzip);
                logGroup.bucketPath = S3Transport.createBucketPath(groupId, this.s3TransportConfig);
            }
            if ((0, date_fns_1.isAfter)(new Date(), (0, date_fns_1.addMilliseconds)(uploadTime || 0, dataUploadInterval)) &&
                logGroup.isUpdated) {
                /**
                 * If the data upload cycle has been exceeded
                 */
                logGroup.uploadTime = new Date();
                logGroup.isUpdated = false;
                yield S3Transport.uploadToS3Bucket(this.s3Client, bucket, bucketPath, data, this.s3TransportConfig.gzip);
            }
            return this.updateLogGroupList(rest);
        });
    }
    /**
     * Create bucket path
     */
    static createBucketPath(groupId, s3TransportConfig) {
        const { bucketPath: configBucketPath } = s3TransportConfig;
        const bucketPath = typeof configBucketPath === "function"
            ? configBucketPath(groupId)
            : configBucketPath;
        return bucketPath;
    }
    /**
     * Create log group
     */
    static createLogGroup(groupId, s3TransportConfig) {
        const { bucket } = s3TransportConfig;
        const bucketPath = S3Transport.createBucketPath(groupId, s3TransportConfig);
        return {
            bucket,
            bucketPath,
            data: [],
            createdTime: new Date(),
            isUpdated: false,
        };
    }
    log(logInfo, callback) {
        return __awaiter(this, void 0, void 0, function* () {
            /**
             * Create a new log group if it doesn't exist
             */
            const { group } = this.s3TransportConfig;
            const logGroupId = typeof group === "function" ? group(logInfo) : group;
            const logGroup = this.logGroups[logGroupId] ||
                S3Transport.createLogGroup(logGroupId, this.s3TransportConfig);
            if (!(logGroupId in this.logGroups)) {
                this.logGroups[logGroupId] = logGroup;
            }
            /**
             * If the data size exceeds the maximum size, the file is uploaded immediately.
             */
            const { calcDataSize } = S3Transport;
            const isExceededMaxFileSize = calcDataSize(logGroup.data) + calcDataSize(logInfo) >=
                this.s3TransportConfig.maxDataSize;
            if (isExceededMaxFileSize) {
                /**
                 * If there is not enough space to add a new log, remove the existing log data and upload data
                 */
                const logData = [...logGroup.data];
                logGroup.data = [];
                logGroup.createdTime = new Date();
                logGroup.uploadTime = new Date();
                logGroup.isUpdated = false;
                /**
                 * Upload files
                 */
                S3Transport.uploadToS3Bucket(this.s3Client, logGroup.bucket, logGroup.bucketPath, logData, this.s3TransportConfig.gzip);
                /**
                 * Create a new bucket path ⇛ Can no longer write files to the existing path
                 */
                logGroup.bucketPath = S3Transport.createBucketPath(logGroupId, this.s3TransportConfig);
            }
            /**
             * Add log
             */
            logGroup.data.push(logInfo);
            logGroup.isUpdated = true;
            if (typeof callback === "function") {
                callback();
            }
        });
    }
    static calcDataSize(data) {
        return JSON.stringify(data).length;
    }
    /**
     * Upload data to s3 bucket
     */
    static uploadToS3Bucket(s3Client, bucket, bucketPath, data, compress = false) {
        return __awaiter(this, void 0, void 0, function* () {
            const bodyData = data.map((logInfo) => JSON.stringify(logInfo)).join("\n");
            let body;
            if (compress) {
                body = yield (0, node_gzip_1.gzip)(bodyData);
            }
            else {
                body = Buffer.from(bodyData);
            }
            yield s3Client.send(new client_s3_1.PutObjectCommand({
                Bucket: bucket,
                Key: bucketPath,
                Body: body,
            }));
            return true;
        });
    }
}
exports.default = S3Transport;
