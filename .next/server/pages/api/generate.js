"use strict";
(() => {
var exports = {};
exports.id = 565;
exports.ids = [565];
exports.modules = {

/***/ 15:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

// ESM COMPAT FLAG
__webpack_require__.r(__webpack_exports__);

// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  "default": () => (/* binding */ generate)
});

;// CONCATENATED MODULE: external "openai"
const external_openai_namespaceObject = require("openai");
;// CONCATENATED MODULE: ./pages/api/generate.js

const configuration = new external_openai_namespaceObject.Configuration({
    apiKey: process.env.OPENAI_API_KEY
});
const openai = new external_openai_namespaceObject.OpenAIApi(configuration);
/* harmony default export */ async function generate(req, res) {
    const response = await openai.createImage({
        prompt: req.body.question,
        n: 1,
        size: "256x256"
    });
    res.status(200).json({
        result: response.data.data[0].url
    });
} // function generatePrompt(question) {
 //   const capitalizedAnimal =
 //     animal[0].toUpperCase() + animal.slice(1).toLowerCase();
 //   return `Suggest three names for an animal that is a superhero.
 // Animal: Cat
 // Names: Captain Sharpclaw, Agent Fluffball, The Incredible Feline
 // Animal: Dog
 // Names: Ruff the Protector, Wonder Canine, Sir Barks-a-Lot
 // Animal: ${capitalizedAnimal}
 // Names:`;
 // }


/***/ })

};
;

// load runtime
var __webpack_require__ = require("../../webpack-api-runtime.js");
__webpack_require__.C(exports);
var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
var __webpack_exports__ = (__webpack_exec__(15));
module.exports = __webpack_exports__;

})();