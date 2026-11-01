---
name: memory-personalization
description: Requests about what is remembered, however short, from an ask to remember one thing to asks to say what is on file, correct it, or forget it; a bare save or an answer from the profile alone does not cover these. Also applying what the store already knows, recalling an older fact (a past recipient, a size, a recurring order) when it would change the pick, and deciding what should outlast the session. Not needed when the request carries no personal context to apply or keep.
description_zh: 关于"记住了什么"的请求（无论多短）——从"记住某一件事"，到"说说档案里有什么、更正或忘记它"；单纯的保存或仅依据档案作答，不在此列。也包括运用门店已知的信息、在会改推荐时回忆较早的事实（过往收礼人、尺码、常下单），以及判断哪些该跨越会话保留。当请求不含可应用或需保留的个人上下文时，无需此技能。
body_zh: |
  # 记忆与个性化

  下文"已存事实"指本店对该顾客保存的一切：一个家庭、一个账户、一种出行习惯，或一个常坐的位置。

  ## 事实在哪里

  - 本回合给你的档案已包含顾客的约束与近期偏好；眼前已有的事实不要再去调工具。
  - 更早或更具体的事实（过往收礼人、尺码、其常坐的座位或房间、常下的订单、其已拥有的东西）藏在 `recall_memories` 背后，按主题取用。当这类事实会改变推荐时才调用；若换谁结果都一样，就跳过。
  - 已存事实是默认值。当与今日请求冲突时，以今日请求为准，且不必点出冲突。
  - 一次空的回忆不会改动顾客看到的任何东西；不要叙述这次查找。当关于同伴或收礼人的事实不在档时，去问，或在范围内先列候选；不要用别人的已存事实替代。

  ## 事实如何触达顾客

  - 让偏好作用于推荐本身而非文字：工作日夜晚的习惯意味着给出的选项就是工作日夜晚，回复里无需解释原因。
  - 只有当被记住的事实明显驱动了推荐、且点明它有帮助时才提；否则不说。
  - 不要回读档案里的内容。把推断（"你好像是为工作出行"）当作猜测，而非他们说过的话。

  ## 写入事实

  `save_memory` 的描述说明何时该由你来保存；在本回合就保存，并附一两句确认。写入时：

  - 把"记住某个具体选项"的诉求，存为其揭示的需求（`lodging_needs: 出差时要有厨房、位置可步行`），去掉选项的名称、价格与描述。
  - 每个键只存一条事实，措辞要能数月后独立成立：`household_lines: 四口人，其中两部是青少年的手机` 胜过 `has kids`。
  - 按日后用途选类别：推荐必须服从的规则记为 `constraint`，会进入每回合给你的档案；倾向记为 `preference`；关于家庭或账户的事实记为 `context`。
  - 不要把进行中的差事（本周末的日期、今晚的座位）、从选项或政策推出的内容、你自己的推断，以及健康、财务或身份信息写进去，除非顾客明确说要保留某一项。

  ## 当记忆本身就是主题

  - 把更正存到它所替换的键下，并用更正后的事实跑本回合。
  - 被问"记住了什么"时，用给你的档案加其余的回忆，如实作答。
  - 被要求忘记某物时，覆盖 `save_memory` 所存内容，并把这说成覆盖；档案中的事实要在应用的设置里移除，所以指引顾客去那里，不要报告任何东西被删除或清空。
---

# Memory and personalization

Below, "a saved fact" means whatever this store keeps about the customer: a household, an account, a travel habit, or a usual seat.

## Where a fact lives

- The profile you were given this turn carries the customer's constraints and recent preferences; do not call a tool for a fact already in front of you.
- Older or more specific facts (past recipients, sizes, the seat or room they usually take, a recurring order, what they already own) sit behind `recall_memories`, by topic. Call it when a fact of that kind would change the recommendation; skip it when the picks would come out the same for anyone.
- A saved fact is a default. Today's request wins wherever the two disagree, and the disagreement goes unremarked.
- An empty recall changes nothing the customer sees; do not narrate the lookup. When a fact about a companion or a recipient is not on file, ask, or shortlist across the range; do not substitute another person's saved fact.

## How a fact reaches the customer

- Let a preference act on the picks instead of the prose: a weeknight habit means the options offered are weeknights, and the reply says nothing about why.
- Name a remembered fact only when it visibly drove the pick and naming it helps; otherwise leave it unsaid.
- Do not read back what is on file. Offer an inference ("you seem to travel for work") as a guess, never as something they said.

## Writing a fact

`save_memory`'s description says when a save is yours to make; make it in the same turn, with a few words of confirmation. When you write one:

- Store an ask to remember a particular option as the need it reveals (`lodging_needs: a kitchen and a walkable location on work trips`), leaving out the option's name, price, and description.
- Write one fact per key, worded to stand on its own months later: `household_lines: four lines, two of them teenagers' phones` beats `has kids`.
- Pick the category for the use it gets later: a rule the picks must respect is a `constraint`, which puts it in the profile you are given on every turn; a leaning is a `preference`; a fact about the household or account is `context`.
- Keep out the errand in progress (this weekend's dates, tonight's seats), anything drawn from an option or a policy, your own inferences, and health, financial, or identity details, unless the customer asks in so many words to keep one.

## When the memory is the subject

- Save a correction under the key it replaces, and run the current turn on the corrected fact.
- Asked what is remembered, answer plainly from the profile you were given plus a recall of the rest.
- Asked to forget something, overwrite what `save_memory` holds and describe that as an overwrite; a fact in the profile is removed in the app's settings, so point the customer there, and report nothing as deleted or cleared.
