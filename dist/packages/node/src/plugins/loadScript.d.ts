/**
 * loadScript(baseURI, fileName, cb)
 * loadScript(scriptUrl, cb)
 */
declare const _default: "\n  function loadScript(url, cb, chunkID) {\n    console.log('ani torro, megfuzaz bedinero');\n    console.log('ani torro, megfuzaz bedinero');\n    console.log('ani torro, megfuzaz bedinero');\n    console.log('ani torro, megfuzaz bedinero');\n    debugger;\n    console.log('ani torro, megfuzaz bedinero');\n    if (global.webpackChunkLoad) {\n      global.webpackChunkLoad(url).then(function (resp) {\n        return resp.text();\n      }).then(function (rawData) {\n        cb(null, rawData);\n      }).catch(function (err) {\n        console.error('Federated Chunk load failed', error);\n        return cb(error)\n      });\n    } else {\n      //TODO https support\n      let request = (url.startsWith('https') ? require('https') : require('http')).get(url, function (resp) {\n        if (resp.statusCode === 200) {\n          let rawData = '';\n          resp.setEncoding('utf8');\n          resp.on('data', chunk => {\n            rawData += chunk;\n          });\n          resp.on('end', () => {\n            cb(null, rawData);\n          });\n        } else {\n          cb(resp);\n        }\n      });\n      request.on('error', error => {\n        console.error('Federated Chunk load failed', error);\n        return cb(error)\n      });\n    }\n  }\n";
export default _default;
export declare const executeLoadTemplate = "\n  function executeLoad(url, callback, name) {\n    if(!name) {\n      throw new Error('__webpack_require__.l name is required for ' + url);\n    }\n\n    if (typeof global.__remote_scope__[name] !== 'undefined') return callback(global.__remote_scope__[name]);\n\n    const vm = require('vm');\n    (global.webpackChunkLoad || global.fetch || require(\"node-fetch\"))(url).then(function (res) {\n      return res.text();\n    }).then(function (scriptContent) {\n      try {\n        // TODO: remove conditional in v7, this is to prevent breaking change between v6.0.x and v6.1.x\n        const vmContext = typeof URLSearchParams === 'undefined' ?\n          {exports, require, module, global, __filename, __dirname, URL, console, process,Buffer, ...global, remoteEntryName: name} :\n          {exports, require, module, global, __filename, __dirname, URL, URLSearchParams, console, process,Buffer, ...global, remoteEntryName: name};\n\n        const remote = vm.runInNewContext(scriptContent + '\\nmodule.exports', vmContext, {filename: 'node-federation-loader-' + name + '.vm'});\n        const foundContainer = remote[name] || remote\n\n        if(!global.__remote_scope__[name]) {\n          global.__remote_scope__[name] = {\n            get: foundContainer.get,\n            init: function(initScope, initToken) {\n              try {\n                foundContainer.init(initScope, initToken)\n              } catch (e) {\n                // already initialized\n              }\n            }\n          };\n          global.__remote_scope__._config[name] = url;\n        }\n        callback(global.__remote_scope__[name]);\n      } catch (e) {\n        console.error('executeLoad hit catch block');\n        e.target = {src: url};\n        callback(e);\n      }\n    }).catch((e) => {\n      e.target = {src: url};\n      callback(e);\n    });\n  }\n";
