/**
 * Minimal runtime polyfills for browsers that can parse ES2017 (the build target)
 * but lack a few ES2019-era APIs the app relies on (Chrome 60-72, Safari 11-11.1).
 * Kept intentionally tiny and defensive. Each polyfill only installs when missing.
 */
(function installPolyfills() {
  if (typeof window === 'undefined') return;

  // Array.prototype.flat / flatMap (Chrome 69+, Safari 12+)
  if (typeof Array.prototype.flat !== 'function') {
    Object.defineProperty(Array.prototype, 'flat', {
      configurable: true,
      writable: true,
      value: function flat(depth) {
        var depthNum = typeof depth === 'number' ? Math.floor(depth) : 1;
        var result = [];
        (function flatten(list, currentDepth) {
          for (var i = 0; i < list.length; i += 1) {
            var item = list[i];
            if (Array.isArray(item) && currentDepth > 0) {
              flatten(item, currentDepth - 1);
            } else {
              result.push(item);
            }
          }
        })(this, depthNum);
        return result;
      },
    });
  }

  if (typeof Array.prototype.flatMap !== 'function') {
    Object.defineProperty(Array.prototype, 'flatMap', {
      configurable: true,
      writable: true,
      value: function flatMap(mapper, thisArg) {
        return this.map(mapper, thisArg).flat(1);
      },
    });
  }

  // Object.fromEntries (Chrome 73+, Safari 12.1+)
  if (typeof Object.fromEntries !== 'function') {
    Object.defineProperty(Object, 'fromEntries', {
      configurable: true,
      writable: true,
      value: function fromEntries(entries) {
        var result = {};
        var list = Array.isArray(entries) ? entries : Array.from(entries);
        for (var i = 0; i < list.length; i += 1) {
          var entry = list[i];
          if (entry != null && typeof entry === 'object' && 'length' in entry) {
            result[entry[0]] = entry[1];
          }
        }
        return result;
      },
    });
  }

  // Promise.prototype.finally (Chrome 63+, Safari 11.1+)
  if (typeof Promise !== 'undefined' && typeof Promise.prototype.finally !== 'function') {
    Object.defineProperty(Promise.prototype, 'finally', {
      configurable: true,
      writable: true,
      value: function polyfillFinally(onFinally) {
        var Constructor = this.constructor;
        return this.then(
          function (value) {
            return Constructor.resolve(onFinally && onFinally()).then(function () {
              return value;
            });
          },
          function (reason) {
            return Constructor.resolve(onFinally && onFinally()).then(function () {
              throw reason;
            });
          },
        );
      },
    });
  }

  // Detect flexbox `gap` support (Chrome 84+, Safari 14.1+, Firefox 63+).
  // Older engines accept `gap` for grid but silently ignore it in flex containers,
  // so `@supports` cannot be used — we measure real spacing instead.
  try {
    var probe = document.createElement('div');
    probe.style.cssText = 'position:absolute;visibility:hidden;display:flex;gap:4px;width:0;height:0;overflow:hidden;';
    probe.appendChild(document.createElement('span'));
    probe.appendChild(document.createElement('span'));
    document.body.appendChild(probe);
    var secondOffset = probe.children[1].offsetLeft;
    probe.remove();
    if (!(secondOffset > 0)) {
      document.documentElement.classList.add('no-flexgap');
    }
  } catch (e) {
    document.documentElement.classList.add('no-flexgap');
  }
})();
