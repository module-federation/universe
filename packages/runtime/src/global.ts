import { FederationHost } from './core';
import { RemoteEntryExports, GlobalShareScope, Remote, Optional } from './type';
import { getFMId } from './utils/tool';
import { GlobalModuleInfo, ModuleInfo } from '@module-federation/sdk';
import { getBuilderId, isDebugMode } from './utils/env';
import { warn } from './utils/logger';
import { FederationRuntimePlugin } from './type/plugin';

export type Federation = {
  __GLOBAL_PLUGIN__: Array<FederationRuntimePlugin>;
  __DEBUG_CONSTRUCTOR_VERSION__?: string;
  moduleInfo: GlobalModuleInfo;
  __DEBUG_CONSTRUCTOR__?: typeof FederationHost;
  __INSTANCES__: Array<FederationHost>;
  __SHARE__: GlobalShareScope;
  __MANIFEST_LOADING__: Record<string, Promise<ModuleInfo>>;
  __SHARE_SCOPE_LOADING__: Record<string, boolean | Promise<boolean>>;
  __PRELOADED_MAP__: Map<string, boolean>;
};

// export const nativeGlobal: typeof global = new Function('return this')();
export const nativeGlobal: typeof global = new Function('return this')();

declare global {
  // eslint-disable-next-line no-var
  var __FEDERATION__: Federation,
    __VMOK__: Federation,
    // eslint-disable-next-line no-var
    __GLOBAL_LOADING_REMOTE_ENTRY__: Record<
    string,
    undefined | Promise<RemoteEntryExports | void>
    >;
}

// Avoid being windowed by some microfront end frameworks, but sandbox escapes due to reuse policies
// The sandbox in the microfront does not copy the value of configurable
// If no loading content exists on the global object, the loading object is defined
if (
  !Object.hasOwnProperty.call(globalThis, '__GLOBAL_LOADING_REMOTE_ENTRY__')
) {
  Object.defineProperty(globalThis, '__GLOBAL_LOADING_REMOTE_ENTRY__', {
    value: {},
    configurable: false,
  });
}

export const globalLoading = globalThis.__GLOBAL_LOADING_REMOTE_ENTRY__;

//
if (nativeGlobal.__VMOK__) {
  nativeGlobal.__FEDERATION__ = nativeGlobal.__VMOK__;
} else if (!nativeGlobal.__FEDERATION__) {
  nativeGlobal.__FEDERATION__ = {
    __GLOBAL_PLUGIN__: [],
    __INSTANCES__: [],
    moduleInfo: {},
    __SHARE__: {},
    __MANIFEST_LOADING__: {},
    __SHARE_SCOPE_LOADING__: {},
    __PRELOADED_MAP__: new Map(),
  };

  nativeGlobal.__VMOK__ = nativeGlobal.__FEDERATION__;
}

nativeGlobal.__FEDERATION__.__GLOBAL_PLUGIN__ ??= [];
nativeGlobal.__FEDERATION__.__INSTANCES__ ??= [];
nativeGlobal.__FEDERATION__.moduleInfo ??= {};
nativeGlobal.__FEDERATION__.__SHARE__ ??= {};
nativeGlobal.__FEDERATION__.__MANIFEST_LOADING__ ??= {};
nativeGlobal.__FEDERATION__.__SHARE_SCOPE_LOADING__ ??= {};
nativeGlobal.__FEDERATION__.__PRELOADED_MAP__ ??= new Map();

export const Global = {
  get __FEDERATION__(): typeof nativeGlobal['__FEDERATION__'] {
    const globalThisVal = new Function('return globalThis')();
    return globalThisVal.__FEDERATION__;
  },
};

export function resetFederationGlobalInfo(): void {
  nativeGlobal.__FEDERATION__.__GLOBAL_PLUGIN__ = [];
  nativeGlobal.__FEDERATION__.__INSTANCES__ = [];
  nativeGlobal.__FEDERATION__.moduleInfo = {};
  nativeGlobal.__FEDERATION__.__SHARE__ = {};
  nativeGlobal.__FEDERATION__.__MANIFEST_LOADING__ = {};
  nativeGlobal.__FEDERATION__.__SHARE_SCOPE_LOADING__ = {};
}

export function getGlobalFederationInstance(
  name: string,
  version: string | undefined,
): FederationHost | undefined {
  const buildId = getBuilderId();
  return Global.__FEDERATION__.__INSTANCES__.find(GMInstance => {
    if (buildId && GMInstance.options.id === getBuilderId()) {
      return true;
    }

    if (GMInstance.options.name === name && !version) {
      return true;
    }

    if (
      GMInstance.options.name === name &&
      version &&
      GMInstance.options.version === version
    ) {
      return true;
    }
    return false;
  });
}

export function setGlobalFederationInstance(
  FederationInstance: FederationHost,
): void {
  Global.__FEDERATION__.__INSTANCES__.push(FederationInstance);
}

export function getGlobalFederationConstructor():
| typeof FederationHost
| undefined {
  return Global.__FEDERATION__.__DEBUG_CONSTRUCTOR__;
}

export function setGlobalFederationConstructor(
  FederationConstructor: typeof FederationHost,
): void {
  if (isDebugMode()) {
    Global.__FEDERATION__.__DEBUG_CONSTRUCTOR__ = FederationConstructor;
    Global.__FEDERATION__.__DEBUG_CONSTRUCTOR_VERSION__ = __VERSION__;
  }
}

// eslint-disable-next-line @typescript-eslint/ban-types
export function getInfoWithoutType<T extends object>(
  target: T,
  key: keyof T,
  getModuleInfoHook?: (
    target: any,
    key: string | number | symbol,
  ) => { value: any | undefined; key: string } | void,
): { value: T[keyof T] | undefined; key: string } {
  let res: { value: T[keyof T] | undefined; key: string };
  if (target[key]) {
    res = {
      value: target[key],
      key: key as string,
    };
  } else {
    res = {
      value: undefined,
      key: key as string,
    };
  }

  if (getModuleInfoHook) {
    const hookRes = getModuleInfoHook(target, key);
    res = hookRes || res;
  }
  return res;
}

export const getGlobalSnapshot = (): GlobalModuleInfo =>
  Global.__FEDERATION__.moduleInfo;

export const getTargetSnapshotInfoByModuleInfo = (
  moduleInfo: Optional<Remote, 'alias'>,
  snapshot: GlobalModuleInfo,
  getModuleInfoHook?: (
    target: any,
    key: string | number | symbol,
  ) => { value: any | undefined; key: string } | void,
): GlobalModuleInfo[string] | undefined => {
  // remote include in hostSnapshot
  const moduleKey = getFMId(moduleInfo);
  const getModuleInfo = getInfoWithoutType(
    snapshot,
    moduleKey,
    getModuleInfoHook,
  ).value;

  // remoteSnapshot may don't include version
  if (
    getModuleInfo &&
    !getModuleInfo.version &&
    'version' in moduleInfo &&
    moduleInfo["version"]
  ) {
    getModuleInfo.version = moduleInfo["version"];
  }

  if (getModuleInfo) {
    return getModuleInfo;
  }

  // remote don't include in hostSnapshot
  // deploy micro app snapshot
  if ('version' in moduleInfo && moduleInfo["version"]) {
    const { version, ...resModuleInfo } = moduleInfo;
    const moduleKeyWithoutVersion = getFMId(resModuleInfo);
    const getModuleInfoWithoutVersion = getInfoWithoutType(
      Global.__FEDERATION__.moduleInfo,
      moduleKeyWithoutVersion,
      getModuleInfoHook,
    ).value;

    if (getModuleInfoWithoutVersion?.version === version) {
      return getModuleInfoWithoutVersion;
    }
  }
};

export const getGlobalSnapshotInfoByModuleInfo = (
  moduleInfo: Optional<Remote, 'alias'>,
  extraOptions?: {
    getModuleInfoHook?: (
      target: any,
      key: string | number | symbol,
    ) => { value: any | undefined; key: string } | void;
  },
): GlobalModuleInfo[string] | undefined =>
  getTargetSnapshotInfoByModuleInfo(
    moduleInfo,
    Global.__FEDERATION__.moduleInfo,
    extraOptions?.getModuleInfoHook,
  );

export const setGlobalSnapshotInfoByModuleInfo = (
  remoteInfo: Remote,
  moduleDetailInfo: GlobalModuleInfo[string],
): GlobalModuleInfo => {
  const moduleKey = getFMId(remoteInfo);
  Global.__FEDERATION__.moduleInfo[moduleKey] = moduleDetailInfo;
  return Global.__FEDERATION__.moduleInfo;
};

export const addGlobalSnapshot = (
  moduleInfos: GlobalModuleInfo,
): (() => void) => {
  Global.__FEDERATION__.moduleInfo = {
    ...Global.__FEDERATION__.moduleInfo,
    ...moduleInfos,
  };
  return () => {
    Object.keys(moduleInfos).forEach(key => {
      delete Global.__FEDERATION__.moduleInfo[key];
    });
  };
};

export const getRemoteEntryExports = (
  name: string,
  globalName: string | undefined,
): {
  remoteEntryKey: string;
  entryExports: RemoteEntryExports | undefined;
} => {
  const remoteEntryKey = globalName || `__FEDERATION_${name}:custom__`;
  const entryExports = (globalThis as any)[remoteEntryKey];
  return {
    remoteEntryKey,
    entryExports,
  };
};

// global hooks
export const registerGlobalPlugins = (
  plugins: Array<FederationRuntimePlugin>,
): void => {
  const { __GLOBAL_PLUGIN__ } = Global.__FEDERATION__;

  plugins.forEach(plugin => {
    if (__GLOBAL_PLUGIN__.findIndex(p => p.name === plugin.name) === -1) {
      __GLOBAL_PLUGIN__.push(plugin);
    } else {
      warn(`The plugin ${plugin.name} has been registered.`);
    }
  });
};

export const getGlobalHostPlugins = (): Array<FederationRuntimePlugin> =>
  Global.__FEDERATION__.__GLOBAL_PLUGIN__;

export const getPreloaded = (id: string) =>
  Global.__FEDERATION__.__PRELOADED_MAP__.get(id);
export const setPreloaded = (id: string) =>
  Global.__FEDERATION__.__PRELOADED_MAP__.set(id, true);
