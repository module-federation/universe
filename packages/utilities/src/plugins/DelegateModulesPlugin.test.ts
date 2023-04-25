import DelegateModulesPlugin from './DelegateModulesPlugin';
import { Compilation } from 'webpack';
import { RawSource } from 'webpack-sources';

// Mock a minimal Webpack Module
function createMockModule(resource: string): any {
  return {
    resource,
    identifier: () => resource,
    source: () => new RawSource(''),
  };
}

// Mock a minimal Webpack Compiler
function createMockCompiler(): any {
  return {
    options: {
      name: 'test-compiler',
    },
    hooks: {
      compilation: {
        tap: jest.fn(),
      },
    },
  };
}

// Mock a minimal Webpack Compilation
function createMockCompilation(): Compilation {
  return {
    hooks: {
      optimizeChunks: {
        tap: jest.fn(),
      },
      finishModules: {
        tapAsync: jest.fn(),
      },
    },
    chunkGraph: {
      isModuleInChunk: jest.fn(),
      connectChunkAndModule: jest.fn(),
      disconnectChunkAndModule: jest.fn(),
    },
  } as unknown as Compilation;
}

describe('DelegateModulesPlugin', () => {
  it('should be an instance of DelegateModulesPlugin', () => {
    const plugin = new DelegateModulesPlugin({});
    expect(plugin).toBeInstanceOf(DelegateModulesPlugin);
  });

  it('should apply the plugin to the compiler and call the hooks', () => {
    const plugin = new DelegateModulesPlugin({});
    const compiler = createMockCompiler();

    plugin.apply(compiler);

    expect(compiler.hooks.compilation.tap).toHaveBeenCalledWith(
      'DelegateModulesPlugin',
      expect.any(Function)
    );
  });

  it('should add and remove delegate modules correctly', () => {
    const plugin = new DelegateModulesPlugin({
      runtime: 'runtime',
      container: 'container',
      remotes: {
        remote1: 'internal /path/to/remote1',
        remote2: 'internal /path/to/remote2',
      },
    });

    const compiler = createMockCompiler();
    const compilation = createMockCompilation();

    plugin.apply(compiler);

    // Call the compilation tap function
    (compiler.hooks.compilation.tap as jest.Mock).mock.calls[0][1](compilation);

    // Call the finishModules tap function
    (compilation.hooks.finishModules.tapAsync as jest.Mock).mock.calls[0][1](
      [
        createMockModule('/path/to/remote1'),
        createMockModule('/path/to/remote2'),
        createMockModule('/path/to/non-delegate-module'),
      ],
      () => {}
    );

    // Check if delegate modules are added
    expect(plugin['_delegateModules'].size).toBe(2);

    // Call the optimizeChunks tap function
    (compilation.hooks.optimizeChunks.tap as jest.Mock).mock.calls[0][1]([
      { name: 'runtime', hasRuntime: () => true },
      { name: 'container', hasRuntime: () => false },
    ]);

    // Check if connectChunkAndModule was called
    expect(compilation.chunkGraph.connectChunkAndModule).toHaveBeenCalledTimes(
      4
    );

    // Check if disconnectChunkAndModule was called
    expect(
      compilation.chunkGraph.disconnectChunkAndModule
    ).toHaveBeenCalledTimes(2);
  });
});
