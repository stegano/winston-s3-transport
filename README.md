![NPM License](https://img.shields.io/npm/l/winston-s3-transport)
![NPM Downloads](https://img.shields.io/npm/dw/winston-s3-transport) <!-- ALL-CONTRIBUTORS-BADGE:START - Do not remove or modify this section -->
[![All Contributors](https://img.shields.io/badge/all_contributors-2-orange.svg?style=flat-square)](#contributors-)

<!-- ALL-CONTRIBUTORS-BADGE:END -->

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
import { S3StreamTransport } from "winston-s3-transport";
import { v4 as uuidv4 } from "uuid";
import { format } from "date-fns";

type Log = {
  message: {
    userId: string;
  };
};

const s3Transport = new S3StreamTransport<Log>({
  s3ClientConfig: {
    region: "ap-northeast-2",
  },
  s3TransportConfig: {
    bucket: "my-bucket",
    generateGroup: (log: Log) => {
      // Group logs with `userId` value and store them in memory.
      // If the 'userId' value does not exist, use the `anonymous` group.
      return log?.message.userId || "anonymous";
    },
    generateBucketPath: (group: string = "default") => {
      const date = new Date();
      const timestamp = format(date, "yyyyMMddhhmmss");
      const uuid = uuidv4();
      // The bucket path in which the log is uploaded.
      // You can create a bucket path by combining `group`, `timestamp`, and `uuid` values.
      return `/logs/${group}/${timestamp}/${uuid}.log`;
    },
    gzip: true,
  },
});

export const logger = winston.createLogger({
  levels: winston.config.syslog.levels,
  format: winston.format.combine(winston.format.json()),
  transports: [s3Transport],
});

export default logger;
```

## Options

### s3ClientConfig

> This library is internally using [`@aws-sdk/client-s3`](https://www.npmjs.com/package/@aws-sdk/client-s3) to upload files to AWS S3.

- Please see [AWSJavaScriptSDK/s3clientconfig](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-s3/interfaces/s3clientconfig.html)

### s3TransportConfig

```ts
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
```

<details>
<summary>Previous version</summary>

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
      // If the 'userId' value does not exist, use the `anonymous` group.
      return logInfo?.message?.userId || "anonymous";
    },
    bucketPath: (group: string = "default") => {
      const date = new Date();
      const timestamp = format(date, "yyyyMMddhhmmss");
      const uuid = uuidv4();
      // The bucket path in which the log is uploaded.
      // You can create a bucket path by combining `group`, `timestamp`, and `uuid` values.
      return `/logs/${group}/${timestamp}/${uuid}.log`;
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

## Options

### s3ClientConfig

> This library is internally using [`@aws-sdk/client-s3`](https://www.npmjs.com/package/@aws-sdk/client-s3) to upload files to AWS S3.

- Please see [AWSJavaScriptSDK/s3clientconfig](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-s3/interfaces/s3clientconfig.html)

### s3TransportConfig

#### bucket: string

- AWS S3 Bucket name

#### bucketPath: _((group: string) => string) | string_

- AWS S3 Bucket path to upload log files

#### group?: _(<T = any>(logInfo: T) => string) | string (default: "default")_

- Group for logs classification.

#### dataUploadInterval?: _number (default: 1000 \* 20)_

- Data upload interval(milliseconds)

#### fileRotationInterval?: _number (default: 1000 \* 60)_

- File rotation interval(milliseconds)

#### maxDataSize?: number _(default: 1000 * 1000 * 2)_

- Max data size(byte)

</details>

## Motivation

I made this so that it can be efficiently partitioned when storing log data in the S3 bucket. When you use vast amounts of S3 data in Athena, partitioned data can help you use the cost effectively.

## Contributors ✨

Thanks goes to these wonderful people ([emoji key](https://allcontributors.org/docs/en/emoji-key)):

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tbody>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/krsaedan"><img src="https://avatars.githubusercontent.com/u/77971873?v=4?s=100" width="100px;" alt="krsaedan"/><br /><sub><b>krsaedan</b></sub></a><br /><a href="https://github.com/stegano/winston-s3-transport/issues?q=author%3Akrsaedan" title="Bug reports">🐛</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/vh-wwm"><img src="https://avatars.githubusercontent.com/u/173472019?v=4?s=100" width="100px;" alt="VH-WWM"/><br /><sub><b>VH-WWM</b></sub></a><br /><a href="https://github.com/stegano/winston-s3-transport/issues?q=author%3Avh-wwm" title="Bug reports">🐛</a></td>
    </tr>
  </tbody>
</table>

<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->

This project follows the [all-contributors](https://github.com/all-contributors/all-contributors) specification. Contributions of any kind welcome!
