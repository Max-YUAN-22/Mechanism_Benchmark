/* MechanismBench manual-review app. Vanilla JS, no deps. Decisions persist in
   localStorage keyed by queue; export produces a merge-ready CSV. */
(function () {
  "use strict";
  var BUNDLE = (window.REVIEW_QUEUES || { queues: [] });
  var LSKEY = "mechbench_review_v1";

  var state = { queue: null, idx: 0, onlyUndone: false };

  // ---- persistence ------------------------------------------------------
  function store() {
    try { return JSON.parse(localStorage.getItem(LSKEY)) || {}; }
    catch (e) { return {}; }
  }
  function saveStore(s) { localStorage.setItem(LSKEY, JSON.stringify(s)); }
  function reviewerId() { return (document.getElementById("reviewerId").value || "").trim(); }
  function decisionsFor(qid) {
    var s = store(); s[qid] = s[qid] || {}; return s[qid];
  }
  function unitDone(qid, uid) {
    var d = decisionsFor(qid)[uid];
    return !!(d && d.__done);
  }
  function countDone(qid) {
    var d = decisionsFor(qid), n = 0;
    for (var k in d) if (d[k] && d[k].__done) n++;
    return n;
  }

  // ---- setup screen -----------------------------------------------------
  function renderQueues() {
    var host = document.getElementById("queueList");
    host.innerHTML = "";
    BUNDLE.queues.forEach(function (q) {
      var done = countDone(q.id);
      var pct = q.n ? Math.round((done / q.n) * 100) : 0;
      var el = document.createElement("div");
      el.className = "queue-card";
      el.innerHTML =
        '<h3>' + esc(q.title) + '</h3>' +
        '<div class="muted" style="font-size:13px">' + esc(q.banner) + '</div>' +
        '<div class="bar"><i style="width:' + pct + '%"></i></div>' +
        '<div class="stat">' + done + ' / ' + q.n + ' reviewed (' + pct + '%)</div>';
      el.onclick = function () { openQueue(q.id); };
      host.appendChild(el);
    });
  }

  function openQueue(qid) {
    state.queue = BUNDLE.queues.filter(function (q) { return q.id === qid; })[0];
    state.idx = firstIndex();
    document.getElementById("setup").classList.add("hidden");
    document.getElementById("review").classList.remove("hidden");
    document.getElementById("qTitle").textContent = state.queue.title;
    document.getElementById("banner").textContent = state.queue.banner;
    renderCard();
  }

  function firstIndex() {
    if (!state.onlyUndone) return 0;
    var rows = state.queue.rows;
    for (var i = 0; i < rows.length; i++)
      if (!unitDone(state.queue.id, rows[i].id)) return i;
    return 0;
  }

  // ---- review card ------------------------------------------------------
  function renderCard() {
    var q = state.queue, row = q.rows[state.idx];
    document.getElementById("unitId").textContent = row.id || "(no id)";
    document.getElementById("question").textContent = q.question;
    document.getElementById("progress").textContent =
      "unit " + (state.idx + 1) + " / " + q.n + " · " + countDone(q.id) + " reviewed";

    var doneTag = document.getElementById("doneTag");
    doneTag.classList.toggle("hidden", !unitDone(q.id, row.id));

    var ev = document.getElementById("evidence");
    ev.innerHTML = "";
    Object.keys(row.evidence).forEach(function (k) {
      var v = row.evidence[k];
      if (v === "" || v == null) return;
      var tr = document.createElement("tr");
      tr.innerHTML = '<td class="k">' + esc(k) + '</td><td class="v">' + esc(String(v)) + '</td>';
      ev.appendChild(tr);
    });

    var saved = decisionsFor(q.id)[row.id] || {};
    var form = document.getElementById("decisionForm");
    form.innerHTML = "";
    q.decisions.forEach(function (d) {
      var wrap = document.createElement("div");
      wrap.className = "field";
      var id = "f_" + d.name;
      var ctrl;
      if (d.type === "select") {
        ctrl = '<select id="' + id + '">' +
          d.options.map(function (o) {
            var sel = (saved[d.name] === o) ? " selected" : "";
            return '<option value="' + esc(o) + '"' + sel + '>' + (o === "" ? "— choose —" : esc(o)) + '</option>';
          }).join("") + '</select>';
      } else {
        ctrl = '<input id="' + id + '" type="text" value="' + esc(saved[d.name] || "") + '" />';
      }
      wrap.innerHTML = '<label>' + esc(d.label) + '</label>' + ctrl;
      form.appendChild(wrap);
    });
  }

  function collectDecision() {
    var q = state.queue, out = {};
    q.decisions.forEach(function (d) {
      out[d.name] = document.getElementById("f_" + d.name).value;
    });
    return out;
  }

  function decisionComplete(q, dec) {
    var missing = [];
    q.decisions.forEach(function (d) {
      var value = (dec[d.name] || "").trim();
      var optional = d.type === "text" && !/_reason$/.test(d.name);
      var conditional = d.name === "corrected_mechanism_if_change";
      if (conditional) {
        if (dec.manual_final_decision === "relabel" && !value) missing.push(d.label);
        return;
      }
      if (!optional && !value) missing.push(d.label);
    });
    if (missing.length) {
      alert("Please complete before marking reviewed:\n- " + missing.join("\n- "));
      return false;
    }
    return true;
  }

  function saveCurrent(markDone) {
    var q = state.queue, row = q.rows[state.idx];
    if (!reviewerId()) { alert("Enter your Reviewer ID at the top first."); return false; }
    var dec = collectDecision();
    if (markDone && !decisionComplete(q, dec)) return false;
    dec.__reviewer = reviewerId();
    dec.__date = new Date().toISOString().slice(0, 10);
    dec.__done = !!markDone;
    var s = store(); s[q.id] = s[q.id] || {}; s[q.id][row.id] = dec; saveStore(s);
    return true;
  }

  function go(delta) {
    var next = state.idx + delta;
    if (state.onlyUndone && delta > 0) {
      var rows = state.queue.rows;
      for (var i = state.idx + 1; i < rows.length; i++)
        if (!unitDone(state.queue.id, rows[i].id)) { next = i; break; }
    }
    state.idx = Math.max(0, Math.min(state.queue.rows.length - 1, next));
    renderCard();
  }

  function rowSearchText(row) {
    var parts = [row.id || ""];
    Object.keys(row.evidence || {}).forEach(function (k) {
      parts.push(k, row.evidence[k]);
    });
    return parts.join(" ").toLowerCase();
  }

  function findNextMatch() {
    var needle = (document.getElementById("findText").value || "").trim().toLowerCase();
    if (!needle) {
      alert("Enter a unit ID, target name, or review batch (for example BRD4-INDEP-B02).");
      return;
    }
    var rows = state.queue.rows;
    for (var offset = 1; offset <= rows.length; offset++) {
      var i = (state.idx + offset) % rows.length;
      if (rowSearchText(rows[i]).indexOf(needle) !== -1) {
        state.idx = i;
        renderCard();
        return;
      }
    }
    alert("No match in this queue for: " + needle);
  }

  // ---- export -----------------------------------------------------------
  function exportCsv() {
    var q = state.queue, dstore = decisionsFor(q.id);
    var cols = ["unit_id"].concat(q.decisions.map(function (d) { return d.name; }))
      .concat(["reviewer_id", "review_date"]);
    var lines = [cols.join(",")];
    q.rows.forEach(function (row) {
      var d = dstore[row.id]; if (!d) return;
      var rec = [row.id];
      q.decisions.forEach(function (dd) { rec.push(d[dd.name] || ""); });
      rec.push(d.__reviewer || "", d.__date || "");
      lines.push(rec.map(csvCell).join(","));
    });
    if (lines.length === 1) { alert("No decisions recorded in this queue yet."); return; }
    downloadFile(q.id + "_decisions_" + (reviewerId() || "anon") + ".csv",
      lines.join("\n"), "text/csv");
  }

  function csvCell(v) {
    v = String(v == null ? "" : v);
    return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
  }
  function downloadFile(name, text, mime) {
    var blob = new Blob([text], { type: mime });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
  }
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  // ---- wiring -----------------------------------------------------------
  function back() {
    document.getElementById("review").classList.add("hidden");
    document.getElementById("setup").classList.remove("hidden");
    if (location.hash) history.replaceState(null, "", location.pathname + location.search);
    renderQueues();
  }
  document.getElementById("backBtn").onclick = back;
  document.getElementById("exportBtn").onclick = exportCsv;
  document.getElementById("prevBtn").onclick = function () { go(-1); };
  document.getElementById("skipBtn").onclick = function () { go(1); };
  document.getElementById("saveNextBtn").onclick = function () {
    if (saveCurrent(true)) go(1);
  };
  document.getElementById("jumpTo").onchange = function (e) {
    var n = parseInt(e.target.value, 10);
    if (n >= 1 && n <= state.queue.rows.length) { state.idx = n - 1; renderCard(); }
  };
  document.getElementById("findBtn").onclick = findNextMatch;
  document.getElementById("findText").onkeydown = function (e) {
    if (e.key === "Enter") { e.preventDefault(); findNextMatch(); }
  };
  document.getElementById("onlyUndone").onchange = function (e) {
    state.onlyUndone = e.target.checked; state.idx = firstIndex(); renderCard();
  };
  var savedName = localStorage.getItem(LSKEY + "_who");
  if (savedName) document.getElementById("reviewerId").value = savedName;
  document.getElementById("reviewerId").oninput = function (e) {
    localStorage.setItem(LSKEY + "_who", e.target.value.trim());
  };

  if (!BUNDLE.queues.length) {
    document.getElementById("queueList").innerHTML =
      '<p class="muted">queues.js not loaded. Run <code>python3 scripts/build_review_site.py</code> first.</p>';
  } else {
    renderQueues();
    // deep-link: index.html#<queueId> opens that queue directly (from the overview page)
    function routeFromHash() {
      var h = (location.hash || "").replace(/^#/, "");
      if (h && BUNDLE.queues.some(function (q) { return q.id === h; })) openQueue(h);
    }
    routeFromHash();
    window.addEventListener("hashchange", routeFromHash);
  }
})();
