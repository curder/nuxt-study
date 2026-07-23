# Options API 还是 Composition API {#vue-options-api-vs-composition-api}

Vue 已经走过十年。

选项式 API（Options API）从最初就存在，组合式 API（Composition API）也已诞生四年。

两套 API 并存至今，于是那个绕不开的问题再次被抛出来：**Options API 会不会被废弃？该在什么场景用哪一套？**

先给结论。Vue 官方文档在 Composition API FAQ 里对"Options API 会被废弃吗"给出的回答是明确的 **No**：

> 我们没有任何废弃 Options API 的计划。
> 
> Options API 是 Vue 不可分割的一部分，也是很多开发者热爱 Vue 的原因。
> 
> 我们也意识到，Composition API 的许多收益只有在大型项目中才会显现，而 Options API 对于大量中低复杂度的场景仍是稳妥的选择。

Evan You 本人也在推特上再次确认了这一点。**Options API 不会一夜消失，喜欢它的人可以继续用。**

不过 Evan 同时提到，未来在"新项目该用哪套 API"这件事上，Vue 可以更有倾向性（more opinionated）。

但要强调的是，这更多是**教育引导和文档层面的调整**，而不是要拿走 Options API。

提案背后的理由也值得一提。主要论点有三：

1. "多种写法会分裂社区"（类似当年响应性语法糖 reactivity transform 被移除的原因）；
2. Options API 能做的事 Composition API 都能做，属于冗余开销；
3. 编译器优化，去掉 Options API 后编译器能做更激进的优化，而且 **Vapor 模式（Vapor mode）只支持 Composition API**。

## 人们为什么不用 Composition API {#why-not-composition-api}

针对"为什么不用 Composition API"，社区收集到上百条回复，归纳为以下几类。

### 1. 遗留代码（Legacy）{#legacy-code}

有人说手里有几万行 Options API 代码、一堆老组件，不想重写。这个理由完全成立。

关键在于：**没有人要求你重写**。即便是提案，也只是"用 flag 禁用为默认关闭"，你依然能开启使用。

而且把组件从 Options API 重写成 Composition API，**对最终用户没有任何额外价值**，为了消除并不产生收益的技术债去重写，并不划算。

这里要区分两件事：

- "不想把 V2 升级到 V3"，不推荐，因为框架升级带来性能提升和新依赖；
- "在 V3 里继续用 Options API" ，完全没问题，什么都不会坏。

务实做法是：**新组件用 Composition API，改到旧组件时视时间成本顺手迁移**，而不是大爆炸式重写。

### 2. 兼容性误解 {#compatibility-misconception}

"我还在 Vue 2，用不了 Composition API"，这是误区。Composition API 已经**反向移植（back port）到 Vue 2.7**。

唯一的限制是不能直接用 `<script setup>`，但有对应的 unplugin 能在编译时补上这层能力。

也就是说，Vue 2.7 里可以用 `setup()` 函数写 Composition API，将来升级到 Vue 3 再换成 `<script setup>` 即可平滑过渡。

### 3. 显式响应性与 `.value` {#explicit-reactivity}

Options API 里一切默认响应式（reactive by default），省心；但当你需要"某个东西不要响应式"时，就得靠 `Object.freeze` 之类的变通手段。

Composition API 更显式：你能明确区分"这是响应式的 `ref`""这是普通 JS 变量"。代价是要理解 `ref` 的工作方式、要写 `.value`。

`.value` 在他看来是**优点**，它让"什么是响应式"一目了然。

如果实在不喜欢到处写 `.value`，有个折中：用一个大的 `reactive` 对象装所有状态，当作 Options API 里的 `data` 来用：

```js
import { reactive } from 'vue'

const state = reactive({
  count: 0,
  message: 'hello',
})

function increment() {
  state.count++ // 无需 .value
}
```

代价是失去了"传递显式响应式引用"的能力，但这本来也是 Options API 所不具备的。只要**在代码库里保持一致**，这种写法完全可以接受。

### 4. "想要 React 就直接写 React" {#react-is-not-vue}

这是常见的误解。Composition API **并不等于 React Hooks**。

即使只看 Composition API，Vue 依然独特：内置信号（signals）机制、`ref` 与 `shallowRef`、深层嵌套响应式系统、优秀的开发体验，以及即将到来的 Vapor 模式。

切到 Composition API 不是"变成 React"，只是换了一种组织结构。

### 5. "Options API 有结构，Composition API 很乱"

Options API 的最大卖点是"结构清晰、易上手"：状态放 `data`、计算属性放 `computed`、侦听器放 `watch`、方法放 `methods`、生命周期钩子各就各位。

甚至在给零基础学员讲 Vue 时仍会先教 Options API，因为它对新手和初级开发者非常友好，不需要懂架构就知道东西该放哪。

问题出在中大型应用。当一个组件的 `<script>` 长到几百行，你想找某个功能的相关逻辑时，就得在 `data`、`computed`、`methods`、`watch` 之间反复横跳。

因为 **Options API 是"按类型分组"（group by type），而不是"按逻辑分组"（group by logic）**。

调试时你关心的往往是"某块状态发生了什么变化"，而不是"某个 computed 在哪"，这会显著增加认知负担（cognitive load）。

借用 Cory House 的"关注点分离"（separation of concerns）图来类比：早年争论"JS/CSS/HTML 该不该分开写"，最终答案是按组件（component）聚合三者。同理：

| 维度         | Options API                            | Composition API       |
|------------|----------------------------------------|-----------------------|
| 分组方式       | 按类型（data / computed / methods / watch） | 按逻辑（useXxx 聚合相关状态与逻辑） |
| 查找功能       | 需跨多个选项块跳读                              | 相关逻辑集中在一处             |
| 复用         | Mixins（来源不清、易冲突）                       | Composables（显式、清晰）    |
| TypeScript | 较弱、依赖 `this` 魔法                        | 原生友好、显式               |

Composition API 允许你把一个功能的状态、计算、侦听全部收进一个 `useXxx`：

```js
function useCounter() {
  const count = ref(0)
  const double = computed(() => count.value * 2)
  function increment() {
    count.value++
  }
  return { count, double, increment }
}
```

**这种结构优势需要你主动去组织**。

如果只是写个 `// data` 注释再堆 `ref`、写个 `// methods` 再堆函数，那不过是"用 Composition API 写 Options API"，可行但不推荐，因为可读性会很差。

针对"Composition API 没结构"的焦虑（analysis paralysis），推荐几种组织手法：**内联 composable（inline composable）**，在组件内直接写返回 refs/reactives/方法的函数来分组；复用多次的再抽成独立 composable 文件；

也有人用额外的 `<script>` 块来就近放置 UI 相关逻辑。个人偏好内联 composable。

## Composition API 的额外优势 {#composition-api-advantages}

除了结构，Composition API 还有几处 Options API 给不了的好处：

- **TypeScript 支持**：没有 `this` 的映射魔法，一切显式，类型推断顺畅，习惯后更易追踪。
- **更少样板（boilerplate）**：组件体积可显著缩小，逻辑更易抽象。
- **代码复用优于 Mixins**：多个 mixin 会导致 `this.xxx` 来源不明、彼此隐式耦合；composable 则清晰得多。这些痛点通常在应用变大后才暴露。
- **生态倾向**：Pinia、Vue Router 等官方库两套都支持，但很多流行第三方库并不强制同时支持两套 API。库作者没有义务兼容 Options API，因此更倾向优先支持官方推荐的 Composition API。

官方文档对生产环境的建议也印证了这点：

> 若没有构建步骤（build step）、只是做渐进增强（progressive enhancement），选 Options API 完全可以；
> 
> 若要构建完整的前端应用，推荐使用 Composition API + 单文件组件（SFC）。

## 常见案例 {#common-cases}

把整场讨论浓缩成可执行的决策路径：

1. **无构建步骤 / 渐进增强 / 低复杂度**：直接用 Options API，你几乎不会遇到上面那些问题。
2. **完整前端应用 / 中大型项目**：用 Composition API + SFC，官方与多数库作者都以它为首选。
3. **有大量 Options API 遗留代码**：不必重写；新组件用 Composition API，改到旧组件时再顺手迁移。
4. **还在 Vue 2**：用 2.7 的 `setup()` 写 Composition API，升级 V3 后换 `<script setup>`。
5. **不喜欢 `.value`**：用单个大 `reactive` 对象承载状态，但全库保持写法一致。
6. **担心"没结构"**：用内联 composable 按逻辑分组，复用多次的抽成独立 composable。
7. **学习阶段**：两套都学，大量现有资料用 Options API 写成，读懂两者才能吃透生态。

## 注意事项 {#cautions}

- **别把提案当官方决定**：禁用 Options API 只是个人提案，Vue 团队明确表示没有废弃计划。
- **重写无收益就别重写**：从 Options API 迁到 Composition API 对用户没有直接价值，不要为消技术债而重写。
- **Vue 2.7 能用 Composition API**：唯一限制是 `<script setup>` 需借助 unplugin，`setup()` 函数本身可直接用。
- **可以混用但有前提**：`setup()` 与 Options API 混写只推荐用于"已有 Options API 代码库的迁移过渡"，新项目不建议。
- **Composition API 不会自动带来好结构**：按类型堆砌等于换皮的 Options API，务必按逻辑分组。
- **团队需要风格约定**：大团队里"想放哪放哪"会导致质量参差，建议配套 style guide、评审规范，甚至借助 code mod 做迁移辅助（Evan 也提到 code mod 很难做到"一刀切"，但 80% 的自动化方案或许可行）。
- **关注 Vapor 与生态走向**：Vapor 模式仅支持 Composition API，越来越多库也只支持它。即便当下用 Options API 没问题，长期看熟悉 Composition API 是更稳的投资。