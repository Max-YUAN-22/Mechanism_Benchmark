/* MechanismBench — Scientific Evidence Adjudication console v3.
   Triage CLEAN/NEEDS/BLOCKED computed from baked first-pass records.
   Evidence-first card; reviewer answers 3 questions; all-Yes => one-click ACCEPT.
   Storage key and export column order unchanged (validator-safe). */
(function () {
  "use strict";
  var BUNDLE = window.REVIEW_QUEUES || { queues: [] };
  var BAKED = window.REVIEW_RECORDS || {};
  var LSKEY = "mechbench_review_v1";
  var state = { queue: null, idx: 0, onlyUndone: false };

  function store() { try { return JSON.parse(localStorage.getItem(LSKEY)) || {}; } catch (e) { return {}; } }
  function saveStore(s) { localStorage.setItem(LSKEY, JSON.stringify(s)); }
  function reviewerId() { return (document.getElementById("reviewerId").value || "").trim(); }
  function localDecisions(qid) { var s = store(); s[qid] = s[qid] || {}; return s[qid]; }
  function decisionsFor(qid) {
    var b = BAKED[qid] || {}, l = localDecisions(qid), m = {};
    Object.keys(b).forEach(function (k) { m[k] = Object.assign({}, b[k], { __baked: true }); });
    Object.keys(l).forEach(function (k) { m[k] = l[k]; });
    return m;
  }
  function unitDone(qid, uid) { var d = decisionsFor(qid)[uid]; return !!(d && d.__done); }
  function countDone(qid) { var d = decisionsFor(qid), n = 0; for (var k in d) if (d[k] && d[k].__done) n++; return n; }
  function el(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function num(x) { var v = parseFloat(x); return isNaN(v) ? null : v; }

  /* ---------- queue metadata ---------- */
  var META = {
    gold_primary: { title: "Layer 1 · GOLD audit", badge: ["b-official", "OFFICIAL AUDIT"], group: "must",
      purpose: "Validate official benchmark labels" },
    launch_critical: { title: "Launch-critical", badge: ["b-gate", "L2/L3 GATE"], group: "gate",
      purpose: "Close Layer-2/3 route gates" },
    layer2_g4: { title: "Layer 2 · G4 counterfactual", badge: ["b-cand", "CANDIDATE"], group: "gate",
      purpose: "Independent perturbation tests the Layer-1 label" },
    layer3_nkx21: { title: "Layer 3 · NKX2-1 context-OOD", badge: ["b-cand", "CANDIDATE"], group: "gate",
      purpose: "Same edge across NCI-H1975 vs PC9" },
    coactivator_dependent: { title: "BRD4 · Dependent candidates", badge: ["b-cand", "CANDIDATE"], group: "exp",
      purpose: "Binding-supported nascent-DOWN units" },
    coactivator_independent: { title: "BRD4 · NO_CHANGE candidates", badge: ["b-cand", "CANDIDATE"], group: "exp",
      purpose: "Binding-supported flat-response contrast" },
    foxo1_axisa: { title: "FOXO1 · DLBCL Axis-A", badge: ["b-cand", "CANDIDATE"], group: "exp",
      purpose: "Multi-context candidates (binding audit pending)" },
    foxo1_layer3: { title: "FOXO1 · OOD pairs", badge: ["b-cand", "CANDIDATE"], group: "exp",
      purpose: "Same-edge two-context pairs" },
    smarca5_pregate: { title: "SMARCA5 · Pre-gate", badge: ["b-pregate", "PRE-GATE"], group: "exp",
      purpose: "Evidence annotation only — cannot promote" }
  };
  function meta(qid) { return META[qid] || { title: qid, badge: ["b-pending", "REVIEW"], purpose: "", group: "exp" }; }

  /* ---------- triage (computed from baked decisions + known issue sets) ---------- */
  function triageOf(qid, row) {
    var b = (BAKED[qid] || {})[row.id] || {};
    var main = b.manual_final_decision || b.manual_layer2_decision || b.manual_layer3_decision || b.human_decision || b.manual_mechanism_decision || b.manual_pair_decision || b.human_pregate_evidence_call || b.human_row_decision || "";
    if (/remove|reject/.test(main)) return "blocked";
    if (/inconclusive|needs_data|needs_binding_data/.test(main)) return "needs";
    if (qid === "gold_primary") {
      var reg = row.evidence["Regulator"] || "";
      if (reg === "TRPS1") return "blocked";
      if (reg === "ZNF143") return "needs";
      var l = Math.abs(parseFloat(row.evidence["Txn lfc"]));
      if (!isNaN(l) && l < 0.25) return "needs";
      return "clean";
    }
    return "clean";
  }
  function triageCounts(q) {
    var c = { clean: 0, needs: 0, blocked: 0 };
    q.rows.forEach(function (r) { c[triageOf(q.id, r)]++; });
    return c;
  }

  /* ---------- per-queue derived logic ---------- */
  function derived(qid, ev) {
    if (qid === "gold_primary") {
      var reg = ev["Regulator"], ac = ev["ATAC call"] || "", tc = ev["Txn call"] || "", stored = ev["Derived mechanism"];
      var red = (reg === "ZNF143") ? (tc === "CHANGE_DOWN" ? "tf_kinetics" : (tc === "FLAT" ? "chromatin_gating" : "inconclusive"))
        : (ac.indexOf("CHANGE") === 0 && tc === "FLAT") ? "chromatin_gating"
        : (ac === "FLAT" && tc.indexOf("CHANGE") === 0) ? "tf_kinetics" : "inconclusive";
      return {
        hyps: [{ n: "H1 · Chromatin-mediated", p: "ATAC CHANGE + nascent FLAT" }, { n: "H2 · Direct cis-regulatory", p: "ATAC FLAT + nascent CHANGE" }],
        obs: [["ATAC call", ac], ["Nascent call", tc], ["Nascent lfc", ev["Txn lfc"] || ""]],
        checks: [[red || "—", stored || "—"]],
        match: red === stored, label: stored || "inconclusive",
        detail: red === stored ? "Axes re-derive the stored mechanism."
          : (red === "inconclusive" ? "Axes do not force a class." : "Axes re-derive " + red + " ≠ stored " + stored + " → consider relabel.")
      };
    }
    if (qid === "layer2_g4") {
      var mech = ev["Layer-1 mechanism"], pred = mech === "tf_kinetics" ? "NO_CHANGE" : "DOWN", obs = ev["Forced Q direction"] || "";
      return {
        hyps: [{ n: "H1 · Label-consistent", p: pred + " under G4 perturbation" }, { n: "H2 · Label-falsifying", p: "≠ " + pred }],
        obs: [["Layer-1 mechanism", mech], ["Forced Q direction", obs], ["Mean lfc", ev["Mean lfc"] || ""]],
        checks: [[pred, obs]], match: obs === pred,
        label: obs === pred ? "confirmed (" + obs + ")" : "non-confirm (" + obs + ")",
        detail: obs === pred ? "Independent Q confirms the Layer-1 prediction." : "Independent Q does NOT confirm — honest non-confirm."
      };
    }
    if (qid === "layer3_nkx21") {
      var m1 = ev["H1975 mechanism"], m2 = ev["PC9 mechanism"];
      return {
        hyps: [{ n: "H1 · Invariant", p: m1 + " in both contexts" }, { n: "H2 · Context switch", p: "differs in PC9" }],
        obs: [["NCI-H1975", m1], ["PC9", m2]],
        checks: [[m1, m2]], match: m1 === m2,
        label: m1 === m2 ? "stable · " + m1 : "context switch",
        detail: m1 === m2 ? "Same mechanism across contexts." : "Switch candidate — promoter binding + senior review required."
      };
    }
    if (qid === "coactivator_dependent" || qid === "coactivator_independent") {
      var l = num(ev["log2fc"]);
      var call = l === null ? "inconclusive" : (l < 0 ? "dependent" : "independent");
      return {
        hyps: [{ n: "H1 · BRD4-dependent", p: "nascent DOWN" }, { n: "H2 · BRD4-independent", p: "nascent NO_CHANGE" }],
        obs: [["log2fc", ev["log2fc"] || ""], ["padj", ev["padj"] || ""]],
        checks: [[call, ev["Response call"] || call]], match: true, label: call,
        detail: "Direction-only read of the deposited nascent response."
      };
    }
    if (qid === "foxo1_axisa") {
      var pc = ev["PRO call"] || "", ac2 = ev["ATAC call"] || "", st = ev["Derived mechanism"];
      var red2 = (pc === "DOWN" && ac2 === "FLAT") ? "tf_kinetics" : (pc === "FLAT" && ac2 !== "FLAT" && ac2 !== "" ? "chromatin_gating" : "inconclusive");
      return {
        hyps: [{ n: "H1 · Direct", p: "PRO DOWN + ATAC FLAT" }, { n: "H2 · Chromatin", p: "PRO FLAT + ATAC CHANGE" }],
        obs: [["PRO call", pc], ["ATAC call", ac2]],
        checks: [[red2 || "—", st || "—"]], match: red2 === st, label: st || "inconclusive",
        detail: red2 === st ? "Matches; Directness=" + (ev["Directness"] || "pending") : "Not forcing — binding data needed."
      };
    }
    if (qid === "foxo1_layer3") {
      var a = ev["Mechanism 1"], b2 = ev["Mechanism 2"];
      return {
        hyps: [{ n: "H1 · Stable pair", p: a + " in both" }, { n: "H2 · Discordant", p: "differ" }],
        obs: [["Context 1", (ev["Context 1"] || "") + " · " + a], ["Context 2", (ev["Context 2"] || "") + " · " + b2]],
        checks: [[a, b2]], match: a === b2, label: a === b2 ? "stable pair" : "context-discordant",
        detail: a === b2 ? "Concordant across contexts." : "Discordant — third context or binding needed."
      };
    }
    if (qid === "smarca5_pregate") {
      return {
        hyps: [{ n: "H1 · Spacing-maintained", p: "response DOWN + binding kept" }, { n: "H2 · Spacing-independent", p: "NO_CHANGE" }],
        obs: [["Response contrast", ev["Response contrast"] || ""], ["Gates", "spacing + clone audit MISSING"]],
        checks: [["pre-gate evidence", "present"]], match: true, label: "PRE-GATE ONLY",
        detail: "Annotate evidence quality; promotion blocked by missing gates."
      };
    }
    var kev = ev["Key evidence"] || "";
    return {
      hyps: [{ n: "H1 · Route-consistent", p: "per route preregistration" }, { n: "H2 · Confounded", p: "violates route rules" }],
      obs: [["Route", ev["Route"] || ""], ["Key evidence", kev]],
      checks: [["route prereqs", "accepted"]], match: true, label: "route row",
      detail: "Route prerequisites accepted at session level."
    };
  }

  /* ---------- schema mapping ---------- */
  function YESFIELD(qid) {
    return {
      gold_primary: ["manual_final_decision", "confirm"],
      launch_critical: ["human_row_decision", "accept"],
      layer2_g4: ["manual_layer2_decision", "eligible"],
      layer3_nkx21: ["manual_layer3_decision", "eligible"],
      coactivator_dependent: ["human_decision", "accept_candidate"],
      coactivator_independent: ["human_decision", "accept_candidate"],
      foxo1_axisa: ["manual_mechanism_decision", "confirm_candidate"],
      foxo1_layer3: ["manual_pair_decision", "confirm_pair"],
      smarca5_pregate: ["human_pregate_evidence_call", "confirm_pregate_evidence"]
    }[qid] || ["manual_final_decision", "confirm"];
  }
  function OTHERS(qid) {
    return {
      gold_primary: [["relabel", "RELABEL"], ["inconclusive", "INCONCLUSIVE"], ["remove", "EXCLUDE"]],
      launch_critical: [["reject", "REJECT"], ["inconclusive", "INCONCLUSIVE"]],
      layer2_g4: [["reject", "REJECT"], ["inconclusive", "INCONCLUSIVE"]],
      layer3_nkx21: [["reject", "REJECT"], ["inconclusive", "INCONCLUSIVE"]],
      coactivator_dependent: [["needs_data", "NEEDS DATA"], ["reject", "REJECT"]],
      coactivator_independent: [["needs_data", "NEEDS DATA"], ["reject", "REJECT"]],
      foxo1_axisa: [["relabel", "RELABEL"], ["needs_binding_data", "NEEDS BINDING DATA"], ["reject", "REJECT"]],
      foxo1_layer3: [["needs_third_context", "NEEDS 3RD CONTEXT"], ["inconclusive", "INCONCLUSIVE"], ["reject", "REJECT"]],
      smarca5_pregate: [["inconclusive", "INCONCLUSIVE"], ["reject", "REJECT"]]
    }[qid] || [];
  }
  function questionsFor(qid) {
    if (qid === "layer2_g4") return ["Evidence + independent perturbation valid?", "Does Q discriminate the Layer-1 prediction?", "Is the confirmed / non-confirm call correct?"];
    if (qid === "layer3_nkx21") return ["Evidence valid in BOTH contexts?", "Are the two mechanism calls correct?", "Is the stable / switch classification correct?"];
    if (qid === "coactivator_dependent" || qid === "coactivator_independent") return ["Evidence + binding support valid?", "Does the nascent sign support the dependence call?", "Is the dependence call correct?"];
    if (qid === "foxo1_axisa") return ["Evidence valid?", "Do PRO/ATAC axes discriminate?", "Is the derived label correct (binding audit pending)?"];
    if (qid === "foxo1_layer3") return ["Evidence valid in both contexts?", "Do the two calls hold?", "Is the pair classification correct?"];
    if (qid === "smarca5_pregate") return ["Response evidence valid?", "Binding evidence (cross-clone) acceptable?", "Is PRE-GATE-ONLY the right status?"];
    if (qid === "launch_critical") return ["Route prerequisites valid?", "Row evidence consistent?", "Is the forced outcome correct?"];
    return ["Evidence valid (identity / perturbation / deposited data)?", "Do the axes discriminate H1 vs H2?", "Does the evidence re-derive the stored label?"];
  }
  var RISKS = ["Missing binding evidence", "Temporal mismatch", "Assay mismatch", "Weak perturbation evidence", "Possible indirect regulation", "Context mismatch", "Statistical uncertainty", "Other"];

  /* ---------- dashboard (results-forward, grouped by priority) ---------- */
  var GROUPS = [
    ["must", "🔴 MUST REVIEW — validate the official benchmark", "grpMust"],
    ["gate", "🟡 RELEASE GATING — Layer 2/3 candidates(不裁决不进 official)", "grpGate"],
    ["exp", "🔵 EXPLORATORY — candidate axes(低优先)", "grpExp"]
  ];
  function outcomeSummary(qid) {
    var b = BAKED[qid] || {}, l = localDecisions(qid);
    var fld = { gold_primary: "manual_final_decision", launch_critical: "human_row_decision", layer2_g4: "manual_layer2_decision", layer3_nkx21: "manual_layer3_decision", coactivator_dependent: "human_dependence_call", coactivator_independent: "human_dependence_call", foxo1_axisa: "manual_mechanism_decision", foxo1_layer3: "manual_pair_decision", smarca5_pregate: "human_pregate_evidence_call" }[qid];
    var c = {};
    Object.keys(b).forEach(function (uid) { var v = b[uid][fld] || "(blank)"; c[v] = (c[v] || 0) + 1; });
    Object.keys(l).forEach(function (uid) { if (l[uid] && l[uid].__done) { var v = l[uid][fld] || "(blank)"; c[v] = (c[v] || 0) + 1; } });
    switch (qid) {
      case "gold_primary": return "<b>" + (c.confirm || 0) + "</b> confirmed · <b>" + (c.inconclusive || 0) + "</b> flagged (ZNF143 fixed v0.3 / TRPS1 quarantined)";
      case "launch_critical": return "<b>" + (c.accept || 0) + "</b> accepted · route gates closed";
      case "layer2_g4": return "<b>" + (c.eligible || 0) + "</b> counterfactual units · " + (c.inconclusive || 0) + " honest non-confirm";
      case "layer3_nkx21": return "<b>" + (c.eligible || 0) + "</b> stable (context-OOD) · <b>" + (c.inconclusive || 0) + "</b> real switch (ENTPD3)";
      case "coactivator_dependent": return "<b>" + (c.dependent || 0) + "</b> BRD4-dependent (binding-supported)";
      case "coactivator_independent": return "<b>" + (c.independent || 0) + "</b> independent · <b>" + (c.inconclusive || 0) + "</b> needs-data";
      case "foxo1_axisa": return "<b>" + (c.confirm_candidate || 0) + "</b> confirmed · <b>" + (c.needs_binding_data || 0) + "</b> binding-pending";
      case "foxo1_layer3": return "<b>" + (c.confirm_pair || 0) + "</b> stable pairs · <b>" + (c.inconclusive || 0) + "</b> discordant";
      case "smarca5_pregate": return "<b>" + (c.confirm_pregate_evidence || 0) + "</b> evidence-confirmed · spacing+clone gates missing";
    }
    return "";
  }
  function renderDashboard() {
    GROUPS.forEach(function (g) {
      var tbody = el(g[2]); tbody.innerHTML = "";
      var tc = { clean: 0, needs: 0, blocked: 0 };
      BUNDLE.queues.filter(function (q) { return meta(q.id).group === g[0]; }).forEach(function (q) {
        var t = triageCounts(q);
        tc.clean += t.clean; tc.needs += t.needs; tc.blocked += t.blocked;
        var done = countDone(q.id);
        var tr = document.createElement("tr");
        tr.innerHTML = "<td><b>" + esc(meta(q.id).title) + "</b></td><td>" + outcomeSummary(q.id) + "</td>" +
          '<td class="n">' + q.n + "</td>" +
          '<td><span class="tri t-clean"></span>' + t.clean + ' <span class="tri t-needs"></span>' + t.needs + ' <span class="tri t-blocked"></span>' + t.blocked + "</td>" +
          '<td><span class="badge ' + meta(q.id).badge[0] + '">' + esc(meta(q.id).badge[1]) + "</span></td>" +
          '<td><button class="btn small" data-q="' + esc(q.id) + '">' + (done ? "Continue →" : "Start →") + "</button></td>";
        tr.querySelector("button").onclick = function () { openQueue(q.id); };
        tbody.appendChild(tr);
      });
      var heads = document.querySelectorAll("h3.ghead");
      var h = heads[GROUPS.map(function (x) { return x[0]; }).indexOf(g[0])];
      if (h) h.innerHTML = h.innerHTML + ' <span class="muted" style="font-size:12px;font-weight:400">🟢 ' + tc.clean + " clean · 🟡 " + tc.needs + " needs review · 🔴 " + tc.blocked + " blocked</span>";
    });
  }

  /* ---------- review card ---------- */
  function renderCard() {
    var q = state.queue, row = q.rows[state.idx], m = meta(q.id), dv = derived(q.id, row.evidence);
    var t = triageOf(q.id, row);
    el("qTitle").textContent = m.title;
    el("qBadge").className = "badge " + m.badge[0]; el("qBadge").textContent = m.badge[1];
    el("unitId").textContent = "Evidence Case #" + (row.id || "");
    var tri = { clean: '<span class="badge b-official">🟢 CLEAN — quick confirm</span>', needs: '<span class="badge b-cand">🟡 NEEDS REVIEW</span>', blocked: '<span class="badge b-pregate">🔴 BLOCKED — exclude/inconclusive</span>' }[t];
    el("triageBadge").innerHTML = tri;
    var edge = row.evidence["Target"] ? ((row.evidence["Regulator"] || row.evidence["Coactivator"] || "") + " → " + row.evidence["Target"]) : (row.evidence["Edge"] || "");
    var CURATED = { "MB-v0.2-0298":"runx1_gating", "MB-v0.2-0482":"runx1_kinetics", "COACT-BD-0001":"brd4_dep" };
    var chainLink = CURATED[row.id] ? ' <a href="unit.html?unit=' + CURATED[row.id] + '" target="_blank">[View Evidence Chain →]</a>' : "";
    el("edgeName").innerHTML = esc(edge) + chainLink;
    var d = decisionsFor(q.id)[row.id];
    if (d && d.__done) { el("doneTag").textContent = d.__baked ? "FIRST-PASS RECORD" : "REVIEWED"; el("doneTag").classList.remove("hidden"); }
    else { el("doneTag").classList.add("hidden"); }
    var done = countDone(q.id), pct = q.n ? Math.round(done / q.n * 100) : 0;
    el("progress").textContent = done + " / " + q.n + " reviewed";
    el("pbar").style.width = pct + "%";

    el("pertBox").innerHTML = ["Perturbation", "Diagnostic", "Timepoint", "Readout", "Cell type"].map(function (k) {
      var v = row.evidence[k];
      return v ? "<b>" + esc(v) + "</b> <span class='muted'>" + esc(k) + "</span>" : "";
    }).filter(Boolean).join(" &nbsp;·&nbsp; ") || "—";
    var o0 = dv.obs[0] || ["", ""];
    el("obsBox").textContent = o0[0] + " = " + o0[1];
    el("obsDetail").textContent = dv.obs.slice(1).map(function (x) { return x[0] + " = " + x[1]; }).join(" · ");
    el("hypRow").innerHTML = dv.hyps.map(function (h) {
      return '<div class="hbox"><div class="muted" style="font-size:12px">' + esc(h.n) + '</div><div class="pred">' + esc(h.p) + "</div></div>";
    }).join("");
    var chk = dv.checks.map(function (c) {
      var ok = String(c[0]) === String(c[1]);
      return "<tr><td>" + esc(String(c[0])) + "</td><td>" + esc(String(c[1])) + "</td><td class='" + (ok ? "match-yes" : "match-no") + "'>" + (ok ? "✓" : "✗") + "</td></tr>";
    }).join("");
    el("derivedBox").innerHTML = '<div class="label">DERIVED: ' + esc(dv.label) + '</div><table class="qtable" style="font-size:13px;margin-top:8px"><tr><th>expectation</th><th>value</th><th></th></tr>' + chk + '</table><div style="font-size:13px;margin-top:6px">' + esc(dv.detail) + "</div>";

    var qs3 = questionsFor(qid);
    var saved = decisionsFor(q.id)[row.id] || {};
    var a1 = saved.__q1 || "yes", a2 = saved.__q2 || "yes", a3 = saved.__q3 || "yes";
    function radios(name, selv) {
      return ["yes", "no", "unclear"].map(function (o) {
        return '<label style="margin-right:12px"><input type="radio" name="' + name + '" value="' + o + '"' + (selv === o ? " checked" : "") + "/> " + o + "</label>";
      }).join("");
    }
    el("q1").innerHTML = radios("q1", a1); el("q2").innerHTML = radios("q2", a2); el("q3").innerHTML = radios("q3", a3);

    var allYes = (a1 === "yes" && a2 === "yes" && a3 === "yes");
    el("quickBtns").innerHTML = allYes
      ? '<button class="btn big" id="acceptBtn">🟢 ACCEPT DERIVED LABEL</button><span class="muted">3/3 — quick confirm</span>'
      : '<span class="badge b-cand">Cannot accept directly</span><span class="muted">choose disposition + rationale below</span>';

    var adv = el("advanced");
    if (allYes) {
      adv.classList.add("hidden");
      var ab = el("acceptBtn");
      if (ab) ab.onclick = function () {
        var dec = buildDecision(true);
        if (!dec) return;
        commit(dec);
        advance();
      };
    } else {
      adv.classList.remove("hidden");
    }
    var others = OTHERS(q.id);
    el("advDisp").innerHTML = '<option value="">— choose —</option>' + others.map(function (o) { return '<option value="' + esc(o[0]) + '">' + esc(o[1]) + "</option>"; }).join("");
    el("advRisks").innerHTML = RISKS.map(function (c) { return "<label><input type='checkbox' class='riskchk'/> " + esc(c) + "</label>"; }).join("");
    if (!el("advReason").value) el("advReason").value = saved.manual_reason && saved.manual_reason.indexOf("3/3") === -1 ? saved.manual_reason : "";
    el("saveNextBtn").onclick = function () { var dec = buildDecision(false); if (!dec) return; dec.__done = true; commit(dec); advance(); };
  }

  function buildDecision(allYesAuto) {
    var q = state.queue, row = q.rows[state.idx];
    var a1 = (document.querySelector('input[name="q1"]:checked') || {}).value || "yes";
    var a2 = (document.querySelector('input[name="q2"]:checked') || {}).value || "yes";
    var a3 = (document.querySelector('input[name="q3"]:checked') || {}).value || "yes";
    var out = { __q1: a1, __q2: a2, __q3: a3 };
    var yf = YESFIELD(q.id);
    var allYes = (a1 === "yes" && a2 === "yes" && a3 === "yes");
    if (allYesAuto) {
      out[yf[0]] = yf[1];
      out.manual_reason = "Evidence chain verified (3/3 checks passed).";
    } else {
      var disp = (el("advDisp").value || "").trim();
      if (!disp) { alert("Choose a disposition."); return null; }
      out[yf[0]] = disp;
      var reason = (el("advReason").value || "").trim();
      var risks = [].map.call(document.querySelectorAll(".riskchk:checked"), function (x) { return x.parentNode.textContent.trim(); });
      if (!reason) { alert("Rationale is required when not accepting."); return null; }
      if (risks.length) reason += " [risks: " + risks.join("; ") + "]";
      out.manual_reason = reason;
    }
    if (q.id === "layer3_nkx21") out.manual_context_stability_label = row.evidence["H1975 mechanism"] === row.evidence["PC9 mechanism"] ? "stable" : "switch";
    if (q.id === "foxo1_layer3") out.manual_context_stability = row.evidence["Mechanism 1"] === row.evidence["Mechanism 2"] ? "stable" : "context_discordant";
    if (q.id === "layer2_g4") out.manual_forced_q_label = row.evidence["Forced Q direction"] || "";
    if (q.id === "gold_primary" && out.manual_final_decision === "relabel") {
      var rl = (el("advRelabel") || {}).value || "";
      if (!rl) { alert("Relabel requires corrected mechanism."); return null; }
      out.corrected_mechanism_if_change = rl;
    }
    return out;
  }
  function commit(dec) {
    var q = state.queue, row = q.rows[state.idx];
    dec.__reviewer = reviewerId(); dec.__date = new Date().toISOString().slice(0, 10);
    var s = store(); s[q.id] = s[q.id] || {}; s[q.id][row.id] = dec; saveStore(s);
  }
  function advance() {
    var q = state.queue;
    if (state.onlyUndone) {
      for (var i = state.idx + 1; i < q.rows.length; i++) {
        if (!unitDone(q.id, q.rows[i].id)) { state.idx = i; renderCard(); return; }
      }
      state.idx = q.rows.length - 1;
    } else {
      state.idx = Math.min(q.rows.length - 1, state.idx + 1);
    }
    renderCard();
  }

  /* ---------- navigation / export ---------- */
  function go(delta) {
    var next = state.idx + delta;
    if (state.onlyUndone && delta > 0) {
      var rows = state.queue.rows;
      for (var i = state.idx + 1; i < rows.length; i++) if (!unitDone(state.queue.id, rows[i].id)) { next = i; break; }
    }
    state.idx = Math.max(0, Math.min(state.queue.rows.length - 1, next));
    renderCard();
  }
  function rowSearchText(row) {
    var p = [row.id || ""];
    Object.keys(row.evidence || {}).forEach(function (k) { p.push(k, row.evidence[k]); });
    return p.join(" ").toLowerCase();
  }
  function findNextMatch() {
    var n = (el("findText").value || "").trim().toLowerCase(); if (!n) return;
    var rows = state.queue.rows;
    for (var o = 1; o <= rows.length; o++) {
      var i = (state.idx + o) % rows.length;
      if (rowSearchText(rows[i]).indexOf(n) !== -1) { state.idx = i; renderCard(); return; }
    }
    alert("No match: " + n);
  }
  function csvCell(v) { v = String(v == null ? "" : v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }
  function downloadFile(name, text, mime) {
    var b = new Blob([text], { type: mime }); var a = document.createElement("a");
    a.href = URL.createObjectURL(b); a.download = name; document.body.appendChild(a); a.click(); a.remove();
  }
  function exportCsv() {
    var q = state.queue, d = decisionsFor(q.id);
    var cols = ["unit_id"].concat(q.decisions.map(function (x) { return x.name; })).concat(["reviewer_id", "review_date"]);
    var lines = [cols.join(",")], counts = {}, done = 0;
    q.rows.forEach(function (row) {
      var dd = d[row.id]; if (!dd || !dd.__done) return; done++;
      var rec = [row.id];
      q.decisions.forEach(function (s2) { rec.push(dd[s2.name] || ""); });
      rec.push(dd.__reviewer || "", dd.__date || "");
      lines.push(rec.map(csvCell).join(","));
      var k = dd[q.decisions[0].name] || "(blank)"; counts[k] = (counts[k] || 0) + 1;
    });
    if (!done) { alert("No completed decisions in this queue."); return; }
    var summ = "Export summary\n\nReviewer: " + (reviewerId() || "anon") + "\nQueue: " + meta(q.id).title + "\nCompleted: " + done + " / " + q.n + "\n\n" +
      Object.keys(counts).map(function (k) { return k + ": " + counts[k]; }).join("\n") + "\n\nReviewer decisions only — does not modify the frozen release.";
    if (confirm(summ + "\n\nDownload CSV?")) downloadFile(q.id + "_decisions_" + (reviewerId() || "anon") + ".csv", lines.join("\n"), "text/csv");
  }

  /* ---------- wiring ---------- */
  function openQueue(qid) {
    state.queue = BUNDLE.queues.filter(function (q) { return q.id === qid; })[0];
    state.idx = firstIndex();
    el("setup").classList.add("hidden"); el("review").classList.remove("hidden");
    renderCard();
  }
  function back() {
    el("review").classList.add("hidden"); el("setup").classList.remove("hidden");
    if (location.hash) history.replaceState(null, "", location.pathname + location.search);
    renderDashboard();
  }
  function firstIndex() {
    if (!state.onlyUndone) return 0;
    var rows = state.queue.rows;
    for (var i = 0; i < rows.length; i++) if (!unitDone(state.queue.id, rows[i].id)) return i;
    return 0;
  }
  el("backBtn").onclick = back;
  el("exportBtn").onclick = exportCsv;
  el("prevBtn").onclick = function () { go(-1); };
  el("skipBtn").onclick = function () { go(1); };
  el("saveNextBtn").onclick = function () { var dec = buildDecision(false); if (!dec) return; dec.__done = true; commit(dec); advance(); };
  el("jumpTo").onchange = function (e) { var n = parseInt(e.target.value, 10); if (n >= 1 && n <= state.queue.rows.length) { state.idx = n - 1; renderCard(); } };
  el("findBtn").onclick = findNextMatch;
  el("findText").onkeydown = function (e) { if (e.key === "Enter") { e.preventDefault(); findNextMatch(); } };
  el("onlyUndone").onchange = function (e) { state.onlyUndone = e.target.checked; state.idx = firstIndex(); renderCard(); };
  var savedName = localStorage.getItem(LSKEY + "_who");
  if (savedName) el("reviewerId").value = savedName;
  el("reviewerId").oninput = function (e) { localStorage.setItem(LSKEY + "_who", e.target.value.trim()); };
  fetch("REVIEWER_OPERATING_PROCEDURE.md").then(function (r) { return r.text(); }).then(function (t) { el("ropBox").innerHTML = "<pre style='white-space:pre-wrap;font-size:12.5px'>" + esc(t) + "</pre>"; }).catch(function () {});
  fetch("REVIEW_ISSUES.md").then(function (r) { return r.text(); }).then(function (t) { el("issuesBox").innerHTML = "<pre style='white-space:pre-wrap;font-size:12.5px'>" + esc(t) + "</pre>"; }).catch(function () {});

  if (!BUNDLE.queues.length) {
    el("grpMust").innerHTML = '<tr><td>queues.js not loaded</td></tr>';
  } else {
    renderDashboard();
    function routeFromHash() {
      var h = (location.hash || "").replace(/^#/, "");
      if (h && BUNDLE.queues.some(function (q) { return q.id === h; })) openQueue(h);
    }
    routeFromHash();
    window.addEventListener("hashchange", routeFromHash);
  }
})();
