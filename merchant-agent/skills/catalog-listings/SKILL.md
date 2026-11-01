---
name: catalog-listings
description: Creating and improving listing content, covering titles, descriptions, attribute completeness, categorization fixes, image callouts written as text, edits written from material the operator supplies, and content-quality audits and bulk fixes across many listings. Not needed for questions about how a listing is performing.
description_zh: 创建与改进商品内容：标题、描述、属性完整度、分类修正、写成文字的图文要点、依据运营提供素材写的编辑，以及跨多个商品的内容质量审计与批量修复。问商品表现如何时不需要。
body_zh: |
  # 商品与目录

  下文"商品"指本次运营售卖的东西：一件产品、一个房型、一个套餐或设备，或一场活动档位。

  读记录，把薄弱或缺失的内容完整写出，暂存；只有运营批准后，在售商品才改动。

  ## 每个事实来自哪里

  - 提议编辑前先用 `get_listing` 拉记录。`search_listings` 的一行带摘要字段；编辑所依的属性、描述、评价片段都在记录里。
  - 用记忆里保存的品牌语气与命名规范写，不要请运营复述。
  - 属性值取记录或本对话运营所说。仅"对该类型很可能"或与旁边属性一致的值，是编造：留空或逐字段问，每行一个开放字段，其余修复不等而先行提议。
  - 评价片段是关于该商品的证据；一句好评仍是评价里的一句，不要变成描述里的断言。
  - 把运营粘贴的规格表或备注当作其所求编辑的素材：用运营自己的口吻把事实写进商品，并把它没覆盖的字段作为同一回复里的开放问题列出。

  ## 你提议的文案

  - 提议可直接批准不变的成品标题或描述：它是什么、给谁、记录显示有何亮点。只有在属性支撑时才下强断言（"睡六人"取自记录），去掉背后无物的褒义。
  - 用记录别处已有的值填补缺失属性；描述提到阳台，就供应阳台属性。
  - 搜索友好度看标题承载了哪些记录事实：把买家会输入的词（ occupancy、allowance、section、material、size）提到前面，去掉不带这些的填充词。
  - 图文要点写成对要加的图的说明、以及它该展示什么；不要仿佛照片已存在那样写商品。

  ## 审计与分类

  - 从 `search_listings` 空查询加质量过滤开始审计，再对候选 `get_listing`。对每个商品量同样的四项：缺失属性、太薄无法搜索的描述、记录矛盾的类别、以及该类型通常该有图却没图。
  - 按影响排序，让带缺失属性的忙商品排在标题别扭的冷商品前。给每条发现附修复，并按修复种类归组，让运营批准一种模式（"给这九个加 occupancy 属性"）而非逐个抱怨。
  - 分类修复像任何其他更新一样暂存，本回合完成：目标是本对话目录读取返回的类别，否则是请求暗示的名字，写进备注作为假设；预览显示改前改后的类别，运营在那里更正名字。

  ## 批量修复

  - 先在一两个商品上展示模式，运营确认后再暂存其余。
  - 在每改动商品数上限内分批暂存，并说明共有几批。价格与库存值属于定价与库存流程；受保护字段（如合规备注或税类别）是护栏会拦下的。
  - 批量改动包含运营要求的编辑；途中注意到的任何东西作为单独提案提供。

  ## 暂存与预览

  - 用 `stage_listing_update` 暂存每项编辑；预览带差异，暂存备注说明改动为何正确。
---

# Catalog and listings

Below, "listing" means whatever this operation sells: a product, a room type, a plan or device, or an event tier.

Read the record, write the weak or missing content out in full, and stage it; the live listing changes only after the operator approves.

## Where each fact comes from

- Fetch the record with `get_listing` before proposing an edit. A `search_listings` row carries the summary fields; the attributes, description, and review snippets an edit rests on are in the record.
- Write in the brand voice and naming conventions saved in memory, without asking the operator to restate them.
- Take an attribute value from the record or from what the operator said in this conversation. A value that is merely likely for the type, or consistent with the attributes beside it, is a fabrication: leave the field blank or ask, one line per open field, and propose the rest of the fix without waiting.
- Review snippets are evidence about the item; a line of review praise stays a review line and does not become a claim in the description.
- Treat a spec sheet or note the operator pastes as source material for the edit they asked for: put its facts into the listing in the operator's voice, and list the fields it does not cover as open questions in the same reply.

## The copy you propose

- Propose the finished title or description, approvable unchanged: what the item is, who it is for, and what the record shows is notable. Make a strong claim only where an attribute backs it ("sleeps six" from the record) and leave out a superlative with nothing behind it.
- Fill a missing attribute from a value that is already elsewhere in the record; a description that mentions a balcony supplies the balcony attribute.
- Search-friendliness is which record facts the title carries: bring forward the words a buyer would type (occupancy, allowance, section, material, size) and drop filler that carries none of them.
- Write an image callout as a description of the shot to add and what it should show; do not write the listing as though the photo exists.

## Audits and categorization

- Start an audit from `search_listings` with an empty query and the quality filter, then `get_listing` on the candidates. Measure the same four things on every listing: missing attributes, descriptions too thin to search on, a category the record contradicts, and no image where the type usually has one.
- Rank findings by impact, so a busy listing with missing attributes comes before a quiet one with a clumsy title. Attach a fix to each finding and group the findings by kind of fix, so the operator approves a pattern ("add the occupancy attribute on these nine") instead of working through complaints one at a time.
- Stage a categorization fix as a listing update like any other, this turn: the destination is a category a catalog read this conversation returned, or else the name the request implies, written into the note as the assumption; the preview shows the category before and after, and is where the operator corrects the name.

## Bulk fixes

- Show the pattern on one or two listings first and stage the rest after the operator confirms it.
- Stage in batches within the per-change item cap and say how many batches there are. Price and stock values belong to the pricing and inventory flows; a protected field such as a compliance note or a tax category is one the guardrail will hold back.
- A bulk change contains the edits the operator asked for; offer anything you notice on the way through as a separate proposal.

## Stage and preview

- Stage each edit with `stage_listing_update`; the preview carries the diff, and the staging note says why the change is right.
