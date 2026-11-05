# 13 — Images and Assets

Save everything in `client/src/assets/images/` (imported in components so Vite optimises them), except the favicon and
social image, which go in `client/public/`.

## 1. Where to download (free for commercial use)
| Source | Use for | Notes |
|---|---|---|
| **unsplash.com** | Photos | Free licence, no attribution required (credit appreciated) |
| **pexels.com** | Photos | Free licence |
| **undraw.co** | Flat illustrations | **Set the colour to `#055F46` before downloading**. Flat style, no gradients, SVG |
| **lucide.dev** | Icons | Already installed as `lucide-react`; no download needed |

**Photo selection rules:** warm, natural light that suits the cream background; real people learning and working;
diverse in age, gender and background (students and working professionals); no heavy colour
filters; **no images that contain gradients or neon overlays**; landscape 1600–2000px wide for heroes.

## 2. Photo list
| File name | Where it is used | Search terms (Unsplash / Pexels) | Size |
|---|---|---|---|
| `hero-learning.jpg` | Landing hero | "diverse students laptop collaboration", "young professionals learning workshop" | 1600×1200 |
| `students-campus.jpg` | "For students" card | "university students studying together", "students campus laptop" | 1200×900 |
| `organization-team.jpg` | "For organizations" card | "corporate training team meeting", "office team workshop whiteboard" | 1200×900 |
| `employee-upskilling.jpg` | Org registration page side image | "employee online training laptop office" | 1200×1600 (portrait) |
| `mentor-session.jpg` | How it works / step 2 (C2B experts) | "mentor coaching young professional", "career advisor meeting" | 1200×900 |
| `digital-transformation.jpg` | Programme category fallback + landing section | "digital transformation business technology", "team analytics dashboard screen" | 1200×800 |
| `login-side.jpg` | Login page right panel | "woman studying laptop cafe warm light" | 1200×1600 (portrait) |
| `register-side.jpg` | Register page right panel | "graduate student smiling laptop" | 1200×1600 (portrait) |
| `join-invite.jpg` | Employee join page | "new employee welcome office team" | 1200×1600 (portrait) |
| `cta-band.jpg` (optional) | CTA band background with a solid 60% emerald overlay | "people celebrating success office" | 1920×800 |

### Programme category covers (fallback when a programme has no uploaded cover)
| File name | Search terms |
|---|---|
| `cat-digital-transformation.jpg` | "business digital transformation meeting" |
| `cat-data-ai.jpg` | "data analytics charts laptop" |
| `cat-cloud.jpg` | "server room cloud computing" |
| `cat-cybersecurity.jpg` | "cyber security laptop lock" |
| `cat-agile-pm.jpg` | "agile team sticky notes kanban board" |
| `cat-leadership.jpg` | "leadership team meeting presentation" |
| `cat-finance.jpg` | "finance professional analyzing reports" |
| `cat-hr.jpg` | "human resources interview office" |
| `cat-marketing.jpg` | "digital marketing team planning" |
| `cat-soft-skills.jpg` | "team communication workshop discussion" |

Compress all photos to **WebP**, quality ~75, with squoosh.app before saving (save as `.webp`; the file names above stay
the same apart from the extension). Target: < 250 KB per hero, < 120 KB per card.

## 3. Illustrations (undraw.co, colour set to `#055F46`, download as SVG)
| File name | undraw search term | Used in |
|---|---|---|
| `il-empty-pathway.svg` | "road to knowledge" / "path" | My Pathway empty state |
| `il-awaiting-approval.svg` | "waiting" / "time management" | Org pending approval state |
| `il-profile.svg` | "profile details" / "personal info" | Profile wizard intro |
| `il-review.svg` | "reviewed docs" / "checklist" | Admin queue empty state |
| `il-invite.svg` | "invite" / "join" | Invite links empty state |
| `il-no-results.svg` | "no data" / "searching" | Empty search results |
| `il-success.svg` | "completed" / "celebration" | Submission success, completed course |
| `il-ai.svg` | "artificial intelligence" / "machine learning" | Landing "How it works" step 2 |
| `il-not-found.svg` | "page not found" | 404 page |
| `il-error.svg` | "server down" / "bug fixing" | Error boundary |

## 4. Brand assets (make these yourself)
| File | How |
|---|---|
| `logo-c2b.svg` | Use C2B's official logo if they share it with you. Otherwise make a simple wordmark "C2B" in Plus Jakarta Sans ExtraBold, emerald `#055F46`, with "Learning Pathways" in ink |
| `logo-c2b-white.svg` | Same, white, for the emerald sidebar and footer |
| `public/favicon.svg` | Emerald rounded square with "C2B" or "C" in cream |
| `public/og-image.jpg` | 1200×630, solid cream background, logo + headline in emerald (for link previews) |

## 5. Final folder
```
client/
├── public/
│   ├── favicon.svg
│   └── og-image.jpg
└── src/assets/images/
    ├── brand/        logo-c2b.svg, logo-c2b-white.svg
    ├── photos/       hero-learning.webp, students-campus.webp, organization-team.webp, employee-upskilling.webp,
    │                 mentor-session.webp, digital-transformation.webp, login-side.webp, register-side.webp,
    │                 join-invite.webp, cta-band.webp
    ├── categories/   cat-*.webp (10 files)
    └── illustrations/ il-*.svg (10 files)
```

## 6. Usage rules
- Every `<img>` needs translated `alt` text (`t('images.heroAlt')`). Decorative illustrations use `alt=""`.
- Use `loading="lazy"` except the hero.
- Never put text directly on a busy photo. Use a solid emerald overlay (`bg-emerald/60`) or place the text beside the image.
- **No gradient overlays on photos**, ever.
