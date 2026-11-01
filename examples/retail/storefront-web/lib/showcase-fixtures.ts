// Copyright 2026 Anthropic PBC
// SPDX-License-Identifier: Apache-2.0

/** Products are records from examples/retail/data/catalog.json. */

import { t } from "web-shared";
import type {
  CartPayload,
  CheckoutPayload,
  ComparisonPayload,
  GuidePayload,
  OrderStatusPayload,
  PlanPayload,
  Product,
  ProductsPayload,
} from "./types";

const BLOCK_SET: Product = {
  product_id: "AR-1401",
  title: t("ACME Playroom Stacking Wooden Block Set (54 pc)", "ACME Playroom 叠搭木积木套装（54块）"),
  brand: "ACME Playroom",
  price: 34.0,
  rating: 4.8,
  review_count: 2940,
  image_url: "/products/AR-1401.webp",
  category: "toys-games",
  labels: [t("bestseller", "热销")],
  attributes: {
    pieces: t("54 blocks + 12 idea cards", "54块积木+12张创意卡"),
    age_range: t("4-10 years", "4-10岁"),
    material: t("beechwood, water-based paint", "榉木，水性漆"),
    storage: t("cotton carry sack", "棉质收纳袋"),
  },
  in_stock: true,
};

const PUZZLE: Product = {
  product_id: "AR-2104",
  title: t("ACME Makers 300-Piece Meadow Puzzle", "ACME Makers 草甸主题拼图 300片"),
  brand: "ACME Makers",
  price: 27.0,
  rating: 4.4,
  review_count: 1530,
  image_url: "/products/AR-2104.webp",
  category: "kids-room",
  attributes: {
    pieces: t("300", "300片"),
    finished_size: t("18 x 24 in", "18×24英寸"),
    art: t("original meadow illustration", "原创草甸插画"),
    age_range: t("8+", "8岁以上"),
  },
  in_stock: true,
};

const POSTER_SET: Product = {
  product_id: "AR-2108",
  title: t("ACME Playroom Solar System Poster Set (4 pc)", "ACME Playroom 太阳系主题海报套装（4张）"),
  brand: "ACME Playroom",
  price: 18.0,
  rating: 4.6,
  review_count: 980,
  image_url: "/products/AR-2108.webp",
  category: "kids-room",
  attributes: {
    count: t("4 posters", "4张海报"),
    size: t("16 x 20 in", "16×20英寸"),
    finish: t("matte, glare-free", "哑光，不反光"),
    theme: t("space", "太空"),
  },
  in_stock: true,
};

const WALL_DECALS: Product = {
  product_id: "AR-2102",
  title: t("ACME Kids Peel-and-Stick Ocean Wall Decals (36 pc)", "ACME Kids 海洋主题可移除墙面贴纸（36张）"),
  brand: "ACME Kids",
  price: 24.0,
  rating: 4.6,
  review_count: 2440,
  category: "kids-room",
  attributes: {
    count: t("36 decals", "36张贴纸"),
    removable: "yes",
    largest: t("24 in whale", "24英寸鲸鱼"),
    theme: t("ocean", "海洋"),
    // Same count as merchant_inventory.json shows in the portal.
    low_stock: "3",
  },
  in_stock: true,
};

const STORYBOOK_BEAR: Product = {
  product_id: "AR-2105",
  title: t("ACME Playroom Storybook Bear (14 in)", "ACME Playroom 绘本风泰迪熊（14英寸）"),
  brand: "ACME Playroom",
  price: 32.0,
  rating: 4.8,
  review_count: 2110,
  category: "kids-room",
  labels: [t("bestseller", "热销")],
  attributes: { size: t("14 in", "14英寸"), material: t("plush, embroidered eyes", "毛绒，刺绣眼睛"), washable: t("machine wash, gentle", "可机洗（轻柔模式）"), age_range: t("3+", "3岁以上") },
  in_stock: true,
};

const STORAGE_BINS: Product = {
  product_id: "AR-2106",
  title: t("ACME Kids Toy Storage Bins (Set of 3)", "ACME Kids 玩具收纳箱（3件装）"),
  brand: "ACME Kids",
  price: 29.0,
  rating: 4.5,
  review_count: 720,
  category: "kids-room",
  attributes: {
    count: t("3 bins", "3个"),
    collapsible: "yes",
    labels: t("beachcombing icons", "赶海主题图标"),
    theme: t("ocean", "海洋"),
  },
  in_stock: true,
};

const products: ProductsPayload = {
  title: t("Gifts for a 9-Year-Old Builder (~$45)", "送给 9 岁小建造者的礼物（约 $45）"),
  layout: "carousel",
  items: [
    {
      product: BLOCK_SET,
      reason: t("Bestseller with idea cards that turn a pile into bridges and towns.", "畅销款，配创意卡，一堆积木秒变桥梁和小镇。"),
    },
    {
      product: PUZZLE,
      reason: t("An afternoon at the table with a frame-worthy finish.", "一个下午的桌面专注，拼完还值得装裱起来。"),
    },
    {
      product: POSTER_SET,
      reason: t("Reference-wall decor that answers her questions.", "科普墙装饰，随手解答她的问题。"),
    },
    {
      product: STORYBOOK_BEAR,
      reason: t("The soft option — the bear that ends up in every photo.", "柔软选项——最后每张照片里都有这只熊。"),
    },
  ],
};

const comparison: ComparisonPayload = {
  title: t("Block Set vs. Puzzle for a 9-Year-Old", "积木 vs 拼图：9 岁孩子选哪个"),
  entries: [
    {
      product_id: "AR-1401",
      product: BLOCK_SET,
      best_for: t("Active, hands-on building and a kid who rebuilds bigger every time", "爱动手、每次都要搭得更大的孩子"),
      pros: [
        t("Solid beechwood — no small parts to snap, survives being stepped on", "榉木实木——没有易断的小零件，踩一脚也没事"),
        t("Water-based paint holds up through a year of rough play (per reviews)", "水性漆经得起一年折腾（买家评价）"),
        t("Idea cards add structure without turning play into homework", "创意卡给了玩法方向，又不会把玩变成作业"),
      ],
      cons: [t("54 pieces to keep track of", "54 块积木需要收拾"), t("Carry sack fills fast during cleanup races", "收拾比赛时收纳袋很快就装满了")],
    },
    {
      product_id: "AR-2104",
      product: PUZZLE,
      best_for: t("Quiet-table focus and a kid who loves finishing things", "喜欢安静专注、有始有终的孩子"),
      pros: [
        t("300 pieces sits right at the 8+ sweet spot", "300 块正合 8 岁以上的甜点位"),
        t("Original meadow art — frame-worthy once finished", "原创草原插画——拼完值得装裱"),
        t("The calm-afternoon gift parents thank you for", "换来一个安静下午，家长会感谢你的礼物"),
      ],
      cons: [
        t("Cardboard — less durable than solid wood if bent", "纸板材质——折弯的话不如实木耐用"),
        t("Mostly a one-builder activity at the table", "基本是桌面的单人活动"),
      ],
    },
  ],
  dimensions: [t("Sturdiness", "耐用性"), t("Age appropriateness (9)", "适龄度（9 岁）"), t("Play engagement", "玩乐投入度"), t("Price", "价格")],
  recommended_product_id: "AR-1401",
};

const plan: PlanPayload = {
  title: t("Kids' Room Refresh", "儿童房焕新"),
  intro: t("Three coordinated steps that turn the spare wall into the fun wall.", "三步搭配，把空墙变成最好玩的墙。"),
  steps: [
    { label: t("The centerpiece", "主视觉"), detail: t("One hero piece the room hangs off", "一件撑起整面墙的主角"), products: [WALL_DECALS] },
    { label: t("The soft layer", "柔软层"), detail: t("Something to hug during story time", "故事时间可以抱着的"), products: [STORYBOOK_BEAR] },
    { label: t("The cleanup game", "收纳游戏"), detail: t("Bins that make sorting part of play", "让分类变成游戏一部分的收纳筐"), products: [STORAGE_BINS] },
    {
      label: t("Already covered: the reading nook", "已就绪：阅读角"),
      detail: t("Your beanbag fits the corner as-is — nothing to buy.", "你的豆袋沙发刚好放进墙角——不用额外购买。"),
      products: [],
    },
  ],
};

const guide: GuidePayload = {
  title: t("Keeping plush toys clean", "毛绒玩具怎么清洁"),
  sections: [
    {
      heading: t("Machine washing", "机洗"),
      body: t(
        "Plush with embroidered eyes and sewn seams can go through a gentle cold cycle in a pillowcase. Air-dry fully before it goes back to bed duty.",
        "带刺绣眼睛和缝线的毛绒玩具可以装进枕套，用冷水轻柔模式机洗。彻底晾干后再回到床上值班。",
      ),
    },
    {
      heading: t("Between washes", "日常打理"),
      body: t(
        "A lint roller and ten minutes in the sun handle most weeks. Spot-clean spills right away so they don't set into the pile.",
        "粘毛滚筒加十分钟日晒就能应付大部分日常。污渍要马上点洗，免得渗进绒毛里。",
      ),
    },
  ],
  related_products: [STORYBOOK_BEAR],
};

const order_status: OrderStatusPayload = {
  order_id: "AR-77903",
  summary: t(
    "The ACME Paws Orthopedic Dog Bed was placed June 10 and is marked delayed — the delivery estimate was revised to June 27 after the original June 21 date was missed.",
    "ACME Paws 骨科记忆棉狗窝于 6 月 10 日下单，目前标记为延迟——原定 6 月 21 日送达未能兑现，预计送达已改为 6 月 27 日。",
  ),
  next_step: t(
    "Track the package for the latest carrier update, or ask me about your options.",
    "可以追踪包裹获取快递最新动态，也可以问我你还有哪些选择。",
  ),
  order: {
    order_id: "AR-77903",
    status: "delayed",
    placed_at: "2026-06-10",
    items: [
      {
        product_id: "AR-1501",
        title: t("ACME Paws Orthopedic Memory Foam Dog Bed, Large", "ACME Paws 大号骨科记忆棉狗窝"),
        quantity: 1,
        price: 79.0,
      },
    ],
    total: 79.0,
    currency: "USD",
    // Same shape as the orders fixture: current estimate first, missed original in the note.
    estimated_delivery: t(
      "2026-06-27 (updated after a carrier delay; the original 2026-06-21 estimate was missed)",
      "2026-06-27 （快递延误后更新；原预计 2026-06-21 未能送达）",
    ),
    tracking_url: "https://track.example.com/AR-77903",
  },
};

const checkout: CheckoutPayload = {
  note: t("Both gifts are in stock and ship together.", "两件礼物均有现货，会一起发货。"),
  fulfillment_method: "delivery",
  cart: {
    items: [
      {
        product_id: "AR-1401",
        title: t("ACME Playroom Stacking Wooden Block Set (54 pc)", "ACME Playroom 叠搭木积木套装（54块）"),
        price: 34.0,
        quantity: 1,
        image_url: "/products/AR-1401.webp",
        line_total: 34.0,
      },
      {
        product_id: "AR-2104",
        title: t("ACME Makers 300-Piece Meadow Puzzle", "ACME Makers 草甸主题拼图 300片"),
        price: 27.0,
        quantity: 1,
        image_url: "/products/AR-2104.webp",
        line_total: 27.0,
      },
    ],
    item_count: 2,
    subtotal: 61.0,
    currency: "USD",
  },
};

export const SHOWCASE = { products, comparison, plan, guide, order_status, checkout };

/** Just under the free-shipping threshold. */
export const SHOWCASE_CART: CartPayload = {
  items: [
    {
      product_id: "AR-1401",
      title: t("ACME Playroom Stacking Wooden Block Set (54 pc)", "ACME Playroom 叠搭木积木套装（54块）"),
      price: 34.0,
      quantity: 1,
      image_url: "/products/AR-1401.webp",
      line_total: 34.0,
    },
    {
      product_id: "AR-2003",
      title: t("ACME Pantry Weeknight Stir-Fry Dinner Kit", "ACME Pantry 工作日炒面晚餐套装"),
      price: 12.0,
      quantity: 1,
      line_total: 12.0,
    },
  ],
  item_count: 2,
  subtotal: 46.0,
  currency: "USD",
};
