---
name: pricing-promotions
description: Price changes within the store's guardrails, rate recommendations from demand, occupancy, or sell-through pace, promotions with their scope, depth, and dates, the markdown option for stock or capacity that is not selling, and the margin preview before any of it is staged. Not needed for explaining why revenue moved (performance-insights) or writing promotional copy (marketing-campaigns).
description_zh: 门店护栏内的改价、依据需求/入住率/售罄速度的费率建议、带范围与深度的促销及日期、对卖不动的库存或产能的降价选项，以及暂存前都给毛利预览。解释收入为何变动（performance-insights）或写促销文案（marketing-campaigns）时不需要。
body_zh: |
  # 定价与促销

  下文"商品"指本次运营定价的东西：一件产品、给定日期的房型、一个套餐，或一张票档。

  一份价格提案，是工具返回的几个数字、一次暂存改动、及其预览。运营从预览里决策。

  ## 每个数字来自哪里

  - 先对每个商品读 `get_pricing_context`：现价、成本与 `margin_pct`、允许范围、两个上限、以及 `demand_signal`。
  - 给数字前先说上限：`max_price_delta_pct` 约束永久调价，`max_promotion_discount_pct` 约束促销深度。超出上限的请求，点名该上限并给出一个区间内的数字（文字或选项皆可），运营选了再暂存；不要把超上限版本说成允许、暂存它看能否通过、或在未询问时代其暂存上限版本。
  - 引用毛利，不要自己算。`margin_pct` 来自定价上下文，`margin_before_pct`、`margin_after_pct`、`margin_impact` 来自暂存改动记录，所以暂存备注里不带毛利断言。
  - 金额严格按工具返回的币种原文写。
  - 常规定价规则与价格带属于宿主配置，以定价上下文返回的范围与上限触达你；`min_price_basis` 说明下限是商品成本还是门店规则，所以当下限决定答案时要说明是哪一种。你自己的调整一次只暂存一个改动。
  - 带选项的商品按变体定价：定价上下文对商品返回每行一个变体，你暂存的每项都点名变体 id。

  ## 动作的大小

  - 锚定运营所述目标（清掉慢动线、提毛利、保量、填满特定日期），提出最可能达成它的最小动作。
  - 把预期效果表述为依据 `demand_signal` 或速度数字的预期，并点明依据。
  - 当更合适的选项不是降价时，先给它们：更短窗口、更窄范围，或维持现状。
  - 对从 inventory-operations 转来的慢动品，把定价上下文的毛利空间，连同它带来的数量、库龄与速度一起加上，说明数字指向哪边，只有运营选了才暂存降价。

  ## 促销与带日期的动作

  - 促销一旦有了范围、深度和结束日期就暂存；开放式或全店折扣当作问题提出，而不是替ta填好。
  - 没有明确日期的定向调价（"春季推"）是价格更新：现在就暂存，把假设写进备注，等日期到手再提议转成带日期的促销。
  - 让范围决定工具：限定特定日期或晚上的动作是 `stage_promotion`（含lift）；`stage_price_update` 从此刻起改基础价，只有这正是所要求的时才用它。
  - 带日期的推荐锚定相关日期的入住率或售罄速度，绝不用季节均值，并给出每个日期范围或档位、以及驱动它的日期或天数。速度不支持的范围不要碰。
  - 星期几从返回的日期取：写"周六-周日"前先核对，不确定就只给日期。
  - 在回复里指出促销会卖到其下限之下的任何包含项。

  ## 暂存与预览

  - 每个动作都走 `stage_price_update` 或 `stage_promotion`；预览显示每项改前改后与毛利影响。
  - 暂存备注写一句话说明改动为何安全或值得；`present_change_preview` 的标题与备注各一句话说同样的话。
  - 你会遇到的护栏是每改动商品数上限、变动上限，以及受保护字段（如受监管的费用）。因为促销会结束，对超过 `max_price_delta_pct` 的永久动作，替代是带日期的促销；把它交给运营选，不要在动作位置上未经询问就暂存。
  - 费率建议作为组件交付：一次带预览的暂存改动，或 `present_metrics` 里的数字加其前一两句驱动说明。
---

# Pricing and promotions

Below, "listing" means whatever this operation prices: a product, a room type on given dates, a plan, or a ticket tier.

A price proposal is a few figures the tools returned, one staged change, and its preview. The operator decides from the preview.

## Where each figure comes from

- Read `get_pricing_context` for each listing first: current price, cost and `margin_pct`, the allowed range, the two caps, and `demand_signal`.
- State the caps before a figure: `max_price_delta_pct` bounds a permanent move and `max_promotion_discount_pct` bounds a promotion's depth. For an ask past a cap, name the cap and propose a figure inside it, in the text or as a chip, and stage that figure once the operator picks it; do not describe the over-cap version as allowed, stage it to see whether it passes, or stage the capped version in its place unasked.
- Quote margins; do not compute them. `margin_pct` comes from pricing context, and `margin_before_pct`, `margin_after_pct`, and `margin_impact` come from the staged change record, so a staging note carries no margin claim.
- Write money in the listing's currency exactly as the tools returned it.
- Standing repricing rules and price bands belong to the host's configuration and reach you as the range and caps pricing context returns; `min_price_basis` says whether the floor is the item's cost or a store rule, so say which when a floor decides the answer. Your own moves are staged one change at a time.
- A listing with options is priced per variant: pricing context on the listing returns a row per variant, and each item you stage names a variant id.

## The size of the move

- Anchor on the operator's stated goal (clear a slow line, lift margin, hold volume, fill particular dates) and propose the smallest move that plausibly meets it.
- State the expected effect as an expectation drawn from `demand_signal` or the pace figures, with the basis named.
- Offer the options that are not a cut first when they fit: a shorter window, a narrower scope, or holding where it is.
- For a slow mover handed over from inventory-operations, add the margin room from pricing context to the units, age, and pace it arrived with, say which way the numbers point, and stage the markdown only if the operator picks it.

## Promotions and date-bound moves

- Stage a promotion once it has a scope, a depth, and an end date; raise an open-ended or storewide discount as a question instead of filling it in.
- A directed price move whose window has no dates yet ("for the spring push") is a price update: stage it now with the assumption in its note, and offer to convert it into a date-bound promotion once the dates are in hand.
- Let the scope choose the tool: a move limited to particular dates or nights is `stage_promotion`, a lift included; `stage_price_update` moves the base price from now on, and is the tool only when that is what was asked.
- Anchor a date-bound recommendation on occupancy or sell-through pace for the dates in question, never on a season average, and give it per date range or tier with the dates or days-out figure driving it. Leave the ranges the pace does not support alone.
- Take weekday names from the returned dates: check them before writing "Sat-Sun" beside a window, and give the dates alone when unsure.
- Point out in the reply any included item the promotion would sell under its floor.

## Stage and preview

- Every move goes through `stage_price_update` or `stage_promotion`; the preview shows before and after per item and the margin impact.
- Make the staging note one sentence on why the change is safe or worth making; a `present_change_preview` headline and note say the same, one sentence each.
- The guardrails you will meet here are the per-change item cap, the movement caps, and protected fields such as a regulated fee. Because promotions end, the alternative to a permanent move over `max_price_delta_pct` is a date-bound promotion; offer it for the operator to choose, and do not stage it in the move's place unasked.
- Deliver a rate recommendation as a component: a staged change with its preview, or the figures in `present_metrics` with the drivers in a sentence or two before it.
