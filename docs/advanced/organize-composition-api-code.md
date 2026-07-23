# 组织 Composition API 代码 {#organize-composition-api-code}

Composition API（组合式 API）非常强大，但它带来一个 Options API 时代不存在的新难题：**代码该怎么组织？** Options API 有一套天然的结构约束 `data`、`computed`、`methods`、`watch` 各就各位，你几乎不用思考「放哪里」。

而 Composition API 把这份自由完全交给了开发者，反而容易产生**选择疲劳（choice fatigue）**和结构混乱。

很多从 Options API 转过来的人会下意识地把 `<script setup>` 里的代码「按选项类型」堆放，所有 `ref` 放一起、所有 `computed` 放一起、所有函数放一起。

这恰恰是最常见、也最容易埋雷的错误。

本文围绕这个痛点，展示如何一步步重构成可维护、可复用的结构。

## Options API vs Composition API {#organize-composition-api-code-difference}

两者的核心差异不在语法，而在**代码的组织维度**：

| 维度      | Options API                    | Composition API   |
|---------|--------------------------------|-------------------|
| 组织方式    | 按「选项类型」强制分组                    | 由开发者自由决定          |
| 同一功能的代码 | 被拆散到 data / methods / computed | 可以聚在一起            |
| 复用逻辑    | mixins（易冲突）                    | composable（清晰可组合） |
| 上手心智负担  | 低（有固定套路）                       | 高（需要自己定规矩）        |

Composition API 的最大优势本应是「把同一个功能相关的代码聚拢在一起」，但如果沿用 Options API 的思维去摆放代码，这个优势就被彻底浪费了。

## 常见错误：按「选项」分组 {#organize-composition-api-code-wrong}

假设有一个消息（message）相关的功能，同时还带有一个开关状态。按 Options API 惯性写出来的 `<script setup>` 往往长这样：

```vue
<script setup lang="ts">
// ❌ 所有 ref 堆在一起
const message = ref('')
const messages = ref<string[]>([])
const isOpen = ref(false)

// ❌ 所有 computed 堆在一起
const messageCount = computed(() => messages.value.length)
const hasMessages = computed(() => messages.value.length > 0)

// ❌ 所有函数堆在一起
function addMessage() {
  messages.value.push(message.value)
  message.value = ''
}
function toggle() {
  isOpen.value = !isOpen.value
}
</script>
```

当组件功能变多时，一个功能相关的状态、计算属性和方法被**割裂到三个不同区域**。

想读懂「消息」这块逻辑，必须在文件里上下反复横跳；而「开关」逻辑也和消息逻辑交错在一起。

文件越长，这种「意大利面式代码（spaghetti code）」的维护成本越高。

**这种分组方式让「相关的东西」离得很远，「无关的东西」却挨在一起**，与 Composition API 的设计初衷背道而驰。

## 重构第一步：按逻辑关注点分组 {#organize-composition-api-code-step1}

第一步不需要任何新 API，只是把代码**按功能（feature）而非按选项类型重新排列**，让相关的 ref、computed、函数聚在一块：

```vue
<script setup lang="ts">
// 消息相关
const message = ref('')
const messages = ref<string[]>([])
const messageCount = computed(() => messages.value.length)
const hasMessages = computed(() => messages.value.length > 0)

function addMessage() {
  messages.value.push(message.value)
  message.value = ''
}

// 开关相关
const isOpen = ref(false)
function toggle() {
  isOpen.value = !isOpen.value
}
</script>
```

仅仅是重新分区，可读性就已明显提升：想改消息逻辑，只看第一块即可；想改开关，只看第二块。**这一步其实就已经解决了大部分混乱问题**，但还没到终点。

## 重构第二步：抽取成 composable {#organize-composition-api-code-step2}

当某块逻辑足够独立、甚至可能被其他组件复用时，就可以把它抽成一个 composable。以消息逻辑为例：

```ts
// composables/useMessages.ts
export function useMessages() {
  const message = ref('')
  const messages = ref<string[]>([])

  const messageCount = computed(() => messages.value.length)
  const hasMessages = computed(() => messages.value.length > 0)

  function addMessage() {
    messages.value.push(message.value)
    message.value = ''
  }

  return {
    message,
    messages,
    messageCount,
    hasMessages,
    addMessage
  }
}
```

组件里就变得非常干净：

```vue
<script setup lang="ts">
const { message, messages, messageCount, hasMessages, addMessage } = useMessages()
</script>
```

至于开关这类通用逻辑，甚至无需自己写，直接用 VueUse 的 `useToggle`：

```ts
import { useToggle } from '@vueuse/core'

const [isOpen, toggle] = useToggle(false)
```

> 抽 composable 的判断标准通常是「这段逻辑是否有清晰的职责边界」和「是否可能被复用或独立测试」。
> 
> 并非所有逻辑都值得抽，过度拆分同样会增加跳转成本。

## 内联 composable（in-line composable）{#organize-composition-api-code-inline-composable}

抽 composable 有时会有个副作用：为了一小段只在当前组件用一次的逻辑，专门新建一个文件，反而增加了跳转成本。

下面介绍了一个来自 Evan You 的模式，**内联 composable**，即把 composable 直接**定义在同一个组件文件内**，而不抽到外部文件。

```vue
<script setup lang="ts">
// 直接在组件内定义，不导出、不建新文件
function useMessages() {
  const message = ref('')
  const messages = ref<string[]>([])
  const messageCount = computed(() => messages.value.length)

  function addMessage() {
    messages.value.push(message.value)
    message.value = ''
  }

  return { message, messages, messageCount, addMessage }
}

function useToggleState() {
  const isOpen = ref(false)
  const toggle = () => { isOpen.value = !isOpen.value }
  return { isOpen, toggle }
}

// 在 setup 顶层调用，组装组件
const { message, messages, messageCount, addMessage } = useMessages()
const { isOpen, toggle } = useToggleState()
</script>
```

这个模式的妙处在于兼顾了两端：

- **逻辑聚合**：每个功能的状态与方法被自然封装在一个函数里，边界清晰；
- **无跳转成本**：逻辑仍在同一文件，不必为一次性使用而新建文件；
- **易于演进**：当某个内联 composable 确实需要复用时，把它整段剪切到独立文件即可，几乎零改动。

## 常见案例：组织 Composition API 代码的可执行步骤 {#organize-composition-api-code-steps}

1. 停止「按选项类型分组」不要再把所有 `ref` / `computed` / 函数各自扎堆。
2. 先按**逻辑关注点**重排代码，让同一功能的状态、计算、方法聚在一起。
3. 用注释或空行为每个功能块划分清晰边界。
4. 对职责独立、可能复用的逻辑，抽取为外部 composable（如 `useMessages`）。
5. 通用逻辑优先复用现成方案，如 VueUse 的 `useToggle`。
6. 对「只在本组件用一次」的逻辑，采用**内联 composable**，定义在组件文件内。
7. 当内联 composable 需要复用时，再整段迁移到独立文件。

## 注意事项 {#organize-composition-api-code-considerations}

| 事项                 | 说明                                   |
|--------------------|--------------------------------------|
| 别照搬 Options API 思维 | 按选项类型分组会割裂同一功能的代码，制造意大利面             |
| 分组优先，抽取其次          | 仅重排逻辑就能解决大部分可读性问题，未必都要抽 composable   |
| 内联 composable 不必导出 | 它只是组织手段，定义在组件内即可，需要复用再外移             |
| 避免过度拆分             | 为极小逻辑滥建文件会增加跳转与心智成本                  |
| 善用 VueUse          | `useToggle` 等现成 composable 能省掉重复样板代码 |
| 命名遵循 `useXxx`      | 与 composable 约定保持一致，也便于团队识别          |

组织 Composition API 代码的核心心法其实只有一句：**让相关的代码待在一起，让无关的代码彼此分开。**