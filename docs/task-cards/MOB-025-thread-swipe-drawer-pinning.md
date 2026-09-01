# MOB-025：线程右滑操作与 Drawer 置顶分组修复

状态：**重新打开 / DOING**（`1035da3` 已入 `dev`，但 Android 真机连续复现右滑不可用；既有实现不得视为已修复）

负责人：`mob_025_thread_swipe_drawer_pinning`

执行仓库：`dangjingtao/uichat-mira-mobile`

首次派卡基线：`dev @ a90dfb6c2d80079fd85084fff0214968e137e653`

## 2026-09-01 Reopen Evidence

产品负责人确认：MOB-025 的右滑问题已经至少三次宣称修复但真机仍失败。当前 `dev` 的 `SessionListScreen` 仍使用自定义 `PanResponder` 与行内 `Pressable` / `FlatList` 做 responder 竞争；此前 MOB-011 与 MOB-025 的修改均继续沿用同一路线，只调整 capture、阈值、速度与 settle 行为。

因此本卡重新打开，后续施工必须遵守：

- 不再把调整 `dx`、`vx`、capture 阈值或 spring 参数作为主修复方案；
- 优先替换脆弱的自定义 responder 手势层，采用经过 React Native 移动端验证的 swipe/gesture 方案；
- 若需要新增原生手势依赖，必须按 `AGENTS.md` 明确记录依赖理由、双平台影响与构建验证；
- **没有 Android 真机证据不得回到 REVIEW/PASS，也不得再写“有条件完成”来代替真实交互验收。**

## 背景

MOB-007 已完成设备本地线程置顶，现有合同继续有效：置顶状态只保存在当前设备，不同步为 Host / Desktop 的账户级事实。

当前 `SessionListScreen` 已存在自定义 `PanResponder` 右滑实现，也已经渲染「置顶 / 删除」操作层；但 Android 真机 dogfood 复现为：线程列表右滑无法稳定呼出操作。与此同时，`CustomDrawer` 仍把线程放在一个「最近」分组里，只在行尾显示图钉，没有把置顶线程独立成组。

这是一张 MOB-007 之后的交互回归 / 展示收口卡，不重开 MOB-007，也不改变其本地状态合同。

## 目标

1. 修复主线程列表右滑无法稳定呼出操作的问题。
2. 保留「置顶 / 取消置顶」「删除」能力，并把滑出操作区做成完整、精致的移动端交互，而不是两个生硬按钮。
3. Drawer 中把置顶线程独立为「置顶」分组，排在「最近」之前。
4. 取消置顶后线程回到普通最近列表；重启 App 后置顶状态仍按既有本地 store 恢复。

## Scope

### 主线程列表右滑

- 继续采用**向右滑动呼出左侧操作区**的产品方向。
- 修复手势竞争 / 命中 / 阈值 / 回弹问题，使 Android 真机上可以可靠打开和关闭操作区。
- 操作区包含：
  - 置顶线程：`取消置顶`；
  - 未置顶线程：`置顶`；
  - `删除`。
- 视觉使用现有 theme token / Lucide 体系，处理好：
  - 图标与文字层级；
  - 操作块宽度与间距；
  - 危险操作与普通操作的区分；
  - 滑动跟手、打开、回弹 / 收起动画。
- 不允许为了“能滑”破坏列表纵向滚动、点击进入会话或无障碍点击目标。

### 删除语义

- 删除仍调用现有 authoritative Host 删除能力，不创建本地假删除。
- 保留删除确认。
- 删除成功后继续清理对应本地 pin / read state。
- 失败时必须保持真实会话可见，并给出真实错误；不得仅从 UI 消失。

### Drawer 置顶分组

- `CustomDrawer` 的 Thread 区域改为：

```text
置顶
  pinned thread ...

最近
  normal thread ...
```

- `置顶` 只在存在置顶项时出现。
- 组内排序沿用 MOB-007 既有规则：同组按 Host `updatedAt` 稳定排序。
- **不得先 `slice(0, N)` 再找置顶**，否则较旧但仍被置顶的线程会从 Drawer 消失。先按 pin state 分组，再对普通 Recent 做展示上限；如需对 pinned 本身设上限，必须显式说明而不能由 Recent cap 隐式裁掉。
- 取消置顶后立即从置顶组移回 Recent。

## Hard Constraints

- 不改变 `threadId -> pinnedAt` 的设备本地语义。
- 不新增 Host / Remote API，不把 pin 同步到 Desktop。
- 不重新设计 Thread / Workspace 关系。
- 不顺手重构整个 Session list / Drawer。
- 删除仍是 Host authoritative side effect；不得用本地 state 假装成功。

## Must Read

- `AGENTS.md`
- `docs/work-ledger.md`
- `docs/task-cards/MOB-007-local-thread-pinning.md`
- `src/screens/SessionListScreen.tsx`
- `src/components/CustomDrawer.tsx`
- `src/store/threadPinStore.ts`
- `src/store/threadPinning.ts`
- `src/store/threadPinning.test.ts`

## Execution Entry Points

- `src/screens/SessionListScreen.tsx`
- `src/components/CustomDrawer.tsx`
- `src/store/threadPinStore.ts`（仅在确有必要时）
- `src/store/threadPinning.ts` / tests（如排序行为需要补回归）

## Validation

自动化至少执行：

```text
npm run typecheck
npm run lint
npm test -- --runInBand
```

并补足与本卡直接相关的行为测试。真机 / 模拟器 smoke 至少覆盖：

1. 未置顶线程右滑 -> 显示「置顶 / 删除」；
2. 置顶线程右滑 -> 显示「取消置顶 / 删除」；
3. 右滑打开后可收起，不阻塞纵向滚动和点击进入；
4. 删除确认 / 取消 / 成功 / 失败状态正确；
5. Drawer 中 pinned 独立成组并位于 Recent 上方；
6. 较旧 pinned thread 不因 Recent 展示上限消失；
7. 取消置顶后回到 Recent；
8. App 重启后 pin 状态仍正确。

若无法取得真机证据，必须明确写成 validation gap，不得伪造。

## Parallel / Integration

可与 MOB-026、MOB-027、MOB-028、MOB-029 从同一 `dev` base 并行开独立分支。若施工中需要修改共享导航、全局 store 结构或 native config，先报告并重新评估并行关系。

## Open / Unknown

当前唯一需要重新验证的核心未知项是：Android 真机上应采用哪种手势实现才能稳定与 `FlatList` 纵向滚动、行点击共存。不得继续以未经真机验证的 `PanResponder` 参数调优作为答案。

## Handoff

施工前先核对上述文件与当前代码。若当前 HEAD 已改变手势实现或 pin 语义，与本卡描述冲突时，以当前仓库事实为准并先报告冲突，不得直接按旧基线覆盖。