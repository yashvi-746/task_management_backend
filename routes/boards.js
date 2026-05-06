const express = require('express');
const router = express.Router();
const Board = require('../models/Board');
const Task = require('../models/Task');
const { protect, adminOnly } = require('../middleware/auth');

// POST /api/boards - Admin only
router.post('/', protect, adminOnly, async (req, res) => {
  try {
    const { title, description, members } = req.body;
    const board = await Board.create({ title, description, owner: req.user._id, members: members || [] });
    await board.populate('owner members', 'name email');
    res.status(201).json({ success: true, data: board });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/boards
router.get('/', protect, async (req, res) => {
  try {
    let query = {};
    if (req.user.role !== 'admin') query = { members: req.user._id };
    const boards = await Board.find(query).populate('owner members', 'name email').sort({ createdAt: -1 });

    // Attach task counts
    const boardsWithCounts = await Promise.all(boards.map(async (b) => {
      let taskFilter = { board: b._id };
      if (req.user.role !== 'admin') {
        taskFilter.assignedTo = req.user._id;
      }
      const taskCount = await Task.countDocuments(taskFilter);
      const completedCount = await Task.countDocuments({ ...taskFilter, status: 'Done' });
      const inProgressCount = await Task.countDocuments({ ...taskFilter, status: 'InProgress' });
      return { ...b.toObject(), taskCount, completedCount, inProgressCount };
    }));

    res.json({ success: true, data: boardsWithCounts });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/boards/:id
router.get('/:id', protect, async (req, res) => {
  try {
    const board = await Board.findById(req.params.id).populate('owner members', 'name email');
    if (!board) return res.status(404).json({ success: false, message: 'Board not found' });
    const isMember = board.members.some(m => m._id.toString() === req.user._id.toString());
    if (req.user.role !== 'admin' && !isMember) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    res.json({ success: true, data: board });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/boards/:id - Admin only
router.put('/:id', protect, adminOnly, async (req, res) => {
  try {
    const board = await Board.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
      .populate('owner members', 'name email');
    if (!board) return res.status(404).json({ success: false, message: 'Board not found' });
    res.json({ success: true, data: board });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/boards/:id - Admin only
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const board = await Board.findById(req.params.id);
    if (!board) return res.status(404).json({ success: false, message: 'Board not found' });
    await Task.deleteMany({ board: board._id });
    await board.deleteOne();
    res.json({ success: true, message: 'Board and all tasks deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/boards/:id/members - Admin only
router.post('/:id/members', protect, adminOnly, async (req, res) => {
  try {
    const board = await Board.findById(req.params.id);
    if (!board) return res.status(404).json({ success: false, message: 'Board not found' });
    const { userId } = req.body;
    if (!board.members.includes(userId)) board.members.push(userId);
    await board.save();
    await board.populate('owner members', 'name email');
    res.json({ success: true, data: board });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/boards/:id/members/:userId - Admin only
router.delete('/:id/members/:userId', protect, adminOnly, async (req, res) => {
  try {
    const board = await Board.findById(req.params.id);
    if (!board) return res.status(404).json({ success: false, message: 'Board not found' });
    board.members = board.members.filter(m => m.toString() !== req.params.userId);
    await board.save();
    await board.populate('owner members', 'name email');
    res.json({ success: true, data: board });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/boards/:id/tasks - Create task
router.post('/:id/tasks', protect, async (req, res) => {
  try {
    const board = await Board.findById(req.params.id);
    if (!board) return res.status(404).json({ success: false, message: 'Board not found' });
    const isMember = board.members.some(m => m.toString() === req.user._id.toString());
    if (req.user.role !== 'admin' && !isMember) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    const { title, description, priority, dueDate, assignedTo, status } = req.body;
    const task = await Task.create({
      title, description, priority, dueDate, assignedTo, status,
      board: req.params.id,
      createdBy: req.user._id,
    });
    await task.populate('assignedTo createdBy', 'name email');
    res.status(201).json({ success: true, data: task });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/boards/:id/tasks
router.get('/:id/tasks', protect, async (req, res) => {
  try {
    const board = await Board.findById(req.params.id);
    if (!board) return res.status(404).json({ success: false, message: 'Board not found' });
    const isMember = board.members.some(m => m.toString() === req.user._id.toString());
    if (req.user.role !== 'admin' && !isMember) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    const filter = { board: req.params.id };
    if (req.query.status) filter.status = req.query.status;
    if (req.query.priority) filter.priority = req.query.priority;
    if (req.query.assignedTo) filter.assignedTo = req.query.assignedTo;

    const tasks = await Task.find(filter)
      .populate('assignedTo createdBy', 'name email')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: tasks });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
