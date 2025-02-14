import {
  AppState,
  Bip39,
  InvalidMnemonicError,
  Mnemonic,
  PlatformName,
  SyncLock,
} from "@evolu/common";
import NetInfo, { NetInfoState } from "@react-native-community/netinfo";
import {
  generateMnemonic,
  mnemonicToSeed,
  validateMnemonic,
} from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { reloadAsync } from "expo-updates";
import { DevSettings, AppState as ReactNativeAppState } from "react-native";

export const PlatformNameLive = Layer.succeed(PlatformName, "react-native");

export const SyncLockLive = Layer.effect(
  SyncLock,
  Effect.sync(() => {
    let hasSyncLock = false;
    return SyncLock.of({
      acquire: Effect.sync(() => {
        if (hasSyncLock) return false;
        hasSyncLock = true;
        return true;
      }),
      release: Effect.sync(() => {
        hasSyncLock = false;
      }),
    });
  }),
);

export const AppStateLive = Layer.succeed(
  AppState,
  AppState.of({
    init: ({ onRequestSync }) => {
      let appStateStatus = ReactNativeAppState.currentState;
      ReactNativeAppState.addEventListener("change", (current): void => {
        if (appStateStatus.match(/inactive|background/) && current === "active")
          onRequestSync();
        appStateStatus = current;
      });

      let netInfoState: NetInfoState | null = null;
      NetInfo.addEventListener((current) => {
        if (
          netInfoState?.isInternetReachable === false &&
          current.isConnected &&
          current.isInternetReachable
        )
          onRequestSync();
        netInfoState = current;
      });
    },

    reset: Effect.sync(() => {
      if (process.env.NODE_ENV === "development") DevSettings.reload();
      else reloadAsync();
    }),
  }),
);

export const Bip39Live = Layer.succeed(
  Bip39,
  Bip39.of({
    make: Effect.sync(() => generateMnemonic(wordlist, 128) as Mnemonic),

    toSeed: (mnemonic) => Effect.promise(() => mnemonicToSeed(mnemonic)),

    parse: (mnemonic) =>
      validateMnemonic(mnemonic, wordlist)
        ? Effect.succeed(mnemonic as Mnemonic)
        : Effect.fail<InvalidMnemonicError>({ _tag: "InvalidMnemonicError" }),
  }),
);
