# Plan de Corrections Compatibilité Mobile

## Objectif
Corriger les problèmes mineurs de compatibilité mobile identifiés lors de l'analyse du frontend.

**Status : ✅ TERMINÉ**

---

## Phase 1 : Headers non responsive (Priorité haute) ✅

### 1.1 pages/mj/campaigns/import.vue ✅
- [x] Réduire l'icône du bouton retour sur mobile : `size-6 sm:size-12`
- [x] Adapter le titre : `text-xl sm:text-3xl`
- [x] Adapter le sous-titre : `text-sm sm:text-base`

### 1.2 pages/dashboard/campaigns/[id]/character.vue ✅
- [x] Réduire l'icône du bouton retour sur mobile : `size-6 sm:size-12`
- [x] Adapter le titre : `text-xl sm:text-3xl`
- [x] Adapter le sous-titre : `text-sm sm:text-base`

### 1.3 pages/mj/campaigns/[id]/polls/create.vue ✅
- [x] Réduire l'icône du bouton retour sur mobile : `size-6 sm:size-12`
- [x] Adapter le titre : `text-xl sm:text-3xl`
- [x] Adapter le sous-titre : `text-sm sm:text-base`

---

## Phase 2 : Footer et Safe Areas (Priorité moyenne) ✅

### 2.1 AppFooter.vue ✅
- [x] Ajouté `safe-area-bottom` pour les iPhone avec notch/Dynamic Island
- [x] Augmenté `pb-20` à `pb-24` pour plus d'espace avec BottomNav
- [x] Corrigé `rounded-[2rem]` en `rounded-4xl` (classe canonique)

---

## Phase 3 : Vérifications finales

### 3.1 Tests visuels à effectuer
- [ ] iPhone SE (375x667) - écran petit
- [ ] iPhone 14 (390x844) - notch
- [ ] iPhone 14 Pro Max (430x932) - Dynamic Island
- [ ] iPad Mini (768x1024) - tablette

### 3.2 Parcours à tester
- [ ] Navigation MJ complète (import campagne, création sondage)
- [ ] Navigation Streamer (dashboard, campagnes, settings)
- [ ] Ouverture/fermeture des modales
- [ ] Cookie banner
- [ ] Support widget

---

## Fichiers modifiés

| Fichier | Modification | Status |
|---------|--------------|--------|
| `pages/mj/campaigns/import.vue` | Header responsive | ✅ |
| `pages/dashboard/campaigns/[id]/character.vue` | Header responsive | ✅ |
| `pages/mj/campaigns/[id]/polls/create.vue` | Header responsive | ✅ |
| `components/AppFooter.vue` | Safe area + padding | ✅ |

---

## Notes

- La majorité du frontend était déjà bien compatible mobile
- BottomNavigation, modales et layouts principaux étaient corrects
- Les corrections sont mineures et n'impactent pas la logique métier
