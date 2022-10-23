import { Compilation, Compiler, sources } from 'webpack';
import { CompilationParams, TypesStatsJson } from '../types';

const PLUGIN_NAME = 'FederatedTypesStatsPlugin';

interface FederatedTypesStatsPluginOptions {
  filename: string;
  // statsResult: TypesStatsJson;
}

export class FederatedTypesStatsPlugin {
  constructor(private options: FederatedTypesStatsPluginOptions) {}

  apply(compiler: Compiler) {
    compiler.hooks.compilation.tap(PLUGIN_NAME, (compilation, params) => {
      const statsResult = (params as CompilationParams).federated_types_stats;

      compilation.hooks.processAssets.tapPromise(
        {
          name: PLUGIN_NAME,
          stage: Compilation.PROCESS_ASSETS_STAGE_ANALYSE,
        },
        async () => {
          const { filename } = this.options;

          const source = new sources.RawSource(JSON.stringify(statsResult));

          const asset = compilation.getAsset(filename);

          if (asset) {
            compilation.updateAsset(filename, source);
          } else {
            compilation.emitAsset(filename, source);
          }
        }
      );
    });
  }
}
