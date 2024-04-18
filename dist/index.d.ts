import Transport from "winston-transport";
import { S3Client } from "@aws-sdk/client-s3";
import { LogGroup, Options, S3TransportConfig } from "./index.interface";
declare class S3Transport extends Transport {
    logGroups: Record<string, LogGroup>;
    s3Client: S3Client;
    s3TransportConfig: Required<S3TransportConfig>;
    constructor(options: Options);
    updateLogGroupList(logGroupIdList?: string[]): Promise<boolean>;
    /**
     * Create bucket path
     */
    static createBucketPath(groupId: string, s3TransportConfig: S3TransportConfig): string;
    /**
     * Create log group
     */
    static createLogGroup(groupId: string, s3TransportConfig: S3TransportConfig): LogGroup;
    log(logInfo: any, callback: any): Promise<void>;
    static calcDataSize(data: any): number;
    /**
     * Upload data to s3 bucket
     */
    static uploadToS3Bucket(s3Client: S3Client, bucket: string, bucketPath: string, data: any[], compress?: boolean): Promise<boolean>;
}
export default S3Transport;
