"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IS3Transport = exports.S3Transport = exports.IS3StreamTransport = exports.S3StreamTransport = void 0;
const s3_transport_1 = __importDefault(require("./s3-transport"));
var s3_transport_2 = require("./stream/s3-transport");
Object.defineProperty(exports, "S3StreamTransport", { enumerable: true, get: function () { return __importDefault(s3_transport_2).default; } });
exports.IS3StreamTransport = __importStar(require("./stream/s3-transport.interface"));
var s3_transport_3 = require("./s3-transport");
Object.defineProperty(exports, "S3Transport", { enumerable: true, get: function () { return __importDefault(s3_transport_3).default; } });
exports.IS3Transport = __importStar(require("./s3-transport.interface"));
exports.default = s3_transport_1.default;
