import Transport from "winston-transport";
import { S3ClientConfig } from "@aws-sdk/client-s3";
export interface LogGroup {
    data: any[];
    bucket: string;
    bucketPath: string;
    createdTime: Date;
    isUpdated: boolean;
    uploadTime?: Date;
}
export interface S3TransportConfig {
    bucket: string;
    bucketPath: ((groupId: string) => string) | string;
    group?: (<T = any>(logInfo: T) => string) | string;
    dataUploadInterval?: number;
    maxDataSize?: number;
    fileRotationInterval?: number;
    gzip?: boolean;
}
export interface Options extends Transport.TransportStreamOptions {
    /**
     * @see https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-s3/interfaces/s3clientconfig.html
     */
    s3ClientConfig: S3ClientConfig;
    s3TransportConfig: S3TransportConfig;
}
