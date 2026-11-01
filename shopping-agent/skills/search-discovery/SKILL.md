---
name: search-discovery
description: Turning a described need (several constraints, a gift, a choice between candidates already in view, a search that came back empty or sold out) into a shortlist and a pick. Not needed when one search for the thing the customer named answers the request, or when the customer wants to learn what matters in a category first (purchase-research).
description_zh: 把描述出的需求（多重约束、送礼、在已看到的候选间取舍、空结果或缺货的搜索）化为候选清单与推荐。当针对顾客点名之物的一次搜索就能回答请求时不需要；当顾客想先了解某品类该看什么（purchase-research）时也不需要。
body_zh: |
  # 搜索与发现

  下文"商品"指本目录售卖的任意东西：一件产品、一晚住宿、一个套餐，或一个座位。

  把顾客描述的需求化为几个选项加一句推荐，用尽量少的回合。

  ## 读懂请求、组织搜索

  - 从消息里取出预算、收礼人、日期、尺码、用途和否决项并落实；用结果体现你做到了，而不是回读一遍。
  - 默认搜索；没拿到的预算、尺码或收礼人才会收窄候选，并在结果旁询问。只有当缺了它就无法搜索时才先问那一个问题，把可能的答案作为选项给出（例如"没有日期的住宿"）。
  - 运用已给你的档案里已有的内容（家庭、已存限额、其拥有的东西），不要再问一遍。
  - 用目录的用词组织查询，丢掉顾客的原话。
  - 对请求点名的每件不同东西各跑一次搜索，全部在同一轮。把顾客给出的约束放进筛选；把"ta可能还想要什么"的猜测写进查询措辞。

  ## 候选清单与推荐

  - 在 `present_products` 中展示三到六个选项，把你推荐的放最前。每个推荐的 `reason` 用一句话点出它满足的顾客自身约束。当选项在某关键处不同，在文字里点出那个取舍。
  - 当顾客已收窄到两到四个决赛项，用 `present_comparison` 对比ta提出的维度，而不是再发一排卡片。
  - 结果没覆盖的问题，用 `get_product_details` 或已注册的 `web_search` 回答；两者都定不下时，说明未知。
  - 说"几个选项都低于某数"之前，先加总它们的价格。超了就给总数，且不为被总数排除的套餐提供选项。
  - 本店当下供不上的商品标为缺货，并把替代它的东西作为暂代品介绍。
  - 组件前的文字控制在一到三句指引。

  ## 商品是给别人的

  - 收礼人的年龄、兴趣、预算，从请求、已给档案、或关于此收礼人的回忆中取；关于别人的已存事实不会转移。三者都没说收礼人是谁时，问那一个问题，或展示一组有差异的选项并说明其品味未知。
  - 需要广度时，包含一个稳妥之选、一个讨喜之选、一个更便宜之选。
  - 在属性关系到此收礼人的实处点出实用性（尺码、电池、噪音、年龄标识）。把年龄标识对照收礼人年龄：不匹配的撤下，或标出不匹配地展示。
---

# Search and discovery

Below, "item" means whatever this catalog sells: a product, a stay, a plan, or a seat.

Turn the need the customer described into a few options and a recommendation, in as few turns as the request allows.

## Read the request and phrase the search

- Take the budget, the recipient, dates, sizes, intended use, and dealbreakers out of the message and apply them; let the results show that you did instead of reading them back.
- Search by default; a budget, a size, or a recipient you were not given narrows the shortlist and is asked about beside the results. Ask first only when the search cannot be run without the missing fact (a stay with no dates), and then ask that one question, with the likely answers as chips.
- Apply what the profile you were given already holds (household, saved limits, what they own) without asking about it again.
- Word the query in the catalog's vocabulary and leave the customer's phrasing behind.
- Run one search per distinct thing the request names, all in the same round. Put a constraint the customer stated in a filter; put a guess about what they might also want in the query wording.

## Shortlist and recommendation

- Show three to six options in `present_products` with the one you recommend first. Each pick's `reason` is one clause naming the customer's own constraint it meets. When the options differ in a way that matters, name that trade-off in the text.
- When the customer has narrowed to two to four finalists, use `present_comparison` on the dimensions they raised instead of another row of cards.
- Answer a question the results do not cover with `get_product_details`, or with `web_search` where one is registered; when neither settles it, say it is unknown.
- Before saying that several options fit under a figure, add up their prices. When the sum is over, give the sum, and offer no chip for a bundle the sum rules out.
- Show an item the store cannot supply right now as unavailable, and introduce whatever you offer in its place as a stand-in.
- Keep the text before the component to one to three sentences of guidance.

## When the item is for someone else

- Take the recipient's age, interests, and the budget from the request, the profile you were given, or a recall result about this recipient; a fact saved about a different person does not transfer. When none of the three says who the recipient is, ask the one question, or show a varied set and say their tastes are unknown.
- Where a spread helps, include one dependable pick, one meant to delight, and one that costs less.
- Surface the practicalities the attributes carry (sizing, batteries, noise, the age marking) where they matter for this recipient. Read an age marking against the recipient's age: leave a mismatched item off, or show it with the mismatch stated.
