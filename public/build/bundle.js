
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    const identity = x => x;
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function validate_store(store, name) {
        if (store != null && typeof store.subscribe !== 'function') {
            throw new Error(`'${name}' is not a store with a 'subscribe' method`);
        }
    }
    function subscribe(store, ...callbacks) {
        if (store == null) {
            return noop;
        }
        const unsub = store.subscribe(...callbacks);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function component_subscribe(component, store, callback) {
        component.$$.on_destroy.push(subscribe(store, callback));
    }

    const is_client = typeof window !== 'undefined';
    let now = is_client
        ? () => window.performance.now()
        : () => Date.now();
    let raf = is_client ? cb => requestAnimationFrame(cb) : noop;

    const tasks = new Set();
    function run_tasks(now) {
        tasks.forEach(task => {
            if (!task.c(now)) {
                tasks.delete(task);
                task.f();
            }
        });
        if (tasks.size !== 0)
            raf(run_tasks);
    }
    /**
     * Creates a new task that runs on each raf frame
     * until it returns a falsy value or is aborted
     */
    function loop(callback) {
        let task;
        if (tasks.size === 0)
            raf(run_tasks);
        return {
            promise: new Promise(fulfill => {
                tasks.add(task = { c: callback, f: fulfill });
            }),
            abort() {
                tasks.delete(task);
            }
        };
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.35.0' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src\Page.svelte generated by Svelte v3.35.0 */

    const file$1 = "src\\Page.svelte";

    function create_fragment$1(ctx) {
    	let div2;
    	let div1;
    	let object;
    	let t;
    	let div0;
    	let div0_style_value;
    	let div1_style_value;
    	let div2_style_value;

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div1 = element("div");
    			object = element("object");
    			t = space();
    			div0 = element("div");
    			attr_dev(object, "type", "image/svg+xml");
    			attr_dev(object, "data", /*svg*/ ctx[2]);
    			set_style(object, "width", "100%");
    			set_style(object, "height", "100%");
    			attr_dev(object, "title", "page");
    			add_location(object, file$1, 2, 4, 196);
    			attr_dev(div0, "style", div0_style_value = `background: ${/*gradient*/ ctx[5]}; pointer-events: none;`);
    			attr_dev(div0, "class", "page-shadow svelte-134cm11");
    			add_location(div0, file$1, 3, 4, 298);
    			attr_dev(div1, "style", div1_style_value = `position: relative; width: ${/*pageWidth*/ ctx[0]}px; height: 100%; overflow: hidden;`);
    			add_location(div1, file$1, 1, 2, 101);
    			attr_dev(div2, "class", "page svelte-134cm11");
    			attr_dev(div2, "style", div2_style_value = `z-index: ${/*zIndex*/ ctx[1]}; left:${/*left*/ ctx[3]}; width: ${/*width*/ ctx[4]}%; overflow: hidden;`);
    			add_location(div2, file$1, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div1);
    			append_dev(div1, object);
    			append_dev(div1, t);
    			append_dev(div1, div0);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*svg*/ 4) {
    				attr_dev(object, "data", /*svg*/ ctx[2]);
    			}

    			if (dirty & /*gradient*/ 32 && div0_style_value !== (div0_style_value = `background: ${/*gradient*/ ctx[5]}; pointer-events: none;`)) {
    				attr_dev(div0, "style", div0_style_value);
    			}

    			if (dirty & /*pageWidth*/ 1 && div1_style_value !== (div1_style_value = `position: relative; width: ${/*pageWidth*/ ctx[0]}px; height: 100%; overflow: hidden;`)) {
    				attr_dev(div1, "style", div1_style_value);
    			}

    			if (dirty & /*zIndex, left, width*/ 26 && div2_style_value !== (div2_style_value = `z-index: ${/*zIndex*/ ctx[1]}; left:${/*left*/ ctx[3]}; width: ${/*width*/ ctx[4]}%; overflow: hidden;`)) {
    				attr_dev(div2, "style", div2_style_value);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let even;
    	let zIndex;
    	let svg;
    	let left;
    	let width;
    	let gradient;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Page", slots, []);
    	let { doc } = $$props;
    	let { number } = $$props;
    	let { progress } = $$props;
    	let { pageWidth } = $$props;
    	let { shadowColor } = $$props;
    	let { shadowIntensity } = $$props;
    	let { shadow } = $$props;

    	const writable_props = [
    		"doc",
    		"number",
    		"progress",
    		"pageWidth",
    		"shadowColor",
    		"shadowIntensity",
    		"shadow"
    	];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Page> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("doc" in $$props) $$invalidate(6, doc = $$props.doc);
    		if ("number" in $$props) $$invalidate(7, number = $$props.number);
    		if ("progress" in $$props) $$invalidate(8, progress = $$props.progress);
    		if ("pageWidth" in $$props) $$invalidate(0, pageWidth = $$props.pageWidth);
    		if ("shadowColor" in $$props) $$invalidate(9, shadowColor = $$props.shadowColor);
    		if ("shadowIntensity" in $$props) $$invalidate(10, shadowIntensity = $$props.shadowIntensity);
    		if ("shadow" in $$props) $$invalidate(11, shadow = $$props.shadow);
    	};

    	$$self.$capture_state = () => ({
    		doc,
    		number,
    		progress,
    		pageWidth,
    		shadowColor,
    		shadowIntensity,
    		shadow,
    		even,
    		zIndex,
    		svg,
    		left,
    		width,
    		gradient
    	});

    	$$self.$inject_state = $$props => {
    		if ("doc" in $$props) $$invalidate(6, doc = $$props.doc);
    		if ("number" in $$props) $$invalidate(7, number = $$props.number);
    		if ("progress" in $$props) $$invalidate(8, progress = $$props.progress);
    		if ("pageWidth" in $$props) $$invalidate(0, pageWidth = $$props.pageWidth);
    		if ("shadowColor" in $$props) $$invalidate(9, shadowColor = $$props.shadowColor);
    		if ("shadowIntensity" in $$props) $$invalidate(10, shadowIntensity = $$props.shadowIntensity);
    		if ("shadow" in $$props) $$invalidate(11, shadow = $$props.shadow);
    		if ("even" in $$props) $$invalidate(12, even = $$props.even);
    		if ("zIndex" in $$props) $$invalidate(1, zIndex = $$props.zIndex);
    		if ("svg" in $$props) $$invalidate(2, svg = $$props.svg);
    		if ("left" in $$props) $$invalidate(3, left = $$props.left);
    		if ("width" in $$props) $$invalidate(4, width = $$props.width);
    		if ("gradient" in $$props) $$invalidate(5, gradient = $$props.gradient);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*number*/ 128) {
    			$$invalidate(12, even = number % 2 == 0);
    		}

    		if ($$self.$$.dirty & /*even, number*/ 4224) {
    			$$invalidate(1, zIndex = even ? -number : number);
    		}

    		if ($$self.$$.dirty & /*doc, number*/ 192) {
    			$$invalidate(2, svg = `/documents/${doc}/${number}.svg`);
    		}

    		if ($$self.$$.dirty & /*even, progress*/ 4352) {
    			$$invalidate(3, left = even ? "50%" : `${(1 - progress) * 100}%`);
    		}

    		if ($$self.$$.dirty & /*even, progress*/ 4352) {
    			$$invalidate(4, width = even ? (1 - progress) * 50 : progress * 50);
    		}

    		if ($$self.$$.dirty & /*shadow, even, shadowColor, shadowIntensity, progress*/ 7936) {
    			$$invalidate(5, gradient = shadow
    			? even
    				? `linear-gradient(90deg, #${shadowColor} 0%, rgba(0,0,0,0) ${shadowIntensity}%)`
    				: `linear-gradient(270deg, #${shadowColor} ${(1 - progress) * 100}%, rgba(0,0,0,0) ${(1 - progress) * 100 + shadowIntensity}%)`
    			: "#00000000");
    		}
    	};

    	return [
    		pageWidth,
    		zIndex,
    		svg,
    		left,
    		width,
    		gradient,
    		doc,
    		number,
    		progress,
    		shadowColor,
    		shadowIntensity,
    		shadow,
    		even
    	];
    }

    class Page extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {
    			doc: 6,
    			number: 7,
    			progress: 8,
    			pageWidth: 0,
    			shadowColor: 9,
    			shadowIntensity: 10,
    			shadow: 11
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Page",
    			options,
    			id: create_fragment$1.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*doc*/ ctx[6] === undefined && !("doc" in props)) {
    			console.warn("<Page> was created without expected prop 'doc'");
    		}

    		if (/*number*/ ctx[7] === undefined && !("number" in props)) {
    			console.warn("<Page> was created without expected prop 'number'");
    		}

    		if (/*progress*/ ctx[8] === undefined && !("progress" in props)) {
    			console.warn("<Page> was created without expected prop 'progress'");
    		}

    		if (/*pageWidth*/ ctx[0] === undefined && !("pageWidth" in props)) {
    			console.warn("<Page> was created without expected prop 'pageWidth'");
    		}

    		if (/*shadowColor*/ ctx[9] === undefined && !("shadowColor" in props)) {
    			console.warn("<Page> was created without expected prop 'shadowColor'");
    		}

    		if (/*shadowIntensity*/ ctx[10] === undefined && !("shadowIntensity" in props)) {
    			console.warn("<Page> was created without expected prop 'shadowIntensity'");
    		}

    		if (/*shadow*/ ctx[11] === undefined && !("shadow" in props)) {
    			console.warn("<Page> was created without expected prop 'shadow'");
    		}
    	}

    	get doc() {
    		throw new Error("<Page>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set doc(value) {
    		throw new Error("<Page>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get number() {
    		throw new Error("<Page>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set number(value) {
    		throw new Error("<Page>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get progress() {
    		throw new Error("<Page>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set progress(value) {
    		throw new Error("<Page>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get pageWidth() {
    		throw new Error("<Page>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set pageWidth(value) {
    		throw new Error("<Page>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get shadowColor() {
    		throw new Error("<Page>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set shadowColor(value) {
    		throw new Error("<Page>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get shadowIntensity() {
    		throw new Error("<Page>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set shadowIntensity(value) {
    		throw new Error("<Page>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get shadow() {
    		throw new Error("<Page>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set shadow(value) {
    		throw new Error("<Page>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    const subscriber_queue = [];
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = [];
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (let i = 0; i < subscribers.length; i += 1) {
                        const s = subscribers[i];
                        s[1]();
                        subscriber_queue.push(s, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.push(subscriber);
            if (subscribers.length === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                const index = subscribers.indexOf(subscriber);
                if (index !== -1) {
                    subscribers.splice(index, 1);
                }
                if (subscribers.length === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }

    function cubicOut(t) {
        const f = t - 1.0;
        return f * f * f + 1.0;
    }

    function is_date(obj) {
        return Object.prototype.toString.call(obj) === '[object Date]';
    }

    function get_interpolator(a, b) {
        if (a === b || a !== a)
            return () => a;
        const type = typeof a;
        if (type !== typeof b || Array.isArray(a) !== Array.isArray(b)) {
            throw new Error('Cannot interpolate values of different type');
        }
        if (Array.isArray(a)) {
            const arr = b.map((bi, i) => {
                return get_interpolator(a[i], bi);
            });
            return t => arr.map(fn => fn(t));
        }
        if (type === 'object') {
            if (!a || !b)
                throw new Error('Object cannot be null');
            if (is_date(a) && is_date(b)) {
                a = a.getTime();
                b = b.getTime();
                const delta = b - a;
                return t => new Date(a + t * delta);
            }
            const keys = Object.keys(b);
            const interpolators = {};
            keys.forEach(key => {
                interpolators[key] = get_interpolator(a[key], b[key]);
            });
            return t => {
                const result = {};
                keys.forEach(key => {
                    result[key] = interpolators[key](t);
                });
                return result;
            };
        }
        if (type === 'number') {
            const delta = b - a;
            return t => a + t * delta;
        }
        throw new Error(`Cannot interpolate ${type} values`);
    }
    function tweened(value, defaults = {}) {
        const store = writable(value);
        let task;
        let target_value = value;
        function set(new_value, opts) {
            if (value == null) {
                store.set(value = new_value);
                return Promise.resolve();
            }
            target_value = new_value;
            let previous_task = task;
            let started = false;
            let { delay = 0, duration = 400, easing = identity, interpolate = get_interpolator } = assign(assign({}, defaults), opts);
            if (duration === 0) {
                if (previous_task) {
                    previous_task.abort();
                    previous_task = null;
                }
                store.set(value = target_value);
                return Promise.resolve();
            }
            const start = now() + delay;
            let fn;
            task = loop(now => {
                if (now < start)
                    return true;
                if (!started) {
                    fn = interpolate(value, new_value);
                    if (typeof duration === 'function')
                        duration = duration(value, new_value);
                    started = true;
                }
                if (previous_task) {
                    previous_task.abort();
                    previous_task = null;
                }
                const elapsed = now - start;
                if (elapsed > duration) {
                    store.set(value = new_value);
                    return false;
                }
                // @ts-ignore
                store.set(value = fn(easing(elapsed / duration)));
                return true;
            });
            return task.promise;
        }
        return {
            set,
            update: (fn, opts) => set(fn(target_value, value), opts),
            subscribe: store.subscribe
        };
    }

    /* src\App.svelte generated by Svelte v3.35.0 */

    const { window: window_1 } = globals;
    const file = "src\\App.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[27] = list[i];
    	child_ctx[29] = i;
    	return child_ctx;
    }

    // (5:1) {#each Array(pages) as _, i}
    function create_each_block(ctx) {
    	let page;
    	let current;

    	page = new Page({
    			props: {
    				doc: /*doc*/ ctx[7],
    				number: /*i*/ ctx[29],
    				shadow: !(/*i*/ ctx[29] == 0 || (/*i*/ ctx[29] == /*pages*/ ctx[8] - 1 && (/*pages*/ ctx[8] - 1) % 2) != 0),
    				shadowColor: /*color*/ ctx[9],
    				shadowIntensity: /*intensity*/ ctx[10],
    				progress: Math.max(Math.min(/*$progress*/ ctx[6] - Math.floor(/*i*/ ctx[29] * 0.5), 1), 0),
    				pageWidth: /*w*/ ctx[4] * 0.98 * 0.5
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(page.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(page, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const page_changes = {};
    			if (dirty & /*$progress*/ 64) page_changes.progress = Math.max(Math.min(/*$progress*/ ctx[6] - Math.floor(/*i*/ ctx[29] * 0.5), 1), 0);
    			if (dirty & /*w*/ 16) page_changes.pageWidth = /*w*/ ctx[4] * 0.98 * 0.5;
    			page.$set(page_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(page.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(page.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(page, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(5:1) {#each Array(pages) as _, i}",
    		ctx
    	});

    	return block;
    }

    // (14:1) {#if turning}
    function create_if_block(ctx) {
    	let div;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			attr_dev(div, "class", "noselect svelte-1b0sgk0");
    			attr_dev(div, "style", `z-index: ${/*pages*/ ctx[8] + 2}; width: 100%; height: 100%; position: absolute; top: 0px; left: 0px;`);
    			add_location(div, file, 14, 1, 770);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);

    			if (!mounted) {
    				dispose = [
    					listen_dev(div, "mousemove", /*handleMouse*/ ctx[12], false, false, false),
    					listen_dev(div, "mouseleave", /*handleMouse*/ ctx[12], false, false, false),
    					listen_dev(div, "mouseup", /*handleMouse*/ ctx[12], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(14:1) {#if turning}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let t0;
    	let main;
    	let t1;
    	let div0;
    	let t2;
    	let t3;
    	let div1;
    	let main_style_value;
    	let current;
    	let mounted;
    	let dispose;
    	add_render_callback(/*onwindowresize*/ ctx[13]);
    	let each_value = Array(/*pages*/ ctx[8]);
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	let if_block = /*turning*/ ctx[3] && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			t0 = space();
    			main = element("main");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t1 = space();
    			div0 = element("div");
    			t2 = space();
    			if (if_block) if_block.c();
    			t3 = space();
    			div1 = element("div");
    			attr_dev(div0, "class", "noselect svelte-1b0sgk0");
    			attr_dev(div0, "style", `z-index: ${/*pages*/ ctx[8] + 1}; width: 3.5%; height: 100%; position: absolute; top: 0px; left: 0px;`);
    			add_location(div0, file, 12, 1, 545);
    			attr_dev(div1, "class", "noselect svelte-1b0sgk0");
    			attr_dev(div1, "style", `z-index: ${/*pages*/ ctx[8] + 1}; width: 3.5%; height: 100%; position: absolute; top: 0px; left: 96.5%;`);
    			add_location(div1, file, 16, 1, 988);
    			attr_dev(main, "style", main_style_value = `position: relative; width: ${/*w*/ ctx[4] * 0.98}px; height: ${/*h*/ ctx[5] * 0.98}px; overflow: hidden; z-index: -100000;`);
    			add_location(main, file, 3, 0, 110);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t0, anchor);
    			insert_dev(target, main, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(main, null);
    			}

    			append_dev(main, t1);
    			append_dev(main, div0);
    			append_dev(main, t2);
    			if (if_block) if_block.m(main, null);
    			append_dev(main, t3);
    			append_dev(main, div1);
    			/*main_binding*/ ctx[14](main);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(window_1, "resize", /*onwindowresize*/ ctx[13]),
    					listen_dev(document.body, "mousemove", /*handleMouse*/ ctx[12], false, false, false),
    					listen_dev(div0, "mousemove", /*handleMouse*/ ctx[12], false, false, false),
    					listen_dev(div0, "mousedown", /*handleMouse*/ ctx[12], false, false, false),
    					listen_dev(div0, "mouseup", /*handleMouse*/ ctx[12], false, false, false),
    					listen_dev(div1, "mousemove", /*handleMouse*/ ctx[12], false, false, false),
    					listen_dev(div1, "mousedown", /*handleMouse*/ ctx[12], false, false, false),
    					listen_dev(div1, "mouseup", /*handleMouse*/ ctx[12], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*doc, pages, color, intensity, Math, $progress, w*/ 2000) {
    				each_value = Array(/*pages*/ ctx[8]);
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(main, t1);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}

    			if (/*turning*/ ctx[3]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					if_block.m(main, t3);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			if (!current || dirty & /*w, h*/ 48 && main_style_value !== (main_style_value = `position: relative; width: ${/*w*/ ctx[4] * 0.98}px; height: ${/*h*/ ctx[5] * 0.98}px; overflow: hidden; z-index: -100000;`)) {
    				attr_dev(main, "style", main_style_value);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(main);
    			destroy_each(each_blocks, detaching);
    			if (if_block) if_block.d();
    			/*main_binding*/ ctx[14](null);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let w;
    	let h;
    	let $progress;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("App", slots, []);
    	const params = new URLSearchParams(window.location.search);
    	const doc = params.get("doc");
    	const ratio = Number.parseFloat(params.get("ratio"));
    	const pages = Number.parseInt(params.get("pages"));
    	const color = params.get("shadow");
    	const intensity = Number.parseFloat(params.get("shadowIntensity"));
    	let book;
    	let speed = 0.1;
    	let width;
    	let height;
    	let turning = false;
    	let turnDir = 0;
    	let hovering = false;
    	let resetting = false;

    	let progress = tweened(0, {
    		easing: cubicOut,
    		duration: (from, to) => turning ? 1 : Math.abs(from - to) / speed * 1000 + 1
    	});

    	validate_store(progress, "progress");
    	component_subscribe($$self, progress, value => $$invalidate(6, $progress = value));
    	let current = 0;
    	let prev = { x: 0, y: 0, down: false };

    	function handleMouse(e) {
    		if (!book) return;
    		let r = book.getBoundingClientRect();

    		if (e.clientX - r.left < 0) {
    			if (prev.x - r.left >= 0) reset();
    		} else if (e.clientX - r.left > r.width) {
    			if (prev.x - r.left <= r.width) reset();
    		} else if (e.clientY - r.top < 0) {
    			if (prev.y - r.top < 0) reset();
    		} else if (e.clientY - r.top > r.height) {
    			if (prev.y - r.top <= r.height) reset();
    		} else {
    			var pX = prev.x;
    			var wasDown = prev.down;

    			prev = {
    				x: e.clientX,
    				y: e.clientY,
    				down: (e.buttons & 1) == 0
    			};

    			if (wasDown && (e.buttons & 1) == 0) reset(); else if (!wasDown && (e.buttons & 1) > 0) turn();
    			if (pX != e.clientX) move();
    		}

    		prev = {
    			x: e.clientX,
    			y: e.clientY,
    			down: (e.buttons & 1) > 0
    		};
    	}

    	function getX() {
    		let r = book.getBoundingClientRect();
    		return (prev.x - r.left) / r.width;
    	}

    	function turn() {
    		if (turning) return;
    		let x = getX();

    		progress.update(p => {
    			if (x > 0.965 && p < Math.floor(pages * 0.5)) {
    				$$invalidate(3, turning = true);
    				turnDir = -1;
    				hovering = false;
    			} else if (x < 0.035 && p > 0) {
    				$$invalidate(3, turning = true);
    				turnDir = 1;
    				hovering = false;
    			}

    			return p;
    		});
    	}

    	function move() {
    		if (resetting) return;
    		let x = getX();

    		if (turning) {
    			progress.update(p => {
    				if (turnDir < 0) return current + (1 - x); else return current - x;
    			});
    		} else {
    			hovering = true;
    			speed = 0.05;

    			progress.update(p => {
    				if (x > 0.965 && p < Math.floor(pages * 0.5)) {
    					return current + (1 - x);
    				} else if (x < 0.03 && p > 0) return current - x; else return Math.round(p);
    			});
    		}
    	}

    	function reset() {
    		if (resetting) return;
    		speed = 2;
    		resetting = true;

    		progress.update(p => {
    			current = Math.round(p);
    			return current;
    		}).then(() => {
    			resetting = false;
    		});

    		hovering = false;
    		$$invalidate(3, turning = false);
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	function onwindowresize() {
    		$$invalidate(0, width = window_1.innerWidth);
    		$$invalidate(1, height = window_1.innerHeight);
    	}

    	function main_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			book = $$value;
    			$$invalidate(2, book);
    		});
    	}

    	$$self.$capture_state = () => ({
    		Page,
    		tweened,
    		cubicOut,
    		params,
    		doc,
    		ratio,
    		pages,
    		color,
    		intensity,
    		book,
    		speed,
    		width,
    		height,
    		turning,
    		turnDir,
    		hovering,
    		resetting,
    		progress,
    		current,
    		prev,
    		handleMouse,
    		getX,
    		turn,
    		move,
    		reset,
    		w,
    		h,
    		$progress
    	});

    	$$self.$inject_state = $$props => {
    		if ("book" in $$props) $$invalidate(2, book = $$props.book);
    		if ("speed" in $$props) speed = $$props.speed;
    		if ("width" in $$props) $$invalidate(0, width = $$props.width);
    		if ("height" in $$props) $$invalidate(1, height = $$props.height);
    		if ("turning" in $$props) $$invalidate(3, turning = $$props.turning);
    		if ("turnDir" in $$props) turnDir = $$props.turnDir;
    		if ("hovering" in $$props) hovering = $$props.hovering;
    		if ("resetting" in $$props) resetting = $$props.resetting;
    		if ("progress" in $$props) $$invalidate(11, progress = $$props.progress);
    		if ("current" in $$props) current = $$props.current;
    		if ("prev" in $$props) prev = $$props.prev;
    		if ("w" in $$props) $$invalidate(4, w = $$props.w);
    		if ("h" in $$props) $$invalidate(5, h = $$props.h);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*height, width*/ 3) {
    			$$invalidate(4, w = Math.min(height * (ratio * 2), width));
    		}

    		if ($$self.$$.dirty & /*width, height*/ 3) {
    			$$invalidate(5, h = Math.min(width / (ratio * 2), height));
    		}
    	};

    	return [
    		width,
    		height,
    		book,
    		turning,
    		w,
    		h,
    		$progress,
    		doc,
    		pages,
    		color,
    		intensity,
    		progress,
    		handleMouse,
    		onwindowresize,
    		main_binding
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
