/* 
	Yottie
	Version: 3.2.2
	Release date: Mon Oct 07 2019
	
	elfsight.com
	
	Copyright (c) 2019 Elfsight, LLC. ALL RIGHTS RESERVED
 */

(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (global){
"use strict";

var rng;

if (global.crypto && crypto.getRandomValues) {
  // WHATWG crypto-based RNG - http://wiki.whatwg.org/wiki/Crypto
  // Moderately fast, high quality
  var _rnds8 = new Uint8Array(16);
  rng = function whatwgRNG() {
    crypto.getRandomValues(_rnds8);
    return _rnds8;
  };
}

if (!rng) {
  // Math.random()-based (RNG)
  //
  // If all else fails, use Math.random().  It's fast, but is of unspecified
  // quality.
  var  _rnds = new Array(16);
  rng = function() {
    for (var i = 0, r; i < 16; i++) {
      if ((i & 0x03) === 0) r = Math.random() * 0x100000000;
      _rnds[i] = r >>> ((i & 0x03) << 3) & 0xff;
    }

    return _rnds;
  };
}

module.exports = rng;


}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],2:[function(require,module,exports){
"use strict";
//     uuid.js
//
//     Copyright (c) 2010-2012 Robert Kieffer
//     MIT License - http://opensource.org/licenses/mit-license.php

// Unique ID creation requires a high quality random # generator.  We feature
// detect to determine the best RNG source, normalizing to a function that
// returns 128-bits of randomness, since that's what's usually required
var _rng = require('./rng');

// Maps for number <-> hex string conversion
var _byteToHex = [];
var _hexToByte = {};
for (var i = 0; i < 256; i++) {
  _byteToHex[i] = (i + 0x100).toString(16).substr(1);
  _hexToByte[_byteToHex[i]] = i;
}

// **`parse()` - Parse a UUID into it's component bytes**
function parse(s, buf, offset) {
  var i = (buf && offset) || 0, ii = 0;

  buf = buf || [];
  s.toLowerCase().replace(/[0-9a-f]{2}/g, function(oct) {
    if (ii < 16) { // Don't overflow!
      buf[i + ii++] = _hexToByte[oct];
    }
  });

  // Zero out remaining bytes if string was short
  while (ii < 16) {
    buf[i + ii++] = 0;
  }

  return buf;
}

// **`unparse()` - Convert UUID byte array (ala parse()) into a string**
function unparse(buf, offset) {
  var i = offset || 0, bth = _byteToHex;
  return  bth[buf[i++]] + bth[buf[i++]] +
          bth[buf[i++]] + bth[buf[i++]] + '-' +
          bth[buf[i++]] + bth[buf[i++]] + '-' +
          bth[buf[i++]] + bth[buf[i++]] + '-' +
          bth[buf[i++]] + bth[buf[i++]] + '-' +
          bth[buf[i++]] + bth[buf[i++]] +
          bth[buf[i++]] + bth[buf[i++]] +
          bth[buf[i++]] + bth[buf[i++]];
}

// **`v1()` - Generate time-based UUID**
//
// Inspired by https://github.com/LiosK/UUID.js
// and http://docs.python.org/library/uuid.html

// random #'s we need to init node and clockseq
var _seedBytes = _rng();

// Per 4.5, create and 48-bit node id, (47 random bits + multicast bit = 1)
var _nodeId = [
  _seedBytes[0] | 0x01,
  _seedBytes[1], _seedBytes[2], _seedBytes[3], _seedBytes[4], _seedBytes[5]
];

// Per 4.2.2, randomize (14 bit) clockseq
var _clockseq = (_seedBytes[6] << 8 | _seedBytes[7]) & 0x3fff;

// Previous uuid creation time
var _lastMSecs = 0, _lastNSecs = 0;

// See https://github.com/broofa/node-uuid for API details
function v1(options, buf, offset) {
  var i = buf && offset || 0;
  var b = buf || [];

  options = options || {};

  var clockseq = options.clockseq !== undefined ? options.clockseq : _clockseq;

  // UUID timestamps are 100 nano-second units since the Gregorian epoch,
  // (1582-10-15 00:00).  JSNumbers aren't precise enough for this, so
  // time is handled internally as 'msecs' (integer milliseconds) and 'nsecs'
  // (100-nanoseconds offset from msecs) since unix epoch, 1970-01-01 00:00.
  var msecs = options.msecs !== undefined ? options.msecs : new Date().getTime();

  // Per 4.2.1.2, use count of uuid's generated during the current clock
  // cycle to simulate higher resolution clock
  var nsecs = options.nsecs !== undefined ? options.nsecs : _lastNSecs + 1;

  // Time since last uuid creation (in msecs)
  var dt = (msecs - _lastMSecs) + (nsecs - _lastNSecs)/10000;

  // Per 4.2.1.2, Bump clockseq on clock regression
  if (dt < 0 && options.clockseq === undefined) {
    clockseq = clockseq + 1 & 0x3fff;
  }

  // Reset nsecs if clock regresses (new clockseq) or we've moved onto a new
  // time interval
  if ((dt < 0 || msecs > _lastMSecs) && options.nsecs === undefined) {
    nsecs = 0;
  }

  // Per 4.2.1.2 Throw error if too many uuids are requested
  if (nsecs >= 10000) {
    throw new Error('uuid.v1(): Can\'t create more than 10M uuids/sec');
  }

  _lastMSecs = msecs;
  _lastNSecs = nsecs;
  _clockseq = clockseq;

  // Per 4.1.4 - Convert from unix epoch to Gregorian epoch
  msecs += 12219292800000;

  // `time_low`
  var tl = ((msecs & 0xfffffff) * 10000 + nsecs) % 0x100000000;
  b[i++] = tl >>> 24 & 0xff;
  b[i++] = tl >>> 16 & 0xff;
  b[i++] = tl >>> 8 & 0xff;
  b[i++] = tl & 0xff;

  // `time_mid`
  var tmh = (msecs / 0x100000000 * 10000) & 0xfffffff;
  b[i++] = tmh >>> 8 & 0xff;
  b[i++] = tmh & 0xff;

  // `time_high_and_version`
  b[i++] = tmh >>> 24 & 0xf | 0x10; // include version
  b[i++] = tmh >>> 16 & 0xff;

  // `clock_seq_hi_and_reserved` (Per 4.2.2 - include variant)
  b[i++] = clockseq >>> 8 | 0x80;

  // `clock_seq_low`
  b[i++] = clockseq & 0xff;

  // `node`
  var node = options.node || _nodeId;
  for (var n = 0; n < 6; n++) {
    b[i + n] = node[n];
  }

  return buf ? buf : unparse(b);
}

// **`v4()` - Generate random UUID**

// See https://github.com/broofa/node-uuid for API details
function v4(options, buf, offset) {
  // Deprecated - 'format' argument, as supported in v1.2
  var i = buf && offset || 0;

  if (typeof(options) == 'string') {
    buf = options == 'binary' ? new Array(16) : null;
    options = null;
  }
  options = options || {};

  var rnds = options.random || (options.rng || _rng)();

  // Per 4.4, set bits for version and `clock_seq_hi_and_reserved`
  rnds[6] = (rnds[6] & 0x0f) | 0x40;
  rnds[8] = (rnds[8] & 0x3f) | 0x80;

  // Copy bytes to buffer, if provided
  if (buf) {
    for (var ii = 0; ii < 16; ii++) {
      buf[i + ii] = rnds[ii];
    }
  }

  return buf || unparse(rnds);
}

// Export public API
var uuid = v4;
uuid.v1 = v1;
uuid.v4 = v4;
uuid.parse = parse;
uuid.unparse = unparse;

module.exports = uuid;

},{"./rng":1}],3:[function(require,module,exports){
"use strict";
var $ = require('./jquery');
var Application = function () {
    var self = this;
    self.components = {};
};
$.extend(Application, { id: 'Application' });
Application.prototype = function () {
};
$.extend(Application.prototype, {
    constructor: Application,
    components: null,
    component: function (id) {
        var self = this;
        if (!self.hasComponent(id)) {
            return;
        }
        return self.components[id];
    },
    registerComponent: function (instance, id) {
        var self = this;
        if (self.hasComponent(id)) {
            return;
        }
        instance.register(self);
        id = id || instance.constructor.getId();
        self.components[id] = instance;
        return instance;
    },
    hasComponent: function (id) {
        var self = this;
        return !!self.components[id];
    }
});
module.exports = Application;
},{"./jquery":7}],4:[function(require,module,exports){
"use strict";
var $ = require('./jquery'), utils = require('./utils');
var Cl = function () {
};
$.extend(Cl, { id: 'Cl' });
Cl.prototype = function () {
};
$.extend(Cl.prototype, {
    constructor: Cl,
    getParent: function (id) {
        var self = this;
        return self.constructor.inheritance[id];
    },
    set: function (path, value) {
        var self = this;
        return utils.setProperty(self, path, value);
    },
    get: function (path, modifier) {
        var self = this;
        return utils.getProperty(self, path, modifier);
    }
});
module.exports = Cl;
},{"./jquery":7,"./utils":15}],5:[function(require,module,exports){
"use strict";
var $ = require('./jquery');
var Component = function () {
};
$.extend(Component, {
    id: 'Component',
    getId: function () {
        var constructor = this;
        return constructor.id.substr(0, 1).toLowerCase() + constructor.id.substr(1);
    }
});
Component.prototype = function () {
};
$.extend(Component.prototype, {
    constructor: Component,
    inject: function () {
        var self = this;
        if (!self.constructor.dependencies) {
            return;
        }
        $.each(self.constructor.dependencies, function (i, id) {
            self[id] = self.app.component(id);
        });
    },
    register: function (app) {
        var self = this;
        self.app = app;
        self.inject();
    },
    trigger: function () {
        var self = this;
        self.$e.trigger.apply(self.$e, arguments);
    },
    on: function () {
        var self = this;
        self.$e.on.apply(self.$e, arguments);
    }
});
module.exports = Component;
},{"./jquery":7}],6:[function(require,module,exports){
"use strict";
module.exports = function (number, decimals, dec_point, thousands_sep) {
    number = (number + '').replace(/[^0-9+\-Ee.]/g, '');
    var n = !isFinite(+number) ? 0 : +number, prec = !isFinite(+decimals) ? 0 : Math.abs(decimals), sep = typeof thousands_sep === 'undefined' ? ',' : thousands_sep, dec = typeof dec_point === 'undefined' ? '.' : dec_point, s = '', toFixedFix = function (n, prec) {
            var k = Math.pow(10, prec);
            return '' + (Math.round(n * k) / k).toFixed(prec);
        };
    s = (prec ? toFixedFix(n, prec) : '' + Math.round(n)).split('.');
    if (s[0].length > 3) {
        s[0] = s[0].replace(/\B(?=(?:\d{3})+(?!\d))/g, sep);
    }
    if ((s[1] || '').length < prec) {
        s[1] = s[1] || '';
        s[1] += new Array(prec - s[1].length + 1).join('0');
    }
    return s.join(dec);
};
},{}],7:[function(require,module,exports){
"use strict";
module.exports = window.jQuery;
},{}],8:[function(require,module,exports){
"use strict";
var $ = require('./../../jquery'), Olivie = require('./../../olivie');
module.exports = Olivie.component('Colorizer', function (schemes, schemeId, overwrites, tplId) {
    var self = this;
    self.schemes = schemes;
    self.schemeId = schemeId;
    self.tplId = tplId;
    self.overwrites = overwrites || {};
    self.setBaseScheme(schemeId);
}, { dependencies: ['renderer'] }, {
    schemes: null,
    schemeId: null,
    baseScheme: null,
    scheme: null,
    overwrites: null,
    $element: null,
    setBaseScheme: function (id) {
        var self = this;
        self.baseScheme = self.schemes[self.schemeId] || {};
    },
    applyScheme: function () {
        var self = this;
        if (!self.$element) {
            self.$element = $('<style type="text/css"></style>');
            self.app.$element.before(self.$element);
        }
        self.overwrites = Olivie.utils.filterNulls(self.overwrites);
        self.scheme = $.extend(true, {}, self.baseScheme, self.overwrites);
        var data = {
                scheme: self.scheme,
                id: self.app.getId()
            };
        self.$element.html(self.renderer.render(self.tplId, data));
    },
    run: function () {
        var self = this;
        self.applyScheme();
        self.$element.insertBefore(self.app.$element);
    }
});
},{"./../../jquery":7,"./../../olivie":14}],9:[function(require,module,exports){
"use strict";
var $ = require('./../../jquery'), Olivie = require('./../../olivie');
module.exports = Olivie.component('I18n', function (dictionary, lang) {
    var self = this;
    self.lang = lang;
    self.dictionary = dictionary;
    self.langDictionary = self.dictionary[self.lang] || self.dictionary[self.constructor.DEFAULT_LANG];
}, { DEFAULT_LANG: 'en' }, {
    lang: null,
    dictionary: null,
    langDictionary: null,
    lexemes: [
        {
            id: 'interpolation',
            regex: /\{\{([a-zA-Z]+)\}\}/,
            func: function (matches, data) {
                return data[matches[1]] || '[[Unknown variable ' + matches[1] + ']]';
            }
        },
        {
            id: 'modified_interpolation',
            regex: /\{\{([a-zA-Z]+)\s*\|\s*([a-zA-Z]+)\(([^)]*)\)\}\}/,
            func: function (matches, data, component) {
                var variable = matches[1];
                var modifier = matches[2];
                var argsStr = matches[3];
                if (!component.modifiers[modifier]) {
                    return '[[Unknown modifier "' + modifier + '"]]';
                }
                var args = argsStr ? argsStr.split(/\s*,\s*/) : [];
                return component.modifiers[modifier].apply(data[variable], args);
            }
        }
    ],
    modifiers: {},
    hasTranslation: function (phrase) {
        var self = this;
        return !!self.langDictionary[phrase];
    },
    getTranslation: function (phrase) {
        var self = this;
        return self.langDictionary[phrase];
    },
    parse: function (input, data) {
        var self = this;
        $.each(self.lexemes, function (i, lex) {
            input = input.replace(lex.regex, function () {
                return lex.func.call(undefined, arguments, data, self);
            });
        });
        return input;
    },
    t: function (phrase, data) {
        var self = this;
        data = data || {};
        return self.parse(self.getTranslation(phrase) || phrase, data);
    }
});
},{"./../../jquery":7,"./../../olivie":14}],10:[function(require,module,exports){
"use strict";
var $ = require('./../../jquery'), Olivie = require('./../../olivie');
module.exports = Olivie.component('Renderer', function (views) {
    var self = this;
    self.views = views;
}, {}, {
    views: null,
    getTemplate: function (id) {
        var self = this;
        var tpl = Olivie.utils.getProperty(self.views, id);
        if ($.type(tpl) !== 'function') {
            return;
        }
        return tpl;
    },
    render: function (id, data) {
        var self = this;
        var tpl = self.getTemplate(id);
        return tpl(data);
    }
});
},{"./../../jquery":7,"./../../olivie":14}],11:[function(require,module,exports){
"use strict";
var $ = require('./../../jquery'), Olivie = require('./../../olivie');
module.exports = Olivie.class('Cache', [], function (cacheBaseId, client) {
    var self = this;
    self.client = client;
    cacheBaseId = cacheBaseId.substr(0, 1).toUpperCase() + cacheBaseId.substr(1);
    self.cacheBaseId = 'OlivieClientCache' + cacheBaseId;
}, {}, {
    indexedDB: window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB,
    cacheStoreId: null,
    db: null,
    isSupported: function () {
        var self = this;
        return !!self.indexedDB;
    },
    isReady: function () {
        var self = this;
        return !!self.db;
    },
    connect: function (q) {
        var self = this;
        q = q || $.Deferred();
        var openRequest;
        if (!self.isSupported()) {
            q.reject();
        } else {
            try {
                openRequest = self.indexedDB.open(self.cacheBaseId, 1);
                openRequest.onsuccess = function () {
                    self.db = openRequest.result;
                    q.resolve();
                };
                openRequest.onerror = function () {
                    q.reject();
                };
                openRequest.onupgradeneeded = function (e) {
                    e.currentTarget.result.createObjectStore('Requests', { keyPath: 'url' }).createIndex('url', 'url', { unique: true });
                    self.connect(q);
                };
            } catch (e) {
                q.reject();
            }
        }
        return q.promise();
    },
    save: function (url, result) {
        var self = this;
        if (!self.isReady()) {
            return;
        }
        var transaction = self.db.transaction('Requests', 'readwrite');
        var record = {
                url: url,
                result: result,
                date: Math.floor(Date.now() / 1000)
            };
        transaction.objectStore('Requests').put(record);
    },
    getSaved: function (url, cacheTime, q) {
        var self = this;
        q = q || $.Deferred();
        try {
            var transaction, request;
            if (!self.isReady() || !cacheTime) {
                q.reject();
            } else {
                transaction = self.db.transaction(['Requests'], 'readonly');
                request = transaction.objectStore('Requests').get(url);
                request.onsuccess = function () {
                    var record = request.result;
                    if (record && record.date + cacheTime > Math.floor(Date.now() / 1000)) {
                        q.resolve(record.result);
                    } else {
                        self.delete(url);
                        q.reject();
                    }
                };
                request.onerror = function () {
                    q.reject();
                };
            }
        } catch (e) {
            q.reject();
        }
        return q.promise();
    },
    delete: function (url, q) {
        var self = this;
        q = q || $.Deferred();
        var transaction, request;
        if (!self.isReady()) {
            q.reject();
        } else {
            transaction = self.db.transaction(['Requests'], 'readwrite');
            request = transaction.objectStore('Requests').delete(url);
            request.onsuccess = function () {
                q.resolve();
            };
            request.onerror = function () {
                q.reject();
            };
        }
        return q.promise();
    }
});
},{"./../../jquery":7,"./../../olivie":14}],12:[function(require,module,exports){
"use strict";
var $ = require('./../../jquery'), Olivie = require('./../../olivie'), Cache = require('./cache'), Ga = require('./ga');
module.exports = Olivie.component('Client', function (baseUrl, baseParams, cacheBaseId, cacheTime) {
    var self = this;
    self.requestModifiers = [];
    self.responseModifiers = [];
    if (baseParams && $.isPlainObject(baseParams)) {
        self.attachRequestModifier(function (options) {
            options.data = $.extend(false, {}, options.data, baseParams);
        });
    }
    var isAlternativeApi = baseUrl !== 'https://www.googleapis.com/youtube/v3';
    if (isAlternativeApi) {
        self.attachRequestModifier(function (options) {
            options.url = baseUrl + '?q=' + encodeURIComponent(options.url);
        });
    } else {
        self.attachRequestModifier(function (options) {
            options.url = baseUrl + options.url;
        });
    }
    self.cache = new Cache(cacheBaseId, self);
    self.ga = new Ga('UA-33920597-29');
    self.defaultCacheTime = parseInt(cacheTime, 10);
}, {
    parseQuery: function (path) {
        var queryMatches = path.match(/\?([^#]+)/);
        var params = {};
        if (!queryMatches || !queryMatches[1]) {
            return params;
        }
        var parser = function (str) {
            var field = str.split('=');
            params[field[0]] = field[1] || '';
        };
        queryMatches[1].split('&').map(parser);
        return params;
    }
}, {
    cache: null,
    requestModifiers: null,
    responseModifiers: null,
    defaultCacheTime: null,
    run: function () {
        var self = this;
        var q = $.Deferred();
        var cachePromise = self.cache.connect();
        cachePromise.done(function () {
            q.resolve();
        });
        cachePromise.fail(function () {
            q.resolve(-1);
        });
        return q.promise();
    },
    attachRequestModifier: function (modifier) {
        var self = this;
        return $.type(modifier) === 'function' && !!self.requestModifiers.push(modifier);
    },
    attachResponseModifier: function (modifier) {
        var self = this;
        return $.type(modifier) === 'function' && !!self.responseModifiers.push(modifier);
    },
    send: function (url, params, options, cacheTime) {
        var self = this;
        if ($.type(cacheTime) === 'undefined') {
            cacheTime = self.defaultCacheTime;
        }
        params = params || {};
        options = options || {};
        var q = $.Deferred();
        params = $.extend(false, {}, self.constructor.parseQuery(url), params);
        url = url.replace(/(\?\|#).*/, '') + '?' + $.param(params);
        if (params.callback) {
            params.callback = null;
        }
        options = $.extend(false, {}, options, {
            url: url,
            dataType: 'jsonp',
            type: options.type || 'get'
        });
        $.each(self.requestModifiers, function (i, modifier) {
            modifier.call(self, options);
        });
        var cacheKey = JSON.stringify(options);
        var doneHandler = function (result, status) {
            if (cacheTime && status === 'success') {
                self.cache.save(cacheKey, result);
            }
            $.each(self.responseModifiers, function (i, modifier) {
                if (q.state() !== 'pending') {
                    return;
                }
                modifier.call(self, result, q);
            });
            if (q.state() === 'pending') {
                q.resolve(result);
            }
        };
        var failHandler = function (error) {
            self.ga.collect(error.status + ' ' + error.statusText);
        };
        self.cache.getSaved(cacheKey, cacheTime).done(doneHandler).fail(function () {
            $.ajax(options).done(doneHandler).fail(failHandler);
        });
        return q.promise();
    },
    get: function (url, params, options) {
        var self = this;
        options = options || {};
        options.type = 'get';
        return self.send(url, params, options);
    }
});
},{"./../../jquery":7,"./../../olivie":14,"./cache":11,"./ga":13}],13:[function(require,module,exports){
"use strict";
var $ = require('./../../jquery'), Olivie = require('./../../olivie'), uuid = require('../../../../../bower_components/uuid');
module.exports = Olivie.class('Ga', [], function (tid) {
    var self = this;
    self.tid = tid;
    self.cid = self.getCid();
}, { BASE_URL: 'https://www.google-analytics.com/collect' }, {
    tid: null,
    cid: null,
    getCid: function () {
        var self = this;
        var cid;
        try {
            cid = localStorage.getItem('yt_cid');
            if (!cid) {
                cid = uuid();
                localStorage.setItem('yt_cid', cid);
            }
            return cid;
        } catch (error) {
            return uuid();
        }
    },
    collect: function (ea, ec) {
        ec = ec || 'ApiRequestError';
        if (!ea) {
            return;
        }
        var self = this;
        var z = new Date().getTime();
        var params = {
                tid: self.tid,
                cid: self.cid,
                v: 1,
                ds: 'web',
                an: 'Yottie',
                t: 'event',
                ec: ec,
                ea: ea,
                z: z
            };
        var query = $.param(params);
        var url = self.constructor.BASE_URL + '?' + query;
        var img = new Image();
        img.src = url;
        img.style.position = 'absolute';
        img.style.zIndex = '-1';
        img.style.left = '-9999px';
        img.onload = function () {
            document.body.removeChild(img);
        };
        document.body.appendChild(img);
    }
});
},{"../../../../../bower_components/uuid":2,"./../../jquery":7,"./../../olivie":14}],14:[function(require,module,exports){
"use strict";
var $ = require('./jquery'), utils = require('./utils'), Cl = require('./cl'), Application = require('./application'), Component = require('./component');
var Olivie = {
        $: $,
        utils: utils,
        plugin: function (name, initialize, statics) {
            var self = this;
            if ($.fn[name]) {
                return null;
            }
            $.fn[name] = function (options) {
                return this.each(function (i, element) {
                    initialize.call(undefined, element, options);
                });
            };
            if (statics) {
                $[name] = statics;
            }
            return $.fn[name];
        },
        application: function (id, constructor, statics, properties) {
            var self = this;
            return self.class(id, [Application], constructor, statics, properties);
        },
        component: function (id, constructor, statics, properties) {
            var self = this;
            properties = properties || {};
            return self.class(id, [Component], constructor, statics, properties);
        },
        class: function (id, inheritance, constructor, statics, properties) {
            inheritance = inheritance || [];
            statics = statics || {};
            properties = properties || {};
            inheritance.unshift(Cl);
            statics.id = id;
            statics.inheritance = {};
            $.each(inheritance, function (i, c) {
                if (!c.id) {
                    return;
                }
                statics.inheritance[c.id] = c;
            });
            var cl = function () {
                var self = this;
                constructor.apply(self, arguments);
            };
            cl.prototype = function () {
            };
            properties.constructor = cl;
            $.extend.apply(self.$, [cl].concat(inheritance.concat([statics])));
            $.extend.apply(self.$, [cl.prototype].concat(inheritance.map(function (parent) {
                return parent.prototype;
            })).concat(properties));
            return cl;
        }
    };
module.exports = Olivie;
},{"./application":3,"./cl":4,"./component":5,"./jquery":7,"./utils":15}],15:[function(require,module,exports){
"use strict";
var $ = require('./jquery'), numberFormat = require('./external/number_format');
module.exports = {
    unifyMultipleOption: function (option) {
        var type = $.type(option);
        if (type === 'array') {
            return option;
        } else if (type === 'string') {
            return option.split(/[\s,;\|]+/).filter(function (item) {
                return !!item;
            });
        }
        return null;
    },
    applyModifier: function (val, modifiers) {
        if ($.type(modifiers) !== 'array') {
            modifiers = [modifiers];
        }
        $.each(modifiers, function (i, mod) {
            if ($.type(mod) !== 'function') {
                return;
            }
            val = mod.call(mod, val);
        });
        return val;
    },
    getProperty: function (object, path, modifiers) {
        var constructor = this;
        if (!object || !path || $.type(path) !== 'string') {
            return undefined;
        }
        var last = object;
        $.each(path.split('.'), function (i, name) {
            last = last[name];
            if (!last) {
                return false;
            }
        });
        if (last && modifiers) {
            last = constructor.applyModifier(last, modifiers);
        }
        return last;
    },
    setProperty: function (object, path, value) {
        if (!object || !path || $.type(path) !== 'string') {
            return undefined;
        }
        var last = object;
        var map = path.split('.');
        $.each(map, function (i, name) {
            if (i == map.length - 1) {
                last[name] = value;
            } else if ($.type(last[name]) === 'undefined') {
                last[name] = {};
            }
            last = last[name];
        });
        return object;
    },
    formatBigNumber: function (num, dec) {
        num = parseFloat(num);
        dec = dec || 1;
        if ($.type(num) !== 'number') {
            return NaN;
        }
        var fixed, integer;
        var des = '';
        if (num >= 1000000000) {
            fixed = num / 1000000000;
            des = 'B';
        } else if (num >= 1000000) {
            fixed = num / 1000000;
            des = 'M';
        } else if (num >= 1000) {
            fixed = num / 1000;
            des = 'K';
        } else {
            fixed = num;
        }
        fixed = fixed.toFixed(dec);
        integer = parseInt(fixed, 10);
        if (fixed - integer === 0 || fixed >= 10) {
            fixed = integer;
        }
        return fixed + des;
    },
    parseInt: function (val) {
        return parseInt(val, 10);
    },
    formatNumberWithCommas: function (num) {
        return num.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,');
    },
    formatPassedTime: function (date) {
        if (!(date instanceof Date)) {
            date = Math.round(new Date(Date.parse(date)).getTime() / 1000);
        }
        var now = Math.round(new Date().getTime() / 1000);
        var diff = Math.abs(now - date);
        var factor, unit;
        if (diff >= 604800) {
            factor = diff / 604800;
            unit = 'w';
        } else if (diff >= 86400) {
            factor = diff / 86400;
            unit = 'd';
        } else if (diff >= 3600) {
            factor = diff / 3600;
            unit = 'h';
        } else if (diff >= 60) {
            factor = diff / 60;
            unit = 'm';
        } else {
            factor = diff;
            unit = 's';
        }
        factor = Math.round(factor);
        return factor + unit;
    },
    filterNulls: function (obj) {
        var constructor = this;
        var filteredObj = {};
        $.each(obj, function (name, val) {
            if ($.type(val) === 'object') {
                filteredObj[name] = constructor.filterNulls(val);
            } else if (val !== null) {
                filteredObj[name] = val;
            }
        });
        return filteredObj;
    },
    nl2br: function (str) {
        return str.replace(/\n/g, '<br>');
    },
    formatAnchors: function (str) {
        return str.replace(/(https?|ftp):\/\/[^\s\t<]+/g, function (m) {
            return '<a href="' + m + '" target="_blank" rel="nofollow">' + m + '</a>';
        });
    },
    numberFormat: function () {
        return numberFormat.apply(numberFormat, arguments);
    },
    shuffle: function (arr) {
        var i;
        var r;
        for (i = arr.length - 1; i >= 0; --i) {
            r = Math.floor(Math.random() * i);
            arr[r] = [
                arr[i],
                arr[i] = arr[r]
            ][0];
        }
    },
    inViewPort: function (element, percentage) {
        var bounding = element.getBoundingClientRect();
        var widthFragment = bounding.width / 100 * (100 - percentage);
        var heightFragment = bounding.height / 100 * (100 - percentage);
        return bounding.top >= 0 - heightFragment && bounding.left >= 0 - widthFragment && bounding.bottom <= window.innerHeight + heightFragment && bounding.right <= window.innerWidth + widthFragment;
    },
    css: function (elements, styles) {
        for (var i in elements) {
            if (elements.hasOwnProperty(i)) {
                var element = elements[i];
                if (element instanceof HTMLElement) {
                    for (var key in styles) {
                        if (styles.hasOwnProperty(key)) {
                            var value = styles[key];
                            element.style[key] = value;
                        }
                    }
                }
            }
        }
    }
};
},{"./external/number_format":6,"./jquery":7}],16:[function(require,module,exports){
"use strict";
var EappsAnalytics = function (app, widgetId) {
    this.initialized = false;
    this.app = app;
    this.widgetId = widgetId;
    this.analytics = window.eapps && window.eapps.analytics ? window.eapps.analytics : null;
    if (this.app && this.widgetId && this.analytics) {
        this.initialized = true;
    }
};
EappsAnalytics.prototype.store = function (event, count, lifetime) {
    count = count || 1;
    lifetime = lifetime || null;
    if (this.initialized) {
        var data = {
                'app': this.app,
                'widgetId': this.widgetId,
                'event': event,
                'count': count,
                'lifetime': lifetime
            };
        this.analytics.store(data);
    }
};
EappsAnalytics.prototype.available = function () {
    return !!this.initialized;
};
module.exports = EappsAnalytics;
},{}],17:[function(require,module,exports){
"use strict";
module.exports = function EappsCustomCss(widget, customCss) {
    var self = this;
    self.customStyle = document.createElement('style');
    self.customStyle.innerHTML = customCss;
    widget.app.$element[0].appendChild(self.customStyle);
    var wrappedCSS = [];
    if (self.customStyle && self.customStyle.sheet && self.customStyle.sheet.cssRules) {
        jQuery.each(self.customStyle.sheet.cssRules, function (index, rule) {
            if (jQuery.type(rule) === 'object') {
                wrappedCSS.push('div#yottie_' + widget.app.id + ' ' + rule.cssText);
            }
        });
        wrappedCSS = wrappedCSS.join('\n');
        self.customStyle.innerHTML = wrappedCSS;
    }
};
},{}],18:[function(require,module,exports){
"use strict";
module.exports = function EappsDeactivation(widget) {
    var settings = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {
            selector: '',
            text: 'Widget is deactivated<br>Visit Elfsight Apps',
            link: 'https://apps.elfsight.com/',
            tpl: null
        };
    var self = this;
    self.view = !settings.tpl ? jQuery('<a href="' + settings.link + '" class="" target="_blank">' + settings.text + '</a>') : settings.tpl;
    self.view[0].setAttribute('style', [
        'align-content:center!important',
        'align-items:center!important',
        'animation:none!important',
        'background:rgba(251, 251, 251, 0.9)!important',
        'border:none!important',
        'border-radius:2px!important',
        'bottom:0!important',
        'box-sizing:border-box!important',
        'color:#333333!important',
        'display:flex!important',
        'float:none!important',
        'font-family:Roboto,Arial,Sans-serif!important',
        'font-size:13px!important',
        'height:auto!important',
        'left:0!important',
        'line-height:16px!important',
        'margin:0!important',
        'opacity:1!important',
        'padding:0!important',
        'position:absolute!important',
        'right:0!important',
        'text-align:center!important',
        'text-decoration:none!important',
        'text-indent:0!important',
        'top:0!important',
        'transform:none!important',
        'justify-content:center!important',
        'visibility:visible!important',
        'width:auto!important',
        'z-index:99998!important',
        'zoom:1!important'
    ].join(';'));
    [
        'blur',
        'change',
        'click',
        'focus',
        'focusin',
        'focusout',
        'hover',
        'keydown',
        'keypress',
        'keyup',
        'mousedown',
        'mouseenter',
        'mouseleave',
        'mousemove',
        'mouseout',
        'mouseover',
        'mouseup',
        'resize',
        'scroll',
        'select',
        'submit'
    ].forEach(function (event) {
        self.view[0].addEventListener(event, function (e) {
            if (e.target.className !== 'eapps-remove-link') {
                e.stopPropagation();
            }
        });
    });
    [
        'blur',
        'change',
        'click',
        'focus',
        'focusin',
        'focusout',
        'hover',
        'keydown',
        'keypress',
        'keyup',
        'mousedown',
        'mouseenter',
        'mouseleave',
        'mousemove',
        'mouseout',
        'mouseover',
        'mouseup',
        'resize',
        'scroll',
        'select',
        'submit'
    ].forEach(function (event) {
        self.view[0].addEventListener(event, function (e) {
            e.stopPropagation();
        });
    });
    self.view.appendTo(widget.app.$element.find(settings.selector));
};
},{}],19:[function(require,module,exports){
"use strict";
module.exports = {
    apiUrl: 'https://www.googleapis.com/youtube/v3',
    key: ['AIzaSyAL2rT2DDe6sA_aZ-le6k7NiU0SJCmIqWM'],
    debug: false,
    channel: null,
    sourceGroups: null,
    order: null,
    cacheTime: 3600,
    width: 'auto',
    lang: 'en',
    header: {
        visible: true,
        layout: 'classic',
        channelName: null,
        channelDescription: null,
        channelLogo: null,
        channelBanner: null,
        info: 'logo banner channelName videosCounter subscribersCounter viewsCounter subscribeButton'
    },
    content: {
        columns: 3,
        rows: 1,
        gutter: 20,
        arrowsControl: true,
        scrollControl: false,
        dragControl: true,
        paginationControl: true,
        search: true,
        direction: 'horizontal',
        freeMode: false,
        scrollbar: false,
        transitionEffect: 'slide',
        transitionSpeed: 600,
        auto: 0,
        autoPauseOnHover: false,
        responsive: null
    },
    video: {
        layout: 'classic',
        info: 'playIcon duration title date description viewsCounter likesCounter commentsCounter',
        playMode: 'popup'
    },
    popup: {
        info: 'title channelLogo channelName subscribeButton viewsCounter likesRatio likesCounter dislikesCounter share date description descriptionMoreButton comments',
        autoplay: true
    },
    color: {
        scheme: 'default',
        header: {
            bg: null,
            bannerOverlay: null,
            channelName: null,
            channelNameHover: null,
            channelDescription: null,
            anchor: null,
            anchorHover: null,
            counters: null
        },
        groups: {
            bg: null,
            link: null,
            linkHover: null,
            linkActive: null,
            highlight: null,
            highlightHover: null,
            highlightActive: null
        },
        content: {
            bg: null,
            arrows: null,
            arrowsHover: null,
            arrowsBg: null,
            arrowsBgHover: null,
            scrollbarBg: null,
            scrollbarSliderBg: null
        },
        video: {
            bg: null,
            overlay: null,
            playIcon: null,
            playIconHover: null,
            duration: null,
            durationBg: null,
            title: null,
            titleHover: null,
            date: null,
            description: null,
            anchor: null,
            anchorHover: null,
            counters: null
        },
        popup: {
            bg: null,
            overlay: null,
            title: null,
            channelName: null,
            channelNameHover: null,
            viewsCounter: null,
            likesRatio: null,
            dislikesRatio: null,
            likesCounter: null,
            dislikesCounter: null,
            share: null,
            date: null,
            description: null,
            anchor: null,
            anchorHover: null,
            descriptionMoreButton: null,
            descriptionMoreButtonHover: null,
            commentsUsername: null,
            commentsUsernameHover: null,
            commentsPassedTime: null,
            commentsText: null,
            commentsLikes: null,
            controls: null,
            controlsHover: null,
            controlsMobile: null,
            controlsMobileBg: null
        }
    },
    ads: {
        client: null,
        slots: {
            content: null,
            popup: null
        }
    },
    noCookies: false
};
},{}],20:[function(require,module,exports){
"use strict";
module.exports = {
    en: {},
    de: {
        'w': 'Wo.',
        'd': 'Tag',
        'h': 'Std.',
        'min': 'min',
        's': 'Sek',
        'Show more': 'Mehr anzeigen',
        'Show less': 'Weniger anzeigen',
        'Videos': 'Videos',
        'Subscribers': 'Abonnenten',
        'Views': 'Aufrufe',
        'Uploads': 'Uploads',
        'Published at': 'Ver\xf6ffentlicht am',
        'All comments': 'Alle Kommentare',
        'Comments': 'Kommentare',
        'Likes': 'Likes',
        'Dislikes': 'Dislikes',
        'Search': 'Suche',
        'There are no videos by this request': 'Leider wurden keine Videos gefunden',
        'Share': 'Teilen',
        'Share on Facebook': 'Auf Facebook teilen',
        'Share on Twitter': 'Auf Twitter teilen',
        'Share on Google+': 'Auf Google+ teilen'
    },
    hr: {
        'w': 'tj',
        'd': 'd',
        'h': 's',
        'min': 'm',
        's': 's',
        'Show more': 'Prika\u017ei vi\u0161e',
        'Show less': 'Prika\u017ei manje',
        'Videos': 'Video',
        'Subscribers': 'Pretplatnici',
        'Views': 'Pregleda',
        'Uploads': 'Upload',
        'Published at': 'Objavljeno',
        'All comments': 'Svi komentari',
        'Comments': 'Komentari',
        'Likes': 'Lajkova',
        'Dislikes': 'Dislajkova',
        'Search': 'Tra\u017ei',
        'There are no videos by this request': '',
        'Share': 'Podjeli',
        'Share on Facebook': 'Podjeli na Facebooku',
        'Share on Twitter': 'Podjeli na Twitteru',
        'Share on Google+': 'Podjeli na Google+'
    },
    es: {
        'w': 'sem',
        'd': 'd\xeda',
        'h': 'h',
        'min': 'min',
        's': 's',
        'Show more': 'Mostrar m\xe1s',
        'Show less': 'Mostrar menos',
        'Videos': 'V\xeddeos',
        'Subscribers': 'Suscriptores',
        'Views': 'Visualizaciones',
        'Uploads': 'V\xeddeos subidos',
        'Published at': 'Publicado el',
        'All comments': 'Todos los comentarios',
        'Comments': 'Comentarios',
        'Likes': 'Simila\u0135oj',
        'Dislikes': 'Antipatioj',
        'Search': 'Buscar',
        'There are no videos by this request': '',
        'Share': 'Compartir',
        'Share on Facebook': 'Compartir en Facebook',
        'Share on Twitter': 'Compartir en Twitter',
        'Share on Google+': 'Compartir en Google+'
    },
    fr: {
        'w': 'sem',
        'd': 'j',
        'h': 'h',
        'min': 'min',
        's': 's',
        'Show more': 'Plus',
        'Show less': 'Moins',
        'Videos': 'Vid\xe9os',
        'Subscribers': 'Abonn\xe9s',
        'Views': 'Vues',
        'Uploads': 'Vid\xe9os ajout\xe9es',
        'Published at': 'Ajout\xe9e le',
        'All comments': 'Tous les commentaires',
        'Comments': 'Commentaires',
        'Likes': 'Go\xfbts',
        'Dislikes': 'D\xe9go\xfbts',
        'Search': 'Chercher',
        'There are no videos by this request': '',
        'Share': 'Partager',
        'Share on Facebook': 'Partager sur Facebook',
        'Share on Twitter': 'Partager sur Twitter',
        'Share on Google+': 'Partager sur Google+'
    },
    it: {
        'w': 'sett.',
        'd': 'g',
        'h': 'h',
        'min': 'm',
        's': 's',
        'Show more': 'Mostra altro',
        'Show less': 'Mostra meno',
        'Videos': 'Video',
        'Subscribers': 'Iscritti',
        'Views': 'Visualizzazioni',
        'Uploads': 'Video caricati',
        'Published at': 'Pubblicato il',
        'All comments': 'Tutti i commenti',
        'Comments': 'Commenti',
        'Likes': 'Piace',
        'Dislikes': 'Non piace',
        'Search': 'Ricerca',
        'There are no videos by this request': '',
        'Share': 'Condividi',
        'Share on Facebook': 'Condividi su Facebook',
        'Share on Twitter': 'Condividi su Twitter',
        'Share on Google+': 'Condividi su Google+'
    },
    nl: {
        'w': 'w.',
        'd': 'd.',
        'h': 'u.',
        'min': 'm.',
        's': 's.',
        'Show more': 'Meer weergeven',
        'Show less': 'Minder weergeven',
        'Videos': 'Video`s',
        'Subscribers': 'Abonnees',
        'Views': 'Weergaven',
        'Uploads': 'Uploads',
        'Published at': 'Gepubliceerd op',
        'All comments': 'Alle reacties',
        'Comments': 'Reacties',
        'Likes': 'Sympathie\xebn',
        'Dislikes': 'Antipathie\xebn',
        'Search': 'Zoeken',
        'There are no videos by this request': '',
        'Share': 'Delen',
        'Share on Facebook': 'Delen op Facebook',
        'Share on Twitter': 'Delen op Twitter',
        'Share on Google+': 'Delen op Google+'
    },
    no: {
        'w': 'u',
        'd': 'd',
        'h': 't',
        'min': 'm',
        's': 's',
        'Show more': 'Vis mer',
        'Show less': 'Vis mindre',
        'Videos': 'Videoer',
        'Subscribers': 'Abonnenter',
        'Views': 'Avspillinger',
        'Uploads': 'Opplastinger',
        'Published at': 'Publisert',
        'All comments': 'Alle kommentarer',
        'Comments': 'Kommentarer',
        'Likes': 'Liker',
        'Dislikes': 'Misliker',
        'Search': 'S\xf8ke',
        'There are no videos by this request': '',
        'Share': 'Delen',
        'Share on Facebook': 'Del p\xe5 Facebook',
        'Share on Twitter': 'Del p\xe5 Twitter',
        'Share on Google+': 'Del p\xe5 Google+'
    },
    pl: {
        'w': 'w',
        'd': 'dzie\u0144',
        'h': 'godz.',
        'min': 'min',
        's': 's',
        'Show more': 'Poka\u017c wi\u0119cej',
        'Show less': 'Poka\u017c mniej',
        'Videos': 'Wideo',
        'Subscribers': 'Subskrypcji',
        'Views': 'Wy\u015bwietlenia',
        'Uploads': 'Przes\u0142ane filmy',
        'Published at': 'Opublikowany',
        'All comments': 'Wszystkie komentarze',
        'Comments': 'Komentarzy',
        'Likes': 'Upodobania',
        'Dislikes': 'Antypatie',
        'Search': 'Szukaj',
        'There are no videos by this request': '',
        'Share': 'Dzieli\u0107',
        'Share on Facebook': 'Udost\u0119pnij na Facebooku',
        'Share on Twitter': 'Udost\u0119pnij na Twitterze',
        'Share on Google+': 'Udost\u0119pnij w Google+'
    },
    'pt-BR': {
        'w': 'sem',
        'd': 'd',
        'h': 'h',
        'min': 'min',
        's': 's',
        'Show more': 'Mostrar mais',
        'Show less': 'Mostrar menos',
        'Videos': 'V\xeddeos',
        'Subscribers': 'Inscritos',
        'Views': 'Visualiza\xe7\xf5es',
        'Uploads': 'Uploads',
        'Published at': 'Publicado em',
        'All comments': 'Todos os comentarios',
        'Comments': 'Coment\xe1rios',
        'Likes': 'Gostos',
        'Dislikes': 'Desgostos',
        'Search': 'Procurar',
        'There are no videos by this request': '',
        'Share': 'Compartilhar',
        'Share on Facebook': 'Compartilhar no Facebook',
        'Share on Twitter': 'Compartilhar no Twitter',
        'Share on Google+': 'Compartilhar no Google+'
    },
    sv: {
        'w': 'v',
        'd': 'd',
        'h': 'h',
        'min': 'min',
        's': 'sek',
        'Show more': 'Visa mer',
        'Show less': 'Visa mindre',
        'Videos': 'Videoklipp',
        'Subscribers': 'Prenumeranter',
        'Views': 'Visningar',
        'Uploads': 'Uppladdningar',
        'Published at': 'Publicerades den',
        'All comments': 'Alla kommentarer',
        'Comments': 'Kommentarer',
        'Likes': 'Gillar',
        'Dislikes': 'Ogillar',
        'Search': 'S\xf6k',
        'There are no videos by this request': '',
        'Share': 'Dela med sig',
        'Share on Facebook': 'Dela p\xe5 Facebook',
        'Share on Twitter': 'Dela p\xe5 Twitter',
        'Share on Google+': 'Dela p\xe5 Google+'
    },
    tr: {
        'w': 'h',
        'd': 'g',
        'h': 's',
        'min': 'd',
        's': 'sn',
        'Show more': 'Daha fazla g\xf6ster',
        'Show less': 'Daha az g\xf6ster',
        'Videos': 'Videolar',
        'Subscribers': 'Abone',
        'Views': 'G\xf6r\xfcnt\xfcleme',
        'Uploads': 'Y\xfcklenenler',
        'Published at': 'Tarihinde yay\u0131nland\u0131',
        'All comments': 'T\xfcm yorumlar',
        'Comments': 'Yorumlar',
        'Likes': 'Seviyor',
        'Dislikes': 'Sevmedi\u011fi',
        'Search': 'Arama',
        'There are no videos by this request': '',
        'Share': 'Pay',
        'Share on Facebook': 'Facebook\'ta Payla\u015f',
        'Share on Twitter': 'Twitter\'da Payla\u015f',
        'Share on Google+': 'Google + \'da Payla\u015f'
    },
    ru: {
        'w': '\u043d\u0435\u0434.',
        'd': '\u0434\u043d.',
        'h': '\u0447',
        'min': '\u043c\u0438\u043d',
        's': '\u0441',
        'Show more': '\u0415\u0449\u0451',
        'Show less': '\u0421\u0432\u0435\u0440\u043d\u0443\u0442\u044c',
        'Videos': '\u0412\u0438\u0434\u0435\u043e',
        'Subscribers': '\u041f\u043e\u0434\u043f\u0438\u0441\u0447\u0438\u043a\u043e\u0432',
        'Views': '\u041f\u0440\u043e\u0441\u043c\u043e\u0442\u0440\u043e\u0432',
        'Uploads': '\u0417\u0430\u0433\u0440\u0443\u0437\u043a\u0438',
        'Published at': '\u041e\u043f\u0443\u0431\u043b\u0438\u043a\u043e\u0432\u0430\u043d\u043e',
        'All comments': '\u0412\u0441\u0435 \u043a\u043e\u043c\u043c\u0435\u043d\u0442\u0430\u0440\u0438\u0438',
        'Comments': '\u041a\u043e\u043c\u043c\u0435\u043d\u0442\u0430\u0440\u0438\u0435\u0432',
        'Likes': '\u041d\u0440\u0430\u0432\u0438\u0442\u0441\u044f',
        'Dislikes': '\u041d\u0435 \u043f\u043e\u043d\u0440\u0430\u0432\u0438\u043b\u043e\u0441\u044c',
        'Search': '\u041f\u043e\u0438\u0441\u043a',
        'There are no videos by this request': '',
        'Share': '\u041f\u043e\u0434\u0435\u043b\u0438\u0442\u044c\u0441\u044f',
        'Share on Facebook': '\u041f\u043e\u0434\u0435\u043b\u0438\u0442\u044c\u0441\u044f \u043d\u0430 Facebook',
        'Share on Twitter': '\u041f\u043e\u0434\u0435\u043b\u0438\u0442\u044c\u0441\u044f \u043d\u0430 Twitter',
        'Share on Google+': '\u041f\u043e\u0434\u0435\u043b\u0438\u0442\u044c\u0441\u044f \u043d\u0430 Google+'
    },
    hi: {
        'w': '\u0938\u092a\u094d\u0924\u093e\u0939',
        'd': '\u0926\u093f\u0928',
        'h': '\u0918\u0902\u091f\u0947',
        'min': '\u092e\u093f\u0928\u091f',
        's': '\u0938\u0947\u0915\u0902\u0921',
        'Show more': '\u0914\u0930 \u0926\u093f\u0916\u093e\u090f\u0902',
        'Show less': '\u0915\u092e \u0926\u093f\u0916\u093e\u090f\u0902',
        'Videos': '\u0935\u0940\u0921\u093f\u092f\u094b',
        'Subscribers': '\u0938\u0926\u0938\u094d\u092f',
        'Views': '\u092c\u093e\u0930 \u0926\u0947\u0916\u093e \u0917\u092f\u093e',
        'Uploads': '\u0905\u092a\u0932\u094b\u0921',
        'Published at': '\u0915\u094b \u092a\u094d\u0930\u0915\u093e\u0936\u093f\u0924',
        'All comments': '\u0938\u092d\u0940 \u091f\u093f\u092a\u094d\u092a\u0923\u093f\u092f\u093e\u0902',
        'Comments': '\u091f\u093f\u092a\u094d\u092a\u0923\u093f\u092f\u093e\u0901',
        'Likes': '\u092a\u0938\u0902\u0926',
        'Dislikes': '\u0928\u093e\u092a\u0938\u0902\u0926',
        'Search': '\u0916\u094b\u091c',
        'There are no videos by this request': '',
        'Share': '\u0936\u0947\u092f\u0930',
        'Share on Facebook': '\u092b\u0947\u0938\u092c\u0941\u0915 \u092a\u0930 \u0938\u093e\u0902\u091d\u093e \u0915\u0930\u0947\u0902',
        'Share on Twitter': '\u091f\u094d\u0935\u093f\u091f\u0930 \u092a\u0930 \u0938\u093e\u091d\u093e \u0915\u0930\u0947\u0902',
        'Share on Google+': 'Google+ \u092a\u0930 \u0938\u093e\u091d\u093e \u0915\u0930\u0947\u0902'
    },
    'zh-HK': {
        'w': '\u5468',
        'd': '\u5929',
        'h': '\u5c0f\u65f6',
        'min': '\u5206\u949f',
        's': '\u79d2',
        'Show more': '\u5c55\u5f00',
        'Show less': '\u6536\u8d77',
        'Videos': '\u89c6\u9891',
        'Subscribers': '\u4f4d\u8ba2\u9605\u8005',
        'Views': '\u6b21\u89c2\u770b',
        'Uploads': '\u4e0a\u4f20\u7684\u89c6\u9891',
        'Published at': '\u53d1\u8868\u4e8e',
        'All comments': '\u6240\u6709\u8bc4\u8bba',
        'Comments': '\u8bc4\u8bba',
        'Likes': '\u559c\u6b22',
        'Dislikes': '\u4e0d\u559c\u6b22',
        'Search': '\u641c\u7d22',
        'There are no videos by this request': '',
        'Share': '\u5206\u4eab',
        'Share on Facebook': '\u5206\u4eab\u5230Facebook',
        'Share on Twitter': '\u5206\u4eab\u5230Twitter',
        'Share on Google+': '\u5206\u4eab\u5230Google+'
    },
    ja: {
        'w': '\u9031\u9593\u524d',
        'd': '\u65e5\u524d',
        'h': '\u6642\u9593\u524d',
        'min': '\u5206\u524d',
        's': '\u79d2\u524d',
        'Show more': '\u3082\u3063\u3068\u898b\u308b',
        'Show less': '\u4e00\u90e8\u3092\u8868\u793a',
        'Videos': '\u52d5\u753b',
        'Subscribers': '\u4eba',
        'Views': '\u56de',
        'Uploads': '\u30a2\u30c3\u30d7\u30ed\u30fc\u30c9\u6e08\u307f',
        'Published at': '\u306b\u516c\u958b',
        'All comments': '\u3059\u3079\u3066\u306e\u30b3\u30e1\u30f3\u30c8',
        'Comments': '\u30b3\u30e1\u30f3\u30c8',
        'Likes': '\u597d\u304d',
        'Dislikes': '\u5acc\u3044',
        'Search': '\u30b5\u30fc\u30c1',
        'There are no videos by this request': '',
        'Share': '\u30b7\u30a7\u30a2',
        'Share on Facebook': 'Facebook\u3067\u30b7\u30a7\u30a2',
        'Share on Twitter': 'Twitter\u3067\u30b7\u30a7\u30a2\u3059\u308b',
        'Share on Google+': 'Google+\u3067\u30b7\u30a7\u30a2\u3059\u308b'
    },
    sk: {
        'w': 't',
        'd': 'd',
        'h': 'h',
        'min': 'm',
        's': 's',
        'Show more': 'Zobrazi\u0165 viac',
        'Show less': 'Zobrazi\u0165 menej',
        'Videos': 'Vide\xed',
        'Subscribers': 'Odberate\u013eov',
        'Views': 'Zhliadnut\xed',
        'Uploads': 'Nahran\xe9 vide\xe1',
        'Published at': 'Zverejnen\xe9',
        'All comments': 'V\u0161etky koment\xe1re',
        'Comments': 'Koment\xe1rov',
        'Likes': 'Z\xe1\u013euby',
        'Dislikes': 'Nep\xe1\u010di',
        'Search': 'Vyh\u013ead\xe1vanie',
        'There are no videos by this request': '',
        'Share': 'Zdie\u013ea\u0165',
        'Share on Facebook': 'Zdie\u013ea\u0165 na Facebook',
        'Share on Twitter': 'Zdie\u013ea\u0165 na Twitter',
        'Share on Google+': 'Zdie\u013ea\u0165 na Google+'
    },
    cs: {
        'w': 't',
        'd': 'd',
        'h': 'h',
        'min': 'm',
        's': 's',
        'Show more': 'Zobrazit v\xedce',
        'Show less': 'Zobrazit m\xe9n\u011b',
        'Videos': 'Vide\xed',
        'Subscribers': 'Odb\u011bratel\u016f',
        'Views': 'Zhl\xe9dnut\xed',
        'Uploads': 'Nahran\xe1 videa',
        'Published at': 'Publikov\xe1no',
        'All comments': 'V\u0161echny koment\xe1\u0159e',
        'Comments': 'Koment\xe1\u0159\u016f',
        'Likes': 'L\xedb\xed se',
        'Dislikes': 'Nem\xe1 r\xe1da',
        'Search': 'Vyhled\xe1v\xe1n\xed',
        'There are no videos by this request': '',
        'Share': 'Sd\xedlet',
        'Share on Facebook': 'Sd\xedlet na Facebooku',
        'Share on Twitter': 'Sd\xedlet na Twitteru',
        'Share on Google+': 'Sd\xedlet na Google+'
    },
    ko: {
        'w': 't',
        'd': 'd',
        'h': 'h',
        'min': 'm',
        's': 's',
        'Show more': '\ub354\ubcf4\uae30',
        'Show less': '\ub35c\ubcf4\uae30',
        'Videos': '\ube44\ub514\uc624',
        'Subscribers': '\uad6c\ub3c5\uc790',
        'Views': '\uc870\ud68c\uc218',
        'Uploads': '\uc5c5\ub85c\ub4dc',
        'Published at': '\uac8c\uc7ac\ud558\uae30',
        'All comments': '\ubaa8\ub4e0 \ucee4\uba58\ud2b8',
        'Comments': '\ub313\uae00',
        'Likes': '\uc88b\uc544\uc694',
        'Dislikes': '\uc2eb\uc5b4\uc694',
        'Search': '\uc218\uc0c9',
        'There are no videos by this request': '',
        'Share': '\ubaab',
        'Share on Facebook': 'Facebook\uc5d0\uc11c \uacf5\uc720',
        'Share on Twitter': 'Twitter\uc5d0\uc11c \uacf5\uc720',
        'Share on Google+': 'Google+\uc5d0\uc11c \uacf5\uc720'
    },
    ro: {
        'w': 's',
        'd': 'z',
        'h': 'o',
        'min': 'm',
        's': 's',
        'Show more': 'Arat\u0103 mai multe',
        'Show less': 'Arat\u0103 mai pu\u021bine',
        'Videos': 'Video-uri',
        'Subscribers': 'Abona\u021bi',
        'Views': 'Vizualiz\u0103ri',
        'Uploads': 'Urc\u0103ri',
        'Published at': 'Publicat pe',
        'All comments': 'Toate comentariile',
        'Comments': 'Comentarii',
        'Likes': 'Aprecieri',
        'Dislikes': 'Dislike-uri',
        'Search': 'Caut\u0103',
        'There are no videos by this request': 'Nu sunt video-uri pentru aceast\u0103 cerere',
        'Share': 'Distribuie',
        'Share on Facebook': 'Distribuie pe Facebook',
        'Share on Twitter': 'Distribuie pe Twitter',
        'Share on Google+': 'Distribuie pe Google+'
    },
    he: {
        'w': '\u05e9\u05d1\u05d5\u05e2',
        'd': '\u05d9\u05d5\u05dd',
        'h': '\u05e9\u05e2\u05d4',
        'min': '\u05d3\u05e7\u05d4',
        's': '\u05e9\u05e0\u05d9\u05d4',
        'Show more': '\u05d4\u05e6\u05d2 \u05e2\u05d5\u05d3',
        'Show less': '\u05d4\u05e6\u05d2 \u05e4\u05d7\u05d5\u05ea',
        'Videos': '\u05e1\u05e8\u05d8\u05d5\u05e0\u05d9\u05dd',
        'Subscribers': '\u05de\u05e0\u05d5\u05d9\u05d9\u05dd',
        'Views': '\u05e6\u05e4\u05d9\u05d5\u05ea',
        'Uploads': '\u05d4\u05e2\u05dc\u05d0\u05d5\u05ea',
        'Published at': '\u05e4\u05d5\u05e8\u05e1\u05dd \u05d1',
        'All comments': '\u05db\u05dc \u05d4\u05ea\u05d2\u05d5\u05d1\u05d5\u05ea',
        'Comments': '\u05ea\u05d2\u05d5\u05d1\u05d5\u05ea',
        'Likes': '\u05dc\u05d9\u05d9\u05e7\u05d9\u05dd',
        'Dislikes': '\u05d3\u05d9\u05e1\u05dc\u05d9\u05d9\u05e7\u05d9\u05dd',
        'Search': '\u05d7\u05d9\u05e4\u05d5\u05e9',
        'There are no videos by this request': '\u05dc\u05d0 \u05de\u05e6\u05d0\u05e0\u05d5',
        'Share': '\u05e9\u05d9\u05ea\u05d5\u05e3',
        'Share on Facebook': '\u05e9\u05d9\u05ea\u05d5\u05e3 \u05d1\u05e4\u05d9\u05d9\u05e1\u05d1\u05d5\u05e7',
        'Share on Twitter': '\u05e9\u05d9\u05ea\u05d5\u05e3 \u05d1\u05d8\u05d5\u05d5\u05d9\u05d8\u05e8',
        'Share on Google+': '\u05e9\u05d9\u05ea\u05d5\u05e3 \u05d1\u05d2\u05d5\u05d2\u05dc+'
    },
    hu: {
        'w': 'h',
        'd': 'n',
        'h': '\xf3',
        'min': 'p',
        's': 'm',
        'Show more': 'T\xf6bb megjelen\xedt\xe9se',
        'Show less': 'Kevesebb megjelen\xedt\xe9se',
        'Videos': 'Vide\xf3k',
        'Subscribers': 'Feliratkoz\xf3',
        'Views': 'Megtekint\xe9s',
        'Uploads': 'Felt\xf6lt\xe9sek',
        'Published at': 'Bemutatva',
        'All comments': 'Megjegyz\xe9sek',
        'Comments': 'Megjegyz\xe9sek',
        'Likes': 'Tetszik',
        'Dislikes': 'Nem-Tetszik',
        'Search': 'Keres\xe9s',
        'There are no videos by this request': 'Nem tal\xe1lhat\xf3 ilyen vide\xf3',
        'Share': 'Megoszt\xe1s',
        'Share on Facebook': 'Megoszt\xe1s Facebookon',
        'Share on Twitter': 'Megoszt\xe1s Twitteren',
        'Share on Google+': 'Megoszt\xe1s Google+ -on'
    }
};
},{}],21:[function(require,module,exports){
"use strict";
var Olivie = require('./../../olivie/src/js/olivie'), $ = require('./../../olivie/src/js/jquery'), Yottie = require('./yottie'), YottieFacade = require('./yottie-facade'), defaults = require('./defaults'), schemes = require('./schemes');
var id = 0;
Olivie.plugin('yottie', function (element, options) {
    var facade = $.data(element, 'yottie');
    if (facade) {
        return facade;
    }
    var map = $.yottie.generateAttributesMap();
    $.each(map, function (path, name) {
        var name = name.replace(/-([a-z])/g, function (g) {
                return g[1].toUpperCase();
            });
        if (name in options) {
            var last = options;
            var map = path.split('.');
            var value = options[name];
            $.each(map, function (i, name) {
                if (i == map.length - 1) {
                    last[name] = value;
                } else if ($.type(last[name]) === 'undefined') {
                    last[name] = {};
                }
                last = last[name];
            });
        }
    });
    var app = new Yottie(++id, element, options);
    var facade = new YottieFacade(app);
    $.data(element, 'yottie', facade);
    app.run();
}, {
    defaults: defaults,
    schemes: schemes,
    orderFunctions: {
        date: function (a, b) {
            var aPublicationTime = Date.parse(a.snippet.publishedAt);
            var bPublicationTime = Date.parse(b.snippet.publishedAt);
            if (aPublicationTime < bPublicationTime) {
                return -1;
            }
            if (aPublicationTime > bPublicationTime) {
                return 1;
            }
            return 0;
        }
    },
    generateAttributesMap: function (pathPrefix, obj, map) {
        pathPrefix = pathPrefix || '';
        obj = obj || defaults;
        map = map || {};
        $.each(obj, function (name, val) {
            var path;
            if ($.type(val) === 'object') {
                $.yottie.generateAttributesMap(pathPrefix ? pathPrefix + '.' + name : name, val, map);
            } else {
                path = pathPrefix ? pathPrefix + '.' + name : name;
                map[path] = path.replace(/\.|[A-Z]/g, function (m) {
                    if (m === '.') {
                        return '-';
                    } else {
                        return '-' + m.toLowerCase();
                    }
                });
            }
        });
        return map;
    },
    init: function (context) {
        context = context || document.body;
        var map = $.yottie.generateAttributesMap();
        $('[data-yt]', context).each(function (i, item) {
            var $item = $(item);
            var options = {};
            $.each(map, function (path, name) {
                var val = $item.attr('data-yt-' + name);
                if (val === 'true') {
                    val = true;
                } else if (val === 'false') {
                    val = false;
                }
                Olivie.utils.setProperty(options, path, val);
            });
            $item.yottie(options);
        });
    },
    addOrderFunction: function (name, func) {
        var constructor = this;
        if ($.type(func) !== 'function') {
            return;
        }
        constructor.orderFunctions[name] = func;
    }
});
$(function () {
    var readyFunc = window['onYottieReady'];
    if (readyFunc && $.type(readyFunc) === 'function') {
        readyFunc();
    }
    $(window).trigger('yottieReady');
    $.yottie.init();
});
},{"./../../olivie/src/js/jquery":7,"./../../olivie/src/js/olivie":14,"./defaults":19,"./schemes":45,"./yottie":48,"./yottie-facade":47}],22:[function(require,module,exports){
"use strict";
module.exports = function EappsFreeLink(widget) {
    var settings = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {
            selector: '',
            text: 'Free Elfsight widgets',
            link: 'https://elfsight.com/',
            tpl: null,
            owner: false,
            platform: false
        };
    var self = this;
    self.view = !settings.tpl ? jQuery('<a href="' + settings.link + '" target="_blank">\n                            ' + settings.text + '\n                            \n                            <div class="eapps-remove-link" title="Remove Elfsight logo">\n                                <svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 10 10">\n                                  <path fill="#ffffff" d="M6.01 5l3.78 3.78a.714.714 0 1 1-1.01 1.01L5 6.01 1.22 9.79A.714.714 0 1 1 .21 8.78L3.99 5 .21 1.22A.714.714 0 0 1 1.22.21L5 3.99 8.78.21a.714.714 0 0 1 1.01 1.01L6.01 5z"/>\n                                </svg>\n\n                            </div>\n                        </a>') : settings.tpl;
    self.view[0].setAttribute('style', [
        'animation:none!important',
        'background:rgba(255,255,255,.5) url(\'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyhpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuNi1jMTExIDc5LjE1ODMyNSwgMjAxNS8wOS8xMC0wMToxMDoyMCAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENDIDIwMTUgKE1hY2ludG9zaCkiIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6MDZCQzk0NkYzNEIwMTFFNzg5ODc5NzU1NEQwMzQxRTgiIHhtcE1NOkRvY3VtZW50SUQ9InhtcC5kaWQ6MDZCQzk0NzAzNEIwMTFFNzg5ODc5NzU1NEQwMzQxRTgiPiA8eG1wTU06RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDowNkJDOTQ2RDM0QjAxMUU3ODk4Nzk3NTU0RDAzNDFFOCIgc3RSZWY6ZG9jdW1lbnRJRD0ieG1wLmRpZDowNkJDOTQ2RTM0QjAxMUU3ODk4Nzk3NTU0RDAzNDFFOCIvPiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1wbWV0YT4gPD94cGFja2V0IGVuZD0iciI/PmvrtX4AAAFpSURBVHjajJNNK0RhFMef50oZxWZkUpSXSMnOamZFWFkozcZ8AEk+gvIdKN/A1kJKFoTsWEzKWxaiKE2NkJdirt+5nZmO25341+++PM+55zn3PP/HO+eCMAwr3J333hmNwwA0QRmu4BSebZB8MQd3sA0VM7cAaXiFVjN+ALs2QT8UIIQtOHbJ6oQx6NVq1qMElC+lN/M8Dy1QgkMo1kmUgwk4gc0oQa0c7wtakeheE50nJMnDEKzGE8htCkZM8C1saCOraoAluPTa5UG4gA8NmISs+eAR1rRPVckvZwLdqmnoMJM78GLe07qq1Y1cAt0J0Xcs4Mk8f5q4Xwq0PFF7bG7flJyKlS/qdurCBx3IxgKuYQXO4E0Xs03MSBOd7sIoLGs/kpSKJchrfFs0SJI9bdosdCUkeDc2z6kHxEilmg/wgPh9ERrhSC1d/peVjZHE0jPQp0Nf+v/1D1OCE6urDUPPX8f5R4ABAGa7ZWSBcR62AAAAAElFTkSuQmCC\')no-repeat 8px center !important',
        'border:none!important',
        'border-radius:6px!important',
        'bottom:auto!important',
        'box-sizing:border-box!important',
        'color:rgba(0,0,0,.5)!important',
        'display:inline-block!important',
        'float:none!important',
        'font-family:Roboto,Arial,Sans-serif!important',
        'font-size:12px!important',
        'font-weight:700!important',
        'height:28px!important',
        'left:50%!important',
        'line-height:16px!important',
        'margin:8px auto!important',
        'opacity:1!important',
        'padding:6px 6px 6px 32px!important',
        'position:relative!important',
        'right:auto!important',
        'text-align:left!important',
        'text-decoration:none!important',
        'text-indent:0!important',
        'top:auto!important',
        'transform:translateX(-50%)!important',
        'visibility:visible!important',
        'max-width:240px!important',
        'z-index:99999!important',
        'zoom:1!important',
        'background-color:rgba(238,238,238,0.9)!important'
    ].join(';'));
    [
        'blur',
        'change',
        'click',
        'focus',
        'focusin',
        'focusout',
        'hover',
        'keydown',
        'keypress',
        'keyup',
        'mousedown',
        'mouseenter',
        'mouseleave',
        'mousemove',
        'mouseout',
        'mouseover',
        'mouseup',
        'resize',
        'scroll',
        'select',
        'submit'
    ].forEach(function (event) {
        self.view[0].addEventListener(event, function (e) {
            if (e.target.className !== 'eapps-remove-link') {
                e.stopPropagation();
            }
        });
    });
    jQuery(self.view[0]).find('div')[0].setAttribute('style', [
        'display:' + (!settings.platform || settings.owner && settings.platform ? 'flex' : 'none') + '!important',
        'align-items:center!important',
        'justify-content:center!important',
        'width:20px!important',
        'height:20px!important',
        'border-radius:12px!important',
        'overflow:hidden!important',
        'position:absolute!important',
        'right:-10px!important',
        'top:-10px!important',
        'background:#f93262!important',
        'box-shadow: 0 2px 2px rgba(0, 0, 0, 0.2)!important'
    ].join(';'));
    jQuery(self.view[0]).find('svg')[0].setAttribute('style', [
        'display:block!important',
        'pointer-events:none!important'
    ].join(';'));
    jQuery(self.view[0]).find('div').on('click', function (e) {
        if (settings.platform) {
            var win = window.open(settings.appsLink, '_blank');
            win.focus();
        }
        e.preventDefault();
    });
    self.view.appendTo(widget.app.$element.find(settings.selector));
};
},{}],23:[function(require,module,exports){
"use strict";
var $ = require('./../../../../olivie/src/js/jquery'), Olivie = require('./../../../../olivie/src/js/olivie');
var $w = $(window);
module.exports = Olivie.component('Popup', function () {
}, {
    AVAILABLE_INFO: [
        'duration',
        'title',
        'channelLogo',
        'channelName',
        'subscribeButton',
        'viewsCounter',
        'likesCounter',
        'dislikesCounter',
        'likesRatio',
        'share',
        'date',
        'description',
        'descriptionMoreButton',
        'comments'
    ],
    dependencies: [
        'youtube',
        'i18n',
        'renderer',
        'ads',
        ''
    ]
}, {
    $e: $('<div></div>'),
    videoPlayer: null,
    open: function (videoUrl) {
        var self = this;
        if (self.showing) {
            return false;
        }
        self.analytics = self.get('app.analytics');
        self.showVideo(videoUrl);
        self.showing = true;
        self.$popup.addClass('yottie-popup-show');
    },
    close: function () {
        var self = this;
        setTimeout(function () {
            self.videoPlayer.destroy();
            self.$video.remove();
        }, 350);
        self.showing = false;
        self.$popup.removeClass('yottie-popup-show');
    },
    showVideo: function (videoUrl) {
        var self = this;
        var videoSource = self.youtube.parseSource(videoUrl);
        if (!videoSource || videoSource.kind !== 'youtube#video') {
            return;
        }
        self.$popup.addClass('yottie-popup-loading');
        self.youtube.model(videoSource.kind).find(videoSource.criteria, 'contentDetails,statistics,snippet').done(function (video) {
            if (!video) {
                return;
            }
            self.video = video;
            var preparePromises = [];
            preparePromises.push(self.getVideoChannel());
            preparePromises.push(self.getVideoCommentThreads());
            $.when.apply($, preparePromises).done(function () {
                self.$popup.removeClass('yottie-popup-loading');
                self.$video = self.createVideoElement();
                var playerOptions = {
                        videoId: self.video.id,
                        playerVars: {
                            autoplay: self.app.options.popup.autoplay,
                            showinfo: false,
                            rel: 0
                        },
                        events: {
                            onStateChange: function (e) {
                                if (self.analytics && self.analytics.available()) {
                                    self.analytics.store('click');
                                }
                                switch (e.data) {
                                case YT.PlayerState.ENDED:
                                    e.target.pauseVideo();
                                    e.target.seekTo(0);
                                    break;
                                }
                            }
                        }
                    };
                if (self.app.options.noCookies) {
                    playerOptions['host'] = 'http://www.youtube-nocookie.com';
                }
                var player = new YT.Player(self.$video.find('.yottie-popup-video-player span').get(0), playerOptions);
                self.videoPlayer = player;
                if (!self.app.options.noCookies && self.channel) {
                    self.channel.renderButton(self.$video.find('.yottie-popup-video-meta-subscribe').get(0));
                }
                self.$video.appendTo(self.$inner);
                self.$videoPlayer = self.$video.find('.yottie-popup-video-source iframe');
                self.fit();
                setTimeout(function () {
                    self.ads.init(self.$inner);
                }, 17);
            });
        });
    },
    getVideoChannel: function () {
        var self = this;
        if (!self.video) {
        }
        var q = $.Deferred();
        self.youtube.model('youtube#channel').find({ id: self.video.snippet.channelId }, 'snippet').done(function (channel) {
            self.channel = channel;
            q.resolve();
        }).fail(function () {
            self.channel = null;
            q.resolve();
        });
        return q;
    },
    getVideoCommentThreads: function () {
        var self = this;
        if (!self.video) {
        }
        var q = $.Deferred();
        self.youtube.model('youtube#commentThread').findAll({
            videoId: self.video.id,
            textFormat: 'plainText'
        }, 'snippet').done(function (commentThreads) {
            self.commentThreads = commentThreads;
            q.resolve();
        }).fail(function () {
            self.commentThreads = null;
            q.resolve();
        });
        return q;
    },
    createPopupElement: function () {
        var self = this, parts = {};
        parts.loader = self.renderer.render('popup.loader', { parts: parts });
        parts.controlClose = self.renderer.render('popup.control.close', { parts: parts });
        parts.controlArrows = self.renderer.render('popup.control.arrows', { parts: parts });
        parts.inner = self.renderer.render('popup.inner', { parts: parts });
        parts.overlay = self.renderer.render('popup.overlay', { parts: parts });
        parts.wrapper = self.renderer.render('popup.wrapper', { parts: parts });
        return $(self.renderer.render('popup.container', { parts: parts }));
    },
    createVideoElement: function () {
        var self = this, displaying = {}, parts = {}, date = self.i18n.t('Published at') + ' ' + new Date(Date.parse(self.video.snippet.publishedAt)).toLocaleDateString(), comments = [];
        if (self.commentThreads && self.commentThreads.length) {
            for (var i = 0, j = self.commentThreads.length; i < j; i++) {
                var text = self.commentThreads[i].getText();
                comments.push({
                    authorProfileImageUrl: self.commentThreads[i].snippet.topLevelComment.snippet.authorProfileImageUrl,
                    authorName: self.commentThreads[i].snippet.topLevelComment.snippet.authorDisplayName,
                    authorChannelUrl: self.commentThreads[i].snippet.topLevelComment.snippet.authorChannelUrl,
                    text: text,
                    passedTime: self.commentThreads[i].get('snippet.topLevelComment.snippet.publishedAt', Olivie.utils.formatPassedTime),
                    likesCount: self.commentThreads[i].get('snippet.topLevelComment.snippet.likeCount', Olivie.utils.formatBigNumber),
                    displayLikesCount: parseInt(self.commentThreads[i].snippet.topLevelComment.snippet.likeCount, 10) > 0,
                    likesTitle: self.i18n.t('Likes') + ': ' + self.commentThreads[i].get('snippet.topLevelComment.snippet.likeCount', Olivie.utils.formatNumberDigits)
                });
            }
        }
        self.activeInfo = Olivie.utils.unifyMultipleOption(self.app.options.popup.info) || [];
        self.activeInfo = self.activeInfo.filter(function (item) {
            return !!~self.constructor.AVAILABLE_INFO.indexOf(item);
        });
        $.each(self.activeInfo, function (i, item) {
            displaying[item] = true;
        });
        displaying.viewsCounter = !!self.video.get('statistics.viewCount') && displaying.viewsCounter;
        displaying.dislikesCounter = !!self.video.get('statistics.dislikeCount') && displaying.dislikesCounter;
        displaying.likesCounter = !!self.video.get('statistics.likeCount') && displaying.likesCounter;
        displaying.channel = self.channel && displaying.channelName || displaying.channelLogo || displaying.subscribeButton;
        displaying.ratingCounters = displaying.likesCounter || displaying.dislikesCounter;
        displaying.rating = displaying.ratingCounters || displaying.likesRatio;
        displaying.properties = displaying.viewsCounter || displaying.rating;
        displaying.infoHeader = displaying.title || displaying.properties;
        displaying.infoMeta = displaying.channel || displaying.share;
        displaying.description = displaying.description && self.video.snippet.description;
        displaying.infoMain = displaying.description || displaying.date;
        displaying.info = displaying.infoHeader || displaying.infoMain || displaying.infoMeta;
        displaying.comments = self.commentThreads && displaying.comments;
        displaying.content = displaying.info || displaying.comments;
        displaying.descriptionMoreButton = displaying.description && displaying.descriptionMoreButton;
        displaying.meta = self.channelLogo || displaying.channelName || displaying.date || displaying.description || displaying.subscribeButton;
        parts.videoPlayer = self.renderer.render('popup.video.player', {
            displaying: displaying,
            parts: parts
        });
        parts.videoContent = self.renderer.render('popup.video.content', {
            displaying: displaying,
            parts: parts,
            logo: self.channel.get('snippet.thumbnails.default.url'),
            name: self.channel.get('snippet.title'),
            link: '//www.youtube.com/channel/' + self.channel.id,
            viewsCount: self.video.get('statistics.viewCount', Olivie.utils.formatNumberWithCommas) + ' ' + self.i18n.t('Views'),
            likesCount: self.video.get('statistics.likeCount', Olivie.utils.formatBigNumber),
            dislikesCount: self.video.get('statistics.dislikeCount', Olivie.utils.formatBigNumber),
            likesRatio: parseInt(self.video.get('statistics.likeCount') * 100 / (parseInt(self.video.get('statistics.likeCount'), 10) + parseInt(self.video.get('statistics.dislikeCount'), 10)), 10),
            titles: {
                views: self.i18n.t('Views') + ': ' + self.video.get('statistics.viewCount', self.youtube.constructor.formatNumberDigits),
                likes: self.i18n.t('Likes') + ': ' + self.video.get('statistics.likeCount', self.youtube.constructor.formatNumberDigits),
                dislikes: self.i18n.t('Dislikes') + ': ' + self.video.get('statistics.dislikeCount', self.youtube.constructor.formatNumberDigits),
                share: self.i18n.t('Share')
            },
            date: date,
            text: self.video.get('snippet.description', [
                Olivie.utils.nl2br,
                Olivie.utils.formatAnchors
            ]),
            showMoreLabel: self.i18n.t('Show more'),
            title: self.video.get('snippet.title'),
            comments: self.commentThreads ? comments : null,
            shareButtons: self.getShareButtons()
        });
        return $(self.renderer.render('popup.video.container', {
            displaying: displaying,
            parts: parts
        }));
    },
    getShareButtons: function () {
        var self = this;
        var titles = {
                'facebook': self.i18n.t('Share on Facebook'),
                'twitter': self.i18n.t('Share on Twitter'),
                'google': self.i18n.t('Share on Google+')
            };
        return {
            facebook: {
                id: 'facebook',
                title: titles.facebook,
                icon: 'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4NCjwhLS0gR2VuZXJhdG9yOiBBZG9iZSBJbGx1c3RyYXRvciAyMS4wLjIsIFNWRyBFeHBvcnQgUGx1Zy1JbiAuIFNWRyBWZXJzaW9uOiA2LjAwIEJ1aWxkIDApICAtLT4NCjxzdmcgdmVyc2lvbj0iMS4xIiBpZD0iTGF5ZXJfMSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayIgeD0iMHB4IiB5PSIwcHgiDQoJIHZpZXdCb3g9IjAgMCAyNCAyNCIgc3R5bGU9ImVuYWJsZS1iYWNrZ3JvdW5kOm5ldyAwIDAgMjQgMjQ7IiB4bWw6c3BhY2U9InByZXNlcnZlIj4NCjxnPg0KCTxwYXRoIHN0eWxlPSJmaWxsOiNGRkZGRkY7IiBkPSJNNS43LDEzVjguMWgzLjZWNi4yYzAtMy4zLDIuNS02LjIsNS41LTYuMmgzLjl2NC45aC0zLjljLTAuNCwwLTAuOSwwLjUtMC45LDEuM3YxLjloNC45VjEzaC00Ljl2MTENCgkJSDkuM1YxM0g1Ljd6Ii8+DQo8L2c+DQo8L3N2Zz4NCg==',
                handler: function () {
                    window.open('http://www.facebook.com/sharer.php?u=' + encodeURIComponent('https://www.youtube.com/watch?v=' + self.video.get('id')), 'facebook', 'width=600px,height=600px,menubar=no,toolbar=no,resizable=yes,scrollbars=yes');
                }
            },
            twitter: {
                id: 'twitter',
                title: titles.twitter,
                icon: 'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4NCjwhLS0gR2VuZXJhdG9yOiBBZG9iZSBJbGx1c3RyYXRvciAyMS4wLjIsIFNWRyBFeHBvcnQgUGx1Zy1JbiAuIFNWRyBWZXJzaW9uOiA2LjAwIEJ1aWxkIDApICAtLT4NCjxzdmcgdmVyc2lvbj0iMS4xIiBpZD0iTGF5ZXJfMSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayIgeD0iMHB4IiB5PSIwcHgiDQoJIHZpZXdCb3g9IjAgMCAyNCAyNCIgc3R5bGU9ImVuYWJsZS1iYWNrZ3JvdW5kOm5ldyAwIDAgMjQgMjQ7IiB4bWw6c3BhY2U9InByZXNlcnZlIj4NCjxnPg0KCTxwYXRoIGlkPSJ0d2l0dGVyLTQtaWNvbl8xXyIgc3R5bGU9ImZpbGw6I0ZGRkZGRjsiIGQ9Ik0yMS41LDcuMWMwLjMsNi45LTQuOSwxNC42LTE0LDE0LjZjLTIuOCwwLTUuNC0wLjgtNy41LTIuMg0KCQljMi42LDAuMyw1LjItMC40LDcuMy0yYy0yLjIsMC00LTEuNS00LjYtMy40YzAuOCwwLjEsMS41LDAuMSwyLjItMC4xYy0yLjQtMC41LTQtMi42LTMuOS00LjljMC43LDAuNCwxLjQsMC42LDIuMiwwLjYNCgkJQzEsOC4yLDAuNCw1LjMsMS43LDMuMWMyLjQsMyw2LjEsNC45LDEwLjEsNS4xYy0wLjctMy4xLDEuNi02LDQuOC02YzEuNCwwLDIuNywwLjYsMy42LDEuNmMxLjEtMC4yLDIuMi0wLjYsMy4xLTEuMg0KCQljLTAuNCwxLjEtMS4xLDIuMS0yLjIsMi43YzEtMC4xLDEuOS0wLjQsMi44LTAuOEMyMy4zLDUuNSwyMi41LDYuNCwyMS41LDcuMXoiLz4NCjwvZz4NCjwvc3ZnPg0K',
                handler: function () {
                    window.open('https://twitter.com/share?url=' + encodeURIComponent('https://www.youtube.com/watch?v=' + self.video.get('id')) + '&text=' + encodeURIComponent(self.video.get('snippet.title')), 'facebook', 'width=600px,height=600px,menubar=no,toolbar=no,resizable=yes,scrollbars=yes');
                }
            },
            google: {
                id: 'google',
                title: titles.google,
                icon: 'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4NCjwhLS0gR2VuZXJhdG9yOiBBZG9iZSBJbGx1c3RyYXRvciAyMS4wLjIsIFNWRyBFeHBvcnQgUGx1Zy1JbiAuIFNWRyBWZXJzaW9uOiA2LjAwIEJ1aWxkIDApICAtLT4NCjxzdmcgdmVyc2lvbj0iMS4xIiBpZD0iTGF5ZXJfMSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayIgeD0iMHB4IiB5PSIwcHgiDQoJIHZpZXdCb3g9IjAgMCAyNCAyNCIgc3R5bGU9ImVuYWJsZS1iYWNrZ3JvdW5kOm5ldyAwIDAgMjQgMjQ7IiB4bWw6c3BhY2U9InByZXNlcnZlIj4NCjxnPg0KCTxwYXRoIHN0eWxlPSJmaWxsOiNGRkZGRkY7IiBkPSJNNy42LDEwLjl2Mi42SDEyYy0wLjIsMS4xLTEuMywzLjItNC4zLDMuMmMtMi42LDAtNC43LTIuMS00LjctNC43UzUsNy4zLDcuNiw3LjMNCgkJYzEuNSwwLDIuNSwwLjYsMywxLjJsMi4xLTJjLTEuMy0xLjItMy4xLTItNS4xLTJDMy40LDQuNSwwLDcuOSwwLDEyczMuNCw3LjUsNy42LDcuNWM0LjQsMCw3LjMtMyw3LjMtNy4zYzAtMC41LTAuMS0wLjktMC4xLTEuMg0KCQlMNy42LDEwLjlMNy42LDEwLjl6Ii8+DQoJPHBhdGggc3R5bGU9ImZpbGw6I0ZGRkZGRjsiIGQ9Ik0yMS44LDEwLjlWOC44aC0yLjJ2Mi4xaC0yLjJ2Mi4xaDIuMnYyLjFoMi4ydi0yLjFIMjRjMCwwLDAtMi4xLDAtMi4xSDIxLjh6Ii8+DQo8L2c+DQo8L3N2Zz4NCg==',
                handler: function () {
                    window.open('https://plus.google.com/share?url=' + encodeURIComponent('https://www.youtube.com/watch?v=' + self.video.get('id')), 'facebook', 'width=600px,height=600px,menubar=no,toolbar=no,resizable=yes,scrollbars=yes');
                }
            }
        };
    },
    watch: function () {
        var self = this;
        self.$wrapper.click(function (e) {
            if (self.analytics && self.analytics.available()) {
                self.analytics.store('click');
            }
            if (e.target !== self.$wrapper.get(0)) {
                return;
            }
            self.close();
        });
        self.$controlClose.click(function (e) {
            e.preventDefault();
            self.close();
        });
        self.$popup.on('click', '.yottie-popup-video-meta-description-more', function () {
            $(this).text(function (i, text) {
                return text === self.i18n.t('Show more') ? self.i18n.t('Show less') : self.i18n.t('Show more');
            }).siblings('.yottie-popup-video-meta-description').toggleClass('yottie-popup-video-meta-description-show-full');
        });
        self.$popup.on('click', '.yottie-popup-video-share', function (e) {
            self.$popup.find('.yottie-popup-video-share-popover').addClass('yottie-popup-video-share-popover-open');
            e.stopPropagation();
        });
        self.$popup.on('click', '.yottie-popup-video-share-popover-content-item', function (e) {
            var shareButtons = self.getShareButtons();
            var type = $(this).attr('data-type');
            if (type) {
                var button = shareButtons[type];
                if (!!button && typeof button.handler == 'function') {
                    button.handler();
                }
            }
            e.stopPropagation();
        });
        $('body').on('click touchend', function (e) {
            if (!!$(e.target).closest('.yottie-popup-video-share-popover').length) {
                return;
            }
            self.$popup.find('.yottie-popup-video-share-popover').removeClass('yottie-popup-video-share-popover-open');
        });
    },
    fit: function () {
        var self = this;
        var windowHeight = $w.innerHeight();
        var innerHeight = self.$inner.innerHeight();
        var offset = 0;
        if (windowHeight > innerHeight) {
            offset = windowHeight / 2 - innerHeight / 2 - 50;
        }
        self.$inner.css('top', offset);
    },
    run: function () {
        var self = this;
        if (self.get('app.options.video.playMode') == 'popup') {
            self.$popup = self.createPopupElement();
            self.$popup.appendTo(document.body);
            self.$popup.attr('id', 'yottie_popup_' + self.app.getId());
            self.$wrapper = self.$popup.find('.yottie-popup-wrapper');
            self.$inner = self.$popup.find('.yottie-popup-inner');
            self.$controlClose = self.$popup.find('.yottie-popup-control-close');
            self.watch();
            $w.resize(function () {
                self.fit();
            });
        }
        return self;
    }
});
},{"./../../../../olivie/src/js/jquery":7,"./../../../../olivie/src/js/olivie":14}],24:[function(require,module,exports){
"use strict";
var $ = require('./../../../../olivie/src/js/jquery'), Olivie = require('./../../../../olivie/src/js/olivie');
module.exports = Olivie.component('Ads', function (options) {
    var self = this;
    self.client = options.client;
    self.slots = options.slots;
}, {
    dependencies: ['renderer'],
    SIZES: [
        {
            width: 728,
            height: 90
        },
        {
            width: 320,
            height: 50
        }
    ]
}, {
    client: null,
    slots: null,
    isActive: function () {
        var self = this;
        return window.adsbygoogle && self.client;
    },
    run: function () {
        var self = this;
        if (self.slots.content || self.slots.popup) {
            $.getScript('//pagead2.googlesyndication.com/pagead/js/adsbygoogle.js');
        }
    },
    showAt: function (place) {
        var self = this;
        return !!self.slots[place];
    },
    init: function ($container) {
        var self = this;
        if (!self.isActive()) {
            return;
        }
        var $slots = $('[data-yt-ads-place]', $container);
        $slots = $slots.filter(function () {
            var place = $(this).attr('data-yt-ads-place');
            return self.showAt(place);
        });
        self.processSlots($slots);
    },
    createAdsElement: function (sizes, slotId) {
        var self = this;
        return $(self.renderer.render('ads', $.extend(false, {
            pubId: self.client,
            slotId: slotId
        }, sizes)));
    },
    processSlots: function ($slots) {
        var self = this;
        $slots.each(function () {
            var $ads = null;
            var $container = $(this);
            var slot = $container.attr('data-yt-ads-place');
            var slotId = self.slots[slot];
            var actualSize = null;
            var containerWidth = $container.width();
            if (containerWidth > self.constructor.SIZES[1].width && containerWidth < self.constructor.SIZES[0].width) {
                actualSize = self.constructor.SIZES[1];
            } else if (containerWidth > self.constructor.SIZES[0].width) {
                actualSize = self.constructor.SIZES[0];
            }
            $container.empty();
            if (actualSize) {
                $ads = self.createAdsElement(actualSize, slotId);
                $ads.appendTo($container);
            }
        });
        adsbygoogle.push({});
    }
});
},{"./../../../../olivie/src/js/jquery":7,"./../../../../olivie/src/js/olivie":14}],25:[function(require,module,exports){
"use strict";
var $ = require('./../../../../olivie/src/js/jquery'), Olivie = require('./../../../../olivie/src/js/olivie'), Grid = require('./grid'), ProxyStorage = require('./../youtube/proxy-storage'), defaults = require('./../../defaults');
var $window = $(window);
module.exports = Olivie.class('FeedSection', [], function (controller, group) {
    var self = this;
    if (!$.isPlainObject(group)) {
        return;
    }
    if (!$.isArray(group.sources)) {
        group.sources = [group.sources];
    }
    self.controller = controller;
    self.title = group.name || self.controller.i18n.t('Untitled');
    self.videoPlayMode = self.get('controller.app.options.video.playMode');
    self.analytics = self.get('controller.app.analytics');
    self.videos = [];
    self.source = [];
    $.each(group.sources, function (i, src) {
        var sourceObject;
        if ($.type(src) === 'string') {
            sourceObject = self.controller.youtube.parseSource(src);
            if (!sourceObject) {
                return;
            }
        } else if ($.isPlainObject(src) && src.kind && src.criteria) {
            sourceObject = src;
        } else {
            return;
        }
        self.source.push(sourceObject);
    });
    self.hasSource = self.source && self.source.length;
    self.$element = self.createFeedSectionElement();
    if (!self.hasSource) {
        self.$novideos = $(self.controller.renderer.render('feed.section.novideos', { message: self.controller.i18n.t('There are no videos in this group') }));
        self.$novideos.appendTo(self.$element);
    }
    self.$inner = self.$element.find('.yottie-widget-feed-section-inner');
    self.$loader = $(self.controller.renderer.render('feed.loader'));
    if (self.get('controller.app.options.content.search')) {
        self.$filter = $(self.controller.renderer.render('feed.filter', { placeholder: self.controller.i18n.t('Search') }));
        self.$filter.find('.yottie-widget-feed-section-search-selector-label-input').attr('name', 'filterField_' + self.title);
        self.$filter.prependTo(self.$element);
    }
    if (self.hasSource && self.get('controller.app.options.content.arrowsControl')) {
        self.$inner.append(self.controller.renderer.render('feed.arrows'));
        self.$arrowPrev = self.$element.find('.yottie-widget-feed-section-arrow-prev');
        self.$arrowNext = self.$element.find('.yottie-widget-feed-section-arrow-next');
    }
    if (self.hasSource && self.get('controller.app.options.content.scrollbar')) {
        self.$scrollbar = $(self.controller.renderer.render('feed.scrollbar'));
        self.$scrollbar.appendTo(self.$element);
    }
    if (self.get('controller.app.options.content.paginationControl')) {
        self.$pagination = $(self.controller.renderer.render('feed.pagination'));
        self.$pagination.appendTo(self.$element);
    }
    self.$loader.appendTo(self.$element);
    self.fetcher = self.createFetcher();
    self.inlinePlayers = {};
    self.defaultBreakpoint = {
        columns: self.get('controller.app.options.content.columns', Olivie.utils.parseInt),
        rows: self.get('controller.app.options.content.rows', Olivie.utils.parseInt),
        gutter: self.get('controller.app.options.content.gutter', Olivie.utils.parseInt)
    };
    self.currentBreakpoint = self.defaultBreakpoint;
    self.grid = new Grid(self.$inner, self.defaultBreakpoint);
    var sortedBreakpoints = [];
    var breakpoints = self.get('controller.app.options.content.responsive');
    if (breakpoints) {
        $.each(breakpoints, function (mw, opt) {
            opt.mw = parseInt(opt.minWidth ? opt.minWidth : mw, 10);
            sortedBreakpoints.push(opt);
        });
        sortedBreakpoints.sort(function (a, b) {
            if (a.mw < b.mw) {
                return -1;
            } else if (a.mw > b.mw) {
                return 1;
            }
            return 0;
        });
        self.breakpoints = sortedBreakpoints;
    }
    self.auto = self.get('controller.app.options.content.auto', Olivie.utils.parseInt);
    self.autoPauseOnHover = self.get('controller.app.options.content.autoPauseOnHover');
    self.$element.addClass('yottie-widget-feed-section-' + self.get('controller.app.options.content.direction'));
}, {
    VIDEO_AVAILABLE_INFO: [
        'playIcon',
        'duration',
        'title',
        'date',
        'description',
        'viewsCounter',
        'likesCounter',
        'commentsCounter'
    ],
    AVAILABLE_EFFECTS: [
        'slide',
        'fade',
        'cube',
        'coverflow',
        'flip'
    ],
    AVAILABLE_DIRECTIONS: ['horizontal'],
    VIDEO_BREAKPOINTS: [
        560,
        490,
        440,
        370,
        280,
        230,
        180,
        130,
        70
    ],
    SWIPER_OPTIONS_ALIASES: {
        columns: 'slidesPerView',
        gutter: 'spaceBetween'
    },
    prepareSwiperBreakpoints: function (breakponts) {
        var constructor = this;
        if (!breakponts) {
            return null;
        }
        var preparedBreakpoints = {};
        $.each(breakponts, function (mw, options) {
            preparedBreakpoints[mw] = {};
            $.each(options, function (name, val) {
                var originalName = constructor.SWIPER_OPTIONS_ALIASES[name];
                if (!originalName) {
                    return;
                }
                preparedBreakpoints[mw][originalName] = val;
            });
        });
        return preparedBreakpoints;
    }
}, {
    virgin: true,
    redistributing: false,
    fetcher: null,
    videoStorage: null,
    controller: null,
    title: null,
    source: null,
    grid: null,
    swiper: null,
    auto: null,
    videoActiveInfo: null,
    videoPlayMode: null,
    inlinePlayers: null,
    breakpoints: null,
    currentBreakpoint: null,
    prevBreakpoint: null,
    defaultBreakpoint: null,
    hover: null,
    $element: null,
    $inner: null,
    $arrowPrev: null,
    $arrowNext: null,
    $scrollbar: null,
    $loader: null,
    $pagination: null,
    isPlaying: null,
    filterStr: '',
    filterField: 'title&description',
    allFetched: false,
    noCookies: false,
    createFeedSectionElement: function () {
        var self = this;
        return $(self.controller.renderer.render('feed.section'));
    },
    createFetcher: function () {
        var self = this;
        var fetcher;
        var videoStorage;
        var order = self.get('controller.app.options.order');
        var search = self.get('controller.app.options.content.search');
        var videoFetcher = self.controller.youtube.createUniversalVideoFetcher(self.source, 'snippet,contentDetails,statistics');
        if (!order) {
            fetcher = videoFetcher;
        } else {
            fetcher = new ProxyStorage(videoFetcher, order);
            self.allFetched = true;
        }
        return fetcher;
    },
    activate: function () {
        var self = this;
        self.$element.addClass('yottie-active');
        if (!self.hasSource) {
            return false;
        }
        if (self.virgin) {
            self.virgin = false;
            self.fit();
            self.showLoader(500);
            self.fetcher.prepare().done(function () {
                self.appendSlide(true).done(function () {
                    self.fit();
                    if (!self.auto) {
                        return;
                    }
                    setTimeout(function () {
                        if (!self.isPlaying && self.swiper.autoplaying && !self.hover) {
                            self.swiper.slideNext();
                        }
                    }, self.auto);
                });
            });
        } else {
            self.fit();
        }
    },
    deactivate: function () {
        var self = this;
        self.$element.removeClass('yottie-active');
        $.each(self.inlinePlayers, function (pid, instance) {
            instance.pauseVideo();
        });
    },
    createVideoElement: function (video) {
        var self = this;
        var displaying = {};
        $.each(self.videoActiveInfo, function (i, item) {
            displaying[item] = true;
        });
        displaying.viewsCounter = !!video.get('statistics.viewCount') && displaying.viewsCounter;
        displaying.likesCounter = !!video.get('statistics.likeCount') && displaying.likesCounter;
        displaying.commentsCounter = !!video.get('statistics.commentCount') && displaying.commentsCounter;
        displaying.properties = displaying.viewsCounter || displaying.likesCounter || displaying.commentsCounter;
        displaying.info = displaying.properties || displaying.title || displaying.date || displaying.description;
        displaying.videoPlayer = self.videoPlayMode === 'inline';
        var parts = {};
        parts.player = self.controller.renderer.render('video.player', { displaying: displaying });
        parts.preview = self.controller.renderer.render('video.preview', {
            displaying: displaying,
            id: video.id,
            thumbnail: video.get('snippet.thumbnails.high.url'),
            maxresThumbnail: video.get('snippet.thumbnails.maxres.url'),
            title: video.get('snippet.title'),
            duration: video.parseDuration()
        });
        parts.overlay = self.controller.renderer.render('video.overlay');
        parts.info = self.controller.renderer.render('video.info', {
            displaying: displaying,
            id: video.id,
            title: video.get('snippet.title'),
            description: video.get('snippet.description', [
                Olivie.utils.nl2br,
                Olivie.utils.formatAnchors
            ]),
            viewsCount: video.get('statistics.viewCount', Olivie.utils.formatBigNumber) + ' ' + self.controller.i18n.t('Views'),
            likesCount: video.get('statistics.likeCount', Olivie.utils.formatBigNumber) + ' ' + self.controller.i18n.t('Likes'),
            commentsCount: video.get('statistics.commentCount', Olivie.utils.formatBigNumber) + ' ' + self.controller.i18n.t('Comments'),
            date: new Date(video.getPublishedTimestamp()).toLocaleDateString(),
            titles: {
                views: self.controller.i18n.t('Views') + ': ' + video.get('statistics.viewCount', self.controller.youtube.constructor.formatNumberDigits),
                likes: self.controller.i18n.t('Likes') + ': ' + video.get('statistics.likeCount', self.controller.youtube.constructor.formatNumberDigits),
                comments: self.controller.i18n.t('Comments') + ': ' + video.get('statistics.commentCount', self.controller.youtube.constructor.formatNumberDigits)
            }
        });
        var $video = $(self.controller.renderer.render('video.container', {
                id: video.id,
                displaying: displaying,
                parts: parts,
                layout: self.videoLayout
            }));
        return $video;
    },
    appendSlide: function (noloader) {
        var self = this;
        var count = self.grid.getItemsCount();
        var q = $.Deferred();
        if (!self.fetcher.hasNext()) {
            q.reject();
        } else {
            if (!noloader) {
                self.showLoader();
            }
            self.fetcher.fetch(count, self.filterStr, self.filterField).done(function (list) {
                var $slideVideos = $();
                var $slide = $(self.controller.renderer.render('feed.slide'));
                $.each(list, function (i, video) {
                    var $video = self.createVideoElement(video);
                    $slideVideos = $slideVideos.add($video);
                });
                $slideVideos.appendTo($slide);
                self.swiper.appendSlide($slide.get(0));
                self.fitSlides($slide);
                self.hideLoader();
                q.resolve();
            }).fail(function () {
                self.swiper.autoplay && self.swiper.autoplay.stop();
                if (!self.fetcher.hasNext() && self.$element.find('.yottie-widget-feed-section-slide').length === 0) {
                    var $slide = $(self.controller.renderer.render('feed.slide'));
                    self.$novideos = $(self.controller.renderer.render('feed.section.novideos', { message: self.controller.i18n.t('There are no videos by this request') + ': "' + self.filterStr + '".' }));
                    self.$novideos.appendTo($slide);
                    self.swiper.appendSlide($slide);
                }
                self.hideLoader();
                self.$arrowNext.toggleClass('yottie-widget-feed-section-arrow-has-next', false);
                q.reject();
            });
        }
        return q.promise();
    },
    isHorizontal: function () {
        var self = this;
        return self.get('controller.app.options.content.direction') === 'horizontal';
    },
    run: function () {
        var self = this;
        self.noCookies = self.get('controller.app.options.noCookies');
        self.videoLayout = self.get('controller.app.options.video.layout');
        self.videoActiveInfo = Olivie.utils.unifyMultipleOption(self.get('controller.app.options.video.info')) || [];
        self.videoActiveInfo = self.videoActiveInfo.filter(function (item) {
            return !!~self.constructor.VIDEO_AVAILABLE_INFO.indexOf(item);
        });
        var effect = self.get('controller.app.options.content.transitionEffect', function (val) {
                return !!~self.constructor.AVAILABLE_EFFECTS.indexOf(val) ? val : 'slide';
            });
        var direction = self.get('controller.app.options.content.direction', function (val) {
                return !!~self.constructor.AVAILABLE_DIRECTIONS.indexOf(val) ? val : 'vertical';
            });
        var dragControl = self.get('controller.app.options.content.dragControl');
        var scrollControl = self.get('controller.app.options.content.scrollControl');
        var paginationControl = self.get('controller.app.options.content.paginationControl');
        var disableMove = !dragControl && !scrollControl && !paginationControl;
        var Swiper = window.SwiperNoConflict || window.Swiper;
        self.swiper = new Swiper(self.$inner, {
            direction: direction,
            effect: effect,
            speed: self.get('controller.app.options.content.transitionSpeed', Olivie.utils.parseInt),
            fade: { crossFade: true },
            cube: {
                shadowScale: 0.1,
                shadowOffset: 15
            },
            coverflow: { rotate: 60 },
            slidesPerView: 1,
            slidesPerColumn: 1,
            freeMode: self.get('controller.app.options.content.freeMode'),
            mousewheelControl: scrollControl,
            simulateTouch: dragControl,
            scrollbar: self.$scrollbar ? self.$scrollbar.get() : null,
            scrollbarDraggable: false,
            scrollbarHide: true,
            prevButton: self.$arrowPrev ? self.$arrowPrev.get() : null,
            nextButton: self.$arrowNext ? self.$arrowNext.get() : null,
            autoplay: self.auto,
            autoplayDisableOnInteraction: false,
            watchSlidesProgress: true,
            watchSlidesVisibility: true,
            onlyExternal: disableMove,
            pagination: self.$pagination ? self.$pagination.get() : null,
            paginationClickable: true,
            paginationBulletRender: function (swiper, index, className) {
                return '<span class="yottie-widget-feed-section-pagination-bullet ' + className + '">' + (index + 1) + '</span>';
            },
            onTouchStart: function (swiper, e) {
                if (disableMove) {
                    e.preventDefault();
                }
            }
        });
        if (paginationControl) {
            self.swiper.on('onPaginationRendered', function () {
                if (self.fetcher.hasNext()) {
                    var $bulletMore = $('<span class="yottie-widget-feed-section-pagination-bullet yottie-widget-feed-section-pagination-bullet-more swiper-pagination-bullet">&nbsp;</span>').get(0);
                    $(self.swiper.paginationContainer).append($bulletMore);
                }
                self.rebuildPagination();
            });
            self.swiper.on('onSlideChangeEnd', function () {
                self.rebuildPagination();
            });
        }
        self.swiper.on('reachEnd', function () {
            var hasNext = self.fetcher.hasNext();
            self.swiper.stopAutoplay();
            if (hasNext && !self.redistributing) {
                setTimeout(function () {
                    self.appendSlide(true).done(function () {
                        if (!self.hover) {
                            self.swiper.startAutoplay();
                        }
                    });
                }, 17);
            }
            if (self.$arrowNext) {
                self.$arrowNext.toggleClass('yottie-widget-feed-section-arrow-has-next', hasNext);
            }
        });
        var handleClick = function (e) {
            e.preventDefault();
            e.stopPropagation();
            var player;
            var $item = $(this);
            var $video = $item.closest('.yottie-widget-video');
            var $target = $(e.target);
            var id = $video.attr('data-yt-id');
            var href = $video.find('.yottie-widget-video-preview').attr('href');
            if ($target.is('a') && $target.parent().is('.yottie-widget-video-info-caption')) {
                return window.open($target.attr('href'));
            }
            if (self.videoPlayMode === 'youtube') {
                if (!$target.is('.yottie-widget-video-info-caption') && !$target.parent().is('.yottie-widget-video-info-caption')) {
                    window.open(href);
                }
                return;
            }
            self.swiper.stopAutoplay();
            self.isPlaying = true;
            if (self.videoPlayMode === 'popup') {
                self.controller.popup.open('https://www.youtube.com/watch?v=' + id);
            } else {
                player = self.inlinePlayers[id];
                if (!player) {
                    var playerOptions = {
                            videoId: id,
                            playerVars: {
                                autoplay: true,
                                showinfo: false,
                                rel: 0
                            },
                            events: {
                                onStateChange: function (e) {
                                    switch (e.data) {
                                    case YT.PlayerState.ENDED:
                                        e.target.pauseVideo();
                                        e.target.seekTo(0);
                                        self.isPlaying = false;
                                        self.swiper.startAutoplay();
                                        break;
                                    case YT.PlayerState.PLAYING:
                                        $.each(self.inlinePlayers, function (pid, instance) {
                                            if (pid === id) {
                                                return;
                                            }
                                            self.isPlaying = true;
                                            self.swiper.stopAutoplay();
                                            instance.pauseVideo();
                                        });
                                        break;
                                    case YT.PlayerState.PAUSED:
                                        setTimeout(function () {
                                            var hasPlaying = false;
                                            $.each(self.inlinePlayers, function (pid, instance) {
                                                if (pid === id || instance.getPlayerState() !== YT.PlayerState.PLAYING) {
                                                    return;
                                                }
                                                hasPlaying = true;
                                            });
                                            if (!hasPlaying) {
                                                self.isPlaying = false;
                                                if (!self.hover && self.auto) {
                                                    self.swiper.startAutoplay();
                                                }
                                            }
                                        }, 2000);
                                        break;
                                    }
                                }
                            }
                        };
                    if (self.noCookies) {
                        playerOptions['host'] = 'http://www.youtube-nocookie.com';
                    }
                    player = new YT.Player($video.find('.yottie-widget-video-player span').get(0), playerOptions);
                    self.fitVideos($video);
                    self.inlinePlayers[id] = player;
                } else {
                    if (player.getPlayerState() === YT.PlayerState.PLAYING) {
                        player.pauseVideo();
                    } else {
                        player.playVideo();
                    }
                }
            }
            if (self.analytics && self.analytics.available()) {
                self.analytics.store('click');
            }
        };
        self.$element.on('click', '.yottie-widget-video', handleClick);
        if (self.autoPauseOnHover) {
            self.$element.on('mouseenter', function () {
                self.hover = true;
                self.swiper.stopAutoplay();
            });
            self.$element.on('mouseleave', function () {
                if (self.isPlaying) {
                    return;
                }
                self.hover = false;
                self.swiper.startAutoplay();
            });
        }
        $(window).resize(function () {
            self.fit();
        });
        self.$element.on('submit', '.yottie-widget-feed-section-search-form', function (e) {
            e.preventDefault();
            if (!self.searching) {
                self.$element.find('.yottie-widget-feed-section-search-form-input').trigger('change');
            }
        });
        self.$element.on('click', '.yottie-widget-feed-section-search-form-button', function () {
            if (!self.searching) {
                self.$element.find('.yottie-widget-feed-section-search-form-input').trigger('change');
            }
        });
        self.$element.on('change', '.yottie-widget-feed-section-search-form-input', function () {
            self.searching = true;
            self.filterStr = self.$element.find('.yottie-widget-feed-section-search-form-input').val();
            self.showLoader();
            self.swiper.isEnd = true;
            self.swiper.removeAllSlides();
            self.fetcher = self.createFetcher();
            self.fetcher.prepare().done(function () {
                self.swiper.isEnd = false;
                self.appendSlide().done(function () {
                    self.fit();
                    self.searching = false;
                    if (!self.auto) {
                        return;
                    }
                    setTimeout(function () {
                        if (!self.isPlaying && self.swiper.autoplaying && !self.hover) {
                            self.swiper.slideNext();
                        }
                    }, self.auto);
                });
            });
        });
    },
    fit: function () {
        var self = this;
        self.fitGrid();
        self.fitSlides();
    },
    fitInner: function () {
        var self = this;
        var videoHeight = self.$element.find('.yottie-widget-video:first').outerHeight(true);
        var slidePadding = parseInt(self.$element.find('.yottie-widget-feed-section-slide:first').css('padding-top'), 10);
        var rowsCount = self.grid.rows;
        self.$inner.innerHeight(videoHeight * rowsCount + slidePadding);
    },
    fitSlides: function ($slides) {
        var self = this;
        $slides = $slides || self.$element.find('.yottie-widget-feed-section-slide');
        setTimeout(function () {
            $slides.css({
                paddingTop: self.grid.gutter,
                paddingLeft: self.grid.gutter,
                height: '100%'
            });
        });
        self.fitVideos($slides.find('.yottie-widget-video'));
    },
    fitGrid: function () {
        var self = this;
        if (!self.breakpoints || !self.breakpoints.length) {
            return;
        }
        self.prevBreakpoint = self.currentBreakpoint;
        var actualBreakpoint;
        var windowWidth = $window.width();
        $.each(self.breakpoints, function (i, bp) {
            if (windowWidth <= bp.mw) {
                actualBreakpoint = bp;
                return false;
            }
        });
        if (!actualBreakpoint) {
            actualBreakpoint = self.defaultBreakpoint;
        }
        if (actualBreakpoint !== self.currentBreakpoint) {
            self.currentBreakpoint = actualBreakpoint;
            self.grid.setOptions(self.currentBreakpoint);
            self.redistributeVideos();
            var $videos = self.$element.find('.yottie-widget-video');
            var itemsPerSlide = self.grid.getItemsCount();
            if ($videos.length !== 0 && $videos.length < itemsPerSlide && self.fetcher.hasNext()) {
                self.swiper.removeAllSlides();
                self.appendSlide(true).done(function () {
                    self.appendSlide(true).done(function () {
                        self.grid.setOptions(self.currentBreakpoint);
                        self.redistributeVideos();
                        self.fitSlides();
                    });
                });
            }
        }
    },
    fitVideos: function ($videos) {
        var self = this;
        setTimeout(function () {
            $videos = $videos || self.$element.find('.yottie-widget-video');
            self.grid.calculate();
            Olivie.utils.css($videos, {
                'marginBottom': self.grid.gutter + 'px',
                'marginRight': self.grid.gutter + 'px',
                'width': self.grid.itemWidth + 'px'
            });
            var $previews = $videos.find('.yottie-widget-video-preview');
            var $player = $videos.find('.yottie-widget-video-player iframe');
            var $thumbnails = $previews.find('.yottie-widget-video-preview-thumbnail');
            var previewWidth = $previews.innerWidth();
            var previewHeight = previewWidth / 16 * 9;
            var minWidth = self.controller.widget.constructor.updateBreakpoints($videos, self.constructor.VIDEO_BREAKPOINTS, 'yottie-mw-');
            previewWidth = $previews.innerWidth();
            previewHeight = previewWidth / 16 * 9 - 0.6;
            $thumbnails.find('img').each(function (i, item) {
                var $item = $(item);
                var src = $item.attr('data-src');
                var maxresSrc = $item.attr('data-maxres-src');
                if (maxresSrc && $videos.width() > 480) {
                    $item.attr('src', maxresSrc);
                } else {
                    $item.attr('src', src);
                }
            });
            $thumbnails.css({
                width: previewWidth,
                height: previewHeight
            });
            if (self.videoLayout === 'horizontal' && minWidth > 370) {
                $videos.find('.yottie-widget-video-info').innerHeight(previewHeight);
            }
            if ($player.length) {
                $player.width(previewWidth).height(previewHeight);
            }
            self.fitInner();
        });
    },
    redistributeVideos: function () {
        var self = this;
        var slides = [];
        var $videos = self.$element.find('.yottie-widget-video');
        var itemsPerSlide = self.grid.getItemsCount();
        var slidesCount = Math.ceil($videos.length / itemsPerSlide);
        if (!$videos.length) {
            return;
        }
        self.redistributing = true;
        self.swiper.lockSwipes();
        self.swiper.removeAllSlides();
        for (var i = 0; i < slidesCount; ++i)
            (function (i) {
                var $slide = $(self.controller.renderer.render('feed.slide'));
                var $slideVideos = $videos.slice(i * itemsPerSlide, (i + 1) * itemsPerSlide);
                $slideVideos.appendTo($slide);
                slides.push($slide.get(0));
            }(i));
        self.swiper.prependSlide(slides.reverse());
        self.swiper.update(true);
        self.swiper.unlockSwipes();
        self.redistributing = false;
    },
    showLoader: function (delay) {
        var self = this;
        if (!self.$loader || self.$loader.is('.yottie-visible')) {
            return;
        }
        if (self.loaderTimeout) {
            clearTimeout(self.loaderTimeout);
            self.loaderTimeout = null;
        }
        self.loaderTimeout = setTimeout(function () {
            self.$loader.addClass('yottie-visible');
        }, parseInt(delay, 10));
    },
    hideLoader: function () {
        var self = this;
        if (!self.$loader) {
            return;
        }
        if (self.loaderTimeout) {
            clearTimeout(self.loaderTimeout);
            self.loaderTimeout = null;
        }
        self.$loader.removeClass('yottie-visible');
    },
    rebuildPagination: function () {
        var self = this;
        var $bullets = self.$element.find('.yottie-widget-feed-section-pagination-bullet');
        var activeIndex = self.swiper.activeIndex;
        var emptyArr = [
                [],
                []
            ], k = 0;
        var range = 3;
        $.map($bullets, function (item, i) {
            if (i < $bullets.length - 1) {
                if (i < range - 2 || i > activeIndex - range / 2 && i < activeIndex + range / 2 || i > $bullets.length - range) {
                    if (i === activeIndex) {
                        k = 1;
                    }
                    $(item).css('display', 'inline-block').text(i + 1);
                } else {
                    emptyArr[k].push(i);
                    $(item).css('display', 'none').text('...');
                }
            }
        });
        var emptyArrMid = emptyArr.map(function (itemArr) {
                return parseInt(itemArr[0]) + parseInt((itemArr[itemArr.length - 1] - itemArr[0]) / 2);
            });
        $.map($bullets, function (item, i) {
            if (i === emptyArrMid[0] || i === emptyArrMid[1]) {
                $(item).css('display', 'inline-block');
            }
        });
        $(self.swiper.paginationContainer).html($bullets);
    }
});
},{"./../../../../olivie/src/js/jquery":7,"./../../../../olivie/src/js/olivie":14,"./../../defaults":19,"./../youtube/proxy-storage":40,"./grid":27}],26:[function(require,module,exports){
"use strict";
var $ = require('./../../../../olivie/src/js/jquery'), Olivie = require('./../../../../olivie/src/js/olivie'), FeedSection = require('./feed-section');
module.exports = Olivie.component('Feed', function () {
    var self = this;
    self.sections = [];
    self.$e = $('<div></div>');
}, {
    dependencies: [
        'renderer',
        'i18n',
        'youtube',
        'popup',
        'widget',
        'ads'
    ]
}, {
    sections: null,
    activeSectionId: null,
    $element: null,
    $inner: null,
    $e: null,
    createFeedElement: function () {
        var self = this;
        return $(self.renderer.render('feed.container'));
    },
    getSection: function (id) {
        var self = this;
        if (!self.hasSection(id)) {
            return;
        }
        return self.sections[id];
    },
    hasSection: function (id) {
        var self = this;
        return !!self.sections[id];
    },
    setActiveSection: function (id) {
        var self = this;
        if (!self.hasSection(id)) {
            return;
        }
        $.each(self.sections, function (i, section) {
            section.deactivate();
        });
        self.getSection(id).activate();
        self.activeSectionId = id;
    },
    getActiveSection: function () {
        var self = this;
        return self.getSection(self.activeSectionId);
    },
    run: function (sourceGroups) {
        var self = this;
        self.$element = self.createFeedElement();
        self.$inner = self.$element.find('.yottie-widget-feed-inner');
        $.each(sourceGroups, function (i, group) {
            var section = new FeedSection(self, group);
            section.$element.appendTo(self.$inner);
            section.run();
            self.sections.push(section);
        });
        setTimeout(function () {
            self.app.component('groups').fit();
            self.ads.init(self.$element);
        }, 100);
    }
});
},{"./../../../../olivie/src/js/jquery":7,"./../../../../olivie/src/js/olivie":14,"./feed-section":25}],27:[function(require,module,exports){
"use strict";
var $ = require('./../../../../olivie/src/js/jquery'), Olivie = require('./../../../../olivie/src/js/olivie');
module.exports = Olivie.class('Grid', [], function ($element, options) {
    var self = this;
    self.$element = $element;
    self.options = options;
    self.columns = self.options.columns;
    self.rows = self.options.rows;
    self.gutter = self.options.gutter;
}, {}, {
    options: null,
    columns: null,
    rows: null,
    gutter: null,
    $element: null,
    setOptions: function (options, recalculate) {
        var self = this;
        self.columns = options.hasOwnProperty('columns') ? Olivie.utils.parseInt(options.columns) : self.columns;
        self.rows = options.hasOwnProperty('rows') ? Olivie.utils.parseInt(options.rows) : self.rows;
        self.gutter = options.hasOwnProperty('gutter') ? Olivie.utils.parseInt(options.gutter) : self.gutter;
        if (!self.columns) {
            self.columns = 1;
        }
        if (!self.rows) {
            self.rows = 1;
        }
        if (!self.gutter) {
            self.gutter = 0;
        }
        if (recalculate) {
            self.calculate();
        }
    },
    calculate: function () {
        var self = this;
        var elementWidth = self.$element.innerWidth();
        var guttersSummary = self.gutter * (self.columns + 1);
        self.itemWidth = parseInt((elementWidth - guttersSummary) / self.columns, 10);
    },
    getItemsCount: function () {
        var self = this;
        return self.columns * self.rows;
    }
});
},{"./../../../../olivie/src/js/jquery":7,"./../../../../olivie/src/js/olivie":14}],28:[function(require,module,exports){
"use strict";
var $ = require('./../../../../olivie/src/js/jquery'), Olivie = require('./../../../../olivie/src/js/olivie');
var $w = $(window);
module.exports = Olivie.component('Groups', function () {
    var self = this;
    self.$e = $('<div></div>');
}, {
    dependencies: [
        'renderer',
        'i18n',
        'feed'
    ]
}, {
    sourceGroups: null,
    $element: null,
    $inner: null,
    $list: null,
    $items: null,
    $e: null,
    createGroupsElement: function () {
        var self = this;
        return $(self.renderer.render('groups.container', {
            visible: !!(self.app.options.sourceGroups && self.app.options.sourceGroups.length > 1),
            list: self.renderer.render('groups.list', { groups: self.sourceGroups }),
            controls: self.renderer.render('groups.controls')
        }));
    },
    fit: function () {
        var self = this;
        var scrollLeft = self.$list.scrollLeft();
        var maxScrollLeft = self.$list.get(0).scrollWidth - self.$list.innerWidth();
        self.$controlLeft.toggleClass('yottie-widget-nav-control-disabled', scrollLeft < 10);
        self.$controlRight.toggleClass('yottie-widget-nav-control-disabled', maxScrollLeft - scrollLeft < 10);
    },
    run: function (sourceGroups) {
        var self = this;
        self.sourceGroups = sourceGroups.slice();
        $.each(self.sourceGroups, function (i, item) {
            if (!item.name && !item.title) {
                item.title = self.i18n.t('Untitled');
            }
            if (!item.title) {
                item.title = item.name;
            }
        });
        self.$element = self.createGroupsElement();
        self.$inner = self.$element.children().first();
        self.$list = self.$inner.children().first();
        self.$items = self.$list.children();
        self.$controlLeft = self.$element.find('.yottie-widget-nav-control-left');
        self.$controlRight = self.$element.find('.yottie-widget-nav-control-right');
        self.$items.on('click', function () {
            var $item = $(this);
            var id = $item.children().first().attr('data-yt-id');
            self.$items.removeClass('yottie-active');
            $item.addClass('yottie-active');
            self.feed.setActiveSection(id);
            var itemOffset = $item.position().left;
            if (itemOffset < 20) {
                self.$list.animate({ scrollLeft: '-=' + $item.innerWidth() });
            }
            if (itemOffset + $item.innerWidth() + 20 > self.$list.innerWidth()) {
                self.$list.animate({ scrollLeft: '+=' + $item.innerWidth() });
            }
        });
        $w.resize(function () {
            self.fit();
        });
        self.$list.scroll(function () {
            self.fit();
        });
        self.$controlLeft.on('touchstart click', function () {
            var $targetItem = self.$items.filter(function () {
                    return $(this).innerWidth() - 20 - $(this).position().left < self.$list.innerWidth();
                }).first();
            self.$list.animate({ scrollLeft: $targetItem.length ? self.$list.scrollLeft() + $targetItem.position().left - 30 : 0 }, 300);
        });
        self.$controlRight.on('touchstart click', function () {
            var $targetItem = self.$items.filter(function () {
                    return $(this).position().left + $(this).innerWidth() + 20 >= self.$list.innerWidth();
                }).first();
            self.$list.animate({ scrollLeft: $targetItem.length ? self.$list.scrollLeft() + $targetItem.position().left - 30 : self.$list.get(0).scrollWidth }, 300);
        });
    }
});
},{"./../../../../olivie/src/js/jquery":7,"./../../../../olivie/src/js/olivie":14}],29:[function(require,module,exports){
"use strict";
var $ = require('./../../../../olivie/src/js/jquery'), Olivie = require('./../../../../olivie/src/js/olivie');
module.exports = Olivie.component('Header', function () {
    var self = this;
    self.$e = $('<div></div>');
}, {
    AVAILABLE_INFO: [
        'logo',
        'banner',
        'channelName',
        'channelDescription',
        'videosCounter',
        'subscribersCounter',
        'viewsCounter',
        'subscribeButton'
    ],
    dependencies: [
        'error',
        'youtube',
        'i18n',
        'renderer'
    ]
}, {
    visible: null,
    channel: null,
    activeInfo: null,
    $element: null,
    $e: null,
    createHeaderElement: function () {
        var self = this;
        self.activeInfo = Olivie.utils.unifyMultipleOption(self.app.options.header.info) || [];
        self.activeInfo = self.activeInfo.filter(function (item) {
            return !!~self.constructor.AVAILABLE_INFO.indexOf(item);
        });
        var displaying = {};
        $.each(self.activeInfo, function (i, item) {
            displaying[item] = true;
        });
        displaying.properties = self.channel.id && (displaying.videosCounter || displaying.subscribersCounter || displaying.viewsCounter);
        displaying.channel = displaying.channelName || displaying.channelDescription;
        displaying.logo = displaying.logo && self.channel.get('snippet.thumbnails.default.url');
        displaying.banner = displaying.banner && self.channel.get('brandingSettings.image.bannerTabletHdImageUrl');
        displaying.inner = displaying.logo || displaying.channel || displaying.properties || displaying.banner;
        displaying.branding = displaying.logo || displaying.banner;
        displaying.subscribeButton = self.channel.id && displaying.subscribeButton;
        var parts = {};
        parts.logo = self.renderer.render('header.logo', {
            displaying: displaying,
            id: self.channel.id,
            url: self.channel.get('snippet.thumbnails.default.url'),
            title: self.channel.get('snippet.title')
        });
        parts.channel = self.renderer.render('header.channel', {
            displaying: displaying,
            id: self.channel.id,
            name: self.channel.get('snippet.title'),
            description: self.channel.get('snippet.description', Olivie.utils.formatAnchors),
            videoCount: self.channel.get('statistics.videoCount', Olivie.utils.formatBigNumber) + ' ' + self.i18n.t('Videos'),
            subscriberCount: self.channel.get('statistics.subscriberCount', Olivie.utils.formatBigNumber) + ' ' + self.i18n.t('Subscribers'),
            viewCount: self.channel.get('statistics.viewCount', Olivie.utils.formatBigNumber) + ' ' + self.i18n.t('Views')
        });
        parts.overlay = self.renderer.render('header.overlay', { displaying: displaying });
        parts.banner = self.renderer.render('header.banner', {
            displaying: displaying,
            url: self.channel.get('brandingSettings.image.bannerTabletHdImageUrl')
        });
        parts.subscribe = self.renderer.render('header.subscribe', { displaying: displaying });
        parts.inner = self.renderer.render('header.inner', {
            displaying: displaying,
            parts: parts
        });
        return $(self.renderer.render('header.container', {
            visible: self.visible,
            layout: self.app.options.header.layout,
            displaying: displaying,
            parts: parts
        }));
    },
    run: function () {
        var self = this;
        var channelSource;
        var q = $.Deferred();
        self.visible = self.app.options.header.visible;
        if (self.app.options.channel) {
            if ($.type(self.app.options.channel) !== 'string') {
                return self;
            }
            channelSource = self.youtube.parseSource(self.app.options.channel);
            if (!channelSource || channelSource.kind !== 'youtube#channel') {
                self.error.throw('Option "channel" contents invalid channel or user url.');
                return self;
            }
            self.youtube.model(channelSource.kind).find(channelSource.criteria, 'snippet,brandingSettings,statistics,contentDetails').done(function (channel) {
                self.channel = channel;
                q.resolve();
            }).fail(function (message) {
                message = message || 'Option "channel" contents invalid channel or user url.';
                self.error.throw(message);
            });
        } else {
            self.channel = self.youtube.model('youtube#channel').create();
            q.resolve();
        }
        q.done(function () {
            if (self.channel) {
                if (self.app.options.header.channelName) {
                    self.channel.set('snippet.title', self.app.options.header.channelName);
                }
                if (self.app.options.header.channelDescription) {
                    self.channel.set('snippet.description', self.app.options.header.channelDescription);
                }
                if (self.app.options.header.channelLogo) {
                    self.channel.set('snippet.thumbnails.default.url', self.app.options.header.channelLogo);
                } else if (self.channel.id) {
                    self.channel.set('snippet.thumbnails.default.url', self.youtube.resizeLogo(self.channel.get('snippet.thumbnails.default.url'), 100));
                }
                if (self.app.options.header.channelBanner) {
                    self.channel.set('brandingSettings.image.bannerTabletHdImageUrl', self.app.options.header.channelBanner);
                }
                self.visible = self.visible && (self.channel.get('snippet.title') || self.channel.get('snippet.description') || self.channel.get('snippet.thumbnails.default.url') || self.channel.get('brandingSettings.image.bannerImageUrl'));
                self.$element = self.createHeaderElement();
                if (!self.app.options.noCookies) {
                    self.channel.renderButton(self.$element.find('.yottie-widget-header-subscribe-button').get(0));
                }
            }
            setTimeout(function () {
                self.trigger('ready', [self]);
            });
        });
        return self;
    }
});
},{"./../../../../olivie/src/js/jquery":7,"./../../../../olivie/src/js/olivie":14}],30:[function(require,module,exports){
"use strict";
var $ = require('./../../../../olivie/src/js/jquery'), Olivie = require('./../../../../olivie/src/js/olivie'), Freelink = require('./../../free-link'), Deactivation = require('./../../deactivation'), EappsCustomCss = require('./../../custom-css');
module.exports = Olivie.component('Widget', function () {
    var self = this;
    self.$e = $('<div></div>');
}, {
    dependencies: ['renderer'],
    BREAKPOINTS: [
        1354,
        1056,
        780,
        640,
        460,
        410
    ],
    updateBreakpoints: function ($element, breakpoints, prefix) {
        var classes = {};
        var width = $element.innerWidth();
        var minWidth = width;
        $.each(breakpoints, function (i, mw) {
            if (width <= mw) {
                classes[prefix + mw] = true;
                minWidth = mw;
            } else {
                classes[prefix + mw] = false;
            }
        });
        $element.removeClass(Object.keys(classes).join(' '));
        $element.addClass(Object.keys(classes).filter(function (c) {
            return classes[c];
        }).join(' '));
        return minWidth;
    }
}, {
    $e: null,
    run: function () {
        var self = this;
        var $widgetInner = $(self.renderer.render('widget'));
        Olivie.utils.css(self.app.$element, { 'clear': 'both' });
        $widgetInner.find('yottie[data-part]').each(function (i, part) {
            var $part = $(part);
            var id = $part.attr('data-part');
            var component = self.app.component(id);
            if (!component || !component.$element) {
                $part.remove();
            } else {
                $part.replaceWith(component.$element);
            }
        });
        $widgetInner.appendTo(self.app.$element);
        self.app.$element.attr('id', 'yottie_' + self.app.getId());
        self.app.$element.css({ maxWidth: self.app.options.width });
        self.fit();
        $(window).resize(function () {
            self.fit();
        });
        self.app.$element.css({ 'position': 'relative' });
        if (self.app.options.showElfsightLogo === true && !self.app.freelink) {
            self.app.freelink = new Freelink(self, {
                selector: '.yottie-widget-inner',
                text: 'Free Youtube Gallery widget',
                link: 'https://elfsight.com/youtube-channel-plugin-yottie/?utm_source=websites&utm_medium=clients&utm_content=yottie&utm_term=' + self.app.options.websiteUrl + '&utm_campaign=free-widget',
                appsLink: 'https://apps.elfsight.com/panel/applications/yottie?show_pricing=true&remove_logo=true&utm_source=websites&utm_medium=clients&utm_content=yottie&utm_term=' + self.app.options.websiteUrl + '&utm_campaign=remove-link',
                owner: self.app.options.owner,
                platform: self.app.options.platform
            });
        }
        if (self.app.options.deactivate === true && !self.app.deactivation) {
            self.app.deactivation = new Deactivation(self, {
                selector: '.yottie-widget-inner',
                text: 'Widget is deactivated<br>Visit Elfsight Apps',
                link: 'https://apps.elfsight.com/panel/applications/yottie?utm_source=websites&utm_medium=clients&utm_content=yottie&utm_term=' + self.app.options.websiteUrl + '&utm_campaign=deactivated-widget'
            });
        }
        if (self.app.options.customCSS) {
            self.app.customCss = new EappsCustomCss(self, self.app.options.customCSS);
        }
    },
    fit: function () {
        var self = this;
        self.constructor.updateBreakpoints(self.app.$element, self.constructor.BREAKPOINTS, 'yottie-mw-');
    }
});
},{"./../../../../olivie/src/js/jquery":7,"./../../../../olivie/src/js/olivie":14,"./../../custom-css":17,"./../../deactivation":18,"./../../free-link":22}],31:[function(require,module,exports){
"use strict";
var $ = require('./../../../../olivie/src/js/jquery'), Olivie = require('./../../../../olivie/src/js/olivie');
module.exports = Olivie.component('Error', function () {
    var self = this;
}, { dependencies: ['renderer'] }, {
    $element: null,
    $content: null,
    $msg: null,
    createErrorElement: function () {
        var self = this;
        return $(self.renderer.render('error.container'));
    },
    run: function () {
        var self = this;
        self.$element = self.createErrorElement();
        self.$content = self.$element.find('.yottie-error-content');
        self.$element.appendTo(self.app.$element);
    },
    throw: function (msg) {
        var self = this;
        if (!self.app.get('options.debug')) {
            self.app.$element.hide();
        }
        self.$element.addClass('yottie-visible');
        var $msg = $(self.renderer.render('error.content', { message: msg }));
        if (!self.$msg) {
            self.$msg = $msg;
            self.$msg.appendTo(self.$content);
        } else {
            self.$msg = self.$msg.replaceWith($msg);
        }
    }
});
},{"./../../../../olivie/src/js/jquery":7,"./../../../../olivie/src/js/olivie":14}],32:[function(require,module,exports){
"use strict";
var $ = require('./../../../../olivie/src/js/jquery'), Olivie = require('./../../../../olivie/src/js/olivie'), Model = require('./model');
module.exports = function (client) {
    return Olivie.class('Channel', [Model], function (data) {
        var self = this;
        self.getParent('Model').call(self, data);
    }, {
        client: client,
        path: '/channels'
    }, {
        renderButton: function (element) {
            var self = this;
            setTimeout(function () {
                if (!window.gapi) {
                    var script = document.createElement('script');
                    script.src = 'https://apis.google.com/js/platform.js';
                    script.onload = function () {
                        gapi.ytsubscribe.render(element, { channelId: self.id });
                    };
                    document.head.appendChild(script);
                } else {
                    gapi.ytsubscribe.render(element, { channelId: self.id });
                }
            }, 300);
        }
    });
};
},{"./../../../../olivie/src/js/jquery":7,"./../../../../olivie/src/js/olivie":14,"./model":35}],33:[function(require,module,exports){
"use strict";
var $ = require('./../../../../olivie/src/js/jquery'), Olivie = require('./../../../../olivie/src/js/olivie'), Model = require('./model');
module.exports = function (client) {
    return Olivie.class('CommentThread', [Model], function (data) {
        var self = this;
        self.getParent('Model').call(self, data);
    }, {
        client: client,
        path: '/commentThreads'
    }, {
        getText: function () {
            var self = this;
            var text = self.get('snippet.topLevelComment.snippet.textDisplay');
            return text ? text.replace(/<a([^>]+)>/, '<a$1 target="_blank" rel="nofollow">') : null;
        }
    });
};
},{"./../../../../olivie/src/js/jquery":7,"./../../../../olivie/src/js/olivie":14,"./model":35}],34:[function(require,module,exports){
"use strict";
var $ = require('./../../../../olivie/src/js/jquery'), Olivie = require('./../../../../olivie/src/js/olivie');
module.exports = Olivie.class('Fetcher', [], function (params, part) {
    var self = this;
    if (!params || !part) {
        return;
    }
    self.params = params;
    self.part = part;
}, {
    create: function (params, part) {
        var constructor = this;
        return new constructor(params, part);
    },
    fetchDone: function (response, f, q, stack, count) {
        var constructor = this;
        Array.prototype.push.apply(stack, response.items);
        f.nextPageToken = response.nextPageToken || null;
        f.hasNextPage = !!f.nextPageToken;
        var lacks = count - stack.length;
        if (f.hasNextPage && stack.length < count) {
            f.fetch(lacks, q, stack, count);
        } else {
            stack = stack.map(function (item) {
                return constructor.model.create(item);
            });
            q.resolve(stack, f);
        }
    }
}, {
    params: null,
    part: null,
    nextPageToken: null,
    hasNextPage: true,
    hasNext: function () {
        var self = this;
        return self.hasNextPage;
    },
    fetch: function (maxResults, q, stack, count) {
        var self = this;
        count = count || maxResults;
        maxResults = maxResults <= self.constructor.model.MAX_RESULTS_MAX ? maxResults : self.constructor.model.MAX_RESULTS_MAX;
        q = q || $.Deferred();
        stack = stack || [];
        var params = $.extend({}, self.params, {
                part: self.part,
                maxResults: maxResults
            });
        if (self.nextPageToken) {
            params.pageToken = self.nextPageToken;
        }
        if (!self.hasNextPage) {
            q.reject();
        } else {
            self.constructor.model.client.get(self.constructor.model.path, params).done(function (response) {
                self.constructor.fetchDone(response, self, q, stack, count);
            });
        }
        return q.promise();
    },
    fetchAll: function (q) {
        var self = this;
        q = q || $.Deferred();
        var params = $.extend({}, self.params, {
                part: self.part,
                maxResults: self.constructor.model.MAX_RESULTS_MAX
            });
        if (!self.hasNextPage) {
        } else {
            self.constructor.model.client.get(self.constructor.model.path, params).done(function (response) {
                self.constructor.fetchDone(response, self, q, [], response.pageInfo.totalResults);
            });
        }
        return q.promise();
    }
});
},{"./../../../../olivie/src/js/jquery":7,"./../../../../olivie/src/js/olivie":14}],35:[function(require,module,exports){
"use strict";
var $ = require('./../../../../olivie/src/js/jquery'), Olivie = require('./../../../../olivie/src/js/olivie');
module.exports = Olivie.class('Model', [], function (data) {
    var self = this;
    if (data) {
        self.fill(data);
    }
}, {
    MAX_RESULTS_MIN: 0,
    MAX_RESULTS_MAX: 49,
    find: function (params, part, q) {
        var constructor = this;
        if (!params || !part) {
            return;
        }
        q = q || $.Deferred();
        params.maxResults = 1;
        params.part = part;
        constructor.client.get(constructor.path, params).done(function (result) {
            if (!result.items || !result.items.length) {
                q.reject(result.error ? result.error.message : null);
            } else {
                q.resolve(constructor.create(result.items[0]));
            }
        });
        return q.promise();
    },
    findAll: function (params, part, maxResults, q) {
        var constructor = this;
        if (!params || !part) {
            return;
        }
        q = q || $.Deferred();
        params.part = part;
        if (maxResults) {
            params.maxResults = maxResults;
        }
        constructor.client.get(constructor.path, params).done(function (result) {
            var list = [];
            if (!result.items || !result.items.length) {
                if (result.items && !result.items.length) {
                    q.resolve(result.items);
                } else {
                    q.reject(result.error ? result.error.message : null);
                }
            } else {
                $.each(result.items, function (i, item) {
                    list.push(constructor.create(item));
                });
                q.resolve(list);
            }
        });
        return q.promise();
    },
    create: function (data) {
        var constructor = this;
        return new constructor(data);
    }
}, {
    fill: function (data) {
        var self = this;
        $.extend(self, data);
    }
});
},{"./../../../../olivie/src/js/jquery":7,"./../../../../olivie/src/js/olivie":14}],36:[function(require,module,exports){
"use strict";
var $ = require('./../../../../olivie/src/js/jquery'), Olivie = require('./../../../../olivie/src/js/olivie'), Model = require('./model');
module.exports = function (client) {
    return Olivie.class('PlaylistItem', [Model], function (data) {
        var self = this;
        self.getParent('Model').call(self, data);
    }, {
        client: client,
        path: '/playlistItems'
    }, {});
};
},{"./../../../../olivie/src/js/jquery":7,"./../../../../olivie/src/js/olivie":14,"./model":35}],37:[function(require,module,exports){
"use strict";
var $ = require('./../../../../olivie/src/js/jquery'), Olivie = require('./../../../../olivie/src/js/olivie'), Fetcher = require('./fetcher');
module.exports = function (model) {
    return Olivie.class('PlaylistItemsFetcher', [Fetcher], function (params, part) {
        var self = this;
        self.getParent('Fetcher').call(self, params, part);
    }, { model: model }, {});
};
},{"./../../../../olivie/src/js/jquery":7,"./../../../../olivie/src/js/olivie":14,"./fetcher":34}],38:[function(require,module,exports){
"use strict";
var $ = require('./../../../../olivie/src/js/jquery'), Olivie = require('./../../../../olivie/src/js/olivie'), Model = require('./model');
module.exports = function (client) {
    return Olivie.class('Playlist', [Model], function (data) {
        var self = this;
        self.getParent('Model').call(self, data);
    }, {
        client: client,
        path: '/playlists'
    }, {});
};
},{"./../../../../olivie/src/js/jquery":7,"./../../../../olivie/src/js/olivie":14,"./model":35}],39:[function(require,module,exports){
"use strict";
var $ = require('./../../../../olivie/src/js/jquery'), Olivie = require('./../../../../olivie/src/js/olivie'), Fetcher = require('./fetcher');
module.exports = function (model) {
    return Olivie.class('PlaylistsFetcher', [Fetcher], function (params, part) {
        var self = this;
        self.getParent('Fetcher').call(self, params, part);
    }, { model: model }, {});
};
},{"./../../../../olivie/src/js/jquery":7,"./../../../../olivie/src/js/olivie":14,"./fetcher":34}],40:[function(require,module,exports){
"use strict";
var $ = require('./../../../../olivie/src/js/jquery'), Olivie = require('./../../../../olivie/src/js/olivie');
module.exports = Olivie.class('ProxyStorage', [], function (fetcher, order) {
    var self = this;
    self.fetcher = fetcher;
    self.orderingRules = [];
    order = Olivie.utils.unifyMultipleOption(order) || [];
    $.each(order, function (i, rule) {
        rule = rule.split('#');
        var field = self.constructor.ORDER_FIELD_ALIASES[rule[0]] || rule[0];
        var direction = rule[1] || 'asc';
        self.orderingRules.push({
            field: field,
            direction: direction
        });
    });
}, {
    ORDER_FIELD_ALIASES: {
        likes: 'statistics.likeCount',
        dislikes: 'statistics.dislikeCount',
        views: 'statistics.viewCount',
        comments: 'statistics.commentCount',
        position: '__relatedPlaylistItem.snippet.position'
    }
}, {
    fetcher: null,
    result: null,
    orderingRules: null,
    pointer: 0,
    prepare: function () {
        var self = this;
        var q = $.Deferred();
        self.fetcher.prepare().done(function () {
            self.fetcher.fetchAll().done(function (result) {
                self.result = result;
                self.sortResult();
                q.resolve();
            });
        });
        return q.promise();
    },
    sortResult: function () {
        var self = this;
        $.each(self.orderingRules, function (i, rule) {
            var orderingFunction;
            if (rule.field === 'random') {
                Olivie.utils.shuffle(self.result);
            } else {
                orderingFunction = jQuery.yottie.orderFunctions[rule.field];
                if (!orderingFunction) {
                    orderingFunction = function (a, b) {
                        var aPropValue = Olivie.utils.getProperty(a, rule.field, Olivie.utils.parseInt);
                        var bPropValue = Olivie.utils.getProperty(b, rule.field, Olivie.utils.parseInt);
                        if (aPropValue < bPropValue) {
                            return -1;
                        }
                        if (aPropValue > bPropValue) {
                            return 1;
                        }
                        return 0;
                    };
                }
                self.result.sort(orderingFunction);
                if (rule.direction === 'desc') {
                    self.result.reverse();
                }
            }
        });
    },
    isReady: function () {
        var self = this;
        return self.fetcher.isReady();
    },
    hasNext: function () {
        var self = this;
        return self.result.length > self.pointer;
    },
    fetch: function (count, filterStr, filterField, q) {
        var self = this;
        q = q || $.Deferred();
        var filterFunc = function (arr, filterStr) {
            var clearStr = function (str) {
                return str.toLowerCase().trim().replace(/[_+-.,!@#$%^&*();\/|<>"':?\d]/g, '');
            };
            var filterStrCleared = clearStr(filterStr);
            arr = arr.filter(function (elem) {
                var snippet = elem.snippet, title = clearStr(snippet.title), description = clearStr(snippet.description);
                if (filterField === 'title&description') {
                    return title.indexOf(filterStrCleared) !== -1 || description.indexOf(filterStrCleared) !== -1;
                } else {
                    return title.indexOf(filterStrCleared) !== -1;
                }
            });
            return arr;
        };
        if (self.isReady() && self.hasNext()) {
            self.pointer += count;
            var result;
            if (filterStr !== '') {
                self.result = filterFunc(self.result, filterStr);
            }
            result = self.result.slice(self.pointer - count, self.pointer);
            q.resolve(result);
        } else {
            q.reject();
        }
        return q.promise();
    }
});
},{"./../../../../olivie/src/js/jquery":7,"./../../../../olivie/src/js/olivie":14}],41:[function(require,module,exports){
"use strict";
var $ = require('./../../../../olivie/src/js/jquery'), Olivie = require('./../../../../olivie/src/js/olivie');
module.exports = Olivie.class('UniversalVideoFetcher', [], function (source, part, youtube) {
    var self = this;
    self.rawSource = source;
    self.part = part;
    self.youtube = youtube;
    self.preparedSource = [];
    self.fetchers = [];
    self.stack = [];
    self.videoPlaylistItemRelations = {};
}, {
    stackSortingFunc: function (a, b) {
        var timeA = a.getPublishedTimestamp();
        var timeB = b.getPublishedTimestamp();
        if (timeA > timeB) {
            return -1;
        } else if (timeA < timeB) {
            return 1;
        }
        return 0;
    }
}, {
    youtube: null,
    rawSource: null,
    preparedSource: null,
    fetchers: null,
    stack: null,
    part: null,
    videoPlaylistItemRelations: null,
    isReady: function () {
        var self = this;
        return !!self.fetchers.length;
    },
    sortStack: function () {
        var self = this;
        self.stack.sort(self.constructor.stackSortingFunc);
    },
    hasNext: function () {
        var self = this;
        return self.stack && self.stack.length || self.fetchers.some(function (item) {
            return item.hasNext();
        });
    },
    prepare: function () {
        var self = this;
        var q = $.Deferred();
        var preparePromises = [];
        $.each(self.rawSource, function (i, src) {
            var q = $.Deferred();
            if (src.kind === 'youtube#channel') {
                self.youtube.model(src.kind).find(src.criteria, 'contentDetails').done(function (channel) {
                    var id = Olivie.utils.getProperty(channel, 'contentDetails.relatedPlaylists.uploads');
                    if (!id) {
                        return;
                    }
                    q.resolve({
                        kind: 'youtube#playlist',
                        criteria: { id: id }
                    });
                });
            } else {
                q.resolve(src);
            }
            preparePromises.push(q);
        });
        $.when.apply($, preparePromises).done(function () {
            var playlistOrigins = [];
            var videoIds = [];
            $.each(arguments, function (i, src) {
                if (src.kind === 'youtube#playlist') {
                    playlistOrigins.push(src);
                } else {
                    videoIds.push(src.criteria.id);
                }
            });
            self.preparedSource = playlistOrigins;
            if (videoIds.length) {
                self.preparedSource.push({
                    kind: 'youtube#video',
                    criteria: { id: videoIds }
                });
            }
            $.each(self.preparedSource, function (i, src) {
                var fetcher, criteria, model, part;
                if (src.kind === 'youtube#playlist') {
                    model = 'youtube#playlistItem';
                    criteria = { playlistId: src.criteria.id };
                    part = 'contentDetails,snippet';
                } else {
                    model = src.kind;
                    criteria = { id: src.criteria.id.join(',') };
                    part = self.part;
                }
                fetcher = self.youtube.fetcher(model).create(criteria, part);
                self.fetchers.push(fetcher);
            });
            q.resolve();
        });
        return q.promise();
    },
    fetch: function (maxResults, filterStr, filterField, q) {
        filterStr = filterStr || '';
        filterField = filterField || 'title';
        var self = this;
        q = q || $.Deferred();
        var chunk;
        var stack;
        var fetchPromises = [];
        var hasNext = self.hasNext();
        var filterFunc = function (arr, filterStr) {
            var clearStr = function (str) {
                return str.toLowerCase().trim().replace(/[_+-.,!@#$%^&*();\/|<>"':?\d]/g, '');
            };
            var filterStrCleared = clearStr(filterStr);
            arr = arr.filter(function (elem) {
                var snippet = elem.snippet, title = clearStr(snippet.title), description = clearStr(snippet.description);
                if (filterField === 'title&description') {
                    return title.indexOf(filterStrCleared) !== -1 || description.indexOf(filterStrCleared) !== -1;
                } else {
                    return title.indexOf(filterStrCleared) !== -1;
                }
            });
            return arr;
        };
        if (!self.isReady()) {
            q.reject(0);
        } else if (self.stack.length >= maxResults || !hasNext && self.stack.length) {
            chunk = self.stack.slice(0, maxResults);
            self.stack.splice(0, maxResults);
            q.resolve(chunk);
        } else if (!hasNext) {
            q.reject(1);
        } else {
            $.each(self.fetchers, function (i, fetcher) {
                if (!fetcher.hasNext() || fetchPromises.length) {
                    return;
                }
                fetchPromises.push(fetcher.fetch(filterStr !== '' ? 49 : maxResults));
            });
            if (!fetchPromises.length && self.stack && self.stack.length) {
                stack = self.stack.slice();
                self.stack = [];
                q.resolve(stack);
            }
            $.when.apply($, fetchPromises).done(function () {
                var videoIds = [];
                var args = $.type(arguments[1]) === 'object' ? [arguments] : arguments;
                $.each(args, function (i, res) {
                    if (!res) {
                        return;
                    }
                    var list = res[0];
                    var fetcher = res[1];
                    if (filterStr !== '') {
                        list = filterFunc(list, filterStr);
                    }
                    if (fetcher.constructor.id === 'VideoFetcher') {
                        Array.prototype.push.apply(self.stack, list);
                    } else {
                        Array.prototype.push.apply(videoIds, list.map(function (t) {
                            self.videoPlaylistItemRelations[t.contentDetails.videoId] = t;
                            return t.contentDetails.videoId;
                        }));
                    }
                });
                var videosLoadPromise = $.Deferred();
                if (videoIds.length) {
                    self.youtube.model('youtube#video').findAllVideos({ id: videoIds.join(',') }, self.part).done(function (list) {
                        Array.prototype.push.apply(self.stack, list);
                        $.each(self.stack, function (i, video) {
                            video.__relatedPlaylistItem = self.videoPlaylistItemRelations[video.id];
                        });
                        videosLoadPromise.resolve();
                    });
                } else {
                    self.fetch(maxResults, filterStr, filterField, q);
                }
                videosLoadPromise.done(function () {
                    self.fetch(maxResults, filterStr, filterField, q);
                });
            });
        }
        return q.promise();
    },
    fetchAll: function (q, result) {
        var self = this;
        q = q || $.Deferred();
        result = result || [];
        self.fetch(49).done(function (chunk) {
            Array.prototype.push.apply(result, chunk);
            self.fetchAll(q, result);
        }).fail(function () {
            q.resolve(result);
        });
        return q.promise();
    }
});
},{"./../../../../olivie/src/js/jquery":7,"./../../../../olivie/src/js/olivie":14}],42:[function(require,module,exports){
"use strict";
var $ = require('./../../../../olivie/src/js/jquery'), Olivie = require('./../../../../olivie/src/js/olivie'), Fetcher = require('./fetcher');
module.exports = function (model) {
    return Olivie.class('VideoFetcher', [Fetcher], function (params, part) {
        var self = this;
        self.getParent('Fetcher').call(self, params, part);
        self.stack = [];
    }, { model: model }, {
        stack: null,
        hasNext: function () {
            var self = this;
            return self.hasNextPage || self.stack.length;
        },
        fetch: function (maxResults, q, stack, count) {
            var self = this;
            count = count || maxResults;
            q = q || $.Deferred();
            stack = stack || [];
            var preloaderDef = $.Deferred();
            if (!self.hasNext()) {
                q.reject();
            } else {
                if (!self.stack.length) {
                    self.hasNextPage = false;
                    self.constructor.model.findAllVideos({ id: self.params.id }, self.part).done(function (list) {
                        self.stack = list;
                        preloaderDef.resolve();
                    }).fail(function () {
                        q.reject();
                    });
                } else {
                    preloaderDef.resolve();
                }
                preloaderDef.done(function () {
                    var chunk = self.stack.slice(0, maxResults);
                    self.stack.splice(0, maxResults);
                    if (chunk.length) {
                        q.resolve(chunk, self);
                    } else {
                        q.reject();
                    }
                });
            }
            return q.promise();
        }
    });
};
},{"./../../../../olivie/src/js/jquery":7,"./../../../../olivie/src/js/olivie":14,"./fetcher":34}],43:[function(require,module,exports){
"use strict";
var $ = require('./../../../../olivie/src/js/jquery'), Olivie = require('./../../../../olivie/src/js/olivie'), Model = require('./model');
module.exports = function (client) {
    return Olivie.class('Video', [Model], function (data) {
        var self = this;
        self.getParent('Model').call(self, data);
    }, {
        DURATION_REGEX: /\d+[A-Z]/g,
        client: client,
        path: '/videos',
        findAllVideos: function (params, part, maxResults, q, stack) {
            var constructor = this;
            q = q || $.Deferred();
            var partParams;
            if (params && params.id) {
                params.id = $.type(params.id) === 'string' ? params.id.split(',') : params.id;
                params.id = maxResults ? params.id.slice(0, maxResults) : params.id;
                if (stack || params.id.length > constructor.MAX_RESULTS_MAX) {
                    stack = stack || [];
                    partParams = $.extend(false, {}, params, { id: params.id.slice(0, constructor.MAX_RESULTS_MAX).join(',') });
                    constructor.findAll(partParams, part).done(function (chunk) {
                        Array.prototype.push.apply(stack, chunk);
                        var itemsLeft = params.id.slice(constructor.MAX_RESULTS_MAX);
                        var nextPartParams;
                        if (itemsLeft.length) {
                            nextPartParams = $.extend(false, {}, params, { id: itemsLeft });
                            constructor.findAllVideos(nextPartParams, part, null, q, stack);
                        } else {
                            q.resolve(stack);
                        }
                    }).fail(function (error) {
                        error && console.error(error);
                    });
                } else {
                    params.id = params.id.join(',');
                    constructor.findAll(params, part, maxResults, q);
                }
            } else {
                constructor.findAll(params, part, maxResults, q);
            }
            return q.promise();
        }
    }, {
        getPublishedTimestamp: function () {
            var self = this;
            return self.get('snippet.publishedAt', Date.parse);
        },
        parseDuration: function () {
            var self = this;
            var duration = {};
            var durationStr = self.get('contentDetails.duration');
            if (!durationStr) {
                return;
            }
            var matches = durationStr.match(self.constructor.DURATION_REGEX);
            $.each(matches, function (i, match) {
                var designator = match.substr(match.length - 1).toLowerCase();
                var value = '0' + parseInt(match.substr(0, match.length - 1), 10);
                value = value.substr(-2);
                duration[designator] = value;
            });
            return duration;
        }
    });
};
},{"./../../../../olivie/src/js/jquery":7,"./../../../../olivie/src/js/olivie":14,"./model":35}],44:[function(require,module,exports){
"use strict";
var $ = require('./../../../../olivie/src/js/jquery'), Olivie = require('./../../../../olivie/src/js/olivie'), UniversalVideoFetcher = require('./universal-video-fetcher'), channel = require('./channel'), playlist = require('./playlist'), playlistItem = require('./playlist-item'), video = require('./video'), commentThread = require('./comment-thread'), playlistsFetcher = require('./playlists-fetcher'), playlistItemFetcher = require('./playlist-items-fetcher'), videoFetcher = require('./video-fetcher');
module.exports = Olivie.component('Youtube', function () {
}, {
    dependencies: ['client'],
    SOURCE_DETERMINANTS: [
        {
            kind: 'youtube#channel',
            regex: /^https?:\/\/(www\.)?youtube\.com\/channel\/([^\/]+)\/?$/,
            func: function (matches) {
                return { criteria: { id: matches[2] } };
            }
        },
        {
            kind: 'youtube#channel',
            regex: /^https?:\/\/(www\.)?youtube\.com\/user\/([^\/]+)\/?$/,
            func: function (matches) {
                return { criteria: { forUsername: matches[2] } };
            }
        },
        {
            kind: 'youtube#playlist',
            regex: /^https?:\/\/(www\.)?youtube\.com\/playlist\/?\?list=([^$]+)$/,
            func: function (matches) {
                return { criteria: { id: matches[2] } };
            }
        },
        {
            kind: 'youtube#video',
            regex: /^https?:\/\/(www\.)?youtube\.com\/watch\/?\?v=([^$&]+)/,
            func: function (matches) {
                return { criteria: { id: matches[2] } };
            }
        }
    ],
    formatNumberDigits: function (num) {
        return Olivie.utils.numberFormat(num, 0, null, ' ');
    }
}, {
    models: null,
    register: function (app) {
        var self = this;
        self.getParent('Component').prototype.register.call(self, app);
        self.models = {
            'youtube#channel': channel(self.client),
            'youtube#playlist': playlist(self.client),
            'youtube#playlistItem': playlistItem(self.client),
            'youtube#video': video(self.client),
            'youtube#commentThread': commentThread(self.client)
        };
        self.fetchers = {
            'youtube#playlist': playlistsFetcher(self.model('youtube#playlist')),
            'youtube#playlistItem': playlistItemFetcher(self.model('youtube#playlistItem')),
            'youtube#video': videoFetcher(self.model('youtube#video'))
        };
    },
    hasModel: function (id) {
        var self = this;
        return !!self.models[id];
    },
    model: function (id) {
        var self = this;
        if (!self.hasModel(id)) {
            return;
        }
        return self.models[id];
    },
    hasFetcher: function (id) {
        var self = this;
        return !!self.fetchers[id];
    },
    fetcher: function (id) {
        var self = this;
        if (!self.hasFetcher(id)) {
            return;
        }
        return self.fetchers[id];
    },
    createUniversalVideoFetcher: function (source, part) {
        var self = this;
        return new UniversalVideoFetcher(source, part, self);
    },
    parseSource: function (str) {
        var self = this;
        var source = null;
        $.each(self.constructor.SOURCE_DETERMINANTS, function (i, det) {
            var matches = str.match(det.regex);
            if (matches) {
                source = $.extend({ kind: det.kind }, det.func(matches));
                return false;
            }
        });
        return source;
    },
    resizeLogo: function (url, size) {
        return url.replace(/\/s\d+-c-k-no/, '/s' + parseInt(size, 10) + '-c-k-no');
    }
});
},{"./../../../../olivie/src/js/jquery":7,"./../../../../olivie/src/js/olivie":14,"./channel":32,"./comment-thread":33,"./playlist":38,"./playlist-item":36,"./playlist-items-fetcher":37,"./playlists-fetcher":39,"./universal-video-fetcher":41,"./video":43,"./video-fetcher":42}],45:[function(require,module,exports){
"use strict";
module.exports = {
    default: {
        header: {
            bg: 'rgb(250, 250, 250)',
            bannerOverlay: 'rgba(255, 255, 255, 0.92)',
            channelName: 'rgb(17, 17, 17)',
            channelNameHover: 'rgb(17, 17, 17)',
            channelDescription: 'rgb(17, 17, 17)',
            anchor: 'rgb(17, 17, 17)',
            anchorHover: 'rgb(17, 17, 17)',
            counters: 'rgba(17, 17, 17, 0.7)'
        },
        groups: {
            bg: 'rgb(250, 250, 250)',
            link: 'rgba(17, 17, 17, 0.5)',
            linkHover: 'rgb(17, 17, 17)',
            linkActive: 'rgb(17, 17, 17)',
            highlightHover: 'rgb(17, 17, 17)',
            highlightActive: 'rgb(17, 17, 17)'
        },
        content: {
            bg: 'rgb(255, 255, 255)',
            arrows: 'rgb(0, 0, 0)',
            arrowsHover: 'rgb(0, 0, 0)',
            arrowsBg: 'rgba(255, 255, 255, 0.8)',
            arrowsBgHover: 'rgba(255, 255, 255, 1)',
            scrollbarBg: 'rgb(204, 204, 204)',
            scrollbarSliderBg: 'rgba(0, 0, 0, 0.4)'
        },
        video: {
            bg: 'rgb(255, 255, 255)',
            overlay: 'rgba(255, 255, 255, 0.95)',
            playIcon: 'rgba(255, 255, 255, 0.4)',
            playIconHover: 'rgba(255, 255, 255, 0.8)',
            duration: 'rgb(255, 255, 255)',
            durationBg: 'rgba(34, 34, 34, 0.81)',
            title: 'rgb(17, 17, 17)',
            titleHover: 'rgb(17, 17, 17)',
            date: 'rgba(17, 17, 17, 0.7)',
            description: 'rgb(17, 17, 17)',
            anchor: 'rgb(26, 137, 222)',
            anchorHover: 'rgb(47, 165, 255)',
            counters: 'rgba(17, 17, 17, 0.7)'
        },
        popup: {
            bg: 'rgb(255, 255, 255)',
            overlay: 'rgba(0, 0, 0, 0.7)',
            title: 'rgb(17, 17, 17)',
            channelName: 'rgb(17, 17, 17)',
            channelNameHover: 'rgb(17, 17, 17)',
            viewsCounter: 'rgba(17, 17, 17, 0.7)',
            likesRatio: 'rgb(47, 165, 255)',
            dislikesRatio: 'rgb(207, 207, 207)',
            likesCounter: 'rgba(17, 17, 17, 0.5)',
            dislikesCounter: 'rgba(17, 17, 17, 0.5)',
            share: 'rgba(17, 17, 17, 0.5)',
            date: 'rgba(17, 17, 17, 0.7)',
            description: 'rgb(17, 17, 17)',
            anchor: 'rgb(26, 137, 222)',
            anchorHover: 'rgb(47, 165, 255)',
            descriptionMoreButton: 'rgba(17, 17, 17, 0.5)',
            descriptionMoreButtonHover: 'rgba(17, 17, 17, 0.7)',
            commentsUsername: 'rgb(17, 17, 17)',
            commentsUsernameHover: 'rgb(17, 17, 17)',
            commentsPassedTime: 'rgba(17, 17, 17, 0.7)',
            commentsText: 'rgb(17, 17, 17)',
            commentsLikes: 'rgba(17, 17, 17, 0.5)',
            controls: 'rgb(160, 160, 160)',
            controlsHover: 'rgb(220, 220, 220)',
            controlsMobile: 'rgb(220, 220, 220)',
            controlsMobileBg: 'rgba(255, 255, 255, 0)'
        }
    },
    dark: {
        header: {
            bg: 'rgb(51, 51, 51)',
            bannerOverlay: 'rgba(51, 51, 51, 0.81)',
            channelName: 'rgb(255, 255, 255)',
            channelNameHover: 'rgb(77, 178, 255)',
            channelDescription: 'rgb(255, 255, 255)',
            anchor: 'rgb(77, 178, 255)',
            anchorHover: 'rgb(255, 255, 255)',
            counters: 'rgb(160, 160, 160)'
        },
        groups: {
            bg: 'rgb(51, 51, 51)',
            link: 'rgba(255, 255, 255, 0.5)',
            linkHover: 'rgb(255, 66, 66)',
            linkActive: 'rgb(255, 66, 66)',
            highlight: 'rgb(85, 85, 85)',
            highlightHover: 'rgb(255, 66, 66)',
            highlightActive: 'rgb(255, 66, 66)'
        },
        content: {
            bg: 'rgb(51, 51, 51)',
            arrows: 'rgb(34, 34, 34)',
            arrowsHover: 'rgb(255, 0, 0)',
            arrowsBg: 'rgba(255, 255, 255, 0.4)',
            arrowsBgHover: 'rgba(255, 255, 255, 0.8)',
            scrollbarBg: 'rgb(85, 85, 85)',
            scrollbarSliderBg: 'rgba(255, 255, 255, 0.4)'
        },
        video: {
            bg: 'rgb(28, 28, 28)',
            overlay: 'rgba(28, 28, 28, 0.9)',
            playIcon: 'rgba(255, 255, 255, 0.4)',
            playIconHover: 'rgba(255, 255, 255, 0.8)',
            duration: 'rgb(255, 255, 255)',
            durationBg: 'rgba(28, 28, 28, 0.81)',
            title: 'rgb(200, 200, 200)',
            titleHover: 'rgb(77, 178, 255)',
            date: 'rgb(116, 116, 116)',
            description: 'rgb(200, 200, 200)',
            anchor: 'rgb(42, 163, 255)',
            anchorHover: 'rgb(77, 178, 255)',
            counters: 'rgb(112, 112, 112)'
        },
        popup: {
            bg: 'rgb(51, 51, 51)',
            overlay: 'rgba(0, 0, 0, 0.7)',
            title: 'rgb(255, 255, 255)',
            channelName: 'rgb(255, 255, 255)',
            channelNameHover: 'rgb(77, 178, 255)',
            viewsCounter: 'rgb(255, 255, 255)',
            likesRatio: 'rgb(47, 165, 255)',
            dislikesRatio: 'rgb(100, 100, 100)',
            likesCounter: 'rgb(144, 144, 144)',
            dislikesCounter: 'rgb(144, 144, 144)',
            share: 'rgb(144, 144, 144)',
            date: 'rgb(255, 255, 255)',
            description: 'rgb(255, 255, 255)',
            anchor: 'rgb(42, 163, 255)',
            anchorHover: 'rgb(77, 178, 255)',
            descriptionMoreButton: 'rgb(120, 120, 120)',
            descriptionMoreButtonHover: 'rgb(255, 255, 255)',
            commentsUsername: 'rgb(255, 255, 255)',
            commentsUsernameHover: 'rgb(77, 178, 255)',
            commentsPassedTime: 'rgb(116, 116, 116)',
            commentsText: 'rgb(255, 255, 255)',
            commentsLikes: 'rgb(116, 116, 116)',
            controls: 'rgb(160, 160, 160)',
            controlsHover: 'rgb(220, 220, 220)',
            controlsMobile: 'rgb(220, 220, 220)',
            controlsMobileBg: 'rgba(255, 255, 255, 0)'
        }
    },
    red: {
        header: {
            bg: 'rgb(197, 17, 9)',
            bannerOverlay: 'rgb(197, 17, 9)',
            channelName: 'rgb(255, 255, 255)',
            channelNameHover: 'rgba(255, 255, 255, 0.9)',
            channelDescription: 'rgb(255, 255, 255)',
            anchor: 'rgba(255, 255, 255, 0.9)',
            anchorHover: 'rgb(255, 255, 255)',
            counters: 'rgba(255, 255, 255, 0.6)'
        },
        groups: {
            bg: 'rgb(230, 33, 23)',
            link: 'rgba(255, 255, 255, 0.6)',
            linkHover: 'rgb(255, 255, 255)',
            linkActive: 'rgb(255, 255, 255)',
            highlight: 'rgba(255, 255, 255, 0.4)',
            highlightHover: 'rgb(255, 255, 255)',
            highlightActive: 'rgb(255, 255, 255)'
        },
        content: {
            bg: 'rgb(255, 255, 255)',
            arrows: 'rgb(255, 255, 255)',
            arrowsHover: 'rgb(0, 198, 255)',
            arrowsBg: 'rgba(0, 0, 0, 0.7)',
            arrowsBgHover: 'rgba(0, 0, 0, 0.95)',
            scrollbarBg: 'rgb(223, 223, 223)',
            scrollbarSliderBg: 'rgba(133, 133, 133, 0.4)'
        },
        video: {
            bg: 'rgb(255, 255, 255)',
            overlay: 'rgba(255, 255, 255, 0.95)',
            playIcon: 'rgba(255, 255, 255, 0.4)',
            playIconHover: 'rgba(255, 255, 255, 0.8)',
            duration: 'rgb(209, 238, 246)',
            durationBg: 'rgba(5, 25, 43, 0.81)',
            title: 'rgb(0, 0, 0)',
            titleHover: 'rgb(255, 26, 54)',
            date: 'rgb(177, 177, 177)',
            description: 'rgb(80, 80, 80)',
            anchor: 'rgb(255, 26, 54)',
            anchorHover: 'rgb(0, 0, 0)',
            counters: 'rgb(177, 177, 177)'
        },
        popup: {
            bg: 'rgb(255, 255, 255)',
            overlay: 'rgba(12, 2, 2, 0.8)',
            title: 'rgb(0, 0, 0)',
            channelName: 'rgb(0, 0, 0)',
            channelNameHover: 'rgb(255, 26, 54)',
            viewsCounter: 'rgb(85, 85, 85)',
            likesRatio: 'rgb(47, 165, 255)',
            dislikesRatio: 'rgb(207, 207, 207)',
            likesCounter: 'rgb(144, 144, 144)',
            dislikesCounter: 'rgb(144, 144, 144)',
            share: 'rgb(144, 144, 144)',
            date: 'rgb(80, 80, 80)',
            description: 'rgb(80, 80, 80)',
            anchor: 'rgb(255, 26, 54)',
            anchorHover: 'rgb(0, 0, 0)',
            descriptionMoreButton: 'rgb(177, 177, 177)',
            descriptionMoreButtonHover: 'rgb(80, 80, 80)',
            commentsUsername: 'rgb(0, 0, 0)',
            commentsUsernameHover: 'rgb(255, 26, 54)',
            commentsPassedTime: 'rgb(177, 177, 177)',
            commentsText: 'rgb(80, 80, 80)',
            commentsLikes: 'rgb(180, 180, 180)',
            controls: 'rgb(160, 160, 160)',
            controlsHover: 'rgb(220, 220, 220)',
            controlsMobile: 'rgb(220, 220, 220)',
            controlsMobileBg: 'rgba(255, 255, 255, 0)'
        }
    },
    'deep blue': {
        header: {
            bg: 'rgb(50, 81, 108)',
            bannerOverlay: 'rgba(50, 81, 108, 0.81)',
            channelName: 'rgb(255, 255, 255)',
            channelNameHover: 'rgb(98, 220, 255)',
            channelDescription: 'rgb(209, 238, 246)',
            anchor: 'rgb(98, 220, 255)',
            anchorHover: 'rgb(255, 255, 255)',
            counters: 'rgb(140, 170, 197)'
        },
        groups: {
            bg: 'rgb(33, 56, 75)',
            link: 'rgb(255, 255, 255, 0.5)',
            linkHover: 'rgb(98, 220, 255)',
            linkActive: 'rgb(98, 220, 255)',
            highlight: 'rgb(50, 81, 108)',
            highlightHover: 'rgb(0, 198, 255)',
            highlightActive: 'rgb(0, 198, 255)'
        },
        content: {
            bg: 'rgb(33, 56, 75)',
            arrows: 'rgb(255, 255, 255)',
            arrowsHover: 'rgb(0, 198, 255)',
            arrowsBg: 'rgba(0, 0, 0, 0.7)',
            arrowsBgHover: 'rgba(0, 0, 0, 0.95)',
            scrollbarBg: 'rgb(50, 81, 108)',
            scrollbarSliderBg: 'rgb(66, 114, 156)'
        },
        video: {
            bg: 'rgb(33, 56, 75)',
            overlay: 'rgba(5, 25, 43, 0.9)',
            playIcon: 'rgba(255, 255, 255, 0.4)',
            playIconHover: 'rgba(255, 255, 255, 0.8)',
            duration: 'rgb(209, 238, 246)',
            durationBg: 'rgba(5, 25, 43, 0.81)',
            title: 'rgb(0, 198, 255)',
            titleHover: 'rgb(255, 255, 255)',
            date: 'rgba(90, 130, 165, 1)',
            description: 'rgb(209, 238, 246)',
            anchor: 'rgb(0, 198, 255)',
            anchorHover: 'rgb(255, 255, 255)',
            counters: 'rgba(90, 130, 165, 1)'
        },
        popup: {
            bg: 'rgb(33, 56, 75)',
            overlay: 'rgba(4, 17, 28, 0.8)',
            title: 'rgb(255, 255, 255)',
            channelName: 'rgb(255, 255, 255)',
            channelNameHover: 'rgb(0, 198, 255)',
            viewsCounter: 'rgb(255, 255, 255)',
            likesRatio: 'rgb(44, 138, 218)',
            dislikesRatio: 'rgb(51, 79, 102)',
            likesCounter: 'rgba(90, 130, 165, 1)',
            dislikesCounter: 'rgba(90, 130, 165, 1)',
            share: 'rgba(90, 130, 165, 1)',
            date: 'rgba(90, 130, 165, 1)',
            description: 'rgb(209, 238, 246)',
            anchor: 'rgb(0, 198, 255)',
            anchorHover: 'rgb(255, 255, 255)',
            descriptionMoreButton: 'rgba(90, 130, 165, 1)',
            descriptionMoreButtonHover: 'rgb(209, 238, 246)',
            commentsUsername: 'rgb(255, 255, 255)',
            commentsUsernameHover: 'rgb(0, 198, 255)',
            commentsPassedTime: 'rgba(90, 130, 165, 1)',
            commentsText: 'rgb(209, 238, 246)',
            commentsLikes: 'rgba(90, 130, 165, 1)',
            controls: 'rgb(68, 107, 140)',
            controlsHover: 'rgb(0, 198, 255)',
            controlsMobile: 'rgb(68, 107, 140)',
            controlsMobileBg: 'rgb(33, 56, 75)'
        }
    }
};
},{}],46:[function(require,module,exports){
"use strict";
var views = {};
views['ads'] = Handlebars.template({
    'compiler': [
        6,
        '>= 2.0.0-beta.1'
    ],
    'main': function (depth0, helpers, partials, data) {
        var helper, alias1 = helpers.helperMissing, alias2 = 'function', alias3 = this.escapeExpression;
        return '<ins class="adsbygoogle" style="width:' + alias3((helper = (helper = helpers.width || (depth0 != null ? depth0.width : depth0)) != null ? helper : alias1, typeof helper === alias2 ? helper.call(depth0, {
            'name': 'width',
            'hash': {},
            'data': data
        }) : helper)) + 'px;height:' + alias3((helper = (helper = helpers.height || (depth0 != null ? depth0.height : depth0)) != null ? helper : alias1, typeof helper === alias2 ? helper.call(depth0, {
            'name': 'height',
            'hash': {},
            'data': data
        }) : helper)) + 'px" data-ad-client="' + alias3((helper = (helper = helpers.pubId || (depth0 != null ? depth0.pubId : depth0)) != null ? helper : alias1, typeof helper === alias2 ? helper.call(depth0, {
            'name': 'pubId',
            'hash': {},
            'data': data
        }) : helper)) + '" data-ad-slot="' + alias3((helper = (helper = helpers.slotId || (depth0 != null ? depth0.slotId : depth0)) != null ? helper : alias1, typeof helper === alias2 ? helper.call(depth0, {
            'name': 'slotId',
            'hash': {},
            'data': data
        }) : helper)) + '"></ins>';
    },
    'useData': true
});
views['colorizer'] = Handlebars.template({
    'compiler': [
        6,
        '>= 2.0.0-beta.1'
    ],
    'main': function (depth0, helpers, partials, data) {
        var stack1, helper, alias1 = helpers.helperMissing, alias2 = 'function', alias3 = this.escapeExpression, alias4 = this.lambda;
        return ' #yottie_' + alias3((helper = (helper = helpers.id || (depth0 != null ? depth0.id : depth0)) != null ? helper : alias1, typeof helper === alias2 ? helper.call(depth0, {
            'name': 'id',
            'hash': {},
            'data': data
        }) : helper)) + ' .yottie-widget-header { background: ' + alias3(alias4((stack1 = (stack1 = depth0 != null ? depth0.scheme : depth0) != null ? stack1.header : stack1) != null ? stack1.bg : stack1, depth0)) + '; } #yottie_' + alias3((helper = (helper = helpers.id || (depth0 != null ? depth0.id : depth0)) != null ? helper : alias1, typeof helper === alias2 ? helper.call(depth0, {
            'name': 'id',
            'hash': {},
            'data': data
        }) : helper)) + ' .yottie-widget-header-overlay { background: ' + alias3(alias4((stack1 = (stack1 = depth0 != null ? depth0.scheme : depth0) != null ? stack1.header : stack1) != null ? stack1.bannerOverlay : stack1, depth0)) + '; } #yottie_' + alias3((helper = (helper = helpers.id || (depth0 != null ? depth0.id : depth0)) != null ? helper : alias1, typeof helper === alias2 ? helper.call(depth0, {
            'name': 'id',
            'hash': {},
            'data': data
        }) : helper)) + ' .yottie-widget-header-channel-title, #yottie_' + alias3((helper = (helper = helpers.id || (depth0 != null ? depth0.id : depth0)) != null ? helper : alias1, typeof helper === alias2 ? helper.call(depth0, {
            'name': 'id',
            'hash': {},
            'data': data
        }) : helper)) + ' .yottie-widget-header-channel-title a { color: ' + alias3(alias4((stack1 = (stack1 = depth0 != null ? depth0.scheme : depth0) != null ? stack1.header : stack1) != null ? stack1.channelName : stack1, depth0)) + '; } #yottie_' + alias3((helper = (helper = helpers.id || (depth0 != null ? depth0.id : depth0)) != null ? helper : alias1, typeof helper === alias2 ? helper.call(depth0, {
            'name': 'id',
            'hash': {},
            'data': data
        }) : helper)) + ' .yottie-widget-header-channel-title:hover, #yottie_' + alias3((helper = (helper = helpers.id || (depth0 != null ? depth0.id : depth0)) != null ? helper : alias1, typeof helper === alias2 ? helper.call(depth0, {
            'name': 'id',
            'hash': {},
            'data': data
        }) : helper)) + ' .yottie-widget-header-channel-title a:hover { color: ' + alias3(alias4((stack1 = (stack1 = depth0 != null ? depth0.scheme : depth0) != null ? stack1.header : stack1) != null ? stack1.channelNameHover : stack1, depth0)) + '; } #yottie_' + alias3((helper = (helper = helpers.id || (depth0 != null ? depth0.id : depth0)) != null ? helper : alias1, typeof helper === alias2 ? helper.call(depth0, {
            'name': 'id',
            'hash': {},
            'data': data
        }) : helper)) + ' .yottie-widget-header-channel-caption { color: ' + alias3(alias4((stack1 = (stack1 = depth0 != null ? depth0.scheme : depth0) != null ? stack1.header : stack1) != null ? stack1.channelDescription : stack1, depth0)) + '; } #yottie_' + alias3((helper = (helper = helpers.id || (depth0 != null ? depth0.id : depth0)) != null ? helper : alias1, typeof helper === alias2 ? helper.call(depth0, {
            'name': 'id',
            'hash': {},
            'data': data
        }) : helper)) + ' .yottie-widget-header-channel-caption a { color: ' + alias3(alias4((stack1 = (stack1 = depth0 != null ? depth0.scheme : depth0) != null ? stack1.header : stack1) != null ? stack1.anchor : stack1, depth0)) + '; } #yottie_' + alias3((helper = (helper = helpers.id || (depth0 != null ? depth0.id : depth0)) != null ? helper : alias1, typeof helper === alias2 ? helper.call(depth0, {
            'name': 'id',
            'hash': {},
            'data': data
        }) : helper)) + ' .yottie-widget-header-channel-caption a:hover { color: ' + alias3(alias4((stack1 = (stack1 = depth0 != null ? depth0.scheme : depth0) != null ? stack1.header : stack1) != null ? stack1.anchorHover : stack1, depth0)) + '; } #yottie_' + alias3((helper = (helper = helpers.id || (depth0 != null ? depth0.id : depth0)) != null ? helper : alias1, typeof helper === alias2 ? helper.call(depth0, {
            'name': 'id',
            'hash': {},
            'data': data
        }) : helper)) + ' .yottie-widget-header-channel-properties-item { color: ' + alias3(alias4((stack1 = (stack1 = depth0 != null ? depth0.scheme : depth0) != null ? stack1.header : stack1) != null ? stack1.counters : stack1, depth0)) + '; }  #yottie_' + alias3((helper = (helper = helpers.id || (depth0 != null ? depth0.id : depth0)) != null ? helper : alias1, typeof helper === alias2 ? helper.call(depth0, {
            'name': 'id',
            'hash': {},
            'data': data
        }) : helper)) + ' .yottie-widget-nav { background: ' + alias3(alias4((stack1 = (stack1 = depth0 != null ? depth0.scheme : depth0) != null ? stack1.groups : stack1) != null ? stack1.bg : stack1, depth0)) + '; } #yottie_' + alias3((helper = (helper = helpers.id || (depth0 != null ? depth0.id : depth0)) != null ? helper : alias1, typeof helper === alias2 ? helper.call(depth0, {
            'name': 'id',
            'hash': {},
            'data': data
        }) : helper)) + ' .yottie-widget-nav-list-item a { color: ' + alias3(alias4((stack1 = (stack1 = depth0 != null ? depth0.scheme : depth0) != null ? stack1.groups : stack1) != null ? stack1.link : stack1, depth0)) + '; } #yottie_' + alias3((helper = (helper = helpers.id || (depth0 != null ? depth0.id : depth0)) != null ? helper : alias1, typeof helper === alias2 ? helper.call(depth0, {
            'name': 'id',
            'hash': {},
            'data': data
        }) : helper)) + ' .yottie-widget-nav-list-item:hover a { color: ' + alias3(alias4((stack1 = (stack1 = depth0 != null ? depth0.scheme : depth0) != null ? stack1.groups : stack1) != null ? stack1.linkHover : stack1, depth0)) + '; } #yottie_' + alias3((helper = (helper = helpers.id || (depth0 != null ? depth0.id : depth0)) != null ? helper : alias1, typeof helper === alias2 ? helper.call(depth0, {
            'name': 'id',
            'hash': {},
            'data': data
        }) : helper)) + ' .yottie-widget-nav-list-item.yottie-active a, #yottie_' + alias3((helper = (helper = helpers.id || (depth0 != null ? depth0.id : depth0)) != null ? helper : alias1, typeof helper === alias2 ? helper.call(depth0, {
            'name': 'id',
            'hash': {},
            'data': data
        }) : helper)) + ' .yottie-widget-nav-list-item.yottie-active:hover a { color: ' + alias3(alias4((stack1 = (stack1 = depth0 != null ? depth0.scheme : depth0) != null ? stack1.groups : stack1) != null ? stack1.linkActive : stack1, depth0)) + '; } #yottie_' + alias3((helper = (helper = helpers.id || (depth0 != null ? depth0.id : depth0)) != null ? helper : alias1, typeof helper === alias2 ? helper.call(depth0, {
            'name': 'id',
            'hash': {},
            'data': data
        }) : helper)) + ' .yottie-widget-nav-list-item:hover::after { background: ' + alias3(alias4((stack1 = (stack1 = depth0 != null ? depth0.scheme : depth0) != null ? stack1.groups : stack1) != null ? stack1.highlightHover : stack1, depth0)) + '; } #yottie_' + alias3((helper = (helper = helpers.id || (depth0 != null ? depth0.id : depth0)) != null ? helper : alias1, typeof helper === alias2 ? helper.call(depth0, {
            'name': 'id',
            'hash': {},
            'data': data
        }) : helper)) + ' .yottie-widget-nav-list-item.yottie-active:hover::after, #yottie_' + alias3((helper = (helper = helpers.id || (depth0 != null ? depth0.id : depth0)) != null ? helper : alias1, typeof helper === alias2 ? helper.call(depth0, {
            'name': 'id',
            'hash': {},
            'data': data
        }) : helper)) + ' .yottie-widget-nav-list-item.yottie-active::after { background: ' + alias3(alias4((stack1 = (stack1 = depth0 != null ? depth0.scheme : depth0) != null ? stack1.groups : stack1) != null ? stack1.highlightActive : stack1, depth0)) + '; } #yottie_' + alias3((helper = (helper = helpers.id || (depth0 != null ? depth0.id : depth0)) != null ? helper : alias1, typeof helper === alias2 ? helper.call(depth0, {
            'name': 'id',
            'hash': {},
            'data': data
        }) : helper)) + ' .yottie-widget-nav-control-left::before { background: linear-gradient(to left, rgba(255, 255, 255, 0), ' + alias3(alias4((stack1 = (stack1 = depth0 != null ? depth0.scheme : depth0) != null ? stack1.groups : stack1) != null ? stack1.bg : stack1, depth0)) + ' 60%); } #yottie_' + alias3((helper = (helper = helpers.id || (depth0 != null ? depth0.id : depth0)) != null ? helper : alias1, typeof helper === alias2 ? helper.call(depth0, {
            'name': 'id',
            'hash': {},
            'data': data
        }) : helper)) + ' .yottie-widget-nav-control-right::before { background: linear-gradient(to right, rgba(255, 255, 255, 0), ' + alias3(alias4((stack1 = (stack1 = depth0 != null ? depth0.scheme : depth0) != null ? stack1.groups : stack1) != null ? stack1.bg : stack1, depth0)) + ' 60%); } #yottie_' + alias3((helper = (helper = helpers.id || (depth0 != null ? depth0.id : depth0)) != null ? helper : alias1, typeof helper === alias2 ? helper.call(depth0, {
            'name': 'id',
            'hash': {},
            'data': data
        }) : helper)) + ' .yottie-widget-nav-control span::before, #yottie_' + alias3((helper = (helper = helpers.id || (depth0 != null ? depth0.id : depth0)) != null ? helper : alias1, typeof helper === alias2 ? helper.call(depth0, {
            'name': 'id',
            'hash': {},
            'data': data
        }) : helper)) + ' .yottie-widget-nav-control span::after { background: ' + alias3(alias4((stack1 = (stack1 = depth0 != null ? depth0.scheme : depth0) != null ? stack1.groups : stack1) != null ? stack1.link : stack1, depth0)) + '; } #yottie_' + alias3((helper = (helper = helpers.id || (depth0 != null ? depth0.id : depth0)) != null ? helper : alias1, typeof helper === alias2 ? helper.call(depth0, {
            'name': 'id',
            'hash': {},
            'data': data
        }) : helper)) + ' .yottie-widget-nav-control:hover span::before, #yottie_' + alias3((helper = (helper = helpers.id || (depth0 != null ? depth0.id : depth0)) != null ? helper : alias1, typeof helper === alias2 ? helper.call(depth0, {
            'name': 'id',
            'hash': {},
            'data': data
        }) : helper)) + ' .yottie-widget-nav-control:hover span::after { background: ' + alias3(alias4((stack1 = (stack1 = depth0 != null ? depth0.scheme : depth0) != null ? stack1.groups : stack1) != null ? stack1.linkActive : stack1, depth0)) + '; }  #yottie_' + alias3((helper = (helper = helpers.id || (depth0 != null ? depth0.id : depth0)) != null ? helper : alias1, typeof helper === alias2 ? helper.call(depth0, {
            'name': 'id',
            'hash': {},
            'data': data
        }) : helper)) + ' .yottie-widget-feed { background: ' + alias3(alias4((stack1 = (stack1 = depth0 != null ? depth0.scheme : depth0) != null ? stack1.content : stack1) != null ? stack1.bg : stack1, depth0)) + '; } #yottie_' + alias3((helper = (helper = helpers.id || (depth0 != null ? depth0.id : depth0)) != null ? helper : alias1, typeof helper === alias2 ? helper.call(depth0, {
            'name': 'id',
            'hash': {},
            'data': data
        }) : helper)) + ' .yottie-widget-feed-section-arrow { background: ' + alias3(alias4((stack1 = (stack1 = depth0 != null ? depth0.scheme : depth0) != null ? stack1.content : stack1) != null ? stack1.arrowsBg : stack1, depth0)) + '; } #yottie_' + alias3((helper = (helper = helpers.id || (depth0 != null ? depth0.id : depth0)) != null ? helper : alias1, typeof helper === alias2 ? helper.call(depth0, {
            'name': 'id',
            'hash': {},
            'data': data
        }) : helper)) + ' .yottie-widget-feed-section-arrow:hover { background: ' + alias3(alias4((stack1 = (stack1 = depth0 != null ? depth0.scheme : depth0) != null ? stack1.content : stack1) != null ? stack1.arrowsBgHover : stack1, depth0)) + '; } #yottie_' + alias3((helper = (helper = helpers.id || (depth0 != null ? depth0.id : depth0)) != null ? helper : alias1, typeof helper === alias2 ? helper.call(depth0, {
            'name': 'id',
            'hash': {},
            'data': data
        }) : helper)) + ' .yottie-widget-feed-section-arrow span::before, #yottie_' + alias3((helper = (helper = helpers.id || (depth0 != null ? depth0.id : depth0)) != null ? helper : alias1, typeof helper === alias2 ? helper.call(depth0, {
            'name': 'id',
            'hash': {},
            'data': data
        }) : helper)) + ' .yottie-widget-feed-section-arrow span::after, #yottie_' + alias3((helper = (helper = helpers.id || (depth0 != null ? depth0.id : depth0)) != null ? helper : alias1, typeof helper === alias2 ? helper.call(depth0, {
            'name': 'id',
            'hash': {},
            'data': data
        }) : helper)) + ' .yottie-widget-feed-section-arrow::before { background: ' + alias3(alias4((stack1 = (stack1 = depth0 != null ? depth0.scheme : depth0) != null ? stack1.content : stack1) != null ? stack1.arrows : stack1, depth0)) + '; } #yottie_' + alias3((helper = (helper = helpers.id || (depth0 != null ? depth0.id : depth0)) != null ? helper : alias1, typeof helper === alias2 ? helper.call(depth0, {
            'name': 'id',
            'hash': {},
            'data': data
        }) : helper)) + ' .yottie-widget-feed-section-arrow:hover span::before, #yottie_' + alias3((helper = (helper = helpers.id || (depth0 != null ? depth0.id : depth0)) != null ? helper : alias1, typeof helper === alias2 ? helper.call(depth0, {
            'name': 'id',
            'hash': {},
            'data': data
        }) : helper)) + ' .yottie-widget-feed-section-arrow:hover span::after, #yottie_' + alias3((helper = (helper = helpers.id || (depth0 != null ? depth0.id : depth0)) != null ? helper : alias1, typeof helper === alias2 ? helper.call(depth0, {
            'name': 'id',
            'hash': {},
            'data': data
        }) : helper)) + ' .yottie-widget-feed-section-arrow:hover::before { background: ' + alias3(alias4((stack1 = (stack1 = depth0 != null ? depth0.scheme : depth0) != null ? stack1.content : stack1) != null ? stack1.arrowsHover : stack1, depth0)) + '; } #yottie_' + alias3((helper = (helper = helpers.id || (depth0 != null ? depth0.id : depth0)) != null ? helper : alias1, typeof helper === alias2 ? helper.call(depth0, {
            'name': 'id',
            'hash': {},
            'data': data
        }) : helper)) + ' .yottie-widget-feed-section-scrollbar { background: ' + alias3(alias4((stack1 = (stack1 = depth0 != null ? depth0.scheme : depth0) != null ? stack1.content : stack1) != null ? stack1.scrollbarBg : stack1, depth0)) + '; } #yottie_' + alias3((helper = (helper = helpers.id || (depth0 != null ? depth0.id : depth0)) != null ? helper : alias1, typeof helper === alias2 ? helper.call(depth0, {
            'name': 'id',
            'hash': {},
            'data': data
        }) : helper)) + ' .yottie-widget-feed-section-scrollbar .swiper-scrollbar-drag { background: ' + alias3(alias4((stack1 = (stack1 = depth0 != null ? depth0.scheme : depth0) != null ? stack1.content : stack1) != null ? stack1.scrollbarSliderBg : stack1, depth0)) + '; }  #yottie_' + alias3((helper = (helper = helpers.id || (depth0 != null ? depth0.id : depth0)) != null ? helper : alias1, typeof helper === alias2 ? helper.call(depth0, {
            'name': 'id',
            'hash': {},
            'data': data
        }) : helper)) + ' .yottie-widget-video { background: ' + alias3(alias4((stack1 = (stack1 = depth0 != null ? depth0.scheme : depth0) != null ? stack1.video : stack1) != null ? stack1.bg : stack1, depth0)) + '; } #yottie_' + alias3((helper = (helper = helpers.id || (depth0 != null ? depth0.id : depth0)) != null ? helper : alias1, typeof helper === alias2 ? helper.call(depth0, {
            'name': 'id',
            'hash': {},
            'data': data
        }) : helper)) + ' .yottie-widget-feed-section-slide { background: ' + alias3(alias4((stack1 = (stack1 = depth0 != null ? depth0.scheme : depth0) != null ? stack1.video : stack1) != null ? stack1.bg : stack1, depth0)) + '; } #yottie_' + alias3((helper = (helper = helpers.id || (depth0 != null ? depth0.id : depth0)) != null ? helper : alias1, typeof helper === alias2 ? helper.call(depth0, {
            'name': 'id',
            'hash': {},
            'data': data
        }) : helper)) + ' .yottie-widget-video-overlay { background: ' + alias3(alias4((stack1 = (stack1 = depth0 != null ? depth0.scheme : depth0) != null ? stack1.video : stack1) != null ? stack1.overlay : stack1, depth0)) + '; } #yottie_' + alias3((helper = (helper = helpers.id || (depth0 != null ? depth0.id : depth0)) != null ? helper : alias1, typeof helper === alias2 ? helper.call(depth0, {
            'name': 'id',
            'hash': {},
            'data': data
        }) : helper)) + ' .yottie-widget-video-preview-play { border-left-color: ' + alias3(alias4((stack1 = (stack1 = depth0 != null ? depth0.scheme : depth0) != null ? stack1.video : stack1) != null ? stack1.playIcon : stack1, depth0)) + '; } #yottie_' + alias3((helper = (helper = helpers.id || (depth0 != null ? depth0.id : depth0)) != null ? helper : alias1, typeof helper === alias2 ? helper.call(depth0, {
            'name': 'id',
            'hash': {},
            'data': data
        }) : helper)) + ' .yottie-widget-video:hover .yottie-widget-video-preview-play { border-left-color: ' + alias3(alias4((stack1 = (stack1 = depth0 != null ? depth0.scheme : depth0) != null ? stack1.video : stack1) != null ? stack1.playIconHover : stack1, depth0)) + '; } #yottie_' + alias3((helper = (helper = helpers.id || (depth0 != null ? depth0.id : depth0)) != null ? helper : alias1, typeof helper === alias2 ? helper.call(depth0, {
            'name': 'id',
            'hash': {},
            'data': data
        }) : helper)) + ' .yottie-widget-video-preview-marker-duration { background: ' + alias3(alias4((stack1 = (stack1 = depth0 != null ? depth0.scheme : depth0) != null ? stack1.video : stack1) != null ? stack1.durationBg : stack1, depth0)) + '; color: ' + alias3(alias4((stack1 = (stack1 = depth0 != null ? depth0.scheme : depth0) != null ? stack1.video : stack1) != null ? stack1.duration : stack1, depth0)) + '; } #yottie_' + alias3((helper = (helper = helpers.id || (depth0 != null ? depth0.id : depth0)) != null ? helper : alias1, typeof helper === alias2 ? helper.call(depth0, {
            'name': 'id',
            'hash': {},
            'data': data
        }) : helper)) + ' .yottie-widget-video-info-title { color: ' + alias3(alias4((stack1 = (stack1 = depth0 != null ? depth0.scheme : depth0) != null ? stack1.video : stack1) != null ? stack1.title : stack1, depth0)) + '; } #yottie_' + alias3((helper = (helper = helpers.id || (depth0 != null ? depth0.id : depth0)) != null ? helper : alias1, typeof helper === alias2 ? helper.call(depth0, {
            'name': 'id',
            'hash': {},
            'data': data
        }) : helper)) + ' .yottie-widget-video-info-title:hover { color: ' + alias3(alias4((stack1 = (stack1 = depth0 != null ? depth0.scheme : depth0) != null ? stack1.video : stack1) != null ? stack1.titleHover : stack1, depth0)) + '; } #yottie_' + alias3((helper = (helper = helpers.id || (depth0 != null ? depth0.id : depth0)) != null ? helper : alias1, typeof helper === alias2 ? helper.call(depth0, {
            'name': 'id',
            'hash': {},
            'data': data
        }) : helper)) + ' .yottie-widget-video-info-passed-time { color: ' + alias3(alias4((stack1 = (stack1 = depth0 != null ? depth0.scheme : depth0) != null ? stack1.video : stack1) != null ? stack1.date : stack1, depth0)) + '; } #yottie_' + alias3((helper = (helper = helpers.id || (depth0 != null ? depth0.id : depth0)) != null ? helper : alias1, typeof helper === alias2 ? helper.call(depth0, {
            'name': 'id',
            'hash': {},
            'data': data
        }) : helper)) + ' .yottie-widget-video-info-caption { color: ' + alias3(alias4((stack1 = (stack1 = depth0 != null ? depth0.scheme : depth0) != null ? stack1.video : stack1) != null ? stack1.description : stack1, depth0)) + '; } #yottie_' + alias3((helper = (helper = helpers.id || (depth0 != null ? depth0.id : depth0)) != null ? helper : alias1, typeof helper === alias2 ? helper.call(depth0, {
            'name': 'id',
            'hash': {},
            'data': data
        }) : helper)) + ' .yottie-widget-video-info-properties-item { color: ' + alias3(alias4((stack1 = (stack1 = depth0 != null ? depth0.scheme : depth0) != null ? stack1.video : stack1) != null ? stack1.counters : stack1, depth0)) + '; } #yottie_' + alias3((helper = (helper = helpers.id || (depth0 != null ? depth0.id : depth0)) != null ? helper : alias1, typeof helper === alias2 ? helper.call(depth0, {
            'name': 'id',
            'hash': {},
            'data': data
        }) : helper)) + ' .yottie-widget-video-info-caption a { color: ' + alias3(alias4((stack1 = (stack1 = depth0 != null ? depth0.scheme : depth0) != null ? stack1.video : stack1) != null ? stack1.anchor : stack1, depth0)) + '; } #yottie_' + alias3((helper = (helper = helpers.id || (depth0 != null ? depth0.id : depth0)) != null ? helper : alias1, typeof helper === alias2 ? helper.call(depth0, {
            'name': 'id',
            'hash': {},
            'data': data
        }) : helper)) + ' .yottie-widget-video-info-caption a:hover { color: ' + alias3(alias4((stack1 = (stack1 = depth0 != null ? depth0.scheme : depth0) != null ? stack1.video : stack1) != null ? stack1.anchorHover : stack1, depth0)) + '; }  #yottie_popup_' + alias3((helper = (helper = helpers.id || (depth0 != null ? depth0.id : depth0)) != null ? helper : alias1, typeof helper === alias2 ? helper.call(depth0, {
            'name': 'id',
            'hash': {},
            'data': data
        }) : helper)) + ' .yottie-popup-inner { background: ' + alias3(alias4((stack1 = (stack1 = depth0 != null ? depth0.scheme : depth0) != null ? stack1.popup : stack1) != null ? stack1.bg : stack1, depth0)) + '; } #yottie_popup_' + alias3((helper = (helper = helpers.id || (depth0 != null ? depth0.id : depth0)) != null ? helper : alias1, typeof helper === alias2 ? helper.call(depth0, {
            'name': 'id',
            'hash': {},
            'data': data
        }) : helper)) + ' .yottie-popup-inner a { color: ' + alias3(alias4((stack1 = (stack1 = depth0 != null ? depth0.scheme : depth0) != null ? stack1.popup : stack1) != null ? stack1.anchor : stack1, depth0)) + '; } #yottie_popup_' + alias3((helper = (helper = helpers.id || (depth0 != null ? depth0.id : depth0)) != null ? helper : alias1, typeof helper === alias2 ? helper.call(depth0, {
            'name': 'id',
            'hash': {},
            'data': data
        }) : helper)) + ' .yottie-popup-inner a:hover { color: ' + alias3(alias4((stack1 = (stack1 = depth0 != null ? depth0.scheme : depth0) != null ? stack1.popup : stack1) != null ? stack1.anchorHover : stack1, depth0)) + '; } #yottie_popup_' + alias3((helper = (helper = helpers.id || (depth0 != null ? depth0.id : depth0)) != null ? helper : alias1, typeof helper === alias2 ? helper.call(depth0, {
            'name': 'id',
            'hash': {},
            'data': data
        }) : helper)) + ' .yottie-popup-overlay { background: ' + alias3(alias4((stack1 = (stack1 = depth0 != null ? depth0.scheme : depth0) != null ? stack1.popup : stack1) != null ? stack1.overlay : stack1, depth0)) + '; } #yottie_popup_' + alias3((helper = (helper = helpers.id || (depth0 != null ? depth0.id : depth0)) != null ? helper : alias1, typeof helper === alias2 ? helper.call(depth0, {
            'name': 'id',
            'hash': {},
            'data': data
        }) : helper)) + ' .yottie-popup-video-title { color: ' + alias3(alias4((stack1 = (stack1 = depth0 != null ? depth0.scheme : depth0) != null ? stack1.popup : stack1) != null ? stack1.title : stack1, depth0)) + '; } #yottie_popup_' + alias3((helper = (helper = helpers.id || (depth0 != null ? depth0.id : depth0)) != null ? helper : alias1, typeof helper === alias2 ? helper.call(depth0, {
            'name': 'id',
            'hash': {},
            'data': data
        }) : helper)) + ' .yottie-popup-inner .yottie-popup-video-meta-channel-name { color: ' + alias3(alias4((stack1 = (stack1 = depth0 != null ? depth0.scheme : depth0) != null ? stack1.popup : stack1) != null ? stack1.channelName : stack1, depth0)) + '; } #yottie_popup_' + alias3((helper = (helper = helpers.id || (depth0 != null ? depth0.id : depth0)) != null ? helper : alias1, typeof helper === alias2 ? helper.call(depth0, {
            'name': 'id',
            'hash': {},
            'data': data
        }) : helper)) + ' .yottie-popup-inner .yottie-popup-video-meta-channel-name:hover { color: ' + alias3(alias4((stack1 = (stack1 = depth0 != null ? depth0.scheme : depth0) != null ? stack1.popup : stack1) != null ? stack1.channelNameHover : stack1, depth0)) + '; } #yottie_popup_' + alias3((helper = (helper = helpers.id || (depth0 != null ? depth0.id : depth0)) != null ? helper : alias1, typeof helper === alias2 ? helper.call(depth0, {
            'name': 'id',
            'hash': {},
            'data': data
        }) : helper)) + ' .yottie-popup-video-views { color: ' + alias3(alias4((stack1 = (stack1 = depth0 != null ? depth0.scheme : depth0) != null ? stack1.popup : stack1) != null ? stack1.viewsCounter : stack1, depth0)) + '; } #yottie_popup_' + alias3((helper = (helper = helpers.id || (depth0 != null ? depth0.id : depth0)) != null ? helper : alias1, typeof helper === alias2 ? helper.call(depth0, {
            'name': 'id',
            'hash': {},
            'data': data
        }) : helper)) + ' .yottie-popup-video-rating-ratio { background: ' + alias3(alias4((stack1 = (stack1 = depth0 != null ? depth0.scheme : depth0) != null ? stack1.popup : stack1) != null ? stack1.dislikesRatio : stack1, depth0)) + '; } #yottie_popup_' + alias3((helper = (helper = helpers.id || (depth0 != null ? depth0.id : depth0)) != null ? helper : alias1, typeof helper === alias2 ? helper.call(depth0, {
            'name': 'id',
            'hash': {},
            'data': data
        }) : helper)) + ' .yottie-popup-video-rating-ratio span { background: ' + alias3(alias4((stack1 = (stack1 = depth0 != null ? depth0.scheme : depth0) != null ? stack1.popup : stack1) != null ? stack1.likesRatio : stack1, depth0)) + '; } #yottie_popup_' + alias3((helper = (helper = helpers.id || (depth0 != null ? depth0.id : depth0)) != null ? helper : alias1, typeof helper === alias2 ? helper.call(depth0, {
            'name': 'id',
            'hash': {},
            'data': data
        }) : helper)) + ' .yottie-popup-video-rating-likes span { color: ' + alias3(alias4((stack1 = (stack1 = depth0 != null ? depth0.scheme : depth0) != null ? stack1.popup : stack1) != null ? stack1.likesCounter : stack1, depth0)) + '; } #yottie_popup_' + alias3((helper = (helper = helpers.id || (depth0 != null ? depth0.id : depth0)) != null ? helper : alias1, typeof helper === alias2 ? helper.call(depth0, {
            'name': 'id',
            'hash': {},
            'data': data
        }) : helper)) + ' .yottie-popup-video-rating-dislikes span { color: ' + alias3(alias4((stack1 = (stack1 = depth0 != null ? depth0.scheme : depth0) != null ? stack1.popup : stack1) != null ? stack1.dislikesCounter : stack1, depth0)) + '; } #yottie_popup_' + alias3((helper = (helper = helpers.id || (depth0 != null ? depth0.id : depth0)) != null ? helper : alias1, typeof helper === alias2 ? helper.call(depth0, {
            'name': 'id',
            'hash': {},
            'data': data
        }) : helper)) + ' .yottie-popup-video-rating-likes svg { fill: ' + alias3(alias4((stack1 = (stack1 = depth0 != null ? depth0.scheme : depth0) != null ? stack1.popup : stack1) != null ? stack1.likesCounter : stack1, depth0)) + '; } #yottie_popup_' + alias3((helper = (helper = helpers.id || (depth0 != null ? depth0.id : depth0)) != null ? helper : alias1, typeof helper === alias2 ? helper.call(depth0, {
            'name': 'id',
            'hash': {},
            'data': data
        }) : helper)) + ' .yottie-popup-video-rating-dislikes svg { fill: ' + alias3(alias4((stack1 = (stack1 = depth0 != null ? depth0.scheme : depth0) != null ? stack1.popup : stack1) != null ? stack1.dislikesCounter : stack1, depth0)) + '; } #yottie_popup_' + alias3((helper = (helper = helpers.id || (depth0 != null ? depth0.id : depth0)) != null ? helper : alias1, typeof helper === alias2 ? helper.call(depth0, {
            'name': 'id',
            'hash': {},
            'data': data
        }) : helper)) + ' .yottie-popup-video-share svg { fill: ' + alias3(alias4((stack1 = (stack1 = depth0 != null ? depth0.scheme : depth0) != null ? stack1.popup : stack1) != null ? stack1.share : stack1, depth0)) + '; } #yottie_popup_' + alias3((helper = (helper = helpers.id || (depth0 != null ? depth0.id : depth0)) != null ? helper : alias1, typeof helper === alias2 ? helper.call(depth0, {
            'name': 'id',
            'hash': {},
            'data': data
        }) : helper)) + ' .yottie-popup-video-share span { color: ' + alias3(alias4((stack1 = (stack1 = depth0 != null ? depth0.scheme : depth0) != null ? stack1.popup : stack1) != null ? stack1.share : stack1, depth0)) + '; } #yottie_popup_' + alias3((helper = (helper = helpers.id || (depth0 != null ? depth0.id : depth0)) != null ? helper : alias1, typeof helper === alias2 ? helper.call(depth0, {
            'name': 'id',
            'hash': {},
            'data': data
        }) : helper)) + ' .yottie-popup-video-meta-date { color: ' + alias3(alias4((stack1 = (stack1 = depth0 != null ? depth0.scheme : depth0) != null ? stack1.popup : stack1) != null ? stack1.date : stack1, depth0)) + '; } #yottie_popup_' + alias3((helper = (helper = helpers.id || (depth0 != null ? depth0.id : depth0)) != null ? helper : alias1, typeof helper === alias2 ? helper.call(depth0, {
            'name': 'id',
            'hash': {},
            'data': data
        }) : helper)) + ' .yottie-popup-video-meta-description { color: ' + alias3(alias4((stack1 = (stack1 = depth0 != null ? depth0.scheme : depth0) != null ? stack1.popup : stack1) != null ? stack1.description : stack1, depth0)) + '; } #yottie_popup_' + alias3((helper = (helper = helpers.id || (depth0 != null ? depth0.id : depth0)) != null ? helper : alias1, typeof helper === alias2 ? helper.call(depth0, {
            'name': 'id',
            'hash': {},
            'data': data
        }) : helper)) + ' .yottie-popup-video-meta::after, #yottie_popup_' + alias3((helper = (helper = helpers.id || (depth0 != null ? depth0.id : depth0)) != null ? helper : alias1, typeof helper === alias2 ? helper.call(depth0, {
            'name': 'id',
            'hash': {},
            'data': data
        }) : helper)) + ' .yottie-popup-video-meta::before { background: ' + alias3(alias4((stack1 = (stack1 = depth0 != null ? depth0.scheme : depth0) != null ? stack1.popup : stack1) != null ? stack1.description : stack1, depth0)) + '; } #yottie_popup_' + alias3((helper = (helper = helpers.id || (depth0 != null ? depth0.id : depth0)) != null ? helper : alias1, typeof helper === alias2 ? helper.call(depth0, {
            'name': 'id',
            'hash': {},
            'data': data
        }) : helper)) + ' .yottie-popup-video-meta-description-more { color: ' + alias3(alias4((stack1 = (stack1 = depth0 != null ? depth0.scheme : depth0) != null ? stack1.popup : stack1) != null ? stack1.descriptionMoreButton : stack1, depth0)) + '; } #yottie_popup_' + alias3((helper = (helper = helpers.id || (depth0 != null ? depth0.id : depth0)) != null ? helper : alias1, typeof helper === alias2 ? helper.call(depth0, {
            'name': 'id',
            'hash': {},
            'data': data
        }) : helper)) + ' .yottie-popup-video-meta-description-more:hover { color: ' + alias3(alias4((stack1 = (stack1 = depth0 != null ? depth0.scheme : depth0) != null ? stack1.popup : stack1) != null ? stack1.descriptionMoreButtonHover : stack1, depth0)) + '; } #yottie_popup_' + alias3((helper = (helper = helpers.id || (depth0 != null ? depth0.id : depth0)) != null ? helper : alias1, typeof helper === alias2 ? helper.call(depth0, {
            'name': 'id',
            'hash': {},
            'data': data
        }) : helper)) + ' .yottie-popup-video-comments-item-name a { color: ' + alias3(alias4((stack1 = (stack1 = depth0 != null ? depth0.scheme : depth0) != null ? stack1.popup : stack1) != null ? stack1.commentsUsername : stack1, depth0)) + '; } #yottie_popup_' + alias3((helper = (helper = helpers.id || (depth0 != null ? depth0.id : depth0)) != null ? helper : alias1, typeof helper === alias2 ? helper.call(depth0, {
            'name': 'id',
            'hash': {},
            'data': data
        }) : helper)) + ' .yottie-popup-video-comments-item-name a:hover { color: ' + alias3(alias4((stack1 = (stack1 = depth0 != null ? depth0.scheme : depth0) != null ? stack1.popup : stack1) != null ? stack1.commentsUsernameHover : stack1, depth0)) + '; } #yottie_popup_' + alias3((helper = (helper = helpers.id || (depth0 != null ? depth0.id : depth0)) != null ? helper : alias1, typeof helper === alias2 ? helper.call(depth0, {
            'name': 'id',
            'hash': {},
            'data': data
        }) : helper)) + ' .yottie-popup-video-comments-item-passed-time { color: ' + alias3(alias4((stack1 = (stack1 = depth0 != null ? depth0.scheme : depth0) != null ? stack1.popup : stack1) != null ? stack1.commentsPassedTime : stack1, depth0)) + '; } #yottie_popup_' + alias3((helper = (helper = helpers.id || (depth0 != null ? depth0.id : depth0)) != null ? helper : alias1, typeof helper === alias2 ? helper.call(depth0, {
            'name': 'id',
            'hash': {},
            'data': data
        }) : helper)) + ' .yottie-popup-video-comments-item-text { color: ' + alias3(alias4((stack1 = (stack1 = depth0 != null ? depth0.scheme : depth0) != null ? stack1.popup : stack1) != null ? stack1.commentsText : stack1, depth0)) + '; } #yottie_popup_' + alias3((helper = (helper = helpers.id || (depth0 != null ? depth0.id : depth0)) != null ? helper : alias1, typeof helper === alias2 ? helper.call(depth0, {
            'name': 'id',
            'hash': {},
            'data': data
        }) : helper)) + ' .yottie-popup-video-comments-item-likes { color: ' + alias3(alias4((stack1 = (stack1 = depth0 != null ? depth0.scheme : depth0) != null ? stack1.popup : stack1) != null ? stack1.commentsLikes : stack1, depth0)) + '; } #yottie_popup_' + alias3((helper = (helper = helpers.id || (depth0 != null ? depth0.id : depth0)) != null ? helper : alias1, typeof helper === alias2 ? helper.call(depth0, {
            'name': 'id',
            'hash': {},
            'data': data
        }) : helper)) + ' .yottie-popup-video-comments-item-likes-icon { fill: ' + alias3(alias4((stack1 = (stack1 = depth0 != null ? depth0.scheme : depth0) != null ? stack1.popup : stack1) != null ? stack1.commentsLikes : stack1, depth0)) + '; } #yottie_popup_' + alias3((helper = (helper = helpers.id || (depth0 != null ? depth0.id : depth0)) != null ? helper : alias1, typeof helper === alias2 ? helper.call(depth0, {
            'name': 'id',
            'hash': {},
            'data': data
        }) : helper)) + ' .yottie-popup-control-close::before, #yottie_popup_' + alias3((helper = (helper = helpers.id || (depth0 != null ? depth0.id : depth0)) != null ? helper : alias1, typeof helper === alias2 ? helper.call(depth0, {
            'name': 'id',
            'hash': {},
            'data': data
        }) : helper)) + ' .yottie-popup-control-close::after { background: ' + alias3(alias4((stack1 = (stack1 = depth0 != null ? depth0.scheme : depth0) != null ? stack1.popup : stack1) != null ? stack1.controls : stack1, depth0)) + '; } #yottie_popup_' + alias3((helper = (helper = helpers.id || (depth0 != null ? depth0.id : depth0)) != null ? helper : alias1, typeof helper === alias2 ? helper.call(depth0, {
            'name': 'id',
            'hash': {},
            'data': data
        }) : helper)) + ' .yottie-popup-control-close:hover::before, #yottie_popup_' + alias3((helper = (helper = helpers.id || (depth0 != null ? depth0.id : depth0)) != null ? helper : alias1, typeof helper === alias2 ? helper.call(depth0, {
            'name': 'id',
            'hash': {},
            'data': data
        }) : helper)) + ' .yottie-popup-control-close:hover::after { background: ' + alias3(alias4((stack1 = (stack1 = depth0 != null ? depth0.scheme : depth0) != null ? stack1.popup : stack1) != null ? stack1.controlsHover : stack1, depth0)) + '; } @media only screen and (max-width: 768px) { #yottie_popup_' + alias3((helper = (helper = helpers.id || (depth0 != null ? depth0.id : depth0)) != null ? helper : alias1, typeof helper === alias2 ? helper.call(depth0, {
            'name': 'id',
            'hash': {},
            'data': data
        }) : helper)) + ' .yottie-popup-control-close { background: ' + alias3(alias4((stack1 = (stack1 = depth0 != null ? depth0.scheme : depth0) != null ? stack1.popup : stack1) != null ? stack1.controlsMobileBg : stack1, depth0)) + '; } #yottie_popup_' + alias3((helper = (helper = helpers.id || (depth0 != null ? depth0.id : depth0)) != null ? helper : alias1, typeof helper === alias2 ? helper.call(depth0, {
            'name': 'id',
            'hash': {},
            'data': data
        }) : helper)) + ' .yottie-popup-control-close::before, #yottie_popup_' + alias3((helper = (helper = helpers.id || (depth0 != null ? depth0.id : depth0)) != null ? helper : alias1, typeof helper === alias2 ? helper.call(depth0, {
            'name': 'id',
            'hash': {},
            'data': data
        }) : helper)) + ' .yottie-popup-control-close::after { background: ' + alias3(alias4((stack1 = (stack1 = depth0 != null ? depth0.scheme : depth0) != null ? stack1.popup : stack1) != null ? stack1.controlsMobile : stack1, depth0)) + '; } }';
    },
    'useData': true
});
views['error'] = views['error'] || {};
views['error']['container'] = Handlebars.template({
    'compiler': [
        6,
        '>= 2.0.0-beta.1'
    ],
    'main': function (depth0, helpers, partials, data) {
        return '<div class="yottie-error"><div class="yottie-error-overlay"></div><div class="yottie-error-content"><div class="yottie-error-content-title">Unfortunately, an error occurred:</div></div></div>';
    },
    'useData': true
});
views['error']['content'] = Handlebars.template({
    'compiler': [
        6,
        '>= 2.0.0-beta.1'
    ],
    'main': function (depth0, helpers, partials, data) {
        var helper;
        return '<div class="yottie-error-content-msg">' + this.escapeExpression((helper = (helper = helpers.message || (depth0 != null ? depth0.message : depth0)) != null ? helper : helpers.helperMissing, typeof helper === 'function' ? helper.call(depth0, {
            'name': 'message',
            'hash': {},
            'data': data
        }) : helper)) + '</div>';
    },
    'useData': true
});
views['feed'] = views['feed'] || {};
views['feed']['arrows'] = Handlebars.template({
    'compiler': [
        6,
        '>= 2.0.0-beta.1'
    ],
    'main': function (depth0, helpers, partials, data) {
        return '<div class="yottie-widget-feed-section-arrow yottie-widget-feed-section-arrow-prev"><span></span></div><div class="yottie-widget-feed-section-arrow yottie-widget-feed-section-arrow-next"><span></span></div>';
    },
    'useData': true
});
views['feed']['container'] = Handlebars.template({
    'compiler': [
        6,
        '>= 2.0.0-beta.1'
    ],
    'main': function (depth0, helpers, partials, data) {
        return '<div class="yottie-widget-feed"><div class="yottie-widget-feed-inner"></div><div class="yottie-widget-feed-ads" data-yt-ads-place="content"></div></div>';
    },
    'useData': true
});
views['feed']['filter'] = Handlebars.template({
    'compiler': [
        6,
        '>= 2.0.0-beta.1'
    ],
    'main': function (depth0, helpers, partials, data) {
        var helper;
        return '<div style="display: none"><svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="12" height="12" viewBox="0 0 12 12"><symbol viewBox="0 0 12 12" id="icon-search"><path id="u9qra" d="M1988.46 1576.54a3.07 3.07 0 0 1-3.09-3.08 3.07 3.07 0 0 1 3.09-3.09 3.07 3.07 0 0 1 3.08 3.09 3.07 3.07 0 0 1-3.08 3.08zm4.11 0h-.55l-.2-.2a4.3 4.3 0 0 0 1.1-2.88 4.45 4.45 0 1 0-8.92 0 4.45 4.45 0 0 0 4.46 4.45 4.3 4.3 0 0 0 2.88-1.1l.2.21v.55l3.43 3.43 1.03-1.03z"/><g><g transform="translate(-1984 -1569)"><use xlink:href="#u9qra"/></g></g></symbol></svg></div><div class="yottie-widget-feed-section-search"><form class="yottie-widget-feed-section-search-form"> <input class="yottie-widget-feed-section-search-form-input" placeholder="' + this.escapeExpression((helper = (helper = helpers.placeholder || (depth0 != null ? depth0.placeholder : depth0)) != null ? helper : helpers.helperMissing, typeof helper === 'function' ? helper.call(depth0, {
            'name': 'placeholder',
            'hash': {},
            'data': data
        }) : helper)) + '..."> <a class="yottie-widget-feed-section-search-form-button"><svg class="yottie-widget-feed-section-search-form-button-icon"><use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="#icon-search"></use></svg></a></form></div>';
    },
    'useData': true
});
views['feed']['loader'] = Handlebars.template({
    'compiler': [
        6,
        '>= 2.0.0-beta.1'
    ],
    'main': function (depth0, helpers, partials, data) {
        return '<div class="yottie-widget-feed-section-loader"><div class="yottie-spinner"></div></div>';
    },
    'useData': true
});
views['feed']['pagination'] = Handlebars.template({
    'compiler': [
        6,
        '>= 2.0.0-beta.1'
    ],
    'main': function (depth0, helpers, partials, data) {
        return '<div class="yottie-widget-feed-section-pagination swiper-pagination"></div>';
    },
    'useData': true
});
views['feed']['scrollbar'] = Handlebars.template({
    'compiler': [
        6,
        '>= 2.0.0-beta.1'
    ],
    'main': function (depth0, helpers, partials, data) {
        return '<div class="yottie-widget-feed-section-scrollbar swiper-scrollbar"></div>';
    },
    'useData': true
});
views['feed']['section'] = Handlebars.template({
    'compiler': [
        6,
        '>= 2.0.0-beta.1'
    ],
    'main': function (depth0, helpers, partials, data) {
        return '<div class="yottie-widget-feed-section"><div class="yottie-widget-feed-section-inner swiper-container"><div class="swiper-wrapper"></div></div></div>';
    },
    'useData': true
});
views['feed']['section'] = views['feed']['section'] || {};
views['feed']['section']['novideos'] = Handlebars.template({
    'compiler': [
        6,
        '>= 2.0.0-beta.1'
    ],
    'main': function (depth0, helpers, partials, data) {
        var helper;
        return '<div class="yottie-widget-feed-section-novideos">' + this.escapeExpression((helper = (helper = helpers.message || (depth0 != null ? depth0.message : depth0)) != null ? helper : helpers.helperMissing, typeof helper === 'function' ? helper.call(depth0, {
            'name': 'message',
            'hash': {},
            'data': data
        }) : helper)) + '</div>';
    },
    'useData': true
});
views['feed']['slide'] = Handlebars.template({
    'compiler': [
        6,
        '>= 2.0.0-beta.1'
    ],
    'main': function (depth0, helpers, partials, data) {
        return '<div class="yottie-widget-feed-section-slide swiper-slide"></div>';
    },
    'useData': true
});
views['groups'] = views['groups'] || {};
views['groups']['container'] = Handlebars.template({
    '1': function (depth0, helpers, partials, data) {
        return ' yottie-disabled';
    },
    'compiler': [
        6,
        '>= 2.0.0-beta.1'
    ],
    'main': function (depth0, helpers, partials, data) {
        var stack1, helper, alias1 = helpers.helperMissing, alias2 = 'function';
        return '<div class="yottie-widget-nav' + ((stack1 = helpers.unless.call(depth0, depth0 != null ? depth0.visible : depth0, {
            'name': 'unless',
            'hash': {},
            'fn': this.program(1, data, 0),
            'inverse': this.noop,
            'data': data
        })) != null ? stack1 : '') + '"><div class="yottie-widget-nav-inner"> ' + ((stack1 = (helper = (helper = helpers.list || (depth0 != null ? depth0.list : depth0)) != null ? helper : alias1, typeof helper === alias2 ? helper.call(depth0, {
            'name': 'list',
            'hash': {},
            'data': data
        }) : helper)) != null ? stack1 : '') + ' ' + ((stack1 = (helper = (helper = helpers.controls || (depth0 != null ? depth0.controls : depth0)) != null ? helper : alias1, typeof helper === alias2 ? helper.call(depth0, {
            'name': 'controls',
            'hash': {},
            'data': data
        }) : helper)) != null ? stack1 : '') + '</div></div>';
    },
    'useData': true
});
views['groups']['controls'] = Handlebars.template({
    'compiler': [
        6,
        '>= 2.0.0-beta.1'
    ],
    'main': function (depth0, helpers, partials, data) {
        return '<div class="yottie-widget-nav-control yottie-widget-nav-control-left yottie-widget-nav-control-disabled"><span></span></div><div class="yottie-widget-nav-control yottie-widget-nav-control-right yottie-widget-nav-control-disabled"><span></span></div>';
    },
    'useData': true
});
views['groups']['list'] = Handlebars.template({
    '1': function (depth0, helpers, partials, data) {
        var stack1, helper, alias1 = helpers.helperMissing, alias2 = 'function', alias3 = this.escapeExpression;
        return '<li class="yottie-widget-nav-list-item' + ((stack1 = helpers.unless.call(depth0, data && data.index, {
            'name': 'unless',
            'hash': {},
            'fn': this.program(2, data, 0),
            'inverse': this.noop,
            'data': data
        })) != null ? stack1 : '') + '"> <a href="javascript:void(0)" data-yt-id="' + alias3((helper = (helper = helpers.index || data && data.index) != null ? helper : alias1, typeof helper === alias2 ? helper.call(depth0, {
            'name': 'index',
            'hash': {},
            'data': data
        }) : helper)) + '">' + alias3((helper = (helper = helpers.title || (depth0 != null ? depth0.title : depth0)) != null ? helper : alias1, typeof helper === alias2 ? helper.call(depth0, {
            'name': 'title',
            'hash': {},
            'data': data
        }) : helper)) + '</a></li> ';
    },
    '2': function (depth0, helpers, partials, data) {
        return ' yottie-active';
    },
    'compiler': [
        6,
        '>= 2.0.0-beta.1'
    ],
    'main': function (depth0, helpers, partials, data) {
        var stack1;
        return '<ul class="yottie-widget-nav-list"> ' + ((stack1 = helpers.each.call(depth0, depth0 != null ? depth0.groups : depth0, {
            'name': 'each',
            'hash': {},
            'fn': this.program(1, data, 0),
            'inverse': this.noop,
            'data': data
        })) != null ? stack1 : '') + '</ul>';
    },
    'useData': true
});
views['header'] = views['header'] || {};
views['header']['banner'] = Handlebars.template({
    '1': function (depth0, helpers, partials, data) {
        var helper;
        return '<div class="yottie-widget-header-banner" style="background-image: url(\'' + this.escapeExpression((helper = (helper = helpers.url || (depth0 != null ? depth0.url : depth0)) != null ? helper : helpers.helperMissing, typeof helper === 'function' ? helper.call(depth0, {
            'name': 'url',
            'hash': {},
            'data': data
        }) : helper)) + '\');"></div> ';
    },
    'compiler': [
        6,
        '>= 2.0.0-beta.1'
    ],
    'main': function (depth0, helpers, partials, data) {
        var stack1;
        return (stack1 = helpers['if'].call(depth0, (stack1 = depth0 != null ? depth0.displaying : depth0) != null ? stack1.banner : stack1, {
            'name': 'if',
            'hash': {},
            'fn': this.program(1, data, 0),
            'inverse': this.noop,
            'data': data
        })) != null ? stack1 : '';
    },
    'useData': true
});
views['header']['channel'] = Handlebars.template({
    '1': function (depth0, helpers, partials, data) {
        var stack1;
        return '<div class="yottie-widget-header-channel"> ' + ((stack1 = helpers['if'].call(depth0, (stack1 = depth0 != null ? depth0.displaying : depth0) != null ? stack1.channelName : stack1, {
            'name': 'if',
            'hash': {},
            'fn': this.program(2, data, 0),
            'inverse': this.noop,
            'data': data
        })) != null ? stack1 : '') + ' ' + ((stack1 = helpers['if'].call(depth0, (stack1 = depth0 != null ? depth0.displaying : depth0) != null ? stack1.properties : stack1, {
            'name': 'if',
            'hash': {},
            'fn': this.program(7, data, 0),
            'inverse': this.noop,
            'data': data
        })) != null ? stack1 : '') + ' ' + ((stack1 = helpers['if'].call(depth0, (stack1 = depth0 != null ? depth0.displaying : depth0) != null ? stack1.channelDescription : stack1, {
            'name': 'if',
            'hash': {},
            'fn': this.program(14, data, 0),
            'inverse': this.noop,
            'data': data
        })) != null ? stack1 : '') + '</div> ';
    },
    '2': function (depth0, helpers, partials, data) {
        var stack1;
        return ' ' + ((stack1 = helpers['if'].call(depth0, depth0 != null ? depth0.id : depth0, {
            'name': 'if',
            'hash': {},
            'fn': this.program(3, data, 0),
            'inverse': this.noop,
            'data': data
        })) != null ? stack1 : '') + ' ' + ((stack1 = helpers.unless.call(depth0, depth0 != null ? depth0.id : depth0, {
            'name': 'unless',
            'hash': {},
            'fn': this.program(5, data, 0),
            'inverse': this.noop,
            'data': data
        })) != null ? stack1 : '') + ' ';
    },
    '3': function (depth0, helpers, partials, data) {
        var helper, alias1 = helpers.helperMissing, alias2 = 'function', alias3 = this.escapeExpression;
        return '<div class="yottie-widget-header-channel-title"> <a href="https://www.youtube.com/channel/' + alias3((helper = (helper = helpers.id || (depth0 != null ? depth0.id : depth0)) != null ? helper : alias1, typeof helper === alias2 ? helper.call(depth0, {
            'name': 'id',
            'hash': {},
            'data': data
        }) : helper)) + '/" title="' + alias3((helper = (helper = helpers.name || (depth0 != null ? depth0.name : depth0)) != null ? helper : alias1, typeof helper === alias2 ? helper.call(depth0, {
            'name': 'name',
            'hash': {},
            'data': data
        }) : helper)) + '" target="_blank">' + alias3((helper = (helper = helpers.name || (depth0 != null ? depth0.name : depth0)) != null ? helper : alias1, typeof helper === alias2 ? helper.call(depth0, {
            'name': 'name',
            'hash': {},
            'data': data
        }) : helper)) + '</a></div> ';
    },
    '5': function (depth0, helpers, partials, data) {
        var helper;
        return '<div class="yottie-widget-header-channel-title">' + this.escapeExpression((helper = (helper = helpers.name || (depth0 != null ? depth0.name : depth0)) != null ? helper : helpers.helperMissing, typeof helper === 'function' ? helper.call(depth0, {
            'name': 'name',
            'hash': {},
            'data': data
        }) : helper)) + '</div> ';
    },
    '7': function (depth0, helpers, partials, data) {
        var stack1;
        return '<div class="yottie-widget-header-channel-properties"> ' + ((stack1 = helpers['if'].call(depth0, (stack1 = depth0 != null ? depth0.displaying : depth0) != null ? stack1.subscribersCounter : stack1, {
            'name': 'if',
            'hash': {},
            'fn': this.program(8, data, 0),
            'inverse': this.noop,
            'data': data
        })) != null ? stack1 : '') + ' ' + ((stack1 = helpers['if'].call(depth0, (stack1 = depth0 != null ? depth0.displaying : depth0) != null ? stack1.videosCounter : stack1, {
            'name': 'if',
            'hash': {},
            'fn': this.program(10, data, 0),
            'inverse': this.noop,
            'data': data
        })) != null ? stack1 : '') + ' ' + ((stack1 = helpers['if'].call(depth0, (stack1 = depth0 != null ? depth0.displaying : depth0) != null ? stack1.viewsCounter : stack1, {
            'name': 'if',
            'hash': {},
            'fn': this.program(12, data, 0),
            'inverse': this.noop,
            'data': data
        })) != null ? stack1 : '') + '</div> ';
    },
    '8': function (depth0, helpers, partials, data) {
        var helper;
        return ' <span class="yottie-widget-header-channel-properties-item"><span class="yottie-widget-header-channel-properties-item-divider">\u2022</span> <span class="yottie-widget-header-channel-properties-item-text">' + this.escapeExpression((helper = (helper = helpers.subscriberCount || (depth0 != null ? depth0.subscriberCount : depth0)) != null ? helper : helpers.helperMissing, typeof helper === 'function' ? helper.call(depth0, {
            'name': 'subscriberCount',
            'hash': {},
            'data': data
        }) : helper)) + '</span></span> ';
    },
    '10': function (depth0, helpers, partials, data) {
        var helper;
        return ' <span class="yottie-widget-header-channel-properties-item"><span class="yottie-widget-header-channel-properties-item-divider">\u2022</span> <span class="yottie-widget-header-channel-properties-item-text">' + this.escapeExpression((helper = (helper = helpers.videoCount || (depth0 != null ? depth0.videoCount : depth0)) != null ? helper : helpers.helperMissing, typeof helper === 'function' ? helper.call(depth0, {
            'name': 'videoCount',
            'hash': {},
            'data': data
        }) : helper)) + '</span></span> ';
    },
    '12': function (depth0, helpers, partials, data) {
        var helper;
        return ' <span class="yottie-widget-header-channel-properties-item"><span class="yottie-widget-header-channel-properties-item-divider">\u2022</span> <span class="yottie-widget-header-channel-properties-item-text">' + this.escapeExpression((helper = (helper = helpers.viewCount || (depth0 != null ? depth0.viewCount : depth0)) != null ? helper : helpers.helperMissing, typeof helper === 'function' ? helper.call(depth0, {
            'name': 'viewCount',
            'hash': {},
            'data': data
        }) : helper)) + '</span></span> ';
    },
    '14': function (depth0, helpers, partials, data) {
        var stack1, helper;
        return '<div class="yottie-widget-header-channel-caption">' + ((stack1 = (helper = (helper = helpers.description || (depth0 != null ? depth0.description : depth0)) != null ? helper : helpers.helperMissing, typeof helper === 'function' ? helper.call(depth0, {
            'name': 'description',
            'hash': {},
            'data': data
        }) : helper)) != null ? stack1 : '') + '</div> ';
    },
    'compiler': [
        6,
        '>= 2.0.0-beta.1'
    ],
    'main': function (depth0, helpers, partials, data) {
        var stack1;
        return (stack1 = helpers['if'].call(depth0, (stack1 = depth0 != null ? depth0.displaying : depth0) != null ? stack1.channel : stack1, {
            'name': 'if',
            'hash': {},
            'fn': this.program(1, data, 0),
            'inverse': this.noop,
            'data': data
        })) != null ? stack1 : '';
    },
    'useData': true
});
views['header']['container'] = Handlebars.template({
    '1': function (depth0, helpers, partials, data) {
        return ' yottie-visible';
    },
    '3': function (depth0, helpers, partials, data) {
        return ' yottie-widget-header-brandingless';
    },
    'compiler': [
        6,
        '>= 2.0.0-beta.1'
    ],
    'main': function (depth0, helpers, partials, data) {
        var stack1, helper, alias1 = this.lambda;
        return '<div class="yottie-widget-header yottie-widget-header-' + this.escapeExpression((helper = (helper = helpers.layout || (depth0 != null ? depth0.layout : depth0)) != null ? helper : helpers.helperMissing, typeof helper === 'function' ? helper.call(depth0, {
            'name': 'layout',
            'hash': {},
            'data': data
        }) : helper)) + ((stack1 = helpers['if'].call(depth0, depth0 != null ? depth0.visible : depth0, {
            'name': 'if',
            'hash': {},
            'fn': this.program(1, data, 0),
            'inverse': this.noop,
            'data': data
        })) != null ? stack1 : '') + ((stack1 = helpers.unless.call(depth0, (stack1 = depth0 != null ? depth0.displaying : depth0) != null ? stack1.branding : stack1, {
            'name': 'unless',
            'hash': {},
            'fn': this.program(3, data, 0),
            'inverse': this.noop,
            'data': data
        })) != null ? stack1 : '') + '"> ' + ((stack1 = alias1((stack1 = depth0 != null ? depth0.parts : depth0) != null ? stack1.overlay : stack1, depth0)) != null ? stack1 : '') + ' ' + ((stack1 = alias1((stack1 = depth0 != null ? depth0.parts : depth0) != null ? stack1.banner : stack1, depth0)) != null ? stack1 : '') + ' ' + ((stack1 = alias1((stack1 = depth0 != null ? depth0.parts : depth0) != null ? stack1.inner : stack1, depth0)) != null ? stack1 : '') + '</div>';
    },
    'useData': true
});
views['header']['inner'] = Handlebars.template({
    'compiler': [
        6,
        '>= 2.0.0-beta.1'
    ],
    'main': function (depth0, helpers, partials, data) {
        var stack1, alias1 = this.lambda;
        return '<div class="yottie-widget-header-inner"> ' + ((stack1 = alias1((stack1 = depth0 != null ? depth0.parts : depth0) != null ? stack1.logo : stack1, depth0)) != null ? stack1 : '') + '<div class="yottie-widget-header-info"> ' + ((stack1 = alias1((stack1 = depth0 != null ? depth0.parts : depth0) != null ? stack1.channel : stack1, depth0)) != null ? stack1 : '') + '</div> ' + ((stack1 = alias1((stack1 = depth0 != null ? depth0.parts : depth0) != null ? stack1.subscribe : stack1, depth0)) != null ? stack1 : '') + '</div>';
    },
    'useData': true
});
views['header']['logo'] = Handlebars.template({
    '1': function (depth0, helpers, partials, data) {
        var stack1;
        return ' ' + ((stack1 = helpers['if'].call(depth0, depth0 != null ? depth0.id : depth0, {
            'name': 'if',
            'hash': {},
            'fn': this.program(2, data, 0),
            'inverse': this.noop,
            'data': data
        })) != null ? stack1 : '') + ' ' + ((stack1 = helpers.unless.call(depth0, depth0 != null ? depth0.id : depth0, {
            'name': 'unless',
            'hash': {},
            'fn': this.program(4, data, 0),
            'inverse': this.noop,
            'data': data
        })) != null ? stack1 : '') + ' ';
    },
    '2': function (depth0, helpers, partials, data) {
        var helper, alias1 = helpers.helperMissing, alias2 = 'function', alias3 = this.escapeExpression;
        return ' <a class="yottie-widget-header-logo" href="https://www.youtube.com/channel/' + alias3((helper = (helper = helpers.id || (depth0 != null ? depth0.id : depth0)) != null ? helper : alias1, typeof helper === alias2 ? helper.call(depth0, {
            'name': 'id',
            'hash': {},
            'data': data
        }) : helper)) + '/" title="' + alias3((helper = (helper = helpers.title || (depth0 != null ? depth0.title : depth0)) != null ? helper : alias1, typeof helper === alias2 ? helper.call(depth0, {
            'name': 'title',
            'hash': {},
            'data': data
        }) : helper)) + '" target="_blank" rel="nofollow"><img src="' + alias3((helper = (helper = helpers.url || (depth0 != null ? depth0.url : depth0)) != null ? helper : alias1, typeof helper === alias2 ? helper.call(depth0, {
            'name': 'url',
            'hash': {},
            'data': data
        }) : helper)) + '" alt="' + alias3((helper = (helper = helpers.title || (depth0 != null ? depth0.title : depth0)) != null ? helper : alias1, typeof helper === alias2 ? helper.call(depth0, {
            'name': 'title',
            'hash': {},
            'data': data
        }) : helper)) + '"/></a> ';
    },
    '4': function (depth0, helpers, partials, data) {
        var helper, alias1 = helpers.helperMissing, alias2 = 'function', alias3 = this.escapeExpression;
        return '<div class="yottie-widget-header-logo"> <img src="' + alias3((helper = (helper = helpers.url || (depth0 != null ? depth0.url : depth0)) != null ? helper : alias1, typeof helper === alias2 ? helper.call(depth0, {
            'name': 'url',
            'hash': {},
            'data': data
        }) : helper)) + '" alt="' + alias3((helper = (helper = helpers.title || (depth0 != null ? depth0.title : depth0)) != null ? helper : alias1, typeof helper === alias2 ? helper.call(depth0, {
            'name': 'title',
            'hash': {},
            'data': data
        }) : helper)) + '"/></div> ';
    },
    'compiler': [
        6,
        '>= 2.0.0-beta.1'
    ],
    'main': function (depth0, helpers, partials, data) {
        var stack1;
        return (stack1 = helpers['if'].call(depth0, (stack1 = depth0 != null ? depth0.displaying : depth0) != null ? stack1.logo : stack1, {
            'name': 'if',
            'hash': {},
            'fn': this.program(1, data, 0),
            'inverse': this.noop,
            'data': data
        })) != null ? stack1 : '';
    },
    'useData': true
});
views['header']['overlay'] = Handlebars.template({
    '1': function (depth0, helpers, partials, data) {
        return '<div class="yottie-widget-header-overlay"></div> ';
    },
    'compiler': [
        6,
        '>= 2.0.0-beta.1'
    ],
    'main': function (depth0, helpers, partials, data) {
        var stack1;
        return (stack1 = helpers['if'].call(depth0, (stack1 = depth0 != null ? depth0.displaying : depth0) != null ? stack1.banner : stack1, {
            'name': 'if',
            'hash': {},
            'fn': this.program(1, data, 0),
            'inverse': this.noop,
            'data': data
        })) != null ? stack1 : '';
    },
    'useData': true
});
views['header']['subscribe'] = Handlebars.template({
    '1': function (depth0, helpers, partials, data) {
        return '<div class="yottie-widget-header-subscribe"><div class="yottie-widget-header-subscribe-button"></div></div> ';
    },
    'compiler': [
        6,
        '>= 2.0.0-beta.1'
    ],
    'main': function (depth0, helpers, partials, data) {
        var stack1;
        return (stack1 = helpers['if'].call(depth0, (stack1 = depth0 != null ? depth0.displaying : depth0) != null ? stack1.subscribeButton : stack1, {
            'name': 'if',
            'hash': {},
            'fn': this.program(1, data, 0),
            'inverse': this.noop,
            'data': data
        })) != null ? stack1 : '';
    },
    'useData': true
});
views['popup'] = views['popup'] || {};
views['popup']['container'] = Handlebars.template({
    'compiler': [
        6,
        '>= 2.0.0-beta.1'
    ],
    'main': function (depth0, helpers, partials, data) {
        var stack1, alias1 = this.lambda;
        return '<div class="eapps-root yottie-popup yottie"> ' + ((stack1 = alias1((stack1 = depth0 != null ? depth0.parts : depth0) != null ? stack1.overlay : stack1, depth0)) != null ? stack1 : '') + ' ' + ((stack1 = alias1((stack1 = depth0 != null ? depth0.parts : depth0) != null ? stack1.wrapper : stack1, depth0)) != null ? stack1 : '') + '</div>';
    },
    'useData': true
});
views['popup']['control'] = views['popup']['control'] || {};
views['popup']['control']['arrows'] = Handlebars.template({
    'compiler': [
        6,
        '>= 2.0.0-beta.1'
    ],
    'main': function (depth0, helpers, partials, data) {
        return '<div class="yottie-popup-control-arrow-previous yottie-popup-control-arrow"><span></span></div><div class="yottie-popup-control-arrow-next yottie-popup-control-arrow"><span></span></div>';
    },
    'useData': true
});
views['popup']['control']['close'] = Handlebars.template({
    'compiler': [
        6,
        '>= 2.0.0-beta.1'
    ],
    'main': function (depth0, helpers, partials, data) {
        return '<div class="yottie-popup-control-close"></div>';
    },
    'useData': true
});
views['popup']['inner'] = Handlebars.template({
    'compiler': [
        6,
        '>= 2.0.0-beta.1'
    ],
    'main': function (depth0, helpers, partials, data) {
        var stack1, alias1 = this.lambda;
        return '<div class="yottie-popup-inner"> ' + ((stack1 = alias1((stack1 = depth0 != null ? depth0.parts : depth0) != null ? stack1.loader : stack1, depth0)) != null ? stack1 : '') + ' ' + ((stack1 = alias1((stack1 = depth0 != null ? depth0.parts : depth0) != null ? stack1.controlClose : stack1, depth0)) != null ? stack1 : '') + '  ' + ((stack1 = alias1((stack1 = depth0 != null ? depth0.parts : depth0) != null ? stack1.video : stack1, depth0)) != null ? stack1 : '') + '</div>';
    },
    'useData': true
});
views['popup']['loader'] = Handlebars.template({
    'compiler': [
        6,
        '>= 2.0.0-beta.1'
    ],
    'main': function (depth0, helpers, partials, data) {
        return '<div class="yottie-popup-loader"><div class="yottie-spinner"></div></div>';
    },
    'useData': true
});
views['popup']['overlay'] = Handlebars.template({
    'compiler': [
        6,
        '>= 2.0.0-beta.1'
    ],
    'main': function (depth0, helpers, partials, data) {
        return '<div class="yottie-popup-overlay"></div>';
    },
    'useData': true
});
views['popup']['video'] = views['popup']['video'] || {};
views['popup']['video']['container'] = Handlebars.template({
    '1': function (depth0, helpers, partials, data) {
        var stack1;
        return ' ' + ((stack1 = this.lambda((stack1 = depth0 != null ? depth0.parts : depth0) != null ? stack1.videoContent : stack1, depth0)) != null ? stack1 : '') + ' ';
    },
    'compiler': [
        6,
        '>= 2.0.0-beta.1'
    ],
    'main': function (depth0, helpers, partials, data) {
        var stack1;
        return '<div class="yottie-popup-video"> ' + ((stack1 = this.lambda((stack1 = depth0 != null ? depth0.parts : depth0) != null ? stack1.videoPlayer : stack1, depth0)) != null ? stack1 : '') + ' ' + ((stack1 = helpers['if'].call(depth0, (stack1 = depth0 != null ? depth0.displaying : depth0) != null ? stack1.content : stack1, {
            'name': 'if',
            'hash': {},
            'fn': this.program(1, data, 0),
            'inverse': this.noop,
            'data': data
        })) != null ? stack1 : '') + '</div>';
    },
    'useData': true
});
views['popup']['video']['content'] = Handlebars.template({
    '1': function (depth0, helpers, partials, data) {
        var stack1, helper, alias1 = this.escapeExpression;
        return '<div class="yottie-popup-video-views" title="' + alias1(this.lambda((stack1 = depth0 != null ? depth0.titles : depth0) != null ? stack1.views : stack1, depth0)) + '">' + alias1((helper = (helper = helpers.viewsCount || (depth0 != null ? depth0.viewsCount : depth0)) != null ? helper : helpers.helperMissing, typeof helper === 'function' ? helper.call(depth0, {
            'name': 'viewsCount',
            'hash': {},
            'data': data
        }) : helper)) + '</div> ';
    },
    '3': function (depth0, helpers, partials, data) {
        var stack1;
        return '<div class="yottie-popup-video-rating"> ' + ((stack1 = helpers['if'].call(depth0, (stack1 = depth0 != null ? depth0.displaying : depth0) != null ? stack1.likesCounter : stack1, {
            'name': 'if',
            'hash': {},
            'fn': this.program(4, data, 0),
            'inverse': this.noop,
            'data': data
        })) != null ? stack1 : '') + ' ' + ((stack1 = helpers['if'].call(depth0, (stack1 = depth0 != null ? depth0.displaying : depth0) != null ? stack1.dislikesCounter : stack1, {
            'name': 'if',
            'hash': {},
            'fn': this.program(6, data, 0),
            'inverse': this.noop,
            'data': data
        })) != null ? stack1 : '') + ' ' + ((stack1 = helpers['if'].call(depth0, (stack1 = depth0 != null ? depth0.displaying : depth0) != null ? stack1.likesRatio : stack1, {
            'name': 'if',
            'hash': {},
            'fn': this.program(8, data, 0),
            'inverse': this.noop,
            'data': data
        })) != null ? stack1 : '') + '</div> ';
    },
    '4': function (depth0, helpers, partials, data) {
        var stack1, helper, alias1 = this.escapeExpression;
        return '<div class="yottie-popup-video-rating-likes" title="' + alias1(this.lambda((stack1 = depth0 != null ? depth0.titles : depth0) != null ? stack1.likes : stack1, depth0)) + '"><svg class="yottie-popup-video-rating-likes-icon"><use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="#icon-likes"></use></svg><span>' + alias1((helper = (helper = helpers.likesCount || (depth0 != null ? depth0.likesCount : depth0)) != null ? helper : helpers.helperMissing, typeof helper === 'function' ? helper.call(depth0, {
            'name': 'likesCount',
            'hash': {},
            'data': data
        }) : helper)) + '</span></div> ';
    },
    '6': function (depth0, helpers, partials, data) {
        var stack1, helper, alias1 = this.escapeExpression;
        return '<div class="yottie-popup-video-rating-dislikes" title="' + alias1(this.lambda((stack1 = depth0 != null ? depth0.titles : depth0) != null ? stack1.dislikes : stack1, depth0)) + '"><svg class="yottie-popup-video-rating-dislikes-icon"><use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="#icon-dislikes"></use></svg><span>' + alias1((helper = (helper = helpers.dislikesCount || (depth0 != null ? depth0.dislikesCount : depth0)) != null ? helper : helpers.helperMissing, typeof helper === 'function' ? helper.call(depth0, {
            'name': 'dislikesCount',
            'hash': {},
            'data': data
        }) : helper)) + '</span></div> ';
    },
    '8': function (depth0, helpers, partials, data) {
        var helper;
        return '<div class="yottie-popup-video-rating-ratio"><span style="width: ' + this.escapeExpression((helper = (helper = helpers.likesRatio || (depth0 != null ? depth0.likesRatio : depth0)) != null ? helper : helpers.helperMissing, typeof helper === 'function' ? helper.call(depth0, {
            'name': 'likesRatio',
            'hash': {},
            'data': data
        }) : helper)) + '%"></span></div> ';
    },
    '10': function (depth0, helpers, partials, data) {
        var stack1;
        return '<div class="yottie-popup-video-share"><svg class="yottie-popup-video-share-icon"><use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="#icon-share"></use></svg><span>' + this.escapeExpression(this.lambda((stack1 = depth0 != null ? depth0.titles : depth0) != null ? stack1.share : stack1, depth0)) + '</span><div class="yottie-popup-video-share-popover yottie-popup-video-share-popover-left"><div class="yottie-popup-video-share-popover-content"><div class="yottie-popup-video-share-popover-content-inner"> ' + ((stack1 = helpers.each.call(depth0, depth0 != null ? depth0.shareButtons : depth0, {
            'name': 'each',
            'hash': {},
            'fn': this.program(11, data, 0),
            'inverse': this.noop,
            'data': data
        })) != null ? stack1 : '') + '</div></div></div></div> ';
    },
    '11': function (depth0, helpers, partials, data) {
        var helper, alias1 = helpers.helperMissing, alias2 = 'function', alias3 = this.escapeExpression;
        return '<div class="yottie-popup-video-share-popover-content-item" data-type="' + alias3((helper = (helper = helpers.key || data && data.key) != null ? helper : alias1, typeof helper === alias2 ? helper.call(depth0, {
            'name': 'key',
            'hash': {},
            'data': data
        }) : helper)) + '"><div class="yottie-popup-video-share-popover-content-item-icon"> <img src="' + alias3((helper = (helper = helpers.icon || (depth0 != null ? depth0.icon : depth0)) != null ? helper : alias1, typeof helper === alias2 ? helper.call(depth0, {
            'name': 'icon',
            'hash': {},
            'data': data
        }) : helper)) + '"></div><div class="yottie-popup-video-share-popover-content-item-title"> ' + alias3((helper = (helper = helpers.title || (depth0 != null ? depth0.title : depth0)) != null ? helper : alias1, typeof helper === alias2 ? helper.call(depth0, {
            'name': 'title',
            'hash': {},
            'data': data
        }) : helper)) + '</div></div> ';
    },
    '13': function (depth0, helpers, partials, data) {
        var stack1;
        return '<div class="yottie-popup-video-meta"> ' + ((stack1 = helpers['if'].call(depth0, (stack1 = depth0 != null ? depth0.displaying : depth0) != null ? stack1.channelLogo : stack1, {
            'name': 'if',
            'hash': {},
            'fn': this.program(14, data, 0),
            'inverse': this.noop,
            'data': data
        })) != null ? stack1 : '') + '<div class="yottie-popup-video-meta-text"> ' + ((stack1 = helpers['if'].call(depth0, (stack1 = depth0 != null ? depth0.displaying : depth0) != null ? stack1.channelName : stack1, {
            'name': 'if',
            'hash': {},
            'fn': this.program(16, data, 0),
            'inverse': this.noop,
            'data': data
        })) != null ? stack1 : '') + ' ' + ((stack1 = helpers['if'].call(depth0, (stack1 = depth0 != null ? depth0.displaying : depth0) != null ? stack1.date : stack1, {
            'name': 'if',
            'hash': {},
            'fn': this.program(18, data, 0),
            'inverse': this.noop,
            'data': data
        })) != null ? stack1 : '') + ' ' + ((stack1 = helpers['if'].call(depth0, (stack1 = depth0 != null ? depth0.displaying : depth0) != null ? stack1.description : stack1, {
            'name': 'if',
            'hash': {},
            'fn': this.program(20, data, 0),
            'inverse': this.noop,
            'data': data
        })) != null ? stack1 : '') + ' ' + ((stack1 = helpers['if'].call(depth0, (stack1 = depth0 != null ? depth0.displaying : depth0) != null ? stack1.descriptionMoreButton : stack1, {
            'name': 'if',
            'hash': {},
            'fn': this.program(23, data, 0),
            'inverse': this.noop,
            'data': data
        })) != null ? stack1 : '') + '</div> ' + ((stack1 = helpers['if'].call(depth0, (stack1 = depth0 != null ? depth0.displaying : depth0) != null ? stack1.subscribeButton : stack1, {
            'name': 'if',
            'hash': {},
            'fn': this.program(25, data, 0),
            'inverse': this.noop,
            'data': data
        })) != null ? stack1 : '') + '</div> ';
    },
    '14': function (depth0, helpers, partials, data) {
        var helper, alias1 = helpers.helperMissing, alias2 = 'function', alias3 = this.escapeExpression;
        return '<div class="yottie-popup-video-meta-channel-logo"> <a href="' + alias3((helper = (helper = helpers.link || (depth0 != null ? depth0.link : depth0)) != null ? helper : alias1, typeof helper === alias2 ? helper.call(depth0, {
            'name': 'link',
            'hash': {},
            'data': data
        }) : helper)) + '" target="_blank" rel="nofollow" title="' + alias3((helper = (helper = helpers.name || (depth0 != null ? depth0.name : depth0)) != null ? helper : alias1, typeof helper === alias2 ? helper.call(depth0, {
            'name': 'name',
            'hash': {},
            'data': data
        }) : helper)) + '"><img src="' + alias3((helper = (helper = helpers.logo || (depth0 != null ? depth0.logo : depth0)) != null ? helper : alias1, typeof helper === alias2 ? helper.call(depth0, {
            'name': 'logo',
            'hash': {},
            'data': data
        }) : helper)) + '" alt="' + alias3((helper = (helper = helpers.name || (depth0 != null ? depth0.name : depth0)) != null ? helper : alias1, typeof helper === alias2 ? helper.call(depth0, {
            'name': 'name',
            'hash': {},
            'data': data
        }) : helper)) + '"></a></div> ';
    },
    '16': function (depth0, helpers, partials, data) {
        var helper, alias1 = helpers.helperMissing, alias2 = 'function', alias3 = this.escapeExpression;
        return ' <a href="' + alias3((helper = (helper = helpers.link || (depth0 != null ? depth0.link : depth0)) != null ? helper : alias1, typeof helper === alias2 ? helper.call(depth0, {
            'name': 'link',
            'hash': {},
            'data': data
        }) : helper)) + '" class="yottie-popup-video-meta-channel-name" target="_blank" rel="nofollow">' + alias3((helper = (helper = helpers.name || (depth0 != null ? depth0.name : depth0)) != null ? helper : alias1, typeof helper === alias2 ? helper.call(depth0, {
            'name': 'name',
            'hash': {},
            'data': data
        }) : helper)) + '</a> ';
    },
    '18': function (depth0, helpers, partials, data) {
        var helper;
        return '<div class="yottie-popup-video-meta-date">' + this.escapeExpression((helper = (helper = helpers.date || (depth0 != null ? depth0.date : depth0)) != null ? helper : helpers.helperMissing, typeof helper === 'function' ? helper.call(depth0, {
            'name': 'date',
            'hash': {},
            'data': data
        }) : helper)) + '</div> ';
    },
    '20': function (depth0, helpers, partials, data) {
        var stack1, helper;
        return '<div class="yottie-popup-video-meta-description' + ((stack1 = helpers.unless.call(depth0, (stack1 = depth0 != null ? depth0.displaying : depth0) != null ? stack1.descriptionMoreButton : stack1, {
            'name': 'unless',
            'hash': {},
            'fn': this.program(21, data, 0),
            'inverse': this.noop,
            'data': data
        })) != null ? stack1 : '') + '"> ' + ((stack1 = (helper = (helper = helpers.text || (depth0 != null ? depth0.text : depth0)) != null ? helper : helpers.helperMissing, typeof helper === 'function' ? helper.call(depth0, {
            'name': 'text',
            'hash': {},
            'data': data
        }) : helper)) != null ? stack1 : '') + '</div> ';
    },
    '21': function (depth0, helpers, partials, data) {
        return ' yottie-popup-video-meta-description-show-full';
    },
    '23': function (depth0, helpers, partials, data) {
        var helper;
        return '<div class="yottie-popup-video-meta-description-more"><span>' + this.escapeExpression((helper = (helper = helpers.showMoreLabel || (depth0 != null ? depth0.showMoreLabel : depth0)) != null ? helper : helpers.helperMissing, typeof helper === 'function' ? helper.call(depth0, {
            'name': 'showMoreLabel',
            'hash': {},
            'data': data
        }) : helper)) + '</span></div> ';
    },
    '25': function (depth0, helpers, partials, data) {
        return '<div class="yottie-popup-video-meta-subscribe-container"><div class="yottie-popup-video-meta-subscribe"></div></div> ';
    },
    '27': function (depth0, helpers, partials, data) {
        var stack1;
        return '<div class="yottie-popup-video-comments"> ' + ((stack1 = helpers.each.call(depth0, depth0 != null ? depth0.comments : depth0, {
            'name': 'each',
            'hash': {},
            'fn': this.program(28, data, 0),
            'inverse': this.noop,
            'data': data
        })) != null ? stack1 : '') + '</div> ';
    },
    '28': function (depth0, helpers, partials, data) {
        var stack1, helper, alias1 = helpers.helperMissing, alias2 = 'function', alias3 = this.escapeExpression;
        return '<div class="yottie-popup-video-comments-item"><div class="yottie-popup-video-comments-item-profile-image"> <a href="' + alias3((helper = (helper = helpers.authorChannelUrl || (depth0 != null ? depth0.authorChannelUrl : depth0)) != null ? helper : alias1, typeof helper === alias2 ? helper.call(depth0, {
            'name': 'authorChannelUrl',
            'hash': {},
            'data': data
        }) : helper)) + '" target="_blank" rel="nofollow"><img src="' + alias3((helper = (helper = helpers.authorProfileImageUrl || (depth0 != null ? depth0.authorProfileImageUrl : depth0)) != null ? helper : alias1, typeof helper === alias2 ? helper.call(depth0, {
            'name': 'authorProfileImageUrl',
            'hash': {},
            'data': data
        }) : helper)) + '"></a></div><div class="yottie-popup-video-comments-item-info"><div class="yottie-popup-video-comments-item-header"><div class="yottie-popup-video-comments-item-name"> <a href="' + alias3((helper = (helper = helpers.authorChannelUrl || (depth0 != null ? depth0.authorChannelUrl : depth0)) != null ? helper : alias1, typeof helper === alias2 ? helper.call(depth0, {
            'name': 'authorChannelUrl',
            'hash': {},
            'data': data
        }) : helper)) + '" target="_blank" rel="nofollow">' + alias3((helper = (helper = helpers.authorName || (depth0 != null ? depth0.authorName : depth0)) != null ? helper : alias1, typeof helper === alias2 ? helper.call(depth0, {
            'name': 'authorName',
            'hash': {},
            'data': data
        }) : helper)) + '</a></div><div class="yottie-popup-video-comments-item-passed-time">' + alias3((helper = (helper = helpers.passedTime || (depth0 != null ? depth0.passedTime : depth0)) != null ? helper : alias1, typeof helper === alias2 ? helper.call(depth0, {
            'name': 'passedTime',
            'hash': {},
            'data': data
        }) : helper)) + '</div></div><div class="yottie-popup-video-comments-item-text"> ' + ((stack1 = (helper = (helper = helpers.text || (depth0 != null ? depth0.text : depth0)) != null ? helper : alias1, typeof helper === alias2 ? helper.call(depth0, {
            'name': 'text',
            'hash': {},
            'data': data
        }) : helper)) != null ? stack1 : '') + '</div> ' + ((stack1 = helpers['if'].call(depth0, depth0 != null ? depth0.displayLikesCount : depth0, {
            'name': 'if',
            'hash': {},
            'fn': this.program(29, data, 0),
            'inverse': this.noop,
            'data': data
        })) != null ? stack1 : '') + '</div></div> ';
    },
    '29': function (depth0, helpers, partials, data) {
        var stack1, helper, alias1 = this.escapeExpression;
        return '<div class="yottie-popup-video-comments-item-likes" title="' + alias1(this.lambda((stack1 = depth0 != null ? depth0.titles : depth0) != null ? stack1.likes : stack1, depth0)) + '"><svg class="yottie-popup-video-comments-item-likes-icon"><use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="#icon-likes"></use></svg><span>' + alias1((helper = (helper = helpers.likesCount || (depth0 != null ? depth0.likesCount : depth0)) != null ? helper : helpers.helperMissing, typeof helper === 'function' ? helper.call(depth0, {
            'name': 'likesCount',
            'hash': {},
            'data': data
        }) : helper)) + '</span></div> ';
    },
    'compiler': [
        6,
        '>= 2.0.0-beta.1'
    ],
    'main': function (depth0, helpers, partials, data) {
        var stack1, helper;
        return '<div style="display: none"><svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="12" height="11" viewBox="0 0 12 11"><symbol viewBox="0 0 12 11" id="icon-likes"><defs><path id="jfk8a" d="M2631 867.95c0-.6-.5-1.1-1.1-1.1h-3.43l.55-2.53v-.17c0-.21-.11-.43-.22-.6l-.6-.55-3.6 3.63c-.22.17-.33.44-.33.77v5.5c0 .6.5 1.1 1.1 1.1h4.9c.44 0 .82-.27.98-.66l1.64-3.9c.06-.12.06-.28.06-.39v-1.1h.05c0 .06 0 0 0 0zm-12 6.05h2.18v-6.6H2619z"/></defs><g><g transform="translate(-2619 -863)"><use xlink:href="#jfk8a"/></g></g></symbol></svg><svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="12" height="11" viewBox="0 0 12 11"><symbol viewBox="0 0 12 11" id="icon-dislikes"><defs><path id="w9axa" d="M2698 871.05c0 .6.46 1.1 1.03 1.1h3.24l-.52 2.53v.17c0 .21.1.43.21.6l.57.55 3.39-3.63c.2-.17.3-.44.3-.77v-5.5c0-.6-.45-1.1-1.02-1.1h-4.63c-.41 0-.77.27-.92.66l-1.55 3.9c-.05.12-.05.28-.05.39v1.1h-.05c0-.06 0 0 0 0zm12-5.65h-2.06v6.6h2.06z"/></defs><g><g transform="translate(-2698 -865)"><use xlink:href="#w9axa"/></g></g></symbol></svg><svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="14" height="12" viewBox="0 0 14 12"><symbol viewBox="0 0 14 12" id="icon-share"><defs><path id="dka3a" d="M2786 868.92l-5.93-5.91v3.94A8.06 8.06 0 0 0 2772 875a8.08 8.08 0 0 1 8.07-4.12v3.96z"/></defs><g><g transform="translate(-2772 -863)"><use xlink:href="#dka3a"/></g></g></symbol></svg></div><div class="yottie-popup-video-content"><div class="yottie-popup-video-title"> ' + this.escapeExpression((helper = (helper = helpers.title || (depth0 != null ? depth0.title : depth0)) != null ? helper : helpers.helperMissing, typeof helper === 'function' ? helper.call(depth0, {
            'name': 'title',
            'hash': {},
            'data': data
        }) : helper)) + '</div><div class="yottie-popup-video-info"> ' + ((stack1 = helpers['if'].call(depth0, (stack1 = depth0 != null ? depth0.displaying : depth0) != null ? stack1.viewsCounter : stack1, {
            'name': 'if',
            'hash': {},
            'fn': this.program(1, data, 0),
            'inverse': this.noop,
            'data': data
        })) != null ? stack1 : '') + ' ' + ((stack1 = helpers['if'].call(depth0, (stack1 = depth0 != null ? depth0.displaying : depth0) != null ? stack1.ratingCounters : stack1, {
            'name': 'if',
            'hash': {},
            'fn': this.program(3, data, 0),
            'inverse': this.noop,
            'data': data
        })) != null ? stack1 : '') + ' ' + ((stack1 = helpers['if'].call(depth0, (stack1 = depth0 != null ? depth0.displaying : depth0) != null ? stack1.share : stack1, {
            'name': 'if',
            'hash': {},
            'fn': this.program(10, data, 0),
            'inverse': this.noop,
            'data': data
        })) != null ? stack1 : '') + '</div> ' + ((stack1 = helpers['if'].call(depth0, (stack1 = depth0 != null ? depth0.displaying : depth0) != null ? stack1.meta : stack1, {
            'name': 'if',
            'hash': {},
            'fn': this.program(13, data, 0),
            'inverse': this.noop,
            'data': data
        })) != null ? stack1 : '') + '<div class="yottie-popup-video-content-ads" data-yt-ads-place="popup"></div> ' + ((stack1 = helpers['if'].call(depth0, (stack1 = depth0 != null ? depth0.displaying : depth0) != null ? stack1.comments : stack1, {
            'name': 'if',
            'hash': {},
            'fn': this.program(27, data, 0),
            'inverse': this.noop,
            'data': data
        })) != null ? stack1 : '') + '</div>';
    },
    'useData': true
});
views['popup']['video']['player'] = Handlebars.template({
    'compiler': [
        6,
        '>= 2.0.0-beta.1'
    ],
    'main': function (depth0, helpers, partials, data) {
        return '<div class="yottie-popup-video-player"><span></span></div>';
    },
    'useData': true
});
views['popup']['wrapper'] = Handlebars.template({
    'compiler': [
        6,
        '>= 2.0.0-beta.1'
    ],
    'main': function (depth0, helpers, partials, data) {
        var stack1;
        return '<div class="yottie-popup-wrapper"> ' + ((stack1 = this.lambda((stack1 = depth0 != null ? depth0.parts : depth0) != null ? stack1.inner : stack1, depth0)) != null ? stack1 : '') + '</div>';
    },
    'useData': true
});
views['video'] = views['video'] || {};
views['video']['container'] = Handlebars.template({
    '1': function (depth0, helpers, partials, data) {
        var stack1, alias1 = this.lambda;
        return ' ' + ((stack1 = alias1((stack1 = depth0 != null ? depth0.parts : depth0) != null ? stack1.overlay : stack1, depth0)) != null ? stack1 : '') + ' ' + ((stack1 = alias1((stack1 = depth0 != null ? depth0.parts : depth0) != null ? stack1.info : stack1, depth0)) != null ? stack1 : '') + ' ';
    },
    'compiler': [
        6,
        '>= 2.0.0-beta.1'
    ],
    'main': function (depth0, helpers, partials, data) {
        var stack1, helper, alias1 = helpers.helperMissing, alias2 = 'function', alias3 = this.escapeExpression, alias4 = this.lambda;
        return '<div class="yottie-widget-video yottie-widget-video-' + alias3((helper = (helper = helpers.layout || (depth0 != null ? depth0.layout : depth0)) != null ? helper : alias1, typeof helper === alias2 ? helper.call(depth0, {
            'name': 'layout',
            'hash': {},
            'data': data
        }) : helper)) + '" data-yt-id="' + alias3((helper = (helper = helpers.id || (depth0 != null ? depth0.id : depth0)) != null ? helper : alias1, typeof helper === alias2 ? helper.call(depth0, {
            'name': 'id',
            'hash': {},
            'data': data
        }) : helper)) + '"> ' + ((stack1 = alias4((stack1 = depth0 != null ? depth0.parts : depth0) != null ? stack1.player : stack1, depth0)) != null ? stack1 : '') + ' ' + ((stack1 = alias4((stack1 = depth0 != null ? depth0.parts : depth0) != null ? stack1.preview : stack1, depth0)) != null ? stack1 : '') + ' ' + ((stack1 = helpers['if'].call(depth0, (stack1 = depth0 != null ? depth0.displaying : depth0) != null ? stack1.info : stack1, {
            'name': 'if',
            'hash': {},
            'fn': this.program(1, data, 0),
            'inverse': this.noop,
            'data': data
        })) != null ? stack1 : '') + '</div>';
    },
    'useData': true
});
views['video']['info'] = Handlebars.template({
    '1': function (depth0, helpers, partials, data) {
        var helper, alias1 = helpers.helperMissing, alias2 = 'function', alias3 = this.escapeExpression;
        return ' <a href="https://www.youtube.com/watch?v=' + alias3((helper = (helper = helpers.id || (depth0 != null ? depth0.id : depth0)) != null ? helper : alias1, typeof helper === alias2 ? helper.call(depth0, {
            'name': 'id',
            'hash': {},
            'data': data
        }) : helper)) + '" title="' + alias3((helper = (helper = helpers.title || (depth0 != null ? depth0.title : depth0)) != null ? helper : alias1, typeof helper === alias2 ? helper.call(depth0, {
            'name': 'title',
            'hash': {},
            'data': data
        }) : helper)) + '" target="_blank" class="yottie-widget-video-info-title">' + alias3((helper = (helper = helpers.title || (depth0 != null ? depth0.title : depth0)) != null ? helper : alias1, typeof helper === alias2 ? helper.call(depth0, {
            'name': 'title',
            'hash': {},
            'data': data
        }) : helper)) + '</a> ';
    },
    '3': function (depth0, helpers, partials, data) {
        var helper;
        return '<div class="yottie-widget-video-info-passed-time">' + this.escapeExpression((helper = (helper = helpers.date || (depth0 != null ? depth0.date : depth0)) != null ? helper : helpers.helperMissing, typeof helper === 'function' ? helper.call(depth0, {
            'name': 'date',
            'hash': {},
            'data': data
        }) : helper)) + '</div> ';
    },
    '5': function (depth0, helpers, partials, data) {
        var stack1, helper;
        return '<div class="yottie-widget-video-info-caption"> ' + ((stack1 = (helper = (helper = helpers.description || (depth0 != null ? depth0.description : depth0)) != null ? helper : helpers.helperMissing, typeof helper === 'function' ? helper.call(depth0, {
            'name': 'description',
            'hash': {},
            'data': data
        }) : helper)) != null ? stack1 : '') + '</div> ';
    },
    '7': function (depth0, helpers, partials, data) {
        var stack1;
        return '<div class="yottie-widget-video-info-properties"><div class="yottie-widget-video-info-properties-inner"> ' + ((stack1 = helpers['if'].call(depth0, (stack1 = depth0 != null ? depth0.displaying : depth0) != null ? stack1.viewsCounter : stack1, {
            'name': 'if',
            'hash': {},
            'fn': this.program(8, data, 0),
            'inverse': this.noop,
            'data': data
        })) != null ? stack1 : '') + ' ' + ((stack1 = helpers['if'].call(depth0, (stack1 = depth0 != null ? depth0.displaying : depth0) != null ? stack1.likesCounter : stack1, {
            'name': 'if',
            'hash': {},
            'fn': this.program(10, data, 0),
            'inverse': this.noop,
            'data': data
        })) != null ? stack1 : '') + ' ' + ((stack1 = helpers['if'].call(depth0, (stack1 = depth0 != null ? depth0.displaying : depth0) != null ? stack1.commentsCounter : stack1, {
            'name': 'if',
            'hash': {},
            'fn': this.program(12, data, 0),
            'inverse': this.noop,
            'data': data
        })) != null ? stack1 : '') + '</div></div> ';
    },
    '8': function (depth0, helpers, partials, data) {
        var helper;
        return ' <span class="yottie-widget-video-info-properties-item"><span class="yottie-widget-video-info-properties-item-divider">\u2022</span> <span>' + this.escapeExpression((helper = (helper = helpers.viewsCount || (depth0 != null ? depth0.viewsCount : depth0)) != null ? helper : helpers.helperMissing, typeof helper === 'function' ? helper.call(depth0, {
            'name': 'viewsCount',
            'hash': {},
            'data': data
        }) : helper)) + '</span></span> ';
    },
    '10': function (depth0, helpers, partials, data) {
        var helper;
        return ' <span class="yottie-widget-video-info-properties-item"><span class="yottie-widget-video-info-properties-item-divider">\u2022</span> <span>' + this.escapeExpression((helper = (helper = helpers.likesCount || (depth0 != null ? depth0.likesCount : depth0)) != null ? helper : helpers.helperMissing, typeof helper === 'function' ? helper.call(depth0, {
            'name': 'likesCount',
            'hash': {},
            'data': data
        }) : helper)) + '</span></span> ';
    },
    '12': function (depth0, helpers, partials, data) {
        var helper;
        return ' <span class="yottie-widget-video-info-properties-item"><span class="yottie-widget-video-info-properties-item-divider">\u2022</span> <span>' + this.escapeExpression((helper = (helper = helpers.commentsCount || (depth0 != null ? depth0.commentsCount : depth0)) != null ? helper : helpers.helperMissing, typeof helper === 'function' ? helper.call(depth0, {
            'name': 'commentsCount',
            'hash': {},
            'data': data
        }) : helper)) + '</span></span> ';
    },
    'compiler': [
        6,
        '>= 2.0.0-beta.1'
    ],
    'main': function (depth0, helpers, partials, data) {
        var stack1;
        return '<div class="yottie-widget-video-info"> ' + ((stack1 = helpers['if'].call(depth0, (stack1 = depth0 != null ? depth0.displaying : depth0) != null ? stack1.title : stack1, {
            'name': 'if',
            'hash': {},
            'fn': this.program(1, data, 0),
            'inverse': this.noop,
            'data': data
        })) != null ? stack1 : '') + ' ' + ((stack1 = helpers['if'].call(depth0, (stack1 = depth0 != null ? depth0.displaying : depth0) != null ? stack1.date : stack1, {
            'name': 'if',
            'hash': {},
            'fn': this.program(3, data, 0),
            'inverse': this.noop,
            'data': data
        })) != null ? stack1 : '') + ' ' + ((stack1 = helpers['if'].call(depth0, (stack1 = depth0 != null ? depth0.displaying : depth0) != null ? stack1.description : stack1, {
            'name': 'if',
            'hash': {},
            'fn': this.program(5, data, 0),
            'inverse': this.noop,
            'data': data
        })) != null ? stack1 : '') + ' ' + ((stack1 = helpers['if'].call(depth0, (stack1 = depth0 != null ? depth0.displaying : depth0) != null ? stack1.properties : stack1, {
            'name': 'if',
            'hash': {},
            'fn': this.program(7, data, 0),
            'inverse': this.noop,
            'data': data
        })) != null ? stack1 : '') + '</div>';
    },
    'useData': true
});
views['video']['overlay'] = Handlebars.template({
    'compiler': [
        6,
        '>= 2.0.0-beta.1'
    ],
    'main': function (depth0, helpers, partials, data) {
        return '<div class="yottie-widget-video-overlay"></div>';
    },
    'useData': true
});
views['video']['player'] = Handlebars.template({
    '1': function (depth0, helpers, partials, data) {
        return '<span class="yottie-widget-video-player"><span></span></span> ';
    },
    'compiler': [
        6,
        '>= 2.0.0-beta.1'
    ],
    'main': function (depth0, helpers, partials, data) {
        var stack1;
        return (stack1 = helpers['if'].call(depth0, (stack1 = depth0 != null ? depth0.displaying : depth0) != null ? stack1.videoPlayer : stack1, {
            'name': 'if',
            'hash': {},
            'fn': this.program(1, data, 0),
            'inverse': this.noop,
            'data': data
        })) != null ? stack1 : '';
    },
    'useData': true
});
views['video']['preview'] = Handlebars.template({
    '1': function (depth0, helpers, partials, data) {
        var helper;
        return 'data-maxres-src="' + this.escapeExpression((helper = (helper = helpers.maxresThumbnail || (depth0 != null ? depth0.maxresThumbnail : depth0)) != null ? helper : helpers.helperMissing, typeof helper === 'function' ? helper.call(depth0, {
            'name': 'maxresThumbnail',
            'hash': {},
            'data': data
        }) : helper)) + '"';
    },
    '3': function (depth0, helpers, partials, data) {
        var stack1;
        return ' <span class="yottie-widget-video-preview-marker yottie-widget-video-preview-marker-duration">' + ((stack1 = helpers['if'].call(depth0, (stack1 = depth0 != null ? depth0.duration : depth0) != null ? stack1.h : stack1, {
            'name': 'if',
            'hash': {},
            'fn': this.program(4, data, 0),
            'inverse': this.noop,
            'data': data
        })) != null ? stack1 : '') + ((stack1 = helpers['if'].call(depth0, (stack1 = depth0 != null ? depth0.duration : depth0) != null ? stack1.m : stack1, {
            'name': 'if',
            'hash': {},
            'fn': this.program(6, data, 0),
            'inverse': this.noop,
            'data': data
        })) != null ? stack1 : '') + ((stack1 = helpers.unless.call(depth0, (stack1 = depth0 != null ? depth0.duration : depth0) != null ? stack1.m : stack1, {
            'name': 'unless',
            'hash': {},
            'fn': this.program(8, data, 0),
            'inverse': this.noop,
            'data': data
        })) != null ? stack1 : '') + ((stack1 = helpers['if'].call(depth0, (stack1 = depth0 != null ? depth0.duration : depth0) != null ? stack1.s : stack1, {
            'name': 'if',
            'hash': {},
            'fn': this.program(10, data, 0),
            'inverse': this.noop,
            'data': data
        })) != null ? stack1 : '') + ((stack1 = helpers.unless.call(depth0, (stack1 = depth0 != null ? depth0.duration : depth0) != null ? stack1.s : stack1, {
            'name': 'unless',
            'hash': {},
            'fn': this.program(12, data, 0),
            'inverse': this.noop,
            'data': data
        })) != null ? stack1 : '') + '</span> ';
    },
    '4': function (depth0, helpers, partials, data) {
        var stack1;
        return this.escapeExpression(this.lambda((stack1 = depth0 != null ? depth0.duration : depth0) != null ? stack1.h : stack1, depth0)) + ':';
    },
    '6': function (depth0, helpers, partials, data) {
        var stack1;
        return this.escapeExpression(this.lambda((stack1 = depth0 != null ? depth0.duration : depth0) != null ? stack1.m : stack1, depth0)) + ':';
    },
    '8': function (depth0, helpers, partials, data) {
        return '00:';
    },
    '10': function (depth0, helpers, partials, data) {
        var stack1;
        return this.escapeExpression(this.lambda((stack1 = depth0 != null ? depth0.duration : depth0) != null ? stack1.s : stack1, depth0));
    },
    '12': function (depth0, helpers, partials, data) {
        return '00';
    },
    '14': function (depth0, helpers, partials, data) {
        return '<span class="yottie-widget-video-preview-play"></span> ';
    },
    'compiler': [
        6,
        '>= 2.0.0-beta.1'
    ],
    'main': function (depth0, helpers, partials, data) {
        var stack1, helper, alias1 = helpers.helperMissing, alias2 = 'function', alias3 = this.escapeExpression;
        return ' <a href="https://www.youtube.com/watch?v=' + alias3((helper = (helper = helpers.id || (depth0 != null ? depth0.id : depth0)) != null ? helper : alias1, typeof helper === alias2 ? helper.call(depth0, {
            'name': 'id',
            'hash': {},
            'data': data
        }) : helper)) + '" title="' + alias3((helper = (helper = helpers.title || (depth0 != null ? depth0.title : depth0)) != null ? helper : alias1, typeof helper === alias2 ? helper.call(depth0, {
            'name': 'title',
            'hash': {},
            'data': data
        }) : helper)) + '" target="_blank" class="yottie-widget-video-preview"><span class="yottie-widget-video-preview-thumbnail"><img alt="' + alias3((helper = (helper = helpers.title || (depth0 != null ? depth0.title : depth0)) != null ? helper : alias1, typeof helper === alias2 ? helper.call(depth0, {
            'name': 'title',
            'hash': {},
            'data': data
        }) : helper)) + '" data-src="' + alias3((helper = (helper = helpers.thumbnail || (depth0 != null ? depth0.thumbnail : depth0)) != null ? helper : alias1, typeof helper === alias2 ? helper.call(depth0, {
            'name': 'thumbnail',
            'hash': {},
            'data': data
        }) : helper)) + '" ' + ((stack1 = helpers['if'].call(depth0, depth0 != null ? depth0.maxresThumbnail : depth0, {
            'name': 'if',
            'hash': {},
            'fn': this.program(1, data, 0),
            'inverse': this.noop,
            'data': data
        })) != null ? stack1 : '') + '/></span> ' + ((stack1 = helpers['if'].call(depth0, (stack1 = depth0 != null ? depth0.displaying : depth0) != null ? stack1.duration : stack1, {
            'name': 'if',
            'hash': {},
            'fn': this.program(3, data, 0),
            'inverse': this.noop,
            'data': data
        })) != null ? stack1 : '') + ' ' + ((stack1 = helpers['if'].call(depth0, (stack1 = depth0 != null ? depth0.displaying : depth0) != null ? stack1.playIcon : stack1, {
            'name': 'if',
            'hash': {},
            'fn': this.program(14, data, 0),
            'inverse': this.noop,
            'data': data
        })) != null ? stack1 : '') + '</a>';
    },
    'useData': true
});
views['widget'] = Handlebars.template({
    'compiler': [
        6,
        '>= 2.0.0-beta.1'
    ],
    'main': function (depth0, helpers, partials, data) {
        return '<div class="yottie-widget-inner"><yottie data-part="header"></yottie><div class="yottie-widget-contents"><yottie data-part="groups"></yottie><yottie data-part="feed"></yottie></div></div>';
    },
    'useData': true
});
module.exports = views;
},{}],47:[function(require,module,exports){
"use strict";
var $ = require('./../../olivie/src/js/jquery'), Olivie = require('./../../olivie/src/js/olivie');
module.exports = Olivie.class('YottieFacade', [], function (app) {
    var self = this;
    self.app = app;
}, {}, { app: null });
},{"./../../olivie/src/js/jquery":7,"./../../olivie/src/js/olivie":14}],48:[function(require,module,exports){
"use strict";
var $ = require('./../../olivie/src/js/jquery'), Olivie = require('./../../olivie/src/js/olivie'), Client = require('./../../olivie/src/js/modules/mies/client'), I18n = require('./../../olivie/src/js/modules/appearance/i18n'), Renderer = require('./../../olivie/src/js/modules/appearance/renderer'), Colorizer = require('./../../olivie/src/js/modules/appearance/colorizer'), Utils = require('./../../olivie/src/js/utils'), YTError = require('./modules/widget/yt-error'), YouTube = require('./modules/youtube/youtube'), Widget = require('./modules/widget/widget'), Header = require('./modules/widget/header'), Groups = require('./modules/widget/groups'), Feed = require('./modules/widget/feed'), Ads = require('./modules/widget/ads'), Popup = require('./modules/popup/popup'), dictionary = require('./dictionary'), views = require('./views'), schemes = require('./schemes'), defaults = require('./defaults'), Analytics = require('./analytics');
module.exports = Olivie.application('Yottie', function (id, element, options) {
    var self = this;
    self.getParent('Application').call(self);
    self.id = id;
    self.$element = $(element);
    if (!options.key) {
        delete options.key;
    }
    self.options = $.extend(true, {}, defaults, options);
    self.analytics = new Analytics('yottie', self.options.widgetId || null);
    var key;
    var keys = self.options.key;
    if (!$.isArray(keys)) {
        key = keys;
    } else {
        key = keys[Math.floor(Math.random() * keys.length)];
    }
    self.registerComponent(new Client(self.options.apiUrl, { key: key }, 'Yottie', self.options.cacheTime));
    self.registerComponent(new I18n(dictionary, self.options.lang));
    self.registerComponent(new Renderer(views));
    self.registerComponent(new Colorizer(schemes, self.options.color.scheme, self.options.color, 'colorizer'));
    self.registerComponent(new YTError());
    self.registerComponent(new YouTube());
    self.registerComponent(new Ads(self.options.ads));
    self.registerComponent(new Widget());
    self.registerComponent(new Header());
    self.registerComponent(new Popup());
    self.registerComponent(new Feed());
    self.registerComponent(new Groups());
    var client = self.component('client');
    client.attachResponseModifier(function (res) {
        var mes;
        if (res.error) {
            mes = res.error.code + ' ' + res.error.message + ' ' + JSON.stringify(res.error.errors) + ' (' + document.location.href + ')';
            client.ga.collect(mes);
        }
    });
    if (self.analytics.available()) {
        setTimeout(function () {
            var handleViewEvent = function ($element) {
                var percentage = $element.height() ? window.innerHeight / $element.height() * 50 : 50;
                if (Utils.inViewPort($element[0], percentage)) {
                    self.analytics.store('view', 1, 60 * 60 * 24);
                }
            };
            self.$element.click(function () {
                self.analytics.store('click');
            });
            var scrollTimeout;
            jQuery(window).on('scroll resize', function () {
                clearTimeout(scrollTimeout);
                scrollTimeout = setTimeout(function () {
                    handleViewEvent(self.$element);
                }, 100);
            });
            handleViewEvent(self.$element);
        }, 1000);
    }
}, { VERSION: '3.2.0' }, {
    id: null,
    $element: null,
    options: null,
    run: function () {
        var self = this;
        self.$element.addClass('yottie yottie-widget');
        self.component('error').run();
        if ($.type(self.options.sourceGroups) === 'string' && self.options.sourceGroups.length) {
            try {
                self.options.sourceGroups = $.parseJSON(decodeURIComponent(self.options.sourceGroups));
            } catch (e) {
                self.options.sourceGroups = null;
            }
        }
        if ($.type(self.options.content.responsive) === 'string' && self.options.content.responsive.length) {
            try {
                self.options.content.responsive = $.parseJSON(decodeURIComponent(self.options.content.responsive));
            } catch (e) {
                self.options.content.responsive = null;
            }
        }
        self.component('colorizer').run();
        self.component('ads').run();
        self.component('client').run().done(function () {
            self.component('header').run().on('ready', function (e, header) {
                var sourceGroups;
                if (jQuery.isArray(self.options.sourceGroups) && self.options.sourceGroups.length) {
                    sourceGroups = self.options.sourceGroups;
                } else if (self.options.channel) {
                    sourceGroups = [{
                            title: self.component('i18n').t('Uploads'),
                            sources: [{
                                    kind: 'youtube#playlist',
                                    criteria: { id: header.channel.contentDetails.relatedPlaylists.uploads }
                                }]
                        }];
                } else {
                    self.component('error').throw('Channel and sourceGroups are not specified.');
                    return;
                }
                self.component('groups').run(sourceGroups);
                self.component('feed').run(sourceGroups);
                self.component('widget').run();
                self.component('popup').run();
                self.component('feed').setActiveSection(0);
            });
        });
    },
    getId: function () {
        var self = this;
        return self.id;
    }
});
},{"./../../olivie/src/js/jquery":7,"./../../olivie/src/js/modules/appearance/colorizer":8,"./../../olivie/src/js/modules/appearance/i18n":9,"./../../olivie/src/js/modules/appearance/renderer":10,"./../../olivie/src/js/modules/mies/client":12,"./../../olivie/src/js/olivie":14,"./../../olivie/src/js/utils":15,"./analytics":16,"./defaults":19,"./dictionary":20,"./modules/popup/popup":23,"./modules/widget/ads":24,"./modules/widget/feed":26,"./modules/widget/groups":28,"./modules/widget/header":29,"./modules/widget/widget":30,"./modules/widget/yt-error":31,"./modules/youtube/youtube":44,"./schemes":45,"./views":46}]},{},[21])