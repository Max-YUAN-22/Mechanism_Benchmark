# Known issues from AI first-pass review(机审问题标注 · 2026-09-22)

本文件标注全量机审(9 队列 / 2,774 行)中发现的全部问题。人审时请**优先核对这些行**。

## GOLD primary(640)
- **237 行无法从发布证据重推**:ZNF143 184(v0.2 转录列被错填为 ATAC 值;v0.3 修正表已生成、待采纳)+ TRPS1 53(内部矛盾:转录 NO_CHANGE 却标 tf_kinetics;建议 quarantine)。
- 403 行两轴边界余量 0.337,数值扰动下不翻转——审查时可快速通过。

## Layer 2 · G4(22)
- 路线级:6/8 核心行用 rev 链(全局校准,需接受约定);**Q=1h vs 主扰动=30min 窗口不匹配(已强制披露)**;KAS/qPRO 仅旁证、不进答案键。
- 行级:ACTR1A(+0.052)与 CC2D2B(−0.110)的 forced-Q **未确认** gating 预测——如实不入选;全队 12 eligible / 10 inconclusive。

## Layer 3 · NKX2-1(28)
- **ENTPD3 为干净的真切换候选**(H1975:ATAC −0.71 CHANGE_DOWN;PC9:转录 +1.156 UP)——需启动子 binding + 资深二审。
- 27 eligible 全部为 tf_kinetics,**无 gating 代表**——本组只覆盖直接机制的跨系不变性。
- 计数口径:候选 JSON 31 行 vs 站点队列 28 行,差 3 行需对齐。

## BRD4 dependent(51)
- **3/3 IDR 严格敏感性下 dependent 由 51 降至 29**;本队列按预注册要求**两名独立评审**,当前仅一份采纳记录。

## BRD4 independent(1071)
- **386 行被判 needs-data**(|lfc|≥0.5 出现在 no-change 侧,或统计字段缺失)——升格前必须先行核对。

## FOXO1 Axis-A(729)
- 全部行 Directness = PENDING_FOXO1_BINDING_AUDIT(exact-context binding 缺)。
- **66 行 PRO=UP** 在激活子规则下不可强行判定 → needs_binding_data。
- 上下文严重不均衡(377/26/326),76 pair-units ≠ 68 独立 target。

## SMARCA5 pre-gate(107)
- **spacing/architecture 诊断与 exact clone audit 双缺 → 不能升 scored class**;人审只能标注证据质量。
- 附加:HCT116-6h vs Kasumi1-2h 的跨研究 Layer-3 尝试 stable 率仅 52.6%(噪声),已隔离不计。

## 跨队列共性问题
- ENCODE 新轴统一为 **6h 急性窗(间接效应风险)**、单细胞系(HCT116)——Layer 3 不能由该体系单独产生。
- 平台/时间点跨因子异质:这正是迁移 AUROC 0.476 的部分来源,论文需如实披露。
- 反锚定:AI 判读记录(review_sessions/)默认折叠,人审界面不显示其结论。
