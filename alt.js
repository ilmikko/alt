(function(){
	var extend=function(a,b){
		for (var g in b){a[g]=b[g];} return a;
	}
	var type=function(a){
		if (a instanceof Array) return "enumerable";
		else if (a instanceof Node) return "node";
		var t=typeof a;
		if (t==="object"&&a){
			if (!isNaN(a.length)&&a.length>=0) return "enumerable";
			if (!isNaN(a.nodeType)) return "node";
		}
		return t;
	};

	var get=function get(anything,o){
		var t=type(anything);
		if (anything==null) return;

		if (t==="node") {
			return new Element(anything);
		} else if (t==="enumerable") {
			return alt.apply(this,anything);
		} else if (t==="string") {
			return alt.apply(this,toNodes(anything));
		} else if (t==="object") {
			if (anything._isAltElement) return anything;
			else throw new Error("Cannot parse object. "+JSON.stringify(anything));
		} else throw new Error("Cannot parse type: %s",t);
	}

	var toNodes=function(anything){
		var t=type(anything);
		if (t==='enumerable'){
			var arr=[];
			for (var g=0,glen=anything.length;g<glen;g++){
				Array.prototype.push.apply(arr,toNodes(anything[g]));
			}
			return arr;
		} else if (t==='object'){
			if ('_toNode' in anything){
				return [anything._toNode()];
			}else if ('_toAlt' in anything){
				return [anything._toAlt()._toNode()];
			}else if (anything instanceof Node){
				return [anything];
			}else console.warn("Cannot make node: unknown object "+JSON.stringify(anything));
		} else if (t==='string'){
			if (anything[0]==='>'){
				// Creating elements
				return [document.createElement(anything.slice(1))];
			}else{
				// Getting elements
				try{
					var arr=[];
					Array.prototype.push.apply(arr,document.querySelectorAll(anything));
					return arr;
				}
				catch(err){
					console.error("Selector '%s' throws an error",anything);
					console.log(err);
				}
			}
		} else {
			console.error("Cannot turn to nodes, unknown type: "+t);
			return [];
		}
	}

	var fromCamelCase=function(str){
		return str.replace(/[A-Z]/g,function(_){return '-'+_.toLowerCase();});
	}

	var alt=function(anything){
		var t=type(anything);
		if (arguments.length==1){
			return get(anything)||new Group();
		}else{
			var o=new Group();
			for (var g=0,glen=arguments.length;g<glen;g++){
				var e=get(arguments[g]);
				if (e) Group.addElement(o,e);
			}
			return o;
		}
	}
	extend(alt,{
		extend:extend,
		load:function(callback){
			window.addEventListener('load',callback);
		},
		supports:{},
		get:get,
		toNodes:toNodes
	});

	// Check experimental

	var experimental={};

	// fullscreen
	var e=document;
	alt.supports.fullscreen=true;
	if (e.documentElement.requestFullscreen){
		console.log("Fullscreen support: Native");
		experimental.requestFullscreen=e.documentElement.requestFullscreen;
		experimental.exitFullscreen=e.exitFullscreen;
		Object.defineProperty(experimental,'fullscreenElement',{
			get:function(){
				return document.fullscreenElement;
			}
		});
	}else if (e.documentElement.webkitRequestFullscreen){
		console.log("Fullscreen support: webkit");
		experimental.requestFullscreen=e.documentElement.webkitRequestFullscreen;
		experimental.exitFullscreen=e.webkitExitFullscreen;
		Object.defineProperty(experimental,'fullscreenElement',{
			get:function(){
				return document.webkitFullscreenElement;
			}
		});
	}else if (e.documentElement.mozRequestFullScreen){
		console.log("Fullscreen support: mozilla");
		experimental.requestFullscreen=e.documentElement.mozRequestFullScreen;
		experimental.exitFullscreen=e.mozCancelFullScreen;
		Object.defineProperty(experimental,'fullscreenElement',{
			get:function(){
				return document.mozFullScreenElement;
			}
		});
	}else if (e.documentElement.msRequestFullscreen){
		console.log("Fullscreen support: msie");
		experimental.requestFullscreen=e.documentElement.msRequestFullscreen;
		experimental.exitFullscreen=e.msExitFullscreen;
		Object.defineProperty(experimental,'fullscreenElement',{
			get:function(){
				return document.msFullscreenElement;
			}
		});
	}else{
		console.warn("Fullscreen support: NOT SUPPORTED");
		alt.supports.fullscreen=false;
	}

	function Element(e){
		this.e=e;
		this._event={};
	}
	Element.prototype={
		_isAltElement:true,
		_toNode:function(){
			return this.e;
		},
		$:function(){
			return this.get.apply(this,arguments);
		},
		append:function(){
			for (var g=0,glen=arguments.length;g<glen;g++){
				var nodes=toNodes(arguments[g]);
				for (var h=0,hlen=nodes.length;h<hlen;h++){
					this.e.appendChild(nodes[h]);
				}
			}
			return this;
		},
		clear:function(){
			var e=this.e;
			while(e.firstChild) e.removeChild(e.firstChild);
			return this;
		},
		click:function(){
			return this.trigger('click');
		},
		checked:function(v){
			return this.prop("checked",v);
		},
		children:function(){
			return alt(this.e.children);
		},
		css:function(o,finish){
			/*
				finish is a callback function that gets executed whenever
				the css transition gets finished.

				the transition isn't always instantaneous - as we might have a "transition" property of 1 second, etc.
				*/
			var attach=false;
			if (finish){
				// Check here if we need to attach an event listener.
				var c=window.getComputedStyle(this.e),ps=c.transitionProperty.split(/,\s+/);

				// if any of the properties in ps are keys in o, we need to attach an event listener
				for (var g=0,glen=ps.length;g<glen;g++){
					if (ps[g] in o){
						attach=true;
						break;
					}
				}

				if (attach) {
					// Attach a one time event
					var self=this;
					this.one("webkitTransitionEnd",function(){
						finish.call(self);
					});
				}
			}

			extend(this.e.style,o);

			if (finish&&!attach){
				// if we have nothing to attach to, we can fire the event immediately.
				finish.call(this);
			}

			return this;
		},
		extend:function(obj){
			extend(this,obj);
			return this;
		},
		data:function(data){
			for (var id in data) this.e.setAttribute('data-'+fromCamelCase(id),data[id]);
			return this;
		},
		focus:function(){
			return this.trigger('focus');
		},
		isFullscreen:function(){
			return experimental.fullscreenElement==this.e;
		},
		fullscreen:function(force){
			if (force==null) force=!this.isFullscreen();

			if (force){
				experimental.requestFullscreen.call(this.e);
			}else{
				experimental.exitFullscreen.call(document);
			}

			return this;
		},
		get:function(query){
			try{
				return alt(this.e.querySelectorAll(query));
			}
			catch(err){
				console.error("Selector '%s' throws an error",query);
				console.log(err);
			}
		},
		html:function(html){
			return this.prop('innerHTML',html);
		},
		on:function(name,callback){
			// Ease of use
			if (type(name)=='enumerable'){
				for (var g=0,gg=name.length;g<gg;g++) this.on(name[g],callback);
				return this;
			}

			var self=this;
			if (!(name in this._event)) this._event[name]=[];

			var wrapper=function(evt){callback.call(self,evt);};
			this.e.addEventListener(name,wrapper);

			this._event[name].push({name:name,callback:callback,wrapper:wrapper});

			return this;
		},
		off:function(name,callback){
			// Ease of use
			if (type(name)=='enumerable'){
				for (var g=0,gg=name.length;g<gg;g++) this.off(name[g],callback);
				return this;
			}

			var evts=this._event[name]||[];
			if (callback){
				var removed=false;
				for (var g=0;g<evts.length;g++){
					if (name==evts[g].name&&callback==evts[g].callback){
						this.e.removeEventListener(evts[g].name,evts[g].wrapper);
						removed=true;
						evts.splice(g,1);
						g--;
						continue;
					}
				}

				if (!removed){
					// Fallback, works in the case where this event listener was added without alt
					// Why would you do that though?
					this.e.removeEventListener(name,callback);
				}
			}else{
				// Remove all
				for (var g=0,gg=evts.length;g<gg;g++){
					this.e.removeEventListener(evts[g].name,evts[g].wrapper);
				}
				this._event[name]=[];
			}
			return this;
		},
		one:function(name,callback){
			// Ease of use
			if (type(name)=='enumerable'){
				for (var g=0,gg=name.length;g<gg;g++) this.one(name[g],callback);
				return this;
			}

			this.on(name,function listen(evt){
				this.off(name,listen);
				callback.call(this,evt);
			});
			return this;
		},
		fire:function(name,evt){
			// Ease of use
			if (type(name)=='enumerable'){
				for (var g=0,gg=name.length;g<gg;g++) this.fire(name[g],evt);
				return this;
			}

			if (!evt) evt={};

			// Fire custom events as well, in which case do not fire using DOM
			if (name in this._event){
				var events = this._event[name];
				for (var g=0,gg=events.length;g<gg;g++) events[g].wrapper(evt);
			}else{
				// Fall back to event firing
				if (document.createEvent) {
					var event = document.createEvent("HTMLEvents");
					event.initEvent(name, true, true);
				}else{
					var event = document.createEventObject();
					event.eventType = name;
				}

				event.eventName = name;

				if (document.createEvent) {
					this.e.dispatchEvent(event);
				}else{
					this.e.fireEvent("on"+event.eventType, event);
				}
			}
		},
		prop:function(id,v){
			// Allow people to do obj.prop({key:value,key2:value2}) for easy assignment (never returns anything)
			if (typeof id==='object'&&v==null) {
				for (var g in id) this.prop(g,id[g]);
				return this;
			}

			var t=typeof v;
			if (t==="string"||t==="boolean"||t==="number"){
				this.e[id]=v;
			}else{
				return this.e[id];
			}
			return this;
		},
		play:function(){
			return this.trigger('play');
		},
		pause:function(){
			return this.trigger('pause');
		},
		load:function(){
			return this.trigger('load');
		},
		remove:function(){
			this.e.parentNode.removeChild(this.e);
			return this;
		},
		text:function(text){
			return this.prop('textContent',text);
		},
		set:function(o){
			for (var g in o) {
				if (type(o[g])==='boolean'){
					if (o[g]){
						this.e.setAttribute(g,'');
					}else{
						this.e.removeAttribute(g);
					}
				}else this.e.setAttribute(g,o[g]);
			}
			return this;
		},
		class:function(classes){
			if (!classes) return this;
			classes=classes.split(/\s+/);
			return this.addClass.apply(this,classes);
		},
		toggleClass:function(name){
			if (arguments.length==1){
				this.e.classList.toggle(name);
			}else{
				for (var g=0,glen=arguments.length;g<glen;g++) this.toggleClass(arguments[g]);
			}
			return this;
		},
		addClass:function(name){
			if (arguments.length==1){
				this.e.classList.add(name);
			}else{
				for (var g=0,glen=arguments.length;g<glen;g++) this.addClass(arguments[g]);
			}
			return this;
		},
		hasClass:function(name){
			return this.e.classList.contains(name);
		},
		removeClass:function(name){
			if (arguments.length==1){
				this.e.classList.remove(name);
			}else{
				for (var g=0,glen=arguments.length;g<glen;g++) this.removeClass(arguments[g]);
			}
			return this;
		},
		select:function(){
			return this.trigger('select');
		},
		trigger:function(name){
			if (!(name in this.e)) console.error("Can't trigger '"+name+"', not found in element");
			else if (typeof this.e[name]!=='function') console.error("Can't trigger '"+name+"', not a function");
			else {
				this.e[name]();
			}
			return this;
		},
		value:function(txt){
			return this.prop("value",txt);
		},
		with:function(properties){
			var success=(function iterate(o,p){
				for (var g in p){
					if (g in o){
						if (typeof o[g]!=='object'){
							return o[g]==p[g];
						};
						if (iterate(o[g],p[g])) continue;
					}
					return false;
				}
				return true;
			})(this.e,properties);
			if (success) return this; else return new Group();
		}
	};

	function Group(){
		this.length=0;
	}
	Group.prototype={
		_isAltElement:true,
		_isAltGroup:true,
		_toNode:function(){
			var df=document.createDocumentFragment();
			for (var g=0,glen=this.length;g<glen;g++){
				df.appendChild(this[g]._toNode());
			}
			return df;
		},
		each:function(callback){
			for (var g=0,glen=this.length;g<glen;g++){
				callback.call(this[g],g);
			}
			return this;
		},
		with:function(obj){
			var matches=new Group();
			this.each(function(){
				Group.addElements(matches,[this.with(obj)]);
			});
			return matches;
		}
	};
	extend(Group,{
		addElement:function(o,e){
			o[o.length++]=e;
		},
		addElements:function(o,e){
			for (var g=0,glen=e.length;g<glen;g++){
				o[o.length++]=e[g];
			}
		},
		addGroup:function(o,e){
			e.each(function(){
				o[o.length++]=this;
			});
		}
	});

	var p=Element.prototype;
	for (var g in p){
		if (g in Group.prototype) continue;
		Group.prototype[g]=(function(g){
			return function(){
				var _args=arguments;
				return this.each(function(){
					this[g].apply(this,_args);
				});
			}
		})(g);
	}

	if (!("$" in window)){
		window['$']=alt;
	} else if (!(alt in window)){
		window['alt']=alt;
	}
})();
