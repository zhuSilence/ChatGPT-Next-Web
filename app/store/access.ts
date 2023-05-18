import { create } from "zustand";
import { persist } from "zustand/middleware";
import { StoreKey, ACCESS_CODE_CHECK } from "../constant";
import { getHeaders } from "../client/api";
import { ALL_MODELS } from "./config";

export interface AccessControlStore {
  accessCode: string;
  token: string;

  needCode: boolean;
  hideUserApiKey: boolean;
  openaiUrl: string;

  updateToken: (_: string) => void;
  updateCode: (_: string) => void;
  reduce: () => void;
  enabledAccessControl: () => boolean;
  leftChance: () => Promise<boolean>;
  leftCount: number,
  leftImgCount: number,
  isAuthorized: () => boolean;
  isImgAuthorized: () => boolean;
  fetch: () => void;
}

let fetchState = 0; // 0 not fetch, 1 fetching, 2 done
let flag = false;

export const useAccessStore = create<AccessControlStore>()(
  persist(
    (set, get) => ({
      token: "",
      accessCode: "default",
      needCode: true,
      hideUserApiKey: false,
      openaiUrl: "/api/openai/",
      leftCount: -1,
      leftImgCount: 0,

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
        return flag;
      },
      enabledAccessControl() {
        return true;
      },
      updateCode(code: string) {
        set(() => ({ accessCode: code }));
      },
      updateToken(token: string) {
        set(() => ({ token }));
      },
      isAuthorized() {
        get().fetch();
        return flag || !!get().accessCode;
      },
      isImgAuthorized() {
          return this.leftImgCount > 0;
      },
      fetch() {
        if (fetchState > 0) return;
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

            if (!res.enableGPT4) {
              ALL_MODELS.forEach((model) => {
                if (model.name.startsWith("gpt-4")) {
                  (model as any).available = false;
                }
              });
            }

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
  ),
);
