import { DEFAULT_API_HOST, DEFAULT_MODELS, StoreKey } from "../constant";
import { ACCESS_CODE_CHECK } from "../constant";
import { getHeaders } from "../client/api";
import { getClientConfig } from "../config/client";
import { createPersistStore } from "../utils/store";

export interface AccessControlStore {
  accessCode: string;
  token: string;

  needCode: boolean;
  hideUserApiKey: boolean;
  hideBalanceQuery: boolean;
  disableGPT4: boolean;

  openaiUrl: string;

  updateToken: (_: string) => void;
  updateCode: (_: string) => void;
  updateOpenAiUrl: (_: string) => void;
  reduce: () => void;
  enabledAccessControl: () => boolean;
  leftChance: () => Promise<boolean>;
  leftCount: number;
  leftImgCount: number;
  isAuthorized: () => boolean;
  isImgAuthorized: () => boolean;
  fetch: () => void;
}
let fetchState = 0; // 0 not fetch, 1 fetching, 2 done
let flag = false;

const DEFAULT_OPENAI_URL =
  getClientConfig()?.buildMode === "export" ? DEFAULT_API_HOST : "/api/openai/";
console.log("[API] default openai url", DEFAULT_OPENAI_URL);

const DEFAULT_ACCESS_STATE = {
  token: "",
  accessCode: "",
  needCode: true,
  hideUserApiKey: false,
  hideBalanceQuery: false,
  disableGPT4: false,
  openaiUrl: DEFAULT_OPENAI_URL,
  updateToken: function (_: string) {},
  updateCode: function (_: string) {},
  updateOpenAiUrl: function (_: string) {},
  reduce: function () {},
  enabledAccessControl: function () {},
  leftChance: function () {},
  leftCount: 0,
  leftImgCount: 0,
  isAuthorized: function () {},
  isImgAuthorized: function () {},
  fetch: function () {},
};

export const useAccessStore = createPersistStore(
  { ...DEFAULT_ACCESS_STATE },

  (set, get) => ({
    enabledAccessControl() {
      this.fetch();

      return get().needCode;
    },
    reduce() {
      fetch(ACCESS_CODE_CHECK.REDUCE_CHANCE + this.accessCode, {
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
        ACCESS_CODE_CHECK.LEFT_CHANCE + this.accessCode,
        {
          method: "post",
          headers: {},
          body: null,
        },
      );
      const result = await response.json();
      flag = result.data.openApiCount > 0;
      this.leftCount = Math.max(result.data.openApiCount - 1, 0);
      this.leftImgCount = result.data.imageApiCount;
      this.disableGPT4 = result.data.enableGpt4 > 0;
      if (this.disableGPT4) {
        DEFAULT_MODELS.forEach(
          (m: any) => (m.available = !m.name.startsWith("gpt-4")),
        );
      }
      return flag;
    },
    enabledAccessControl() {
      return true;
    },
    updateCode(code: string) {
      set(() => ({ accessCode: code?.trim() }));
    },
    updateToken(token: string) {
      set(() => ({ token: token?.trim() }));
    },
    updateOpenAiUrl(url: string) {
      set(() => ({ openaiUrl: url?.trim() }));
    },
    isAuthorized() {
      get().fetch();
      return flag || !!get().accessCode;
    },
    isImgAuthorized() {
      return this.leftImgCount > 0;
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
        .then((res: DangerConfig) => {
          console.log("[Config] got config from server", res);
          set(() => ({ ...res }));

          if (res.disableGPT4) {
            DEFAULT_MODELS.forEach(
              (m: any) => (m.available = !m.name.startsWith("gpt-4")),
            );
          }
        })
        .then(() => {
          fetch(ACCESS_CODE_CHECK.LEFT_CHANCE + this.accessCode, {
            method: "post",
            headers: {},
            body: null,
          })
            .then((res) => res.json())
            .then((res) => {
              this.disableGPT4 = res.data.enableGpt4 > 0;
              if (!this.disableGPT4) {
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
    version: 1,
  },
);
