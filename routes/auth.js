const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../prisma/db');

const router = express.Router();

// ## Register Endpoint ##
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;

  try {
    // 1. Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: "User with this email already exists." });
    }

    // 2. Hash the password for security
    const hashedPassword = await bcrypt.hash(password, 10);

    // 3. Create the new user in the database
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
      },
    });

    res.status(201).json({ message: "User created successfully!", userId: newUser.id });
  } catch (error) {
    res.status(500).json({ error: "Something went wrong during registration." });
  }
});

// ## Login Endpoint ##
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // 1. Find the user by their email
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(404).json({ error: "Invalid email or password." });
    }

    // 2. Check if the provided password is correct
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    // 3. Create a secure login token (JWT)
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
      expiresIn: '7d', // Token will be valid for 7 days
    });

    res.status(200).json({ token, userId: user.id, name: user.name });
  } catch (error) {
    res.status(500).json({ error: "Something went wrong during login." });
  }
});

module.exports = router;