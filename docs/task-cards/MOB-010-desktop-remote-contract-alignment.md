# MOB-010：Desktop Remote 合同接入收口

状态：有条件完成（代码与自动化验收完成；真实 Desktop 配对联调待验收）

负责人：`mob_010_remote_contract_alignment`

工作分支：`dev`

范围：Mira Mobile

## 背景

Mira Desktop / Host 已完成并合入 `dev` 的三项 Mobile Remote 合同：

- Desktop #77：`GET /remote/v1/workspaces`
- Desktop #78：`GET /remote/v1/roles`
- Desktop #80：`GET /remote/v1/workspaces/:workspaceId/threads`

Mobile 现有 MOB-002 / MOB-003 / MOB-005 的产品结构与 UI 方向仍成立，但部分实现建立在 Desktop 合同落地前的临时读取方式上，需要做一次集中适配。

本任务不重开、抹掉或改号 MOB-002 / MOB-003 / MOB-005，而是记录“Desktop 正式合同出现后，对已完成 Mobile 代码做收口适配”的增量工作。

## 目标

让 Mobile 使用 Desktop 已发布的 Mobile-safe Remote 合同完成真实项目、项目线程分页和角色名称链路，并保留既有导航、视觉分类、错误态与 Direct → Relay transport 行为。

## 1. Workspace Remote 合同对齐（关联 MOB-002 / Desktop #77）

正式合同：

```text
GET /remote/v1/workspaces
Authorization: Bearer <device-credential>
```

Mobile-safe Workspace：

```ts
type MobileWorkspace = {
  id: string;
  name: string;
  isDefault: boolean;
  status: 'active' | 'archived';
  createdAt: string;
  updatedAt: string;
};
```

要求：

- 从 Mobile transport/model projection 删除 `rootPath`；
- 不调用原始 `/chat-workspaces`；
- 继续使用现有 Device Credential；
- 继续保留 Direct 网络失败时 Relay fallback；
- 401 / 403 / 404 / 网络错误继续真实上抛，不自动清配对凭证；
- 不新增第二套 Project / Workspace 模型。

## 2. Workspace Thread 权威分页（关联 MOB-003 / Desktop #80）

正式合同：

```text
GET /remote/v1/workspaces/:workspaceId/threads?status=active&limit=50&cursor=<opaque>
Authorization: Bearer <device-credential>
```

Response：

```ts
type WorkspaceThreadPage = {
  items: RemoteThread[];
  total: number;
  nextCursor: string | null;
  limit: number;
};
```

要求：

- WorkspaceDetail 不再依赖全量 `/threads` + 本地 `workspaceId` 过滤作为项目线程真相；
- 首轮默认读取 `status=active`；
- 支持 `nextCursor` 连续加载；cursor 视为不透明字符串，原样 URL encode，不 trim、不解析、不自行构造；
- `total` 是权威总数，不使用 `items.length` 冒充项目总线程数；
- 非当前用户 Workspace 的 404 保持真实错误语义；
- archived Thread 只有明确产品入口需要时再以 `status=archived` 查询，不在本任务擅自新增归档 UI；
- 现有 WorkspaceDetail -> Chat 路由、Session 映射、线程类型图标继续复用。

## 3. Role summary 接入（关联 MOB-001 / MOB-005 / Desktop #78）

正式合同：

```text
GET /remote/v1/roles
Authorization: Bearer <device-credential>
```

严格 projection：

```ts
type MobileRoleSummary = {
  id: string;
  name: string;
};
```

要求：

- 新增轻量只读 Role Remote client / parser；
- 以 `thread.roleId -> role.id` 映射权威 `name`；
- 不调用原始 `/roles`；
- 不在 Mobile 保存或复制 `prompt`、`llmProfile`、`summary`、`avatarId`、`tags` 等 Desktop 内部配置；
- Role 不可读或找不到时，不显示裸 `roleId`，不猜角色名；
- 不改变 MOB-005 已确认的视觉分类优先级：`Agent > Role > 普通`；
- Role name 是补充展示数据，不写回或污染 Remote Thread / Session 真相模型；
- 页面重新聚焦时刷新 Role summary；Host 连接恢复为 `connected` 时重新加载，避免首次断网后角色名一直为空。

主列表、Drawer、Search、WorkspaceDetail 中所有已展示 Role Thread 的入口统一消费同一 Role summary 数据源。

## 不应调整的已完成设计

本任务不推翻：

- MOB-004 的项目层级导航规则；
- MOB-005 的 Agent / Role / 普通线程视觉优先级；
- MOB-006 的 loading / empty / error / data 与真实错误语义；
- MOB-007 / MOB-008 的设备级本地置顶 / 未读决定；
- MOB-009 的配对页产品简化；
- Direct / Relay 底层 transport 与 Device Credential 身份模型。

## 测试要求

### Workspace

- `/remote/v1/workspaces` exact path；
- projection 不含、不依赖 `rootPath`；
- 401 / 403 不清除 paired credential；
- Direct network error -> Relay fallback；
- 非网络错误不错误 fallback。

### Workspace Thread pagination

- `workspaceId` 正确编码进入 route；
- 默认 active / limit 合同；
- `items / total / nextCursor / limit` 解析；
- nextCursor 连续分页；
- cursor 保持 opaque 原值；
- 首屏 `items.length < total` 时不误判总数；
- 不同 Workspace 数据不串；
- 404 / 401 / 403 / 网络错误保持真实状态。

### Role

- `/remote/v1/roles` exact path；
- 只接受 `id + name` projection；
- `roleId -> name` 映射；
- 找不到 Role 时无裸 ID / 无伪造名称；
- Agent 优先级不被 Role name 接入改变；
- 页面 focus / Host 重连后可重新读取 Role summary。

## 实施结果

Mobile 代码施工已完成于 PR #29 `MOB-010: align Desktop Remote contracts`：

- `workspaceApi.ts` 已切换到 `/remote/v1/workspaces`，Mobile-safe projection 明确拒绝 `rootPath`；
- WorkspaceDetail 已改为消费 `/remote/v1/workspaces/:workspaceId/threads` 权威分页，使用 `total / nextCursor / limit`，不再把全量 `/threads` + 本地过滤作为项目线程真相；
- opaque cursor 按 Host 返回值原样 URL encode，不做 trim 或客户端重构；
- 新增严格 Role summary client，仅接受 `{ id, name }`；主列表、Drawer、Search、WorkspaceDetail 统一通过共享 `roleId -> name` 映射展示；
- Agent 继续优先于 Role；Role 不可读或不存在时不暴露裸 ID；
- Role summary 在页面 focus 时刷新，Host 连接恢复时重新读取；
- Direct 仅在网络错误时 Relay fallback；401 / 403 / 404 保持真实错误，不自动清除配对凭证；
- MOB-007 置顶、MOB-008 未读、MOB-009 配对逻辑均保留，没有被本任务重写；
- 两条 Codex P2 review（opaque cursor、Role 重连刷新）均已修复并关闭。

## 自动化验收

GitHub Actions `Mobile CI #386`（run `33100255606`）在同一最终业务代码 HEAD 上完成：

- `npm run typecheck`：success；
- `npm run lint`：success；
- `npm test -- --runInBand`：success；
- Android unsigned release guard：success；
- Android debug APK：build + artifact upload success；
- iOS Simulator：build + artifact upload success；
- unsigned iPhone：build success；
- unsigned IPA：package / verify + artifact upload success。

Android signed release job 在 PR 场景按 workflow 条件正常 skipped，不属于失败。

## 剩余真实联调验收

自动化构建不替代真实 Desktop + Mobile 配对联调。仍需使用 Desktop 0.99.11 或包含 #77 / #78 / #80 的等价 `dev` 构建验证：

1. 配对设备读取 Workspace 列表；
2. 项目列表 -> 项目详情读取权威分页 Thread；
3. 多页 Thread 可以继续加载；
4. Role Thread 能显示权威角色名称；
5. 项目 Thread 进入 Chat 与返回路径正常；
6. 无有效凭证、权限不足、404、慢网/断网不会制造假数据或错误解除配对。

上述真实联调通过后，MOB-010 才升级为“完全完成”，并由 Mobile 侧按各 Issue 验收要求关闭 Desktop #77 / #78 / #80。

## 非目标

- 不修改 Mira Desktop / Host。
- 不修改 Desktop 已定的 #77 / #78 / #80 合同。
- 不重写 Remote Pairing V1。
- 不新增 Workspace 写能力。
- 不新增 Role 管理页。
- 不做账户级置顶 / 未读同步。
- 不借本任务重构所有 Remote API。
