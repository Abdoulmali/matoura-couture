// Importation des packages nécessaires
const express = require('express');
const mysql = require('mysql2');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Charger les variables d'environnement
dotenv.config();

// Création de l'application Express
const app = express();

// Middleware CORS avec des options spécifiques
const corsOptions = {
  origin: 'http://localhost:3000', // Permet uniquement les requêtes depuis ton frontend React
  methods: ['GET', 'POST'], // Méthodes autorisées
  allowedHeaders: ['Content-Type'], // En-têtes autorisés
};

// Middleware pour gérer les requêtes CORS
app.use(cors(corsOptions)); // Ceci permet à toutes les origines d'accéder à l'API

// Middleware pour parser les données JSON
app.use(express.json());

// Servir les images depuis le dossier public
app.use('/images', express.static(path.join(__dirname, 'public/images')));

// Connexion à la base de données MySQL
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

db.connect((err) => {
  if (err) {
    console.error('Erreur de connexion à la base de données :', err);
    process.exit(1); // Arrêter le serveur si la connexion échoue
  } else {
    console.log('Connecté à la base de données MySQL');
  }
});

// Création de JWT
const generateToken = (user) => {
  return jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: '1h',
  });
};

// Middleware pour vérifier le token JWT et le rôle
const verifyToken = (req, res, next) => {
  const token = req.header('Authorization')?.split(' ')[1];  // Récupérer le token à partir de l'en-tête

  if (!token) {
    return res.status(401).json({ message: 'Accès refusé, token manquant.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;  // Décoder le token et stocker l'utilisateur dans la requête
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Token invalide.' });
  }
};

// Vérification si l'utilisateur est un admin
const verifyAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Accès refusé, rôle d\'admin requis.' });
  }
  next();
};

// Configuration de multer pour l'upload des images
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/images/'); // Dossier où les images seront stockées
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // Nom unique pour chaque image
  }
});

const upload = multer({ storage: storage });

// Endpoint pour récupérer les produits
app.get('/api/products', (req, res) => {
  db.query('SELECT * FROM products', (err, results) => {
    if (err) {
      console.error('Erreur lors de la récupération des produits:', err);
      return res.status(500).send('Erreur interne du serveur');
    }
    res.json(results); // Envoi de la réponse avec les produits
  });
});

// Endpoint pour s'inscrire (pour un client ou un admin)
app.post('/api/register', async (req, res) => {
  const { email, password, role } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'L\'email et le mot de passe sont requis.' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const query = 'INSERT INTO users (email, password, role) VALUES (?, ?, ?)';
  db.query(query, [email, hashedPassword, role || 'client'], (err, result) => {
    if (err) {
      console.error('Erreur lors de l\'inscription de l\'utilisateur:', err);
      return res.status(500).json({ message: 'Erreur lors de l\'inscription de l\'utilisateur.' });
    }
    res.status(201).json({ message: 'Utilisateur créé avec succès.' });
  });
});

// Endpoint pour se connecter
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email et mot de passe requis.' });
  }

  const query = 'SELECT * FROM users WHERE email = ?'; // Recherche par email
  db.query(query, [email], async (err, results) => {
    if (err || results.length === 0) {
      return res.status(400).json({ message: 'Email ou mot de passe incorrect.' });
    }

    const user = results[0];
    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      return res.status(400).json({ message: 'Email ou mot de passe incorrect.' });
    }

    // Créer un token JWT
    const token = generateToken(user);
    res.status(200).json({ token });
  });
});

// Endpoint pour ajouter un produit (réservé aux administrateurs)
app.post('/api/products', verifyToken, verifyAdmin, upload.single('image'), (req, res) => {
  const { name, description, price } = req.body;
  const image = req.file ? req.file.filename : null;

  // Vérifier que tous les champs sont présents
  if (!name || !description || !price || !image) {
    return res.status(400).json({ message: 'Tous les champs doivent être remplis.' });
  }

  // Insérer le produit dans la base de données
  const query = 'INSERT INTO products (name, description, price, image) VALUES (?, ?, ?, ?)';
  db.query(query, [name, description, price, image], (err, result) => {
    if (err) {
      console.error('Erreur lors de l\'ajout du produit:', err);
      return res.status(500).json({ message: 'Erreur lors de l\'ajout du produit.' });
    }
    res.status(201).json({ message: 'Produit ajouté avec succès.' });
  });
});

// Lancer le serveur backend
app.listen(5001, () => {
  console.log('Serveur backend lancé sur le port 5001');
});
