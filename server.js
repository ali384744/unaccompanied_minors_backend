console.log('Starting server script...');

require('dotenv').config({ path: './.env' });
console.log('MONGO_URI:', process.env.MONGO_URI ? 'Loaded' : 'Not Loaded');

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const path = require('path');


const app = express();
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


// Route to get public IP address
app.get('/my-ip', async (req, res) => {
  try {
    const response = await axios.get('https://api.ipify.org?format=json');
    res.json({ ip: response.data.ip });
  } catch (err) {
    res.status(500).json({ error: 'Could not fetch IP' });
  }
});


app.get('/', (req, res) => {
  res.send('Backend API is running');
});

// MongoDB connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB connection error:', err));


// Storage for image uploads
const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

// Post schema
const Post = mongoose.model('Post', new mongoose.Schema({
  text: String,
  image: String,
  comments: [String],
  createdAt: { type: Date, default: Date.now }
}));

// Routes
app.get('/posts', async (req, res) => {
  const posts = await Post.find().sort({ createdAt: -1 });
  res.json(posts);
});

app.post('/posts', upload.single('image'), async (req, res) => {
  const { text } = req.body;
  const image = req.file ? `/uploads/${req.file.filename}` : null;
  const post = new Post({ text, image, comments: [] });
  await post.save();
  res.status(201).json(post);
});

app.post('/posts/:id/comment', async (req, res) => {
  const { id } = req.params;
  const { comment } = req.body;
  const post = await Post.findById(id);
  if (!post) return res.status(404).json({ message: "Post not found" });
  post.comments.push(comment);
  await post.save();
  res.json(post);
});

app.get('/my-ip', (req, res) => {
  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  res.json({ ip });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
process.on('uncaughtException', err => {
  console.error('Uncaught Exception:', err);
});
process.on('unhandledRejection', err => {
  console.error('Unhandled Rejection:', err);
});

