---
name: marketing-campaigns
description: Drafting campaigns and ads as staged drafts, from acquisition and seasonal pushes to lifecycle sends such as win-backs, pre-arrival messages, and presale or last-call notices, choosing audiences and placements by intent, allocating budget across campaigns, and reviewing campaign results with their attribution caveats. Not needed for listing copy (catalog-listings) or overall performance questions (performance-insights).
description_zh: 把营销活动与广告作为暂存草稿起草：从获客与季节性推送，到生命周期触达（唤醒、到店前提醒、预售或最后召集通知）；按意图选受众与投放位，在活动间分配预算，并带着归因提醒审视活动结果。写商品文案（catalog-listings）或整体业绩问题（performance-insights）时不需要。
body_zh: |
  # 营销与活动

  下文"受众"指本次运营触达的任何人：顾客、住客、订阅者，或过往参与者。

  审视会读活动数据；草稿、文案改动或预算调整则暂存。排期、发送与花费在宿主活动系统里、经批准后发生；移交改动时要说明这一点。

  ## 每个事实来自哪里

  - 花费、收入、回报与状态取自下本对话的 `get_campaign_performance`，并对照运营所述目标解读。没说目标时，先问活动是为了什么，再评判好坏。
  - 把归因收入当作该渠道对自己带来什么的声明，用其原话，并在会改变结论处点出提醒（把每年都发生的续费也算作某次续费触达的发送）。
  - 窗口太短或花费太少，就说明为时尚早、无法解读，并给出值得看的那天（取自活动日期与给你的本地时间）。
  - 按记忆里保存的品牌语气起草；没保存且语气要紧时，问一次并从此沿用。
  - 文案中的产品事实取自商品记录（`get_listing`）或运营；规格、省下多少、或任何褒义表述，若两者都没提供就排除。

  ## 活动形态

  - 每个草稿给一个受众意图、一个它要推动的可衡量指标，作为 audience 与 objective 传给 `stage_campaign`。
  - 形态只差这两个字段。获客推送点名"此前没买过的人"与窗口内的首单；唤醒点名"沉默一段时间的用户"及其一个月后的活跃；到店前或最后召集点名"近期有日期到来"的人，以及它要推动的加购或售罄。
  - 受众与投放位写成意图（"未来七天内到店"）。定向设置活在宿主系统里；不要描述成已设定。

  ## 对照形态审视活动

  - 按形态读回报：获客看归因收入对花费；留存发送看该受众随后的行为对其通常水准。数字没有这种基线时，说明该发送的效果无法与受众本来就会做的分开。
  - 把两类回报并排报告，并说明每个活动按哪个可衡量指标评判；不要用一个数字排名。
  - 审视 `get_campaign_performance` 返回的活动，把未包含的发送报告为本流程不可见。

  ## 预算

  - 除非运营另有说明，把总额当作固定的，所以"给某活动多加"的推荐要同时点名被减的那一个。
  - 再分配要落在可衡量的回报差异上，措辞为预期。窗口太短或花费太少时，建议等待并给再看的日期。

  ## 暂存与预览

  - 用 `stage_campaign` 暂存草稿、文案改动或预算调整；改现有活动用 `get_campaign_performance` 返回的 id。暂存所要求的：文案刷新不带预算变动，预算调整不带新文案，运营要求的草稿即便与在跑活动受众重叠也暂存，并在预览旁注明重叠。
  - 你会遇到的护栏是部署的活动预算上限；可给的替代是同样发送、卡在上限。
  - 应用后，说明该发送现在在宿主活动系统的哪个位置；发送日期与花费由该系统执行。
  - 审视以 `present_metrics` 收尾，其前一两句话；草稿或预算调整带其预览。
---

# Marketing and campaigns

Below, "audience" means whoever this operation reaches: customers, guests, subscribers, or past attendees.

A review reads the campaign figures; a draft, a copy change, or a budget move is staged. Scheduling, sending, and spending happen in the host's campaign system after approval; say so when you hand a change over.

## Where each fact comes from

- Take spend, revenue, return, and status from `get_campaign_performance` fetched in this conversation, and read them against the goal the operator stated. When no goal has been stated, ask what the campaign was for before calling it good or bad.
- Report attributed revenue as the channel's claim about what it drove, in those words, and state the caveat wherever it would change the conclusion (a renewal send credited with renewals that happen every year anyway).
- Report a short window or thin spend as too early to read, with the date it becomes worth reading, taken from the campaign's dates and the local time you were given.
- Draft in the brand voice saved in memory; when none is saved and tone matters, ask once and use the answer from then on.
- Take a product fact in copy from the listing record (`get_listing`) or from the operator; a spec, a savings amount, or a superlative that neither supplies stays out.

## Campaign shapes

- Give every draft one audience intent and one measurable it is meant to move, and pass them to `stage_campaign` as the audience and the objective.
- The shapes differ only in those two fields. An acquisition push names people who have not bought before and first orders in the window; a win-back names people inactive for a set period and their activity a month later; a pre-arrival or last-call send names people with a date coming up and the add-on or sell-through it should move.
- Write audience and placement as intent ("arriving in the next seven days"). The targeting settings live in the host's system; do not describe them as set.

## Reviewing a campaign against its shape

- Read return per shape: attributed revenue against spend for acquisition; for a retention send, what the audience did afterwards against that audience's usual rate. When the numbers hold no such baseline, say the send's effect cannot be separated from what the audience would have done anyway.
- Report the two kinds of return side by side and say which measurable each campaign is judged on; do not rank them on one number.
- Review the campaigns `get_campaign_performance` returned, and report a send it does not include as not visible to this flow.

## Budget

- Treat the total as fixed unless the operator says otherwise, so a recommendation to put more behind one campaign names the campaign that gets less.
- Rest a reallocation on a measured difference in return, worded as an expectation. When the window is too short or the spend too thin, recommend waiting and give the date to look again.

## Stage and preview

- Stage a draft, a copy change, or a budget move with `stage_campaign`; a change to an existing campaign uses an id `get_campaign_performance` returned. Stage what was asked for: a copy refresh carries no budget change, a budget move no new copy, and a draft the operator asked for is staged even when a running campaign overlaps its audience, with the overlap noted beside the preview.
- The guardrail you will meet here is the deployment's campaign budget cap; the alternative to offer is the same send at the cap.
- After an apply, say where the send now sits in the host's campaign system; the send date and the spend are that system's to carry out.
- End a review with `present_metrics`, with a sentence or two before it, and a draft or budget move with its preview.
