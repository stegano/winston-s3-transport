import Transport from "winston-transport";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { addMilliseconds, isAfter } from "date-fns";
import { gzip } from "node-gzip";
import { LogGroup, Options, S3TransportConfig } from "./index.type";

class S3Transport extends Transport {
  logGroups: Record<string, LogGroup>;

  s3Client: S3Client;

  s3TransportConfig: Required<S3TransportConfig>;

  constructor(options: Options) {
    super(options);
    /**
     * Default config values
     */
    this.s3TransportConfig = {
      /**
       * Group ID to identify the logs
       */
      groupId: "default",
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
      gzip: false,
      ...options.s3TransportConfig,
    };
    this.s3Client = new S3Client(options.s3ClientConfig);
    this.logGroups = {};

    setInterval(async () => {
      /**
       * Upload files to S3 bucket sequentially (not in parallel).
       */
      await this.updateLogGroupList(Object.keys(this.logGroups));
    }, this.s3TransportConfig.dataUploadInterval);
  }

  async updateLogGroupList(logGroupIdList: string[] = []): Promise<boolean> {
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
    if (
      isAfter(new Date(), addMilliseconds(createdTime, fileRotationInterval))
    ) {
      /**
       * Upload data and remove from `logGroups` when file rotation cycle is exceeded
       */
      const logData = [...data];
      delete this.logGroups[groupId];
      await S3Transport.uploadToS3Bucket(
        this.s3Client,
        bucket,
        bucketPath,
        logData
      );
      logGroup.bucketPath = S3Transport.createBucketPath(
        groupId,
        this.s3TransportConfig
      );
    }
    if (
      isAfter(
        new Date(),
        addMilliseconds(uploadTime || 0, dataUploadInterval)
      ) &&
      logGroup.isUpdated
    ) {
      /**
       * If the data upload cycle has been exceeded
       */
      logGroup.uploadTime = new Date();
      logGroup.isUpdated = false;
      await S3Transport.uploadToS3Bucket(
        this.s3Client,
        bucket,
        bucketPath,
        data
      );
    }
    return this.updateLogGroupList(rest);
  }

  /**
   * Create bucket path
   */
  static createBucketPath(
    groupId: string,
    s3TransportConfig: S3TransportConfig
  ): string {
    const { bucketPath: configBucketPath } = s3TransportConfig;
    const bucketPath =
      typeof configBucketPath === "function"
        ? configBucketPath(groupId)
        : configBucketPath;
    return bucketPath;
  }

  /**
   * Create log group
   */
  static createLogGroup(
    groupId: string,
    s3TransportConfig: S3TransportConfig
  ): LogGroup {
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

  async log(logInfo: any, callback: any) {
    /**
     * Create a new log group if it doesn't exist
     */
    const { groupId } = this.s3TransportConfig;
    const logGroupId =
      typeof groupId === "function" ? groupId(logInfo) : groupId;
    const logGroup =
      this.logGroups[logGroupId] ||
      S3Transport.createLogGroup(logGroupId, this.s3TransportConfig);
    if (!(logGroupId in this.logGroups)) {
      this.logGroups[logGroupId] = logGroup;
    }

    /**
     * If the data size exceeds the maximum size, the file is uploaded immediately.
     */
    const { calcDataSize } = S3Transport;
    const isExceededMaxFileSize =
      calcDataSize(logGroup.data) + calcDataSize(logInfo) >=
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
      S3Transport.uploadToS3Bucket(
        this.s3Client,
        logGroup.bucket,
        logGroup.bucketPath,
        logData
      );
      /**
       * Create a new bucket path ⇛ Can no longer write files to the existing path
       */
      logGroup.bucketPath = S3Transport.createBucketPath(
        logGroupId,
        this.s3TransportConfig
      );
    }
    /**
     * Add log
     */
    logGroup.data.push(logInfo);
    logGroup.isUpdated = true;

    if (typeof callback === "function") {
      callback();
    }
  }

  static calcDataSize(data: any): number {
    return JSON.stringify(data).length;
  }

  /**
   * Upload data to s3 bucket
   */
  static async uploadToS3Bucket(
    s3Client: S3Client,
    bucket: string,
    bucketPath: string,
    data: any[],
    compress: boolean = false
  ) {
    const bodyData = data.map((logInfo) => JSON.stringify(logInfo)).join("\n");
    let body;
    if (compress) {
      body = await gzip(bodyData);
    } else {
      body = Buffer.from(bodyData);
    }
    await s3Client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: bucketPath,
        Body: body,
      })
    );
    return true;
  }
}

export default S3Transport;
