window.onload = function () {
    window.addEventListener('drop', function (e) {
        console.log(e);
        e.stopPropagation();
        e.preventDefault();
        console.log(e);
    });
};

function get(url) {
    return new Promise(function (resolve, reject) {
        var xhr = new XMLHttpRequest();
        xhr.open("GET", url);
        xhr.onload = function () {
            if (xhr.status == 200) {
                resolve(xhr.responseText);
            } else {
                reject(new Error("Network Error"));
            }
        };
        xhr.onerror = function () {
            reject(new Error("Network Error"));
        };
        xhr.send();
    });
}

var context = new AudioContext();
var chainStart = context.createGain();
var chainEnd = context.createGain();
chainEnd.connect(context.destination);
var Factory = new PluginFactory(context);
var chain = Factory.createSubFactory(chainStart, chainEnd);

function offlineRender(callback, buffer) {
    if (typeof callback !== "function") {
        throw ("Callback must be defined");
    }
    var offline = new OfflineAudioContext(buffer.numberOfChannels, buffer.length + buffer.sampleRate * 3, buffer.sampleRate);
    var offlineFactory = new PluginFactory(offline);
    var offlineChainStart = offline.createGain();
    var offlineChainStop = offline.createGain();
    var offlineChain = offlineFactory.createSubFactory(offlineChainStart, offlineChainStop);

    get("../jsap-plugins/plugins.json").then(JSON.parse).then(function (data) {
        var base_url = "../jsap-plugins/";
        data.plugins.forEach(function (e) {
            e.url = base_url + e.url;
            e.test = function () {
                return typeof window[this.returnObject] === "function";
            };
            offlineFactory.loadPluginScript(e);
        });
        return offline;
    }).then(function (context) {
        var onlinePlugins = chain.getPlugins().length,
            num_plugins = onlinePlugins.length,
            offlineProtoList = offlineFactory.getPrototypes(),
            i;
        for (i = 0; i < num_plugins; i++) {
            var onlinePluginProto = onlinePlugins[i].prototypeObject;
            var proto = offlineProtoList.find(function (e) {
                return e.name === onlinePluginProto.name;
            });
            if (!proto) {
                throw ("cannot load all plugins");
            }
        }
    });
}

(function () {
    var ngDragEventDirectives = {};

    angular.forEach(
        'drag dragend dragenter dragexit dragleave dragover dragstart drop'.split(' '),
        function (eventName) {
            var directiveName = 'ng' + eventName.charAt(0).toUpperCase() + eventName.slice(1);

            ngDragEventDirectives[directiveName] = ['$parse', '$rootScope', function ($parse, $rootScope) {
                return {
                    restrict: 'A',
                    compile: function ($element, attr) {
                        var fn = $parse(attr[directiveName], null, true);

                        return function ngDragEventHandler(scope, element) {
                            element.on(eventName, function (event) {
                                var callback = function () {
                                    fn(scope, {
                                        $event: event
                                    });
                                };

                                scope.$apply(callback);
                            });
                        };
                    }
                };
            }];
        }
    );

    angular
        .module('ngDrag', [])
        .directive(ngDragEventDirectives);
}());
var AngularInterface = angular.module("sandbox", ['ngDrag']);

// Globals
AngularInterface.controller("window", ['$scope', '$element', '$window', function ($s, $e, $w) {
    $s.file = {
        buffer: undefined
    };
    $s.playState = "stopped";
    $s.playing = false;
    $s.$watch('playState', function () {
        $s.playing = ($s.playState == "playing");
    });
}]);

// === MEDIA SELECTOR ===
AngularInterface.controller("media", ['$scope', '$element', '$window', function ($s, $e, $w) {
    $s.decodeError = function (msg) {
        $s.decodeState = 'error';
        $s.decodeMessage = msg;
    };
    $s.decodeState = 'empty';
    $s.decodeMessage = "Upload Audio File";
    $s.dragover = function ($event) {
        var e = $event.originalEvent,
            file = e.dataTransfer.files[0];
        if ($event.stopPropagation) {
            $event.stopPropagation();
        }
        if ($event.preventDefault) {
            $event.preventDefault();
        }
    };
    $s.dragleave = function ($event) {
        var e = $event.originalEvent;
        if ($event.stopPropagation) {
            $event.stopPropagation();
        }
        if ($event.preventDefault) {
            $event.preventDefault();
        }
    };
    $s.dragdrop = function ($event) {
        var e = $event.originalEvent,
            file = e.dataTransfer.files[0],
            reader = new FileReader();
        if ($event.stopPropagation) {
            $event.stopPropagation();
        }
        if ($event.preventDefault) {
            $event.preventDefault();
        }
        console.log(file);
        $s.decodeState = 'decoding';
        $s.decodeMessage = 'Analysing';
        reader.onerror = function (e) {
            $s.decodeError('Error reading file');
        };
        reader.onload = function (data) {
            context.decodeAudioData(data.target.result, function (decodedData) {
                $s.file.buffer = decodedData;
                $s.decodeState = 'ok';
                $s.decodeMessage = 'OK';
                $s.$apply();
            }, function (e) {
                $s.decodeError('Cannot decode this audio file.');
            });
        };
        reader.readAsArrayBuffer(file);
    };
}]);

AngularInterface.controller("filePlayer", ['$scope', '$element', '$window', function ($s, $e, $w) {
    $s.source;
    $s.canvas = $e[0].getElementsByTagName("canvas")[0];
    $s.playClicked = function ($event) {
        if ($s.playState == 'stopped') {
            $s.playState = 'playing';
            $s.source = context.createBufferSource();
            $s.source.buffer = $s.file.buffer;
            $s.source.connect(chainStart);
            $s.source.start(0);
            $s.source.onended = function () {
                $s.source = undefined;
                $s.playState = 'stopped';
                $s.$apply();
            };
        } else if ($s.playState == 'playing') {
            if ($s.source) {
                $s.source.stop(0);
                $s.source = undefined;
            }
            $s.playState = 'stopped';
        }
    };
    $s.drawWaveform = function () {
        if ($s.file.buffer) {
            var buf = $s.file.buffer,
                N = buf.length;
            var dataBuffer = new Float32Array(N),
                tmpBuffer;
            for (var c = 0; c < buf.numberOfChannels; c++) {
                tmpBuffer = buf.getChannelData(c);
                for (var n = 0; n < N; n++) {
                    dataBuffer[n] += tmpBuffer[n];
                }
                tmpBuffer = undefined;
            }
            var timePerPixel = buf.duration / $s.canvas.width;
            var samplesPerPixel = Math.floor(timePerPixel * buf.sampleRate);
            var frames = xtract_get_data_frames(dataBuffer, samplesPerPixel);
            frames.forEach(function (t, i, a) {
                a[i] = new TimeData(t, buf.sampleRate);
                a[i].maximum();
                a[i].minimum();
            });
            var pixID = 0;
            var context = $s.canvas.getContext("2d");
            context.clearRect(0, 0, $s.canvas.width, $s.canvas.height);

            while (pixID < $s.canvas.width && pixID < frames.length) {
                var frameResult = frames[pixID].result;
                context.moveTo(pixID, (frameResult.maximum * -0.5 + 0.5) * $s.canvas.height - 0.5);
                context.lineTo(pixID, (frameResult.minimum * -0.5 + 0.5) * $s.canvas.height + 0.5);
                context.stroke();
                pixID++;
            }
        }
    };
    $s.$watch($s.file.buffer, function () {
        $s.drawWaveform();
    });
}]);

AngularInterface.controller("render", ['$scope', '$element', '$window', function ($s, $e, $w) {
    $s.beginRendering = function ($event) {
        offlineRender(function () {}, $s.file.buffer);
    };
}]);

AngularInterface.controller("plugins", ['$scope', '$element', '$window', function ($s, $e, $w) {
    function calcFrameWidth() {
        var list = $e.context.getElementsByClassName("plugin-entry-holder"),
            i;
        $s.framewidth = 250;
        for (i = 0; i < list.length; i++) {
            $s.framewidth += angular.element(list[i]).scope().width + 20;
        }
    }
    $s.inputAnalyser = $w.Factory.context.createAnalyser();
    $s.outputAnalyser = $w.Factory.context.createAnalyser();
    $w.chain.chainStart.connect($s.inputAnalyser);
    $w.chain.chainStop.connect($s.outputAnalyser);
    $s.pluginList = [];
    $s.framewidth = 250;
    $s.showPluginList = false;
    $s.pluginPrototypes = $w.Factory.getPrototypes();
    $s.$watch($w.chain.getPlugins(), function () {
        $s.pluginList = $w.chain.getPlugins();
        calcFrameWidth();
    });
    $s.$watch($w.Factory.getPrototypes().length, function () {
        $s.pluginPrototypes = $w.Factory.getPrototypes();
        calcFrameWidth();
    });
    $s.addPlugin = function ($event) {
        $s.showPluginList = !$s.showPluginList;
        calcFrameWidth();
    };
    $s.addPluginPrototype = function (proto) {
        $w.chain.createPlugin(proto);
        calcFrameWidth();
    };
}]);

AngularInterface.controller("pluginInstance", ['$scope', '$element', '$window', function ($s, $e, $w) {
    $s.plugin = $s.node.node;
    $s.params = $s.plugin.parameters.getParameterObject();
    $s.width = 250 * (Math.floor($s.plugin.numParameters / 4) + 1);
    $s.removePlugin = function ($event) {
        $w.chain.destroyPlugin($s.plugin.pluginInstance);
    };
}]);

AngularInterface.controller("parameterInterface", ['$scope', '$element', '$window', function ($s, $e, $w) {
    $s.step = ($s.parameter.maximum - $s.parameter.minimum) / 100.0;
}]);

AngularInterface.controller("meter", ["$scope", "$element", "$window", function ($s, $e, $w) {
    $s.canvas = $e[0].querySelector("canvas");
    $s.canvasContext = $s.canvas.getContext("2d");

    $s.draw = function () {
        $s.canvasContext.clearRect(0, 0, 50, 200);
        // Go get the feature
        var frame = $s.analyser.getXtractData();
        var v = frame.rms_amplitude();
        v = Math.max(-60, Math.min(0, 20.0 * Math.log10(v)));
        // v is between -60 and 0 dB
        // Map so -60 = 200mm and 0 is 0mm
        var x = (v / -60) * 200;
        $s.canvasContext.fillStyle = "#aaa";
        $s.canvasContext.fillRect(0, x, 50, 200 - x);
        window.requestAnimationFrame($s.draw);
    }

    window.requestAnimationFrame($s.draw);
}]);
