import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { Compiler } from 'webpack';
import { startServer, stopServer } from '../lib/server';
import { TypescriptCompiler } from '../lib/TypescriptCompiler';
import {
  DEFAULT_FETCH_TIMEOUT,
  isObjectEmpty,
  normalizeOptions,
  validateTypeServeOptions,
} from '../lib/normalizeOptions';
import { TypesCache } from '../lib/Caching';
import {
  FederatedTypesPluginOptions,
  TypeServeOptions,
  TypesStatsJson,
} from '../types';

import download from '../lib/download';
import { Logger, LoggerInstance } from '../Logger';
import { generateTypesStats } from '../lib/generateTypesStats';

const PLUGIN_NAME = 'FederatedTypesPlugin';
const SUPPORTED_PLUGINS = ['ModuleFederationPlugin', 'NextFederationPlugin'];

export class FederatedTypesPlugin {
  private normalizeOptions!: ReturnType<typeof normalizeOptions>;
  private logger!: LoggerInstance;

  constructor(private options: FederatedTypesPluginOptions) {}

  apply(compiler: Compiler) {
    this.logger = Logger.setLogger(
      compiler.getInfrastructureLogger(PLUGIN_NAME),
    );

    if (
      !compiler.options.plugins.some(
        (p) => SUPPORTED_PLUGINS.indexOf(p?.constructor.name ?? '') !== -1,
      )
    ) {
      this.logger.error(
        'Unable to find the Module Federation Plugin, this is plugin no longer provides it by default. Please add it to your webpack config.',
      );
      throw new Error('Unable to find the Module Federation Plugin');
    }

    this.normalizeOptions = normalizeOptions(this.options, compiler);

    const { disableDownloadingRemoteTypes, disableTypeCompilation } =
      this.normalizeOptions;

    // Bail if both 'disableDownloadingRemoteTypes' & 'disableTypeCompilation' are 'truthy'
    if (disableDownloadingRemoteTypes && disableTypeCompilation) {
      return;
    }

    compiler.options.watchOptions.ignored =
      this.normalizeOptions.ignoredWatchOptions;

    const importRemotes = async (
      callback: Parameters<
        Parameters<typeof compiler.hooks.beforeRun.tapAsync>['1']
      >['1'],
    ) => {
      try {
        await this.importRemoteTypes();
        callback();
      } catch (error) {
        callback(this.getError(error));
      }
    };

    if (!disableTypeCompilation) {
      this.handleTypeGeneration(
        compiler,
        this.normalizeOptions.typeServeOptions,
      );
    }

    if (!disableDownloadingRemoteTypes) {
      compiler.hooks.beforeCompile.tapAsync(
        PLUGIN_NAME,
        async (_, callback) => {
          this.logger.log(
            'Preparing to download types from remotes on startup',
          );

          await importRemotes(callback);
        },
      );
    }
  }

  private handleTypeGeneration(
    compiler: Compiler,
    typeServeOptions: TypeServeOptions | undefined,
  ) {
    if (typeServeOptions) {
      compiler.hooks.beforeCompile.tapAsync(
        PLUGIN_NAME,
        async (_, callback) => {
          this.logger.log('Preparing to serve types');

          validateTypeServeOptions(typeServeOptions);

          await startServer({
            outputPath: compiler.outputPath,
            host: typeServeOptions.host,
            port: typeServeOptions.port,
            logger: this.logger,
          });

          callback();
        },
      );

      compiler.hooks.failed.tap(PLUGIN_NAME, () => {
        stopServer({ logger: this.logger });
      });

      compiler.hooks.done.tap(PLUGIN_NAME, () => {
        stopServer({ logger: this.logger });
      });
    }

    compiler.hooks.afterEmit.tapAsync(PLUGIN_NAME, async (_, callback) => {
      this.logger.log('Preparing to Generate types');

      const federatedTypesMap = this.compileTypes();

      const { typesIndexJsonFilePath, publicPath } = this.normalizeOptions;

      const statsJson: TypesStatsJson = {
        publicPath,
        files: generateTypesStats(federatedTypesMap, this.normalizeOptions),
      };

      if (Object.entries(statsJson.files).length === 0) {
        callback();
        return;
      }

      const dest = path.join(compiler.outputPath, typesIndexJsonFilePath);

      await fs.writeFile(dest, JSON.stringify(statsJson), (error) => {
        callback(error);
        if (error) {
          throw error;
        }
      });
    });
  }

  private compileTypes() {
    const exposedComponents = this.options.federationConfig.exposes;

    if (!exposedComponents) {
      return {};
    }

    // './Component': 'path/to/component' -> ['./Component', 'path/to/component']
    const compiler = new TypescriptCompiler(this.normalizeOptions);

    try {
      return compiler.generateDeclarationFiles(
        exposedComponents,
        this.options.additionalFilesToCompile,
      );
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  private async delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async importRemoteTypes() {
    const remoteComponents = this.options.federationConfig.remotes;

    if (
      !remoteComponents ||
      (remoteComponents && isObjectEmpty(remoteComponents))
    ) {
      this.logger.log('No Remote components configured');
      return;
    }

    this.logger.log('Normalizing remote URLs');
    const remoteUrls = Object.entries(remoteComponents).map(
      ([remote, entry]: [string, string]) => {
        let urlEndIndex = entry.length;
        if (entry.endsWith('.js')) {
          urlEndIndex = entry.lastIndexOf('/');
        }
        const remoteUrl = entry.substring(0, urlEndIndex);
        const splitIndex = remoteUrl.indexOf('@');
        const url = remoteUrl.substring(splitIndex + 1);

        return {
          origin: url ?? remoteUrl,
          remote,
        };
      },
    );

    for await (const { origin, remote } of remoteUrls) {
      const { typescriptFolderName, typeFetchOptions } = this.normalizeOptions;

      const {
        shouldRetryOnTypesNotFound,
        downloadRemoteTypesTimeout,
        retryDelay,
        maxRetryAttempts,
        shouldRetry,
      } = typeFetchOptions;

      const isRetrying = shouldRetry || shouldRetryOnTypesNotFound;

      const maxRetryCount = !isRetrying ? 0 : maxRetryAttempts!;

      let retryCount = 0;
      let delay = retryDelay!;

      while (retryCount < maxRetryCount) {
        try {
          await this.downloadTypesFromRemote(
            remote,
            origin,
            downloadRemoteTypesTimeout!,
            shouldRetryOnTypesNotFound!,
            typescriptFolderName,
          );
          break;
        } catch (error) {
          this.logger.error(`Unable to download types from remote '${remote}'`);
          this.logger.log(error);

          if (isRetrying) {
            retryCount++;

            if (retryCount < maxRetryCount) {
              delay = retryDelay! * retryCount;
              this.logger.log(
                `Retrying download of types from remote '${remote}' in ${delay}ms`,
              );
              await this.delay(delay);
            }
          }
        }
      }
    }
  }

  private async downloadTypesFromRemote(
    remote: string,
    origin: string,
    downloadRemoteTypesTimeout: number,
    shouldRetryOnTypesNotFound: boolean,
    typescriptFolderName: string,
  ) {
    try {
      this.logger.log(`Getting types index for remote '${remote}'`);
      const resp = await axios.get<TypesStatsJson>(
        `${origin}/${this.normalizeOptions.typesIndexJsonFileName}`,
        { timeout: downloadRemoteTypesTimeout },
      );

      const statsJson = resp.data;

      if (statsJson?.files) {
        this.logger.log(`Checking with Cache entries`);

        const { filesToCacheBust, filesToDelete } =
          TypesCache.getCacheBustedFiles(remote, statsJson);

        this.logger.log('filesToCacheBust', filesToCacheBust);
        this.logger.log('filesToDelete', filesToDelete);

        if (filesToDelete.length > 0) {
          filesToDelete.forEach((file) => {
            fs.unlinkSync(
              path.resolve(
                this.normalizeOptions.webpackCompilerOptions.context as string,
                typescriptFolderName,
                remote,
                file,
              ),
            );
          });
        }

        if (filesToCacheBust.length > 0) {
          await Promise.all(
            filesToCacheBust.map((file) => {
              const url = new URL(
                path.join(origin, typescriptFolderName, file),
              ).toString();
              const destination = path.join(
                this.normalizeOptions.webpackCompilerOptions.context as string,
                typescriptFolderName,
                remote,
              );

              this.logger.log('Downloading types...');
              return download({
                url,
                destination,
                filename: file,
              });
            }),
          );

          this.logger.log('downloading complete');
        }
      } else {
        this.logger.log(`No types index found for remote '${remote}'`);

        if (shouldRetryOnTypesNotFound) {
          throw new Error(`shouldRetryOnTypesNotFound is enabled, retrying...`);
        }
      }
    } catch (error) {
      this.logger.error(
        `Unable to download '${remote}' remote types index file: `,
        (error as Error).message,
      );
      throw error;
    }
  }

  private getError(error: unknown): Error {
    if (error instanceof Error) {
      return error;
    }
    return new Error(error as string);
  }
}
