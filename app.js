/* MechanismBench — Scientific Evidence Adjudication console.
   Vanilla JS. Decisions persist in localStorage (key mechbench_review_v1).
   Export CSV keeps the validator-compatible column order:
   unit_id, <queue decision fields...>, reviewer_id, review_date. */
(function () {
  "use strict";
  var BUNDLE = (window.REVIEW_QUEUES || { queues: [] });
  var LSKEY = "mechbench_review_v1";
  var state = { queue: null, idx: 0, onlyUndone: false };

  // ---------- persistence (unchanged format) ----------
  function store() { try { return JSON.parse(localStorage.getItem(LSKEY)) || {}; } catch (e) { return {}; } }
  function saveStore(s) { localStorage.setItem(LSKEY, JSON.stringify(s)); }
  function reviewerId() { return (document.getElementById("reviewerId").value || "").trim(); }
  function decisionsFor(qid) { var s = store(); s[qid] = s[qid] || {}; return s[qid]; }
  function unitDone(qid, uid) { var d = decisionsFor(qid)[uid]; return !!(d && d.__done); }
  function countDone(qid) { var d = decisionsFor(qid), n = 0; for (var k in d) if (d[k] && d[k].__done) n++; return n; }

  // ---------- per-queue presentation metadata ----------
  var META = {
    gold_primary: { title: "GOLD primary", badge: ["b-official","OFFICIAL · PRIMARY AUDIT"],
      purpose: "Primary mechanism-label audit: confirm each derived label against its deposited two-axis evidence.",
      layer: "L1",
      checks: ["Same regulatory edge as labeled?","Response axes (ATAC + nascent) both deposited?","Axes re-derive the stored mechanism?","Decision rule applied is the preregistered one?","Binding filter consistent with tier?"] },
    launch_critical: { title: "Launch-critical", badge: ["b-gate","L2/L3 GATE"],
      purpose: "Rows that close the Layer-2/3 route gates: route prerequisites plus row-level evidence.",
      layer: "L2/L3",
      checks: ["Route prerequisites accepted (strand/window/answer-key)?","Row evidence supports the forced outcome?","No confound between primary and secondary perturbation?"] },
    layer2_g4: { title: "Layer 2 · G4 counterfactual", badge: ["b-cand","CANDIDATE"],
      purpose: "Counterfactual validation: an independent secondary perturbation (G4/TMPyP4) tests whether the Layer-1 mechanism label predicts the observed response.",
      layer: "L2",
      checks: ["Same regulatory edge?","Secondary perturbation independent of primary?","Mechanism predictions directionally discriminative?","Observed response interpretable?","Time window acceptable (1 h vs 30 min — disclosed)?","Deposited data support the stated response?"] },
    layer3_nkx21: { title: "Layer 3 · NKX2-1 context-OOD", badge: ["b-cand","CANDIDATE"],
      purpose: "Context-OOD validation: same edge measured in two lung contexts (NCI-H1975 vs PC9); mechanism should be invariant.",
      layer: "L3",
      checks: ["Same regulatory edge in both contexts?","Same mechanism definition applied?","Contexts independently measured?","Perturbations comparable (2 h dTAG both)?","Apparent switch biologically interpretable (binding)?"] },
    coactivator_dependent: { title: "BRD4 · Dependent candidates", badge: ["b-cand","CANDIDATE"],
      purpose: "Binding-supported genes whose nascent transcription drops after BRD4 degradation — candidate BRD4-dependent units.",
      layer: "M1-axis",
      checks: ["Binding supported (≥2/3 ENCODE IDR)?","Nascent response direction correct?","3/3-strict sensitivity acknowledged (51→29)?","Two independent primary reviewers required for this queue."] },
    coactivator_independent: { title: "BRD4 · Binding-supported NO_CHANGE candidates", badge: ["b-cand","CANDIDATE"],
      purpose: "Gene-level NO_CHANGE after BRD4 degradation with BRD4 binding in ≥2/3 released ENCODE IDR peak sets — diagnostic contrast side.",
      layer: "M1-axis",
      checks: ["Binding supported?","Response genuinely flat (not low-power)?","Calibration batch B01 double-reviewed first?"] },
    foxo1_axisa: { title: "FOXO1 · DLBCL Axis-A", badge: ["b-cand","CANDIDATE"],
      purpose: "Multi-context candidate units across DLBCL lines; exact-context FOXO1 binding audit pending.",
      layer: "M1/M2-axis",
      checks: ["Mechanism re-derivable from PRO/ATAC calls?","Directness pending — binding audit flagged?","Context imbalance disclosed (377/26/326)?"] },
    foxo1_layer3: { title: "FOXO1 · OOD pairs", badge: ["b-cand","CANDIDATE"],
      purpose: "Same-edge two-context pairs (76 pair-units over 68 unique targets — not independent replicates).",
      layer: "L3",
      checks: ["Valid paired edge?","Mechanism definition identical across contexts?","Pair count not treated as independent N?"] },
    smarca5_pregate: { title: "SMARCA5 · Pre-gate", badge: ["b-pregate","PRE-GATE"],
      purpose: "Response + cross-clone binding evidence exists; spacing and clone-identity gates are still missing.",
      layer: "M2-axis",
      checks: ["Annotate evidence quality only — cannot promote to scored class.","Spacing diagnostic missing?","Exact degron-clone identity unaudited?"] }
  };
  function meta(qid) {
    return META[qid] || { title: qid, badge: ["b-pending","REVIEW"], purpose: "", layer: "", checks: [] };
  }

  // ---------- helpers ----------
  function esc(s){ return String(s==null?"":s).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c];}); }
  function num(x){ var v=parseFloat(x); return isNaN(v)?null:v; }
  function el(id){ return document.getElementById(id); }
  function trs(ev, skip){ var h=""; Object.keys(ev||{}).forEach(function(k){ if(skip[k])return; var v=ev[k]; if(v===""||v==null)return;
      if(/^https?:\/\//.test(String(v))){ h+='<tr><td class="k">'+esc(k)+'</td><td class="v">'+String(v).split(" | ").map(function(u){return /^https?:/.test(u)?'<a href="'+esc(u)+'" target="_blank">'+esc(u.replace("https://www.ncbi.nlm.nih.gov/geo/query/acc.cgi?acc=","GEO:").replace("https://www.encodeproject.org/experiments/","ENCODE:").replace("https://pmc.ncbi.nlm.nih.gov/articles/","PMC:"))+'</a>':esc(u);}).join(" | ")+'</td></tr>'; }
      else h+='<tr><td class="k">'+esc(k)+'</td><td class="v">'+esc(String(v))+'</td></tr>'; });
    return h; }

  // ---------- dashboard ----------
  function renderDashboard(){
    var host = el("queueList"); host.innerHTML="";
    var tot=0;
    BUNDLE.queues.forEach(function(q){
      var m = meta(q.id); var done = countDone(q.id); tot+=done;
      var tr=document.createElement("tr");
      tr.innerHTML =
        '<td><b>'+esc(m.title)+'</b></td>'+
        '<td>'+esc(m.purpose)+'</td>'+
        '<td class="n">'+q.n+'</td>'+
        '<td class="n">'+done+'</td>'+
        '<td><span class="badge '+m.badge[0]+'">'+esc(m.badge[1])+'</span></td>'+
        '<td><button class="btn small" data-q="'+esc(q.id)+'">Review →</button></td>';
      tr.querySelector("button").onclick=function(){ openQueue(q.id); };
      host.appendChild(tr);
    });
    el("stReviewed").textContent = tot;
  }

  // ---------- derived-label logic per queue ----------
  function derived(qid, ev){
    if(qid==="gold_primary"){
      var reg=ev["Regulator"], ac=ev["ATAC call"]||"", tc=ev["Txn call"]||"", stored=ev["Derived mechanism"];
      var red = (reg==="ZNF143") ? (tc==="CHANGE_DOWN"?"tf_kinetics":(tc==="FLAT"?"chromatin_gating":"inconclusive"))
        : (ac.indexOf("CHANGE")===0 && tc==="FLAT") ? "chromatin_gating"
        : (ac==="FLAT" && tc.indexOf("CHANGE")===0) ? "tf_kinetics" : "inconclusive";
      var h1={name:"H1 · Chromatin-mediated",pred:"NO_CHANGE"===tc?"(n/a)":""};
      return { hyps:[
          {name:"H1 · Chromatin-mediated", pred:"ATAC CHANGE + nascent FLAT"},
          {name:"H2 · Direct cis-regulatory", pred:"ATAC FLAT + nascent CHANGE"}],
        obs:[["ATAC call",ac],["Nascent call",tc]],
        check:[["re-derived: "+(red||"—"), stored],["stored (paper-independent)", stored]],
        match: red===stored,
        label: stored||"inconclusive",
        detail: red===stored ? "axes re-derive the stored mechanism" : (red==="inconclusive" ? "axes do not force a class (known issue set — see release notes)" : "axes re-derive "+red+" ≠ stored "+stored+" → consider relabel") };
    }
    if(qid==="layer2_g4"){
      var mech=ev["Layer-1 mechanism"], pred = mech==="tf_kinetics"?"NO_CHANGE":"DOWN";
      var obs=ev["Forced Q direction"]||"";
      return { hyps:[
          {name:"H1 · Label-consistent response", pred:pred+" under G4 perturbation"},
          {name:"H2 · Label-falsifying response", pred:"direction ≠ "+pred}],
        obs:[["Layer-1 mechanism",mech],["Forced Q direction",obs],["Mean lfc",ev["Mean lfc"]||""]],
        check:[["prediction "+pred, obs]],
        match: obs===pred,
        label: obs===pred ? "confirmed ("+obs+")" : "non-confirm ("+obs+")",
        detail: obs===pred ? "independent Q confirms the Layer-1 prediction" : "independent Q does NOT confirm — honest non-confirm, unit not promoted" };
    }
    if(qid==="layer3_nkx21"){
      var m1=ev["H1975 mechanism"], m2=ev["PC9 mechanism"];
      return { hyps:[
          {name:"H1 · Mechanism invariant", pred:m1+" in both contexts"},
          {name:"H2 · Context switch", pred:"different mechanism in PC9"}],
        obs:[["H1975",m1],["PC9",m2]],
        check:[["invariance", m1===m2?"stable":"switch"]],
        match: m1===m2,
        label: m1===m2 ? "stable · "+m1 : "context switch",
        detail: m1===m2 ? "same mechanism supported across contexts" : "switch candidate — requires promoter binding + senior second review" };
    }
    if(qid==="coactivator_dependent"||qid==="coactivator_independent"){
      var l=num(ev["log2fc"]);
      var call = l===null?"inconclusive":(l<0?"dependent":"independent");
      return { hyps:[
          {name:"H1 · BRD4-dependent", pred:"nascent DOWN after degradation"},
          {name:"H2 · BRD4-independent", pred:"nascent NO_CHANGE"}],
        obs:[["log2fc",ev["log2fc"]||""],["padj",ev["padj"]||""],["Response call",ev["Response call"]||""]],
        check:[["sign of lfc", call]],
        match: (qid==="coactivator_dependent") ? (call==="dependent") : (call==="independent"),
        label: call,
        detail: "direction-only read of deposited nascent response" };
    }
    if(qid==="foxo1_axisa"){
      var pc=ev["PRO call"]||"", ac2=ev["ATAC call"]||"", st=ev["Derived mechanism"];
      var red = (pc==="DOWN"&&ac2==="FLAT")?"tf_kinetics":(pc==="FLAT"&&ac2!=="FLAT"&&ac2!==""?"chromatin_gating":"inconclusive");
      return { hyps:[
          {name:"H1 · Direct (M1-axis)", pred:"PRO DOWN + ATAC FLAT"},
          {name:"H2 · Chromatin (M2-axis)", pred:"PRO FLAT + ATAC CHANGE"}],
        obs:[["PRO call",pc],["ATAC call",ac2]],
        check:[["re-derived: "+(red||"—"), st]],
        match: red===st,
        label: st||"inconclusive",
        detail: red===st?"matches; Directness="+(ev["Directness"]||"pending"):"axes not forcing — binding data needed" };
    }
    if(qid==="foxo1_layer3"){
      var a=ev["Mechanism 1"], b=ev["Mechanism 2"];
      return { hyps:[
          {name:"H1 · Pair stable", pred:a+" in both contexts"},
          {name:"H2 · Discordant", pred:"mechanisms differ"}],
        obs:[["Context 1",ev["Context 1"]+" · "+a],["Context 2",ev["Context 2"]+" · "+b]],
        check:[["stability", a===b?"stable":"discordant"]],
        match: a===b, label: a===b?"stable pair":"context-discordant",
        detail: a===b?"concordant across contexts":"discordant — needs third context or binding" };
    }
    if(qid==="smarca5_pregate"){
      return { hyps:[
          {name:"H1 · Spacing-maintained dependence", pred:"response DOWN + binding maintained"},
          {name:"H2 · Spacing-independent", pred:"response NO_CHANGE"}],
        obs:[["Response contrast",ev["Response contrast"]||""],["Gate status","spacing + clone audit MISSING"]],
        check:[["pre-gate evidence","present"]],
        match:true, label:"PRE-GATE ONLY",
        detail:"Reviewer annotates evidence quality; this queue CANNOT be promoted — spacing/architecture diagnostic and exact clone audit are missing." };
    }
    // launch_critical & fallback
    var kev=ev["Key evidence"]||""; var fq=(kev.match(/forced_Q=(\w+)/)||[])[1]||"";
    return { hyps:[
        {name:"H1 · Route-consistent outcome", pred:"per route preregistration"},
        {name:"H2 · Confounded outcome", pred:"violates route rules"}],
      obs:[["Route",ev["Route"]||""],["Key evidence",kev]],
      check:[["route prereqs","accepted (strand / 1h-vs-30min disclosed / TT-seq key)"]],
      match:true, label:"route row", detail:"route prerequisites accepted at session level; verify row-level evidence consistency." };
  }

  // ---------- integrity + risk templates ----------
  var INTEGRITY={
    gold_primary:["Regulator identity verified","Target identity verified","Perturbation verified","Timepoint compatible","Assay quality acceptable","Direction derivation reproducible","Binding evidence sufficient"],
    default_:["Regulator identity verified","Target identity verified","Perturbation verified","Deposited data accessible","Direction derivation reproducible"]
  };
  var RISKS=["Missing binding evidence","Temporal mismatch","Assay mismatch","Weak perturbation evidence","Possible indirect regulation","Context mismatch","Statistical uncertainty","Other"];

  // ---------- review card ----------
  function renderCard(){
    var q=state.queue, row=q.rows[state.idx], m=meta(q.id), dv=derived(q.id,row.evidence);
    el("qTitle").textContent=m.title;
    el("qBadge").className="badge "+m.badge[0]; el("qBadge").textContent=m.badge[1];
    el("banner").textContent=q.banner||"";
    el("unitId").textContent=row.id||"(no id)";
    var edge = row.evidence["Target"]? ( (row.evidence["Regulator"]||row.evidence["Coactivator"]||"")+" → "+row.evidence["Target"] ) : (row.evidence["Edge"]||"");
    el("edgeName").textContent=edge;
    el("doneTag").classList.toggle("hidden",!unitDone(q.id,row.id));
    var done=countDone(q.id), pct=q.n?Math.round(done/q.n*100):0;
    el("progress").textContent="unit "+(state.idx+1)+" / "+q.n+" · "+done+" reviewed ("+pct+"%)";
    el("pbar").style.width=pct+"%";

    el("whyText").textContent=m.purpose;
    el("layerChecks").innerHTML=m.checks.map(function(c){return "☐ "+esc(c);}).join("<br>");

    var skip={"Data / Paper links":1,"Full texts":1,"Regulator":1,"Coactivator":1,"Target":1,"Edge":1,"Layer-1 mechanism":1,"Derived mechanism":1,"ATAC call":1,"Txn call":1,"H1975 mechanism":1,"PC9 mechanism":1,"Mechanism 1":1,"Mechanism 2":1,"Context 1":1,"Context 2":1,"Forced Q direction":1,"log2fc":1,"padj":1,"PRO call":1,"ATAC call":1,"Response call":1,"Mean lfc":1};
    el("edgeTable").innerHTML=(function(){ var h="";
      [["Regulator","Regulator"],["Coactivator","Coactivator"],["Target","Target"],["Cell type","Cell context"],["Perturbation","Perturbation"],["Timepoint","Time"],["Context pair","Contexts"],["Diagnostic","Diagnostic"],["Readout","Assay"],["Source","Accession"]].forEach(function(pair){
        var v=row.evidence[pair[0]]; if(v) h+="<tr><td class='k'>"+esc(pair[1])+"</td><td class='v'>"+esc(String(v))+"</td></tr>"; });
      return h; })();
    el("dataLinks").innerHTML=(function(){ var L=(row.evidence["Data / Paper links"]||"").split(" | ").filter(Boolean); var out=[];
      L.forEach(function(u){ if(/^https?:/.test(u)){ var t=u.replace("https://www.ncbi.nlm.nih.gov/geo/query/acc.cgi?acc=","GEO ").replace("https://www.encodeproject.org/experiments/","ENCODE ").replace("https://pmc.ncbi.nlm.nih.gov/articles/","PMC ").replace(/\/$/,""); out.push('<a href="'+esc(u)+'" target="_blank">'+esc(t)+"</a>"); } });
      out.push('<span class="muted">全文: repo data/raw/papers/</span>');
      return out.join(" · "); })();

    el("hypRow").innerHTML=dv.hyps.map(function(h){ return '<div class="hbox"><div class="muted" style="font-size:12px">'+esc(h.name)+'</div><div class="pred">'+esc(h.pred)+"</div></div>"; }).join("");

    el("evidence").innerHTML=trs(row.evidence,skip);

    var chk=dv.check.map(function(c){ var isC=c[0].indexOf("re-derived")===0||c[0]==="invariance"||c[0]==="stability"||c[0]==="sign of lfc"||c[0]==="prediction "+c[0].slice(10)||c[0].indexOf("prediction")===0;
        var okmark = String(c[0]).indexOf("re-derived")===0 ? (c[0].slice(11)===String(c[1])) : (c[0]==="invariance"||c[0]==="stability" ? c[1]==="stable" : c[1]===c[0].replace("prediction ",""));
        return "<tr><td>"+esc(c[0])+"</td><td>"+esc(String(c[1]))+"</td><td class='"+(okmark?"match-yes":"match-no")+"'>"+(okmark?"✓ match":"✗")+"</td></tr>"; }).join("");
    el("derivedBox").innerHTML='<div class="label">DERIVED: '+esc(dv.label)+"</div><table class=\"qtable\" style=\"font-size:13px;margin-top:8px\"><tr><th>check</th><th>value</th><th></th></tr>"+chk+"</table><div style='font-size:13px;margin-top:6px'>"+esc(dv.detail)+"</div>";

    el("integrityChecks").innerHTML=(INTEGRITY[q.id]||INTEGRITY.default_).map(function(c){return "<label><input type='checkbox' class='intchk'/> "+esc(c)+"</label>";}).join("");
    el("riskFlags").innerHTML=RISKS.map(function(c){return "<label><input type='checkbox' class='riskchk'/> "+esc(c)+"</label>";}).join("");

    renderDecisionForm(row, dv);
  }

  function renderDecisionForm(row, dv){
    var q=state.queue, saved=decisionsFor(q.id)[row.id]||{}, form=el("decisionForm");
    form.innerHTML="";
    var qid=q.id;
    function radio(name,opts,sel){ return opts.map(function(o){ var id="r_"+name+"_"+o;
        return '<label class="opt"><input type="radio" name="'+name+'" value="'+esc(o)+'" id="'+id+'"'+(sel===o?" checked":"")+"/> "+esc(o)+"</label>"; }).join(""); }
    function sel(name,opts,selv,id){ return '<select id="'+(id||("s_"+name))+'">'+opts.map(function(o){ return '<option value="'+esc(o)+'"'+(selv===o?" selected":"")+">"+(o===""?"— choose —":esc(o))+"</option>"; }).join("")+"</select>"; }
    function reasonBox(){ return '<div class="field" style="margin-top:8px"><label class="muted" style="font-size:12px">Reviewer rationale (required)</label><textarea id="f_manual_reason">'+esc(saved["manual_reason"]||"")+"</textarea></div>"; }

    if(qid==="gold_primary"){
      form.innerHTML =
        '<label class="opt"><input type="radio" name="dec" value="confirm"'+(saved.manual_final_decision==="confirm"?" checked":"")+"/> <b>ACCEPT DERIVED LABEL</b> — evidence re-derives it</label>"+
        '<label class="opt"><input type="radio" name="dec" value="relabel"'+(saved.manual_final_decision==="relabel"?" checked":"")+"/> <b>RELABEL</b> → "+sel("corrected_mechanism_if_change",["","chromatin_gating","tf_kinetics","inconclusive"],saved.corrected_mechanism_if_change||"")+"</label>"+
        '<label class="opt"><input type="radio" name="dec" value="inconclusive"'+(saved.manual_final_decision==="inconclusive"?" checked":"")+"/> <b>INCONCLUSIVE</b> — evidence does not force</label>"+
        '<label class="opt"><input type="radio" name="dec" value="remove"'+(saved.manual_final_decision==="remove"?" checked":"")+"/> <b>REJECT / EXCLUDE</b></label>"+
        '<input id="f_follow_up_needed" type="hidden" value="no"/>'+reasonBox();
      return;
    }
    if(qid==="layer2_g4"||qid==="layer3_nkx21"){
      var opts = qid==="layer2_g4"?["eligible","inconclusive","reject"]:["eligible","inconclusive","reject"];
      var lab  = qid==="layer2_g4"?"Layer-2 decision":"Layer-3 decision";
      form.innerHTML='<label class="muted" style="font-size:12px">'+lab+"</label>"+radio("dec",opts,saved.manual_final_decision||saved[Object.keys(saved).filter(function(k){return /decision$/.test(k)&&k!=="__";})[0]]||"")+
        (qid==="layer2_g4" ? '<div class="field"><label class="muted" style="font-size:12px">Forced-Q label</label>'+sel("manual_forced_q_label",["","DOWN","NO_CHANGE","UP"],row.evidence["Forced Q direction"]||saved.manual_forced_q_label||"","f_manual_forced_q_label")+"</div>"
                           : '<div class="field"><label class="muted" style="font-size:12px">Stability label</label>'+sel("manual_context_stability_label",["","stable","switch","inconclusive"],(row.evidence["H1975 mechanism"]===row.evidence["PC9 mechanism"]?"stable":"switch"),"f_manual_context_stability_label")+"</div>")
        +reasonBox();
      return;
    }
    if(qid==="coactivator_dependent"||qid==="coactivator_independent"){
      form.innerHTML='<label class="muted" style="font-size:12px">Dependence call</label>'+radio("dep",["dependent","independent","inconclusive"],saved.human_dependence_call||"")+
        '<label class="muted" style="font-size:12px;margin-top:8px;display:block">Decision</label>'+radio("hd",["accept_candidate","needs_data","reject"],saved.human_decision||"")+reasonBox();
      return;
    }
    if(qid==="foxo1_axisa"){
      form.innerHTML='<label class="opt"><input type="radio" name="dec" value="confirm_candidate"'+(saved.manual_mechanism_decision==="confirm_candidate"?" checked":"")+"/> <b>CONFIRM CANDIDATE</b>(binding audit 仍待)</label>"+
        '<label class="opt"><input type="radio" name="dec" value="relabel"'+(saved.manual_mechanism_decision==="relabel"?" checked":"")+"/> RELABEL → "+sel("corrected_mechanism_if_change",["","chromatin_gating","tf_kinetics","inconclusive"],"")+"</label>"+
        '<label class="opt"><input type="radio" name="dec" value="needs_binding_data"'+(saved.manual_mechanism_decision==="needs_binding_data"?" checked":"")+"/> NEEDS BINDING DATA</label>"+
        '<label class="opt"><input type="radio" name="dec" value="reject"'+(saved.manual_mechanism_decision==="reject"?" checked":"")+"/> REJECT</label>"+reasonBox();
      return;
    }
    if(qid==="foxo1_layer3"){
      form.innerHTML='<label class="muted" style="font-size:12px">Pair decision</label>'+radio("dec",["confirm_pair","inconclusive","needs_third_context","reject"],saved.manual_pair_decision||"")+
        '<div class="field"><label class="muted" style="font-size:12px">Stability</label>'+sel("manual_context_stability",["","stable","context_discordant","inconclusive"],(row.evidence["Mechanism 1"]===row.evidence["Mechanism 2"]?"stable":"context_discordant"),"f_manual_context_stability")+"</div>"+reasonBox();
      return;
    }
    if(qid==="smarca5_pregate"){
      form.innerHTML='<div class="gatebanner"><b>⚠ GATE NOT PASSED</b> — required: spacing/architecture evidence; current: response + cross-clone binding. Reviewer may annotate evidence but cannot promote this queue to a scored class.</div>'+
        '<label class="muted" style="font-size:12px">Pre-gate evidence call</label>'+radio("dec",["confirm_pregate_evidence","inconclusive","reject"],saved.human_pregate_evidence_call||"")+
        '<div class="field"><label class="muted" style="font-size:12px">Missing Axis-D gate</label>'+sel("human_missing_axis_d_gate",["needs_both","needs_spacing_check","needs_clone_audit","not_applicable_reject"],saved.human_missing_axis_d_gate||"needs_both","f_human_missing_axis_d_gate")+"</div>"+reasonBox();
      return;
    }
    // launch_critical & fallback: render schema selects directly
    form.innerHTML=q.decisions.map(function(dd){
      if(dd.type==="select") return '<div class="field"><label class="muted" style="font-size:12px">'+esc(dd.label)+"</label>"+sel(dd.name,dd.options,saved[dd.name]||"","f_"+dd.name)+"</div>";
      return '<div class="field"><label class="muted" style="font-size:12px">'+esc(dd.label)+'</label><input id="f_'+dd.name+'" type="text" value="'+esc(saved[dd.name]||"")+'" /></div>';
    }).join("");
  }

  function collectDecision(){
    var q=state.queue, out={};
    if(q.id==="gold_primary"){
      var r=(document.querySelector('input[name="dec"]:checked')||{}).value||"";
      out.manual_final_decision=r;
      var cs=document.getElementById("s_corrected_mechanism_if_change"); out.corrected_mechanism_if_change=cs?cs.value:"";
      out.follow_up_needed = (r==="confirm")?"no":"yes";
    } else if(q.id==="layer2_g4"){
      out.manual_layer2_decision=(document.querySelector('input[name="dec"]:checked')||{}).value||"";
      out.manual_forced_q_label=(document.getElementById("f_manual_forced_q_label")||{}).value||"";
    } else if(q.id==="layer3_nkx21"){
      out.manual_layer3_decision=(document.querySelector('input[name="dec"]:checked')||{}).value||"";
      out.manual_context_stability_label=(document.getElementById("f_manual_context_stability_label")||{}).value||"";
    } else if(q.id==="coactivator_dependent"||q.id==="coactivator_independent"){
      out.human_dependence_call=(document.querySelector('input[name="dep"]:checked')||{}).value||"";
      out.human_decision=(document.querySelector('input[name="hd"]:checked')||{}).value||"";
    } else if(q.id==="foxo1_axisa"){
      out.manual_mechanism_decision=(document.querySelector('input[name="dec"]:checked')||{}).value||"";
      var cs2=document.getElementById("s_corrected_mechanism_if_change"); out.corrected_mechanism_if_change=cs2?cs2.value:"";
    } else if(q.id==="foxo1_layer3"){
      out.manual_pair_decision=(document.querySelector('input[name="dec"]:checked')||{}).value||"";
      out.manual_context_stability=(document.getElementById("f_manual_context_stability")||{}).value||"";
    } else if(q.id==="smarca5_pregate"){
      out.human_pregate_evidence_call=(document.querySelector('input[name="dec"]:checked')||{}).value||"";
      out.human_missing_axis_d_gate=(document.getElementById("f_human_missing_axis_d_gate")||{}).value||"";
    } else {
      q.decisions.forEach(function(d){ var e=document.getElementById("f_"+d.name); out[d.name]=e?e.value:""; });
    }
    // risks + integrity → appended into reason (validator-safe)
    var reason=(document.getElementById("f_manual_reason")||{}).value||"";
    var risks=[].map.call(document.querySelectorAll(".riskchk:checked"),function(x){return x.parentNode.textContent.trim();});
    var integ=[].map.call(document.querySelectorAll(".intchk:checked"),function(x){return x.parentNode.textContent.trim();});
    if(risks.length) reason+=" [risks: "+risks.join("; ")+"]";
    if(integ.length){ var miss=[].map.call(document.querySelectorAll(".intchk:not(:checked)"),function(x){return x.parentNode.textContent.trim();});
      if(miss.length) reason+=" [integrity-unchecked: "+miss.join("; ")+"]"; }
    out.manual_reason=reason.trim();
    return out;
  }

  function decisionComplete(q,dec){
    var missing=[];
    var mainFields={gold_primary:["manual_final_decision"],layer2_g4:["manual_layer2_decision","manual_forced_q_label"],layer3_nkx21:["manual_layer3_decision","manual_context_stability_label"],coactivator_dependent:["human_dependence_call","human_decision"],coactivator_independent:["human_dependence_call","human_decision"],foxo1_axisa:["manual_mechanism_decision"],foxo1_layer3:["manual_pair_decision","manual_context_stability"],smarca5_pregate:["human_pregate_evidence_call","human_missing_axis_d_gate"],launch_critical:q.decisions.map(function(d){return d.name;})}[q.id]||[];
    mainFields.forEach(function(f){ if(!(dec[f]||"").trim()) missing.push(f); });
    if(!(dec.manual_reason||"").trim()) missing.push("manual_reason");
    if(missing.length){ alert("Please complete before marking reviewed:\n- "+missing.join("\n- ")); return false; }
    return true;
  }

  function saveCurrent(markDone){
    var q=state.queue,row=q.rows[state.idx];
    if(!reviewerId()){ alert("Enter your Reviewer ID (Dashboard or top bar) first."); return false; }
    var dec=collectDecision();
    if(markDone && !decisionComplete(q,dec)) return false;
    dec.__reviewer=reviewerId(); dec.__date=new Date().toISOString().slice(0,10); dec.__done=!!markDone;
    var s=store(); s[q.id]=s[q.id]||{}; s[q.id][row.id]=dec; saveStore(s);
    return true;
  }

  function go(delta){ var next=state.idx+delta;
    if(state.onlyUndone&&delta>0){ var rows=state.queue.rows; for(var i=state.idx+1;i<rows.length;i++){ if(!unitDone(state.queue.id,rows[i].id)){next=i;break;} } }
    state.idx=Math.max(0,Math.min(state.queue.rows.length-1,next)); renderCard(); }

  function rowSearchText(row){ var p=[row.id||""]; Object.keys(row.evidence||{}).forEach(function(k){p.push(k,row.evidence[k]);}); return p.join(" ").toLowerCase(); }
  function findNextMatch(){ var n=(el("findText").value||"").trim().toLowerCase(); if(!n){alert("Enter a unit ID, target, or batch.");return;}
    var rows=state.queue.rows; for(var o=1;o<=rows.length;o++){ var i=(state.idx+o)%rows.length; if(rowSearchText(rows[i]).indexOf(n)!==-1){state.idx=i;renderCard();return;} } alert("No match: "+n); }

  // ---------- export with summary ----------
  function exportCsv(){
    var q=state.queue,dstore=decisionsFor(q.id);
    var cols=["unit_id"].concat(q.decisions.map(function(d){return d.name;})).concat(["reviewer_id","review_date"]);
    var lines=[cols.join(",")]; var counts={};
    q.rows.forEach(function(row){ var d=dstore[row.id]; if(!d)return;
      var rec=[row.id]; q.decisions.forEach(function(dd){rec.push(d[dd.name]||"");}); rec.push(d.__reviewer||"",d.__date||"");
      lines.push(rec.map(csvCell).join(","));
      var k=d[q.decisions[0].name]||"(blank)"; counts[k]=(counts[k]||0)+1; });
    if(lines.length===1){alert("No decisions recorded in this queue yet.");return;}
    var summ="Export summary\n\nReviewer: "+(reviewerId()||"anon")+"\nQueue: "+meta(q.id).title+"\nReviewed: "+(lines.length-1)+" / "+q.n+"\n\n"+
      Object.keys(counts).map(function(k){return k+": "+counts[k];}).join("\n")+"\n\nExport contains reviewer decisions only.\nIt does not modify the benchmark release.";
    if(confirm(summ+"\n\nDownload CSV?")){
      downloadFile(q.id+"_decisions_"+(reviewerId()||"anon")+".csv",lines.join("\n"),"text/csv");
    }
  }
  function csvCell(v){ v=String(v==null?"":v); return /[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v; }
  function downloadFile(name,text,mime){ var b=new Blob([text],{type:mime}); var a=document.createElement("a"); a.href=URL.createObjectURL(b); a.download=name; document.body.appendChild(a); a.click(); a.remove(); }

  // ---------- wiring ----------
  function openQueue(qid){ state.queue=BUNDLE.queues.filter(function(q){return q.id===qid;})[0]; state.idx=firstIndex();
    el("setup").classList.add("hidden"); el("review").classList.remove("hidden"); renderCard(); }
  function back(){ el("review").classList.add("hidden"); el("setup").classList.remove("hidden");
    if(location.hash) history.replaceState(null,"",location.pathname+location.search); renderDashboard(); }
  function firstIndex(){ if(!state.onlyUndone) return 0; var rows=state.queue.rows; for(var i=0;i<rows.length;i++) if(!unitDone(state.queue.id,rows[i].id)) return i; return 0; }

  el("backBtn").onclick=back; el("exportBtn").onclick=exportCsv;
  el("prevBtn").onclick=function(){go(-1);}; el("skipBtn").onclick=function(){go(1);};
  el("saveNextBtn").onclick=function(){ if(saveCurrent(true)) go(1); };
  el("jumpTo").onchange=function(e){ var n=parseInt(e.target.value,10); if(n>=1&&n<=state.queue.rows.length){state.idx=n-1;renderCard();} };
  el("findBtn").onclick=findNextMatch;
  el("findText").onkeydown=function(e){ if(e.key==="Enter"){e.preventDefault();findNextMatch();} };
  el("onlyUndone").onchange=function(e){ state.onlyUndone=e.target.checked; state.idx=firstIndex(); renderCard(); };
  var savedName=localStorage.getItem(LSKEY+"_who"); if(savedName) el("reviewerId").value=savedName;
  el("reviewerId").oninput=function(e){ localStorage.setItem(LSKEY+"_who",e.target.value.trim()); };

  // known-issues panel (fetch markdown, render as text)
  fetch("REVIEW_ISSUES.md").then(function(r){return r.text();}).then(function(t){ el("issuesBox").innerHTML="<pre style='white-space:pre-wrap;font-size:12.5px'>"+esc(t)+"</pre>"; }).catch(function(){ el("issuesBox").textContent="(REVIEW_ISSUES.md not found)"; });

  if(!BUNDLE.queues.length){ el("queueList").innerHTML='<p class="muted">queues.js not loaded.</p>'; }
  else { renderDashboard();
    function routeFromHash(){ var h=(location.hash||"").replace(/^#/,""); if(h&&BUNDLE.queues.some(function(q){return q.id===h;})) openQueue(h); }
    routeFromHash(); window.addEventListener("hashchange",routeFromHash); }
})();
