// Copyright 2026 Anthropic PBC
// SPDX-License-Identifier: Apache-2.0
// commerce-agents-zh: the page body renders client-side so the bilingual layer's
// module-level copy evaluates under the language cookie before the first paint.

"use client";

import dynamic from "next/dynamic";

const StorefrontPage = dynamic(() => import("./PageImpl"), { ssr: false });

export default function Page() {
  return <StorefrontPage />;
}
