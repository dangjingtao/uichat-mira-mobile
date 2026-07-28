import type { ChatMessage, Session } from '../types';

export const mockSessions: Session[] = [
  {
    id: 'session-1',
    title: '通用助手',
    updatedAt: new Date(Date.now() - 1000 * 60 * 5),
  },
  {
    id: 'session-2',
    title: '代码审查',
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
  },
  {
    id: 'session-3',
    title: '前端架构讨论',
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
  },
];

export const mockMessages: Record<string, ChatMessage[]> = {
  'session-1': [
    {
      id: 'msg-1',
      role: 'user',
      content: '你好，帮我写一段 React Native 的 FlatList 示例',
      timestamp: new Date(Date.now() - 1000 * 60 * 10),
    },
    {
      id: 'msg-2',
      role: 'assistant',
      content:
        '好的，这是一个简单的 FlatList 示例：\n\n```tsx\n<FlatList\n  data={items}\n  keyExtractor={(item) => item.id}\n  renderItem={({ item }) => (\n    <View>\n      <Text>{item.title}</Text>\n    </View>\n  )}\n/>\n```\n\n需要更复杂的功能比如下拉刷新、上拉加载吗？',
      timestamp: new Date(Date.now() - 1000 * 60 * 9),
    },
    {
      id: 'msg-3',
      role: 'user',
      content: '够了，谢谢！',
      timestamp: new Date(Date.now() - 1000 * 60 * 5),
    },
  ],
  'session-2': [
    {
      id: 'msg-4',
      role: 'user',
      content: '帮我看一下这段代码有没有内存泄漏',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
    },
    {
      id: 'msg-5',
      role: 'assistant',
      content:
        '从代码结构来看，主要关注以下几点：\n\n1. useEffect 中没有正确清理订阅\n2. 闭包中捕获了过大的对象\n3. 定时器未清除\n\n建议添加 cleanup 函数并检查依赖数组。',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2 + 1000 * 30),
    },
  ],
  'session-3': [
    {
      id: 'msg-6',
      role: 'user',
      content: '我们在讨论新的状态管理方案',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24),
    },
  ],
};
