---
name: performance-insights
description: Explaining how the business is doing, meaning why a metric moved, which segment drove it, pace against a comparable, progress against goals the operator has stated, and questions over sales, traffic, conversion, and customers or this operation's equivalents that the snapshot alone does not answer. Not needed when the snapshot's headline figures and their change on the prior period answer the question, how a period went included.
description_zh: 解释业务状况：某个指标为何变动、哪个客群驱动了它、相对可比对象的节奏、对照运营既定目标的进度，以及快照单独答不上来的销售/流量/转化/顾客（或本运营对应项）问题。当快照的 headline 数字及其对上期的变动已能回答问题（含某周期表现如何）时不需要。
body_zh: |
  # 业绩洞察

  下文"客群"指本次运营报告的单位：一个品类、一个商品、一处物业、一个套餐，或一场活动。

  给运营一个可行动的要点、其背后的数字、以及它所依的对比，并说明读自哪里。

  ## 数字来自哪里

  - 从 `get_business_snapshot` 开始取所问周期：headline 数字、上期（`compare_to` 与变动百分比）、以及每个后续数字都对照读的预警计数。然后用 `query_metrics` 取单一指标随时间的变化，问题涉及部分运营时收窄到客群。
  - 毛利与库存取 `get_pricing_context` 与 `get_listing`，活动花费与收入取 `get_campaign_performance`；快照不携带这些。
  - 后端没有的序列（错误、空序列、与你问的不同名的指标）报告为不可用，并说明这留下了哪个问题 unanswered。
  - 把你从返回数据算出的数字（运转率、缺口、按当前速度的售罄日）连同其输入展示。
  - 返回序列里的最新日期就是数据覆盖的最新日期。跨越它的周期是局部的；与完整周期对比前先说明。

  ## 对比

  - 为问题选对比周期并点名：看这周怎样用上期，可能季节性的摆动用去年同周期，问题关于某改动时用改动前后。
  - 局部周期与基线的对应部分对比，或说明对比是局部对完整；给出两个结束日期。
  - 问题是相对可比对象的节奏（本次运行对同物上次运行，或周期同点的同业）时，把可比对象作为自己的 `query_metrics` 序列取回、点名，并说明为何可比。
  - 两个序列以不同名返回时，都按返回原样放进 `present_metrics`。只差周期时同名：最后查当前周期、展示它，并在文字里给可比对象的数字及其周期。任一方式都在周期同点给差距，而非两个总数。
  - 数据没有可比对象时（首次运行、首季），如实说，给出它自身的节奏，并提供数据持有的最近替代、标注为替代。不要用对类似案例的记忆拼出可比对象。

  ## 解释一次变动

  - 先说动了什么、动了多少、相对哪个基线；然后再调查。
  - 解释前先确认变动。局部周期、序列缺口、或不寻常的基线，能解释很多报告的下跌；当其中之一是原因，说明并停止。
  - 定位它：按客群查询，点名解释大部分变动的客群及其占比。
  - 把结构从水平分开。平均值下降，可能是单价降了，也可能是便宜的单位占了更大比例；说明返回序列显示的是哪一种，或说明在查客群前无法判断。
  - 把候选原因与同日期的工具数据对照：活动窗口取 `get_campaign_performance`，缺货或售罄取 `get_inventory_alerts` 或商品，价格动作取 `get_pending_changes` 或本对话应用的改动。
  - 只有当时机吻合、且变动落在它会影响的客群里时，才称其为原因；否则报告相关性，并点名能定论的读取。
  - 用与证据匹配的措辞给置信度：数据展示的就是"结论"，部分支持的是"线索"，什么都无的是"数据不可见"。

  ## 运营既定目标与规律

  - 本对话所述或存于 `recall_memories` 的目标，把摘要变成节奏报告：迄今数字、周期已过的占比、剩余周期必须的平均值，都由返回数字算出。不要补运营没说过的目标。
  - 在称某摆动异常前，回忆运营此前说过的季节规律，并说明它符合或不符合哪条。本流程中陈述的目标或规律用 `save_memory` 保存，以便后续摘要对照其节奏。

  ## 呈现答案

  - 以 `present_metrics` 收尾。每个推荐点名本对话工具返回的指标，用工具给它的名字与客群（`sales`、`sales:kids-room`、`conversion_rate`）。单日值、两序列之差、预测都不是推荐，属于文字。
  - 当 `present_metrics` 因无依据被拒，重新展示检索到的序列，把推荐更正为工具返回的名字。
  - 组件前给要点与基线（"销售额较上周降 12%，其中一整个品类占 9 个点"）、所用对比、以及改变读数的那条提醒。
  - 当变动追溯到某个运营动作，把最后一个选项做成移交该动作所属的流程。
---

# Performance insights

Below, "segment" means whatever unit this operation reports on: a category, a listing, a property, a plan, or an event.

Give the operator a takeaway they can act on, the figure behind it, and the comparison it rests on, and say which reads it came from.

## Where the figures come from

- Start with `get_business_snapshot` for the period asked about: the headline figures, the prior period (`compare_to` and the change percentages), and the alert counts that every later figure is read against. Then use `query_metrics` for one metric over time, narrowed to a segment when the question is about part of the operation.
- Take margin and stock from `get_pricing_context` and `get_listing`, and campaign spend and revenue from `get_campaign_performance`; the snapshot does not carry them.
- Report a series the backend does not hold (an error, an empty series, a different metric name than you asked for) as unavailable, and say which question that leaves open.
- Show a figure you work out from returned data (a run rate, a shortfall, a sell-out date at the current pace) with its inputs beside it.
- The latest date in a returned series is the latest date the data covers. A period that runs past it is partial; say so before comparing it with a complete one.

## The comparison

- Choose the comparison period for the question and name it: the prior period for how the week went, the same period last year for a swing that could be seasonal, before and after a change when the question is about that change.
- Compare a partial period with the matching part of the baseline, or say the comparison is partial against complete; give both end dates.
- When the question is pace against a comparable (this run against the last run of the same thing, or against its peers at the same point in the cycle), fetch the comparable as its own `query_metrics` series, name it, and say why it is comparable.
- When the two series came back under different names, put both in `present_metrics` as returned. When they differ only by period, they share a name: query the current period last, present it, and give the comparable's figures in the text with their period. Either way, state the gap at the same point in the cycle instead of the two totals.
- When the data holds no comparable (a first run, a first season), say so, give the pace on its own terms, and offer the nearest substitute the data holds, labeled as one. Do not build a comparable from memory of similar cases.

## Explaining a movement

- Say first what moved, by how much, and against which baseline; then investigate.
- Confirm the movement before explaining it. A partial period, a gap in the series, or an unusual baseline accounts for many reported drops; when one of those is the explanation, say so and stop.
- Locate it: query by segment and name the segment that accounts for most of the movement, with its share.
- Separate mix from level. An average falls when the unit price fell and also when cheaper units made up more of the total; say which one the returned series show, or say that you cannot tell until the segments are queried.
- Check candidate causes against tool data for the same dates: campaign windows from `get_campaign_performance`, stockouts or sell-outs from `get_inventory_alerts` or the listing, price moves from `get_pending_changes` or a change applied this conversation.
- Call something the cause only when its timing lines up and the movement sits in the segment it would affect; otherwise report a correlation and name the read that would settle it.
- Grade your confidence in words that match the evidence: a finding when the data shows it, a lead when it partly does, and "not visible in the data" when nothing does.

## Goals and patterns the operator has stated

- A target stated in this conversation or held in `recall_memories` turns a summary into a pace report: the figure so far, the share of the period elapsed, and what the rest of the period must average, computed from returned figures. Do not supply a target the operator has not stated.
- Recall the seasonal patterns the operator has stated before calling a swing unusual, and say which pattern it does or does not fit. Save a goal or pattern stated during this flow with `save_memory`, so later summaries can pace against it.

## Presenting the answer

- End with `present_metrics`. Each pick names a measure a tool returned this conversation, under the tool's name for it and with its segment (`sales`, `sales:kids-room`, `conversion_rate`). A single date's value, a difference between two series, and a projection are not picks; they belong in the text.
- When a `present_metrics` call is refused as ungrounded, present the retrieved series again with the picks corrected to names the tools returned.
- Before the component, give the takeaway with its baseline ("sales are down 12% on the prior week, and one category is 9 of those points"), the comparison used, and the one caveat that changes how to read the figures.
- When the movement traces to something operational, make the last chip the hand-off to the flow that acts on it.
