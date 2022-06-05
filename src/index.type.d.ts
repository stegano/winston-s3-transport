import Transport from "winston-transport";
import { S3ClientConfig } from "@aws-sdk/client-s3";

interface LogGroup {
  data: any[];
  // Bucket
  bucket: string;
  // Bucket path
  bucketPath: string;
  // Created time
  createdTime: Date;
  // Whether to update
  isUpdated: boolean;
  // Upload time
  uploadTime?: Date;
}

interface S3TransportConfig {
  // Bucket name
  bucket: string;
  // Bucket path to upload files
  bucketPath: ((groupId: string) => string) | string;
  // Group ID to identify the log
  groupId?: ((logInfo: any) => string) | string;
  // Data upload interval
  dataUploadInterval?: number;
  // Max data size
  maxDataSize?: number;
  // File rotation interval
  fileRotationInterval?: number;
  // Whether to use Gzip compression
  gzip?: boolean;
}

interface Options extends Transport.TransportStreamOptions {
  /**
   * @see https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-s3/interfaces/s3clientconfig.html
   */
  s3ClientConfig: S3ClientConfig;
  s3TransportConfig: S3TransportConfig;
}
