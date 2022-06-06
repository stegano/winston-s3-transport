# Winston S3 Transport
> Logs generated through Winston can be transferred to an S3 bucket using `winston-s3-tranport`.

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

### Basic
```ts
...
const s3Transport = new S3Transport({
  ...
  s3ClientConfig: {
    // Please see https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-s3/interfaces/s3clientconfig.html
  },
  s3TransportConfig: {
    bucket: 'my-bucket',
    bucketPath: '/logs.log',
  }
})

export const s3Logger = winston.createLogger({
  levels: winston.config.syslog.levels,
  format: winston.format.combine(winston.format.json()),
  transports: [s3Transport],
});
...
```

### Advanced
#### Dynamic bucket path
> You can use a dynamic bucket path.
> (Important) The bucket path is created when the log is first written.
```ts
import { format } from 'date-fns';
import { v4 as uuidv4 } from "uuid";
...

const s3Transport = new S3Transport({
  ...
  s3TransportConfig: {
    bucket: 'my-bucket',
    bucketPath: () => {
      const yyyyMMdd = format(new Date(), 'yyyyMMdd');
      const hhmmss = format(new Date(), 'hhmmss');
      const uuid = uuidv4();
      const path = `/logs/${yyyyMMdd}/${hhmmss}/${uuid}.log`;
      return path // e.g.`/logs/20220606/015930/9365665e-f985-4347-8623-2b5cb7f444ef.log`
    },
  }
});
...
```
#### Using log grouping
> You can group logs by using log information and save them.
```ts
...

const s3Transport = new S3Transport({
  ...
  s3TransportConfig: {
    bucket: 'my-bucket',
    groupId: (logInfo: any) => {
      /**
       * If you write a log like this `logger.log({groupId: 'abcGroup'})`
       * You can get the group ID as follows.
       */
      const groupId = logInfo?.message?.groupId || 'defaultGroup';
      return groupId; // ⇛ `abcGroup`
    },
    bucketPath: (groupId: string) => {
      const path = `/logs/${groupId}.log`;
      return path // ⇛ `/logs/abcGroup.log`
    },
  }
});
...
```

## Configuration
* **s3ClientConfig**
  * Please see [AWSJavaScriptSDK/s3clientconfig](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-s3/interfaces/s3clientconfig.html)
* **s3TransportConfig**
  * _bucket: string_
    * AWS bucket name
  * _bucketPath: ((groupId: string) => string) | string_
    * Bucket path to upload files
  * _groupId?: ((logInfo: any) => string) | string (default: "default")_
    * Group ID to identify the log
  * _dataUploadInterval?: number (default: 1000 * 20)_
    * Data upload interval(milliseconds)
  * _fileRotationInterval?: number (default: 1000 * 60)_
    * File rotation interval(milliseconds)
  * _maxDataSize?: number (default: 1000 * 1000 * 2)_
    * Max data size(byte)
