import { a as IMAGE_DISCLOSURES, d as ORIGINAL_BOOKING, f as POLICIES, i as HOTELS, l as OFFERS, s as LEGS, u as ONBOARDING, v as elapsedMinutes, x as timeInZone, y as gbp } from "./format-C6CTpjys.mjs";
import { _ as Link, y as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { y as ArrowLeft } from "../_libs/lucide-react.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/prepare-BpO1-L7T.js
var import_jsx_runtime = require_jsx_runtime();
function Prepare() {
	const me615a = LEGS.find((l) => l.id === "leg:ME615a");
	const me615b = LEGS.find((l) => l.id === "leg:ME615b");
	const naive = "10:55 → 11:40 looks like 45 minutes on a clock face without zones — and it is 45 elapsed minutes.";
	const elapsed = elapsedMinutes(me615a.arriveIso, me615b.departIso);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "min-h-dvh bg-bg text-ink",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
			className: "border-b border-line px-4 py-3",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
					to: "/",
					className: "inline-flex items-center gap-2 text-sm text-muted hover:text-ink",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowLeft, { className: "size-4" }), "Back to the concierge"]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "mt-3 font-display text-3xl",
					children: "Data preparation"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-1 max-w-2xl text-sm text-muted",
					children: "The question is the last step. Onward starts as fictional supplier rows, hotel descriptions, source policies and an earlier conversation. Preparation makes them agree."
				})
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mx-auto max-w-5xl space-y-10 px-4 py-8",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "font-display text-2xl",
						children: "Raw offer → typed offer"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1 text-sm text-muted",
						children: "Decimal pounds become integer pence. Bags are a distinct line."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-4 overflow-x-auto rounded-xl bg-paper shadow-border",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
							className: "w-full text-left text-sm",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", {
								className: "text-xs font-medium uppercase tracking-wider text-muted",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
										className: "px-3 py-2",
										children: "Flight"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
										className: "px-3 py-2",
										children: "Advertised"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
										className: "px-3 py-2",
										children: "Fare pence"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
										className: "px-3 py-2",
										children: "Bag pence"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
										className: "px-3 py-2",
										children: "Seats"
									})
								] })
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: OFFERS.map((o) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
								className: "border-t border-line",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
										className: "px-3 py-2 font-medium",
										children: o.flightNumber
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
										className: "px-3 py-2 text-muted",
										children: gbp(o.farePence)
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
										className: "px-3 py-2 font-mono tabular-nums",
										children: o.farePence
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
										className: "px-3 py-2 font-mono tabular-nums",
										children: o.bagPence
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
										className: "px-3 py-2 tabular-nums",
										children: o.seats
									})
								]
							}, o.id)) })]
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mt-2 text-xs text-subtle",
						children: [
							"Original booking ",
							ORIGINAL_BOOKING.flightNumber,
							" is a cancelled row, not a replacement offer."
						]
					})
				] }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "font-display text-2xl",
					children: "Elapsed time, not clock faces"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "mt-1 text-sm text-muted",
					children: [
						"ME615 arrives Madrid at ",
						timeInZone(me615a.arriveIso, "Europe/Madrid"),
						" CEST and leaves at",
						" ",
						timeInZone(me615b.departIso, "Europe/Madrid"),
						" CEST. ",
						naive,
						" Computed elapsed: ",
						elapsed,
						" minutes. Policy minimum: 60."
					]
				})] }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "font-display text-2xl",
					children: "Hotels: description, walk, hybrid rank"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-4 grid gap-4 sm:grid-cols-3",
					children: HOTELS.map((h) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
						className: "overflow-hidden rounded-xl bg-paper shadow-border",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
							src: h.image,
							alt: "",
							className: "photo h-36 w-full object-cover"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "p-3",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
									className: "font-display text-lg",
									children: h.name
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "mt-1 text-xs text-muted leading-relaxed",
									children: h.description
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
									className: "mt-2 font-mono text-xs text-subtle",
									children: [
										"walk ",
										h.walkMinutes,
										"m · ",
										gbp(h.nightPence),
										" · lexical ",
										h.lexical,
										" · semantic ",
										h.semantic
									]
								})
							]
						})]
					}, h.id))
				})] }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "font-display text-2xl",
						children: "Journey graph"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
						viewBox: "0 0 640 180",
						className: "mt-4 w-full rounded-xl bg-paper p-3 shadow-border",
						"aria-hidden": "true",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
								d: "M40 90 H200",
								stroke: "currentColor",
								className: "text-line-strong"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
								d: "M200 90 H360",
								stroke: "currentColor",
								className: "text-line-strong"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
								d: "M360 90 H520",
								stroke: "currentColor",
								className: "text-line-strong"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
								d: "M200 90 V40 H360",
								stroke: "currentColor",
								className: "text-accent",
								fill: "none"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Node, {
								x: 40,
								y: 90,
								label: "LHR"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Node, {
								x: 200,
								y: 90,
								label: "MAD"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Node, {
								x: 360,
								y: 90,
								label: "LIS"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Node, {
								x: 520,
								y: 90,
								label: "Studio"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Node, {
								x: 200,
								y: 40,
								label: "ME615 trap",
								small: true
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-2 text-xs text-muted",
						children: "Direct offers skip Madrid. Hotel WALK edges attach to the studio; Alfama Watch is 26 minutes and fails nearby."
					})
				] }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "font-display text-2xl",
						children: "Onboarding conversation"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1 text-sm text-muted",
						children: "Stored under the Onward namespace and the Alex actor. If long-term extraction is not ready, this conversation is short-term source context — never presented as a live AgentCore retrieval of extracted facts."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ol", {
						className: "mt-3 space-y-2",
						children: ONBOARDING.map((t) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
							className: "rounded-lg bg-paper px-3 py-2 text-sm shadow-border",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-xs uppercase tracking-wider text-subtle",
								children: t.role
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: t.text })]
						}, t.at))
					})
				] }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "font-display text-2xl",
					children: "Versioned sources"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
					className: "mt-3 space-y-2",
					children: POLICIES.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
						className: "rounded-lg bg-paper px-3 py-2 shadow-border",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "font-medium",
							children: p.title
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "font-mono text-xs text-subtle",
							children: [
								p.uri,
								" · ",
								p.version,
								" · ",
								p.versionId
							]
						})]
					}, p.id))
				})] }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "font-display text-2xl",
					children: "Image disclosures"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
					className: "mt-3 space-y-2 text-sm text-muted",
					children: IMAGE_DISCLOSURES.map((d) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [
						d.note,
						" Prompt sidecar: ",
						d.prompt
					] }, d.src))
				})] })
			]
		})]
	});
}
function Node({ x, y, label, small }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("g", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
		cx: x,
		cy: y,
		r: small ? 8 : 12,
		className: "fill-accent"
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("text", {
		x,
		y: y + (small ? 24 : 28),
		textAnchor: "middle",
		className: "fill-ink text-xs",
		children: label
	})] });
}
//#endregion
export { Prepare as component };
