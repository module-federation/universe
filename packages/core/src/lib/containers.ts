import {
  AsyncContainer,
  RemoteContainer,
  RemoteOptions,
  SharedScope,
} from '../types';
import { getScope } from './scopes';

/**
 * Creates a shell container on the common scope.
 * @param remoteOptions
 */
export const registerContainer = (
  asyncContainer: AsyncContainer,
  remoteOptions: RemoteOptions
) => {
  const globalScope = getScope();
  const containerKey = getContainerKey(remoteOptions);

  if (globalScope[containerKey]) return;

  globalScope[containerKey] = asyncContainer;
};

/**
 * Returns a standardize key for the container
 * @param remoteOptions
 * @returns
 */
export const getContainerKey = (
  remoteOptions: string | RemoteOptions // TODO: Should string be deprecated?
): string => {
  if (typeof remoteOptions === 'string') {
    return remoteOptions as string;
  }

  const options = remoteOptions as RemoteOptions;
  return options.uniqueKey ? options.uniqueKey : options.global;
};

/**
 * Returns a remote container if available.
 * @param remoteContainer
 * @returns
 */
export const getContainer = async (
  remoteContainer: string | RemoteOptions // TODO: Should string be deprecated?
): Promise<RemoteContainer | undefined> => {
  const globalScope = getScope();

  if (!remoteContainer) {
    throw Error(`Remote container options is empty`);
  }

  if (typeof remoteContainer === 'string') {
    if (globalScope[remoteContainer]) {
      const container = globalScope[remoteContainer] as AsyncContainer;
      return await container;
    }

    return undefined;
  } else {
    const uniqueKey = getContainerKey(remoteContainer);
    if (globalScope[uniqueKey]) {
      const container = globalScope[uniqueKey] as AsyncContainer;
      return await container;
    }

    return undefined;
  }
};

/**
 * Initializes a remote container with a shared scope.
 * @param remoteContainer
 * @param sharedScope
 */
export const initContainer = async (
  asyncContainer: AsyncContainer,
  sharedScope: SharedScope
): Promise<RemoteContainer> => {
  const remoteContainer = await asyncContainer;

  if (!remoteContainer.__initialized && !remoteContainer.__initializing) {
    remoteContainer.__initializing = true;

    // TODO: check init tokens

    await remoteContainer.init(sharedScope.default);
    remoteContainer.__initialized = true;
    delete remoteContainer.__initializing;
  }

  return remoteContainer;
};
