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
const client_sns_1 = require("@aws-sdk/client-sns");
const aws_1 = require("../../config/aws");
const dotenv_1 = __importDefault(require("dotenv"));
// Make sure environment variables are loaded
dotenv_1.default.config();
const sendSMS = (phoneNumber, message) => __awaiter(void 0, void 0, void 0, function* () {
    const params = {
        Message: message,
        PhoneNumber: phoneNumber,
    };
    try {
        const command = new client_sns_1.PublishCommand(params);
        const response = yield aws_1.snsClient.send(command);
    }
    catch (error) {
        console.error("Error sending SMS:", error);
        throw error;
    }
});
exports.default = sendSMS;
