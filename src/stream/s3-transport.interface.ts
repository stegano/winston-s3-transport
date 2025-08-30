import Transport from "winston-transport";
import {
  CompleteMultipartUploadCommandOutput,
  S3ClientConfig,
} from "@aws-sdk/client-s3";
import { PassThrough } from "stream";

/**
 * Config
 */
export interface Config<T = any> {
  /**
   * bucket
   */
  bucket: string;
  /**
   * generateGroup
   */
  generateGroup?: (log: T) => string;
  /**
   * generateBucketPath
   */
  generateBucketPath?: (group: string, log: T) => string;
  /**
   * maxBufferSize
   * @default 1024
   */
  maxBufferSize?: number;
  /**
   * maxBufferCount
   * If the number of buffer size exceeds the maximum number of buffer sizes,
   * the stream with the most written data is flushed and a new stream is created.
   * @default 50
   */
  maxBufferCount?: number;
  /**
   * maxFileSize
   * If the size of the buffer exceeds the maximum size, the stream is automatically flushed and new stream is created.
   * @default 1024 * 2
   */
  maxFileSize?: number;
  /**
   * maxFileAge
   * If the file age exceeds the set time,
   * the stream is automatically flushed and new stream is created after the set time.
   * @default 1000 * 60 * 5
   */
  maxFileAge?: number;
  /**
   * maxIdleTime
   * If the data is not written for the set time,
   * the stream is automatically flushed and new stream is created after the set time.
   * @default 1000 * 10
   */
  maxIdleTime?: number;
  /**
   * gzip
   * @default false
   */
  gzip?: boolean;
}

/**
 * Options
 */
export interface Options<T = any> extends Transport.TransportStreamOptions {
  /**
   * s3ClientConfig
   * @see https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-s3/interfaces/s3clientconfig.html
   */
  s3ClientConfig: S3ClientConfig;
  /**
   * S3TransportConfig
   */
  s3TransportConfig: Config<T>;
}

/**
 * StreamInfoName
 */
export enum StreamInfoName {
  /**
   * TotalWrittenBytes
   */
  TotalWrittenBytes = 0,
  /**
   * Stream
   */
  Stream = 1,
  /**
   * S3Upload
   */
  S3Upload = 2,
  /**
   * ClearProcId
   */
  ClearProcId = 3,
}

/**
 * StreamInfo
 */
export type StreamInfo = [
  /**
   * totalWrittenBytes
   */
  totalWrittenBytes: number,
  /**
   * stream
   */
  stream: PassThrough,
  /**
   * s3Upload
   */
  s3Upload: Promise<CompleteMultipartUploadCommandOutput>,
  /**
   * ClearProcId
   */
  clearProcId: NodeJS.Timeout | null
];
