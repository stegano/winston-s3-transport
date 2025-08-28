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
   * generateGruop
   */
  generateGroup?: (log: T) => string;
  /**
   * generateBucketPath
   */
  generateBucketPath?: (group: string, log: T) => string;
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
   * maxFileAge
   */
  maxFileAge?: number;
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
  s3TransportConfig: Config;
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
  s3Upload: Promise<CompleteMultipartUploadCommandOutput>
];
