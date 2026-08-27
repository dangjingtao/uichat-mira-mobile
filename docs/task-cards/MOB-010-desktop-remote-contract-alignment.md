# MOB-010：Desktop Remote 合同接入收口

状态：待实施

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

当前 Mobile `src/api/workspaceApi.ts` 仍读取：

```text
GET /chat-workspaces
```

并在本地 `ChatWorkspace` projection 中保留 `rootPath`。

需要调整为：

```text
GET /remote/v1/workspaces
Authorization: Bearer <device-credential>
```

Mobile-safe Workspace 只包含：

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

当前 `WorkspaceDetailScreen` 仍通过：

```text
miraHostClient.listSessions()
  -> 拉取全量 Thread
  -> Mobile 按 workspaceId 本地过滤
```

正式合同已改为：

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
- 支持 `nextCursor` 连续加载；cursor 视为不透明字符串，不解析、不自行构造；
- `total` 是权威总数，不使用 `items.length` 冒充项目总线程数；
- 非当前用户 Workspace 的 404 保持真实错误语义；
- archived Thread 只有明确产品入口需要时再以 `status=archived` 查询，不在本任务擅自新增归档 UI；
- 现有 WorkspaceDetail -> Chat 路由、Session 映射、线程类型图标继续复用。

原 `filterWorkspaceSessions()` 若不再承担其它有效职责，应删除或降级为纯测试/辅助函数，避免形成第二套 Workspace Thread 真相。

## 3. Role summary 接入（关联 MOB-001 / MOB-005 / Desktop #78）

Desktop 已提供：

```text
GET /remote/v1/roles
Authorization: Bearer <device-credential>
```

返回严格 projection：

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
- Role name 是补充展示数据，不写回或污染 Remote Thread / Session 真相模型。

首轮需要核对主列表、Drawer、Search、WorkspaceDetail 中所有已展示 Role Thread 的入口，保证消费同一 Role summary 数据源；不要每个页面各自发明映射逻辑。

## 不应调整的已完成设计

本任务不推翻：

- MOB-004 的项目层级导航规则；
- MOB-005 的 Agent / Role / 普通线程视觉优先级；
- MOB-006 的 loading / empty / error / data 与真实错误语义；
- MOB-007 / MOB-008 的设备级本地置顶 / 未读决定；
- MOB-009 的配对页产品简化；
- Direct / Relay 底层 transport 与 Device Credential 身份模型。

## 测试要求

至少新增/调整自动化覆盖：

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
- 首屏 `items.length < total` 时不误判总数；
- 不同 Workspace 数据不串；
- 404 / 401 / 403 / 网络错误保持真实状态。

### Role

- `/remote/v1/roles` exact path；
- 只接受 `id + name` projection；
- `roleId -> name` 映射；
- 找不到 Role 时无裸 ID / 无伪造名称；
- Agent 优先级不被 Role name 接入改变。

## 验收

代码完成后至少通过：

- `npm run typecheck`
- `npm run lint`
- `npm test -- --runInBand`
- Android 构建
- iOS 构建

并以 Desktop 0.99.11 或包含 #77 / #78 / #80 的等价 `dev` 构建完成真实配对联调：

1. 配对设备读取 Workspace 列表；
2. 项目列表 -> 项目详情读取权威分页 Thread；
3. 多页 Thread 可以继续加载；
4. Role Thread 能显示权威角色名称；
5. 项目 Thread 进入 Chat 与返回路径正常；
6. 无有效凭证、权限不足、404、慢网/断网不会制造假数据或错误解除配对。

完成真实接入与联调后，由 Mobile 侧按各 Issue 验收要求关闭 Desktop #77 / #78 / #80。

## 非目标

- 不修改 Mira Desktop / Host。
- 不修改 Desktop 已定的 #77 / #78 / #80 合同。
- 不重写 Remote Pairing V1。
- 不新增 Workspace 写能力。
- 不新增 Role 管理页。
- 不做账户级置顶 / 未读同步。
- 不借本任务重构所有 Remote API。
