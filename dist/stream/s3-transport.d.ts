import TransportStream from "winston-transport";
import { S3Client } from "@aws-sdk/client-s3";
import { Options, Config } from "./s3-transport.interface";
import LogStream from "./log-stream";
declare class S3Transport extends TransportStream {
    s3Client: S3Client;
    s3TransportConfig: Required<Config>;
    streams: Record<string, LogStream>;
    constructor(options: Options);
    log(log: any, next: () => void): Promise<void>;
}
export default S3Transport;
