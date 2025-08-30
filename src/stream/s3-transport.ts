import { createGzip } from "node:zlib";
import TransportStream from "winston-transport";
import { S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { PassThrough } from "stream";
import {
  Options,
  Config,
  StreamInfo,
  StreamInfoName,
} from "./s3-transport.interface";

class S3Transport<T = any> extends TransportStream {
  s3Client: S3Client;

  s3TransportConfig: Required<Config>;

  streamInfos: Map<string, StreamInfo> = new Map();

  constructor(options: Options<T>) {
    super(options);
    /**
     * options
     */
    const { s3ClientConfig, s3TransportConfig } = options;
    /**
     * default config values
     */
    this.s3TransportConfig = {
      /**
       * generateGroup
       */
      generateGroup: () => "default",
      /**
       * generateBucketPath
       */
      generateBucketPath: () => "",
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
       * maxFileAge
       */
      maxFileAge: 1000 * 60 * 5,
      /**
       * maxIdleTime
       */
      maxIdleTime: 1000 * 10,
      /**
       * gzip
       */
      gzip: false,
      /**
       * User's S3TransportConfig
       */
      ...s3TransportConfig,
    };
    this.s3Client = new S3Client(s3ClientConfig);
    process
      .on("SIGINT", async () => {
        await this.close();
        process.exit(0);
      })
      .on("SIGTERM", async () => {
        await this.close();
        process.exit(0);
      })
      .on("beforeExit", async () => {
        await this.close();
      });
  }

  async log(log: any, next: () => void) {
    const {
      bucket,
      generateGroup,
      generateBucketPath,
      maxBufferSize,
      maxBufferCount,
      maxIdleTime,
      maxFileSize,
      maxFileAge,
      gzip,
    } = this.s3TransportConfig;
    /**
     * Generate the log group for the path.
     */
    const group = generateGroup(log);
    const data = `${JSON.stringify(log)}\n`;
    const dataBuffer = Buffer.from(data);
    /**
     * Get the streamInfo object for the group.
     */
    let groupStreamInfo: StreamInfo | undefined = this.streamInfos.get(group);
    /**
     * If the buffer size exceeds the maximum buffer size, the buffer is flushed.
     */
    if (
      groupStreamInfo &&
      groupStreamInfo[StreamInfoName.TotalWrittenBytes] +
        dataBuffer.byteLength >=
        maxFileSize
    ) {
      await new Promise<void>((resolve) => {
        groupStreamInfo?.[StreamInfoName.Stream].end(() => {
          resolve();
        });
      });
    }
    /**
     * Get the streamInfo object for the group.
     */
    groupStreamInfo = this.streamInfos.get(group);
    if (groupStreamInfo === undefined) {
      /**
       * If the number of buffer size exceeds the maximum number of buffer sizes,
       * the stream with the most written data is removed and a new stream is created.
       */
      if (this.streamInfos.size >= maxBufferCount) {
        const sortedStreamInfos = Array.from(this.streamInfos.entries()).sort(
          (a, b) => b[1][0] - a[1][0]
        );
        const [, firstStreamInfo] = sortedStreamInfos[0];
        const [, firstStream] = firstStreamInfo;
        firstStream.end();
      }
      /**
       * Create a new streamInfo
       */
      const bucketPathStream = new PassThrough({
        highWaterMark: maxBufferSize,
      });
      /**
       * If all data in the buffer is uploaded, the stream is closed and deleted from the streams object
       */
      const uploadPromise = new Upload({
        client: this.s3Client,
        params: {
          Bucket: bucket,
          Key: generateBucketPath(group, log),
          Body: gzip ? bucketPathStream.pipe(createGzip()) : bucketPathStream,
          ContentType: "application/jsonl",
          ContentEncoding: gzip ? "gzip" : undefined,
        },
      }).done();
      /**
       * If the maximum file age is set,
       * the stream is automatically closed after the set time.
       */
      let autoFlushProcId: NodeJS.Timeout;
      if (maxFileAge > 0) {
        autoFlushProcId = setTimeout(() => {
          bucketPathStream.end();
        }, maxFileAge);
      }
      uploadPromise
        .then(() => {
          this.streamInfos.delete(group);
          clearTimeout(autoFlushProcId);
        })
        .catch((error) => {
          // eslint-disable-next-line no-console
          console.error(error);
          this.streamInfos.delete(group);
          clearTimeout(autoFlushProcId);
        });
      bucketPathStream.once("error", () => {
        /**
         * If an error occurs, delete the stream.
         */
        this.streamInfos.delete(group);
        clearTimeout(autoFlushProcId);
      });
      groupStreamInfo = [
        0,
        bucketPathStream,
        uploadPromise,
        null,
      ] as StreamInfo;
      this.streamInfos.set(group, groupStreamInfo);
    }
    /**
     * Write log data to the stream.
     */
    groupStreamInfo[StreamInfoName.Stream].write(dataBuffer);
    groupStreamInfo[StreamInfoName.TotalWrittenBytes] += dataBuffer.length;
    if (groupStreamInfo[StreamInfoName.ClearProcId] !== null) {
      /**
       * If the clearProcId is not null, clear the timeout.
       */
      clearTimeout(groupStreamInfo[StreamInfoName.ClearProcId]);
    }
    groupStreamInfo[StreamInfoName.ClearProcId] = setTimeout(() => {
      if (groupStreamInfo === undefined) {
        return;
      }
      /**
       * Close the stream after 10 seconds have passed since the data was written.
       */
      const clearProcId = groupStreamInfo[StreamInfoName.ClearProcId];
      if (clearProcId) {
        clearTimeout(clearProcId);
        groupStreamInfo[StreamInfoName.ClearProcId] = null;
        groupStreamInfo[StreamInfoName.Stream].end();
      }
    }, maxIdleTime);
    next?.();
  }

  async close() {
    /**
     * Close streams.
     */
    const promiseList = [...this.streamInfos.values()].map(
      (groupStreamInfo) => {
        const [, stream, uploadPromise] = groupStreamInfo;
        stream.end();
        return uploadPromise;
      }
    );
    await Promise.all(promiseList);
  }
}

export default S3Transport;
