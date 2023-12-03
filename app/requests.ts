import type { ChatRequest, ChatResponse } from "./api/openai/typing";
import {
  ChatMessage,
  ModelType,
  useAccessStore,
  useAppConfig,
  useChatStore,
} from "./store";
import { ACCESS_CODE_PREFIX } from "./constant";

const TIME_OUT_MS = 60000;

const makeRequestParam = (
  messages: ChatMessage[],
  options?: {
    stream?: boolean;
    overrideModel?: ModelType;
  },
): ChatRequest => {
  let sendMessages = messages.map((v) => ({
    role: v.role,
    content: v.content,
  }));

  const modelConfig = {
    ...useAppConfig.getState().modelConfig,
    ...useChatStore.getState().currentSession().mask.modelConfig,
  };

  // override model config
  if (options?.overrideModel) {
    modelConfig.model = options.overrideModel;
  }

  return {
    messages: sendMessages,
    stream: options?.stream,
    model: modelConfig.model,
    temperature: modelConfig.temperature,
    presence_penalty: modelConfig.presence_penalty,
  };
};

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

export function requestOpenaiClient(path: string) {
  const openaiUrl = useAccessStore.getState().openaiUrl;
  return (body: any, method = "POST") =>
    fetch(openaiUrl + path, {
      method,
      body: body && JSON.stringify(body),
      headers: getHeaders(),
    });
}

export async function requestChat(
  messages: ChatMessage[],
  options?: {
    model?: ModelType;
  },
) {
  const req: ChatRequest = makeRequestParam(messages, {
    overrideModel: options?.model,
  });

  const res = await requestOpenaiClient("v1/chat/completions")(req);

  try {
    return (await res.json()) as ChatResponse;
  } catch (error) {
    console.error("[Request Chat] ", error, res.body);
  }
}
