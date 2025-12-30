// ==UserScript==
// @name         Nexa
// @namespace    http://tampermonkey.net/
// @version      0.1.4
// @description  Automatically bypasses links
// @author       nullcrisis
// @updateURL    https://github.com/nullcrisis/Nexa/raw/refs/heads/main/Nexa.js
// @downloadURL  https://github.com/nullcrisis/Nexa/raw/refs/heads/main/Nexa.js
// @match        https://work.ink/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=work.ink
// @run-at       document-start
// @license      MIT
// ==/UserScript==
//
(function () {
	'use strict';
	//
	const DEBUG = false;
	//
	const OldLog = unsafeWindow.console.log;
	const OldWarn = unsafeWindow.console.warn;
	const OldError = unsafeWindow.console.error;
	//
	function Log(...Args) {
		if (DEBUG) OldLog('[Nexa]', ...Args);
	}
	function Warn(...Args) {
		if (DEBUG) OldWarn('[Nexa]', ...Args);
	}
	function Error(...Args) {
		if (DEBUG) OldError('[Nexa]', ...Args);
	}
	//
	if (DEBUG) unsafeWindow.console.clear = function () {};
	//
	const Notification = unsafeWindow.document.createElement('div');
	Object.assign(Notification.style, {
		position: 'fixed',
		bottom: '20px',
		left: '20px',
		background: 'rgba(28,28,28,0.97)',
		color: '#fff',
		padding: '12px 20px',
		borderRadius: '10px',
		display: 'flex',
		flexDirection: 'column',
		alignItems: 'center',
		fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
		zIndex: '999999',
		minWidth: '180px',
		boxShadow: '0 6px 20px rgba(0,0,0,0.45)',
	});
	//
	const Status = unsafeWindow.document.createElement('div');
	Status.textContent = 'Solve Captcha 2 Continue';
	Object.assign(Status.style, {
		fontSize: '14px',
		color: '#ccc',
		textAlign: 'center',
		wordBreak: 'break-word',
	});
	Notification.append(Status);
	unsafeWindow.document.documentElement.appendChild(Notification);
	//
	Log('Solve Captcha 2 Continue');
	//
	const Mapping = {
		Info: ['onLinkInfo'],
		Dest: ['onLinkDestination'],
	};
	//
	function Resolve(Obj, Candidates) {
		if (!Obj || typeof Obj !== 'object' || !Array.isArray(Candidates)) {
			return { Fn: null, Index: -1, Name: null };
		}
		//
		for (let i = 0; i < Candidates.length; i++) {
			const Name = Candidates[i];
			const Fn = Obj[Name];
			//
			if (typeof Fn === 'function') {
				return {
					Fn: Fn,
					Index: i,
					Name: Name,
				};
			}
		}
		return { Fn: null, Index: -1, Name: null };
	}
	//
	function Compose(Obj) {
		if (!Obj || typeof Obj !== 'object') {
			return { Fn: null, Name: null, Index: -1 };
		}
		//
		const Entries = Object.entries(Obj);
		for (let i = 0; i < Entries.length; i++) {
			const [Key, Value] = Entries[i];
			//
			if (typeof Value === 'function' && Value.length === 2) {
				return {
					Fn: Value,
					Name: Key,
					Index: i,
				};
			}
		}
		return { Fn: null, Name: null, Index: -1 };
	}
	//
	let _Session, _Send, _Info, _Dest = undefined;
	//
	function Schema() {
		return {
			PING: 'c_ping',
			ADBLOCKER_DETECTED: 'c_adblocker_detected',
			TURNSTILE_RESPONSE: 'c_turnstile_response',
			SOCIAL_STARTED: 'c_social_started',
		};
	}
	//
	function Relay() {
		const Packets = Schema();
		return function (...Args) {
			const Type = Args[0];
			const Data = Args[1];
			//
			if (Type !== Packets.PING) {
				Log('Sent:', Type, Data);
			}
			//
			if (Type === Packets.ADBLOCKER_DETECTED) {
				Warn('Adblocker Blocked');
				return;
			}
			//
			if (_Session && _Session.linkInfo && Type === Packets.TURNSTILE_RESPONSE) {
				const Result = _Send.apply(this, Args);
				//
				Status.textContent = 'Captcha Solved, Bypassing..';
				Log('Captcha Solved');
				//
				for (const Social of _Session.linkInfo.socials) {
					_Send.call(this, Packets.SOCIAL_STARTED, { url: Social.url });
				}
				//
				for (const Monetization of _Session.monetizations) {
					Log('Processing monetization:', Monetization);
					const Compose = Monetization.sendMessage;
					//
					switch (Monetization.id) {
						case 22:
							// readArticles2
							Compose.call(Monetization, {
								event: 'read',
							});
							//
							break;
						//
						case 25:
							// operaGX
							Compose.call(Monetization, {
								event: 'start',
							});
							//
							Compose.call(Monetization, {
								event: 'installClicked',
							});
							//
							fetch('/_api/v2/affiliate/operaGX', {
								method: 'GET',
								mode: 'no-cors',
							});
							//
							setTimeout(() => {
								fetch('https://work.ink/_api/v2/callback/operaGX', {
									method: 'POST',
									mode: 'no-cors',
									headers: {
										'Content-Type': 'application/json',
									},
									body: JSON.stringify({
										noteligible: true,
									}),
								});
							}, 5000);
							//
							break;
						//
						case 34:
						case 71:
							// norton, externalArticles
							Compose.call(Monetization, {
								event: 'start',
							});
							Compose.call(Monetization, {
								event: 'installClicked',
							});
							break;
						//
						case 45:
						case 57:
							// pdfeditor, betterdeals
							Compose.call(Monetization, {
								event: 'installed',
							});
							//
							break;

						//
						default:
							Log('Unknown Monetization:', typeof Monetization, Monetization);
							//
							break;
					}
				}
				return Result;
			}
			//
			return _Send.apply(this, Args);
		};
	}
	//
	function Inspect() {
		return function (...Args) {
			const Link = Args[0];
			//
			Log('Link Info:', Link);
			//
			Object.defineProperty(Link, 'isAdblockEnabled', {
				get() {
					return false;
				},
				set(NewValue) {
					Log('Attempt Set IsAdblock:', NewValue);
				},
				configurable: false,
				enumerable: true,
			});
			//
			return _Info.apply(this, Args);
		};
	}
	//
	function Redirect() {
		return function (...Args) {
			const Payload = Args[0];
			//
			Log('Link Dest:', Payload);
			//
			Status.textContent = 'Redirecting...';
			window.location.href = Payload.url;
			//
			return _Dest.apply(this, Args);
		};
	}
	//
	function Session() {
		const Send = Compose(_Session);
		const Info = Resolve(_Session, Mapping.Info);
		const Dest = Resolve(_Session, Mapping.Dest);
		//
		_Send = Send.Fn;
		_Info = Info.Fn;
		_Dest = Dest.Fn;
		//
		const RelayObj = Relay();
		const InspectObj = Inspect();
		const RedirectObj = Redirect();
		//
		Object.defineProperty(_Session, Send.Name, {
			get() {
				return RelayObj;
			},
			set(NewValue) {
				_Send = NewValue;
			},
			configurable: false,
			enumerable: true,
		});
		//
		Object.defineProperty(_Session, Info.Name, {
			get() {
				return InspectObj;
			},
			set(NewValue) {
				_Info = NewValue;
			},
			configurable: false,
			enumerable: true,
		});
		//
		Object.defineProperty(_Session, Dest.Name, {
			get() {
				return RedirectObj;
			},
			set(NewValue) {
				_Dest = NewValue;
			},
			configurable: false,
			enumerable: true,
		});
		//
		Log(`Session Proxies: ${Send.Name}, ${Info.Name}, ${Dest.Name}`);
	}
	//
	function Validate(Object, Property, Value, Receiver) {
		Log('Validate:', Property, Value);
		//
		if (
			Value &&
			typeof Value === 'object' &&
			Compose(Value).Fn &&
			Resolve(Value, Mapping.Info).Fn &&
			Resolve(Value, Mapping.Dest).Fn &&
			!_Session
		) {
			_Session = Value;
			Log('Intercepted Session:', _Session);
			Session();
		}
		//
		return Reflect.set(Object, Property, Value, Receiver);
	}
	//
	function Wrap(Component) {
		return new Proxy(Component, {
			construct(Target, Args) {
				const Result = Reflect.construct(Target, Args);
				Log('Component:', Target, Args, Result);
				//
				if (Result && Result.$$ && Result.$$.ctx) {
					Result.$$.ctx = new Proxy(Result.$$.ctx, { set: Validate });
				}
				//
				return Result;
			},
		});
	}
	//
	function Channel(Result) {
		return new Proxy(Result, {
			get(Target, Property, Receiver) {
				if (Property === 'component') {
					const Component = Target.component;
					return Component ? Wrap(Component) : undefined;
				}
				return Reflect.get(Target, Property, Receiver);
			},
		});
	}
	//
	function Await(Node) {
		return async (...Args) => {
			if (typeof Node !== 'function') {
				return null;
			}
			//
			const Result = await Node(...Args);
			Log('Node:', Result);
			//
			return Result ? Channel(Result) : Result;
		};
	}
	//
	function Intercept(Kit) {
		if (!Kit || typeof Kit !== 'object') return [false, Kit];
		//
		const Start = Kit.start;
		if (typeof Start !== 'function') return [false, Kit];
		//
		const ProxyKit = new Proxy(Kit, {
			get(Target, Property, Receiver) {
				if (Property === 'start') {
					return function (...Args) {
						const Module = Args[0];
						const Options = Args[2];
						//
						if (
							Module &&
							typeof Module === 'object' &&
							Module.nodes &&
							typeof Module.nodes === 'object' &&
							Options &&
							typeof Options === 'object' &&
							Array.isArray(Options.node_ids)
						) {
							const NodeId = Options.node_ids[1];
							const Node = Module.nodes[NodeId];

							if (typeof Node === 'function') {
								Module.nodes[NodeId] = Await(Node);
							}
						}
						//
						Log('Kit.Start Hooked', Options);
						//
						return Start.apply(this, Args);
					};
				}
				return Reflect.get(Target, Property, Receiver);
			},
		});
		return [true, ProxyKit];
	}
	//
	function Bootstrap() {
		const OriginalPromiseAll = Promise.all;
		let Intercepted = false;
		//
		Promise.all = async function (promises) {
			const result = OriginalPromiseAll.call(this, promises);
			//
			if (!Intercepted) {
				Intercepted = true;
				return await new Promise((Resolve) => {
					result.then(([Kit, App, ...Args]) => {
						Log('Modules Loaded');
						const [Success, WrappedKit] = Intercept(Kit);
						if (Success) {
							Promise.all = OriginalPromiseAll;
							Log('Wrapped Kit:', WrappedKit, App);
						}
						Resolve([WrappedKit, App, ...Args]);
					});
				});
			}
			//
			return await result;
		};
	}
	//
	Bootstrap();
	//
	window.googletag = { cmd: [], _loaded_: true };
	//
	const Observer = new MutationObserver((Mutations) => {
		for (const Mutation of Mutations) {
			for (const Node of Mutation.addedNodes) {
				if (Node.nodeType === 1) {
					if (Node.classList?.contains('adsbygoogle')) {
						Node.remove();
						Log('Removed Ad:', Node);
					}
					//
					Node.querySelectorAll?.('.adsbygoogle').forEach((Element) => {
						Element.remove();
						Log('Removed Nested Ad:', Element);
					});
				}
			}
		}
	});
	//
	Observer.observe(unsafeWindow.document.documentElement, {
		childList: true,
		subtree: true,
	});
})();
