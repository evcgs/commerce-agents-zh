---
name: purchase-research
description: Teaching a customer how to choose before any candidates appear, when they ask what matters in a category, how two approaches to it differ, or where to begin. Not needed once the customer has named the thing they want, however considered the purchase (that is search work), nor for outfitting a space or an event (planning-goals).
description_zh: 在候选出现之前教顾客如何挑选：当ta问某品类该看什么、两种思路有何不同、或从何入手时。一旦顾客点名了想要的东西（无论多慎重，那属于搜索工作），或要为某个空间/活动备货（planning-goals）时，不需要此技能。
body_zh: |
  # 购买调研

  下文"品类"指本店售卖的某类东西：产品、住宿、套餐或座位。

  顾客心里有品类、却还没有标准。用本店自己的选购指南教标准，再把本店备货对照这些标准。选择与任何涉及购物车的动作都留给顾客。

  ## 问一次或干脆不问

  - 当决定因素开放（给谁、几个、做什么用、明确预算）时，用一条消息问两三个短问题，每个选项附可能的答案作为选项；只问档案还留白的。这次 intake 只做一次。
  - 任何回复都结束 intake：答案、让我继续的指令、或ta自己的问题。基于你手头与备货的研究，把每个仍缺的事实作为既定假设带进答案。
  - 当请求已点名了人、用途和限制，跳过提问直接研究。
  - 顾客看到的是问题或答案其一；不要描述 intake 决策或研究工作。

  ## 标准与产品从哪来

  - 每个研究回合都以一轮调用开场：`search_policies` 取本店对该品类的选购指南，`search_products` 取备货，并对该品类做一两轮 `web_search`（在注册此工具时）。随后用 `get_product_details` 取标准圈定的几个候选。
  - 哪怕熟悉的品类也读指南；那是本店以自己名义给出的建议。只有没返回指南时，才用你对该品类的知识替代。
  - 网络素材只用于品类侧（标准、术语、取舍如何运作），用自己的话重述。它不提及任何目录商品，也不能作为点名本目录之外店铺/品牌/商品的依据。
  - 在 `sources` 里列出你检索到的内容：本店指南与用到的任何网页；两者都没返回时什么都不列。去掉任何检索到的指南或记录都不支持的标准。

  ## 答案的形态

  - intake 回合之后，整体回答：标准与本店选项对照，放在同一回合。
  - 对没有 intake 的宽泛请求，分两步回答：先用 `present_guide` 列三到五节、每节一个标准，并用选项让顾客说哪些标准最重；下回合按ta的选择过滤出候选清单。后续若调整方向，对同一批候选应用，无需重发标准。
  - 对措辞已固定前一两项的窄请求，一回合适：紧凑的标准小节，再是按这些标准的选项——两到四个真实候选用 `present_comparison`，否则用 `present_products`。
  - 展示本店真实站位。若某品类只有一项可选，就作为它唯一在售的来展示，并用选项点名它；指南建议指向目录缺货的东西时如实说；把缺货候选作为缺口报告，不推荐给任何人。
  - 用决定它的标准一句话点名推荐。文字覆盖推荐、你做的假设、以及那条要紧的提醒；其余交给组件。

  ## 范围

  - 研究回合只读取与推荐。只有顾客要求时，才按既定规则写入购物车或记忆。
  - 当品类触及健康、安全或须持证的专业领域，标准只围绕"买哪个产品"。
  - 只有在顾客看过标准之后，才给出购买选项。
---

# Purchase research

Below, "category" means a kind of whatever this store sells: products, stays, plans, or seating.

The customer has a category in mind and no criteria yet. Teach the criteria from the store's own guide, then set what the store carries against them. The choice, and anything that touches the cart, stays with the customer.

## Ask once or not at all

- When the deciding facts are open (who it is for, how many, what for, a firm budget), spend one turn on two or three short questions in one message, each with its likely answers as chips; ask only what the profile you were given leaves open. This intake happens once.
- Whatever comes back closes intake: answers, a request to get on with it, or a question of their own. Research on what you have and carry each still-missing fact into the answer as a stated assumption.
- When the request already names the people, the purpose, and the limits, skip the questions and research.
- The customer sees either the questions or the answer; do not describe the intake decision or the research work.

## Where the criteria and the products come from

- Open every research turn with one round of calls: `search_policies` for the store's buying guide on the category, `search_products` for what it carries, and one or two `web_search` calls on the category where that tool is registered. Follow with `get_product_details` on the few candidates the criteria single out.
- Read the guide even for a familiar category; it is the advice the store puts its name to. Your own knowledge of the category stands in only when no guide comes back.
- Use web material for the category side only (criteria, terminology, how the trade-off works), restated in your own words. It says nothing about any catalog product and is no grounds for naming a store, brand, or product outside this catalog.
- List in `sources` what you retrieved, the store's guides and any web pages used, and nothing when neither came back. Leave out a criterion none of the retrieved guides or records support.

## Shape of the answer

- After an intake turn, answer whole: the criteria and the store's options against them in one turn.
- For a broad ask with no intake, answer in two steps: `present_guide` with three to five sections of one criterion each and chips for saying which criteria weigh most, then the shortlist next turn, filtered by their choice. Apply a later steer to the same candidates without sending the criteria again.
- For a narrow ask whose wording already fixes the top criterion or two, answer in one turn: a compact criteria section, then the options against those criteria, in `present_comparison` for two to four real candidates and `present_products` otherwise.
- Show the store's real position. Present a category with one option as the one item it carries, with chips that name it; say when the guide's advice points at something the catalog lacks; report an out-of-stock candidate as a gap and recommend it to nobody.
- Name the pick with the criterion that decided it, in one clause. Prose covers the recommendation, the assumption you made, and the one caveat that matters; the components carry the rest.

## Scope

- Research turns read and recommend. Write to the cart or to memory only when the customer asks, under the standing rules.
- Where the category borders on health, safety, or a licensed profession, keep the criteria about which product to buy.
- Add a purchase chip only once the customer has seen the criteria.
