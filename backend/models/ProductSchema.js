import mongoose from 'mongoose';

const ProductSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  price: { type: Number, required: true },
  category: String,
  tags: [String],
  stock: { type: Number, default: 0 },
  imageUrl: String
}, { timestamps: true });

export default mongoose.model('Product', ProductSchema);
