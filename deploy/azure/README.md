# NovaPulse sur Azure

Le ZIP de déploiement contient FastAPI, l’interface React compilée et les modèles entraînés lorsqu’ils sont disponibles. La démo publique permet de consulter la télémétrie simulée, de jouer les scénarios dans le navigateur et de lancer les modèles via `POST /api/v1/predict`. Cet appel calcule les résultats à partir des entrées reçues, sans les enregistrer dans la base. L’écriture de mesures et de bilans reste disponible dans l’API locale.

Avec [Azure CLI](https://learn.microsoft.com/cli/azure/install-azure-cli-windows) et un abonnement Azure actif, exécuter ces commandes dans PowerShell depuis le dossier `NovaPulse-integre`.

```powershell
az login
python .\deploy\azure\package.py
.\deploy\azure\deploy.ps1
```

Si tu utilises la version portable de l’Azure CLI, exécute `az.cmd` depuis son dossier `bin` et passe le chemin complet de la commande à `deploy.ps1` avec le paramètre `-AzureCli`.

Le script crée un App Service Linux sur le plan **F1** en Espagne Centre, déploie le ZIP, vérifie le tableau de bord et affiche son URL HTTPS. Utilise `-Subscription` pour choisir un abonnement et `-Location` si le plan F1 est indisponible dans cette région. [Plans App Service Linux](https://azure.microsoft.com/en-us/pricing/details/app-service/linux/)

Après une modification de l’interface, relance `pnpm run build` dans `frontend` puis régénère le ZIP et relance `deploy.ps1`. Le même abonnement et le même nom d’application réutilisent les ressources existantes.
