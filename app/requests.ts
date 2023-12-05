import {
  ChatMessage,
  ModelType,
  useAccessStore,
  useAppConfig,
  useChatStore,
} from "./store";
import { ACCESS_CODE_PREFIX } from "./constant";

const TIME_OUT_MS = 60000;

export function getHeaders() {
  const accessStore = useAccessStore.getState();
  let headers: Record<string, string> = {};

  const makeBearer = (token: string) => `Bearer ${token.trim()}`;
  const validString = (x: string) => x && x.length > 0;

  // use user's api key first
  if (validString(accessStore.openaiApiKey)) {
    headers.Authorization = makeBearer(accessStore.openaiApiKey);
  } else if (
    accessStore.enabledAccessControl() &&
    validString(accessStore.accessCode)
  ) {
    headers.Authorization = makeBearer(
      ACCESS_CODE_PREFIX + accessStore.accessCode,
    );
  }

  return headers;
}

export function requestOpenaiClient(url: string) {
  return (body: any, method = "POST") =>
    fetch(url, {
      method,
      body: body && JSON.stringify(body),
      headers: getHeaders(),
    });
}

// To store message streaming controller
export const ControllerPool = {
  controllers: {} as Record<string, AbortController>,

  addController(
    sessionIndex: string,
    messageId: string,
    controller: AbortController,
  ) {
    const key = this.key(sessionIndex, messageId);
    this.controllers[key] = controller;
    return key;
  },

  stop(sessionIndex: string, messageId: string) {
    const key = this.key(sessionIndex, messageId);
    const controller = this.controllers[key];
    controller?.abort();
  },

  stopAll() {
    Object.values(this.controllers).forEach((v) => v.abort());
  },

  hasPending() {
    return Object.values(this.controllers).length > 0;
  },

  remove(sessionIndex: string, messageId: string) {
    const key = this.key(sessionIndex, messageId);
    delete this.controllers[key];
  },

  key(sessionIndex: string, messageIndex: string) {
    return `${sessionIndex},${messageIndex}`;
  },
};
