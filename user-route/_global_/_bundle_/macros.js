(() => {
  var __defProp = Object.defineProperty;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __getOwnPropSymbols = Object.getOwnPropertySymbols;
  var __propIsEnum = Object.prototype.propertyIsEnumerable;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, {enumerable: true, configurable: true, writable: true, value}) : obj[key] = value;
  var __objSpread = (a, b) => {
    for (var prop in b || (b = {}))
      if (__hasOwnProp.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    if (__getOwnPropSymbols)
      for (var prop of __getOwnPropSymbols(b)) {
        if (__propIsEnum.call(b, prop))
          __defNormalProp(a, prop, b[prop]);
      }
    return a;
  };
  var __commonJS = (cb, mod) => () => (mod || cb((mod = {exports: {}}).exports, mod), mod.exports);

  // user-route/_global_/_macros_/macros.js
  var require_macros = __commonJS((exports, module) => {
    module.exports = () => {
      const hello = "global";
      window.mitm.macros = {global: hello};
      return window.mitm.macros;
    };
  });

  // user-route/_global_/_macros_/build.js
  if (window._ws_connect === void 0) {
    window._ws_connect = {};
  }
  window.mitm.fn.autoclick = () => {
    setTimeout(() => {
      document.querySelector(".btn-autofill").click();
    }, 1e3);
  };
  window.mitm.fn.hotKeys = (obj) => {
    window.mitm.macrokeys = __objSpread(__objSpread({}, window.mitm.macrokeys), obj);
  };
  window.mitm._macros_ = () => {
    window.mitm.macrokeys = {};
  };
  window._ws_connect.macrosOnMount = (data) => {
    console.log("macros code executed after ws open", data);
  };
  var {macros} = window.mitm;
  var _body1 = require_macros();
  if (typeof _body1 === "function") {
    _body1 = _body1();
  }
  var global = require_macros();
  if (typeof global === "function") {
    global = global();
  }
  window.mitm.macros = __objSpread(__objSpread(__objSpread({}, global), macros), _body1);
})();
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vX21hY3Jvc18vbWFjcm9zLmpzIiwgIi4uL19tYWNyb3NfL2J1aWxkLmpzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyJtb2R1bGUuZXhwb3J0cyA9ICgpID0+IHtcclxuICBjb25zdCBoZWxsbyA9ICdnbG9iYWwnXHJcblxyXG4gIHdpbmRvdy5taXRtLm1hY3JvcyA9IHtnbG9iYWw6IGhlbGxvfVxyXG4gIHJldHVybiB3aW5kb3cubWl0bS5tYWNyb3NcclxufVxyXG4iLCAiLy8gW0N0cmxdICsgW0FsdF0gKyBbQV0gPT4gcnVuIGhvdGtleSBLZXlBXG4vLyBbQ3RybF0gKyBbU2hpZnRdID0+IEhpZGUgLyBTaG93IEJ1dHRvbnNcbmlmICh3aW5kb3cuX3dzX2Nvbm5lY3Q9PT11bmRlZmluZWQpIHtcbiAgd2luZG93Ll93c19jb25uZWN0ID0ge31cbn1cbndpbmRvdy5taXRtLmZuLmF1dG9jbGljayA9ICgpID0+IHtcclxuICBzZXRUaW1lb3V0KCgpID0+IHtcclxuICAgIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5idG4tYXV0b2ZpbGwnKS5jbGljaygpXHJcbiAgfSwgMTAwMClcclxufVxud2luZG93Lm1pdG0uZm4uaG90S2V5cyA9IG9iaiA9PiB7XHJcbiAgd2luZG93Lm1pdG0ubWFjcm9rZXlzID0ge1xyXG4gICAgLi4ud2luZG93Lm1pdG0ubWFjcm9rZXlzLFxyXG4gICAgLi4ub2JqXHJcbiAgfVxyXG59XG53aW5kb3cubWl0bS5fbWFjcm9zXyA9ICgpID0+IHtcbiAgd2luZG93Lm1pdG0ubWFjcm9rZXlzID0ge31cbn1cbndpbmRvdy5fd3NfY29ubmVjdC5tYWNyb3NPbk1vdW50ID0gZGF0YSA9PiB7XG4gIGNvbnNvbGUubG9nKCdtYWNyb3MgY29kZSBleGVjdXRlZCBhZnRlciB3cyBvcGVuJywgZGF0YSlcbn1cbmNvbnN0IHttYWNyb3N9ID0gd2luZG93Lm1pdG1cbmxldCBfYm9keTEgPSByZXF1aXJlKCcuL21hY3JvcycpXG5pZiAodHlwZW9mIF9ib2R5MT09PSdmdW5jdGlvbicpIHtcbiAgX2JvZHkxID0gX2JvZHkxKClcbn1cbmxldCBnbG9iYWwgPSByZXF1aXJlKCcuLi8uLi9fZ2xvYmFsXy9fbWFjcm9zXy9tYWNyb3MnKVxuaWYgKHR5cGVvZiBnbG9iYWw9PT0nZnVuY3Rpb24nKSB7IFxuICBnbG9iYWwgPSBnbG9iYWwoKVxufVxud2luZG93Lm1pdG0ubWFjcm9zID0ge1xuICAuLi5nbG9iYWwsXG4gIC4uLm1hY3JvcyxcbiAgLi4uX2JvZHkxLFxufVxuIl0sCiAgIm1hcHBpbmdzIjogIjs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQTtBQUFBLFdBQU8sVUFBVSxNQUFNO0FBQ3JCLFlBQU0sUUFBUTtBQUVkLGFBQU8sS0FBSyxTQUFTLENBQUMsUUFBUTtBQUM5QixhQUFPLE9BQU8sS0FBSztBQUFBO0FBQUE7OztBQ0ZyQixNQUFJLE9BQU8sZ0JBQWMsUUFBVztBQUNsQyxXQUFPLGNBQWM7QUFBQTtBQUV2QixTQUFPLEtBQUssR0FBRyxZQUFZLE1BQU07QUFDL0IsZUFBVyxNQUFNO0FBQ2YsZUFBUyxjQUFjLGlCQUFpQjtBQUFBLE9BQ3ZDO0FBQUE7QUFFTCxTQUFPLEtBQUssR0FBRyxVQUFVLFNBQU87QUFDOUIsV0FBTyxLQUFLLFlBQVksNEJBQ25CLE9BQU8sS0FBSyxZQUNaO0FBQUE7QUFHUCxTQUFPLEtBQUssV0FBVyxNQUFNO0FBQzNCLFdBQU8sS0FBSyxZQUFZO0FBQUE7QUFFMUIsU0FBTyxZQUFZLGdCQUFnQixVQUFRO0FBQ3pDLFlBQVEsSUFBSSxzQ0FBc0M7QUFBQTtBQUVwRCxNQUFNLENBQUMsVUFBVSxPQUFPO0FBQ3hCLE1BQUksU0FBUztBQUNiLE1BQUksT0FBTyxXQUFTLFlBQVk7QUFDOUIsYUFBUztBQUFBO0FBRVgsTUFBSSxTQUFTO0FBQ2IsTUFBSSxPQUFPLFdBQVMsWUFBWTtBQUM5QixhQUFTO0FBQUE7QUFFWCxTQUFPLEtBQUssU0FBUyx3Q0FDaEIsU0FDQSxTQUNBOyIsCiAgIm5hbWVzIjogW10KfQo=
