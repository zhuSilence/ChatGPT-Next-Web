import { create } from "zustand";
import { persist } from "zustand/middleware";
import { StoreKey, ACCESS_CODE_CHECK } from "../constant";om "./chat";

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
  isAuthorized: () => boolean;
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
        const data = await response.json();
        flag = data.data > 0;
        this.leftCount = Math.max(data.data - 1, 0);
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

        // has token or has code or disabled access control
        console.log(flag);
        // return (
        //   get().leftChance()
        // );
        return flag || !!get().accessCode;
      },
      fetch() {
        if (fetchState > 0) return;
        fetchState = 1;
        fetch("/api/config", {
          method: "post",
          body: null,
        })
          .then((res) => res.json())
          .then((res: DangerConfig) => {
            console.log("[Config] got config from server", res);
            set(() => ({ ...res }));
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
