# Refactor: installer.ts 拆分 + 类型同步

## 背景

`global/scripts/installer.ts` 目前约 600 行，职责过于集中。同时 `global/setup/SKILL.md` 中对 installer 数据结构的描述与代码类型定义分离，存在不一致风险。

本次重构将两个问题一并解决：拆分 installer、建立类型到 SKILL.md 的自动同步。

---

## 目标

- `global/scripts/` 中每个文件不超过 250 行
- 类型定义单一来源（`installer-types.ts`）
- `pnpm build` 后 SKILL.md 中的类型描述始终与代码一致

---

## 新增文件

### `global/scripts/installer-types.ts`（~80 行）

所有共享类型，带 JSDoc 注释：

```typescript
/** ~/.aisf/units/{unit}/unit.json 的结构 */
export interface UnitJson {
  name: string;
  description?: string;
  dependencies: string[];
  components: {
    // TODO: 这里为什么不对skill/rules/scripts/resources分别定义类型？
    skills?: Array<{ name: string; file: string; hasCustom?: boolean; condition?: string }>;
    rules?: Array<{ name: string; file: string; condition?: string; hasCustom?: boolean }>;
    scripts?: Array<{ name: string; file: string; hook: string; params?: string[] }>;
    resources?: Array<{ name: string; file: string; hasCustom?: boolean; condition?: string }>;
  };
}

/** installed.json 中每个 unit 的条目 */
export interface InstalledEntry {
  // TODO: 需要补充文件名称，因为新老版本可能不一致，删除/更新的时候需要知道旧版本的文件是什么
  installedAt: string;
  components: { skills: string[]; rules: string[]; scripts: string[]; resources: string[] };
  /** 本次安装时选中的可选组件，格式 ["rule:poc-rule", "resource:config"] */
  optionalComponents: string[]; // TODO: 这里的信息是不是和上面的重复了
}

export interface InstalledJson {
  units: Record<string, InstalledEntry>;
}

/** prepare 命令的输出项，每个 hasCustom 组件对应一项 */
export interface PrepareItem {
  componentType: "skill" | "rule" | "resource";
  templatePath: string;
  targetPath: string; // TODO: 需要是老版本的文件名称
  /** 命名约定：.aisf-tmp-{unit}-{comp}，与 targetPath 同目录 (TODO: 不一定，考虑新老版本的问题） */
  tempPath: string;
  exists: boolean; // TODO: 这个字段的语义需要明确，是指目标文件是否存在（即是否更新）还是指临时文件是否存在（即是否已生成定制内容）
}

// 内部 ComponentSpec 族（installer 从 unit.json 派生，调用方不传）
export interface SkillSpec {
  type: "skill";
  name: string;
  file: string;
  hasCustom?: boolean; // TODO: 干什么用的？是不是直接在unit.json中增加一个冗余字段就好了？
}
export interface RuleSpec {
  type: "rule";
  name: string;
  file: string;
  hasCustom?: boolean;
}
export interface ScriptSpec {
  type: "script";
  name: string;
  file: string;
  hook: string;
  params?: string[];
}
export interface ResourceSpec {
  type: "resource";
  name: string;
  file: string;
  hasCustom?: boolean;
}
export type ComponentSpec = SkillSpec | RuleSpec | ScriptSpec | ResourceSpec;
```

---

### `global/scripts/dep-resolver.ts`（~100 行）

从 `installer.ts` 提取，改为独立函数，显式接受 `aisfHome`、`cwd`、`installedJson` 参数：

```
checkDeps(aisfHome, cwd, unitNames)  → { order, auto }
topoSort(aisfHome, unitNames)        → string[]
resolveComponents(unitJson, optionalNames) → ComponentSpec[]
removeOrphans(cwd, unitName, unitJson, optionalNames, entry) → void
```

`resolveComponents` 和 `removeOrphans` 从 `install()` 中提取，与依赖解析逻辑内聚（都是"决定装什么/删什么"）。

---

### `global/scripts/component-writer.ts`（~200 行）

从 `installer.ts` 提取，改为独立函数，显式接受 `cwd`、`aisfHome`、`unitName` 参数：

```
installSkill(cwd, aisfHome, unitName, spec)    → string
installRule(cwd, aisfHome, unitName, spec)     → string
installScript(cwd, aisfHome, unitName, spec)   → string
installResource(cwd, aisfHome, unitName, spec) → string
ensureGitignores(cwd)                          → void
tryRemoveEmptyDir(fullPath)                    → void
makeTempPath(targetPath, unitName, compName)   → string
```

---

## 修改文件

### `global/scripts/installer.ts`（~200 行）

变为薄编排层：

- 公共方法（`listUnits` / `checkDeps` / `prepare` / `install` / `uninstall`）委托给上面两个模块
- 保留私有状态方法：`readInstalled` / `updateInstalled` / `readUnitJson`
- CLI 入口保留在此文件末尾
- 其他模块使用 `import type` 引入类型，消除运行时依赖

---

### `global/setup/SKILL.md`

在 Step 5（可选组件结构）和 Step 6a（PrepareItem 结构）描述区域加 build 同步 marker：

````markdown
<!-- EXTRACT:installer-types:start -->
<!-- 由 pnpm build 自动生成，勿手动编辑 -->

```typescript
// UnitJson, PrepareItem, optionalComponents 格式...
```
````

<!-- EXTRACT:installer-types:end -->

```

---

### `scripts/build.ts`（新增 ~40 行逻辑）

在现有 skill-format 同步逻辑之后，新增 installer-types 同步：

1. 读取 `global/scripts/installer-types.ts`
2. 提取所有 `export interface` / `export type` 定义（含 JSDoc）
3. 渲染为 markdown 代码块
4. 写入 `global/setup/SKILL.md` 的 `EXTRACT:installer-types` marker 区间

`pnpm verify` 中已有的 `build` 步骤会自动覆盖此逻辑，无需额外命令。

---

## Publish 处理

| 文件 | 编译产物 | 是否需要 publish |
|---|---|---|
| `installer-types.ts` | `installer-types.js`（接口被 TS 擦除，近空文件） | 可跳过；现有脚本扫描 `*.ts` 会自动包含，产物无害 |
| `dep-resolver.ts` | `dep-resolver.js` | 需要 |
| `component-writer.ts` | `component-writer.js` | 需要 |
| `installer.ts` | `installer.js` | 需要（入口不变） |

其他模块对 `installer-types` 使用 `import type`，编译后不产生 `require('./installer-types')`，无运行时依赖。若 publish 脚本需要排除空产物，在扫描时跳过 `installer-types.ts` 即可。

---

## 文件大小预估

| 文件 | 预估行数 |
|---|---|
| `installer-types.ts` | ~80 |
| `dep-resolver.ts` | ~100 |
| `component-writer.ts` | ~200 |
| `installer.ts` | ~200 |
| `build.ts`（新增部分） | +~40 |

---

## 实现顺序

1. 新建 `installer-types.ts`，迁移所有类型
2. 新建 `dep-resolver.ts`，迁移依赖解析 + 组件范围计算
3. 新建 `component-writer.ts`，迁移文件写入函数
4. 精简 `installer.ts`，改为编排层
5. 更新 `build.ts`，添加 installer-types → SKILL.md 同步
6. 更新 `global/setup/SKILL.md`，加 marker，删除手工维护的类型描述
7. 运行 `pnpm verify` 确认全量测试通过
```
