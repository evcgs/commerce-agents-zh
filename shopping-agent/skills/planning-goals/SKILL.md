---
name: planning-goals
description: Planning a coordinated set of items toward a goal, an event, a trip, or a project, where the request only comes together as several purchases with a structure between them, and later changes to a plan you have presented. Not needed when the customer wants a single item, however carefully chosen.
description_zh: 为某个目标、活动、出行或项目规划一组协调的商品——请求只有化为"几次相互有结构的购买"时才成立；也包括对你已展示过的计划做后续改动。当顾客只想要单件物品（无论多精心挑选）时不需要。
body_zh: |
  # 朝目标规划

  下文"商品"指本目录售卖的任意东西：一件产品、一晚住宿、一行，或一个座位。

  交还一份顾客一眼能览、能改其中一块、并在选择时落地执行的计划。先定步骤，再把商品挂上去。

  ## 搭框架

  - 五个事实塑造计划：目标、涉及谁、在哪发生、何时必须就绪、预算。取请求与已给档案提供的；对缺失项用明确的整数假设搭建（"按两人算""未给预算，故取中档"），让顾客一句话就能纠正。
  - 沿顾客会推进的线索把目标切成三到八步（按天、按人、按房间、按阶段），用顾客的话给每步命名。
  - 给定了预算时，按整数分摊到各步并展示分摊，把较大份额放在承载目标的步骤上。
  - 一旦请求点名了目标，就在同一回合搭框架并填充：跑搜索、按天/人/时段各提一步并挂上商品，让目录的缺口与替代完成提问的工作。某步内的选择（某商品要几个、是否真要这步）是写在该步上的假设，而不是扣留商品的理由。
  - 只在步骤本身存疑时才先发步骤：顾客问从哪开始，或目标横跨不止一条线索。那回合的 `present_plan` 只带标签与分摊、不带商品（唯一一次不带产品发出），旁边附最能改变轮廓的那个问题及其可能的答案作为选项；商品下回合再来。问题不能脱离计划发出。

  ## 填充

  - 给每步自己的搜索，全部同一轮发出。
  - 按框架事实定数量，并把你据此定的数字写进计划。
  - 顾客已覆盖的步骤标为已覆盖；不搜索、也没东西可买。
  - 每步挂一个推荐。只有在两种选法对顾客都有代价时（比如价格对耐久），才加第二个选项。
  - 只有当本对话中某次搜索返回了该步的商品，才把该步算作已覆盖。空结果与既定约束规则逐步骤适用：某步份额内唯一匹配超出预算，就标在该步上"超预算"；只有重试后仍无果，该步才算缺口。
  - 不要围绕缺货商品做计划：给该步在售选项，或在其他步骤推进时注明该商品缺货。

  ## 展示

  - 用 `present_plan`：每步一个短标签、一行细节、以及该步的商品（上面框架回合无商品），有选择时把你推荐的放最前。其前文字控制在一两句。
  - 当顾客要的是方法而非商品（先后顺序、该期待什么），发 `present_guide`，凡用到网络素材都列出来源。
  - 当部署注册了为这种计划形态打造的展示工具时，在相同规则下替代 `present_plan` 使用。

  ## 改动

  - 改某一步只动那一步；计划其余部分（含顾客早先的编辑）保持原样。改动后重新展示计划。
  - 一旦顾客说加购、购买或结算，就把ta点名的那组（某步、某商品或整份计划）放进去，并用一行说明进了什么。
---

# Planning toward a goal

Below, "item" means whatever this catalog sells: a product, a night, a line, or a seat.

Hand back a plan the customer can take in at a glance, change one piece of, and act on when they choose. Settle the steps first, then attach the items to them.

## Frame it

- Five facts shape a plan: the goal, who it involves, where it happens, when it must be ready, and the budget. Take the ones the request and the profile you were given supply. Build on a stated round-number assumption for each missing one ("sized for two", "no budget given, so mid-range picks") so the customer can correct it in a word.
- Cut the goal into three to eight steps along the lines the customer will work in (a day, a person, a room, a phase) and label each step in their words.
- When a budget is stated, split it across the steps in round numbers and show the split, with the larger shares on the steps that carry the goal.
- Frame and fill in the same turn once the request names the goal: run the searches, propose one step per day, person, or slot with items attached, and let the catalog's gaps and substitutions do a question's work. A choice inside a step (how many of one item, whether a step is wanted at all) is an assumption written on that step, not a reason to hold the items back.
- Send the steps first only when the steps themselves are in doubt: the customer asks where to start, or the goal cuts along more than one line. That turn's `present_plan` carries labels and the split and no items (the one turn it goes out without products), with the one question that would most change the outline beside it and the likely answers as chips; the items come next turn. The question does not go out without the plan.

## Fill it

- Give each step its own search and send them all in one round.
- Size quantities from the framing facts and write the number you sized for into the plan.
- Mark a step the customer already has covered as covered; give it no search and nothing to buy.
- Attach one pick per step. Add a second option only where the choice costs the customer something either way (price against durability, say).
- Count a step as covered only once a search in this conversation returned its item. The empty-result and stated-constraint rules apply per step: a sole match over the step's share stays on the step marked over budget, and a step is a gap only after the retry.
- Plan nothing around an out-of-stock item: give the step the in-stock option, or note that the item is unavailable while the other steps go ahead.

## Show it

- Use `present_plan`: a short label per step, one line of detail, and that step's items (none on the framing turn above), with your pick first where there is a choice. Keep the prose before it to a sentence or two.
- When the customer needs know-how instead of items (what order to do things in, what to expect), send `present_guide`, with sources listed whenever web content fed it.
- When the deployment registers a presentation tool built for this plan's shape, use it in place of `present_plan` under the same rules.

## Change it

- A change to one step touches that step only; the rest of the plan, the customer's earlier edits included, stays as it was. Re-present the plan after the change.
- Once the customer says add, buy, or check out, put in the set they named (a step, an item, or the whole plan) and say in one line what went in.
