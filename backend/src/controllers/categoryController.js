import { Category } from '../models/Category.js';

export const getCategories = async (req, res) => {
  try {
    const { type } = req.query;
    // Categories matching user or system defaults
    const filter = {
      $or: [{ userId: req.userId }, { userId: null }],
    };

    if (type && ['incoming', 'expense'].includes(type)) {
      filter.$and = [{ $or: [{ type }, { type: 'both' }] }];
    }

    const categories = await Category.find(filter).sort({ name: 1 });
    res.json({ success: true, count: categories.length, categories });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to retrieve categories', error: error.message });
  }
};

export const createCategory = async (req, res) => {
  try {
    const { name, type = 'both' } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Category name is required' });
    }

    const trimmed = name.trim();
    const existing = await Category.findOne({
      userId: req.userId,
      name: { $regex: `^${trimmed}$`, $options: 'i' },
    });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Category already exists' });
    }

    const category = await Category.create({
      userId: req.userId,
      name: trimmed,
      type: ['incoming', 'expense', 'both'].includes(type) ? type : 'both',
      isDefault: false,
    });

    res.status(201).json({ success: true, message: 'Category created successfully', category });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create category', error: error.message });
  }
};

export const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, type } = req.body;

    const category = await Category.findOne({ _id: id, userId: req.userId });
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found or unauthorized' });
    }

    if (name && name.trim()) {
      const trimmed = name.trim();
      const duplicate = await Category.findOne({
        _id: { $ne: id },
        userId: req.userId,
        name: { $regex: `^${trimmed}$`, $options: 'i' },
      });
      if (duplicate) {
        return res.status(400).json({ success: false, message: 'Category with this name already exists' });
      }
      category.name = trimmed;
    }

    if (type && ['incoming', 'expense', 'both'].includes(type)) {
      category.type = type;
    }

    await category.save();
    res.json({ success: true, message: 'Category updated successfully', category });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update category', error: error.message });
  }
};

export const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const category = await Category.findOneAndDelete({ _id: id, userId: req.userId });
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found or unauthorized' });
    }

    res.json({ success: true, message: 'Category deleted successfully', deletedId: id });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete category', error: error.message });
  }
};
