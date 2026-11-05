# 00 — Project Overview

## 1. The challenge (from C2B)
> Develop, using AI, a way to predict or recommend to students and companies attending C2B training programmes the
> next best learning pathways, taking into account historical learning paths for upskilling or reskilling each profile.

**Company:** Campus2Business (C2B), https://www.campus2b.com/. An expert training centre that develops, designs,
supports and trains companies to adopt digital and cultural transformation.

**Context:** a hackathon / internship-style challenge. We build a working, demo-ready MVP with a clean path to production.

## 2. The solution in one paragraph
A bilingual (EN/ES) web platform where **students** and **organization employees** build detailed learning profiles
(education, study history, skills, hobbies, goals, CV). **Organizations** register, are approved by C2B, and invite
their employees through a shareable link. Org admins can add **remarks** about each employee before submitting them to
C2B. The **Claude API** analyses each learner's profile, their organization's goals, their past C2B programmes, and the
historical pathways of similar learners against the **C2B programme catalogue**. It then drafts a ranked learning
pathway. A **C2B admin reviews, edits and approves** the draft, and it is published to the learner. Learners then
request enrollment, simulate payment, and track progress. Every completed programme feeds back into the history that
improves future recommendations.

## 3. Roles and capabilities

### C2B Admin (`c2b_admin`)
- Dashboard with platform stats (learners, orgs, pending reviews, enrollments, popular programmes).
- **Organizations:** view, approve, reject (with reason), suspend.
- **Programme catalogue:** full CRUD with bilingual title and description, cover image, intakes.
- **Custom programme fields:** define new fields (text, number, select and so on) that then appear on every programme form.
- **Learners:** view all student and employee profiles, including CVs and org remarks.
- **AI recommendations:** generate or regenerate. Review the draft, edit it (reorder, add or remove programmes, rewrite
  reasons), add a learner-visible note, add an internal note, then approve and publish or reject.
- **Enrollments:** approve or reject requests, update progress, mark complete, record a score.
- Realtime notifications.

### Organization Admin (`org_admin`)
- Registers the organization: name, logo, industry, size, location, departments, goals, objectives, skill gaps,
  contact person.
- Waits for C2B approval. Before approval, the dashboard shows an "Awaiting approval" state and invites are disabled.
- After approval, manages **invite links** (generate, set expiry, set seat limit, copy, disable, regenerate).
- Views employees and their profile completion.
- Adds **remarks** for each employee. Employees see them read-only.
- **Submits** employees to C2B (individually or in bulk) once their profile is complete.
- Sees employees' published recommendations and enrollment progress.
- **Org reports:** skill gaps by department, enrollment and completion rates, an optional AI org summary.

### Student (`student`)
- Self-registers with email/password or Google.
- Fills a multi-step profile wizard and uploads a CV (PDF).
- Submits the profile to C2B.
- Sees the published pathway, requests enrollment, simulates payment, tracks progress, rates programmes.

### Employee (`employee`)
- Joins only through `/join/:inviteToken`.
- Fills the same profile wizard as a student, plus employment fields (department, job title, experience).
- Sees **org remarks** read-only.
- Profile flow: complete → org admin reviews and adds remarks → org submits to C2B → AI → C2B review → published.
- Same pathway, enrollment and progress features as a student.

## 4. Feature list (MVP scope)
| # | Feature | MVP |
|---|---|---|
| 1 | Email/password + Google auth, 4 roles | ✅ |
| 2 | Organization registration + C2B approval | ✅ |
| 3 | Invite link with expiry + seat limit | ✅ |
| 4 | Multi-step learner profile + CV upload | ✅ |
| 5 | Org remarks on employees (read-only for employee) | ✅ |
| 6 | Programme catalogue + admin-defined custom fields | ✅ |
| 7 | Claude-powered pathway draft | ✅ |
| 8 | C2B review / edit / approve / publish | ✅ |
| 9 | Enrollment requests + simulated payment + progress | ✅ |
| 10 | Historical pathway signals fed into AI | ✅ |
| 11 | Realtime notifications (Socket.IO) | ✅ |
| 12 | English + Spanish UI and AI output | ✅ |
| 13 | Org reports (skill gaps, completion) | ✅ |
| 14 | AI org-level summary | ⭐ stretch |
| 15 | Real payments (M-Pesa / Stripe) | ❌ future |
| 16 | Email / SMS notifications | ❌ future |
| 17 | Mobile app | ❌ future |

## 5. Demo story (for the presentation)
1. A C2B admin logs in and adds 10–15 programmes (seed data provided). They add a custom field such as "Certification body".
2. A student registers, fills the profile, uploads a CV, and submits.
3. "Acme Bank" registers. C2B approves it. The org admin copies the invite link.
4. Two employees (ICT and Finance) join through the link and fill profiles. The org admin adds remarks and submits both.
5. The C2B admin generates AI drafts, edits one, approves, and publishes. Learners get a realtime notification.
6. A learner switches to Spanish. The UI and pathway explanations show in Spanish.
7. The learner requests enrollment, simulates payment, and the admin marks the programme complete.
8. Regenerating the pathway now shows the "next best" programme based on that completion history.
9. The org admin opens reports and sees skill gaps by department.
