
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
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

    const is_client = typeof window !== 'undefined';
    let raf = is_client ? cb => requestAnimationFrame(cb) : noop;

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
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
    function to_number(value) {
        return value === '' ? null : +value;
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
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
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
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
    function add_flush_callback(fn) {
        flush_callbacks.push(fn);
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

    function bind(component, name, callback) {
        const index = component.$$.props[name];
        if (index !== undefined) {
            component.$$.bound[index] = callback;
            callback(component.$$.ctx[index]);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
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
            mount_component(component, options.target, options.anchor);
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
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.32.3' }, detail)));
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
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
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

    /* src\BottomBar.svelte generated by Svelte v3.32.3 */

    const file = "src\\BottomBar.svelte";

    // (22:8) {:else}
    function create_else_block(ctx) {
    	let img;
    	let img_src_value;

    	const block = {
    		c: function create() {
    			img = element("img");
    			if (img.src !== (img_src_value = "./img/pause.svg")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "");
    			attr_dev(img, "class", "svelte-132jjg9");
    			add_location(img, file, 22, 12, 934);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, img, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(img);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(22:8) {:else}",
    		ctx
    	});

    	return block;
    }

    // (20:8) {#if paused}
    function create_if_block(ctx) {
    	let img;
    	let img_src_value;

    	const block = {
    		c: function create() {
    			img = element("img");
    			if (img.src !== (img_src_value = "./img/play.svg")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "");
    			attr_dev(img, "class", "svelte-132jjg9");
    			add_location(img, file, 20, 12, 868);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, img, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(img);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(20:8) {#if paused}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let nav;
    	let div0;
    	let t0;
    	let div1;
    	let input;
    	let input_max_value;
    	let t1;
    	let div2;
    	let t2;
    	let t3;
    	let t4;
    	let mounted;
    	let dispose;

    	function select_block_type(ctx, dirty) {
    		if (/*paused*/ ctx[1]) return create_if_block;
    		return create_else_block;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			nav = element("nav");
    			div0 = element("div");
    			if_block.c();
    			t0 = space();
    			div1 = element("div");
    			input = element("input");
    			t1 = space();
    			div2 = element("div");
    			t2 = text(/*formatedCurrentTime*/ ctx[3]);
    			t3 = text(" / ");
    			t4 = text(/*formatedDuration*/ ctx[4]);
    			attr_dev(div0, "class", "play-pause svelte-132jjg9");
    			add_location(div0, file, 18, 4, 772);
    			attr_dev(input, "type", "range");
    			attr_dev(input, "min", "0");
    			attr_dev(input, "max", input_max_value = Math.round(/*duration*/ ctx[2]));
    			attr_dev(input, "class", "svelte-132jjg9");
    			add_location(input, file, 26, 8, 1032);
    			attr_dev(div1, "class", "track svelte-132jjg9");
    			add_location(div1, file, 25, 4, 1003);
    			attr_dev(div2, "class", "length svelte-132jjg9");
    			add_location(div2, file, 28, 4, 1132);
    			attr_dev(nav, "class", "svelte-132jjg9");
    			add_location(nav, file, 17, 0, 761);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, nav, anchor);
    			append_dev(nav, div0);
    			if_block.m(div0, null);
    			append_dev(nav, t0);
    			append_dev(nav, div1);
    			append_dev(div1, input);
    			set_input_value(input, /*currentTime*/ ctx[0]);
    			append_dev(nav, t1);
    			append_dev(nav, div2);
    			append_dev(div2, t2);
    			append_dev(div2, t3);
    			append_dev(div2, t4);

    			if (!mounted) {
    				dispose = [
    					listen_dev(div0, "click", /*click_handler*/ ctx[5], false, false, false),
    					listen_dev(input, "change", /*input_change_input_handler*/ ctx[6]),
    					listen_dev(input, "input", /*input_change_input_handler*/ ctx[6])
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (current_block_type !== (current_block_type = select_block_type(ctx))) {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(div0, null);
    				}
    			}

    			if (dirty & /*duration*/ 4 && input_max_value !== (input_max_value = Math.round(/*duration*/ ctx[2]))) {
    				attr_dev(input, "max", input_max_value);
    			}

    			if (dirty & /*currentTime*/ 1) {
    				set_input_value(input, /*currentTime*/ ctx[0]);
    			}

    			if (dirty & /*formatedCurrentTime*/ 8) set_data_dev(t2, /*formatedCurrentTime*/ ctx[3]);
    			if (dirty & /*formatedDuration*/ 16) set_data_dev(t4, /*formatedDuration*/ ctx[4]);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(nav);
    			if_block.d();
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

    function formatTime(time) {
    	const sec_num = Math.round(time);
    	let hours = Math.floor(sec_num / 3600);
    	let minutes = Math.floor((sec_num - hours * 3600) / 60);
    	let seconds = sec_num - hours * 3600 - minutes * 60;

    	const finalHours = hours >= 10
    	? hours + ":"
    	: hours > 0 ? "0" + hours + ":" : "";

    	const finalMinutes = minutes >= 10
    	? minutes + ":"
    	: minutes > 0 ? "0" + minutes + ":" : "00:";

    	const finalSeconds = seconds >= 10
    	? seconds
    	: seconds > 0 ? "0" + seconds : "00";

    	return finalHours + finalMinutes + finalSeconds;
    }

    function instance($$self, $$props, $$invalidate) {
    	let formatedCurrentTime;
    	let formatedDuration;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("BottomBar", slots, []);
    	let { currentTime } = $$props;
    	let { duration } = $$props;
    	let { paused } = $$props;
    	const writable_props = ["currentTime", "duration", "paused"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<BottomBar> was created with unknown prop '${key}'`);
    	});

    	const click_handler = () => $$invalidate(1, paused = !paused);

    	function input_change_input_handler() {
    		currentTime = to_number(this.value);
    		$$invalidate(0, currentTime);
    	}

    	$$self.$$set = $$props => {
    		if ("currentTime" in $$props) $$invalidate(0, currentTime = $$props.currentTime);
    		if ("duration" in $$props) $$invalidate(2, duration = $$props.duration);
    		if ("paused" in $$props) $$invalidate(1, paused = $$props.paused);
    	};

    	$$self.$capture_state = () => ({
    		currentTime,
    		duration,
    		paused,
    		formatTime,
    		formatedCurrentTime,
    		formatedDuration
    	});

    	$$self.$inject_state = $$props => {
    		if ("currentTime" in $$props) $$invalidate(0, currentTime = $$props.currentTime);
    		if ("duration" in $$props) $$invalidate(2, duration = $$props.duration);
    		if ("paused" in $$props) $$invalidate(1, paused = $$props.paused);
    		if ("formatedCurrentTime" in $$props) $$invalidate(3, formatedCurrentTime = $$props.formatedCurrentTime);
    		if ("formatedDuration" in $$props) $$invalidate(4, formatedDuration = $$props.formatedDuration);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*currentTime*/ 1) {
    			$$invalidate(3, formatedCurrentTime = formatTime(currentTime));
    		}

    		if ($$self.$$.dirty & /*duration*/ 4) {
    			$$invalidate(4, formatedDuration = formatTime(duration));
    		}
    	};

    	return [
    		currentTime,
    		paused,
    		duration,
    		formatedCurrentTime,
    		formatedDuration,
    		click_handler,
    		input_change_input_handler
    	];
    }

    class BottomBar extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, { currentTime: 0, duration: 2, paused: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "BottomBar",
    			options,
    			id: create_fragment.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*currentTime*/ ctx[0] === undefined && !("currentTime" in props)) {
    			console.warn("<BottomBar> was created without expected prop 'currentTime'");
    		}

    		if (/*duration*/ ctx[2] === undefined && !("duration" in props)) {
    			console.warn("<BottomBar> was created without expected prop 'duration'");
    		}

    		if (/*paused*/ ctx[1] === undefined && !("paused" in props)) {
    			console.warn("<BottomBar> was created without expected prop 'paused'");
    		}
    	}

    	get currentTime() {
    		throw new Error("<BottomBar>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set currentTime(value) {
    		throw new Error("<BottomBar>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get duration() {
    		throw new Error("<BottomBar>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set duration(value) {
    		throw new Error("<BottomBar>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get paused() {
    		throw new Error("<BottomBar>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set paused(value) {
    		throw new Error("<BottomBar>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\CanvasSpectrum.svelte generated by Svelte v3.32.3 */
    const file$1 = "src\\CanvasSpectrum.svelte";

    function create_fragment$1(ctx) {
    	let canvas_1;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			canvas_1 = element("canvas");
    			attr_dev(canvas_1, "width", /*canvasWidth*/ ctx[0]);
    			attr_dev(canvas_1, "height", /*canvasHeight*/ ctx[1]);
    			attr_dev(canvas_1, "class", "svelte-dkugi8");
    			add_location(canvas_1, file$1, 47, 0, 1766);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, canvas_1, anchor);
    			/*canvas_1_binding*/ ctx[9](canvas_1);

    			if (!mounted) {
    				dispose = listen_dev(window, "resize", /*setCanvasSize*/ ctx[3], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*canvasWidth*/ 1) {
    				attr_dev(canvas_1, "width", /*canvasWidth*/ ctx[0]);
    			}

    			if (dirty & /*canvasHeight*/ 2) {
    				attr_dev(canvas_1, "height", /*canvasHeight*/ ctx[1]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(canvas_1);
    			/*canvas_1_binding*/ ctx[9](null);
    			mounted = false;
    			dispose();
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

    function avg(array, start, end) {
    	let sum = 0;
    	array.slice(start, end).forEach(num => sum += num);
    	return sum / (end - start);
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let volumesLength;
    	let spacing;
    	let bassOffset;
    	let trebbleOffset;
    	let halfWidth;
    	let halfHeight;
    	let shorterSideLength;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("CanvasSpectrum", slots, []);
    	let { volumes } = $$props;
    	let canvasWidth = 1000;
    	let canvasHeight = 1000;
    	let canvas;
    	let context;

    	function createPath(ctx, value, index) {
    		const angle = 360 * index / volumesLength * (Math.PI / 180) + Math.PI;
    		const startX = halfWidth + Math.sin(angle) * spacing;
    		const startY = halfHeight + Math.cos(angle) * spacing;
    		const lineLength = spacing + value * (shorterSideLength / 2 - 20) / 255;
    		const endX = halfWidth + Math.sin(angle) * lineLength;
    		const endY = halfHeight + Math.cos(angle) * lineLength;
    		ctx.beginPath();
    		ctx.moveTo(startX, startY);
    		ctx.lineTo(endX, endY);
    		ctx.strokeStyle = `hsl(${180 - 180 * value / 255}, 100%, 50%)`;
    		ctx.stroke();
    	}

    	function render() {
    		context.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);
    		volumes.forEach((volume, i) => createPath(context, volume, i));
    	}

    	function setCanvasSize() {
    		$$invalidate(0, canvasWidth = canvas.offsetWidth);
    		$$invalidate(1, canvasHeight = canvas.offsetHeight);
    	}

    	onMount(() => {
    		context = canvas.getContext("2d");
    		setCanvasSize();
    	});

    	const writable_props = ["volumes"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<CanvasSpectrum> was created with unknown prop '${key}'`);
    	});

    	function canvas_1_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			canvas = $$value;
    			$$invalidate(2, canvas);
    		});
    	}

    	$$self.$$set = $$props => {
    		if ("volumes" in $$props) $$invalidate(4, volumes = $$props.volumes);
    	};

    	$$self.$capture_state = () => ({
    		onMount,
    		volumes,
    		canvasWidth,
    		canvasHeight,
    		canvas,
    		context,
    		avg,
    		createPath,
    		render,
    		setCanvasSize,
    		volumesLength,
    		spacing,
    		bassOffset,
    		trebbleOffset,
    		halfWidth,
    		halfHeight,
    		shorterSideLength
    	});

    	$$self.$inject_state = $$props => {
    		if ("volumes" in $$props) $$invalidate(4, volumes = $$props.volumes);
    		if ("canvasWidth" in $$props) $$invalidate(0, canvasWidth = $$props.canvasWidth);
    		if ("canvasHeight" in $$props) $$invalidate(1, canvasHeight = $$props.canvasHeight);
    		if ("canvas" in $$props) $$invalidate(2, canvas = $$props.canvas);
    		if ("context" in $$props) context = $$props.context;
    		if ("volumesLength" in $$props) $$invalidate(6, volumesLength = $$props.volumesLength);
    		if ("spacing" in $$props) spacing = $$props.spacing;
    		if ("bassOffset" in $$props) $$invalidate(7, bassOffset = $$props.bassOffset);
    		if ("trebbleOffset" in $$props) $$invalidate(8, trebbleOffset = $$props.trebbleOffset);
    		if ("halfWidth" in $$props) halfWidth = $$props.halfWidth;
    		if ("halfHeight" in $$props) halfHeight = $$props.halfHeight;
    		if ("shorterSideLength" in $$props) shorterSideLength = $$props.shorterSideLength;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*volumes*/ 16) {
    			$$invalidate(6, volumesLength = volumes.length);
    		}

    		if ($$self.$$.dirty & /*volumes, volumesLength*/ 80) {
    			spacing = avg(volumes, 0, volumesLength) * 40 / 255;
    		}

    		if ($$self.$$.dirty & /*volumes*/ 16) {
    			$$invalidate(7, bassOffset = avg(volumes, 0, 20) * 30 / 255 - 15);
    		}

    		if ($$self.$$.dirty & /*volumes, volumesLength*/ 80) {
    			$$invalidate(8, trebbleOffset = avg(volumes, volumesLength / 1.2, volumesLength / 1.5) * 30 / 255 - 15);
    		}

    		if ($$self.$$.dirty & /*canvasWidth, trebbleOffset*/ 257) {
    			halfWidth = canvasWidth / 2 + trebbleOffset;
    		}

    		if ($$self.$$.dirty & /*canvasHeight, bassOffset*/ 130) {
    			halfHeight = canvasHeight / 2 + bassOffset;
    		}

    		if ($$self.$$.dirty & /*canvasWidth, canvasHeight*/ 3) {
    			shorterSideLength = canvasWidth > canvasHeight ? canvasHeight : canvasWidth;
    		}
    	};

    	return [
    		canvasWidth,
    		canvasHeight,
    		canvas,
    		setCanvasSize,
    		volumes,
    		render,
    		volumesLength,
    		bassOffset,
    		trebbleOffset,
    		canvas_1_binding
    	];
    }

    class CanvasSpectrum extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { volumes: 4, render: 5 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "CanvasSpectrum",
    			options,
    			id: create_fragment$1.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*volumes*/ ctx[4] === undefined && !("volumes" in props)) {
    			console.warn("<CanvasSpectrum> was created without expected prop 'volumes'");
    		}
    	}

    	get volumes() {
    		throw new Error("<CanvasSpectrum>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set volumes(value) {
    		throw new Error("<CanvasSpectrum>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get render() {
    		return this.$$.ctx[5];
    	}

    	set render(value) {
    		throw new Error("<CanvasSpectrum>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\App.svelte generated by Svelte v3.32.3 */

    const { cancelAnimationFrame: cancelAnimationFrame_1 } = globals;
    const file$2 = "src\\App.svelte";

    function create_fragment$2(ctx) {
    	let main;
    	let input;
    	let t0;
    	let br;
    	let t1;
    	let audio;
    	let audio_updating = false;
    	let audio_animationframe;
    	let audio_is_paused = true;
    	let t2;
    	let canvasspectrum;
    	let updating_render;
    	let t3;
    	let bottombar;
    	let updating_currentTime;
    	let updating_paused;
    	let current;
    	let mounted;
    	let dispose;

    	function audio_timeupdate_handler() {
    		cancelAnimationFrame_1(audio_animationframe);

    		if (!audio.paused) {
    			audio_animationframe = raf(audio_timeupdate_handler);
    			audio_updating = true;
    		}

    		/*audio_timeupdate_handler*/ ctx[9].call(audio);
    	}

    	function canvasspectrum_render_binding(value) {
    		/*canvasspectrum_render_binding*/ ctx[12](value);
    	}

    	let canvasspectrum_props = { volumes: /*volumes*/ ctx[0] };

    	if (/*render*/ ctx[5] !== void 0) {
    		canvasspectrum_props.render = /*render*/ ctx[5];
    	}

    	canvasspectrum = new CanvasSpectrum({
    			props: canvasspectrum_props,
    			$$inline: true
    		});

    	binding_callbacks.push(() => bind(canvasspectrum, "render", canvasspectrum_render_binding));

    	function bottombar_currentTime_binding(value) {
    		/*bottombar_currentTime_binding*/ ctx[13](value);
    	}

    	function bottombar_paused_binding(value) {
    		/*bottombar_paused_binding*/ ctx[14](value);
    	}

    	let bottombar_props = { duration: /*duration*/ ctx[3] };

    	if (/*currentTime*/ ctx[2] !== void 0) {
    		bottombar_props.currentTime = /*currentTime*/ ctx[2];
    	}

    	if (/*paused*/ ctx[4] !== void 0) {
    		bottombar_props.paused = /*paused*/ ctx[4];
    	}

    	bottombar = new BottomBar({ props: bottombar_props, $$inline: true });
    	binding_callbacks.push(() => bind(bottombar, "currentTime", bottombar_currentTime_binding));
    	binding_callbacks.push(() => bind(bottombar, "paused", bottombar_paused_binding));

    	const block = {
    		c: function create() {
    			main = element("main");
    			input = element("input");
    			t0 = space();
    			br = element("br");
    			t1 = space();
    			audio = element("audio");
    			t2 = space();
    			create_component(canvasspectrum.$$.fragment);
    			t3 = space();
    			create_component(bottombar.$$.fragment);
    			attr_dev(input, "type", "file");
    			attr_dev(input, "accept", ".mp3");
    			add_location(input, file$2, 51, 4, 1462);
    			add_location(br, file$2, 52, 4, 1526);
    			if (/*duration*/ ctx[3] === void 0) add_render_callback(() => /*audio_durationchange_handler*/ ctx[10].call(audio));
    			add_location(audio, file$2, 54, 4, 1587);
    			add_location(main, file$2, 50, 0, 1451);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, input);
    			append_dev(main, t0);
    			append_dev(main, br);
    			append_dev(main, t1);
    			append_dev(main, audio);
    			/*audio_binding*/ ctx[8](audio);
    			append_dev(main, t2);
    			mount_component(canvasspectrum, main, null);
    			append_dev(main, t3);
    			mount_component(bottombar, main, null);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(input, "input", /*handleChange*/ ctx[6], false, false, false),
    					listen_dev(audio, "timeupdate", audio_timeupdate_handler),
    					listen_dev(audio, "durationchange", /*audio_durationchange_handler*/ ctx[10]),
    					listen_dev(audio, "play", /*audio_play_pause_handler*/ ctx[11]),
    					listen_dev(audio, "pause", /*audio_play_pause_handler*/ ctx[11])
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (!audio_updating && dirty & /*currentTime*/ 4 && !isNaN(/*currentTime*/ ctx[2])) {
    				audio.currentTime = /*currentTime*/ ctx[2];
    			}

    			audio_updating = false;

    			if (dirty & /*paused*/ 16 && audio_is_paused !== (audio_is_paused = /*paused*/ ctx[4])) {
    				audio[audio_is_paused ? "pause" : "play"]();
    			}

    			const canvasspectrum_changes = {};
    			if (dirty & /*volumes*/ 1) canvasspectrum_changes.volumes = /*volumes*/ ctx[0];

    			if (!updating_render && dirty & /*render*/ 32) {
    				updating_render = true;
    				canvasspectrum_changes.render = /*render*/ ctx[5];
    				add_flush_callback(() => updating_render = false);
    			}

    			canvasspectrum.$set(canvasspectrum_changes);
    			const bottombar_changes = {};
    			if (dirty & /*duration*/ 8) bottombar_changes.duration = /*duration*/ ctx[3];

    			if (!updating_currentTime && dirty & /*currentTime*/ 4) {
    				updating_currentTime = true;
    				bottombar_changes.currentTime = /*currentTime*/ ctx[2];
    				add_flush_callback(() => updating_currentTime = false);
    			}

    			if (!updating_paused && dirty & /*paused*/ 16) {
    				updating_paused = true;
    				bottombar_changes.paused = /*paused*/ ctx[4];
    				add_flush_callback(() => updating_paused = false);
    			}

    			bottombar.$set(bottombar_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(canvasspectrum.$$.fragment, local);
    			transition_in(bottombar.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(canvasspectrum.$$.fragment, local);
    			transition_out(bottombar.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			/*audio_binding*/ ctx[8](null);
    			destroy_component(canvasspectrum);
    			destroy_component(bottombar);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("App", slots, []);
    	let volumes = new Uint8Array();
    	let data = new Uint8Array();
    	let animation;
    	let audioElement;
    	let currentTime = 0;
    	let duration = 0;
    	let paused = true;
    	let analyser;
    	let render;

    	function startAnalyzer() {
    		let audioCtx = new AudioContext();
    		analyser = audioCtx.createAnalyser();
    		let source = audioCtx.createMediaElementSource(audioElement);
    		source.connect(analyser);
    		source.connect(audioCtx.destination);
    		$$invalidate(7, data = new Uint8Array(analyser.frequencyBinCount));
    		analyser.fftSize = 4096;
    		analyser.getByteFrequencyData(data);
    		if (data.length) $$invalidate(7, data = new Uint8Array(analyser.frequencyBinCount));
    	}

    	function handleChange(e) {
    		let file = e.target.files[0];
    		if (!file) return;
    		if (!analyser) startAnalyzer();
    		$$invalidate(1, audioElement.src = URL.createObjectURL(file), audioElement);
    		$$invalidate(4, paused = true);

    		if (animation) {
    			cancelAnimationFrame(animation);
    			animation = undefined;
    		}

    		function check() {
    			if (audioElement.paused) {
    				animation = requestAnimationFrame(check);
    				return;
    			}

    			render();
    			analyser.getByteFrequencyData(data);
    			$$invalidate(7, data);
    			animation = requestAnimationFrame(check);
    		}

    		check();
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	function audio_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			audioElement = $$value;
    			$$invalidate(1, audioElement);
    		});
    	}

    	function audio_timeupdate_handler() {
    		currentTime = this.currentTime;
    		$$invalidate(2, currentTime);
    	}

    	function audio_durationchange_handler() {
    		duration = this.duration;
    		$$invalidate(3, duration);
    	}

    	function audio_play_pause_handler() {
    		paused = this.paused;
    		$$invalidate(4, paused);
    	}

    	function canvasspectrum_render_binding(value) {
    		render = value;
    		$$invalidate(5, render);
    	}

    	function bottombar_currentTime_binding(value) {
    		currentTime = value;
    		$$invalidate(2, currentTime);
    	}

    	function bottombar_paused_binding(value) {
    		paused = value;
    		$$invalidate(4, paused);
    	}

    	$$self.$capture_state = () => ({
    		BottomBar,
    		CanvasSpectrum,
    		volumes,
    		data,
    		animation,
    		audioElement,
    		currentTime,
    		duration,
    		paused,
    		analyser,
    		render,
    		startAnalyzer,
    		handleChange
    	});

    	$$self.$inject_state = $$props => {
    		if ("volumes" in $$props) $$invalidate(0, volumes = $$props.volumes);
    		if ("data" in $$props) $$invalidate(7, data = $$props.data);
    		if ("animation" in $$props) animation = $$props.animation;
    		if ("audioElement" in $$props) $$invalidate(1, audioElement = $$props.audioElement);
    		if ("currentTime" in $$props) $$invalidate(2, currentTime = $$props.currentTime);
    		if ("duration" in $$props) $$invalidate(3, duration = $$props.duration);
    		if ("paused" in $$props) $$invalidate(4, paused = $$props.paused);
    		if ("analyser" in $$props) analyser = $$props.analyser;
    		if ("render" in $$props) $$invalidate(5, render = $$props.render);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*data*/ 128) {
    			$$invalidate(0, volumes = data.filter(vol => vol > 0));
    		}
    	};

    	return [
    		volumes,
    		audioElement,
    		currentTime,
    		duration,
    		paused,
    		render,
    		handleChange,
    		data,
    		audio_binding,
    		audio_timeupdate_handler,
    		audio_durationchange_handler,
    		audio_play_pause_handler,
    		canvasspectrum_render_binding,
    		bottombar_currentTime_binding,
    		bottombar_paused_binding
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$2.name
    		});
    	}
    }

    const app = new App({
        target: document.body,
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
