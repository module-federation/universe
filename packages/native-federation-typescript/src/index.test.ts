import AdmZip from 'adm-zip';
import axios from 'axios';
import dirTree from 'directory-tree';
import { rm } from 'fs/promises';
import { join } from 'path';
import { UnpluginOptions } from 'unplugin';
import { describe, expect, it, vi } from 'vitest';
import webpack from 'webpack';
import { rspack } from '@rspack/core';

import {
  NativeFederationTypeScriptHost,
  NativeFederationTypeScriptRemote,
} from './index';
import { RemoteOptions } from '@module-federation/dts-kit';

describe('index', () => {
  const projectRoot = join(__dirname, '..', '..', '..');

  describe('NativeFederationTypeScriptRemote', () => {
    it('throws for missing moduleFederationConfig', () => {
      const writeBundle = () => NativeFederationTypeScriptRemote.rollup({});
      expect(writeBundle).toThrowError('moduleFederationConfig is required');
    });

    it('correctly writeBundle', async () => {
      const options = {
        moduleFederationConfig: {
          name: 'moduleFederationTypescript',
          filename: 'remoteEntry.js',
          exposes: {
            './index': join(__dirname, './index.ts'),
          },
          shared: {
            react: { singleton: true, eager: true },
            'react-dom': { singleton: true, eager: true },
          },
        },
        tsConfigPath: join(__dirname, '..', './tsconfig.json'),
        typesFolder: '@mf-types',
        compiledTypesFolder: 'compiled-types',
        deleteTypesFolder: false,
        additionalFilesToCompile: [],
      };

      const distFolder = join(projectRoot, 'dist', options.typesFolder);

      const unplugin = NativeFederationTypeScriptRemote.rollup(
        options,
      ) as UnpluginOptions;
      await unplugin.writeBundle?.();
      expect(dirTree(distFolder)).toMatchObject({
        name: '@mf-types',
        children: [
          {
            name: 'compiled-types',
            children: [{ name: 'index.d.ts' }],
          },
          { name: 'index.d.ts' },
        ],
      });
    });

    it('correctly enrich webpack config', async () => {
      const options: RemoteOptions = {
        moduleFederationConfig: {
          name: 'moduleFederationTypescript',
          filename: 'remoteEntry.js',
          exposes: {
            './index': join(__dirname, './index.ts'),
          },
          shared: {
            react: { singleton: true, eager: true },
            'react-dom': { singleton: true, eager: true },
          },
        },
        tsConfigPath: join(__dirname, '..', './tsconfig.json'),
        deleteTypesFolder: false,
        typesFolder: '@mf-tests-webpack',
      };

      const webpackCompiler = webpack({
        target: 'web',
        entry: 'data:application/node;base64,',
        output: {
          publicPath: '/',
        },
        plugins: [NativeFederationTypeScriptRemote.webpack(options)],
      });

      const assets = (await new Promise((resolve, reject) => {
        webpackCompiler.run((err, stats) => {
          if (err) {
            reject(err);
          }
          webpackCompiler.close((closeErr) => {
            if (closeErr) {
              reject(closeErr);
            } else {
              resolve(stats?.toJson().assets as webpack.StatsAsset[]);
            }
          });
        });
      })) as webpack.StatsAsset[];

      expect(
        Boolean(assets.find((asset) => asset.name === '@mf-tests-webpack.zip')),
      ).toEqual(true);
      const distFolder = join(projectRoot, 'dist', options.typesFolder!);

      expect(dirTree(distFolder)).toMatchObject({
        name: '@mf-tests-webpack',
        children: [
          {
            name: 'compiled-types',
            children: [{ name: 'index.d.ts' }],
          },
          { name: 'index.d.ts' },
        ],
      });
    });

    it('correctly enrich rspack config', async () => {
      const options = {
        moduleFederationConfig: {
          name: 'moduleFederationTypescript',
          filename: 'remoteEntry.js',
          exposes: {
            './index': join(__dirname, './index.ts'),
          },
          shared: {
            react: { singleton: true, eager: true },
            'react-dom': { singleton: true, eager: true },
          },
        },
        tsConfigPath: join(__dirname, '..', './tsconfig.json'),
        deleteTypesFolder: false,
        typesFolder: '@mf-tests-rspack',
      };

      const rspackCompiler = rspack({
        target: 'web',
        entry: 'data:application/node;base64,',
        output: {
          publicPath: '/',
        },
        // @ts-expect-error ignore
        plugins: [NativeFederationTypeScriptRemote.rspack(options)],
      });

      const assets = (await new Promise((resolve, reject) => {
        rspackCompiler.run((err, stats) => {
          if (err) {
            reject(err);
          }
          rspackCompiler.close((closeErr) => {
            if (closeErr) {
              reject(closeErr);
            } else {
              resolve(stats?.toJson().assets as webpack.StatsAsset[]);
            }
          });
        });
      })) as webpack.StatsAsset[];

      expect(
        Boolean(assets.find((asset) => asset.name === '@mf-tests-rspack.zip')),
      ).toEqual(true);
      const distFolder = join(projectRoot, 'dist', options.typesFolder!);

      expect(dirTree(distFolder)).toMatchObject({
        name: '@mf-tests-rspack',
        children: [
          {
            name: 'compiled-types',
            children: [{ name: 'index.d.ts' }],
          },
          { name: 'index.d.ts' },
        ],
      });
    });
  });

  describe('NativeFederationTypeScriptHost', () => {
    it('throws for missing moduleFederationConfig', () => {
      const writeBundle = () => NativeFederationTypeScriptHost.rollup({});
      expect(writeBundle).toThrowError('moduleFederationConfig is required');
    });

    it('correctly writeBundle', async () => {
      const options = {
        moduleFederationConfig: {
          name: 'moduleFederationTypescript',
          filename: 'remoteEntry.js',
          remotes: {
            remotes: 'https://foo.it',
          },
          shared: {
            react: { singleton: true, eager: true },
            'react-dom': { singleton: true, eager: true },
          },
        },
        typesFolder: '@mf-types',
      };

      const distFolder = join(projectRoot, 'dist', options.typesFolder);
      const zip = new AdmZip();
      await zip.addLocalFolderPromise(distFolder, {});

      axios.get = vi.fn().mockResolvedValueOnce({ data: zip.toBuffer() });

      const unplugin = NativeFederationTypeScriptHost.rollup(
        options,
      ) as UnpluginOptions;
      await expect(unplugin.writeBundle?.()).resolves.not.toThrow();

      const typesFolder = join(projectRoot, options.typesFolder);
      expect(dirTree(typesFolder)).toMatchObject({
        name: '@mf-types',
        children: [
          {
            name: 'remotes',
            children: [
              {
                name: 'compiled-types',
                children: [
                  {
                    name: 'index.d.ts',
                  },
                ],
              },
              { name: 'index.d.ts' },
            ],
          },
        ],
      });

      await rm(options.typesFolder, { recursive: true, force: true });
    });
  });
});
