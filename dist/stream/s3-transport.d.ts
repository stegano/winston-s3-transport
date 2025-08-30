import TransportStream from "winston-transport";
import { S3Client } from "@aws-sdk/client-s3";
import { Options, Config, StreamInfo } from "./s3-transport.interface";
declare class S3Transport<T = any> extends TransportStream {
    s3Client: S3Client;
    s3TransportConfig: Required<Config>;
    streamInfos: Map<string, StreamInfo>;
    constructor(options: Options<T>);
    log(log: any, next: () => void): Promise<void>;
    close(): Promise<void>;
}
export default S3Transport;
