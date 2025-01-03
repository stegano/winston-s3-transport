import TransportStream from "winston-transport";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { gzip } from "node-gzip";
import { Options, Config } from "./s3-transport.interface";
import LogStream from "./log-stream";

class S3Transport extends TransportStream {
  s3Client: S3Client;

  s3TransportConfig: Required<Config>;

  streams: Record<string, LogStream> = {};

  constructor(options: Options) {
    super(options);
    /**
     * options
     */
    const { s3ClientConfig, S3TransportConfig } = options;
    /**
     * default config values
     */
    this.s3TransportConfig = {
      /**
       * bucketPath
       */
      bucketPath: () => "default",
      /**
       * maxBufferCount
       */
      maxBufferCount: 50,
      /**
       * maxBufferSize
       */
      maxBufferSize: 1024,
      /**
       * maxFileSize
       */
      maxFileSize: 1024 * 2,
      /**
       * gzip
       */
      gzip: false,
      /**
       * User's S3TransportConfig
       */
      ...S3TransportConfig,
    };
    this.s3Client = new S3Client(s3ClientConfig);
  }

  async log(log: any, next: () => void) {
    const bucketPath = this.s3TransportConfig.bucketPath(log);
    if (bucketPath in this.streams === false) {
      /**
       * If the number of buffer size exceeds the maximum number of buffer sizes,
       * the stream with the most written data is removed and a new stream is created.
       */
      if (
        Object.keys(this.streams).length >=
        this.s3TransportConfig.maxBufferCount
      ) {
        const sortedStreams = Object.entries(this.streams).sort(
          (a, b) => b[1].writtenBytes - a[1].writtenBytes
        );
        const [, stream] = sortedStreams[0];
        stream.flush();
      }
      /**
       * Create a new stream
       */
      const logStream = new LogStream(this.s3TransportConfig.maxBufferSize);
      this.streams[bucketPath] = logStream;
      /**
       * If all data in the buffer is uploaded, the stream is closed and deleted from the streams object
       */
      this.s3Client
        .send(
          new PutObjectCommand({
            Bucket: "bucsketPath",
            Key: bucketPath,
            Body: logStream,
          })
        )
        .then(() => {
          delete this.streams[bucketPath];
        })
        .catch(() => {
          delete this.streams[bucketPath];
        });
      logStream.once("error", () => {
        /**
         * If an error occurs, delete the stream.
         */
        delete this.streams[bucketPath];
      });
    }
    const stream = this.streams[bucketPath];
    const logData = this.s3TransportConfig.gzip
      ? await gzip(`${JSON.stringify(log)}\n`)
      : Buffer.from(`${JSON.stringify(log)}\n`);
    /**
     * Write log data to the stream.
     */
    stream.write(logData);
    /**
     * If the buffer size exceeds the maximum buffer size, the buffer is flushed.
     */
    if (stream.writtenBytes >= this.s3TransportConfig.maxFileSize) {
      stream.flush();
    }
    next?.();
  }
}

export default S3Transport;
