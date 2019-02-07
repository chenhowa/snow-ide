"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var click_handler_1 = __importDefault(require("editor/handlers/click-handler"));
exports.ClickHandler = click_handler_1.default;
var keydown_handler_1 = __importDefault(require("editor/handlers/keydown-handler"));
exports.KeydownHandler = keydown_handler_1.default;
var mouseclick_handler_1 = __importDefault(require("editor/handlers/mouseclick-handler"));
exports.MouseClickHandler = mouseclick_handler_1.default;
