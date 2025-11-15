// ==UserScript==
// @name         Nexa
// @namespace    http://tampermonkey.net/
// @version      0.1.0
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
	"use strict";
	//
	const DEBUG = false;
	//
	const OldLog = unsafeWindow.console.log;
	const OldWarn = unsafeWindow.console.warn;
	const OldError = unsafeWindow.console.error;
	//
	function Log(...Args) {
		if (DEBUG) OldLog("[Nexa]", ...Args);
	}
	function Warn(...Args) {
		if (DEBUG) OldWarn("[Nexa]", ...Args);
	}
	function Error(...Args) {
		if (DEBUG) OldError("[Nexa]", ...Args);
	}
	//
	if (DEBUG) unsafeWindow.console.clear = function () {};
	//
	const Notification = unsafeWindow.document.createElement("div");
	Object.assign(Notification.style, {
		position: "fixed",
		bottom: "20px",
		left: "20px",
		background: "rgba(28,28,28,0.97)",
		color: "#fff",
		padding: "12px 20px",
		borderRadius: "10px",
		display: "flex",
		flexDirection: "column",
		alignItems: "center",
		fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
		zIndex: "999999",
		minWidth: "180px",
		boxShadow: "0 6px 20px rgba(0,0,0,0.45)",
	});
	//
	const Status = unsafeWindow.document.createElement("div");
	Status.textContent = "Solve Captcha 2 Continue";
	Object.assign(Status.style, {
		fontSize: "14px",
		color: "#ccc",
		textAlign: "center",
		wordBreak: "break-word",
	});
	Notification.append(Status);
	//
	unsafeWindow.document.documentElement.appendChild(Notification);
	//
	Log("Solve Captcha 2 Continue");
	//
	const Mapping = {
		Info: ["onLinkInfo"],
		Dest: ["onLinkDestination"],
	};
	//
	function Resolve(Obj, Candidates) {
		for (let i = 0; i < Candidates.length; i++) {
			const Name = Candidates[i];
			if (typeof Obj[Name] === "function") {
				return { Fn: Obj[Name], Index: i, Name };
			}
		}
		return { Fn: null, Index: -1, Name: null };
	}
	//
	function Write(Obj) {
		for (let i in Obj) {
			if (typeof Obj[i] == "function" && Obj[i].length == 2) {
				return { Fn: Obj[i], Name: i };
			}
		}
		return { Fn: null, Index: -1, Name: null };
	}
	//
	let _Session, _Send, _Info, _Dest = undefined;
	//
	function Client() {
		return {
			OFFER_SKIPPED: "c_offer_skipped",
			MONETIZATION: "c_monetization",
			PING: "c_ping",
			ADBLOCKER_DETECTED: "c_adblocker_detected",
			WORKINK_PASS_USE: "c_workink_pass_use",
			FOCUS_LOST: "c_focus_lost",
			WORKINK_PASS_AVAILABLE: "c_workink_pass_available",
			ANNOUNCE: "c_announce",
			HCAPTCHA_RESPONSE: "c_hcaptcha_response",
			OFFERS_SKIPPED: "c_offers_skipped",
			KEYAPP_KEY: "c_keyapp_key",
			TURNSTILE_RESPONSE: "c_turnstile_response",
			SOCIAL_STARTED: "c_social_started",
			RECAPTCHA_RESPONSE: "c_recaptcha_response",
			FOCUS: "c_focus",
		};
	}
	//
	function SendProxy() {
		const Packets = Client();
		return function (...Args) {
			const Type = Args[0];
			const Data = Args[1];
			//
			if (Type !== Packets.PING) {
				Log("Sent:", Type, Data);
			}
			//
			if (Type === Packets.ADBLOCKER_DETECTED) {
				Warn("Adblocker Blocked");
				return;
			}
			//
			if (
				_Session &&
				_Session.linkInfo &&
				Type === Packets.TURNSTILE_RESPONSE
			) {
				const Result = _Send.apply(this, Args);
				//
				Status.textContent = "Captcha Solved, Bypassing..";
				Log("Captcha Solved");
				//
				for (const Social of _Session.linkInfo.socials) {
					_Send.call(this, Packets.SOCIAL_STARTED, { url: Social.url });
				}
				//
				for (const Monetization of _Session.monetizations) {
					Log("Processing monetization:", Monetization);
					const Write = Monetization.sendMessage;
					//
					switch (Monetization.id) {
						case 22: {
							// readArticles2
							Write.call(Monetization, {
								event: "read",
							});
							break;
						}
						//
						case 25: {
							// operaGX
							Write.call(Monetization, {
								event: "start",
							});
							Write.call(Monetization, {
								event: "installClicked",
							});
							fetch("/_api/v2/affiliate/operaGX", {
								method: "GET",
								mode: "no-cors",
							});
							setTimeout(() => {
								fetch("https://work.ink/_api/v2/callback/operaGX", {
									method: "POST",
									mode: "no-cors",
									headers: {
										"Content-Type": "application/json",
									},
									body: JSON.stringify({
										noteligible: true,
									}),
								});
							}, 5000);
							break;
						}
						//
						case 34: {
							// norton
							Write.call(Monetization, {
								event: "start",
							});
							Write.call(Monetization, {
								event: "installClicked",
							});
							break;
						}
						//
						case 71: {
							// externalArticles
							Write.call(Monetization, {
								event: "start",
							});
							Write.call(Monetization, {
								event: "installClicked",
							});
							break;
						}
						//
						case 45: {
							// pdfeditor
							Write.call(Monetization, {
								event: "installed",
							});
							break;
						}
						//
						case 57: {
							// betterdeals
							Write.call(Monetization, {
								event: "installed",
							});
							break;
						}
						//
						default:
							Log("Unknown Monetization:", typeof Monetization, Monetization);
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
	function InfoProxy() {
		return function (...Args) {
			const Link = Args[0];
			//
			Log("Link Info:", Link);
			//
			Object.defineProperty(Link, "isAdblockEnabled", {
				get() {
					return false;
				},
				set(NewValue) {
					Log("Attempt Set IsAdblock:", NewValue);
				},
				configurable: false,
				enumerable: true,
			});
			//
			return _Info.apply(this, Args);
		};
	}
	//
	function DestProxy() {
		return function (...Args) {
			const Payload = Args[0];
			//
			Log("Link Dest:", Payload);
			//
			for (let i = 30; i >= 0; i--) {
				setTimeout(
					() => (Status.textContent = `Redirecting in ${i}s`),
					(30 - i) * 1000,
				);
			}
			//
			setTimeout(() => {
				window.location.href = Payload.url;
			}, 30000);
			//
			return _Dest.apply(this, Args);
		};
	}
	//
	function Session() {
		const Send = Write(_Session);
		const Info = Resolve(_Session, Mapping.Info);
		const Dest = Resolve(_Session, Mapping.Dest);
		//
		_Send = Send.Fn;
		_Info = Info.Fn;
		_Dest = Dest.Fn;
		//
		const SendProxyObj = SendProxy();
		const InfoProxyObj = InfoProxy();
		const DestProxyObj = DestProxy();
		//
		Object.defineProperty(_Session, Send.Name, {
			get() {
				return SendProxyObj;
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
				return InfoProxyObj;
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
				return DestProxyObj;
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
	function Check(Object, Property, Value, Receiver) {
		Log("Check:", Property, Value);
		//
		if (
			Value &&
			typeof Value === "object" &&
			Write(Value).Fn &&
			Resolve(Value, Mapping.Info).Fn &&
			Resolve(Value, Mapping.Dest).Fn &&
			!_Session
		) {
			_Session = Value;
			Log("Intercepted Session:", _Session);
			Session();
		}
		//
		return Reflect.set(Object, Property, Value, Receiver);
	}
	//
	function CompProxy(Component) {
		return new Proxy(Component, {
			construct(Target, Args) {
				const Result = Reflect.construct(Target, Args);
				Log("Component:", Target, Args, Result);
				Result.$$.ctx = new Proxy(Result.$$.ctx, { set: Check });
				return Result;
			},
		});
	}
	//
	function NodeProxy(Result) {
		return new Proxy(Result, {
			get(Target, Property, Receiver) {
				if (Property === "component") return CompProxy(Target.component);
				return Reflect.get(Target, Property, Receiver);
			},
		});
	}
	//
	function AsyncNode(Node) {
		return async (...Args) => {
			const Result = await Node(...Args);
			Log("Node:", Result);
			return NodeProxy(Result);
		};
	}
	//
	function KitProxy(Kit) {
		if (typeof Kit !== "object" || !Kit) return [false, Kit];
		//
		const Start = "start" in Kit && Kit.start;
		if (!Start) return [false, Kit];
		//
		const ProxyKit = new Proxy(Kit, {
			get(Target, Property, Receiver) {
				if (Property === "start") {
					return function (...Args) {
						const Module = Args[0];
						const Options = Args[2];
						//
						if (
							typeof Module === "object" &&
							typeof Module.nodes === "object" &&
							typeof Options === "object" &&
							typeof Options.node_ids === "object"
						) {
							const Node = Module.nodes[Options.node_ids[1]];
							Module.nodes[Options.node_ids[1]] = AsyncNode(Node);
						}
						//
						Log("Kit.Start Hooked", Options);
						return Start.apply(this, Args);
					};
				}
				return Reflect.get(Target, Property, Receiver);
			},
		});
		return [true, ProxyKit];
	}
	//
	function KitSetup() {
		const OriginalPromiseAll = Promise.all;
		let Intercepted = false;
		//
		Promise.all = async function (Promises) {
			const Result = OriginalPromiseAll.call(this, Promises);
			//
			if (!Intercepted) {
				Intercepted = true;
				return await new Promise((Resolve) => {
					Result.then(([Kit, App, ...Args]) => {
						Log("Modules Loaded");
						const [Success, WrappedKit] = KitProxy(Kit);
						if (Success) {
							Promise.all = OriginalPromiseAll;
							Log("Wrapped Kit:", WrappedKit, App);
						}
						Resolve([WrappedKit, App, ...Args]);
					});
				});
			}
			return await Result;
		};
	}
	//
	KitSetup();
	//
	window.googletag = { cmd: [], _loaded_: true };
	//
	const Observer = new MutationObserver((Mutations) => {
		for (const Mutation of Mutations) {
			for (const Node of Mutation.addedNodes) {
				if (Node.nodeType === 1) {
					if (Node.classList?.contains("adsbygoogle")) {
						Node.remove();
						Log("Removed Ad:", Node);
					}
					Node.querySelectorAll?.(".adsbygoogle").forEach((Element) => {
						Element.remove();
						Log("Removed Nested Ad:", Element);
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
