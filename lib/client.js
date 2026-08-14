window.__ModuleLoader__.load({
  id: "@steven-wu/dsh-cost-meter",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
    let react = require("react");

    var css = ".dsh-cost-badge{display:inline-flex;align-items:center;gap:4px;font-size:12px;font-variant-numeric:tabular-nums;font-weight:500;color:var(--dsw-alias-label-secondary,#6b7280);cursor:default;user-select:none;padding:0 2px}.dsh-cost-tip{position:fixed;z-index:99999;background:var(--dsw-alias-bg-elevated,#fff);color:var(--dsw-alias-label-primary,#111827);border:1px solid var(--dsw-alias-border-l1,#e5e7eb);border-radius:8px;padding:8px 10px;font-size:12px;line-height:1.7;white-space:pre-line;box-shadow:0 6px 24px rgba(0,0,0,.14);pointer-events:none;max-width:340px}";
    var tagId = "@steven-wu/dsh-cost-meter/badge.css";
    if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
      var tag = document.createElement("style");
      tag.dataset.plugin = "@steven-wu/dsh-cost-meter";
      tag.dataset.pluginCss = tagId;
      tag.textContent = css;
      document.head.appendChild(tag);
    }

    function formatUsd(n) {
      if (typeof n !== "number" || !Number.isFinite(n)) return null;
      if (n >= 1) return "$" + n.toFixed(2);
      if (n >= 0.01) return "$" + n.toFixed(4);
      return "$" + n.toFixed(5);
    }

    function CostBadge(props) {
      var useProjection = props.useProjection;
      var useSession = props.useSession;
      var messageId = props.messageId;

      var hoverState = react.useState(false);
      var hover = hoverState[0];
      var setHover = hoverState[1];
      var posState = react.useState(null);
      var pos = posState[0];
      var setPos = posState[1];

      var cost = useProjection ? useProjection("sessionCost") : void 0;
      var nodes = useSession ? useSession(function (s) { return s ? s.nodes : void 0; }) : void 0;

      if (!cost || cost.priced !== true) return null;

      var turn = null;
      if (nodes && messageId != null) {
        for (var i = 0; i < nodes.length; i++) {
          var n = nodes[i];
          if (n && n.kind === "assistant" && n.messageId === messageId) { turn = n.turn; break; }
        }
      }

      var t = turn != null && cost.byTurn ? cost.byTurn[String(turn)] : void 0;
      if (!t || t.totalUsd <= 0) return null;
      var label = formatUsd(t.totalUsd);
      if (label === null) return null;

      function onEnter(ev) {
        var r = ev.currentTarget.getBoundingClientRect();
        setPos({ top: r.bottom + 6, left: r.left });
        setHover(true);
      }
      function onLeave() {
        setHover(false);
      }

      var lines = [
        "turn " + turn + ": " + label,
        "input        " + formatUsd(t.inputUsd) + "   (" + t.inputTokens + " tok)",
        "output      " + formatUsd(t.outputUsd) + "   (" + t.outputTokens + " tok)",
        "cache-read  " + formatUsd(t.cacheReadUsd) + "   (" + t.cacheReadTokens + " tok)",
        "cache-write " + formatUsd(t.cacheWriteUsd) + "   (" + t.cacheWriteTokens + " tok)",
        "session     " + formatUsd(cost.totalUsd),
      ].join("\n");

      var tip = hover && pos
        ? react.createElement("span", {
            className: "dsh-cost-tip",
            style: { top: pos.top + "px", left: pos.left + "px" },
            role: "tooltip",
          }, lines)
        : null;

      return react.createElement("span", {
        className: "dsh-cost-badge",
        onMouseEnter: onEnter,
        onMouseLeave: onLeave,
      }, label, tip);
    }

    var inject = ["slots"];

    function apply(ctx) {
      ctx.slots.inject("conversation.chat.assistant-actions", () => {
        ctx.slots.register({
          name: "conversation.chat.assistant-actions",
          id: "cost-meter",
          order: 50,
        }, CostBadge);
      });
    }

    exports.CostBadge = CostBadge;
    exports.apply = apply;
    exports.inject = inject;
    return module.exports;
  },
});
