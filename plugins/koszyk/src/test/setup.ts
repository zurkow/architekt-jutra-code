import "@testing-library/jest-dom";
import { TextEncoder, TextDecoder } from "util";
import { webcrypto } from "crypto";

Object.assign(global, { TextEncoder, TextDecoder });

// jsdom does not implement crypto.randomUUID — polyfill with Node's webcrypto
if (!global.crypto) {
  Object.defineProperty(global, "crypto", { value: webcrypto });
} else if (!global.crypto.randomUUID) {
  Object.defineProperty(global.crypto, "randomUUID", {
    value: webcrypto.randomUUID.bind(webcrypto),
  });
}
