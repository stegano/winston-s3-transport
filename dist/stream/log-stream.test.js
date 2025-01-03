"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-disable no-underscore-dangle */
const log_stream_1 = __importDefault(require("./log-stream"));
describe("LogStream", () => {
    let logStream;
    beforeEach(() => {
        logStream = new log_stream_1.default();
    });
    test("should write data to the buffer and read it", () => __awaiter(void 0, void 0, void 0, function* () {
        const data = "test data";
        logStream.write(data);
        yield new Promise((resolve) => {
            logStream.on("data", (chunk) => {
                expect(chunk.toString()).toBe(data);
                resolve();
            });
        });
        logStream._read();
    }));
    test("should flush the buffer when maxBufferSize is exceeded", () => __awaiter(void 0, void 0, void 0, function* () {
        const data = "a".repeat(1024);
        logStream.write(data);
        yield new Promise((resolve) => {
            logStream.once("data", (chunk) => {
                expect(chunk.toString()).toEqual(data);
                resolve();
            });
        });
        logStream.write("b", true);
        yield new Promise((resolve) => {
            logStream.once("data", (chunk) => {
                expect(chunk.toString()).toEqual("b");
                resolve();
            });
        });
    }));
    test("should flush the buffer when flush is called", () => __awaiter(void 0, void 0, void 0, function* () {
        const data = "test data";
        logStream.write(data);
        yield new Promise((resolve) => {
            logStream.on("data", (chunk) => {
                expect(chunk.toString()).toBe(data);
                resolve();
            });
        });
        logStream.flush();
    }));
    test("should handle multiple writes and reads correctly", () => __awaiter(void 0, void 0, void 0, function* () {
        const data1 = "data1";
        const data2 = "data2";
        logStream.write(data1);
        logStream.write(data2);
        let receivedData = "";
        logStream.on("data", (chunk) => {
            receivedData += chunk.toString();
        });
        logStream.close();
        yield new Promise((resolve) => {
            logStream.on("end", () => {
                expect(receivedData).toBe(data1 + data2);
                resolve();
            });
        });
    }));
    test("should return the correct number of written bytes", () => {
        const data1 = "data1";
        const data2 = "data2";
        logStream.write(data1);
        logStream.write(data2);
        logStream.flush();
        expect(logStream.getWrittenBytes()).toBe(Buffer.byteLength(data1) + Buffer.byteLength(data2));
    });
});
