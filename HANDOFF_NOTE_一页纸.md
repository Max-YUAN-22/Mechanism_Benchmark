# MechanismBench v0.2 · 给师兄的一页交接说明

**链接:** 总览 overview.html · 单元演示 unit.html · 审查台 index.html · 总表 MechanismBench_v0.2_handoff.xlsx

## 已完成
- **v0.2 冻结核心**:640 GOLD 审计池 → 587 official 打分单元(冻结 folds、确定性 scorer、25 baselines、最佳 RF macro-F1 0.759;majority 0.403)。
- **四类机制框架**(M1 direct / M2 chromatin / M3 combinatorial / M4 ncRNA)+ 预注册方向性规则;unit = (TF, target, mechanism, context, perturbation, response) + provenance。
- **审查台**:9 队列 / 2,774 行,首审底稿已内置(triage 绿/黄/红);6 条 pilot 级 ROP 已写。
- **标签可靠性**:机审压力测试 + 修复(ZNF143 交叉列 bug 回填 184/184);TRPS1 53 已隔离出打分集。
- **文献基建**:41 源清单(accession 实测)+ 15 篇全文 + Seed→Expand→Screen→Adjudicate 管线。

## 需要师兄确认/认领
1. **第二评审签字**:按 ROP 抽检复核(建议从 16-unit pilot 开始;Excel 里 triage 黄/红的行优先)→ 签字后 candidate 才能升 eligible。
2. **v0.3 采纳**:ZNF143 证据修正(184 行)+ TRPS1 quarantine 两项治理签字。
3. **方向认领**:M3 扩组 / M4 单元化 / FM baseline(总览第 0 节"可认领方向")。

## Known limitations(主动声明)
- 官方打分集目前只覆盖 **M1/M2 诊断轴**(M3/M4 单元构建中,不宣称完整四分类)。
- 扩张轴为 6h 急性窗、单细胞系(HCT116),预备级。
- 跨因子迁移 median AUROC 0.476 —— 有意的负结果:机制不能被基线特征平凡读出。
- 所有标签是"预注册规则下被证据支持的机制类别",不宣称唯一因果解释。

## 数字关系
640(GOLD 审计池)· 587(official 打分集)· 2,774(9 队列评审总行数)—— 口径不同,详见总览"数字关系"框。
