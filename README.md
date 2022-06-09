![NPM License](https://img.shields.io/npm/l/winston-s3-transport)
![NPM Downloads](https://img.shields.io/npm/dw/winston-s3-transport)

# Winston S3 Transport
> Logs generated through Winston can be transferred to an S3 bucket using `winston-s3-transport`.

## Installation

The easiest way to install `winston-s3-transport` is with [npm](https://www.npmjs.com/package/winston-s3-transport).

```bash
npm install winston-s3-transport
```

Alternately, download the source.

```bash
git clone https://github.com/stegano/winston-s3-transport.git
```

## Example
> [!] The bucket path is created when the log is first created.
```ts
// Example - `src/utils/logger.ts`
import winston from "winston";
import S3Transport from "winston-s3-transport";
import { v4 as uuidv4 } from "uuid";
import { format } from "date-fns";

const s3Transport = new S3Transport({
  s3ClientConfig: {
    region: "ap-northeast-2",
  },
  s3TransportConfig: {
    bucket: "my-bucket",
    group: (logInfo: any) => {
      // Group logs with `userId` value and store them in memory. 
      // If the `userId` value does not exist, we will use the `anonymous` group.
      return logInfo?.message?.userId || "anonymous";
    },
    bucketPath: (groupId: string = "default") => {
      const date = new Date();
      const timestamp = format(date, "yyyyMMddhhmmss");
      const uuid = uuidv4();
      // The bucket path in which the log is uploaded. 
      // You can create a bucket path by combining `groupId`, `timestamp`, and `uuid` values.
      return `/logs/${groupId}/${timestamp}/${uuid}.log`;
    },
  },
});

export const logger = winston.createLogger({
  levels: winston.config.syslog.levels,
  format: winston.format.combine(winston.format.json()),
  transports: [s3Transport],
});

export default logger;
```

> Create log using winston in another module
```ts
// Example - another module
import logger from "src/utils/logger";
...
// Create a log containing the field `userId`
logger.info({ userId: 'user001', ....logs });
```


## Configuration
### s3ClientConfig
> This library is internally using [`@aws-sdk/client-s3`](https://www.npmjs.com/package/@aws-sdk/client-s3) to upload files to AWS S3.
  * Please see [AWSJavaScriptSDK/s3clientconfig](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-s3/interfaces/s3clientconfig.html)
### s3TransportConfig
#### bucket*: string
  * AWS S3 Bucket name
#### bucketPath*: _((groupId: string) => string) | string_
  * AWS S3 Bucket path to upload log files
#### group?: _(<T = any>(logInfo: T) => string) | string (default: "default")_
  * Group for logs classification.
#### dataUploadInterval?: _number (default: 1000 * 20)_
  * Data upload interval(milliseconds)
#### fileRotationInterval?: _number (default: 1000 * 60)_
  * File rotation interval(milliseconds)
#### maxDataSize?: number _(default: 1000 * 1000 * 2)_
  * Max data size(byte)


## Motivation
I made this so that it can be efficiently partitioned when storing log data in the S3 bucket. When you use vast amounts of S3 data in Athena, partitioned data can help you use the cost effectively.
