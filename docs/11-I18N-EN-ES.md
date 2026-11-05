# 11 — Internationalization (English + Spanish)

## 1. Three layers of language
| Layer | How |
|---|---|
| **UI text** (buttons, labels, errors) | `react-i18next` JSON files in `client/src/i18n/locales/{en,es}/` |
| **Admin-entered content** (programmes, custom field labels, notes to learner) | Stored as `{ en, es }` objects. The admin form has EN/ES tabs |
| **AI output** (pathway summary, reasons, outcomes) | Claude writes both `en` and `es` in one call (see 06) |
| **User-entered content** (profiles, remarks) | Stored as typed. Not translated. Claude reads both languages fine |

## 2. Setup
```js
// src/i18n/index.js
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import en from './locales/en/index.js';
import es from './locales/es/index.js';

i18n.use(LanguageDetector).use(initReactI18next).init({
  resources: { en, es },
  fallbackLng: 'en',
  supportedLngs: ['en', 'es'],
  ns: ['common', 'auth', 'profile', 'admin', 'org', 'learner', 'errors', 'notifications'],
  defaultNS: 'common',
  interpolation: { escapeValue: false },
  detection: { order: ['localStorage', 'navigator'], caches: ['localStorage'] },
});
i18n.on('languageChanged', (lng) => { document.documentElement.lang = lng; });
export default i18n;
```
- After login, if `user.preferredLanguage` differs from the current language, switch to it.

## 3. Helper for bilingual content
```js
// lib/localized.js
export const loc = (obj, lang) => (obj?.[lang]?.trim() ? obj[lang] : obj?.[lang === 'en' ? 'es' : 'en'] ?? '');
```
Usage: `loc(programme.title, i18n.language)`.

## 4. Key naming
`<namespace>:<area>.<item>`, for example `profile:steps.education.title` or `errors:INVITE_EXPIRED`.
Error codes from the API map directly to keys in the `errors` namespace.

## 5. Sample keys
`en/common.json`
```json
{
  "appName": "C2B Learning Pathways",
  "nav": { "dashboard": "Dashboard", "programmes": "Programmes", "logout": "Log out" },
  "actions": { "save": "Save", "cancel": "Cancel", "submit": "Submit", "edit": "Edit", "delete": "Delete", "copy": "Copy link", "copied": "Copied!" },
  "status": {
    "draft": "Draft", "complete": "Complete", "submitted": "Submitted", "under_review": "Under review",
    "pathway_published": "Pathway ready", "pending": "Pending", "approved": "Approved", "rejected": "Rejected",
    "published": "Published", "active": "Active", "completed": "Completed"
  },
  "demoPayment": "Demo payment — no real money is charged."
}
```
`es/common.json`
```json
{
  "appName": "C2B Itinerarios de Aprendizaje",
  "nav": { "dashboard": "Panel", "programmes": "Programas", "logout": "Cerrar sesión" },
  "actions": { "save": "Guardar", "cancel": "Cancelar", "submit": "Enviar", "edit": "Editar", "delete": "Eliminar", "copy": "Copiar enlace", "copied": "¡Copiado!" },
  "status": {
    "draft": "Borrador", "complete": "Completo", "submitted": "Enviado", "under_review": "En revisión",
    "pathway_published": "Itinerario listo", "pending": "Pendiente", "approved": "Aprobado", "rejected": "Rechazado",
    "published": "Publicado", "active": "Activo", "completed": "Completado"
  },
  "demoPayment": "Pago de demostración: no se cobra dinero real."
}
```
`en/errors.json` / `es/errors.json`
```json
{ "INVITE_EXPIRED": "This invite link has expired. Ask your organization for a new one." }
{ "INVITE_EXPIRED": "Este enlace de invitación ha caducado. Pide uno nuevo a tu organización." }
```
`notifications` namespace example:
```json
{ "pathwayPublished": { "title": "Your learning pathway is ready", "body": "C2B has published {{count}} recommended programmes for you." } }
{ "pathwayPublished": { "title": "Tu itinerario de aprendizaje está listo", "body": "C2B ha publicado {{count}} programas recomendados para ti." } }
```

## 6. Glossary (keep translations consistent)
| English | Spanish |
|---|---|
| Learning pathway | Itinerario de aprendizaje |
| Programme | Programa |
| Upskilling / Reskilling | Mejora de competencias / Recualificación |
| Skill gap | Brecha de competencias |
| Organization | Organización |
| Employee | Empleado/a |
| Invite link | Enlace de invitación |
| Remarks | Observaciones |
| Enrollment | Inscripción |
| Intake | Convocatoria |
| Profile | Perfil |
| Goals | Objetivos |

## 7. Rules
- No hard-coded user-facing strings in JSX. Lint check: search for `>[A-Z][a-z]+ ` patterns in JSX during review.
- Dates and numbers use `Intl` with the current language (`dayjs` locale `es` loaded).
- Currency formatting: `new Intl.NumberFormat(lang, { style: 'currency', currency })`.
- Zod form error messages are translation keys, rendered with `t()`.
