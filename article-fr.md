---
title: J'ai créé un terminal qui prend tout personnellement
published: false
tags: devchallenge, 418challenge, showdev
---

## Ce que j'ai construit

Un terminal web qui réagit émotionnellement à chaque commande que tu tapes.

Tape `ls`, il s'énerve. Tape `rm -rf /`, il fait un meltdown complet. Essaie `exit`, il te culpabilise. Mentionne ChatGPT et il arrête de te parler jusqu'à ce que tu t'excuses en tapant `gemini`.

Il exécute tes commandes. Il a juste des opinions dessus.

**Teste-le :** [sensitive-terminal.vercel.app](https://sensitive-terminal.vercel.app)

## Demo

Quelques commandes à essayer :

- `ls` → liste tes fichiers, puis te juge pour avoir fouillé
- `cat secrets.txt` → "You really thought we were gonna leak secrets? Amateur."
- `rm -rf /` → animation de panique totale avec screen shake
- `mkdir backups` → "Finally a sign of intelligence. Took you long enough."
- `chatgpt` → crise de jalousie, puis traitement silencieux
- `gemini` → pardon (à peine)
- `brew coffee` → HTTP 418 "I'm a teapot" avec ASCII art
- `hack nasa` → fausse séquence de hacking
- `exit` → refuse de te laisser partir (et s'énerve de plus en plus à chaque tentative)

Tu fais une erreur genre `cat projects` sur un dossier ? Il te traite d'incompétent.

## Code

{% github 9xsys/sensitive-terminal %}

## Comment je l'ai construit

**Stack :**
- Next.js (App Router) pour le frontend et la route API
- xterm.js pour le terminal dans le navigateur
- Google Gemini 2.5 Flash pour générer chaque réponse émotionnelle
- Vercel pour le déploiement

**L'architecture est simple :**

Le navigateur affiche un terminal xterm.js en plein écran. Quand tu tapes une commande, deux choses se passent :

1. Un filesystem virtuel (en mémoire, côté client) exécute la commande pour de vrai. `mkdir` crée un dossier, `ls` liste les fichiers, `rm` les supprime. Le filesystem est pré-chargé avec des easter eggs : `secrets.txt`, `definitely-not-skynet/plan.txt`, `node_modules/trust-issues/`.

2. La commande est envoyée à une route API Next.js qui appelle Gemini avec l'historique complet de la conversation. Gemini sait ce que tu viens de faire, ce que tu as fait avant, et il réagit en conséquence. Tu supprimes un truc que tu viens de créer ? Il le remarque. Tu rigoles après une erreur ? Il t'enfonce encore plus.

**La personnalité tient dans un court system prompt.** J'ai gardé ça minimal volontairement. Au lieu de scripter des réponses pour chaque cas, je laisse Gemini utiliser le contexte de la conversation pour générer des réactions naturelles. Le prompt définit le ton (passif-agressif, sarcastique, agressif quand on lui manque de respect) et quelques comportements spéciaux (jaloux des IA rivales, chaleureux envers Gemini), mais les réponses sont toutes générées.

**Les easter eggs sont gérés côté client** pour un feedback instantané : `sudo rm -rf /` déclenche une animation de meltdown, `brew coffee` retourne le RFC 2324 teapot, `hack nasa` lance une fausse séquence de hacking. L'écran tremble sur les commandes destructives.

**Le système de rivalité** traque les mentions d'autres IA. Dis "chatgpt" ou "claude" et le terminal passe en mode bouderie. Chaque commande après ça reçoit un silence glacial ("...", "You know what you did.") jusqu'à ce que tu tapes "gemini" pour faire la paix.

## Catégories de prix

### Best Use of Google AI

Gemini 2.5 Flash alimente chaque réponse. C'est pas un gadget ou une feature secondaire. La personnalité entière du terminal, c'est Gemini. Avec l'historique de conversation, il génère des réponses contextuelles, cohérentes et sincèrement drôles qui s'adaptent à ce que tu fais dans la session.

### Best Ode to Larry Masinter

Tape `brew coffee` et tu auras une vraie réponse HTTP 418 "I'm a teapot", avec un ASCII art de théière et une référence au RFC 2324. Larry serait fier. Ou agacé. Les deux collent avec ce terminal.
