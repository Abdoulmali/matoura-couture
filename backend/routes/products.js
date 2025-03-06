const express = require('express');
const router = express.Router();
const db = require('../config/db'); // ou directement dans app.js

// Route pour récupérer tous les produits
router.get('/products', (req, res) => {
  db.query('SELECT * FROM products', (err, results) => {
    if (err) {
      return res.status(500).json({ message: 'Erreur serveur' });
    }
    res.json(results);
  });
});


router.post('/products', (req, res) => {
  const { name, description, price, fabric, color, image } = req.body;
  const query = 'INSERT INTO products (name, description, price, fabric, color, image) VALUES (?, ?, ?, ?, ?, ?)';
  db.query(query, [name, description, price, fabric, color, image], (err, result) => {
    if (err) {
      return res.status(500).json({ message: 'Erreur lors de l\'ajout du produit' });
    }
    res.status(201).json({ message: 'Produit ajouté avec succès' });
  });
});

router.put('/products/:id', (req, res) => {
  const { id } = req.params;
  const { name, description, price, fabric, color, image } = req.body;
  const query = 'UPDATE products SET name = ?, description = ?, price = ?, fabric = ?, color = ?, image = ? WHERE id = ?';
  db.query(query, [name, description, price, fabric, color, image, id], (err, result) => {
    if (err) {
      return res.status(500).json({ message: 'Erreur lors de la mise à jour du produit' });
    }
    res.json({ message: 'Produit mis à jour avec succès' });
  });
});


module.exports = router;
