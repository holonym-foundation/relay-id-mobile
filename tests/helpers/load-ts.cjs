const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

exports.loadTs = (filename, mocks = {}, globals = {}) => {
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(code, {
    module, exports: module.exports,
    require: (id) => Object.hasOwn(mocks, id) ? mocks[id] : require(id),
    process, console, AbortController, setTimeout, clearTimeout,
    ...globals,
  }, { filename });
  return module.exports;
};
