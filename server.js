
const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

const LIMITE = 20;
const FENETRE_MS = 10_000; // 10 secondes
const BLOCAGE_MS = 5 * 60 * 1000; // 5 minutes

let requetes = [];
let bloqueJusqua = 0;

function pageBloquee() {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Trop de requêtes</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      background: #eaeded;
      font-family: Arial, sans-serif;
      color: #111;
    }
    main {
      width: min(90%, 460px);
      padding: 36px 25px;
      background: white;
      border: 1px solid #ddd;
      border-radius: 8px;
      text-align: center;
      box-shadow: 0 3px 12px #0001;
    }
    .feuille {
      font-size: 54px;
      animation: tourner 1.5s linear infinite;
    }
    @keyframes tourner {
      to { transform: rotate(360deg); }
    }
    h1 { font-size: 27px; }
    p { color: #565959; line-height: 1.6; }
    button {
      background: #ffd814;
      border: 1px solid #fcd200;
      border-radius: 20px;
      padding: 12px 22px;
      cursor: pointer;
      font-size: 15px;
    }
  </style>
</head>
<body>
  <main>
    <div class="feuille">🍃</div>
    <h1>Trop de requêtes</h1>
    <p>Le site est temporairement indisponible.</p>
    <p>Réessaie dans quelques minutes.</p>
    <button onclick="location.reload()">Actualiser la page</button>
  </main>
</body>
</html>`;
}

// Toutes les requêtes sont comptées par le serveur.
app.use((req, res, next) => {
  const maintenant = Date.now();

  // Si le blocage est terminé, repartir de zéro.
  if (bloqueJusqua && maintenant >= bloqueJusqua) {
    bloqueJusqua = 0;
    requetes = [];
  }

  // Pendant le blocage, chaque nouvelle requête
  // repousse la réouverture de 5 minutes.
  if (bloqueJusqua) {
    bloqueJusqua = maintenant + BLOCAGE_MS;
    res.set("Retry-After", "300");
    return res.status(429).send(pageBloquee());
  }

  // Compter les requêtes des 10 dernières secondes.
  requetes = requetes.filter(t => maintenant - t < FENETRE_MS);
  requetes.push(maintenant);

  if (requetes.length > LIMITE) {
    bloqueJusqua = maintenant + BLOCAGE_MS;
    console.log("Blocage activé : trop de requêtes.");

    res.set("Retry-After", "300");
    return res.status(429).send(pageBloquee());
  }

  next();
});

// Place index.html, style.css et les images dans le dossier public.
app.use(express.static(path.join(__dirname, "public")));

app.listen(PORT, () => {
  console.log(`Site disponible sur http://localhost:${PORT}`);
  console.log(`Limite : ${LIMITE} requêtes en ${FENETRE_MS / 1000} secondes`);
});
