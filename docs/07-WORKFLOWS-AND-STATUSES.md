# 07 — Workflows and Statuses

Status changes happen **only** in services, through a transition map. An invalid transition throws
`INVALID_STATUS_TRANSITION`.

```js
// utils/transitions.js
export const assertTransition = (map, from, to) => {
  if (!map[from]?.includes(to)) throw new ApiError(409, 'INVALID_STATUS_TRANSITION', `${from} → ${to}`);
};
```

## 1. Organization
```
pending ──approve──▶ approved ──suspend──▶ suspended ──approve──▶ approved
   │                                         
   └──reject──▶ rejected ──edit & resubmit──▶ pending
```
```js
export const ORG = { pending: ['approved', 'rejected'], rejected: ['pending'], approved: ['suspended'], suspended: ['approved'] };
```

## 2. Learner profile
```
draft ──(completion ≥ 80%)──▶ complete ──submit──▶ submitted ──AI generated──▶ under_review ──publish──▶ pathway_published
  ▲                              │                                                                        │
  └────(drops below 80%)─────────┘                     learner edits profile after publish ───────────────┘──▶ complete
```
- **Student:** submits themselves (`complete → submitted`).
- **Employee:** cannot submit. Their **org admin** reviews, adds remarks, then submits (`complete → submitted`).
- Editing a `submitted` or `under_review` profile is **locked** (show a banner). Editing after `pathway_published`
  is allowed and moves the profile back to `complete` so it can be resubmitted for a new pathway.
- Generating a recommendation moves the profile to `under_review`. Publishing moves it to `pathway_published`.
  Rejecting the recommendation moves it back to `submitted`.

```js
export const PROFILE = {
  draft: ['complete'], complete: ['draft', 'submitted'], submitted: ['under_review'],
  under_review: ['submitted', 'pathway_published'], pathway_published: ['complete', 'under_review'],
};
```

## 3. Recommendation
```
generating ──ok──▶ pending_review ──approve──▶ approved ──publish──▶ published
     │                   │  ▲                     │
     └─error─▶ failed    │  └──── edit ───────────┘
                         └──reject──▶ rejected
```
- "Approve & Publish" in the UI does both transitions in one request.
- Publishing a new version leaves older published versions in history. The learner always sees the **latest published** one.
- Regenerating creates a **new** document with `version + 1`.

```js
export const RECOMMENDATION = {
  generating: ['pending_review', 'failed'], pending_review: ['approved', 'rejected'],
  approved: ['published', 'pending_review'], failed: [], rejected: [], published: [],
};
```

## 4. Enrollment (simulated payment, or real payment on campus2b.com — §4a)
```
requested ──approve──▶ approved ──(price > 0)──▶ payment_pending ──pay (simulated)──▶ active ──▶ completed
    │                     └──(price = 0 or employer pays)──────────────────────────▶ active ──▶ dropped
    └──reject──▶ rejected
```
- Payment is **simulated**: `PaymentSimulator` shows card / M-Pesa / employer invoice options and a fake
  processing delay (1.5 s), then calls `/enrollments/:id/pay`. A clear "Demo payment — no real money" banner is shown.
- `active` sets `startedAt`. `completed` sets `completedAt`, `progressPercent=100` and an optional `score`.

### 4a. Buying on campus2b.com (real payment, WooCommerce)
```
"Buy on campus2b.com" ──▶ payment_pending (payment.provider = 'shop') ──paid on campus2b.com──▶ active
                                │                                          (webhook, or admin "Mark as paid")
                                └── learner leaves the shop: "Continue to checkout" reopens the same checkout
```
- Offered when the programme is **paid** (`!subsidised && price.amount > 0`) **and** has a campus2b.com shop product
  (`Programme.shopProductId` or an intake's `shopProductId`). The DTO flag is `programme.shopCheckout`.
- The learner acts for themselves (students and employees). The pathway was already approved by C2B, so buying
  skips `requested → approved` and the enrollment is created directly in `payment_pending`.
- `POST /enrollments/checkout` returns `checkoutUrl` = `SHOP_CHECKOUT_URL?add-to-cart=<productId>&quantity=1`
  and the browser goes there (same tab).
- The WooCommerce webhook (`POST /api/webhooks/woocommerce`, topic *Order updated*) applies an order once it is
  `processing` or `completed`. It matches the **billing email** to a learner account and the **line product** to a
  programme, then activates the open enrollment (or creates an active one if they bought directly on the website).
  `payment.reference = C2B-WEB-<order number>`. Each order is applied once (`ShopOrder.processedAt`).
- Unmatched paid orders (other email) notify admins only when a platform learner is waiting to pay for that course.
  The admin uses **Mark as paid** (`payment_pending → active`). Refunds and cancellations notify admins; nothing changes automatically.
- Subsidised, free, or no-shop-product programmes and org-admin "enroll on behalf" keep the request → approval
  flow above, with the simulated payment.
- `completed` and `dropped` enrollments are what the AI uses as **learning history**.

```js
export const ENROLLMENT = {
  requested: ['approved', 'rejected'], approved: ['payment_pending', 'active'],
  payment_pending: ['active', 'dropped'], active: ['completed', 'dropped'], completed: [], rejected: [], dropped: [],
};
```

## 5. End-to-end flows

### Student
1. Register → wizard (6 steps, autosave each step) → upload CV.
2. Completion ≥ 80% → "Submit to C2B" → `submitted`.
3. Admin generates → reviews → publishes → realtime toast + bell notification.
4. Student sees pathway timeline → "Request enrollment" on step 1 → admin approves → simulated payment → active.
5. Admin updates progress → completed → student rates → admin can regenerate for the next best step.

### Employee
1. Org approved → org admin shares `/join/:token`.
2. Employee registers → wizard (employment step required; department pre-filled from the invite).
3. Org admin sees the employee at ≥ 80% → adds remarks → submits (single or bulk).
4. Same AI → review → publish loop. The org admin also gets notified and can see the pathway.
5. Enrollment can be requested by the employee **or** by the org admin on their behalf. The payment method defaults to `employer_invoice`.
