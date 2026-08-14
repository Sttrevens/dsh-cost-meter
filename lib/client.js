window.__ModuleLoader__.load({
  id: "@4dgames/dsh-cost-meter",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
    let react = require("react");

    var css = ".dsh-cost-badge{display:inline-flex;align-items:baseline;gap:6px;font-size:12px;font-variant-numeric:tabular-nums;letter-spacing:.01em;white-space:nowrap;cursor:default;user-select:none}.dsh-cost-badge-total{font-weight:600;color:var(--dsw-alias-label-primary,#111827)}.dsh-cost-badge-delta{font-weight:500;color:var(--dsw-alias-label-secondary,#6b7280)}";
    var tagId = "@4dgames/dsh-cost-meter/badge.css";
    if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
      var tag = document.createElement("style");
      tag.dataset.plugin = "@4dgames/dsh-cost-meter";
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
      var cost = useProjection ? useProjection("sessionCost") : void 0;
      if (!cost || cost.priced !== true) return null;
      var label = formatUsd(cost.totalUsd);
      if (label === null) return null;
      var turn = cost.turn;
      var turnLabel = turn && turn.totalUsd > 0 ? "+" + formatUsd(turn.totalUsd) : null;
      var model = cost.model ? cost.provider + "/" + cost.model : "unknown model";
      var title =
        "session cost: " + label +
        "\ninput   " + formatUsd(cost.inputUsd) + "  (" + cost.inputTokens + " tok)" +
        "\noutput  " + formatUsd(cost.outputUsd) + "  (" + cost.outputTokens + " tok)" +
        "\ncache-read " + formatUsd(cost.cacheReadUsd) + "  (" + cost.cacheReadTokens + " tok)" +
        "\ncache-write " + formatUsd(cost.cacheWriteUsd) + "  (" + cost.cacheWriteTokens + " tok)" +
        (turn && turn.totalUsd > 0
          ? "\n\nthis turn: " + turnLabel +
            "\ninput   " + formatUsd(turn.inputUsd) + "  (" + turn.inputTokens + " tok)" +
            "\noutput  " + formatUsd(turn.outputUsd) + "  (" + turn.outputTokens + " tok)" +
            "\ncache-read " + formatUsd(turn.cacheReadUsd) + "  (" + turn.cacheReadTokens + " tok)" +
            "\ncache-write " + formatUsd(turn.cacheWriteUsd) + "  (" + turn.cacheWriteTokens + " tok)"
          : "") +
        "\n" + model;
      return react.createElement("span", {
        className: "dsh-cost-badge",
        title: title,
      },
        react.createElement("span", { className: "dsh-cost-badge-total" }, label),
        turnLabel !== null
          ? react.createElement("span", { className: "dsh-cost-badge-delta" }, "· " + turnLabel)
          : null
      );
    }

    var inject = ["slots"];

    function apply(ctx) {
      ctx.slots.inject("conversation.session.header.utilities", () => {
        ctx.slots.register({
          name: "conversation.session.header.utilities",
          id: "cost-meter",
        }, CostBadge);
      });
    }

    exports.CostBadge = CostBadge;
    exports.apply = apply;
    exports.inject = inject;
    return module.exports;
  },
});
