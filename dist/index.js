/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ 105:
/***/ ((module) => {

module.exports = eval("require")("@actions/core");


/***/ }),

/***/ 138:
/***/ ((module) => {

module.exports = eval("require")("fast-cartesian");


/***/ }),

/***/ 982:
/***/ ((module) => {

module.exports = eval("require")("js-yaml");


/***/ }),

/***/ 42:
/***/ ((module) => {

module.exports = eval("require")("pandas-js");


/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __nccwpck_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		var threw = true;
/******/ 		try {
/******/ 			__webpack_modules__[moduleId](module, module.exports, __nccwpck_require__);
/******/ 			threw = false;
/******/ 		} finally {
/******/ 			if(threw) delete __webpack_module_cache__[moduleId];
/******/ 		}
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat */
/******/ 	
/******/ 	if (typeof __nccwpck_require__ !== 'undefined') __nccwpck_require__.ab = __dirname + "/";
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it need to be isolated against other modules in the chunk.
(() => {
const cartesian = __nccwpck_require__(138);
const core = __nccwpck_require__(105);
const pd = __nccwpck_require__(42);
const yaml = __nccwpck_require__(982);

function load_matrix(data) {
  let columns = Object.keys(data);
  return new pd.DataFrame(
    cartesian(Object.values(data)).map((row) =>
      Object.fromEntries(row.map((val, idx) => [columns[idx], val]))
    )
  );
}

function ordered_merge(left, right, on, how) {
  let columns = left.columns.concat(
    right.columns.filter((x) => !left.columns.includes(x))
  );
  return left.merge(right, on, how).get(columns);
}

function drop_duplicates(df) {
  return new pd.DataFrame(
    Array.from(
      new Set(Array.from(df).map((x) => JSON.stringify(Object.fromEntries(x))))
    ).map((x) => JSON.parse(x))
  );
}

function sort(df) {
  return new pd.DataFrame(
    Array.from(df).sort(function (a, b) {
      let x = Object.fromEntries(a);
      let y = Object.fromEntries(b);
      for (let i of df.columns) {
        if (x[i] === y[i]) continue;
        if (x[i] === null) return -1;
        if (y[i] === null) return 1;
        return x[i].localeCompare(y[i]);
      }
      return 0;
    })
  );
}

try {
  const config = yaml.load(core.getInput("config"));

  var matrix = load_matrix(config.matrix);
  core.debug(`Initial matrix:\n${matrix.toString()}`);

  for (let op of config.operations) {
    let op_matrix = load_matrix(op.matrix);
    core.debug(`Operation: ${op.type}`);
    core.debug(`Match: ${op.match}`);
    core.debug(`Matrix:\n${op_matrix.toString()}`);
    core.debug(`If: ${op.if}`);
    // If undefined or true, do not break out of the loop
    if (op.if !== undefined && !op.if) continue;

    switch (op.type) {
      case "append":
        matrix = matrix.append(op_matrix);
        break;
      case "merge":
        matrix = ordered_merge(matrix, op_matrix, op.match, "outer");
        break;
      case "add":
        let diff = matrix.columns.filter((x) => !op_matrix.columns.includes(x));
        let selection = Array.from(new Set([...diff, ...op.match]));
        core.debug(`Selection: ${selection}`);
        let selected = matrix.get(selection);
        core.debug(`Selected:\n${selected.toString()}`);
        let merged = drop_duplicates(
          selected.merge(op_matrix, op.match).get(matrix.columns)
        );
        core.debug(`Merged:\n${merged.toString()}`);
        matrix = matrix.append(merged);
        break;
      default:
        core.warning(`Unknown operation type ${op.type}`);
    }
    core.debug(`Result:\n${matrix.toString()}`);
  }

  // sort the results
  matrix = sort(matrix);
  core.debug(`Sorted:\n${matrix.toString()}`);

  // output without nulls
  core.setOutput(
    "matrix",
    JSON.stringify({
      include: Array.from(matrix).map((row) =>
        Object.fromEntries(
          Array.from(row).map((x) => [x[0], x[1] === null ? undefined : x[1]])
        )
      ),
    })
  );
} catch (error) {
  core.setFailed(error.message);
}

})();

module.exports = __webpack_exports__;
/******/ })()
;