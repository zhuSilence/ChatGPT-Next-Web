import {
  ApiPath,
  DEFAULT_API_HOST,
  GoogleSafetySettingsThreshold,
  ServiceProvider,
  StoreKey,
} from "../constant";
import { DEFAULT_MODELS, ACCESS_CODE_CHECK } from "../constant";
import { getHeaders } from "../client/api";
import { getClientConfig } from "../config/client";
import { createPersistStore } from "../utils/store";
import { ensure } from "../utils/clone";
import { DEFAULT_CONFIG } from "./config";

let fetchState = 0; // 0 not fetch, 1 fetching, 2 done
let flag = false;

const isApp = getClientConfig()?.buildMode === "export";

const DEFAULT_OPENAI_URL = isApp
  ? DEFAULT_API_HOST + "/api/proxy/openai"
  : ApiPath.OpenAI;

const DEFAULT_GOOGLE_URL = isApp
  ? DEFAULT_API_HOST + "/api/proxy/google"
  : ApiPath.Google;

const DEFAULT_ANTHROPIC_URL = isApp
  ? DEFAULT_API_HOST + "/api/proxy/anthropic"
  : ApiPath.Anthropic;

const DEFAULT_BAIDU_URL = isApp
  ? DEFAULT_API_HOST + "/api/proxy/baidu"
  : ApiPath.Baidu;

const DEFAULT_BYTEDANCE_URL = isApp
  ? DEFAULT_API_HOST + "/api/proxy/bytedance"
  : ApiPath.ByteDance;

const DEFAULT_ALIBABA_URL = isApp
  ? DEFAULT_API_HOST + "/api/proxy/alibaba"
  : ApiPath.Alibaba;

console.log("DEFAULT_ANTHROPIC_URL", DEFAULT_ANTHROPIC_URL);

const DEFAULT_ACCESS_STATE = {
  accessCode: "default",
  useCustomConfig: true,

  provider: ServiceProvider.OpenAI,

  // openai
  openaiUrl: DEFAULT_OPENAI_URL,
  openaiApiKey: "",

  // azure
  azureUrl: "",
  azureApiKey: "",
  azureApiVersion: "2023-08-01-preview",

  // google ai studio
  googleUrl: DEFAULT_GOOGLE_URL,
  googleApiKey: "",
  googleApiVersion: "v1",
  googleSafetySettings: GoogleSafetySettingsThreshold.BLOCK_ONLY_HIGH,

  // anthropic
  anthropicUrl: DEFAULT_ANTHROPIC_URL,
  anthropicApiKey: "",
  anthropicApiVersion: "2023-06-01",

  // baidu
  baiduUrl: DEFAULT_BAIDU_URL,
  baiduApiKey: "",
  baiduSecretKey: "",

  // bytedance
  bytedanceUrl: DEFAULT_BYTEDANCE_URL,
  bytedanceApiKey: "",

  // alibaba
  alibabaUrl: DEFAULT_ALIBABA_URL,
  alibabaApiKey: "",

  // server config
  needCode: true,
  hideUserApiKey: true,
  hideBalanceQuery: false,
  disableGPT4: false,
  disableFastLink: false,
  customModels: "",
  defaultModel: "",

  updateToken: function (_: string) {},
  updateCode: function (_: string) {},
  updateOpenAiUrl: function (_: string) {},
  reduce: function () {},
  // enabledAccessControl: function () {},
  leftChance: function () {},
  leftCount: 0,
  leftImgCount: 0,
  // isAuthorized: function () {},
  // isImgAuthorized: function () {},
  fetch: function () {},
};

export const useAccessStore = createPersistStore(
  { ...DEFAULT_ACCESS_STATE },

  (set, get) => ({
    reduce() {
      fetch(ACCESS_CODE_CHECK.REDUCE_CHANCE + get().accessCode, {
        method: "post",
        headers: {},
        body: null,
      })
        .then((res) => res.json())
        .then((res) => {
          flag = res.data > 0;
        });
    },
    async leftChance() {
      const response = await fetch(
        ACCESS_CODE_CHECK.LEFT_CHANCE + get().accessCode,
        {
          method: "post",
          headers: {},
          body: null,
        },
      );
      const result = await response.json();
      flag = result.data.openApiCount > 0;
      set({ leftCount: Math.max(result.data.openApiCount - 1, 0) });
      set({ leftImgCount: result.data.imageApiCount });
      set({ disableGPT4: result.data.enableGpt4 > 0 });
      if (get().disableGPT4) {
        DEFAULT_MODELS.forEach(
          (m: any) => (m.available = !m.name.startsWith("gpt-4")),
        );
      }
      return flag;
    },
    enabledAccessControl() {
      return true;
    },

    isValidOpenAI() {
      return ensure(get(), ["openaiApiKey"]);
    },

    isValidAzure() {
      return ensure(get(), ["azureUrl", "azureApiKey", "azureApiVersion"]);
    },

    isValidGoogle() {
      return ensure(get(), ["googleApiKey"]);
    },

    isValidAnthropic() {
      return ensure(get(), ["anthropicApiKey"]);
    },

    isValidBaidu() {
      return ensure(get(), ["baiduApiKey", "baiduSecretKey"]);
    },

    isValidByteDance() {
      return ensure(get(), ["bytedanceApiKey"]);
    },

    isValidAlibaba() {
      return ensure(get(), ["alibabaApiKey"]);
    },

    isAuthorized() {
      get().fetch();
      return flag || !!get().accessCode;
    },
    isImgAuthorized() {
      return get().leftImgCount > 0;
    },
    fetch() {
      if (fetchState > 0 || getClientConfig()?.buildMode === "export") return;
      fetchState = 1;
      fetch("/api/config", {
        method: "post",
        body: null,
        headers: {
          ...getHeaders(),
        },
      })
        .then((res) => res.json())
        .then((res) => {
          // Set default model from env request
          let defaultModel = res.defaultModel ?? "";
          DEFAULT_CONFIG.modelConfig.model =
            defaultModel !== "" ? defaultModel : "gpt-3.5-turbo";
          return res;
        })
        .then((res: DangerConfig) => {
          console.log("[Config] got config from server", res);
          set(() => ({ ...res }));
        })
        .then(() => {
          fetch(ACCESS_CODE_CHECK.LEFT_CHANCE + get().accessCode, {
            method: "post",
            headers: {},
            body: null,
          })
            .then((res) => res.json())
            .then((res) => {
              set(() => ({ disableGPT4: res.data.enableGpt4 > 0 }));
              if (!get().disableGPT4) {
                DEFAULT_MODELS.forEach(
                  (m: any) => (m.available = !m.name.startsWith("gpt-4")),
                );
              }
            });
        })
        .catch(() => {
          console.error("[Config] failed to fetch config");
        })
        .finally(() => {
          fetchState = 2;
        });
    },
  }),
  {
    name: StoreKey.Access,
    version: 2,
    migrate(persistedState, version) {
      if (version < 2) {
        const state = persistedState as {
          token: string;
          openaiApiKey: string;
          azureApiVersion: string;
          googleApiKey: string;
        };
        state.openaiApiKey = state.token;
        state.azureApiVersion = "2023-08-01-preview";
      }

      return persistedState as any;
    },
  },
);
