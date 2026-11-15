# Interface NovaPulse

L’interface affiche la télémétrie de mission simulée fournie par l’API locale. Elle bascule vers une simulation intégrée lorsque l’API est indisponible. Les boutons de scénario utilisent des jeux de données locaux au navigateur et le bouton de retour recharge la mission de l’API.

Depuis ce dossier, avec Node.js 24 et pnpm 11, utilisez ces commandes pour travailler sur l’interface.

```powershell
pnpm install --frozen-lockfile
pnpm run dev
```

Vite écoute sur `http://127.0.0.1:3000`. Vous pouvez définir `NOVAPULSE_API_TARGET` dans `.env.local` si FastAPI utilise une adresse différente de `http://127.0.0.1:8000`.

```powershell
pnpm run lint
pnpm test
pnpm run build
```

Le build `dist` est servi directement par FastAPI en production locale. Consultez le [guide du projet](../README.md) pour le lancement complet.
