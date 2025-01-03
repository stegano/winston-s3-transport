import Transport from "winston-transport";
import { S3ClientConfig } from "@aws-sdk/client-s3";

/**
 * Config
 */
export interface Config {
  /**
   * bucket
   */
  bucket: string;
  /**
   * bucketPath
   */
  bucketPath?: (log: any) => string;
  /**
   * maxBufferSize
   */
  maxBufferSize?: number;
  /**
   * maxBufferCount
   */
  maxBufferCount?: number;
  /**
   * maxFileSize
   */
  maxFileSize?: number;
  /**
   * gzip
   */
  gzip?: boolean;
}

/**
 * Options
 */
export interface Options extends Transport.TransportStreamOptions {
  /**
   * s3ClientConfig
   * @see https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-s3/interfaces/s3clientconfig.html
   */
  s3ClientConfig: S3ClientConfig;
  /**
   * S3TransportConfig
   */
  S3TransportConfig: Config;
}
