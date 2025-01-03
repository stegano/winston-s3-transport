/* eslint-disable no-underscore-dangle */
import LogStream from "./log-stream";

describe("LogStream", () => {
  let logStream: LogStream;

  beforeEach(() => {
    logStream = new LogStream();
  });

  test("should write data to the buffer and read it", async () => {
    const data = "test data";
    logStream.write(data);
    await new Promise<void>((resolve) => {
      logStream.on("data", (chunk) => {
        expect(chunk.toString()).toBe(data);
        resolve();
      });
    });
    logStream._read();
  });

  test("should flush the buffer when maxBufferSize is exceeded", async () => {
    const data = "a".repeat(1024);
    logStream.write(data);
    await new Promise<void>((resolve) => {
      logStream.once("data", (chunk) => {
        expect(chunk.toString()).toEqual(data);
        resolve();
      });
    });
    logStream.write("b", true);
    await new Promise<void>((resolve) => {
      logStream.once("data", (chunk) => {
        expect(chunk.toString()).toEqual("b");
        resolve();
      });
    });
  });

  test("should flush the buffer when flush is called", async () => {
    const data = "test data";
    logStream.write(data);
    await new Promise<void>((resolve) => {
      logStream.on("data", (chunk) => {
        expect(chunk.toString()).toBe(data);
        resolve();
      });
    });
    logStream.flush();
  });

  test("should handle multiple writes and reads correctly", async () => {
    const data1 = "data1";
    const data2 = "data2";
    logStream.write(data1);
    logStream.write(data2);
    let receivedData = "";
    logStream.on("data", (chunk) => {
      receivedData += chunk.toString();
    });
    logStream.close();
    await new Promise<void>((resolve) => {
      logStream.on("end", () => {
        expect(receivedData).toBe(data1 + data2);
        resolve();
      });
    });
  });

  test("should return the correct number of written bytes", () => {
    const data1 = "data1";
    const data2 = "data2";
    logStream.write(data1);
    logStream.write(data2);
    logStream.flush();
    expect(logStream.getWrittenBytes()).toBe(
      Buffer.byteLength(data1) + Buffer.byteLength(data2)
    );
  });
});
