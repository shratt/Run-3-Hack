(async ()=>{
    async function loadScript(src) {
        eval(await fetch(src).then(r => r.text()));
    };

    await loadScript("https://flyover.github.io/imgui-js/dist/imgui.umd.js");
    await loadScript("https://flyover.github.io/imgui-js/dist/imgui_impl.umd.js");

    let zamn = {
        "moduleSystem": {
            "modules": {},
            "registerModule": function(name, onEnable, onDisable) {
                let module = {
                    "name": name,
                    "enabled": false,
                    "enable": (...args) => {
                        onEnable(...args);
                        module.enabled = true;
                    },
                    "disable": (...args) => {
                        onDisable(...args);
                        module.enabled = false;
                    },
                    "toggle": (...args) => {
                        if (module.enabled === true) {
                            module.disable(...args);
                        } else {
                            module.enable(...args);
                        }
                    }
                };
                zamn.moduleSystem.modules[name] = module;
                return zamn.moduleSystem.modules[name];
            },
            "deleteModule": function(name) {
                zamn.moduleSystem.modules[name].disable();
                delete zamn.moduleSystem.modules[name];
            },
            "getEnabledModules": function() {
                let modules = [];
                Object.keys(zamn.moduleSystem.modules).forEach(m => {
                    if (zamn.moduleSystem.modules[m].enabled) {
                        modules.push(m);
                    }
                });
                return modules;
            }
        },
        "utils": {
            "hookUtil": function(object, key, callback) {
                let originalFn = object[key];
                object[key] = function() {
                    callback(this);
                    object[key] = originalFn;
                    return originalFn.apply(this, arguments);
                };
            },
            "lockValue": function(object, key, value) {
                object.__defineGetter__(key, () => value);
                object.__defineSetter__(key, (v) => {});
            },
            "unlockValue": function(object, key) {
                Object.defineProperty(object, key, {
                    value: null,
                    writable: true,
                    configurable: true,
                    enumerable: true
                });
            }
        }
    };

    function hookGame() {
        let sym = Symbol();
        Object.prototype.__defineSetter__(sym, function(value) {
            window.run3FuncMap = this;
            this.ApplicationMain = value;
        });

        // older version might be _0x4cc7
        let getObfuscatedString = _0x56ae;
        _0x56ae = function(key) {
            let retVal = getObfuscatedString.apply(this, arguments);
            if (retVal.includes('ApplicationMain')) {
                _0x56ae = getObfuscatedString;
                return sym;
            }
            return retVal;
        };

        // reload the game
        document.querySelector("canvas").remove(); // remove old game
        void lime.embed("Run3", "openfl-content", window.innerWidth, window.innerHeight, { parameters: {} });
    }

    hookGame();

    let showMenu = true;

    zamn.moduleSystem.registerModule("Air Jump", () => {
        zamn.utils.hookUtil(run3FuncMap['unitsystem.action.platformer.JumpAction'].prototype, "update", (context) => {
            context.jumpsAllowed = Infinity;
        });
    }, () => {
        zamn.utils.hookUtil(run3FuncMap['unitsystem.action.platformer.JumpAction'].prototype, "update", (context) => {
            context.jumpsAllowed = 1;
        });
    });

    zamn.moduleSystem.registerModule("Low Gravity", () => {
        zamn.utils.hookUtil(run3FuncMap['nme3D.physics.World3D'].prototype, "update", function(context) {
            context.gravity.y = 250;
            context.gravity3D.y = 250;
        });
    }, () => {
        zamn.utils.hookUtil(run3FuncMap['nme3D.physics.World3D'].prototype, "update", function(context) {
            context.gravity.y = 422;
            context.gravity3D.y = 422;
        });
    });

    zamn.moduleSystem.registerModule("First Person", () => {
        zamn.utils.hookUtil(run3FuncMap['nme3D.physics.World3D'].prototype, "update", function(context) {
            zamn.utils.lockValue(context.currentCameraOffset, "y", 0);
            zamn.utils.lockValue(context.currentCameraOffset, "z", 0);
        });
    }, () => {
        zamn.utils.hookUtil(run3FuncMap['nme3D.physics.World3D'].prototype, "update", function(context) {
            zamn.utils.unlockValue(context.currentCameraOffset, "y");
            zamn.utils.unlockValue(context.currentCameraOffset, "z");
        });
    });

    zamn.moduleSystem.registerModule("Shrink", () => {
        zamn.utils.hookUtil(run3FuncMap['unitsystem.action.platformer.JumpAction'].prototype, "update", (context) => {
            zamn.utils.lockValue(context.owner.mesh, "_scaleX", 0.05);
            zamn.utils.lockValue(context.owner.mesh, "_scaleY", 0.05);
        });
        zamn.utils.hookUtil(run3FuncMap['nme3D.physics.World3D'].prototype, "update", function(context) {
            zamn.utils.lockValue(context.currentCameraOffset, "y", -5);
            zamn.utils.lockValue(context.currentCameraOffset, "z", -22);
            console.log(context.currentCameraOffset.z, context.currentCameraOffset.y)
        });
    }, () => {
        zamn.utils.hookUtil(run3FuncMap['unitsystem.action.platformer.JumpAction'].prototype, "update", (context) => {
            zamn.utils.lockValue(context.owner.mesh, "_scaleX", 1);
            zamn.utils.lockValue(context.owner.mesh, "_scaleY", 1);
        });
        zamn.utils.hookUtil(run3FuncMap['nme3D.physics.World3D'].prototype, "update", function(context) {
            zamn.utils.unlockValue(context.currentCameraOffset, "y");
            zamn.utils.unlockValue(context.currentCameraOffset, "z");
        });
    });

    window.initGUI = async function () {
        await ImGui.default();
        let canvas = document.querySelector("#openfl-content > canvas");
        window.addEventListener("resize", () => {
            canvas.width = window.innerWidth
            canvas.height = window.innerHeight

            // restart the game because resize breaks it
            hookGame();
            window.initGUI();
        });

        ImGui.CreateContext();
        ImGui_Impl.Init(canvas);
        ImGui.StyleColorsDark();

        let done = false;
        window.requestAnimationFrame(_loop);
        function _loop(time) {
            ImGui_Impl.NewFrame(time);
            ImGui.NewFrame();

            if (showMenu) {
                ImGui.PushStyleColor(ImGui.ImGuiCol.TitleBg, new ImGui.ImVec4(0, 0.5, 0.5, 0.9));
                ImGui.PushStyleColor(ImGui.ImGuiCol.TitleBgActive, new ImGui.ImVec4(0, 0.6, 0.6, 0.9));
                ImGui.PushStyleColor(ImGui.ImGuiCol.ButtonActive, new ImGui.ImVec4(0, 0.5, 0.5, 0.9));

                ImGui.Begin("ZAMN");
                Object.values(zamn.moduleSystem.modules).forEach((module) => {

                    if (module.enabled) {
                        ImGui.PushStyleColor(ImGui.ImGuiCol.Button, new ImGui.ImVec4(0.4, 0.4, 0.4, 0.9));
                        ImGui.PushStyleColor(ImGui.ImGuiCol.ButtonHovered, new ImGui.ImVec4(0.3, 0.3, 0.3, 0.9));
                    } else {
                        ImGui.PushStyleColor(ImGui.ImGuiCol.Button, new ImGui.ImVec4(0.2, 0.2, 0.2, 0.8));
                        ImGui.PushStyleColor(ImGui.ImGuiCol.ButtonHovered, new ImGui.ImVec4(0.4, 0.4, 0.4, 0.9));
                    }

                    if (ImGui.Button(module.name, new ImGui.ImVec2(ImGui.GetContentRegionAvail().x, 0))) {
                        module.toggle();
                    }
                });
                ImGui.End();
            }

            ImGui.EndFrame();
            ImGui.Render();
            ImGui_Impl.RenderDrawData(ImGui.GetDrawData());

            window.requestAnimationFrame(done ? _done : _loop);
        }

        function _done() {
            ImGui_Impl.Shutdown();
            ImGui.DestroyContext();
        }
    }

    initGUI();

    window.addEventListener('keydown', (event) => {
        if (event.code === 'ShiftLeft') {
            showMenu = !showMenu;
        }
    });
})();
