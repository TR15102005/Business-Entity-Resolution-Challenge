/* ═══════════════════════════════════════════════════════
   Business Entity Resolution Challenge — interactions
   ═══════════════════════════════════════════════════════ */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ── mobile nav ─────────────────────────────────────── */
  var toggle = document.getElementById("navToggle");
  var nav = document.getElementById("sitenav");

  function closeNav() {
    if (!nav) return;
    nav.classList.remove("is-open");
    if (toggle) toggle.setAttribute("aria-expanded", "false");
  }

  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(open));
    });

    nav.addEventListener("click", function (e) {
      if (e.target.closest("a")) closeNav();
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeNav();
    });

    document.addEventListener("click", function (e) {
      if (!nav.classList.contains("is-open")) return;
      if (!e.target.closest(".topbar")) closeNav();
    });
  }

  /* ── scroll spy ─────────────────────────────────────── */
  var navLinks = nav ? Array.prototype.slice.call(nav.querySelectorAll("a[href^='#']")) : [];
  var sections = navLinks
    .map(function (a) { return document.querySelector(a.getAttribute("href")); })
    .filter(Boolean);

  function setActive(id) {
    navLinks.forEach(function (a) {
      var on = id !== null && a.getAttribute("href") === "#" + id;
      a.classList.toggle("is-active", on);
      if (on) { a.setAttribute("aria-current", "true"); } else { a.removeAttribute("aria-current"); }
    });
  }

  if (sections.length) {
    var ticking = false;

    var updateSpy = function () {
      var pos = window.pageYOffset + 120;
      var current = null;

      sections.forEach(function (s) {
        if (s.offsetTop <= pos) current = s.id;
      });

      var atBottom = window.innerHeight + window.pageYOffset >= document.body.scrollHeight - 4;
      if (atBottom) current = sections[sections.length - 1].id;

      setActive(current);
    };

    var onScroll = function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () { updateSpy(); ticking = false; });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    updateSpy();
  }

  /* ── copy buttons ───────────────────────────────────── */
  function selectNode(el) {
    if (!el) return;
    try {
      var range = document.createRange();
      range.selectNodeContents(el);
      var sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    } catch (e) { /* selection unsupported */ }
  }

  function legacyCopy(text) {
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.cssText = "position:fixed;top:-1000px;opacity:0";
    document.body.appendChild(ta);
    ta.select();
    var ok = false;
    try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
    document.body.removeChild(ta);
    return ok;
  }

  // Resolves "copied", "selected" (text highlighted, user presses Ctrl+C) or rejects.
  function copyText(text, codeEl) {
    var viaApi = (navigator.clipboard && navigator.clipboard.writeText)
      ? navigator.clipboard.writeText(text)
      : Promise.reject(new Error("no clipboard api"));

    return viaApi.then(function () {
      return "copied";
    }).catch(function () {
      if (legacyCopy(text)) return "copied";
      selectNode(codeEl);
      return "selected";
    });
  }

  Array.prototype.forEach.call(document.querySelectorAll("[data-copy]"), function (btn) {
    btn.addEventListener("click", function () {
      var block = btn.closest(".code");
      var code = block ? block.querySelector("code") : null;
      if (!code) return;

      copyText(code.innerText, code).then(function (how) {
        btn.textContent = how === "copied" ? "Copied" : "Ctrl+C now";
        btn.classList.toggle("is-done", how === "copied");
        setTimeout(function () {
          btn.textContent = "Copy";
          btn.classList.remove("is-done");
        }, 1800);
      }).catch(function () {
        btn.textContent = "Select manually";
      });
    });
  });

  /* ── F_beta metric ──────────────────────────────────── */
  function fbeta(p, r, beta) {
    var b2 = beta * beta;
    if (p + r === 0) return 0;
    return ((1 + b2) * p * r) / (b2 * p + r);
  }

  var els = {
    tp: document.getElementById("tp"),
    fp: document.getElementById("fp"),
    fn: document.getElementById("fn"),
    tpOut: document.getElementById("tpOut"),
    fpOut: document.getElementById("fpOut"),
    fnOut: document.getElementById("fnOut"),
    f05: document.getElementById("f05"),
    f1: document.getElementById("f1"),
    bar05: document.getElementById("bar05"),
    bar1: document.getElementById("bar1"),
    pOut: document.getElementById("pOut"),
    rOut: document.getElementById("rOut"),
    msg: document.getElementById("calcMsg")
  };

  function fmt(x) { return x.toFixed(3); }

  function render() {
    var tp = +els.tp.value;
    var fp = +els.fp.value;
    var fn = +els.fn.value;

    els.tpOut.textContent = tp;
    els.fpOut.textContent = fp;
    els.fnOut.textContent = fn;

    var predicted = tp + fp;
    var actual = tp + fn;

    var precision = predicted === 0 ? 0 : tp / predicted;
    var recall = actual === 0 ? 0 : tp / actual;

    var s05 = precision + recall === 0 ? 0 : fbeta(precision, recall, 0.5);
    var s1 = precision + recall === 0 ? 0 : fbeta(precision, recall, 1);

    els.pOut.textContent = predicted === 0 ? "—" : fmt(precision);
    els.rOut.textContent = actual === 0 ? "—" : fmt(recall);

    els.f05.textContent = fmt(s05);
    els.f1.textContent = fmt(s1);
    els.bar05.style.width = (s05 * 100).toFixed(1) + "%";
    els.bar1.style.width = (s1 * 100).toFixed(1) + "%";

    els.msg.innerHTML = describe(tp, fp, fn, precision, recall, s05, s1);
  }

  function plural(n, one, many) { return n + " " + (n === 1 ? one : many); }

  function describe(tp, fp, fn, precision, recall, s05, s1) {
    if (tp + fp === 0 && tp + fn === 0) {
      return "Nothing predicted and nothing to find. Add counts to see the metric move.";
    }
    if (tp + fp === 0) {
      return "Predicted nothing: recall is 0, so the score is <strong>0</strong> — every true match was missed.";
    }
    if (tp + fn === 0) {
      return "This entity has no true matches. Correctly predicting an empty list scores <strong>1.0</strong>; predicting anything scores <strong>0.0</strong>.";
    }
    if (tp === 0) {
      return "No true positives, so precision and recall are both 0 and the score is <strong>0</strong>.";
    }
    if (fp === 0) {
      return "Precision is 1.0 here, so F<sub>0.5</sub> and F<sub>1</sub> reward you identically — with no false merges there is nothing for the beta weighting to punish.";
    }
    if (fn === 0) {
      return "Recall is 1.0, yet precision of " + fmt(precision) +
             " still caps the score at <strong>" + fmt(s05) + "</strong> instead of 1.0 — " +
             plural(fp, "false positive", "false positives") + " against " +
             plural(tp, "true positive", "true positives") + ".";
    }
    if (Math.abs(s05 - s1) < 0.0005) {
      return "Precision and recall are evenly matched at " + fmt(precision) +
             ", so every F<sub>&beta;</sub> lands on the same value.";
    }
    if (s05 < s1) {
      return "F<sub>0.5</sub> is " + fmt(s1 - s05) + " below F<sub>1</sub>: " +
             plural(fp, "false positive", "false positives") + " cost you more than the " +
             plural(fn, "missed match", "missed matches") + " would have.";
    }
    return "Precision (" + fmt(precision) + ") outruns recall (" + fmt(recall) +
           "), so weighting precision 2&times; lifts F<sub>0.5</sub> " + fmt(s05 - s1) +
           " above F<sub>1</sub> — this is the trade-off the metric is built to reward.";
  }

  if (els.tp && els.fp && els.fn) {
    [els.tp, els.fp, els.fn].forEach(function (input) {
      input.addEventListener("input", render);
    });
    render();
  }

  /* ── scroll reveal ──────────────────────────────────── */
  var revealTargets = document.querySelectorAll(
    ".section > .wrap > h2, .section > .wrap > .section__lede, .card, .callout, .flow__step, .rules li, .split, .stats"
  );

  if (!reduceMotion && "IntersectionObserver" in window && revealTargets.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        io.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });

    Array.prototype.forEach.call(revealTargets, function (el, i) {
      el.classList.add("reveal");
      el.style.transitionDelay = Math.min(i % 4, 3) * 60 + "ms";
      io.observe(el);
    });
  }
})();
