# Reviewer Operating Procedure (ROP) · v1.0
# MechanismBench 评审操作规程 —— 审"证据链",不审"我觉得像什么"

**核心定位:** Reviewer 不负责重新发现机制。Reviewer 只验证一件事:
**这条 unit 是否满足预定义的证据规则,machine-derived label 能否由证据重建。**

---

## 1. 每个 unit 的固定审查顺序(六步,按序,不跳步)

```
① Edge 对不对        regulator / target / context 与标签一致?
② Perturbation 对不对 真的是该因子的 acute degradation?时间点符合协议?
③ H1/H2 定义与预测    两个假设的方向预测是否真的相反(可判别)?
④ Observed response   deposited 数据里靶基因实际方向是什么?
⑤ 能否区分            观测方向是否只支持其中一个假设?
⑥ Derived label       机推标签是否严格符合 decision rule?
```

六步全过 → **ACCEPT DERIVED LABEL**。
任何一步失败 → 按第 4 节按钮处置,**绝不凭生物学直觉改判**。

---

## 2. 四道 Gate(什么算合格,写死)

**Gate A · Identity:** regulator/target/context 逐字核对(ChIP binding 来源可与响应数据不同,但须同生物学背景并在 tier 中注明)。

**Gate B · Perturbation:** 扰动方式、时间窗与该 factor 协议一致。急性窗=30 min–6 h;超出(如 24 h)须带 disclosed-timepoint 旗标。

**Gate C · Response(方向判定,含 NO_CHANGE 等价准则):**
- DOWN/UP:padj < 0.05 且方向一致;
- **NO_CHANGE 仅当 padj ≥ 0.5**(预注册等价阈值——"明确不显著");
- **0.05 ≤ padj < 0.5 → UNRESOLVED → unit 判 INCONCLUSIVE**(not significant ≠ evidence of no effect);
- 方向反转(如激活子的靶 UP)→ 两个假设都不符 → INCONCLUSIVE,不得强归。

**Gate D · Discrimination:** H1/H2 预测必须方向不同。若两假设预测相同或观测同时满足两者 → INCONCLUSIVE。数据再"好看"也不能补这一条。

---

## 3. 四个按钮(只有这四个,不要自由发挥)

| 按钮 | 语义 |
|---|---|
| 🟢 ACCEPT DERIVED LABEL | 证据链完整,机推标签可由证据重建,Gate A–D 全过 |
| 🟡 RELABEL | 证据有效,但机推标签错误(须同时给出 corrected mechanism) |
| 🟠 INCONCLUSIVE | 证据有效但不判别(Gate D/C-fail、UNRESOLVED、方向矛盾) |
| 🔴 EXCLUDE | 触发预定义排除项:identity 错、证据缺失、quarantine 集、窗口不符 |

Reviewer **不直接写"机制是什么"**——那会把科学裁决退化回主观标注。

---

## 4. Pilot 审查批次(16 条,故意覆盖四种难度)

在审查站用 **Find(按 target 名)** 定位,逐条按 ROP 审:

**A. Clean ×4(预计 ACCEPT,练手感)**
| target | 证据特点 |
|---|---|
| HOXD11(BCL11A) | ATAC FLAT + nascent **−11.6**,方向无可争辩 |
| TNF(BCL11A) | −5.0,同上 |
| TMEM71(BCL11A) | −3.2 |
| ARHGEF19(BCL11A) | **+4.6 UP**:repressor 符号场景——注意判 INCONCLUSIVE 还是接受符号感知规则,这是本条的学习点 |

**B. Borderline ×4(p 驱动的极小效应量,练 Gate C)**
| target | 陷阱 |
|---|---|
| JUND(ZNF143) | padj 极小但 \|lfc\|=0.017——按 Gate C,方向 call 依预注册规则;审你是否接受"显著但微小"|
| KPNA5(ZNF143) | \|lfc\|=0.07 |
| PLAGL2(ZNF143) | **+0.10(UP 向)**——激活子出现 UP,考 Gate C 反转条款 |
| ZBTB10(ZNF143) | v0.3 修正后的示范行(转录 −0.402,原发布值曾错填)|

**C. Problem ×5(已知矛盾集 TRPS1,练 EXCLUDE/INCONCLUSIVE)**
MAN1A1 · FAM107B · LURAP1L-AS1 · RNF43 · SC5D
——全部无 binding、两套转录分析互相矛盾;预期多数应 INCONCLUSIVE 或 EXCLUDE。

**D. Cross-layer ×3(练不同层的 checklist)**
- **ENTPD3**(Layer 3):真切换候选——判"stable/switch"与是否 needs binding;
- **CHCHD3**(Layer 2):G4 强确认(TT −1.45)——练反事实 checklist;
- **ADI1**(BRD4 dependent):练 dependence call。

**Pilot 完成标准:** 16 条全录(决定+rationale);记录你卡住的地方——那正是 ROP 需要修订的地方。

---

## 5. Pilot 之后:盲审第二评审 + 一致性

1. 另找一人(师兄/师姐),**不展示机推标签与你的决定**,仅按本 ROP 独立审同一批;
2. 对比两位 reviewer:raw agreement + Cohen's κ + 分歧类别;
3. 分歧行进入 adjudication queue(第三人或规则修订后重审);
4. 报告格式:"We evaluated annotation reproducibility under an explicit adjudication protocol (κ = …)"——这就是 NeurIPS 级别的 human-review 叙述。

---

## 6. 界面操作对照(审查站)

| ROP 步骤 | 界面位置 |
|---|---|
| ① Edge | ② Regulatory edge 表 + Data/Paper 链接 |
| ② Perturbation | ② 表内 Perturbation/Time 行 |
| ③ H1/H2 | ③ Competing mechanistic hypotheses 卡 |
| ④ Observed | ④ Observed evidence 表 |
| ⑤/⑥ Derived | ⑤ Derived decision(✓/✗ 自动核对) |
| 按钮 | ⑧ Human review decision 四选一 |
| Gate C/风险 | ⑦ Risk flags 勾选(自动写入 reason) |

*Rationale 必填:一句话写"哪条 Gate 过/没过",不要写生物学感想。*
